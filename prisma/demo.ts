// Fills a LOCAL database with sample jobs in every state so screens can be tested by hand.
// It deletes all bookings, reviews, claims, ledger, expenses, messages and the activity log first.
// Refuses to run unless DATABASE_URL points at this computer.
import bcryptjs from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateBookingRef } from "../src/lib/bookingRef";
import { splitCommission } from "../src/lib/money";
import { rankFor } from "../src/lib/rank";
import { addDaysToDateString, istDateString, istDateToUtc } from "../src/lib/time";

const db = new PrismaClient();

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error("Refusing to run: DATABASE_URL is not a local database.");
    process.exit(1);
}

const MIN = 60000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms);
const day = (offset: number) => istDateToUtc(addDaysToDateString(istDateString(), offset));

type Status = "NEW" | "CONFIRMED" | "ARRIVING" | "WORKING" | "DELAYED" | "COMPLETED" | "CANCELLED";
const PATH: Record<Status, Status[]> = {
    NEW: ["NEW"],
    CONFIRMED: ["NEW", "CONFIRMED"],
    ARRIVING: ["NEW", "CONFIRMED", "ARRIVING"],
    WORKING: ["NEW", "CONFIRMED", "ARRIVING", "WORKING"],
    DELAYED: ["NEW", "CONFIRMED", "ARRIVING", "DELAYED"],
    COMPLETED: ["NEW", "CONFIRMED", "ARRIVING", "WORKING", "COMPLETED"],
    CANCELLED: ["NEW", "CANCELLED"],
};

async function main() {
    await db.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
    const mainStore = await db.store.findFirstOrThrow({ where: { isMain: true } });
    await db.store.update({ where: { id: mainStore.id }, data: { technicianRatePercent: "20", ownerRatePercent: "20", flatAmount: "0" } });

    // A second store run by a co-admin, so both views can be tried. It keeps 10 of the 20 points; the owner gets 10.
    const pilStore = await db.store.upsert({
        where: { name: "Pilibhit Store" },
        update: { technicianRatePercent: "20", ownerRatePercent: "10", flatAmount: "0", isActive: true },
        create: { name: "Pilibhit Store", technicianRatePercent: "20", ownerRatePercent: "10", flatAmount: "0" },
    });
    await db.serviceArea.updateMany({ where: { district: "Bareilly" }, data: { storeId: mainStore.id } });
    await db.serviceArea.updateMany({ where: { district: "Pilibhit" }, data: { storeId: pilStore.id } });
    const coAdminData = { name: "Pilibhit Manager", phone: "9000000002", password: await bcryptjs.hash("Password#123", 10), isAdmin: true, role: "CO_ADMIN" as const, storeId: pilStore.id, isActive: true };
    await db.adminUser.upsert({ where: { email: "pilibhit@example.com" }, update: coAdminData, create: { email: "pilibhit@example.com", ...coAdminData } });
    const area = { bareilly: await db.serviceArea.findFirstOrThrow({ where: { district: "Bareilly" } }), pilibhit: await db.serviceArea.findFirstOrThrow({ where: { district: "Pilibhit" } }) };

    // ---- wipe ----
    await db.review.deleteMany();
    await db.warrantyClaim.deleteMany();
    await db.technicianUnavailability.deleteMany();
    await db.storeLedgerEntry.deleteMany();
    await db.ledgerEntry.deleteMany();
    await db.expense.deleteMany();
    await db.notificationLog.deleteMany();
    await db.auditLog.deleteMany();
    await db.bookingStatusHistory.deleteMany();
    await db.booking.deleteMany();

    // ---- sample services for every appliance (AC ones come from the normal seed) ----
    // Refrigerator Install and Geyser Install are retired — not in this list, so a fresh seed never
    // recreates them (the now-stale rows from an older seed are deactivated separately, below).
    const extra: { category: string; subType: string; serviceType: string; price: number; warrantyDays: number; image: string; desc: string[] }[] = [
        {
            category: "REFRIGERATOR",
            subType: "Double Door",
            serviceType: "Refrigerator Repair",
            price: 349,
            warrantyDays: 15,
            image: "/images/appliances/refrigerator-repair.png",
            desc: ["Diagnosis of cooling, compressor and electrical faults", "Spare parts cost confirmed before any repair"],
        },
        {
            category: "REFRIGERATOR",
            subType: "Single Door",
            serviceType: "Refrigerator Repair",
            price: 299,
            warrantyDays: 15,
            image: "/images/appliances/refrigerator-repair.png",
            desc: ["Diagnosis of cooling, compressor and electrical faults", "Spare parts cost confirmed before any repair"],
        },
        {
            category: "WASHING_MACHINE",
            subType: "Top Load",
            serviceType: "Washing Machine Repair",
            price: 349,
            warrantyDays: 15,
            image: "/images/appliances/washing-machine-repair.png",
            desc: ["Diagnosis of motor, drum and electrical faults", "Spare parts cost confirmed before any repair"],
        },
        {
            category: "WASHING_MACHINE",
            subType: "Front Load",
            serviceType: "Washing Machine Deep Clean",
            price: 899,
            warrantyDays: 0,
            image: "/images/appliances/washing-machine-clean.png",
            desc: ["Drum and tub deep clean to remove odour and residue", "Exterior wipe-down included"],
        },
        {
            category: "GEYSER",
            subType: "Electric",
            serviceType: "Geyser Repair",
            price: 299,
            warrantyDays: 15,
            image: "/images/appliances/geyser-repair.jpg",
            desc: ["Diagnosis of heating element, thermostat and wiring faults", "Spare parts cost confirmed before any repair"],
        },
    ];
    for (const item of extra) {
        await db.service.upsert({
            where: {
                applianceCategory_applianceSubType_serviceType: { applianceCategory: item.category as never, applianceSubType: item.subType, serviceType: item.serviceType },
            },
            update: {},
            create: {
                applianceCategory: item.category as never,
                applianceSubType: item.subType,
                serviceType: item.serviceType,
                price: item.price,
                image: item.image,
                desc: item.desc,
                warrantyDurationDays: item.warrantyDays,
            },
        });
    }
    await db.service.updateMany({ where: { serviceType: { in: ["Refrigerator Install", "Geyser Install"] } }, data: { isActive: false } });
    const svc = async (category: string, serviceType: string) => db.service.findFirstOrThrow({ where: { applianceCategory: category as never, serviceType }, orderBy: { price: "asc" } });

    // ---- technicians ----
    const pinHash = await bcryptjs.hash("123456", 10);
    const people = [
        { name: "Ravi Kumar", email: "ravi@example.com", phone: "9876543210", cats: ["AC", "REFRIGERATOR"], areas: [area.bareilly] },
        { name: "Amit Sharma", email: "amit@example.com", phone: "9876543211", cats: ["AC", "GEYSER"], areas: [area.bareilly] },
        { name: "Sanjay Verma", email: "sanjay@example.com", phone: "9876543212", cats: ["WASHING_MACHINE", "REFRIGERATOR"], areas: [area.bareilly] },
        { name: "Imran Khan", email: "imran@example.com", phone: "9876543213", cats: ["AC", "WASHING_MACHINE", "GEYSER"], areas: [area.pilibhit] },
    ];
    const tech: Record<string, { id: string; name: string; storeId: string }> = {};
    for (const p of people) {
        const data = {
            name: p.name,
            phone: p.phone,
            workEmail: p.email,
            pinHash,
            failedPinAttempts: 0,
            lockedUntil: null,
            isActive: true,
            storeId: p.areas[0].storeId,
            experienceYears: 4,
            specializations: p.cats as never[],
            jobsCompletedCount: 0,
            averageRating: 0,
            ratingCount: 0,
            rank: "BRONZE" as const,
            serviceAreas: { set: p.areas.map((a) => ({ id: a.id })) },
        };
        const t = await db.technician.upsert({ where: { workEmail: p.email }, update: data, create: { ...data, serviceAreas: { connect: p.areas.map((a) => ({ id: a.id })) } } });
        tech[p.name.split(" ")[0]] = { id: t.id, name: t.name, storeId: t.storeId };
    }

    // ---- bookings ----
    const customers = [
        ["Rahul Gupta", "9111111101", "Civil Lines", "243001", "12 Civil Lines Road"],
        ["Sunita Devi", "9111111102", "Rampur Garden", "243001", "45 Rampur Garden"],
        ["Mohit Agarwal", "9111111103", "Izatnagar", "243122", "7 Railway Colony, Izatnagar"],
        ["Farida Begum", "9111111104", "Kotwali", "243003", "23 Kotwali Bazaar"],
        ["Deepak Saxena", "9111111105", "Pilibhit City", "262001", "88 Station Road"],
        ["Priya Singh", "9111111106", "Puranpur", "262122", "15 Main Market, Puranpur"],
        ["Test Customer", "9333333331", "Bareilly", "243001", "5 Test Lane"],
        ["Anil Kapoor", "9111111107", "Subhash Nagar", "243001", "101 Subhash Nagar"],
    ] as const;
    let cust = 0;
    const nextCustomer = () => customers[cust++ % customers.length];

    const created: Record<string, { id: string; ref: string }> = {};
    const mk = async (key: string, o: { status: Status; category: string; service: string; techName?: string; dateOffset: number; time: string; createdAgo: number; area?: "bareilly" | "pilibhit"; labor?: number; parts?: number; collected?: number; completedAgo?: number; cancel?: string; customerIdx?: number; note?: string; redoOf?: string }) => {
      const [name, mobile, town, pincode, street] = o.customerIdx !== undefined ? customers[o.customerIdx] : nextCustomer();
      const s = await svc(o.category, o.service);
      const t = o.techName ? tech[o.techName] : undefined;
      const a = area[o.area ?? "bareilly"];
      const createdAt = ago(o.createdAgo);
      const completedAt = o.status === "COMPLETED" ? ago(o.completedAgo ?? 2 * HOUR) : null;
      const arrival = new Date(day(o.dateOffset).getTime() + 10 * HOUR);
      const labor = o.labor ?? 0;
      const booking = await db.booking.create({
        data: {
          bookingRef: generateBookingRef(),
          source: key === "redo" ? "ADMIN" : "WEB",
          status: o.status,
          customerName: name,
          mobile,
          streetAddress: street,
          town,
          pincode,
          serviceAreaId: a.id,
          storeId: a.storeId,
          lat: 28.367 + Math.random() * 0.03,
          lng: 79.43 + Math.random() * 0.03,
          date: day(o.dateOffset),
          time: o.time,
          confirmedArrivalAt: o.status === "NEW" || o.status === "CANCELLED" ? null : arrival,
          etaAt: o.status === "ARRIVING" ? new Date(Date.now() + 20 * MIN) : null,
          serviceId: s.id,
          applianceCategory: s.applianceCategory,
          applianceSubType: s.applianceSubType,
          serviceType: s.serviceType,
          price: key === "redo" ? 0 : s.price,
          laborAmount: labor,
          partsAmount: o.parts ?? 0,
          amountCollected: o.status === "COMPLETED" ? o.collected ?? labor + (o.parts ?? 0) : null,
          commissionRateApplied: o.status === "COMPLETED" ? "15.00" : null,
          commissionFlatApplied: o.status === "COMPLETED" ? "0.00" : null,
          technicianId: t?.id ?? null,
          warrantyClaimOfId: o.redoOf ? created[o.redoOf].id : null,
          warrantyExpiresAt: completedAt && s.warrantyDurationDays > 0 && !o.redoOf ? new Date(completedAt.getTime() + s.warrantyDurationDays * DAY) : null,
          cancelReason: o.cancel ?? null,
          technicianNotes: o.status === "DELAYED" ? "Spare part not available, will return tomorrow" : o.note ?? null,
          completedAt,
          createdAt,
          utmSource: key === "ad1" || key === "ad2" ? "google" : null,
          utmCampaign: key === "ad1" || key === "ad2" ? "ac-summer" : null,
        },
      });
      let at = createdAt.getTime();
      const steps = PATH[o.status];
      for (let i = 0; i < steps.length; i++) {
        at += 12 * MIN;
        await db.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            fromStatus: i === 0 ? null : steps[i - 1],
            toStatus: steps[i],
            changedByType: i === 0 ? "customer" : steps[i] === "CANCELLED" ? (o.cancel?.startsWith("Customer") ? "customer" : "admin") : steps[i] === "CONFIRMED" ? "admin" : "technician",
            changedById: i === 0 ? null : steps[i] === "CONFIRMED" || steps[i] === "CANCELLED" ? null : t?.id ?? null,
            note: steps[i] === "CANCELLED" ? o.cancel ?? null : steps[i] === "DELAYED" ? "Spare part not available, will return tomorrow" : null,
            createdAt: new Date(Math.min(at, completedAt ? completedAt.getTime() : Date.now())),
          },
        });
      }
      if (o.status === "COMPLETED" && t) {
        const inPilibhit = a.storeId === pilStore.id;
        const split = splitCommission(labor, { ratePercent: 20, ownerRatePercent: inPilibhit ? 10 : 20, flatAmount: 0 });
        if (split.technicianOwes > 0) {
          await db.ledgerEntry.create({
            data: { technicianId: t.id, storeId: a.storeId, bookingId: booking.id, type: "COMMISSION_OWED", amount: split.technicianOwes.toFixed(2), note: `20% of ₹${labor}`, createdAt: completedAt! },
          });
          if (inPilibhit) {
            await db.storeLedgerEntry.create({
              data: { storeId: a.storeId, bookingId: booking.id, type: "OWNER_SHARE_OWED", amount: split.ownerShare.toFixed(2), note: `Owner share of ${booking.bookingRef}`, createdAt: completedAt! },
            });
          }
        }
        await db.booking.update({ where: { id: booking.id }, data: { commissionRateApplied: "20.00", ownerRateApplied: inPilibhit ? "10.00" : "20.00", commissionFlatApplied: "0.00" } });
      }
      created[key] = { id: booking.id, ref: booking.bookingRef };
      return booking;
    };

    // New (waiting for a technician). The first has waited long enough to be flagged.
    await mk("new1", { status: "NEW", category: "AC", service: "AC Repair", dateOffset: 0, time: "04:00 PM", createdAgo: 90 * MIN });
    await mk("new2", { status: "NEW", category: "REFRIGERATOR", service: "Refrigerator Repair", dateOffset: 1, time: "10:00 AM", createdAgo: 8 * MIN });
    await mk("new3", { status: "NEW", category: "GEYSER", service: "Geyser Repair", dateOffset: 1, time: "02:00 PM", createdAgo: 3 * MIN, area: "pilibhit", customerIdx: 4 });
    // Confirmed
    await mk("conf1", { status: "CONFIRMED", category: "AC", service: "AC Repair", techName: "Ravi", dateOffset: 0, time: "06:00 PM", createdAgo: 5 * HOUR });
    await mk("conf2", { status: "CONFIRMED", category: "WASHING_MACHINE", service: "Washing Machine Repair", techName: "Sanjay", dateOffset: 1, time: "12:00 PM", createdAgo: 4 * HOUR });
    await mk("conf3", { status: "CONFIRMED", category: "AC", service: "AC Repair", techName: "Amit", dateOffset: -1, time: "02:00 PM", createdAgo: 30 * HOUR, note: "Technician has not started" });
    // In progress
    await mk("arr", { status: "ARRIVING", category: "AC", service: "AC Repair", techName: "Ravi", dateOffset: 0, time: "12:00 PM", createdAgo: 6 * HOUR, customerIdx: 6 });
    await mk("work", { status: "WORKING", category: "REFRIGERATOR", service: "Refrigerator Repair", techName: "Sanjay", dateOffset: 0, time: "10:00 AM", createdAgo: 7 * HOUR });
    await mk("delay", { status: "DELAYED", category: "GEYSER", service: "Geyser Repair", techName: "Imran", dateOffset: 0, time: "10:00 AM", createdAgo: 8 * HOUR, area: "pilibhit", customerIdx: 5 });
    // Completed (guarantee running on most)
    await mk("done1", { status: "COMPLETED", category: "AC", service: "AC Repair", techName: "Ravi", dateOffset: 0, time: "10:00 AM", createdAgo: 9 * HOUR, labor: 299, parts: 500, completedAgo: 2 * HOUR, customerIdx: 6 });
    await mk("done2", { status: "COMPLETED", category: "REFRIGERATOR", service: "Refrigerator Repair", techName: "Ravi", dateOffset: -1, time: "12:00 PM", createdAgo: 30 * HOUR, labor: 349, parts: 0, completedAgo: 26 * HOUR });
    await mk("done3", { status: "COMPLETED", category: "WASHING_MACHINE", service: "Washing Machine Repair", techName: "Sanjay", dateOffset: -2, time: "02:00 PM", createdAgo: 55 * HOUR, labor: 349, parts: 850, completedAgo: 50 * HOUR });
    await mk("done4", { status: "COMPLETED", category: "GEYSER", service: "Geyser Install", techName: "Amit", dateOffset: -3, time: "10:00 AM", createdAgo: 80 * HOUR, labor: 449, parts: 0, completedAgo: 74 * HOUR });
    await mk("done5", { status: "COMPLETED", category: "AC", service: "Gas leak fix & refill", techName: "Imran", dateOffset: -5, time: "04:00 PM", createdAgo: 130 * HOUR, labor: 2449, parts: 0, completedAgo: 120 * HOUR, area: "pilibhit", customerIdx: 5 });
    await mk("done6", { status: "COMPLETED", category: "AC", service: "AC Repair", techName: "Amit", dateOffset: -20, time: "10:00 AM", createdAgo: 20 * DAY + HOUR, labor: 299, parts: 200, completedAgo: 20 * DAY });
    await mk("ad1", { status: "NEW", category: "AC", service: "AC Repair", dateOffset: 2, time: "10:00 AM", createdAgo: 20 * MIN, customerIdx: 7 });
    await mk("ad2", { status: "COMPLETED", category: "AC", service: "AC Repair", techName: "Ravi", dateOffset: -4, time: "12:00 PM", createdAgo: 100 * HOUR, labor: 299, parts: 0, completedAgo: 96 * HOUR, customerIdx: 7 });
    // Cancelled
    await mk("can1", { status: "CANCELLED", category: "AC", service: "AC Repair", dateOffset: 1, time: "10:00 AM", createdAgo: 12 * HOUR, cancel: "Customer changed their mind" });
    await mk("can2", { status: "CANCELLED", category: "REFRIGERATOR", service: "Refrigerator Repair", techName: "Ravi", dateOffset: 0, time: "02:00 PM", createdAgo: 10 * HOUR, cancel: "Customer not reachable on phone" });

    // Guarantee: one pending claim, one approved with its free re-service, one expired, one declined.
    await db.warrantyClaim.create({ data: { originalBookingId: created.done2.id, issueDescription: "The fridge is not cooling again, water at the bottom", createdAt: ago(3 * HOUR) } });
    await db.warrantyClaim.create({ data: { originalBookingId: created.done3.id, issueDescription: "Drum makes a loud noise while spinning", status: "REJECTED", rejectReason: "Damage from a fall is not covered", resolvedAt: ago(20 * HOUR), createdAt: ago(30 * HOUR) } });
    await mk("redo", { status: "CONFIRMED", category: "GEYSER", service: "Geyser Install", techName: "Amit", dateOffset: 1, time: "04:00 PM", createdAgo: 5 * HOUR, customerIdx: 3, redoOf: "done4" });
    await db.warrantyClaim.create({ data: { originalBookingId: created.done4.id, createdBookingId: created.redo.id, issueDescription: "Water is leaking from the geyser tank joint", status: "APPROVED", resolvedAt: ago(5 * HOUR), createdAt: ago(8 * HOUR) } });
    await db.booking.update({ where: { id: created.done6.id }, data: { warrantyExpiresAt: ago(10 * DAY) } });

    // Reviews on three completed jobs.
    const reviews: [string, number, string | null][] = [
        ["done1", 5, "Very professional and fixed it quickly."],
        ["done3", 4, "Good work, came on time."],
        ["done6", 2, "Had to call twice before he arrived."],
    ];
    for (const [key, rating, comment] of reviews) {
        const b = await db.booking.findUniqueOrThrow({ where: { id: created[key].id } });
        await db.review.create({ data: { bookingId: b.id, technicianId: b.technicianId!, customerName: b.customerName, rating, comment } });
    }

    // Money: an office payment, an adjustment, expenses and ad spend.
    await db.ledgerEntry.create({ data: { technicianId: tech.Ravi.id, storeId: tech.Ravi.storeId, type: "OFFICE_PAYMENT", amount: "-40.00", note: "Cash paid at office", createdAt: ago(20 * HOUR) } });
    await db.ledgerEntry.create({ data: { technicianId: tech.Sanjay.id, storeId: tech.Sanjay.storeId, type: "ADJUSTMENT", amount: "-10.00", note: "Goodwill for a late job", createdAt: ago(40 * HOUR) } });
    await db.storeLedgerEntry.create({ data: { storeId: pilStore.id, type: "STORE_PAYMENT", amount: "-100.00", note: "Paid to the owner", createdAt: ago(10 * HOUR) } });
    const today = istDateToUtc(istDateString());
    const expenses: [string, string, number, number, string | null][] = [
        ["EXPENSE", "Fuel", 250, 0, "Technician bike fuel"],
        ["EXPENSE", "Spare parts", 1200, 2, "Compressor relay stock"],
        ["AD_SPEND", "Google Ads", 500, 0, null],
        ["AD_SPEND", "Google Ads", 650, 3, null],
    ];
    for (const [type, category, amount, back, note] of expenses) {
        await db.expense.create({ data: { type: type as never, category, amount: amount.toFixed(2), date: new Date(today.getTime() - back * DAY), note } });
    }
    // One cost that belongs to the Pilibhit store only.
    await db.expense.create({ data: { type: "EXPENSE", category: "Office rent", amount: "1500.00", date: new Date(today.getTime() - DAY), note: "Pilibhit office", storeId: pilStore.id } });

    // Technician stats from what was just created.
    const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    const thresholds = {
        SILVER: { minJobs: settings.silverMinJobs, minRating: settings.silverMinRating },
        GOLD: { minJobs: settings.goldMinJobs, minRating: settings.goldMinRating },
        DIAMOND: { minJobs: settings.diamondMinJobs, minRating: settings.diamondMinRating },
    };
    for (const t of Object.values(tech)) {
        const jobs = await db.booking.count({ where: { technicianId: t.id, status: "COMPLETED" } });
        const agg = await db.review.aggregate({ where: { technicianId: t.id, isPublic: true }, _avg: { rating: true }, _count: { _all: true } });
        const avg = Math.round((agg._avg.rating ?? 0) * 100) / 100;
        await db.technician.update({ where: { id: t.id }, data: { jobsCompletedCount: jobs, averageRating: avg, ratingCount: agg._count._all, rank: rankFor(jobs, avg, thresholds) } });
    }

    const counts = await db.booking.groupBy({ by: ["status"], _count: { _all: true } });
    console.log("Sample data ready:", counts.map((c) => `${c.status} ${c._count._all}`).join(", "));
    console.log("Technician logins (PIN 123456):", people.map((p) => p.email).join(", "));
    console.log("Customer to track:  9333333331 (also 9111111101 to 9111111107)");
    console.log("Co-admin (Pilibhit Store): pilibhit@example.com / Password#123");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => db.$disconnect());
