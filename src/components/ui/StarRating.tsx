import { Star } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * Note de 1 à 5 étoiles.
 *
 * Recliquer l'étoile courante remet la note à zéro : c'est le seul moyen de
 * revenir à « non évalué » une fois qu'on a cliqué, et un potentiel non évalué
 * ne veut pas dire un potentiel nul.
 */
export function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <span className="flex shrink-0 items-center gap-0.5" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star ? 0 : star)}
            aria-label={`${star} étoile${star > 1 ? "s" : ""} — ${label}`}
            aria-pressed={value === star}
            className="rounded p-0.5 hover:scale-110"
          >
            <Star
              className={cn(
                "h-5 w-5",
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-[var(--muted-foreground)]",
              )}
            />
          </button>
        ))}
      </span>
    </div>
  );
}
