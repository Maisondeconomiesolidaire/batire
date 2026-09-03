import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { ArrowLeft, BellRing, Check, ChevronRight, Lock } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { DatePicker } from "../../components/ui/DatePicker";
import { CATEGORIES, familiesOf, subFamiliesOf } from "../../lib/taxonomy";
import { PAGE_X } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import { errorMessage } from "../../lib/errors";
import { cn } from "../../lib/cn";

/** Quatre pas : catégorie, famille, sous-famille, échéance. */
type Step = 0 | 1 | 2 | 3;

const ANY = "__toutes__";

/**
 * « Je recherche », en assistant.
 *
 * Un formulaire à trois listes déroulantes demandait au client de connaître
 * l'arborescence avant de commencer. Ici il choisit ce qu'il voit, un niveau à
 * la fois : la question ne change pas, seules les propositions se resserrent.
 */
export function JeRecherche() {
  const { isLoaded, isSignedIn } = useUser();
  const create = useMutation(api.batire.createSearchAlert);

  const [step, setStep] = useState<Step>(0);
  const [category, setCategory] = useState("");
  const [family, setFamily] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [until, setUntil] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const families = useMemo(() => familiesOf(category), [category]);
  const subFamilies = useMemo(() => subFamiliesOf(category, family), [category, family]);

  function pickCategory(value: string) {
    setCategory(value);
    setFamily("");
    setSubcategory("");
    // Une catégorie sans famille n'a rien à demander de plus : on saute
    // directement à l'échéance plutôt que d'afficher une étape vide.
    setStep(familiesOf(value).length > 0 ? 1 : 3);
  }

  function pickFamily(value: string) {
    const chosen = value === ANY ? "" : value;
    setFamily(chosen);
    setSubcategory("");
    setStep(chosen && subFamiliesOf(category, chosen).length > 0 ? 2 : 3);
  }

  function pickSubcategory(value: string) {
    setSubcategory(value === ANY ? "" : value);
    setStep(3);
  }

  function back() {
    setError(null);
    if (step === 3) setStep(subFamilies.length > 0 && family ? 2 : families.length > 0 ? 1 : 0);
    else if (step === 2) setStep(1);
    else setStep(0);
  }

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
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  }

  function restart() {
    setCategory("");
    setFamily("");
    setSubcategory("");
    setUntil(undefined);
    setDone(false);
    setStep(0);
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
          <Link to="/connexion"><Button>Se connecter</Button></Link>
        </div>
      </div>
    );
  }

  /* ── Confirmation ─────────────────────────────────────────────────────── */
  if (done) {
    return (
      <div className={cn("mx-auto max-w-lg py-24 text-center", PAGE_X)}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-tight">C'est noté</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          {[category, family, subcategory].filter(Boolean).join(" › ")}
          {until ? ` · jusqu'au ${formatDate(until)}` : ""}
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Vous recevrez un email dès qu'un lot correspondant arrive au dépôt.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={restart}>
            Chercher autre chose
          </Button>
          <Link to="/mon-compte?onglet=recherches">
            <Button>
              <BellRing className="h-4 w-4" /> Voir mes recherches
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const options =
    step === 0
      ? [...CATEGORIES]
      : step === 1
        ? [ANY, ...families]
        : step === 2
          ? [ANY, ...subFamilies]
          : [];

  const label = (value: string) =>
    value !== ANY ? value : step === 1 ? "Toutes les familles" : "Toutes les sous-familles";

  const pick = step === 0 ? pickCategory : step === 1 ? pickFamily : pickSubcategory;

  return (
    <div className={cn("mx-auto w-full max-w-5xl py-6", PAGE_X)}>
      {step === 0 ? (
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au catalogue
        </Link>
      ) : (
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
      )}

      <header className="mt-8 text-center">
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
          {step === 3 ? "Jusqu'à quand ?" : "Que recherchez-vous ?"}
        </h1>
        {/* Aucune consigne pendant le choix : la progression se lit aux points. */}
        <div className="mt-6 flex justify-center gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === step
                  ? "w-8 bg-brand-600"
                  : index < step
                    ? "w-1.5 bg-brand-400"
                    : "w-1.5 bg-[var(--border)]",
              )}
            />
          ))}
        </div>
      </header>

      {step === 3 ? (
        <section className="mx-auto mt-10 max-w-md text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            Passé cette date, votre recherche s'arrête et vous ne recevez plus rien. Laissez vide
            si vous n'êtes pas pressé.
          </p>
          <div className="mt-5 text-left">
            <DatePicker
              value={until}
              onChange={setUntil}
              minDate={Date.now()}
              placeholder="Sans date de fin"
            />
          </div>

          {error ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <Button className="mt-5 w-full" disabled={saving} onClick={() => void submit()}>
            {saving ? "Enregistrement…" : "Créer mon alerte"}
          </Button>
        </section>
      ) : (
        <section
          key={step}
          className="animate-step mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => pick(option)}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-left transition",
                "hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg hover:shadow-black/5",
                option === ANY && "border-dashed",
              )}
            >
              <span
                className={cn(
                  "font-semibold leading-snug",
                  option === ANY && "text-[var(--muted-foreground)]",
                )}
              >
                {label(option)}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
