import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { PackageOpen, Search, SlidersHorizontal } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { MaterialCard, type PublicMaterial } from "../../components/public/MaterialCard";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input, Select } from "../../components/ui/Field";
import { CONDITIONS, UNITS, type Condition, type Unit } from "../../lib/constants";

/**
 * Boutique en ligne : le catalogue des matériaux disponibles.
 *
 * Les filtres portent sur ce qui décide vraiment d'un achat de matériaux —
 * la catégorie, l'unité de vente et le dépôt où il faut aller les chercher.
 */
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
        <p className="mt-2 max-w-2xl text-[var(--muted-foreground)]">
          Isolation, menuiseries, charpente, sanitaire, revêtements : des matériaux déposés,
          contrôlés et vendus à prix de réemploi. {facets ? `${facets.total} références en stock.` : ""}
        </p>
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
          title={filtersActive ? "Aucun résultat" : "Catalogue en cours de constitution"}
          description={
            filtersActive
              ? "Aucun matériau ne correspond à ces critères. Élargissez la recherche."
              : "Les matériaux mis en ligne par l'équipe apparaîtront ici."
          }
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

      {!kiosk ? (
        <section className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)]">
                <SlidersHorizontal className="h-5 w-5 text-brand-600" />
                Vous avez des matériaux à céder ?
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Fin de chantier, surplus de commande, dépose soignée : envoyez-nous quelques photos
                et les quantités, nous revenons vers vous avec une proposition de reprise.
              </p>
            </div>
            <Link
              to="/reprise"
              className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Proposer des matériaux
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
