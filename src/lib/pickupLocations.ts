export const PICKUP_LOCATIONS = [
  {
    id: "comptoir_c",
    name: "Comptoir C",
    address: "13 Av. Pierre Bérégovoy, 60000 Beauvais",
    latitude: 49.439732,
    longitude: 2.104311,
  },
  {
    id: "recyclerie_pays_de_bray",
    name: "Recyclerie du Pays de Bray",
    address: "4 Rue de la Prairie, 60650 Lachapelle-aux-Pots",
    latitude: 49.44225,
    longitude: 1.902468,
  },
  {
    id: "esspace_150",
    name: "Esspace 150 / Recyclerie de Gournay",
    address: "150 Rte de Paris, 76220 Gournay-en-Bray",
    latitude: 49.469388,
    longitude: 1.725067,
  },
] as const;

export type PickupLocationId = (typeof PICKUP_LOCATIONS)[number]["id"];

/**
 * Horaires proposés par défaut dans l'avis « retrait disponible ». Seuls ceux
 * de la Recyclerie du Pays de Bray sont connus : les autres se saisissent une
 * fois, puis sont retenus par le navigateur.
 */
export const DEFAULT_OPENING_HOURS: Partial<Record<string, string>> = {
  recyclerie_pays_de_bray: "Du mardi au samedi, de 14h00 à 17h00",
  usine_agile: "Du mardi au samedi, de 14h00 à 17h00",
};

export function pickupLocationById(id?: string) {
  const canonical = id === "usine_agile" ? "recyclerie_pays_de_bray" : id;
  return PICKUP_LOCATIONS.find(location => location.id === canonical);
}

/** Même rapprochement que le backend, pour expliquer clairement les frais au client. */
export function storageLocationId(depot?: string): PickupLocationId | undefined {
  const value = depot?.trim().toLocaleLowerCase("fr-FR") ?? "";
  if (!value) return undefined;
  if (value.includes("comptoir")) return "comptoir_c";
  if (value.includes("solidarium") || value.includes("usine") || value.includes("pays de bray") || value.includes("lachapelle")) return "recyclerie_pays_de_bray";
  if (value.includes("esspace") || value.includes("gournay")) return "esspace_150";
  return undefined;
}

/** Distance à vol d'oiseau : suffisamment claire pour comparer les retraits. */
export function distanceInKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
