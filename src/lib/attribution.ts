// Client-side only. Remembers which ad or campaign first brought the visitor, for the booking that follows.
const STORAGE_KEY = "pcc_attribution";

export interface Attribution {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    clickId?: string;
}

export function captureAttribution(): void {
    try {
        if (sessionStorage.getItem(STORAGE_KEY)) return;
        const params = new URLSearchParams(window.location.search);
        const attribution: Attribution = {
            utmSource: params.get("utm_source") || undefined,
            utmMedium: params.get("utm_medium") || undefined,
            utmCampaign: params.get("utm_campaign") || undefined,
            clickId: params.get("gclid") || params.get("fbclid") || undefined,
        };
        if (Object.values(attribution).some(Boolean)) {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
        }
    } catch {
        // storage blocked; attribution is optional
    }
}

export function readAttribution(): Attribution {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Attribution) : {};
    } catch {
        return {};
    }
}
