import Link from "next/link";
import Footer from "@/components/custom/footer";
import JsonLd from "@/components/custom/seo/JsonLd";
import { LEGAL_DOCUMENTS, LEGAL_UPDATED, type LegalDocument } from "@/constants/legal";
import { breadcrumbJsonLd } from "@/lib/seo";

export default function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/home" },
          { name: doc.title, path: `/${doc.slug}` },
        ])}
      />
      <main className="px-3 py-8 sm:w-1/2 sm:m-auto">
        <h1 className="mb-1 text-3xl font-bold text-gray-800">{doc.title}</h1>
        <p className="mb-4 text-xs text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
        <p className="mb-6 leading-relaxed text-muted-foreground">{doc.intro}</p>

        <div className="grid gap-6">
          {doc.sections.map((s) => (
            <section key={s.heading} aria-labelledby={`h-${s.heading.replace(/\W+/g, "-")}`}>
              <h2 id={`h-${s.heading.replace(/\W+/g, "-")}`} className="mb-2 text-xl font-semibold text-gray-800">
                {s.heading}
              </h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="mb-2 leading-relaxed text-gray-700">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="list-disc space-y-1 pl-5 text-gray-700">
                  {s.bullets.map((b) => (
                    <li key={b} className="leading-relaxed">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <nav aria-label="Other policies" className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-sm">
          {LEGAL_DOCUMENTS.filter((d) => d.slug !== doc.slug).map((d) => (
            <Link key={d.slug} href={`/${d.slug}`} className="text-blue-700 underline">
              {d.title}
            </Link>
          ))}
        </nav>
      </main>
      <Footer />
    </div>
  );
}
