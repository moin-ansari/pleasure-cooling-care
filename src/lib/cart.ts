// Client-side only, no accounts: what's in the cart lives in this browser until checkout. Same defensive
// try/catch-and-ignore pattern as src/lib/attribution.ts for storage being blocked or unavailable.
const STORAGE_KEY = "pcc_cart";

export interface CartLine {
    serviceId: string;
    qty: number;
}

export function readCart(): CartLine[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((l): l is CartLine => typeof l?.serviceId === "string" && Number.isInteger(l?.qty) && l.qty > 0);
    } catch {
        return [];
    }
}

export function writeCart(lines: CartLine[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
        // storage blocked; the cart just won't persist across reloads
    }
}

export { MAX_QTY_PER_LINE, MAX_TOTAL_UNITS } from "@/constants/booking";

export function totalUnits(lines: CartLine[]): number {
    return lines.reduce((n, l) => n + l.qty, 0);
}
