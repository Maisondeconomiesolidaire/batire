/** Types d'emplacement (page Emplacements du CRM), aussi affichés dans Meslogistic. */
export const SLOT_KINDS = [
  { key: "stockage", label: "Stockage", color: "#2795b3" },
  { key: "depart", label: "Départ marchandise", color: "#d97706" },
  { key: "arrivee", label: "Arrivée marchandise", color: "#16a34a" },
] as const;

export type SlotKind = (typeof SLOT_KINDS)[number]["key"];

/** Un emplacement créé avant les types est un emplacement de stockage. */
export const slotKindOf = (slot: { kind?: SlotKind }) => slot.kind ?? "stockage";
export const slotKindLabel = (kind?: SlotKind) => SLOT_KINDS.find(item => item.key === (kind ?? "stockage"))!.label;
