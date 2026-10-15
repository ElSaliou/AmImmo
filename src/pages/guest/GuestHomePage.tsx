import {
  FileCheck2,
  ShieldCheck,
} from "lucide-react";

// ============================================================
// GUEST HOME PAGE
// ============================================================

const GuestHomePage = () => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
          Bienvenue dans votre espace voyageur
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Votre compte est authentifié et associé à
          votre profil voyageur AmImmo.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <FileCheck2 className="h-5 w-5" />
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            États des lieux
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Vos états des lieux de séjour, signatures
            et documents finaux seront accessibles
            depuis cet espace.
          </p>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Activation à l'étape suivante
          </p>
        </article>

        <article className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            Accès sécurisé
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Votre accès repose sur votre compte
            authentifié et sur le profil voyageur
            auquel il est explicitement rattaché.
          </p>
        </article>
      </section>
    </div>
  );
};

export default GuestHomePage;