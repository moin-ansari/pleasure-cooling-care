export interface CommissionTerms {
    ratePercent: number;
    flatAmount: number;
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;

// Commission owed on one job: a percentage of the service charge plus an optional flat amount.
// Worked in paise so 15% of 299 is exactly 44.85 and not a floating point near-miss.
export function computeCommission(laborAmount: number, terms: CommissionTerms): number {
    const paise = Math.round(laborAmount * terms.ratePercent) + Math.round(terms.flatAmount * 100);
    return Math.max(0, paise) / 100;
}

export const rupees = (n: number): string =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

export interface StoreTerms extends CommissionTerms {
    // The part of ratePercent that goes to the owner. The flat amount always goes to the owner.
    ownerRatePercent: number;
}

export interface CommissionSplit {
    // What the technician owes the store for the job.
    technicianOwes: number;
    // What the owner receives out of it.
    ownerShare: number;
    // What the store itself keeps.
    storeKeeps: number;
}

// Splits one job's commission. Example: 20% with 10 for the owner and a Rs 50 flat charge on a Rs 1000 job is
// technician pays 250, owner gets 150 (10% + flat), store keeps 100. For the main store the owner rate equals the
// full rate, so the owner gets everything. Worked in paise to stay exact.
export function splitCommission(laborAmount: number, terms: StoreTerms): CommissionSplit {
    const flat = Math.round(terms.flatAmount * 100);
    const total = Math.max(0, Math.round(laborAmount * terms.ratePercent) + flat);
    const owner = Math.min(total, Math.max(0, Math.round(laborAmount * terms.ownerRatePercent) + flat));
    return { technicianOwes: total / 100, ownerShare: owner / 100, storeKeeps: (total - owner) / 100 };
}
