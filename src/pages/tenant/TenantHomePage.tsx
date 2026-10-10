import {
  Building2,
  ShieldCheck,
} from "lucide-react";

// ============================================================
// TENANT HOME
// ============================================================

const TenantHomePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Espace locataire
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Tableau de bord
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Votre espace locataire sécurisé est opérationnel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>

          <h2 className="mt-4 font-semibold">
            Portail locataire
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Les informations de votre bail, de votre logement,
            de vos loyers et de vos paiements seront ajoutées
            dans la prochaine étape.
          </p>
        </div>

        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <h2 className="mt-4 font-semibold">
            Accès sécurisé
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Cet espace est accessible uniquement au locataire
            associé au compte connecté.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TenantHomePage;