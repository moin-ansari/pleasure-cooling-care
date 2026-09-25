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
