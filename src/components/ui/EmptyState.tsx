import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-14 text-center">
      {icon ? <span className="text-[var(--muted-foreground)]">{icon}</span> : null}
      <p className="text-base font-semibold text-[var(--foreground)]">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-[var(--muted-foreground)]">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
