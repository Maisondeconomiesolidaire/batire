import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const base =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50";

export function Field({
  label,
  hint,
  required,
  invalid,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /** Champ obligatoire laissé vide à l'enregistrement : encadré rouge et message. */
  invalid?: boolean;
  children: ReactNode;
}) {
  // Volontairement un <div> et non un <label> : un label réexpédie tout clic
  // vers le premier élément « étiquetable » qu'il contient. Avec une liste
  // déroulante maison, choisir une option rouvrait aussitôt le menu — et la
  // parade côté React arrive trop tard, le navigateur ayant déjà agi.
  return (
    <div className={cn("block", invalid && "rounded-xl outline outline-2 outline-offset-4 outline-red-500")} data-invalid={invalid ? "true" : undefined}>
      <span className={cn("mb-1.5 flex items-baseline gap-1.5 text-sm font-medium", invalid ? "text-red-600" : "text-[var(--foreground)]")}>
        {label}
        {required ? <span className="text-brand-600">*</span> : null}
        {hint ? (
          <span className="text-xs font-normal text-[var(--muted-foreground)]">{hint}</span>
        ) : null}
      </span>
      {children}
      {invalid ? <span role="alert" className="mt-1 block text-xs font-medium text-red-600">Champ obligatoire</span> : null}
    </div>
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
