import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/custom/serviceCard";
import { CATEGORY_LABELS } from "@/constants/appliances";
import { getStorefrontServices } from "@/lib/storefront";
import { groupPriceLabel, groupServices } from "@/lib/serviceGroups";

const FALLBACK_IMAGE = "/service_half1.jpeg";

type Props = { params: { id: string } };

async function loadGroup(id: string) {
  const services = await getStorefrontServices();
  return groupServices(services).find((g) => g.serviceIds.includes(id)) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const group = await loadGroup(params.id);
  if (!group) return {};
  return {
    title: `${group.serviceType} (${group.subTypes.join(" / ")})`,
    description: `${group.serviceType} for ${CATEGORY_LABELS[group.category]} — ${groupPriceLabel(group.prices)}. Book online and track your booking with your mobile number.`,
  };
}

export default async function ServiceDetailsPage({ params }: Props) {
  const group = await loadGroup(params.id);
  if (!group) notFound();

  const pricesVary = !group.prices.every((p) => p === group.prices[0]);

  return (
    <div className="mx-auto max-w-xl px-2 py-5 sm:px-4">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
        <Link href="/home#services" className="hover:underline">
          Services
        </Link>{" "}
        / <span>{group.serviceType}</span>
      </nav>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100">
        <Image src={group.image || FALLBACK_IMAGE} alt="" fill sizes="(max-width: 640px) 100vw, 576px" className="object-cover" />
      </div>

      <div className="mt-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[group.category]}</span>
        <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
          {group.serviceType} <span className="font-normal text-muted-foreground">({group.subTypes.join(" / ")})</span>
        </h1>

        <p className="mt-2 text-2xl font-bold text-slate-900">{groupPriceLabel(group.prices)}</p>
        {pricesVary && (
          <ul className="mt-1 text-sm text-muted-foreground">
            {group.subTypes.map((t, i) => (
              <li key={t}>
                {t}: ₹{group.prices[i]}
              </li>
            ))}
          </ul>
        )}
        {group.warrantyDays > 0 && <p className="mt-1 text-sm font-medium text-emerald-600">{group.warrantyDays}-day guarantee</p>}

        {group.desc.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {group.desc.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        <div className="mt-5 max-w-xs">
          <AddToCartButton group={group} />
        </div>
      </div>
    </div>
  );
}
