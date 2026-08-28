import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { QrCode as QrIcon } from "lucide-react";
import { PAGE_X } from "../../lib/constants";
import { cn } from "../../lib/cn";

export function QrLanding() {
  const { reference } = useParams<{ reference: string }>();
  const material = useQuery(api.batire.materialByQr, reference ? { reference } : "skip");

  if (material === undefined) return <FullSpinner label="Lecture du QR code…" />;
  if (material === null) {
    return (
      <div className={cn("mx-auto max-w-2xl py-20", PAGE_X)}>
        <EmptyState
          icon={<QrIcon className="h-10 w-10" />}
          title="Étiquette non attribuée"
          description={`Le QR code ${reference ?? ""} n'est rattaché à aucun matériau.`}
        />
      </div>
    );
  }
  return <Navigate to={`/materiau/${material._id}`} replace />;
}
