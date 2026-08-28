import type { Unit } from "./constants";

export function formatPrice(amount: number) {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

/** « 45,00 € / m² » — le prix d'un matériau ne se lit pas sans son unité. */
export function formatUnitPrice(price: number, unit: Unit) {
  return `${formatPrice(price)} / ${unit}`;
}

/** « 120 m² disponibles », « 3 palettes disponibles ». */
export function formatStock(quantity: number, unit: Unit) {
  const rounded = Number.isInteger(quantity) ? quantity : Math.round(quantity * 100) / 100;
  const value = rounded.toLocaleString("fr-FR");
  if (unit === "unité") return `${value} ${rounded > 1 ? "unités" : "unité"}`;
  if (unit === "palette") return `${value} ${rounded > 1 ? "palettes" : "palette"}`;
  if (unit === "sac") return `${value} ${rounded > 1 ? "sacs" : "sac"}`;
  if (unit === "lot") return `${value} ${rounded > 1 ? "lots" : "lot"}`;
  return `${value} ${unit}`;
}

export function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("fr-FR");
}

export function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Dimensions lisibles : on n'affiche que ce qui est renseigné. */
export function formatDimensions(material: {
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  thicknessMm?: number;
}) {
  const parts: string[] = [];
  if (material.lengthCm) parts.push(`L ${material.lengthCm} cm`);
  if (material.widthCm) parts.push(`l ${material.widthCm} cm`);
  if (material.heightCm) parts.push(`H ${material.heightCm} cm`);
  if (material.thicknessMm) parts.push(`ép. ${material.thicknessMm} mm`);
  return parts.join(" × ");
}
