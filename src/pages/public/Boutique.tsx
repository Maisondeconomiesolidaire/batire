import { useState } from "react";
import { useQuery } from "convex/react";
import { PackageOpen, SlidersHorizontal, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { MaterialCard, type PublicMaterial } from "../../components/public/MaterialCard";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Dropdown } from "../../components/ui/Dropdown";
import { CONDITIONS, UNITS, type Condition, type Unit } from "../../lib/constants";
import { CATEGORIES, familiesOf, subFamiliesOf } from "../../lib/taxonomy";
import { cn } from "../../lib/cn";

export function Boutique({
  kiosk = false,
  search = "",
}: {
  kiosk?: boolean;
  search?: string;
}) {
  const [category, setCategory] = useState("");
  const [family, setFamily] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [unit, setUnit] = useState<"" | Unit>("");
  const [condition, setCondition] = useState<"" | Condition>("");
  const [depot, setDepot] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const sidebar = (
    <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:w-64 lg:overflow-y-auto lg:pb-4">
      <nav className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2">
        <button
          type="button"
          onClick={() => {
            setCategory("");
            setFamily("");
            setSubcategory("");
          }}
          className={cn(
            "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
            category === "" ? "bg-brand-50 text-brand-800" : "hover:bg-[var(--muted)]",
          )}
        >
          Tout le catalogue
        </button>
        {CATEGORIES.map((name) => {
          const activeCategory = category === name;
          return (
            <div key={name}>
              <button
                type="button"
                onClick={() => {
                  setCategory(activeCategory ? "" : name);
                  setFamily("");
                  setSubcategory("");
                }}
                className={cn(
                  "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                  activeCategory ? "bg-brand-50 text-brand-800" : "hover:bg-[var(--muted)]",
                )}
              >
                {name}
              </button>

              {activeCategory ? (
                <div className="mb-1 ml-3 border-l border-[var(--border)] pl-2">
                  {familiesOf(name).map((fam) => {
                    const activeFamily = family === fam;
                    return (
                      <div key={fam}>
                        <button
                          type="button"
                          onClick={() => {
                            setFamily(activeFamily ? "" : fam);
                            setSubcategory("");
                          }}
                          className={cn(
                            "block w-full rounded-lg px-3 py-1.5 text-left text-sm transition",
                            activeFamily
                              ? "font-semibold text-brand-700"
                              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
                          )}
                        >
                          {fam}
                        </button>

                        {activeFamily ? (
                          <div className="ml-3 border-l border-[var(--border)] pl-2">
                            {subFamiliesOf(name, fam).map((sub) => (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => setSubcategory(subcategory === sub ? "" : sub)}
                                className={cn(
                                  "block w-full rounded-lg px-3 py-1 text-left text-xs transition",
                                  subcategory === sub
                                    ? "font-semibold text-brand-700"
                                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
                                )}
                              >
                                {sub}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-4 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <Dropdown
          value={unit}
          onChange={(value) => setUnit(value as Unit | "")}
          placeholder="Toutes les unités"
          options={[
            { value: "", label: "Toutes les unités" },
            ...UNITS.map((value) => ({ value, label: `Vendu au ${value}` })),
          ]}
        />
        <Dropdown
          value={condition}
          onChange={(value) => setCondition(value as Condition | "")}
          placeholder="Tous les états"
          options={[
            { value: "", label: "Tous les états" },
            ...CONDITIONS.map((value) => ({ value, label: value })),
          ]}
        />
        <Dropdown
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
          >
            <X className="h-3.5 w-3.5" /> Effacer les filtres
          </button>
        ) : null}
      </div>
    </aside>
  );

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {category || (kiosk ? "Nos matériaux" : "Catalogue")}
          {family ? <span className="text-brand-600"> › {family}</span> : null}
          {subcategory ? <span className="text-brand-600"> › {subcategory}</span> : null}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {materials === undefined
            ? "…"
            : `${visible.length} référence${visible.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setFiltersOpen((current) => !current)}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Catégories et filtres
      </button>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <div className={cn(filtersOpen ? "block" : "hidden", "lg:block")}>{sidebar}</div>

        <div className="min-w-0 flex-1">
          {materials === undefined ? (
            <FullSpinner label="Chargement du catalogue…" />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<PackageOpen className="h-10 w-10" />}
              title={filtersActive ? "Aucun résultat" : "Catalogue vide"}
              description={
                filtersActive ? "Aucun matériau ne correspond à ces critères." : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}
