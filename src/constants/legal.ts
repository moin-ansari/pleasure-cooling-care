import { BUSINESS } from "@/constants/business";

// Plain-language drafts. They describe what the app really does today. Have a lawyer read them before launch,
// and update them whenever the app starts collecting or sharing something new.
export const LEGAL_UPDATED = "26 September 2026";

export interface LegalSection {
    heading: string;
    paragraphs?: string[];
    bullets?: string[];
}

export interface LegalDocument {
    slug: "privacy" | "terms" | "guarantee-terms";
    title: string;
    description: string;
    intro: string;
    sections: LegalSection[];
}

const contact = `${BUSINESS.name}, ${BUSINESS.address.locality}, ${BUSINESS.address.region}. Phone ${BUSINESS.phone}, email ${BUSINESS.email}.`;

export const PRIVACY: LegalDocument = {
    slug: "privacy",
    title: "Privacy Policy",
    description: `How ${BUSINESS.name} collects, uses and protects your details when you book a home appliance service.`,
    intro: `This policy explains what we collect when you book with ${BUSINESS.name}, why we collect it, who can see it, and the choices you have. We keep it short and use plain words.`,
    sections: [
        {
            heading: "What we collect",
            bullets: [
                "Your name, mobile number and address (street, town or village, pincode and city) so a technician can reach you.",
                "The service you choose, the date and time, and any notes on the job, such as the price, the work done and the amount you paid.",
                "Your phone's location, only if you tap the location button. It is optional.",
                "Which advertisement or link brought you to us, kept in your browser, so we can tell which advertising works.",
                "A review, if you leave one: your rating, your comment and your name.",
                "A record of the text messages we send you about your booking.",
            ],
        },
        {
            heading: "Why we use it",
            bullets: [
                "To arrange, confirm and complete your booking, and to contact you about it by call, SMS or WhatsApp.",
                "To let you track or cancel a booking, and to handle a guarantee claim.",
                "To keep accounts and resolve disputes about a job.",
                "To stop misuse, for example by refusing bookings from a number that has abused the service.",
            ],
            paragraphs: ["We do not sell your details and we do not use them for unrelated marketing."],
        },
        {
            heading: "Who can see it",
            bullets: [
                "The technician assigned to your job sees your name, mobile number, address and location for that job.",
                `The ${BUSINESS.name} team, and the local partner who runs bookings in your city, see your bookings so they can manage them.`,
                "Our SMS provider (MSG91) receives your mobile number and the message text to deliver messages.",
                "Our hosting and database providers store the data for us and may not use it for their own purposes.",
                "If you leave a review, your name, rating and comment are shown publicly on our website together with the technician's first name and the service.",
                "We share details with authorities only when the law requires it.",
            ],
        },
        {
            heading: "How long we keep it",
            paragraphs: [
                "We keep booking records for as long as we need them for the service, the guarantee period, accounts and legal reasons. After that we delete or anonymise them. Reviews stay on the website until you ask us to remove them or we hide them.",
            ],
        },
        {
            heading: "Your choices and rights",
            paragraphs: [
                "You can ask us to show you the details we hold about you, correct them, delete them, or stop using them for something you agreed to. You can also ask us to remove a review you wrote. Contact us using the details below and we will reply within a reasonable time. We may keep what the law or an open job requires.",
            ],
        },
        {
            heading: "Safety of your data",
            paragraphs: [
                "Only people who need your details for your job can see them. Passwords and PINs are stored in a scrambled form and never shown. No system is perfectly safe, so if something goes wrong that affects you, we will tell you.",
            ],
        },
        {
            heading: "Children",
            paragraphs: ["Our service is for adults who own or look after an appliance. We do not knowingly collect details from children."],
        },
        {
            heading: "Changes and contact",
            paragraphs: ["If we change this policy we will update the date at the top of this page.", `To ask a question, make a request or raise a complaint: ${contact}`],
        },
    ],
};

export const TERMS: LegalDocument = {
    slug: "terms",
    title: "Terms of Service",
    description: `The terms for booking a home appliance repair or installation with ${BUSINESS.name}.`,
    intro: `These terms apply when you book a service with ${BUSINESS.name}. By booking you agree to them.`,
    sections: [
        {
            heading: "Booking",
            paragraphs: [
                "You book with your mobile number. You do not need an account. A booking is a request. It becomes confirmed when we assign a technician and tell you the time. We may decline a request, for example if the area is not covered or the details are unclear.",
                "Please give correct details and be available at the time you choose. Times are estimates. A technician may arrive a little earlier or later, and we will tell you if there is a delay.",
            ],
        },
        {
            heading: "Where we work",
            paragraphs: ["We serve the cities shown on our website. You can book from any town or village inside an open city."],
        },
        {
            heading: "Prices and payment",
            bullets: [
                "The price shown when you book is for the service named. Spare parts, if needed, are extra and the technician will tell you before fitting them.",
                "If the work turns out to be different from what was booked, we may change the price. We will message you before the technician starts, and you can decline.",
                "You pay the technician in cash when the work is done. Ask for the amount to be confirmed before you pay.",
            ],
        },
        {
            heading: "Cancelling",
            paragraphs: [
                "You can cancel online on the Track booking page until the technician is on the way. After that, please call us. We may cancel a booking if we cannot reach you, or if we cannot send a technician, and we will tell you.",
            ],
        },
        {
            heading: "Guarantee",
            paragraphs: ["Some services come with a guarantee, shown on the service. The Guarantee Terms page explains how it works and forms part of these terms."],
        },
        {
            heading: "What we expect from you",
            bullets: [
                "Treat our technicians with respect and give them safe access to the appliance.",
                "Do not make false bookings or use the service to harass anyone.",
                "We may refuse bookings from a number that has misused the service.",
            ],
        },
        {
            heading: "Reviews",
            paragraphs: ["You may review a completed job. Your name, rating and comment are shown publicly. Keep reviews honest and civil. We may hide a review that is abusive or not genuine."],
        },
        {
            heading: "Our responsibility",
            paragraphs: [
                "We take care with every job. We are not responsible for faults that existed before we arrived and were not part of the booking, or for damage caused by misuse, power surges or repairs done by others. To the extent the law allows, we are not liable for indirect losses. Nothing here limits your rights under the law.",
            ],
        },
        {
            heading: "Governing law",
            paragraphs: ["These terms are governed by the laws of India. Disputes will be handled by the courts at Bareilly, Uttar Pradesh."],
        },
        {
            heading: "Changes and contact",
            paragraphs: ["We may update these terms. The date at the top shows the latest version, and the version in force when you booked applies to your booking.", `Questions: ${contact}`],
        },
    ],
};

export const GUARANTEE: LegalDocument = {
    slug: "guarantee-terms",
    title: "Guarantee Terms",
    description: `How the service guarantee works at ${BUSINESS.name}: what is covered, how to claim a free re-service, and what is not covered.`,
    intro: "Some of our services come with a guarantee. The number of days is shown on the service when you book. This page explains how it works.",
    sections: [
        {
            heading: "What the guarantee covers",
            paragraphs: [
                "If the same fault comes back within the guarantee period after a completed service, we will send a technician for a free re-service. The period starts on the day the job is completed.",
            ],
        },
        {
            heading: "How to claim",
            bullets: [
                "Open Track booking on our website and enter the mobile number you booked with.",
                "Find the completed job and choose Claim a free re-service. Tell us what is wrong.",
                "We review the claim. If it is approved, we book a technician, usually the one who did the original job, and message you the time. If it is declined, we tell you why.",
            ],
        },
        {
            heading: "The free re-service",
            bullets: [
                "There is no service charge for the re-service.",
                "You can claim one free re-service for each job. A declined claim can be raised again while the guarantee is still running.",
                "A free re-service does not start a new guarantee period.",
            ],
        },
        {
            heading: "What is not covered",
            bullets: [
                "A different fault from the one we repaired.",
                "Damage from misuse, dropping, water, pests, power surges or fire.",
                "Repairs or changes made by someone else after our visit.",
                "Claims made after the guarantee period has ended.",
                "Spare parts are covered by the maker's own warranty, where there is one. Parts needed for a different fault are charged.",
            ],
        },
        {
            heading: "Our decision",
            paragraphs: ["We may need to look at the appliance before deciding. Our decision on a claim is made in good faith, and you can call us if you disagree."],
        },
        {
            heading: "Contact",
            paragraphs: [contact],
        },
    ],
};

export const LEGAL_DOCUMENTS = [PRIVACY, TERMS, GUARANTEE];
