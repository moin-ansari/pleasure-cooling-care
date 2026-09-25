import type { ApplianceCategoryValue } from "@/constants/appliances";

export interface CategoryContent {
    // Used in headings: "{heading} Repair & Installation in Bareilly"
    heading: string;
    // Lower-case name used inside sentences.
    noun: string;
    intro: (district: string) => string;
    problemsTitle: string;
    problems: string[];
    specificFaq: { question: (district: string) => string; answer: string };
}

// Owner to review: wording here is general guidance, not a promise about specific brands or timings.
export const CATEGORY_CONTENT: Record<ApplianceCategoryValue, CategoryContent> = {
    AC: {
        heading: "AC",
        noun: "air conditioner",
        intro: (d) =>
            `Book an AC technician at your home in ${d}. We repair split and window air conditioners, do gas leak fixing and refilling, deep cleaning and service, and handle installation and uninstallation.`,
        problemsTitle: "AC problems we fix",
        problems: [
            "AC running but not cooling",
            "Water leaking from the indoor unit",
            "Strange noise or vibration",
            "Gas leakage and low gas",
            "AC not turning on, or tripping the power",
            "Foul smell or weak airflow",
        ],
        specificFaq: {
            question: (d) => `My AC in ${d} is running but not cooling. What could be wrong?`,
            answer:
                "Common causes are dirty filters or coils, low refrigerant from a leak, or a weak capacitor or compressor. A technician checks the unit and tells you what is wrong before any major work starts.",
        },
    },
    REFRIGERATOR: {
        heading: "Refrigerator",
        noun: "refrigerator",
        intro: (d) =>
            `Get your refrigerator or fridge-freezer checked at home in ${d}. Our technicians handle cooling problems, gas leaks, compressor and thermostat faults, water leakage and door seal issues.`,
        problemsTitle: "Refrigerator problems we fix",
        problems: [
            "Fridge or freezer not cooling",
            "Ice build-up in the freezer",
            "Water leaking inside or under the fridge",
            "Loud compressor noise or frequent on-off",
            "Door not sealing properly",
            "Refrigerator not switching on",
        ],
        specificFaq: {
            question: (d) => `Why is my refrigerator in ${d} not cooling properly?`,
            answer:
                "It can be a faulty thermostat, a blocked or iced-up evaporator, a weak compressor or a gas leak. A technician tests these on site and explains the fix before starting.",
        },
    },
    WASHING_MACHINE: {
        heading: "Washing Machine",
        noun: "washing machine",
        intro: (d) =>
            `Book a washing machine technician in ${d}. We repair top load, front load and semi-automatic machines, and can install or uninstall them at your home.`,
        problemsTitle: "Washing machine problems we fix",
        problems: [
            "Not draining water",
            "Drum not spinning",
            "Water leaking from the machine",
            "Loud noise or heavy vibration",
            "Not filling with water",
            "Machine not starting or showing error codes",
        ],
        specificFaq: {
            question: (d) => `Why is my washing machine in ${d} not draining?`,
            answer:
                "A blocked drain hose or filter, or a faulty drain pump, is the usual cause. A technician can clear or replace the part on the same visit if it is available.",
        },
    },
    GEYSER: {
        heading: "Geyser",
        noun: "geyser",
        intro: (d) =>
            `Book a geyser technician in ${d}. We repair electric, gas, instant and storage water heaters, and handle installation and uninstallation.`,
        problemsTitle: "Geyser problems we fix",
        problems: [
            "Water not heating",
            "Water leaking from the tank or pipes",
            "Geyser tripping the power",
            "Low hot water flow",
            "Thermostat or heating element failure",
            "Scale build-up inside the tank",
        ],
        specificFaq: {
            question: (d) => `Why is my geyser in ${d} not heating the water?`,
            answer:
                "Often the heating element or thermostat has failed. If you see water leaking near the electrical connection, switch the geyser off at the mains and stop using it until a technician has checked it.",
        },
    },
};

export interface Faq {
    question: string;
    answer: string;
}

// With no category the FAQs are general (used on district pages).
export function buildFaqs(district: string, servedDistricts: string[], category?: ApplianceCategoryValue): Faq[] {
    const content = category ? CATEGORY_CONTENT[category] : null;
    const noun = content ? content.noun : "appliance";
    const served = servedDistricts.length ? servedDistricts.join(" and ") : district;
    const faqs: Faq[] = [
        {
            question: `How do I book ${noun} service in ${district}?`,
            answer:
                "Fill in the booking form on this page with your service, address, date and time. We will confirm your booking, and you can check its status any time on the Track Booking page using your mobile number.",
        },
    ];
    if (content) {
        faqs.push({ question: content.specificFaq.question(district), answer: content.specificFaq.answer });
    }
    faqs.push(
        {
            question: "Which areas do you cover?",
            answer: `We serve towns and villages across ${served}. If your district is not listed yet, the booking form will tell you.`,
        },
        {
            question: "How much does the service cost?",
            answer: "The price of each service is shown on this page. If your appliance needs spare parts, you will be told the cost.",
        },
        {
            question: "Can I cancel or check my booking?",
            answer:
                "Yes. Use the Track Booking page with your mobile number to see the status of your booking and to cancel it before the technician is on the way.",
        }
    );
    return faqs;
}
