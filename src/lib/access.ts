import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type CrmAccess = {
  role: string;
  isStaff: boolean;
  isAdmin: boolean;
  email: string | null;
  grants: Array<{ pageKey: string; actions: string[] }>;
};

/**
 * Droits de l'utilisateur connecté.
 *
 * `myAccess` refuse les requêtes anonymes : on attend donc que Clerk confirme
 * la session, sinon la page lève une erreur serveur avant même d'afficher
 * l'écran de connexion.
 */
export function useAccess() {
  const { isLoaded, isSignedIn } = useAuth();
  return useQuery(api.permissions.myAccess, isLoaded && isSignedIn ? {} : "skip") as
    | CrmAccess
    | undefined;
}

export function canAccess(access: CrmAccess | undefined, pageKey: string, action = "read") {
  if (!access) return false;
  if (access.isAdmin) return true;
  if (!access.isStaff) return false;
  const grant = access.grants.find((entry) => entry.pageKey === pageKey);
  return Boolean(grant?.actions.includes(action));
}
