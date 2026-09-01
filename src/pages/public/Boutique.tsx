import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "convex/react";
import { ArrowRight, HeartHandshake, PackageOpen, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { MaterialCard, type PublicMaterial } from "../../components/public/MaterialCard";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Dropdown } from "../../components/ui/Dropdown";
import { PAGE_X, CONDITIONS, UNITS, type Condition, type Unit } from "../../lib/constants";
import { cn } from "../../lib/cn";

export function Boutique({
  kiosk = false,
  search = "",
}: {
  kiosk?: boolean;
  search?: string;
}) {
  // L'arborescence vit dans l'URL : le méga-menu y renvoie, et un lien vers
  // une famille se partage tel quel.
  const [params, setParams] = useSearchParams();
  const category = params.get("categorie") ?? "";
  const family = params.get("famille") ?? "";
  const subcategory = params.get("sousfamille") ?? "";

  const setBranch = useCallback(
    (next: { category?: string; family?: string; subcategory?: string }) => {
      const updated = new URLSearchParams(params);
      for (const [key, value] of [
        ["categorie", next.category],
        ["famille", next.family],
        ["sousfamille", next.subcategory],
      ] as const) {
        if (value) updated.set(key, value);
        else updated.delete(key);
      }
      setParams(updated, { replace: true });
    },
    [params, setParams],
  );

  const setCategory = (value: string) => setBranch({ category: value });
  const setFamily = (value: string) => setBranch({ category, family: value });
  const setSubcategory = (value: string) =>
    setBranch({ category, family, subcategory: value });
  const [unit, setUnit] = useState<"" | Unit>("");
  const [condition, setCondition] = useState<"" | Condition>("");
  const [depot, setDepot] = useState("");

  const facets = useQuery(api.batire.shopFacets, {});
  const materials = useQuery(api.batire.listPublicMaterials, {
    search: search.trim() || undefined,
    category: category || undefined,
    family: family || undefined,
    subcategory: subcategory || undefined,
    unit: unit || undefined,
    condition: condition || undefined,
    depot: depot || undefined,
  }) as PublicMaterial[] | undefined;

  const visible = materials ?? [];

  const filtersActive = Boolean(
    search.trim() || category || family || subcategory || unit || condition || depot,
  );

  function reset() {
    setCategory("");
    setFamily("");
    setSubcategory("");
    setUnit("");
    setCondition("");
    setDepot("");
  }

  return (
    <div className={cn("w-full py-6", PAGE_X)}>
      {/* Fil d'Ariane : le seul repère de navigation depuis que le catalogue
          se parcourt par le menu. Chaque niveau remonte d'un cran. */}
      {category ? (
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
          <button type="button" onClick={() => setCategory("")} className="hover:text-brand-700">
            Catalogue
          </button>
          <span>›</span>
          <button
            type="button"
            onClick={() => setCategory(category)}
            className={cn(!family && "font-medium text-[var(--foreground)]", "hover:text-brand-700")}
          >
            {category}
          </button>
          {family ? (
            <>
              <span>›</span>
              <button
                type="button"
                onClick={() => setFamily(family)}
                className={cn(
                  !subcategory && "font-medium text-[var(--foreground)]",
                  "hover:text-brand-700",
                )}
              >
                {family}
              </button>
            </>
          ) : null}
          {subcategory ? (
            <>
              <span>›</span>
              <span className="font-medium text-[var(--foreground)]">{subcategory}</span>
            </>
          ) : null}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {subcategory || family || category || (kiosk ? "Nos matériaux" : "Catalogue")}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {materials === undefined
            ? "…"
            : `${visible.length} référence${visible.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Le dépôt vit des matériaux qu'on lui apporte : l'appel au don a sa
          place dans le catalogue, pas seulement dans l'en-tête. */}
      {!kiosk ? (
        <Link
          to="/don/nouveau"
          className="group mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-[var(--card)] px-5 py-4 transition hover:border-brand-300"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-[var(--foreground)]">
              Vous avez des matériaux à donner ?
            </span>
            <span className="block text-sm text-[var(--muted-foreground)]">
              Photographiez votre lot, l'équipe vous répond.
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-brand-700">
            Nouveau don <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Dropdown
          className="w-44"
          value={unit}
          onChange={(value) => setUnit(value as Unit | "")}
          placeholder="Toutes les unités"
          options={[
            { value: "", label: "Toutes les unités" },
            ...UNITS.map((value) => ({ value, label: `Vendu au ${value}` })),
          ]}
        />
        <Dropdown
          className="w-40"
          value={condition}
          onChange={(value) => setCondition(value as Condition | "")}
          placeholder="Tous les états"
          options={[
            { value: "", label: "Tous les états" },
            ...CONDITIONS.map((value) => ({ value, label: value })),
          ]}
        />
        <Dropdown
          className="w-44"
          value={depot}
          onChange={setDepot}
          placeholder="Tous les dépôts"
          options={[
            { value: "", label: "Tous les dépôts" },
            ...(facets?.depots ?? []).map((value) => ({ value, label: value })),
          ]}
        />
        {filtersActive ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-2 text-sm font-medium text-brand-700"
          >
            <X className="h-3.5 w-3.5" /> Effacer
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        {materials === undefined ? (
          <FullSpinner label="Chargement du catalogue…" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-10 w-10" />}
            title={filtersActive ? "Aucun résultat" : "Catalogue vide"}
            description={filtersActive ? "Aucun matériau ne correspond à ces critères." : undefined}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visible.map((material) => (
              <MaterialCard
                key={material._id}
                material={material}
                to={`${kiosk ? "/kiosk" : ""}/materiau/${material._id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
