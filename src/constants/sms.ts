export type SmsRecipient = "customer" | "technician" | "admin";

export interface SmsTemplate {
    label: string;
    recipient: SmsRecipient;
    // The text to register with DLT. Each {#var#} is filled, in order, by the values sent as var1, var2, ...
    text: string;
    vars: string[];
}

// One entry per message. The wording here is what gets registered as a DLT template and created in MSG91
// with variables var1..varN in this order; the app only sends the values.
export const SMS_TEMPLATES = {
    BOOKING_RECEIVED: {
        label: "Booking received",
        recipient: "customer",
        text: "Hi {#var#}, we received your booking {#var#} for {#var#} on {#var#}. We will confirm it soon. Track it at {#var#}",
        vars: ["name", "ref", "service", "when", "url"],
    },
    BOOKING_CONFIRMED: {
        label: "Booking confirmed",
        recipient: "customer",
        text: "Hi {#var#}, your booking {#var#} is confirmed. {#var#} will arrive on {#var#}. Track it at {#var#}",
        vars: ["name", "ref", "technician", "arrival", "url"],
    },
    TECHNICIAN_ARRIVING: {
        label: "Technician on the way",
        recipient: "customer",
        text: "Hi {#var#}, {#var#} is on the way for booking {#var#} and should reach you around {#var#}.",
        vars: ["name", "technician", "ref", "eta"],
    },
    BOOKING_DELAYED: {
        label: "Booking delayed",
        recipient: "customer",
        text: "Hi {#var#}, your booking {#var#} is taking longer than planned. We will keep you updated. Call {#var#} for help.",
        vars: ["name", "ref", "phone"],
    },
    BOOKING_COMPLETED: {
        label: "Booking completed",
        recipient: "customer",
        text: "Hi {#var#}, your booking {#var#} is complete. Amount paid: Rs {#var#}. Thank you! Details: {#var#}",
        vars: ["name", "ref", "amount", "url"],
    },
    BOOKING_CANCELLED: {
        label: "Booking cancelled",
        recipient: "customer",
        text: "Hi {#var#}, your booking {#var#} has been cancelled. To book again visit {#var#} or call {#var#}.",
        vars: ["name", "ref", "url", "phone"],
    },
    PRICE_CHANGED: {
        label: "Price changed",
        recipient: "customer",
        text: "Hi {#var#}, the price for booking {#var#} has changed from Rs {#var#} to Rs {#var#}. Call {#var#} if you have questions.",
        vars: ["name", "ref", "oldPrice", "newPrice", "phone"],
    },
    TECHNICIAN_ASSIGNED: {
        label: "Job assigned",
        recipient: "technician",
        text: "New job {#var#}: {#var#} at {#var#} on {#var#}. Details: {#var#}",
        vars: ["ref", "service", "town", "arrival", "url"],
    },
    TECHNICIAN_REMOVED: {
        label: "Job removed",
        recipient: "technician",
        text: "Booking {#var#} is no longer assigned to you. Please check your job list: {#var#}",
        vars: ["ref", "url"],
    },
    ADMIN_NEW_BOOKING: {
        label: "New booking alert",
        recipient: "admin",
        text: "New booking {#var#}: {#var#} in {#var#} from {#var#}. Assign a technician: {#var#}",
        vars: ["ref", "service", "district", "name", "url"],
    },
} as const satisfies Record<string, SmsTemplate>;

export type SmsTemplateKey = keyof typeof SMS_TEMPLATES;

export function renderSms(key: SmsTemplateKey, values: string[]): string {
    let i = 0;
    return SMS_TEMPLATES[key].text.replace(/\{#var#\}/g, () => values[i++] ?? "");
}

// Customers can be sent at most this many messages per rolling day, so the public booking form
// cannot be used to flood someone else's phone.
export const MAX_CUSTOMER_SMS_PER_DAY = 8;
