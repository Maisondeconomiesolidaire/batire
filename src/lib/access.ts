import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type CrmAccess = {
  role: string;
  isStaff: boolean;
  isAdmin: boolean;
  email: string | null;
  grants: Array<{ pageKey: string; actions: string[] }>;
};

/** Droits de l'utilisateur connecté, tels que Mes Outils les administre. */
export function useAccess() {
  return useQuery(api.permissions.myAccess, {}) as CrmAccess | undefined;
}

export function canAccess(access: CrmAccess | undefined, pageKey: string, action = "read") {
  if (!access) return false;
  if (access.isAdmin) return true;
  if (!access.isStaff) return false;
  const grant = access.grants.find((entry) => entry.pageKey === pageKey);
  return Boolean(grant?.actions.includes(action));
}
