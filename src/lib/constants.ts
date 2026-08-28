/** Référentiel Bâtire, à garder identique à celui du backend. */
export { CATEGORIES, TAXONOMY, familiesOf, subFamiliesOf, taxonomyPath } from "./taxonomy";

/** Unité de vente : elle commande le prix et le stock. */
export const UNITS = ["unité", "m²", "m³", "ml", "kg", "tonne", "palette", "sac", "lot"] as const;


export const UNIT_LABELS: Record<Unit, string> = {
  "unité": "à l'unité",
  "m²": "au mètre carré",
  "m³": "au mètre cube",
  ml: "au mètre linéaire",
  kg: "au kilo",
  tonne: "à la tonne",
  palette: "à la palette",
  sac: "au sac",
  lot: "au lot",
};

export const CONDITIONS = [
  "Neuf",
  "Déstockage",
  "Très bon état",
  "Bon état",
  "À rénover",
] as const;

export const MATERIAL_STATUSES = ["brouillon", "disponible", "reserve", "vendu"] as const;

export const STATUS_LABELS: Record<MaterialStatus, string> = {
  brouillon: "Brouillon",
  disponible: "Disponible",
  reserve: "Réservé",
  vendu: "Vendu",
};

export const REQUEST_TYPES = ["devis", "reservation", "reprise", "question"] as const;

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  devis: "Demande de devis",
  reservation: "Réservation",
  reprise: "Proposition de reprise",
  question: "Question",
};

export const REQUEST_OUTCOMES = ["nouveau", "en_cours", "gagnee", "perdue"] as const;

export const OUTCOME_LABELS: Record<RequestOutcome, string> = {
  nouveau: "Nouvelle",
  en_cours: "En cours",
  gagnee: "Gagnée",
  perdue: "Perdue",
};

export type Unit = (typeof UNITS)[number];
export type Condition = (typeof CONDITIONS)[number];
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];
export type RequestOutcome = (typeof REQUEST_OUTCOMES)[number];
