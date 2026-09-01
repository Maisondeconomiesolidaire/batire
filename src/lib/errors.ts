import { ConvexError } from "convex/values";

/**
 * Message lisible d'une erreur de mutation. Une `ConvexError` porte le texte
 * métier dans `data` ; sans ce détour, l'utilisateur lirait la trace brute du
 * runtime — ou, si personne ne l'affiche, rien du tout.
 */
export function errorMessage(caught: unknown, fallback: string) {
  if (caught instanceof ConvexError) {
    return typeof caught.data === "string" && caught.data.trim() ? caught.data : fallback;
  }
  return caught instanceof Error && caught.message ? caught.message : fallback;
}
