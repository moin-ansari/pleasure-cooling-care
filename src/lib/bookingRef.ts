import { randomInt } from "node:crypto";

// No 0/O/1/I so the reference is easy to read aloud and type.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateBookingRef(): string {
    let code = "";
    for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
    return `PCC-${code}`;
}
