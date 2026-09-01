export type AddressSuggestion = {
  label: string;
  address: string;
  postalCode: string;
  city: string;
};

/** Biais de proximité : le dépôt, à Lachapelle-aux-Pots (60650). */
const BIAS = { lat: 49.4517, lon: 1.9236 };

/**
 * Recherche d'adresses dans la Base Adresse Nationale
 * (api-adresse.data.gouv.fr) : gratuite, sans clé, exhaustive sur la France, et
 * déjà utilisée par les autres apps de l'écosystème. Résultats triés par
 * proximité du dépôt.
 */
export async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}` +
    `&limit=6&lat=${BIAS.lat}&lon=${BIAS.lon}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = (await response.json()) as {
      features: {
        properties: { label: string; name?: string; postcode?: string; city?: string };
      }[];
    };
    return (data.features ?? []).map((feature) => ({
      label: feature.properties.label,
      address: feature.properties.name ?? feature.properties.label,
      postalCode: feature.properties.postcode ?? "",
      city: feature.properties.city ?? "",
    }));
  } catch {
    return [];
  }
}
