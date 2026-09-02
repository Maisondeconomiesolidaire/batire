import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, BellRing, Lock, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { DatePicker } from "../../components/ui/DatePicker";
import { Dropdown } from "../../components/ui/Dropdown";
import { CATEGORIES, familiesOf, subFamiliesOf } from "../../lib/taxonomy";
import { PAGE_X } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import { errorMessage } from "../../lib/errors";
import { cn } from "../../lib/cn";

type SearchAlert = {
  _id: Id<"btSearchAlerts">;
  category: string;
  family?: string;
  subcategory?: string;
  until?: number;
  lastNotifiedAt?: number;
  matchCount?: number;
  createdAt: number;
};

/**
 * « Je recherche » : le client décrit ce qu'il attend, on le prévient quand ça
 * arrive. Deux champs seulement — la branche du catalogue et, s'il a une date
 * de fin de chantier, jusqu'à quand la recherche vaut.
 */
export function JeRecherche() {
  const { isLoaded, isSignedIn } = useUser();
  const alerts = useQuery(api.batire.mySearchAlerts, {}) as SearchAlert[] | undefined;
  const create = useMutation(api.batire.createSearchAlert);
  const remove = useMutation(api.batire.removeSearchAlert);

  const [category, setCategory] = useState("");
  const [family, setFamily] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [until, setUntil] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const families = useMemo(() => familiesOf(category), [category]);
  const subFamilies = useMemo(() => subFamiliesOf(category, family), [category, family]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await create({
        category,
        family: family || undefined,
        subcategory: subcategory || undefined,
        // Fin de journée : une recherche valable « jusqu'au 12 » l'est encore le 12.
        until: until ? until + 86_399_999 : undefined,
      });
      setSaved(true);
      setCategory("");
      setFamily("");
      setSubcategory("");
      setUntil(undefined);
    } catch (caught) {
      setError(errorMessage(caught, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className={cn("mx-auto max-w-lg py-24 text-center", PAGE_X)}>
        <Lock className="mx-auto h-6 w-6 text-[var(--muted-foreground)]" />
        <h1 className="mt-4 text-2xl font-black tracking-tight">Je recherche</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Connectez-vous pour être prévenu dès qu'un matériau que vous cherchez arrive.
        </p>
        <div className="mt-6">
          <SignInButton mode="modal">
            <Button>Se connecter</Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-3xl py-6", PAGE_X)}>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </Link>

      <header className="mt-4 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Alerte matériau
        </p>
        <h1 className="mt-1.5 text-3xl font-black tracking-tight sm:text-4xl">Je recherche</h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Dites-nous ce qu'il vous manque. Dès qu'un lot correspondant entre au dépôt, vous
          recevez un email.
        </p>
      </header>

      <section className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Catégorie" required>
            <Dropdown
              searchable
              value={category}
              onChange={(value) => {
                setSaved(false);
                setCategory(value);
                setFamily("");
                setSubcategory("");
              }}
              placeholder="Choisir"
              options={CATEGORIES.map((value) => ({ value, label: value }))}
            />
          </Field>
          <Field label="Famille">
            <Dropdown
              searchable
              disabled={!category}
              value={family}
              onChange={(value) => {
                setFamily(value);
                setSubcategory("");
              }}
              placeholder={category ? "Toutes" : "Catégorie d'abord"}
              options={families.map((value) => ({ value, label: value }))}
            />
          </Field>
          <Field label="Sous-famille">
            <Dropdown
              searchable
              disabled={!family}
              value={subcategory}
              onChange={setSubcategory}
              placeholder={family ? "Toutes" : "Famille d'abord"}
              options={subFamilies.map((value) => ({ value, label: value }))}
            />
          </Field>
        </div>

        <Field label="Jusqu'à quand ?" hint="facultatif — au-delà, la recherche s'arrête">
          <DatePicker
            className="sm:w-72"
            value={until}
            onChange={setUntil}
            minDate={Date.now()}
            placeholder="Sans date de fin"
          />
        </Field>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button disabled={!category || saving} onClick={() => void submit()}>
            {saving ? "Enregistrement…" : "Créer l'alerte"}
          </Button>
          {saved ? (
            <span className="text-sm font-medium text-emerald-600">
              C'est noté, on vous écrit dès qu'on l'a.
            </span>
          ) : null}
        </div>
      </section>

      {alerts && alerts.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Mes recherches</h2>
          <ul className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {alerts.map((alert) => {
              const expired = Boolean(alert.until && alert.until < Date.now());
              return (
                <li key={alert._id} className="flex items-center gap-3 py-3">
                  <BellRing
                    className={cn(
                      "h-4 w-4 shrink-0",
                      expired ? "text-[var(--muted-foreground)]" : "text-brand-600",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate font-medium",
                        expired && "text-[var(--muted-foreground)] line-through",
                      )}
                    >
                      {[alert.category, alert.family, alert.subcategory].filter(Boolean).join(" › ")}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {[
                        alert.until
                          ? `${expired ? "Terminée le" : "Jusqu'au"} ${formatDate(alert.until)}`
                          : "Sans date de fin",
                        alert.matchCount
                          ? `${alert.matchCount} lot${alert.matchCount > 1 ? "s" : ""} signalé${alert.matchCount > 1 ? "s" : ""}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove({ id: alert._id })}
                    className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-red-600"
                    aria-label="Supprimer la recherche"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
