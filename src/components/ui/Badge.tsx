import { cn } from "../../lib/cn";
import type { DonationStatus, MaterialStatus, RequestOutcome } from "../../lib/constants";
import { DONATION_STATUS_LABELS, OUTCOME_LABELS, STATUS_LABELS } from "../../lib/constants";

const STATUS_TONES: Record<MaterialStatus, string> = {
  brouillon: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300",
  disponible: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  reserve: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  vendu: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
};

const OUTCOME_TONES: Record<RequestOutcome, string> = {
  nouveau: "bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300",
  en_cours: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  gagnee: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  perdue: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
};

const DONATION_TONES: Record<DonationStatus, string> = {
  nouveau: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  accepte: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  refuse: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export function DonationBadge({ status }: { status: DonationStatus }) {
  return <Pill className={DONATION_TONES[status]}>{DONATION_STATUS_LABELS[status]}</Pill>;
}

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
