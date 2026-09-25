import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { istDateString, istDateToUtc } from "@/lib/time";
import { computeCommission, round2, type CommissionTerms } from "@/lib/money";
import { monthRange, type DateRange } from "@/lib/dateRange";
import { AmountsCorrectionSchema, CommissionSettingsSchema, ExpenseInputSchema, SettlementInputSchema } from "@/schema/finance";
import { fail, ok, type Result } from "./result";

const num = (d: Prisma.Decimal | null | undefined): number => (d ? Number(d) : 0);
const between = (range: DateRange) => (range.start && range.end ? { gte: range.start, lt: range.end } : undefined);

// ---------- commission terms ----------

export async function getCommissionSettings(): Promise<CommissionTerms> {
    const s = await db.settings.findUnique({ where: { id: 1 }, select: { commissionRatePercent: true, commissionFlatAmount: true } });
    return { ratePercent: s ? num(s.commissionRatePercent) : 15, flatAmount: s ? num(s.commissionFlatAmount) : 0 };
}

export async function updateCommissionSettings(adminId: string, raw: unknown): Promise<Result<CommissionTerms>> {
    const parsed = CommissionSettingsSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);

    const before = await getCommissionSettings();
    const data = { commissionRatePercent: parsed.data.commissionRatePercent.toFixed(2), commissionFlatAmount: parsed.data.commissionFlatAmount.toFixed(2) };
    await db.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });

    const after = { ratePercent: parsed.data.commissionRatePercent, flatAmount: parsed.data.commissionFlatAmount };
    await logAudit({ actorType: "admin", actorId: adminId, action: "settings.commission", entity: "Settings", entityId: "1", before, after });
    return ok(after);
}

// What to charge on a job that is being completed. A free warranty re-service earns the business nothing.
export async function commissionTermsFor(isWarrantyRedo: boolean): Promise<CommissionTerms> {
    return isWarrantyRedo ? { ratePercent: 0, flatAmount: 0 } : getCommissionSettings();
}

export function commissionNote(laborAmount: number, terms: CommissionTerms): string {
    const flat = terms.flatAmount > 0 ? ` + ₹${terms.flatAmount} flat` : "";
    return `${terms.ratePercent}% of ₹${laborAmount}${flat}`;
}

// ---------- ledger ----------

export interface LedgerItem {
    id: string;
    createdAt: string;
    type: "COMMISSION_OWED" | "OFFICE_PAYMENT" | "PAYOUT" | "ADJUSTMENT";
    amount: number;
    note: string | null;
    bookingId: string | null;
    bookingRef: string | null;
}

export interface TechnicianLedger {
    technician: { id: string; name: string; phone: string };
    balance: number;
    items: LedgerItem[];
    page: number;
    pageCount: number;
}

const LEDGER_PAGE = 25;

export async function getTechnicianBalance(technicianId: string): Promise<number> {
    const sum = await db.ledgerEntry.aggregate({ _sum: { amount: true }, where: { technicianId } });
    return round2(num(sum._sum.amount));
}

export async function getTechnicianLedger(technicianId: string, page = 1): Promise<TechnicianLedger | null> {
    const technician = await db.technician.findUnique({ where: { id: technicianId }, select: { id: true, name: true, phone: true } });
    if (!technician) return null;

    const safePage = Math.max(1, page);
    const [rows, total, balance] = await Promise.all([
        db.ledgerEntry.findMany({ where: { technicianId }, orderBy: { createdAt: "desc" }, skip: (safePage - 1) * LEDGER_PAGE, take: LEDGER_PAGE }),
        db.ledgerEntry.count({ where: { technicianId } }),
        getTechnicianBalance(technicianId),
    ]);

    const ids = Array.from(new Set(rows.map((r) => r.bookingId).filter((v): v is string => !!v)));
    const bookings = ids.length ? await db.booking.findMany({ where: { id: { in: ids } }, select: { id: true, bookingRef: true } }) : [];
    const refOf = new Map(bookings.map((b) => [b.id, b.bookingRef]));

    return {
        technician,
        balance,
        items: rows.map((r) => ({
            id: r.id,
            createdAt: r.createdAt.toISOString(),
            type: r.type,
            amount: num(r.amount),
            note: r.note,
            bookingId: r.bookingId,
            bookingRef: r.bookingId ? refOf.get(r.bookingId) ?? null : null,
        })),
        page: safePage,
        pageCount: Math.max(1, Math.ceil(total / LEDGER_PAGE)),
    };
}

// An office payment or a deduction from a payout reduces what the technician owes. An adjustment can go either way.
export async function recordLedgerEntry(technicianId: string, adminId: string, raw: unknown): Promise<Result<{ balance: number }>> {
    const parsed = SettlementInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const { kind, amount, note } = parsed.data;

    if (kind !== "ADJUSTMENT" && amount < 0) return fail("invalid", "Enter the amount as a positive number");
    if (kind === "ADJUSTMENT" && !note) return fail("invalid", "Tell us why you are adjusting the balance");

    const technician = await db.technician.findUnique({ where: { id: technicianId }, select: { id: true } });
    if (!technician) return fail("not_found", "Technician not found");

    const signed = kind === "ADJUSTMENT" ? amount : -amount;
    const entry = await db.ledgerEntry.create({
        data: { technicianId, type: kind, amount: signed.toFixed(2), note: note || null },
    });
    await logAudit({ actorType: "admin", actorId: adminId, action: `ledger.${kind.toLowerCase()}`, entity: "LedgerEntry", entityId: entry.id, after: { technicianId, amount: signed, note: note ?? null } });

    return ok({ balance: await getTechnicianBalance(technicianId) });
}

// ---------- correcting a completed job ----------

export async function correctCompletedAmounts(bookingId: string, adminId: string, raw: unknown): Promise<Result<{ commissionChange: number }>> {
    const parsed = AmountsCorrectionSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const { laborAmount, partsAmount, amountCollected, note } = parsed.data;

    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return fail("not_found", "Booking not found");
    if (booking.status !== "COMPLETED") return fail("not_completed", "Only completed bookings have amounts to correct");

    // Same terms as when the job was completed, so a later rate change does not rewrite old jobs.
    const terms: CommissionTerms =
        booking.commissionRateApplied !== null
            ? { ratePercent: num(booking.commissionRateApplied), flatAmount: num(booking.commissionFlatApplied) }
            : await commissionTermsFor(!!booking.warrantyClaimOfId);
    const newCommission = computeCommission(laborAmount, terms);

    const change = await db.$transaction(async (tx) => {
        const posted = await tx.ledgerEntry.aggregate({ _sum: { amount: true }, where: { bookingId, type: { in: ["COMMISSION_OWED", "ADJUSTMENT"] } } });
        const difference = round2(newCommission - num(posted._sum.amount));

        await tx.booking.update({
            where: { id: bookingId },
            data: {
                laborAmount,
                partsAmount,
                amountCollected,
                commissionRateApplied: terms.ratePercent.toFixed(2),
                commissionFlatApplied: terms.flatAmount.toFixed(2),
            },
        });
        if (difference !== 0 && booking.technicianId) {
            await tx.ledgerEntry.create({
                data: {
                    technicianId: booking.technicianId,
                    bookingId,
                    type: "ADJUSTMENT",
                    amount: difference.toFixed(2),
                    note: `Amounts corrected on ${booking.bookingRef}: ${note}`,
                },
            });
        }
        await tx.bookingStatusHistory.create({
            data: {
                bookingId,
                fromStatus: "COMPLETED",
                toStatus: "COMPLETED",
                changedByType: "admin",
                changedById: adminId,
                note: `Amounts corrected (service ₹${booking.laborAmount} to ₹${laborAmount}, parts ₹${booking.partsAmount} to ₹${partsAmount}, collected ₹${booking.amountCollected ?? 0} to ₹${amountCollected}): ${note}`,
            },
        });
        return difference;
    });

    await logAudit({
        actorType: "admin",
        actorId: adminId,
        action: "booking.correctAmounts",
        entity: "Booking",
        entityId: bookingId,
        before: { laborAmount: booking.laborAmount, partsAmount: booking.partsAmount, amountCollected: booking.amountCollected },
        after: { laborAmount, partsAmount, amountCollected, note },
    });

    return ok({ commissionChange: change });
}

// ---------- expenses ----------

export interface ExpenseItem {
    id: string;
    date: string;
    category: string;
    amount: number;
    note: string | null;
    type: "EXPENSE" | "AD_SPEND";
    technicianId: string | null;
    technicianName: string | null;
    bookingId: string | null;
    bookingRef: string | null;
}

export interface ExpenseList {
    items: ExpenseItem[];
    totals: { expense: number; adSpend: number };
    page: number;
    pageCount: number;
}

const EXPENSE_PAGE = 25;

export async function listExpenses(range: DateRange, page = 1): Promise<ExpenseList> {
    const where: Prisma.ExpenseWhereInput = { date: between(range) };
    const safePage = Math.max(1, page);

    const [rows, total, grouped] = await Promise.all([
        db.expense.findMany({
            where,
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            skip: (safePage - 1) * EXPENSE_PAGE,
            take: EXPENSE_PAGE,
            include: { technician: { select: { name: true } }, booking: { select: { bookingRef: true } } },
        }),
        db.expense.count({ where }),
        db.expense.groupBy({ by: ["type"], where, _sum: { amount: true } }),
    ]);
    const sumOf = (type: string) => round2(num(grouped.find((g) => g.type === type)?._sum.amount));

    return {
        items: rows.map((r) => ({
            id: r.id,
            date: istDateString(r.date),
            category: r.category,
            amount: num(r.amount),
            note: r.note,
            type: r.type,
            technicianId: r.technicianId,
            technicianName: r.technician?.name ?? null,
            bookingId: r.bookingId,
            bookingRef: r.booking?.bookingRef ?? null,
        })),
        totals: { expense: sumOf("EXPENSE"), adSpend: sumOf("AD_SPEND") },
        page: safePage,
        pageCount: Math.max(1, Math.ceil(total / EXPENSE_PAGE)),
    };
}

async function expenseData(raw: unknown): Promise<Result<Prisma.ExpenseUncheckedCreateInput>> {
    const parsed = ExpenseInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const input = parsed.data;

    let bookingId: string | null = null;
    if (input.bookingRef) {
        const booking = await db.booking.findUnique({ where: { bookingRef: input.bookingRef.toUpperCase() }, select: { id: true } });
        if (!booking) return fail("invalid", `No booking with reference ${input.bookingRef}`);
        bookingId = booking.id;
    }
    if (input.technicianId) {
        const technician = await db.technician.findUnique({ where: { id: input.technicianId }, select: { id: true } });
        if (!technician) return fail("invalid", "That technician was not found");
    }

    return ok({
        category: input.category,
        amount: input.amount.toFixed(2),
        date: istDateToUtc(input.date),
        note: input.note || null,
        type: input.type,
        technicianId: input.technicianId || null,
        bookingId,
    });
}

export async function createExpense(adminId: string, raw: unknown): Promise<Result<{ id: string }>> {
    const data = await expenseData(raw);
    if (!data.ok) return data;
    const expense = await db.expense.create({ data: data.data });
    await logAudit({ actorType: "admin", actorId: adminId, action: "expense.create", entity: "Expense", entityId: expense.id, after: { type: expense.type, category: expense.category, amount: num(expense.amount) } });
    return ok({ id: expense.id });
}

export async function updateExpense(id: string, adminId: string, raw: unknown): Promise<Result<{ id: string }>> {
    const before = await db.expense.findUnique({ where: { id } });
    if (!before) return fail("not_found", "Expense not found");
    const data = await expenseData(raw);
    if (!data.ok) return data;
    await db.expense.update({ where: { id }, data: data.data });
    await logAudit({
        actorType: "admin",
        actorId: adminId,
        action: "expense.update",
        entity: "Expense",
        entityId: id,
        before: { type: before.type, category: before.category, amount: num(before.amount) },
        after: { type: data.data.type, category: data.data.category, amount: Number(data.data.amount) },
    });
    return ok({ id });
}

export async function deleteExpense(id: string, adminId: string): Promise<Result<null>> {
    const before = await db.expense.findUnique({ where: { id } });
    if (!before) return fail("not_found", "Expense not found");
    await db.expense.delete({ where: { id } });
    await logAudit({ actorType: "admin", actorId: adminId, action: "expense.delete", entity: "Expense", entityId: id, before: { type: before.type, category: before.category, amount: num(before.amount) } });
    return ok(null);
}

// ---------- summary ----------

export interface TechnicianFinanceRow {
    technicianId: string;
    name: string;
    jobs: number;
    collected: number;
    labor: number;
    commission: number;
    balance: number;
}

export interface FinanceSummary {
    sales: { jobs: number; collected: number; labor: number; parts: number };
    commissionEarned: number;
    expenses: number;
    adSpend: number;
    profit: number;
    outstandingCommission: number;
    ads: { bookingsFromAds: number; totalBookings: number; costPerAdBooking: number | null };
    technicians: TechnicianFinanceRow[];
}

export async function getFinanceSummary(range: DateRange): Promise<FinanceSummary> {
    const completedAt = between(range);
    const createdAt = between(range);

    const [sales, commission, expenseGroups, adBookings, allBookings, outstanding, perTechnician, ledgerByTechnician, balances, technicians] = await Promise.all([
        db.booking.aggregate({ _sum: { amountCollected: true, laborAmount: true, partsAmount: true }, _count: { _all: true }, where: { status: "COMPLETED", completedAt } }),
        db.ledgerEntry.aggregate({ _sum: { amount: true }, where: { type: { in: ["COMMISSION_OWED", "ADJUSTMENT"] }, createdAt } }),
        db.expense.groupBy({ by: ["type"], where: { date: between(range) }, _sum: { amount: true } }),
        db.booking.count({ where: { utmSource: { not: null }, createdAt } }),
        db.booking.count({ where: { createdAt } }),
        db.ledgerEntry.aggregate({ _sum: { amount: true } }),
        db.booking.groupBy({ by: ["technicianId"], where: { status: "COMPLETED", technicianId: { not: null }, completedAt }, _sum: { amountCollected: true, laborAmount: true }, _count: { _all: true } }),
        db.ledgerEntry.groupBy({ by: ["technicianId"], where: { type: { in: ["COMMISSION_OWED", "ADJUSTMENT"] }, createdAt }, _sum: { amount: true } }),
        db.ledgerEntry.groupBy({ by: ["technicianId"], _sum: { amount: true } }),
        db.technician.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

    const spend = (type: string) => round2(num(expenseGroups.find((g) => g.type === type)?._sum.amount));
    const expenses = spend("EXPENSE");
    const adSpend = spend("AD_SPEND");
    const commissionEarned = round2(num(commission._sum.amount));

    const jobsBy = new Map(perTechnician.map((r) => [r.technicianId, r]));
    const commissionBy = new Map(ledgerByTechnician.map((r) => [r.technicianId, num(r._sum.amount)]));
    const balanceBy = new Map(balances.map((r) => [r.technicianId, num(r._sum.amount)]));

    const rows: TechnicianFinanceRow[] = technicians
        .map((t) => ({
            technicianId: t.id,
            name: t.name,
            jobs: jobsBy.get(t.id)?._count._all ?? 0,
            collected: jobsBy.get(t.id)?._sum.amountCollected ?? 0,
            labor: jobsBy.get(t.id)?._sum.laborAmount ?? 0,
            commission: round2(commissionBy.get(t.id) ?? 0),
            balance: round2(balanceBy.get(t.id) ?? 0),
        }))
        .filter((r) => r.jobs > 0 || r.balance !== 0 || r.commission !== 0);

    return {
        sales: { jobs: sales._count._all, collected: sales._sum.amountCollected ?? 0, labor: sales._sum.laborAmount ?? 0, parts: sales._sum.partsAmount ?? 0 },
        commissionEarned,
        expenses,
        adSpend,
        profit: round2(commissionEarned - expenses - adSpend),
        outstandingCommission: round2(num(outstanding._sum.amount)),
        ads: { bookingsFromAds: adBookings, totalBookings: allBookings, costPerAdBooking: adBookings > 0 && adSpend > 0 ? round2(adSpend / adBookings) : null },
        technicians: rows,
    };
}

// ---------- what a technician sees ----------

export interface TechnicianEarnings {
    month: string;
    totals: { jobs: number; collected: number; commission: number; net: number };
    jobs: { id: string; bookingRef: string; serviceType: string; completedAt: string; collected: number; commission: number }[];
    balance: number;
    settlements: { id: string; createdAt: string; type: LedgerItem["type"]; amount: number; note: string | null }[];
}

export async function getTechnicianEarnings(technicianId: string, month: string): Promise<TechnicianEarnings | null> {
    const range = monthRange(month);
    if (!range) return null;

    const [bookings, balance, settlements] = await Promise.all([
        db.booking.findMany({
            where: { technicianId, status: "COMPLETED", completedAt: between(range) },
            orderBy: { completedAt: "desc" },
            select: { id: true, bookingRef: true, serviceType: true, completedAt: true, amountCollected: true },
        }),
        getTechnicianBalance(technicianId),
        // Job corrections are folded into that job's commission above, so only payments and manual adjustments are listed here.
        db.ledgerEntry.findMany({ where: { technicianId, OR: [{ type: { in: ["OFFICE_PAYMENT", "PAYOUT"] } }, { type: "ADJUSTMENT", bookingId: null }] }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

    const commissions = bookings.length
        ? await db.ledgerEntry.groupBy({
              by: ["bookingId"],
              where: { technicianId, type: { in: ["COMMISSION_OWED", "ADJUSTMENT"] }, bookingId: { in: bookings.map((b) => b.id) } },
              _sum: { amount: true },
          })
        : [];
    const commissionOf = new Map(commissions.map((c) => [c.bookingId, num(c._sum.amount)]));

    const jobs = bookings.map((b) => ({
        id: b.id,
        bookingRef: b.bookingRef,
        serviceType: b.serviceType,
        completedAt: b.completedAt!.toISOString(),
        collected: b.amountCollected ?? 0,
        commission: round2(commissionOf.get(b.id) ?? 0),
    }));
    const collected = jobs.reduce((n, j) => n + j.collected, 0);
    const commission = round2(jobs.reduce((n, j) => n + j.commission, 0));

    return {
        month,
        totals: { jobs: jobs.length, collected, commission, net: round2(collected - commission) },
        jobs,
        balance,
        settlements: settlements.map((s) => ({ id: s.id, createdAt: s.createdAt.toISOString(), type: s.type, amount: num(s.amount), note: s.note })),
    };
}
