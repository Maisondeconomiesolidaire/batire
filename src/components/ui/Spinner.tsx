import { Loader2 } from "lucide-react";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={className ?? "h-5 w-5 animate-spin text-brand-600"} />;
}

export function FullSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--muted-foreground)]">
      <Spinner className="h-7 w-7 animate-spin text-brand-600" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}
