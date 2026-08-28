import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Boxes, Download, Eye, EyeOff, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { Dropdown } from "../../components/ui/Dropdown";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/Badge";
import { formatStock, formatUnitPrice } from "../../lib/format";
import { MATERIAL_STATUSES, STATUS_LABELS, type MaterialStatus } from "../../lib/constants";
import { useAccess, canAccess } from "../../lib/access";
import { exportMaterials, parseWorkbook } from "../../lib/excel";

export function Materiaux() {
  const navigate = useNavigate();
  const access = useAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | MaterialStatus>("");
  const materials = useQuery(api.batire.listMaterials, {
    search: search.trim() || undefined,
    status: status || undefined,
  });
  const setPublished = useMutation(api.batire.setMaterialPublished);
  const importMaterials = useMutation(api.batire.importMaterials);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<string | null>(null);
  const remove = useMutation(api.batire.removeMaterial);

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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => exportMaterials(materials ?? [])}
            disabled={!materials?.length}
          >
            <Download className="h-4 w-4" /> Exporter
          </Button>
          {canCreate ? (
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-semibold transition hover:bg-[var(--accent)]">
              <Upload className="h-4 w-4" />
              {importing ? "Import…" : "Importer"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.ods"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setImporting(true);
                  setImportReport(null);
                  try {
                    const rows = await parseWorkbook(file);
                    if (rows.length === 0) {
                      setImportReport("Aucune ligne exploitable : vérifiez les en-têtes.");
                      return;
                    }
                    const result = await importMaterials({ rows });
                    setImportReport(
                      `${result.imported} matériau${result.imported > 1 ? "x" : ""} importé${result.imported > 1 ? "s" : ""} en brouillon` +
                        (result.errors.length
                          ? ` · ${result.errors.length} ligne(s) écartée(s) : ${result.errors
                              .slice(0, 3)
                              .map((error) => `L${error.line} ${error.reason}`)
                              .join(", ")}`
                          : ""),
                    );
                  } catch (caught) {
                    setImportReport(
                      caught instanceof Error ? caught.message : "Import impossible.",
                    );
                  } finally {
                    setImporting(false);
                  }
                }}
              />
            </label>
          ) : null}
          {canCreate ? (
            <Button onClick={() => navigate("/crm/materiaux/nouveau")}>
              <Plus className="h-4 w-4" /> Nouveau matériau
            </Button>
          ) : null}
        </div>
      </div>

      {importReport ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm">
          {importReport}
        </p>
      ) : null}

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
        <Dropdown
          className="w-52"
          value={status}
          onChange={(value) => setStatus(value as MaterialStatus | "")}
          placeholder="Tous les statuts"
          options={[
            { value: "", label: "Tous les statuts" },
            ...MATERIAL_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
          ]}
        />
      </div>

      {materials === undefined ? (
        <FullSpinner label="Chargement du catalogue…" />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-10 w-10" />}
          title="Aucun matériau"
          action={
            canCreate ? (
              <Button onClick={() => navigate("/crm/materiaux/nouveau")}>
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
                          onClick={() => navigate(`/crm/materiaux/${material._id}`)}
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

    </div>
  );
}
