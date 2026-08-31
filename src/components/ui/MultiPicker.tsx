import { useMemo, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * Choix multiple dans une liste fermée, avec ajout facultatif.
 *
 * Les valeurs retenues restent visibles en pastilles : sur une fiche qui porte
 * cinq matières, une liste déroulante refermée ne dirait plus lesquelles. La
 * recherche filtre à partir de quatre entrées, en deçà elle encombre.
 */
export function MultiPicker({
  values,
  options,
  onChange,
  onCreate,
  placeholder = "Rechercher…",
  createLabel = "Ajouter",
  emptyLabel = "Aucune sélection",
}: {
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  /** Absent = liste fermée, aucune création possible. */
  onCreate?: (value: string) => Promise<string | void> | void;
  placeholder?: string;
  createLabel?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const needle = query.trim().toLocaleLowerCase("fr-FR");
  const filtered = useMemo(
    () =>
      needle
        ? options.filter((option) => option.toLocaleLowerCase("fr-FR").includes(needle))
        : options,
    [options, needle],
  );

  // Proposer la création uniquement si rien dans la liste ne porte déjà ce nom :
  // sans ce garde-fou on fabriquerait des doublons de casse (« inox »/« Inox »).
  const canCreate =
    Boolean(onCreate) &&
    needle.length > 1 &&
    !options.some((option) => option.toLocaleLowerCase("fr-FR") === needle);

  function toggle(option: string) {
    onChange(
      values.includes(option)
        ? values.filter((value) => value !== option)
        : [...values, option],
    );
  }

  async function create() {
    const value = query.trim();
    if (!value || creating) return;
    setCreating(true);
    try {
      const saved = (await onCreate?.(value)) || value;
      if (!values.includes(saved)) onChange([...values, saved]);
      setQuery("");
      inputRef.current?.focus();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.length === 0 ? (
          <span className="px-1 py-0.5 text-sm text-[var(--muted-foreground)]">{emptyLabel}</span>
        ) : (
          values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full bg-brand-600/15 py-0.5 pl-2.5 pr-1 text-sm text-[var(--foreground)]"
            >
              {value}
              <button
                type="button"
                onClick={() => toggle(value)}
                className="rounded-full p-0.5 hover:bg-brand-600/25"
                aria-label={`Retirer ${value}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {options.length > 4 || onCreate ? (
        <div className="mb-2 flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canCreate) {
                event.preventDefault();
                void create();
              }
            }}
            placeholder={placeholder}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-2.5 py-1.5 text-sm outline-none placeholder:text-[var(--muted-foreground)] focus:border-brand-500"
          />
          {canCreate ? (
            <button
              type="button"
              onClick={() => void create()}
              disabled={creating}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {createLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="max-h-52 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-[var(--muted-foreground)]">
            Aucun résultat{canCreate ? " — utilisez « Ajouter »." : "."}
          </p>
        ) : (
          filtered.map((option) => {
            const active = values.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                  active ? "bg-brand-600/10 font-medium" : "hover:bg-[var(--muted)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    active ? "border-brand-600 bg-brand-600 text-white" : "border-[var(--border)]",
                  )}
                >
                  {active ? <Check className="h-3 w-3" /> : null}
                </span>
                {option}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
