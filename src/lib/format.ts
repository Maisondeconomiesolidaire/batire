import type { Unit } from "./constants";

export function formatPrice(amount: number) {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}


export function formatUnitPrice(price: number, unit: Unit) {
  return `${formatPrice(price)} / ${unit}`;
}


/** Le nom de l'unité accordé en nombre : 1 palette, 2 palettes, 3 tonnes. */
export function unitLabel(quantity: number, unit: Unit) {
  const plural = quantity > 1;
  if (unit === "unité") return plural ? "unités" : "unité";
  if (unit === "palette") return plural ? "palettes" : "palette";
  if (unit === "sac") return plural ? "sacs" : "sac";
  if (unit === "lot") return plural ? "lots" : "lot";
  return unit;
}

export function formatStock(quantity: number, unit: Unit) {
  const rounded = Number.isInteger(quantity) ? quantity : Math.round(quantity * 100) / 100;
  return `${rounded.toLocaleString("fr-FR")} ${unitLabel(rounded, unit)}`;
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
