import { cn } from "../../lib/cn";
import type { MaterialStatus, RequestOutcome } from "../../lib/constants";
import { OUTCOME_LABELS, STATUS_LABELS } from "../../lib/constants";

const STATUS_TONES: Record<MaterialStatus, string> = {
  brouillon: "bg-zinc-100 text-zinc-700",
  disponible: "bg-emerald-100 text-emerald-800",
  reserve: "bg-amber-100 text-amber-800",
  vendu: "bg-zinc-200 text-zinc-600",
};

const OUTCOME_TONES: Record<RequestOutcome, string> = {
  nouveau: "bg-brand-100 text-brand-800",
  en_cours: "bg-sky-100 text-sky-800",
  gagnee: "bg-emerald-100 text-emerald-800",
  perdue: "bg-zinc-200 text-zinc-600",
};

export function StatusBadge({ status }: { status: MaterialStatus }) {
  return <Pill className={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Pill>;
}

export function OutcomeBadge({ outcome }: { outcome: RequestOutcome }) {
  return <Pill className={OUTCOME_TONES[outcome]}>{OUTCOME_LABELS[outcome]}</Pill>;
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}
