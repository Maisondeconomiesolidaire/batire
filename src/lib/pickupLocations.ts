export const PICKUP_LOCATIONS = [
  {
    id: "usine_agile",
    name: "Usine Agile",
    address: "31 Rue de l'Industrie, 60000 Beauvais",
    latitude: 49.41671,
    longitude: 2.12381,
  },
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
    name: "Esspace 150",
    address: "150 Rte de Paris, 76220 Gournay-en-Bray",
    latitude: 49.469388,
    longitude: 1.725067,
  },
] as const;

export type PickupLocationId = (typeof PICKUP_LOCATIONS)[number]["id"];

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
