import {
  ArrowRight,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";


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
          Votre compte est authentifié et associé à votre
          profil voyageur AmImmo.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/guest/inspections"
          className="group rounded-2xl border bg-background p-6 shadow-sm transition hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileCheck2 className="h-5 w-5" />
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            États des lieux
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Consultez vos états des lieux de séjour,
            signez les documents en attente et accédez
            aux PDF finaux.
          </p>

          <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
            Voir mes états des lieux

            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <article className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            Accès sécurisé
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Votre accès repose sur votre compte authentifié
            et sur le profil voyageur auquel il est
            explicitement rattaché.
          </p>
        </article>
      </section>
    </div>
  );
};


export default GuestHomePage;