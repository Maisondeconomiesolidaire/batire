import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { PackageOpen, Search } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { MaterialCard, type PublicMaterial } from "../../components/public/MaterialCard";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input, Select } from "../../components/ui/Field";
import { CONDITIONS, UNITS, type Condition, type Unit } from "../../lib/constants";

/** Catalogue public des matériaux disponibles. */
export function Boutique({ kiosk = false }: { kiosk?: boolean }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState<"" | Unit>("");
  const [condition, setCondition] = useState<"" | Condition>("");
  const [depot, setDepot] = useState("");

  const facets = useQuery(api.batire.shopFacets, {});
  const materials = useQuery(api.batire.listPublicMaterials, {
    search: search.trim() || undefined,
    category: category || undefined,
    unit: unit || undefined,
    condition: condition || undefined,
    depot: depot || undefined,
  }) as PublicMaterial[] | undefined;

  const filtersActive = useMemo(
    () => Boolean(search.trim() || category || unit || condition || depot),
    [search, category, unit, condition, depot],
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">
          {kiosk ? "Nos matériaux en dépôt" : "Matériaux de réemploi"}
        </h1>
        {facets ? (
          <p className="mt-2 text-[var(--muted-foreground)]">
            {facets.total} référence{facets.total > 1 ? "s" : ""} en stock
          </p>
        ) : null}
      </header>

      <div className="mb-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher…"
            className="pl-9"
          />
        </div>
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Toutes les catégories</option>
          {(facets?.categories ?? []).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select value={unit} onChange={(event) => setUnit(event.target.value as Unit | "")}>
          <option value="">Toutes les unités</option>
          {UNITS.map((value) => (
            <option key={value} value={value}>
              Vendu au {value}
            </option>
          ))}
        </Select>
        <Select
          value={condition}
          onChange={(event) => setCondition(event.target.value as Condition | "")}
        >
          <option value="">Tous les états</option>
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select value={depot} onChange={(event) => setDepot(event.target.value)}>
          <option value="">Tous les dépôts</option>
          {(facets?.depots ?? []).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>

      {materials === undefined ? (
        <FullSpinner label="Chargement du catalogue…" />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-10 w-10" />}
          title={filtersActive ? "Aucun résultat" : "Catalogue vide"}
          description={filtersActive ? "Aucun matériau ne correspond à ces critères." : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {materials.map((material) => (
            <MaterialCard
              key={material._id}
              material={material}
              to={`${kiosk ? "/kiosk" : ""}/materiau/${material._id}`}
            />
          ))}
        </div>
      )}

    </div>
  );
}
