/** Catégories et sous-catégories du catalogue, communes au CRM et à la boutique. */
export const TAXONOMY: Record<string, string[]> = {
  "Gros œuvre et maçonnerie": [
    "Parpaings et blocs béton",
    "Briques et terre cuite",
    "Ciments, mortiers et enduits",
    "Granulats, sable et gravats",
    "Aciers et treillis",
    "Coffrage et étaiement",
  ],
  "Charpente et couverture": [
    "Bois de charpente",
    "Fermettes et poutres",
    "Tuiles",
    "Ardoises",
    "Tôles et bacs acier",
    "Zinguerie et gouttières",
    "Écrans sous-toiture",
  ],
  "Menuiseries et fermetures": [
    "Portes intérieures",
    "Portes d'entrée",
    "Fenêtres et baies",
    "Volets et stores",
    "Portes de garage",
    "Vitrages",
    "Quincaillerie de menuiserie",
  ],
  Isolation: [
    "Laine de verre",
    "Laine de roche",
    "Isolants biosourcés",
    "Polystyrène et polyuréthane",
    "Isolants minces",
    "Pare-vapeur et membranes",
  ],
  "Revêtements sols et murs": [
    "Carrelage et faïence",
    "Parquet et stratifié",
    "Sols souples",
    "Plaques de plâtre",
    "Lambris et bardages",
    "Papiers peints et toiles",
  ],
  "Plomberie et sanitaire": [
    "Éviers et lavabos",
    "WC et abattants",
    "Douches et baignoires",
    "Robinetterie",
    "Tuyauterie et raccords",
    "Chauffe-eau",
  ],
  "Électricité et éclairage": [
    "Câbles et gaines",
    "Tableaux et disjoncteurs",
    "Appareillage mural",
    "Luminaires intérieurs",
    "Éclairage extérieur",
    "Domotique",
  ],
  "Chauffage et ventilation": [
    "Radiateurs",
    "Poêles et inserts",
    "Chaudières",
    "VMC et extracteurs",
    "Conduits et raccords",
    "Climatisation",
  ],
  "Quincaillerie et fixations": [
    "Visserie et boulonnerie",
    "Chevilles et ancrages",
    "Charnières et paumelles",
    "Serrures et cylindres",
    "Poignées et boutons",
    "Colles et mastics",
  ],
  "Peinture et droguerie": [
    "Peintures intérieures",
    "Peintures extérieures",
    "Lasures et vernis",
    "Sous-couches et primaires",
    "Outils d'application",
    "Solvants et nettoyants",
  ],
  "Aménagement extérieur": [
    "Dalles et pavés",
    "Clôtures et portails",
    "Bordures et margelles",
    "Terrasses bois et composite",
    "Mobilier et jardinières",
    "Récupération d'eau",
  ],
  "Outillage et équipement": [
    "Outillage à main",
    "Outillage électroportatif",
    "Échafaudages et échelles",
    "Brouettes et manutention",
    "Équipements de protection",
    "Consommables",
  ],
};

export const CATEGORIES = Object.keys(TAXONOMY);

export function subcategoriesOf(category: string) {
  return TAXONOMY[category] ?? [];
}
