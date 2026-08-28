import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Boxes, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/Field";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/Badge";
import { MaterialForm } from "../../components/crm/MaterialForm";
import { formatStock, formatUnitPrice } from "../../lib/format";
import { MATERIAL_STATUSES, STATUS_LABELS, type MaterialStatus } from "../../lib/constants";
import { useAccess, canAccess } from "../../lib/access";

/** Catalogue interne : l'inventaire du dépôt, publié ou non. */
export function Materiaux() {
  const access = useAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | MaterialStatus>("");
  const materials = useQuery(api.batire.listMaterials, {
    search: search.trim() || undefined,
    status: status || undefined,
  });
  const setPublished = useMutation(api.batire.setMaterialPublished);
  const remove = useMutation(api.batire.removeMaterial);
  const [editing, setEditing] = useState<Id<"btMaterials"> | null>(null);
  const [creating, setCreating] = useState(false);

  const canCreate = canAccess(access, "batire:materiaux", "create");
  const canUpdate = canAccess(access, "batire:materiaux", "update");
  const canDelete = canAccess(access, "batire:materiaux", "delete");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matériaux</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {materials ? `${materials.length} référence${materials.length > 1 ? "s" : ""}` : "…"} au
            dépôt
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nouveau matériau
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher (titre, marque, référence, QR, emplacement)…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as MaterialStatus | "")}
          className="w-48"
        >
          <option value="">Tous les statuts</option>
          {MATERIAL_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>

      {materials === undefined ? (
        <FullSpinner label="Chargement du catalogue…" />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-10 w-10" />}
          title="Aucun matériau"
          description="Créez une fiche : l'IA la remplit à partir des photos, vous n'avez qu'à vérifier."
          action={
            canCreate ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Nouveau matériau
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Matériau</th>
                <th className="px-4 py-3 text-left font-medium">Catégorie</th>
                <th className="px-4 py-3 text-left font-medium">Prix</th>
                <th className="px-4 py-3 text-left font-medium">Stock</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Boutique</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {materials.map((material) => (
                <tr key={material._id} className="bg-[var(--card)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--muted)]">
                        {material.photoUrls[0] ? (
                          <img src={material.photoUrls[0]} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{material.title}</p>
                        <p className="truncate text-xs text-[var(--muted-foreground)]">
                          {[material.brand, material.qrReference, material.location]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{material.category}</td>
                  <td className="px-4 py-3 font-semibold">
                    {formatUnitPrice(material.price, material.unit)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {formatStock(material.quantity, material.unit)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={material.status} />
                  </td>
                  <td className="px-4 py-3">
                    {canUpdate ? (
                      <button
                        type="button"
                        onClick={() =>
                          void setPublished({ id: material._id, published: !material.published })
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:text-brand-400"
                      >
                        {material.published ? (
                          <>
                            <Eye className="h-4 w-4 text-emerald-500" /> En ligne
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" /> Hors ligne
                          </>
                        )}
                      </button>
                    ) : material.published ? (
                      "En ligne"
                    ) : (
                      "Hors ligne"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate ? (
                        <button
                          type="button"
                          onClick={() => setEditing(material._id)}
                          className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Supprimer « ${material.title} » ?`)) {
                              void remove({ id: material._id });
                            }
                          }}
                          className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-red-500/10 hover:text-red-400"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating ? <MaterialForm onClose={() => setCreating(false)} /> : null}
      {editing ? <MaterialForm materialId={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
