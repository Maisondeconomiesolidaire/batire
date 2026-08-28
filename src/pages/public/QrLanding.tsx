import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { QrCode as QrIcon } from "lucide-react";

/**
 * Atterrissage d'un QR code scanné sur un matériau.
 *
 * Le code est collé avant la mise en ligne : tant qu'aucune fiche ne lui est
 * rattachée, on le dit plutôt que d'afficher une erreur.
 */
export function QrLanding() {
  const { reference } = useParams<{ reference: string }>();
  const material = useQuery(api.batire.materialByQr, reference ? { reference } : "skip");

  if (material === undefined) return <FullSpinner label="Lecture du QR code…" />;
  if (material === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={<QrIcon className="h-10 w-10" />}
          title="Étiquette non attribuée"
          description={`Le QR code ${reference ?? ""} n'est encore rattaché à aucun matériau. Demandez à l'équipe du dépôt.`}
        />
      </div>
    );
  }
  return <Navigate to={`/materiau/${material._id}`} replace />;
}
