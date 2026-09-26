import { NextResponse } from "next/server";
import type { Result } from "@/lib/domain/result";

// One place that turns a domain result into an HTTP answer, so every route reports problems the same way.
export const statusFor = (code: string): number => {
    if (code === "not_found") return 404;
    if (code === "forbidden") return 403;
    if (["duplicate", "conflict", "in_use", "resolved", "has_cities", "has_history", "has_open_jobs", "has_balance", "already_requested", "technician_off"].includes(code)) return 409;
    return 400;
};

export function respond<T>(result: Result<T>, message: string | ((data: T) => string), options: { withData?: boolean } = {}) {
    if (!result.ok) return NextResponse.json({ status: "error", code: result.code, message: result.message }, { status: statusFor(result.code) });
    return NextResponse.json({ status: "success", message: typeof message === "function" ? message(result.data) : message, ...(options.withData === false ? {} : { data: result.data }) });
}

export const serverError = (label: string, error: unknown) => {
    console.error(label, error);
    return NextResponse.json({ status: "error", message: "Something went wrong" }, { status: 500 });
};
