import { Link } from "react-router-dom";
import { MessageSquare, Phone } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { PAGE_X } from "../../lib/constants";
import { cn } from "../../lib/cn";

const PHONE_DISPLAY = "03 75 15 04 75";
const PHONE_LINK = "+33375150475";

export function Contact() {
  return (
    <main className={cn("mx-auto w-full max-w-4xl py-10 sm:py-14", PAGE_X)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">BâtiRe</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
        Nous contacter
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
        Une question sur un matériau, une réservation, un retrait ou un don ? Notre équipe vous répond.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href={`tel:${PHONE_LINK}`}
          className="group rounded-2xl border border-brand-200 bg-brand-50/60 p-6 transition hover:border-brand-400 hover:bg-brand-50"
        >
          <Phone className="h-6 w-6 text-brand-700" />
          <p className="mt-5 text-sm font-semibold text-zinc-950">Par téléphone</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-brand-700">{PHONE_DISPLAY}</p>
          <p className="mt-3 text-sm leading-6 text-zinc-600">Appelez-nous pour être accompagné dans votre projet de réemploi.</p>
        </a>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <MessageSquare className="h-6 w-6 text-brand-700" />
          <p className="mt-5 text-sm font-semibold text-zinc-950">Depuis votre espace client</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Retrouvez vos échanges liés à vos matériaux et à vos commandes dans votre messagerie.
          </p>
          <Link to="/messagerie" className="mt-5 inline-block">
            <Button variant="outline">Ouvrir la messagerie</Button>
          </Link>
        </div>
      </section>

      <p className="mt-8 text-sm text-[var(--muted-foreground)]">
        Pour suivre une commande, consultez aussi <Link to="/mon-compte?onglet=commandes" className="font-semibold text-brand-700 underline underline-offset-2">votre espace client</Link>.
      </p>
    </main>
  );
}
