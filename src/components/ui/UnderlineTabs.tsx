import { cn } from "../../lib/cn";

/** Onglets soulignés, comme dans les autres apps de l'écosystème. */
export function UnderlineTabs<T extends string>({
  items,
  value,
  onChange,
  counts,
  className,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-[var(--border)]", className)}>
      <div className="flex flex-wrap items-end gap-6">
        {items.map((item) => {
          const active = item.key === value;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-[15px] font-medium transition-colors",
                active
                  ? "border-brand-600 text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              <span>{item.label}</span>
              {counts?.[item.key] !== undefined ? (
                <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                  {counts[item.key]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
