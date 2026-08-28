/**
 * Référentiel Bâtire. Les valeurs doivent rester identiques à celles du
 * backend (`convex/batire.ts` et le schéma) : ce sont elles qui valident les
 * fiches, et l'IA n'a le droit de choisir que dedans.
 */

export const CATEGORIES = [
  "Gros œuvre et maçonnerie",
  "Charpente et couverture",
  "Menuiseries et fermetures",
  "Isolation",
  "Revêtements sols et murs",
  "Plomberie et sanitaire",
  "Électricité et éclairage",
  "Chauffage et ventilation",
  "Quincaillerie et fixations",
  "Peinture et droguerie",
  "Aménagement extérieur",
  "Outillage et équipement",
] as const;

/**
 * Unité de vente. Elle donne son sens au prix comme au stock : « 12 » ne veut
 * rien dire, « 12 m² » ou « 12 tonnes » désignent deux marchandises.
 */
export const UNITS = ["unité", "m²", "m³", "ml", "kg", "tonne", "palette", "sac", "lot"] as const;

/** Ce que l'unité signifie, affiché en aide de saisie et dans la boutique. */
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

export type Category = (typeof CATEGORIES)[number];
export type Unit = (typeof UNITS)[number];
export type Condition = (typeof CONDITIONS)[number];
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];
export type RequestOutcome = (typeof REQUEST_OUTCOMES)[number];
