import { Field, Input } from "../ui/Field";
import { MultiPicker } from "../ui/MultiPicker";
import { AddressAutocomplete } from "../ui/AddressAutocomplete";
import { PhoneInput, isFrPhone } from "../ui/PhoneInput";
import { PROFILES } from "../../lib/constants";

export type DonorForm = {
  company: string;
  siret: string;
  apeCode: string;
  profiles: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
};

export const EMPTY_DONOR: DonorForm = {
  company: "",
  siret: "",
  apeCode: "",
  profiles: [],
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
};

/** Ce que la fiche donateur doit porter pour qu'un don parte. */
export function donorReady(donor: DonorForm) {
  return Boolean(donor.firstName.trim() && donor.lastName.trim() && isFrPhone(donor.phone));
}

/**
 * Coordonnées du donateur : les mêmes champs dans l'espace client et dans le
 * formulaire de don, pour que l'un préremplisse l'autre sans divergence.
 */
export function DonorFieldset({
  donor,
  set,
  patch,
  showSiret = true,
}: {
  donor: DonorForm;
  set: <K extends keyof DonorForm>(key: K, value: DonorForm[K]) => void;
  /** Une adresse choisie remplit rue, code postal et ville d'un seul coup. */
  patch: (values: Partial<DonorForm>) => void;
  showSiret?: boolean;
}) {
  const phoneInvalid = donor.phone.trim().length > 0 && !isFrPhone(donor.phone);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Type de donateur" hint="plusieurs choix possibles">
          <MultiPicker
            values={donor.profiles}
            options={[...PROFILES]}
            onChange={(values) => set("profiles", values)}
            emptyLabel="Aucun type de donateur"
          />
        </Field>
      </div>
      <Field label="Entreprise">
        <Input
          value={donor.company}
          onChange={(event) => set("company", event.target.value)}
          placeholder="Bâti Nord"
        />
      </Field>
      {showSiret ? (
        <>
          <Field label="SIRET">
            <Input
              value={donor.siret}
              onChange={(event) => set("siret", event.target.value)}
              placeholder="123 456 789 00012"
            />
          </Field>
          <Field label="Code APE" hint="code NAF de l'activité">
            <Input
              value={donor.apeCode}
              onChange={(event) => set("apeCode", event.target.value.toUpperCase())}
              placeholder="4399C"
            />
          </Field>
        </>
      ) : null}
      <Field label="Prénom" required>
        <Input value={donor.firstName} onChange={(event) => set("firstName", event.target.value)} />
      </Field>
      <Field label="Nom" required>
        <Input value={donor.lastName} onChange={(event) => set("lastName", event.target.value)} />
      </Field>
      <Field label="Email">
        <Input value={donor.email} disabled />
      </Field>
      <div>
        <Field label="Téléphone" required>
          <PhoneInput value={donor.phone} onValueChange={(value) => set("phone", value)} />
        </Field>
        {phoneInvalid ? (
          <p className="mt-1 text-xs font-medium text-red-600">
            Numéro français à 10 chiffres attendu.
          </p>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <Field label="Adresse">
          <AddressAutocomplete
            value={donor.address}
            onValueChange={(value) => set("address", value)}
            onSelect={(address) =>
              patch({
                address: address.address,
                postalCode: address.postalCode,
                city: address.city,
              })
            }
            placeholder="12 rue des Ateliers, Beauvais"
          />
        </Field>
      </div>
      <Field label="Code postal">
        <Input
          value={donor.postalCode}
          inputMode="numeric"
          onChange={(event) =>
            set("postalCode", event.target.value.replace(/\D/g, "").slice(0, 5))
          }
          placeholder="60650"
        />
      </Field>
      <Field label="Ville">
        <Input
          value={donor.city}
          onChange={(event) => set("city", event.target.value)}
          placeholder="Beauvais"
        />
      </Field>
    </div>
  );
}
