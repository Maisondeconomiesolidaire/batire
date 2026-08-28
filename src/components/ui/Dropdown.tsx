import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/cn";

export type Option = { value: string; label: string; hint?: string };

/**
 * Liste déroulante maison.
 *
 * Le `<select>` natif ne se met pas aux couleurs de l'app, ne sait pas porter
 * une description sous chaque option, et rend une longue liste illisible sans
 * recherche. Celle-ci gère le clavier (flèches, Entrée, Échap) et le focus,
 * sans quoi un composant sur mesure serait une régression d'accessibilité.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  searchable,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr-FR");
    if (!needle) return options;
    return options.filter((option) =>
      `${option.label} ${option.hint ?? ""}`.toLocaleLowerCase("fr-FR").includes(needle),
    );
  }, [options, query]);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlight(0);
    }
  }, [open]);

  function pick(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 text-left text-sm transition",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
          disabled ? "opacity-50" : "hover:border-brand-400",
        )}
      >
        <span className={cn("truncate", !selected && "text-[var(--muted-foreground)]")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
          {searchable ? (
            <div className="relative border-b border-[var(--border)]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlight(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setHighlight((current) => Math.min(current + 1, filtered.length - 1));
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlight((current) => Math.max(current - 1, 0));
                  }
                  if (event.key === "Enter" && filtered[highlight]) {
                    event.preventDefault();
                    pick(filtered[highlight].value);
                  }
                  if (event.key === "Escape") setOpen(false);
                }}
                placeholder="Rechercher…"
                className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none"
              />
            </div>
          ) : null}

          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3.5 py-3 text-sm text-[var(--muted-foreground)]">Aucun résultat</li>
            ) : (
              filtered.map((option, index) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pick(option.value)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3.5 py-2.5 text-left text-sm transition",
                      index === highlight ? "bg-brand-500/10" : "hover:bg-[var(--accent)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.hint ? (
                        <span className="block truncate text-xs text-[var(--muted-foreground)]">
                          {option.hint}
                        </span>
                      ) : null}
                    </span>
                    {option.value === value ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
