import * as XLSX from "@e965/xlsx";

export type ImportRow = {
  title: string;
  description?: string;
  category?: string;
  family?: string;
  subcategory?: string;
  condition?: string;
  unit?: string;
  quantity?: number;
  price?: number;
  brand?: string;
  material?: string;
  depot?: string;
  location?: string;
  qrReference?: string;
};

/** En-têtes acceptés, accents et casse ignorés. */
const HEADERS: Record<string, keyof ImportRow> = {
  titre: "title",
  designation: "title",
  libelle: "title",
  description: "description",
  categorie: "category",
  famille: "family",
  sousfamille: "subcategory",
  souscategorie: "subcategory",
  etat: "condition",
  unite: "unit",
  quantite: "quantity",
  stock: "quantity",
  prix: "price",
  prixunitaire: "price",
  marque: "brand",
  matiere: "material",
  depot: "depot",
  emplacement: "location",
  qr: "qrReference",
  qrcode: "qrReference",
  reference: "qrReference",
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Lit un classeur et n'en retient que les colonnes reconnues. */
export async function parseWorkbook(file: File): Promise<ImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return raw
    .map((line) => {
      const row: ImportRow = { title: "" };
      for (const [key, value] of Object.entries(line)) {
        const field = HEADERS[normalizeHeader(key)];
        if (!field) continue;
        if (field === "quantity" || field === "price") {
          const parsed = Number(String(value).replace(",", "."));
          if (Number.isFinite(parsed)) row[field] = parsed;
        } else {
          const text = String(value).trim();
          if (text) row[field] = text;
        }
      }
      return row;
    })
    .filter((row) => row.title.trim().length > 0);
}

/** Export du catalogue, colonnes réimportables telles quelles. */
export function exportMaterials(
  materials: Array<Record<string, unknown>>,
  filename = "batire-materiaux.xlsx",
) {
  const rows = materials.map((material) => ({
    Titre: material.title,
    Description: material.description,
    Catégorie: material.category,
    Famille: material.family ?? "",
    "Sous-famille": material.subcategory ?? "",
    État: material.condition,
    Unité: material.unit,
    Quantité: material.quantity,
    "Prix unitaire": material.price,
    Marque: material.brand ?? "",
    Matière: material.material ?? "",
    Dépôt: material.depot ?? "",
    Emplacement: material.location ?? "",
    "QR code": material.qrReference ?? "",
    Statut: material.status,
    "En ligne": material.published ? "oui" : "non",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Matériaux");
  XLSX.writeFile(workbook, filename);
}
