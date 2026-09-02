import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const FULL_LABEL = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Les six semaines qui couvrent le mois, de lundi à dimanche. */
function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // getDay() : 0 = dimanche. On veut lundi en tête de semaine.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

/**
 * Calendrier maison.
 *
 * Le champ `date` natif change de tête à chaque navigateur, ignore le thème de
 * l'app et impose sa langue : ici la même surface partout, en français, aux
 * couleurs de Bâtire.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Choisir une date",
  /** Dates antérieures grisées : une recherche ne se termine pas hier. */
  minDate,
  className,
}: {
  value?: number;
  onChange: (value?: number) => void;
  placeholder?: string;
  minDate?: number;
  className?: string;
}) {
  const selected = useMemo(() => (value ? new Date(value) : undefined), [value]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(selected ?? new Date());
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selected) setMonth(selected);
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const days = useMemo(() => monthGrid(month), [month]);
  const today = startOfDay(new Date());
  const floor = minDate ? startOfDay(new Date(minDate)) : undefined;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 text-left text-sm transition",
          "hover:border-brand-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
          open && "border-brand-500 ring-2 ring-brand-500/20",
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          <span className={cn("truncate", !selected && "text-[var(--muted-foreground)]")}>
            {selected ? FULL_LABEL.format(selected) : placeholder}
          </span>
        </span>
        {selected ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onChange(undefined);
            }}
            className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)] transition hover:border-brand-400 hover:text-[var(--foreground)]"
          >
            Effacer
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-[320px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition hover:border-brand-400 hover:text-[var(--foreground)]"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold capitalize">{MONTH_LABEL.format(month)}</span>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted-foreground)] transition hover:border-brand-400 hover:text-[var(--foreground)]"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {WEEK_DAYS.map((day, index) => (
              <div key={`${day}-${index}`} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const active = selected ? sameDay(day, selected) : false;
              const inMonth = day.getMonth() === month.getMonth();
              const disabled = floor ? day < floor : false;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(startOfDay(day).getTime());
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg text-sm transition",
                    active
                      ? "bg-brand-600 font-semibold text-white"
                      : inMonth
                        ? "hover:bg-[var(--accent)]"
                        : "text-[var(--muted-foreground)]/50 hover:bg-[var(--accent)]",
                    sameDay(day, today) && !active && "font-semibold text-brand-700",
                    disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
