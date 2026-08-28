import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";
import { Pill } from "../ui/Badge";
import { formatDimensions, formatStock, formatUnitPrice } from "../../lib/format";
import type { Unit } from "../../lib/constants";

export type PublicMaterial = {
  _id: string;
  title: string;
  category: string;
  subcategory?: string;
  condition: string;
  unit: Unit;
  quantity: number;
  price: number;
  material?: string;
  depot?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  thicknessMm?: number;
  photoUrls: string[];
};

/**
 * Carte du catalogue. Le prix ne se lit jamais sans son unité, et le stock non
 * plus : « 45 € » et « 12 » ne veulent rien dire pour un matériau.
 */
export function MaterialCard({ material, to }: { material: PublicMaterial; to: string }) {
  const dimensions = formatDimensions(material);
  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition hover:border-brand-400 hover:shadow-lg"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--muted)]">
        {material.photoUrls[0] ? (
          <img
            src={material.photoUrls[0]}
            alt={material.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
            <PackageOpen className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill className="bg-[var(--muted)] text-[var(--muted-foreground)]">
            {material.category}
          </Pill>
          <Pill className="bg-brand-50 text-brand-700">{material.condition}</Pill>
        </div>
        <h3 className="line-clamp-2 font-semibold text-[var(--foreground)]">{material.title}</h3>
        {dimensions ? (
          <p className="text-xs text-[var(--muted-foreground)]">{dimensions}</p>
        ) : null}
        <div className="mt-auto pt-2">
          <p className="text-lg font-bold text-brand-700">
            {formatUnitPrice(material.price, material.unit)}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {formatStock(material.quantity, material.unit)} en stock
            {material.depot ? ` · ${material.depot}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
