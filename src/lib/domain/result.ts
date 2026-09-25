export type Result<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const fail = (code: string, message: string): Result<never> => ({ ok: false, code, message });
