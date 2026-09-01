import { Field, Input } from "../ui/Field";
import { MultiPicker } from "../ui/MultiPicker";
import { PROFILES } from "../../lib/constants";

export type DonorForm = {
  company: string;
  siret: string;
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
  return Boolean(donor.firstName.trim() && donor.lastName.trim() && donor.phone.trim());
}

/**
 * Coordonnées du donateur : les mêmes champs dans l'espace client et dans le
 * formulaire de don, pour que l'un préremplisse l'autre sans divergence.
 */
export function DonorFieldset({
  donor,
  set,
  showSiret = true,
}: {
  donor: DonorForm;
  set: <K extends keyof DonorForm>(key: K, value: DonorForm[K]) => void;
  showSiret?: boolean;
}) {
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
        <Field label="SIRET">
          <Input
            value={donor.siret}
            onChange={(event) => set("siret", event.target.value)}
            placeholder="123 456 789 00012"
          />
        </Field>
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
      <Field label="Téléphone" required>
        <Input
          value={donor.phone}
          onChange={(event) => set("phone", event.target.value)}
          placeholder="06 12 34 56 78"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Adresse">
          <Input
            value={donor.address}
            onChange={(event) => set("address", event.target.value)}
            placeholder="12 rue des Ateliers"
          />
        </Field>
      </div>
      <Field label="Code postal">
        <Input
          value={donor.postalCode}
          onChange={(event) => set("postalCode", event.target.value)}
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
