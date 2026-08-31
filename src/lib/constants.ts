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
  "Reconditionné",
  "Très bon état",
  "Bon état",
  "À reconditionner",
] as const;

/** Provenance du matériau, telle qu'elle se déclare dans un diagnostic PEMD. */
export const ORIGINS = [
  "Reconditionné",
  "Occasion réemploi",
  "Déstockage neuf",
  "Recyclé upcyclé",
  "Surplus de chantier",
] as const;

/** Types de structures d'où vient le matériau, ou qu'il vise. */
export const PROFILES = [
  "Artisans, professionnels du BTP, organisations PRO",
  "Déchèteries publiques",
  "Distributeurs de matériaux",
  "Maîtres d'ouvrage, architectes, maîtres d'œuvre",
  "Entreprises de recyclage",
  "Recycleries et ressourceries généralistes",
] as const;

/**
 * Matières proposées d'origine. La liste réellement affichée vient du backend
 * (`batire.materialOptions`), qui y ajoute ce que l'équipe a saisi ; celle-ci
 * sert de repli tant que la requête n'a pas répondu.
 */
export const MATERIALS = [
  "Bois massif",
  "Grès cérame",
  "Céramique",
  "Métal",
  "PVC",
  "Liège",
  "Acier",
  "Plastique PEHD",
  "Plastique",
  "Aluminium",
  "Verre",
  "Inox",
  "Laine de verre",
  "Stratifié",
  "Porcelaine",
  "Verre trempé",
  "Bois aggloméré",
  "Plastique recyclé",
  "Béton",
  "Tissu",
  "Miroir",
  "Pierre",
] as const;

/** Unité dans laquelle sont saisies longueur, largeur, hauteur et diamètre. */
export const DIMENSION_UNITS = ["mm", "cm", "m"] as const;

/**
 * Les cinq potentiels du diagnostic, dans l'ordre de la hiérarchie des modes
 * de traitement : du plus vertueux (réemploi) au dernier recours (élimination).
 */
export const POTENTIALS = [
  { key: "reusePotential", label: "Potentiel de réemploi" },
  { key: "repurposePotential", label: "Potentiel de réutilisation" },
  { key: "recyclingPotential", label: "Potentiel de recyclage" },
  { key: "recoveryPotential", label: "Potentiel de valorisation" },
  { key: "disposalPotential", label: "Potentiel d'élimination" },
] as const;

export type PotentialKey = (typeof POTENTIALS)[number]["key"];

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
/** Valeur retirée du référentiel mais encore portée par d'anciennes fiches. */
export const LEGACY_CONDITIONS = ["À rénover"] as const;

export type Condition = (typeof CONDITIONS)[number] | (typeof LEGACY_CONDITIONS)[number];
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];
export type RequestOutcome = (typeof REQUEST_OUTCOMES)[number];

/**
 * La gouttière commune à l'en-tête et aux pages : elles s'alignent au pixel
 * parce qu'elles lisent la même valeur, pas parce qu'on a recopié la même
 * classe à six endroits.
 */
export const PAGE_X = "px-4 sm:px-6";
