import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fail, ok, type Result } from "@/lib/domain/result";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_FOLDERS = ["services", "technicians"] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// The real type comes from the first bytes of the file, never from its name or the type the browser reports.
export function sniffImageType(bytes: Uint8Array): string | null {
    if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (bytes.length > 12 && String.fromCharCode(...Array.from(bytes.slice(0, 4))) === "RIFF" && String.fromCharCode(...Array.from(bytes.slice(8, 12))) === "WEBP") return "image/webp";
    return null;
}

const supabaseConfig = () => {
    const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    return url && key ? { url, key, bucket: process.env.SUPABASE_BUCKET?.trim() || "pcc-public" } : null;
};

export const storageMode = (): "supabase" | "local" | "none" => (supabaseConfig() ? "supabase" : process.env.NODE_ENV !== "production" ? "local" : "none");

// Stores a public image and returns the address to save. Uses Supabase Storage when configured. While developing on a
// computer it falls back to public/uploads. On the live site without Supabase it refuses, because that disk is temporary.
export async function saveImage(bytes: Uint8Array, folder: ImageFolder): Promise<Result<{ url: string }>> {
    if (bytes.length === 0) return fail("empty", "Choose an image");
    if (bytes.length > MAX_IMAGE_BYTES) return fail("too_large", "The image is larger than 2 MB. Choose a smaller one.");
    const type = sniffImageType(bytes);
    if (!type) return fail("bad_type", "Use a JPG, PNG or WebP image");

    const key = `${folder}/${randomUUID()}.${EXTENSIONS[type]}`;
    const supabase = supabaseConfig();

    if (supabase) {
        const res = await fetch(`${supabase.url}/storage/v1/object/${supabase.bucket}/${key}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${supabase.key}`, "Content-Type": type, "x-upsert": "false" },
            body: bytes,
        });
        if (!res.ok) {
            console.error("supabase upload failed", res.status, await res.text().catch(() => ""));
            return fail("storage_failed", "The image could not be stored. Please try again.");
        }
        return ok({ url: `${supabase.url}/storage/v1/object/public/${supabase.bucket}/${key}` });
    }

    if (process.env.NODE_ENV !== "production") {
        const file = path.join(process.cwd(), "public", "uploads", key);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, bytes);
        return ok({ url: `/uploads/${key}` });
    }

    return fail("not_configured", "Image storage is not set up yet. Add the Supabase keys on the server.");
}
