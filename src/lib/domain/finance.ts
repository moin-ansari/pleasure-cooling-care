import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { istDateString, istDateToUtc } from "@/lib/time";
import { round2, splitCommission, type CommissionTerms } from "@/lib/money";
import { monthRange, type DateRange } from "@/lib/dateRange";
import { bookingWhere, canAccessStore, isOwner, storeOnlyWhere, technicianWhere, type AdminScope } from "@/lib/scope";
import { AmountsCorrectionSchema, ExpenseInputSchema, SettlementInputSchema } from "@/schema/finance";
import { StorePaymentSchema } from "@/schema/stores";
import { getStoreTerms } from "./stores";
import { fail, ok, type Result } from "./result";

const num = (d: Prisma.Decimal | null | undefined): number => (d ? Number(d) : 0);
const between = (range: DateRange) => (range.start && range.end ? { gte: range.start, lt: range.end } : undefined);

export function commissionNote(laborAmount: number, terms: CommissionTerms): string {
    const flat = terms.flatAmount > 0 ? ` + ₹${terms.flatAmount} flat` : "";
    return `${terms.ratePercent}% of ₹${laborAmount}${flat}`;
}

// ---------- technician ledger (what a technician owes their store) ----------

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

export async function getTechnicianLedger(scope: AdminScope, technicianId: string, page = 1): Promise<TechnicianLedger | null> {
    const technician = await db.technician.findFirst({ where: { id: technicianId, ...storeOnlyWhere(scope) }, select: { id: true, name: true, phone: true } });
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
export async function recordLedgerEntry(scope: AdminScope, technicianId: string, raw: unknown): Promise<Result<{ balance: number }>> {
    const parsed = SettlementInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const { kind, amount, note } = parsed.data;

    if (kind !== "ADJUSTMENT" && amount < 0) return fail("invalid", "Enter the amount as a positive number");
    if (kind === "ADJUSTMENT" && !note) return fail("invalid", "Tell us why you are adjusting the balance");

    const technician = await db.technician.findFirst({ where: { id: technicianId, ...storeOnlyWhere(scope) }, select: { id: true, storeId: true } });
    if (!technician) return fail("not_found", "Technician not found");

    const signed = kind === "ADJUSTMENT" ? amount : -amount;
    const entry = await db.ledgerEntry.create({
        data: { technicianId, storeId: technician.storeId, type: kind, amount: signed.toFixed(2), note: note || null },
    });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: `ledger.${kind.toLowerCase()}`, entity: "LedgerEntry", entityId: entry.id, after: { technicianId, amount: signed, note: note ?? null } });

    return ok({ balance: await getTechnicianBalance(technicianId) });
}

// ---------- store ledger (what a store owes the owner) ----------

export interface StoreLedger {
    store: { id: string; name: string; isMain: boolean };
    balance: number;
    items: { id: string; createdAt: string; type: "OWNER_SHARE_OWED" | "STORE_PAYMENT" | "ADJUSTMENT"; amount: number; note: string | null; bookingId: string | null; bookingRef: string | null }[];
    page: number;
    pageCount: number;
}

export async function getStoreLedger(scope: AdminScope, storeId: string, page = 1): Promise<StoreLedger | null> {
    if (!canAccessStore(scope, storeId)) return null;
    const store = await db.store.findUnique({ where: { id: storeId }, select: { id: true, name: true, isMain: true } });
    if (!store) return null;

    const safePage = Math.max(1, page);
    const [rows, total, sum] = await Promise.all([
        db.storeLedgerEntry.findMany({ where: { storeId }, orderBy: { createdAt: "desc" }, skip: (safePage - 1) * LEDGER_PAGE, take: LEDGER_PAGE }),
        db.storeLedgerEntry.count({ where: { storeId } }),
        db.storeLedgerEntry.aggregate({ _sum: { amount: true }, where: { storeId } }),
    ]);
    const ids = Array.from(new Set(rows.map((r) => r.bookingId).filter((v): v is string => !!v)));
    const bookings = ids.length ? await db.booking.findMany({ where: { id: { in: ids } }, select: { id: true, bookingRef: true } }) : [];
    const refOf = new Map(bookings.map((b) => [b.id, b.bookingRef]));

    return {
        store,
        balance: round2(num(sum._sum.amount)),
        items: rows.map((r) => ({ id: r.id, createdAt: r.createdAt.toISOString(), type: r.type, amount: num(r.amount), note: r.note, bookingId: r.bookingId, bookingRef: r.bookingId ? refOf.get(r.bookingId) ?? null : null })),
        page: safePage,
        pageCount: Math.max(1, Math.ceil(total / LEDGER_PAGE)),
    };
}

// Only the owner records what a store has paid them.
export async function recordStorePayment(scope: AdminScope, storeId: string, raw: unknown): Promise<Result<{ balance: number }>> {
    if (!isOwner(scope)) return fail("forbidden", "Only the owner can do this");
    const parsed = StorePaymentSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const { kind, amount, note } = parsed.data;

    if (kind === "PAYMENT" && amount < 0) return fail("invalid", "Enter the amount as a positive number");
    if (kind === "ADJUSTMENT" && !note) return fail("invalid", "Tell us why you are adjusting the balance");

    const store = await db.store.findUnique({ where: { id: storeId }, select: { id: true, isMain: true } });
    if (!store) return fail("not_found", "Store not found");
    if (store.isMain) return fail("invalid", "Your own store has no balance with you");

    const signed = kind === "PAYMENT" ? -amount : amount;
    const entry = await db.storeLedgerEntry.create({ data: { storeId, type: kind === "PAYMENT" ? "STORE_PAYMENT" : "ADJUSTMENT", amount: signed.toFixed(2), note: note || null } });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: `storeLedger.${kind.toLowerCase()}`, entity: "StoreLedgerEntry", entityId: entry.id, after: { storeId, amount: signed, note: note ?? null } });

    const sum = await db.storeLedgerEntry.aggregate({ _sum: { amount: true }, where: { storeId } });
    return ok({ balance: round2(num(sum._sum.amount)) });
}

// ---------- correcting a completed job ----------

export async function correctCompletedAmounts(scope: AdminScope, bookingId: string, raw: unknown): Promise<Result<{ commissionChange: number }>> {
    const parsed = AmountsCorrectionSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const { laborAmount, partsAmount, amountCollected, note } = parsed.data;

    const booking = await db.booking.findFirst({ where: { id: bookingId, ...storeOnlyWhere(scope) } });
    if (!booking) return fail("not_found", "Booking not found");
    if (booking.status !== "COMPLETED") return fail("not_completed", "Only completed bookings have amounts to correct");

    // Same terms as when the job was completed, so a later rate change does not rewrite old jobs.
    const current = await getStoreTerms(booking.storeId, !!booking.warrantyClaimOfId);
    const rate = booking.commissionRateApplied !== null ? num(booking.commissionRateApplied) : current.ratePercent;
    const terms = {
        ratePercent: rate,
        flatAmount: booking.commissionFlatApplied !== null ? num(booking.commissionFlatApplied) : current.flatAmount,
        // Jobs completed before stores existed passed the whole percentage to the owner.
        ownerRatePercent: booking.ownerRateApplied !== null ? num(booking.ownerRateApplied) : rate,
    };
    const split = splitCommission(laborAmount, terms);

    const change = await db.$transaction(async (tx) => {
        const posted = await tx.ledgerEntry.aggregate({ _sum: { amount: true }, where: { bookingId, type: { in: ["COMMISSION_OWED", "ADJUSTMENT"] } } });
        const difference = round2(split.technicianOwes - num(posted._sum.amount));

        await tx.booking.update({
            where: { id: bookingId },
            data: {
                laborAmount,
                partsAmount,
                amountCollected,
                commissionRateApplied: terms.ratePercent.toFixed(2),
                commissionFlatApplied: terms.flatAmount.toFixed(2),
                ownerRateApplied: terms.ownerRatePercent.toFixed(2),
            },
        });
        if (difference !== 0 && booking.technicianId) {
            await tx.ledgerEntry.create({
                data: { technicianId: booking.technicianId, storeId: booking.storeId, bookingId, type: "ADJUSTMENT", amount: difference.toFixed(2), note: `Amounts corrected on ${booking.bookingRef}: ${note}` },
            });
        }

        // The owner's share follows the same correction, for a co-admin's store.
        if (!current.isMain) {
            const ownerPosted = await tx.storeLedgerEntry.aggregate({ _sum: { amount: true }, where: { bookingId, type: { in: ["OWNER_SHARE_OWED", "ADJUSTMENT"] } } });
            const ownerDifference = round2(split.ownerShare - num(ownerPosted._sum.amount));
            if (ownerDifference !== 0) {
                await tx.storeLedgerEntry.create({
                    data: { storeId: booking.storeId, bookingId, type: "ADJUSTMENT", amount: ownerDifference.toFixed(2), note: `Amounts corrected on ${booking.bookingRef}: ${note}` },
                });
            }
        }

        await tx.bookingStatusHistory.create({
            data: {
                bookingId,
                fromStatus: "COMPLETED",
                toStatus: "COMPLETED",
                changedByType: "admin",
                changedById: scope.adminId,
                note: `Amounts corrected (service ₹${booking.laborAmount} to ₹${laborAmount}, parts ₹${booking.partsAmount} to ₹${partsAmount}, collected ₹${booking.amountCollected ?? 0} to ₹${amountCollected}): ${note}`,
            },
        });
        return difference;
    });

    await logAudit({
        actorType: "admin",
        actorId: scope.adminId,
        action: "booking.correctAmounts",
        entity: "Booking",
        entityId: bookingId,
        before: { laborAmount: booking.laborAmount, partsAmount: booking.partsAmount, amountCollected: booking.amountCollected },
        after: { laborAmount, partsAmount, amountCollected, note },
    });

    return ok({ commissionChange: change });
}

// ---------- expenses ----------
// The owner's own costs (ads, salaries, store management) have no store. A co-admin's costs belong to their store.

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
    storeName: string | null;
}

export interface ExpenseList {
    items: ExpenseItem[];
    totals: { expense: number; adSpend: number };
    page: number;
    pageCount: number;
}

const EXPENSE_PAGE = 25;

// A co-admin sees their store's costs. The owner sees all of them.
const expenseScope = (scope: AdminScope): Prisma.ExpenseWhereInput => (scope.storeIds ? { storeId: { in: scope.storeIds } } : {});
// Whose costs count against this admin's profit: the owner's business-wide costs, or the co-admin's store costs.
const ownCosts = (scope: AdminScope): Prisma.ExpenseWhereInput => (scope.storeIds ? { storeId: { in: scope.storeIds } } : { storeId: null });

export async function listExpenses(scope: AdminScope, range: DateRange, page = 1): Promise<ExpenseList> {
    const where: Prisma.ExpenseWhereInput = { ...expenseScope(scope), date: between(range) };
    const safePage = Math.max(1, page);

    const [rows, total, grouped] = await Promise.all([
        db.expense.findMany({
            where,
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            skip: (safePage - 1) * EXPENSE_PAGE,
            take: EXPENSE_PAGE,
            include: { technician: { select: { name: true } }, booking: { select: { bookingRef: true } }, store: { select: { name: true } } },
        }),
        db.expense.count({ where }),
        db.expense.groupBy({ by: ["type"], where: { ...ownCosts(scope), date: between(range) }, _sum: { amount: true } }),
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
            storeName: r.store?.name ?? null,
        })),
        totals: { expense: sumOf("EXPENSE"), adSpend: sumOf("AD_SPEND") },
        page: safePage,
        pageCount: Math.max(1, Math.ceil(total / EXPENSE_PAGE)),
    };
}

async function expenseData(scope: AdminScope, raw: unknown): Promise<Result<Prisma.ExpenseUncheckedCreateInput>> {
    const parsed = ExpenseInputSchema.safeParse(raw);
    if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
    const input = parsed.data;

    let bookingId: string | null = null;
    if (input.bookingRef) {
        const booking = await db.booking.findFirst({ where: { bookingRef: input.bookingRef.toUpperCase(), ...storeOnlyWhere(scope) }, select: { id: true } });
        if (!booking) return fail("invalid", `No booking with reference ${input.bookingRef}`);
        bookingId = booking.id;
    }
    if (input.technicianId) {
        const technician = await db.technician.findFirst({ where: { id: input.technicianId, ...storeOnlyWhere(scope) }, select: { id: true } });
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
        storeId: scope.storeIds ? scope.storeIds[0] : null,
    });
}

export async function createExpense(scope: AdminScope, raw: unknown): Promise<Result<{ id: string }>> {
    const data = await expenseData(scope, raw);
    if (!data.ok) return data;
    const expense = await db.expense.create({ data: data.data });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "expense.create", entity: "Expense", entityId: expense.id, after: { type: expense.type, category: expense.category, amount: num(expense.amount) } });
    return ok({ id: expense.id });
}

export async function updateExpense(scope: AdminScope, id: string, raw: unknown): Promise<Result<{ id: string }>> {
    const before = await db.expense.findFirst({ where: { id, ...expenseScope(scope) } });
    if (!before) return fail("not_found", "Expense not found");
    const data = await expenseData(scope, raw);
    if (!data.ok) return data;
    // An expense stays with the store it was created for.
    await db.expense.update({ where: { id }, data: { ...data.data, storeId: before.storeId } });
    await logAudit({
        actorType: "admin",
        actorId: scope.adminId,
        action: "expense.update",
        entity: "Expense",
        entityId: id,
        before: { type: before.type, category: before.category, amount: num(before.amount) },
        after: { type: data.data.type, category: data.data.category, amount: Number(data.data.amount) },
    });
    return ok({ id });
}

export async function deleteExpense(scope: AdminScope, id: string): Promise<Result<null>> {
    const before = await db.expense.findFirst({ where: { id, ...expenseScope(scope) } });
    if (!before) return fail("not_found", "Expense not found");
    await db.expense.delete({ where: { id } });
    await logAudit({ actorType: "admin", actorId: scope.adminId, action: "expense.delete", entity: "Expense", entityId: id, before: { type: before.type, category: before.category, amount: num(before.amount) } });
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

export interface StoreFinanceRow {
    storeId: string;
    name: string;
    isMain: boolean;
    jobs: number;
    // What the technicians owed the store for jobs in this period.
    commission: number;
    // The owner's part of it (for the owner's own store, all of it).
    ownerShare: number;
    storeKeeps: number;
    // What the store owes the owner right now.
    owesOwner: number;
}

export interface FinanceSummary {
    viewer: "OWNER" | "CO_ADMIN";
    sales: { jobs: number; collected: number; labor: number; parts: number };
    // What technicians owed their stores, before any split.
    commissionEarned: number;
    // What this admin actually earns: the owner's shares, or a co-admin's own part.
    income: number;
    expenses: number;
    adSpend: number;
    profit: number;
    outstandingCommission: number;
    // For the owner: what co-admin stores owe them. For a co-admin: what their store owes the owner.
    owedToOwner: number;
    ads: { bookingsFromAds: number; totalBookings: number; costPerAdBooking: number | null };
    technicians: TechnicianFinanceRow[];
    stores: StoreFinanceRow[];
}

export async function getFinanceSummary(scope: AdminScope, range: DateRange): Promise<FinanceSummary> {
    const completedAt = between(range);
    const createdAt = between(range);
    const bWhere = bookingWhere(scope);
    const tWhere = technicianWhere(scope);

    // A city picked in the switcher limits money entries to that city's bookings.
    let cityBookingIds: string[] | null = null;
    if (scope.cityId) {
        cityBookingIds = (await db.booking.findMany({ where: { serviceAreaId: scope.cityId, ...(scope.storeIds ? { storeId: { in: scope.storeIds } } : {}) }, select: { id: true } })).map((b) => b.id);
    }
    const ledgerWhere: Prisma.LedgerEntryWhereInput = { ...storeOnlyWhere(scope), ...(cityBookingIds ? { bookingId: { in: cityBookingIds } } : {}) };
    const storeLedgerWhere: Prisma.StoreLedgerEntryWhereInput = { ...storeOnlyWhere(scope), ...(cityBookingIds ? { bookingId: { in: cityBookingIds } } : {}) };
    const commissionTypes = { in: ["COMMISSION_OWED", "ADJUSTMENT"] as ("COMMISSION_OWED" | "ADJUSTMENT")[] };

    const [sales, commissionByStore, ownerShareByStore, expenseGroups, adBookings, allBookings, outstanding, perTechnician, ledgerByTechnician, balances, technicians, stores, storeBalances, jobsByStore] = await Promise.all([
        db.booking.aggregate({ _sum: { amountCollected: true, laborAmount: true, partsAmount: true }, _count: { _all: true }, where: { ...bWhere, status: "COMPLETED", completedAt } }),
        db.ledgerEntry.groupBy({ by: ["storeId"], where: { ...ledgerWhere, type: commissionTypes, createdAt }, _sum: { amount: true } }),
        db.storeLedgerEntry.groupBy({ by: ["storeId"], where: { ...storeLedgerWhere, type: { in: ["OWNER_SHARE_OWED", "ADJUSTMENT"] }, createdAt }, _sum: { amount: true } }),
        db.expense.groupBy({ by: ["type"], where: { ...(scope.storeIds ? { storeId: { in: scope.storeIds } } : { storeId: null }), date: between(range) }, _sum: { amount: true } }),
        db.booking.count({ where: { ...bWhere, utmSource: { not: null }, createdAt } }),
        db.booking.count({ where: { ...bWhere, createdAt } }),
        db.ledgerEntry.aggregate({ _sum: { amount: true }, where: ledgerWhere }),
        db.booking.groupBy({ by: ["technicianId"], where: { ...bWhere, status: "COMPLETED", technicianId: { not: null }, completedAt }, _sum: { amountCollected: true, laborAmount: true }, _count: { _all: true } }),
        db.ledgerEntry.groupBy({ by: ["technicianId"], where: { ...ledgerWhere, type: commissionTypes, createdAt }, _sum: { amount: true } }),
        db.ledgerEntry.groupBy({ by: ["technicianId"], where: ledgerWhere, _sum: { amount: true } }),
        db.technician.findMany({ where: tWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        db.store.findMany({ where: scope.storeIds ? { id: { in: scope.storeIds } } : {}, select: { id: true, name: true, isMain: true }, orderBy: [{ isMain: "desc" }, { name: "asc" }] }),
        db.storeLedgerEntry.groupBy({ by: ["storeId"], where: storeOnlyWhere(scope), _sum: { amount: true } }),
        db.booking.groupBy({ by: ["storeId"], where: { ...bWhere, status: "COMPLETED", completedAt }, _count: { _all: true } }),
    ]);

    const spend = (type: string) => round2(num(expenseGroups.find((g) => g.type === type)?._sum.amount));
    const expenses = spend("EXPENSE");
    const adSpend = spend("AD_SPEND");

    const commissionOf = new Map(commissionByStore.map((r) => [r.storeId, num(r._sum.amount)]));
    const ownerShareOf = new Map(ownerShareByStore.map((r) => [r.storeId, num(r._sum.amount)]));
    const owesOf = new Map(storeBalances.map((r) => [r.storeId, num(r._sum.amount)]));
    const jobsOf = new Map(jobsByStore.map((r) => [r.storeId, r._count._all]));

    const storeRows: StoreFinanceRow[] = stores.map((s) => {
        const commission = round2(commissionOf.get(s.id) ?? 0);
        // In the owner's own store the owner receives the whole commission. Elsewhere it is the store ledger's share.
        const ownerShare = s.isMain ? commission : round2(ownerShareOf.get(s.id) ?? 0);
        return { storeId: s.id, name: s.name, isMain: s.isMain, jobs: jobsOf.get(s.id) ?? 0, commission, ownerShare, storeKeeps: round2(commission - ownerShare), owesOwner: s.isMain ? 0 : round2(owesOf.get(s.id) ?? 0) };
    });

    const commissionEarned = round2(storeRows.reduce((n, r) => n + r.commission, 0));
    const income = round2(storeRows.reduce((n, r) => n + (isOwner(scope) ? r.ownerShare : r.storeKeeps), 0));
    const owedToOwner = round2(storeRows.reduce((n, r) => n + r.owesOwner, 0));

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
        viewer: scope.role,
        sales: { jobs: sales._count._all, collected: sales._sum.amountCollected ?? 0, labor: sales._sum.laborAmount ?? 0, parts: sales._sum.partsAmount ?? 0 },
        commissionEarned,
        income,
        expenses,
        adSpend,
        profit: round2(income - expenses - adSpend),
        outstandingCommission: round2(num(outstanding._sum.amount)),
        owedToOwner,
        ads: { bookingsFromAds: adBookings, totalBookings: allBookings, costPerAdBooking: adBookings > 0 && adSpend > 0 ? round2(adSpend / adBookings) : null },
        technicians: rows,
        stores: storeRows,
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
