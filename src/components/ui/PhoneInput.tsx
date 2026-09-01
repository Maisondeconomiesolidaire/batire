import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/** 0612345678 → 06 12 34 56 78. Dix chiffres, jamais plus. */
export function formatFrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^33/, "0").slice(0, 10);
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
}

/** Un numéro français complet, une fois les espaces retirés. */
export function isFrPhone(value: string): boolean {
  return /^0[1-9]\d{8}$/.test(value.replace(/\D/g, ""));
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Numéro de téléphone français : le formatage se fait à la frappe, et tout ce
 * qui n'est pas un chiffre est écarté. Un numéro saisi « 0612345678 » ou
 * « +33 6 12 34 56 78 » ressort dans la même forme que les autres.
 */
export const PhoneInput = forwardRef<HTMLInputElement, Props>(function PhoneInput(
  { value, onValueChange, className, ...rest },
  ref,
) {
  return (
    <div className="relative flex items-center">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3.5 select-none text-base leading-none"
      >
        🇫🇷
      </span>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="06 12 34 56 78"
        value={value}
        onChange={(event) => onValueChange(formatFrPhone(event.target.value))}
        className={cn(
          "w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-11 pr-3.5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50",
          className,
        )}
        {...rest}
      />
    </div>
  );
});
