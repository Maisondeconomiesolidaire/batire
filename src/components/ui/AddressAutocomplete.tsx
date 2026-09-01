import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { searchAddresses, type AddressSuggestion } from "../../lib/address";
import { Input } from "./Field";

/**
 * Saisie d'adresse avec autocomplétion.
 *
 * Une adresse tapée à la main arrive mal orthographiée, sans code postal ni
 * ville : ici on choisit une adresse réelle, et le formulaire remplit les trois
 * champs d'un coup.
 */
export function AddressAutocomplete({
  value,
  onValueChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (address: AddressSuggestion) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // Après une sélection, la valeur change : sans ce drapeau, la liste se
  // rouvrirait aussitôt sur l'adresse qu'on vient de choisir.
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const query = value.trim();
    if (!focused || query.length < 3) {
      setOpen(false);
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchAddresses(query);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 250);
    return () => clearTimeout(timer);
  }, [focused, value]);

  function pick(suggestion: AddressSuggestion) {
    skipNext.current = true;
    onSelect(suggestion);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <Input
        value={value}
        autoComplete="off"
        placeholder={placeholder ?? "Commencez à saisir l'adresse…"}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() =>
          setTimeout(() => {
            setFocused(false);
            setOpen(false);
          }, 150)
        }
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.label}-${index}`}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(suggestion)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--accent)]"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-[var(--foreground)]">
                    {suggestion.address}
                  </span>
                  <span className="block text-xs text-[var(--muted-foreground)]">
                    {suggestion.postalCode} {suggestion.city}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
