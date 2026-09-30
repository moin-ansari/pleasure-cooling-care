import type { SmsTemplateKey } from "@/constants/sms";

export type SmsResult = { status: "SENT" | "FAILED" | "SKIPPED"; response: string };

const TIMEOUT_MS = 5000;

function templateId(key: SmsTemplateKey): string | undefined {
    return process.env[`MSG91_TEMPLATE_${key}`]?.trim() || undefined;
}

export function smsIsConfigured(): boolean {
    return !!process.env.MSG91_AUTH_KEY?.trim();
}

// Sends one templated SMS through MSG91's Flow API. Never throws: every outcome comes back as a result.
export async function sendSms(key: SmsTemplateKey, phone: string, values: string[]): Promise<SmsResult> {
    const authKey = process.env.MSG91_AUTH_KEY?.trim();
    if (!authKey) return { status: "SKIPPED", response: "SMS is not set up yet (MSG91_AUTH_KEY is missing)" };

    const template = templateId(key);
    if (!template) return { status: "SKIPPED", response: `No MSG91 template id set for ${key} (MSG91_TEMPLATE_${key})` };

    const recipient: Record<string, string> = { mobiles: `91${phone}` };
    values.forEach((value, i) => {
        recipient[`var${i + 1}`] = value;
    });

    const baseUrl = (process.env.MSG91_BASE_URL || "https://control.msg91.com").replace(/\/$/, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(`${baseUrl}/api/v5/flow`, {
            method: "POST",
            headers: { authkey: authKey, "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({ template_id: template, short_url: "0", recipients: [recipient] }),
            signal: controller.signal,
        });
        const text = await res.text();
        let json: { type?: string; message?: string } = {};
        try {
            json = JSON.parse(text);
        } catch {
            // not JSON; judged by the HTTP status below
        }
        if (res.ok && json.type !== "error") return { status: "SENT", response: (json.message ?? text ?? "ok").toString().slice(0, 300) };
        return { status: "FAILED", response: `HTTP ${res.status}: ${(json.message ?? text).toString().slice(0, 300)}` };
    } catch (error: any) {
        return { status: "FAILED", response: error?.name === "AbortError" ? `MSG91 did not answer within ${TIMEOUT_MS / 1000} seconds` : `Could not reach MSG91: ${error?.message ?? error}` };
    } finally {
        clearTimeout(timer);
    }
}
