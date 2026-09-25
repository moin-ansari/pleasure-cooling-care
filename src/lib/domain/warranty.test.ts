import { describe, expect, it } from "vitest";
import { warrantyStatusOf } from "./warranty";

const now = new Date("2026-09-25T10:00:00Z");
const day = 86400000;
const base = { status: "COMPLETED", warrantyExpiresAt: new Date(now.getTime() + 10 * day), warrantyClaimOfId: null, claimsAgainst: [] };
const claim = (status: "PENDING" | "APPROVED" | "REJECTED") => ({ status, rejectReason: null, createdAt: now });

describe("warrantyStatusOf", () => {
    it("allows a claim while the guarantee runs", () => {
        const s = warrantyStatusOf(base, now)!;
        expect(s.canClaim).toBe(true);
        expect(s.daysLeft).toBe(10);
    });

    it("has no guarantee when the service has none, the job is open, or it was a free re-service", () => {
        expect(warrantyStatusOf({ ...base, warrantyExpiresAt: null }, now)).toBeNull();
        expect(warrantyStatusOf({ ...base, status: "WORKING" }, now)).toBeNull();
        expect(warrantyStatusOf({ ...base, warrantyClaimOfId: "x" }, now)).toBeNull();
    });

    it("blocks claims after expiry", () => {
        const s = warrantyStatusOf({ ...base, warrantyExpiresAt: new Date(now.getTime() - day) }, now)!;
        expect(s.canClaim).toBe(false);
        expect(s.daysLeft).toBe(0);
    });

    it("allows one free re-service per job, but a declined claim can be raised again", () => {
        expect(warrantyStatusOf({ ...base, claimsAgainst: [claim("PENDING")] }, now)!.canClaim).toBe(false);
        expect(warrantyStatusOf({ ...base, claimsAgainst: [claim("APPROVED")] }, now)!.canClaim).toBe(false);
        expect(warrantyStatusOf({ ...base, claimsAgainst: [claim("REJECTED")] }, now)!.canClaim).toBe(true);
    });
});
