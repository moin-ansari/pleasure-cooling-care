export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pleasurecoolingcare.com").replace(/\/$/, "");

export function absoluteUrl(path: string): string {
    return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
