// Accepts what people type or say: "98765 43210", "+91 98765-43210", "09876543210", "919876543210".
export function normalizeIndianMobile(input: string): string {
    let digits = String(input ?? "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    return digits;
}

export function isValidIndianMobile(input: string): boolean {
    return /^[6-9]\d{9}$/.test(normalizeIndianMobile(input));
}
