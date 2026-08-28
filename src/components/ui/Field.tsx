import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const base =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50";

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-[var(--foreground)]">
        {label}
        {required ? <span className="text-brand-600">*</span> : null}
        {hint ? (
          <span className="text-xs font-normal text-[var(--muted-foreground)]">{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} rows={4} className={cn(base, "resize-y", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(base, "pr-8", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";
