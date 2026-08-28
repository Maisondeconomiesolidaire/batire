import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  outline:
    "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--accent)]",
  ghost: "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
  danger: "border border-red-200 text-red-600 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-5 text-sm",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
