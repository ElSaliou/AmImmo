import {
  Building2,
  CircleDollarSign,
  HandCoins,
  Home,
  WalletCards,
} from "lucide-react";

import {
  useMyOwnerDashboard,
  useMyOwnerProfile,
} from "@/hooks/use-owner-portal";

// ============================================================
// FORMAT MONEY
// ============================================================

function formatMoney(
  value:
    | number
    | null
    | undefined,
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(
    Number(value ?? 0),
  );
}

// ============================================================
// KPI CARD
// ============================================================

type KpiCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
};

const KpiCard = ({
  title,
  value,
  subtitle,
  icon,
}: KpiCardProps) => {
  return (
    <div className="min-w-0 rounded-xl border bg-background p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        {/* =================================================== */}
        {/* CONTENT                                             */}
        {/* =================================================== */}

        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {title}
          </p>

          <p className="mt-1.5 break-words text-xl font-bold leading-tight tracking-tight sm:mt-2 sm:text-2xl">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              {subtitle}
            </p>
          )}
        </div>

        {/* =================================================== */}
        {/* ICON                                                */}
        {/* =================================================== */}

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-10 sm:w-10">
          {icon}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PROFILE INFO ITEM
// ============================================================

type ProfileInfoItemProps = {
  label: string;
  value: React.ReactNode;
};

const ProfileInfoItem = ({
  label,
  value,
}: ProfileInfoItemProps) => {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground sm:text-sm">
        {label}
      </p>

      <div className="mt-1 break-words text-sm font-medium leading-relaxed text-foreground">
        {value}
      </div>
    </div>
  );
};

// ============================================================
// OWNER DASHBOARD
// ============================================================

const OwnerDashboardPage = () => {
  const {
    data: profile,
    isLoading:
      profileLoading,
    error:
      profileError,
  } = useMyOwnerProfile();

  const {
    data: dashboard,
    isLoading:
      dashboardLoading,
    error:
      dashboardError,
  } = useMyOwnerDashboard();

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    profileLoading ||
    dashboardLoading
  ) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    profileError ||
    dashboardError
  ) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 sm:p-6">
        <h1 className="text-sm font-semibold text-destructive sm:text-base">
          Impossible de charger votre espace propriétaire
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Vérifie la liaison entre votre compte utilisateur
          et votre fiche propriétaire.
        </p>

        {profileError instanceof Error && (
          <p className="mt-3 break-words text-xs text-destructive">
            Profil : {profileError.message}
          </p>
        )}

        {dashboardError instanceof Error && (
          <p className="mt-1 break-words text-xs text-destructive">
            Tableau de bord : {dashboardError.message}
          </p>
        )}
      </div>
    );
  }

  // ==========================================================
  // OWNER NOT FOUND
  // ==========================================================

  if (
    !profile ||
    !dashboard
  ) {
    return (
      <div className="rounded-xl border bg-background p-4 sm:p-6">
        <h1 className="font-semibold">
          Compte propriétaire introuvable
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Aucun propriétaire n'est associé à ce compte.
        </p>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* ====================================================== */}
      {/* HEADER                                                 */}
      {/* ====================================================== */}

      <section className="min-w-0">
        <p className="text-xs font-medium text-primary sm:text-sm">
          Espace propriétaire
        </p>

        <h1 className="mt-1 break-words text-xl font-bold leading-tight tracking-tight sm:text-3xl">
          Bonjour {profile.full_name ?? ""}
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Retrouvez ici un aperçu de votre patrimoine
          immobilier et de votre situation financière.
        </p>
      </section>

      {/* ====================================================== */}
      {/* PROPERTIES KPI                                         */}
      {/* ====================================================== */}

      <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <KpiCard
          title="Biens"
          value={String(
            dashboard.properties_count ?? 0,
          )}
          subtitle="Patrimoine enregistré"
          icon={
            <Building2 className="h-5 w-5" />
          }
        />

        <KpiCard
          title="Biens loués"
          value={String(
            dashboard.rented_properties_count ?? 0,
          )}
          subtitle="Actuellement en location"
          icon={
            <Home className="h-5 w-5" />
          }
        />

        <KpiCard
          title="Biens disponibles"
          value={String(
            dashboard.available_properties_count ?? 0,
          )}
          subtitle="Disponibles à la location"
          icon={
            <Building2 className="h-5 w-5" />
          }
        />
      </section>

      {/* ====================================================== */}
      {/* FINANCE KPI                                            */}
      {/* ====================================================== */}

      <section className="min-w-0">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-base font-semibold sm:text-lg">
            Situation financière
          </h2>

          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Synthèse des encaissements et reversements.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            title="Loyers encaissés"
            value={`${formatMoney(
              dashboard.gross_collected,
            )} GNF`}
            icon={
              <CircleDollarSign className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Commissions"
            value={`${formatMoney(
              dashboard.commissions,
            )} GNF`}
            icon={
              <WalletCards className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Montant net propriétaire"
            value={`${formatMoney(
              dashboard.net_owner_amount,
            )} GNF`}
            icon={
              <HandCoins className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Solde à reverser"
            value={`${formatMoney(
              dashboard.outstanding_balance,
            )} GNF`}
            subtitle={`Déjà reversé : ${formatMoney(
              dashboard.settlements_amount,
            )} GNF`}
            icon={
              <CircleDollarSign className="h-5 w-5" />
            }
          />
        </div>
      </section>

      {/* ====================================================== */}
      {/* PROFILE                                                */}
      {/* ====================================================== */}

      <section className="min-w-0 rounded-xl border bg-background p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold">
            Mes informations
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Informations principales de votre profil propriétaire.
          </p>
        </div>

        <div className="mt-4 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileInfoItem
            label="Nom"
            value={
              profile.full_name ||
              "—"
            }
          />

          <ProfileInfoItem
            label="Email"
            value={
              profile.email ? (
                <span className="break-all">
                  {profile.email}
                </span>
              ) : (
                "—"
              )
            }
          />

          <ProfileInfoItem
            label="Téléphone"
            value={
              profile.phone ||
              "—"
            }
          />

          <ProfileInfoItem
            label="Adresse"
            value={
              profile.address ||
              "—"
            }
          />

          <ProfileInfoItem
            label="Ville"
            value={
              profile.city ||
              "—"
            }
          />

          <ProfileInfoItem
            label="Commission de gestion"
            value={
              profile.management_commission_rate !=
              null
                ? `${profile.management_commission_rate}%`
                : "Selon mandat"
            }
          />
        </div>
      </section>
    </div>
  );
};

export default OwnerDashboardPage;