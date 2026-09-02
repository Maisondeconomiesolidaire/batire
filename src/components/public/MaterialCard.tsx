import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";
import { Pill } from "../ui/Badge";
import { formatDimensions, formatPrice, formatStock, formatUnitPrice } from "../../lib/format";
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
  /** Prix du neuf équivalent, barré à côté du prix de vente. */
  originalPrice?: number;
  material?: string;
  depot?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  thicknessMm?: number;
  /** Ouverture à la vente : renseignée, elle peut être encore à venir. */
  availableFrom?: number;
  /** Mise en ligne : c'est elle qui classe les nouveautés. */
  publishedAt?: number;
  photoUrls: string[];
};

export function MaterialCard({
  material,
  to,
  note,
}: {
  material: PublicMaterial;
  to: string;
  /** Mention sous le titre : « Disponible à partir du 12/09 » pour un lot à venir. */
  note?: string;
}) {
  const dimensions = formatDimensions(material);
  const upcoming =
    typeof material.availableFrom === "number" && material.availableFrom > Date.now();
  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition hover:border-brand-400 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--muted)]">
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
        {upcoming ? (
          <span className="absolute right-3 top-3 rounded-full bg-brand-700 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            Bientôt disponible
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill className="bg-[var(--muted)] text-[var(--muted-foreground)]">
            {material.category}
          </Pill>
          <Pill className="bg-brand-50 text-brand-700">{material.condition}</Pill>
        </div>
        <h3 className="line-clamp-2 font-semibold text-[var(--foreground)]">{material.title}</h3>
        {note ? <p className="text-xs font-semibold text-brand-700">{note}</p> : null}
        {dimensions ? (
          <p className="text-xs text-[var(--muted-foreground)]">{dimensions}</p>
        ) : null}
        <div className="mt-auto pt-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-lg font-bold text-brand-700">
              {formatUnitPrice(material.price, material.unit)}
            </p>
            {material.originalPrice && material.originalPrice > material.price ? (
              <p className="text-sm font-semibold text-[var(--muted-foreground)] line-through">
                {formatPrice(material.originalPrice)}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {/* Un lot pas encore ouvert à la vente n'est ni « en stock » ni
                « épuisé » : il est simplement à venir. */}
            {upcoming
              ? "Bientôt disponible"
              : `${formatStock(material.quantity, material.unit)} en stock`}
            {material.depot ? ` · ${material.depot}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
