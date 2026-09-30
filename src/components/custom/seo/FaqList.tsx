import type { Faq } from "@/constants/seoContent";

// Native <details> keeps every answer in the HTML for crawlers and works without JavaScript.
export default function FaqList({ faqs, title = "Frequently asked questions" }: { faqs: Faq[]; title?: string }) {
  return (
    <section aria-labelledby="faq-heading" className="py-6 px-3 sm:w-1/2 sm:m-auto">
      <h2 id="faq-heading" className="text-2xl font-bold text-gray-800 text-center mb-6">
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {faqs.map((faq) => (
          <details key={faq.question} className="rounded-md border bg-background p-3 group">
            <summary className="cursor-pointer font-medium marker:text-muted-foreground">{faq.question}</summary>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
