import { RANGE_PRESETS, resolveRange, type DateRange, type RangePreset } from "@/lib/dateRange";

// Reads ?range=this_month&from=YYYY-MM-DD&to=YYYY-MM-DD from a request.
export function rangeFromParams(params: URLSearchParams): { preset: RangePreset; range: DateRange } {
    const preset = RANGE_PRESETS.find((p) => p === params.get("range")) ?? "this_month";
    return { preset, range: resolveRange(preset, params.get("from") ?? undefined, params.get("to") ?? undefined) };
}
