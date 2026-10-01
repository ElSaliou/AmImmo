import type {
  ReactNode,
} from "react";

import {
  Building2,
  CreditCard,
  Landmark,
  Mail,
  MapPin,
  Percent,
  Phone,
  Smartphone,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import PageShell from "@/components/PageShell";

import {
  useMyOwnerProfile,
} from "@/hooks/use-owner-portal";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

// ============================================================
// HELPERS
// ============================================================

function displayValue(
  value:
    | string
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Non renseigné";
  }

  return String(
    value,
  );
}

function getOwnerKindLabel(
  kind:
    | string
    | null
    | undefined,
) {
  switch (kind) {
    case "individual":
      return "Particulier";

    case "company":
      return "Entreprise";

    case "legal_entity":
      return "Personne morale";

    default:
      return kind
        ? kind
        : "Non renseigné";
  }
}

function getMobileMoneyProviderLabel(
  provider:
    | string
    | null
    | undefined,
) {
  switch (provider) {
    case "orange_money":
      return "Orange Money";

    case "mtn_momo":
    case "mtn_mobile_money":
      return "MTN Mobile Money";

    case "wave":
      return "Wave";

    case "moov_money":
      return "Moov Money";

    default:
      return provider
        ? provider
        : null;
  }
}

function getInitials(
  name:
    | string
    | null
    | undefined,
) {
  if (!name) {
    return "PR";
  }

  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "PR";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(
        0,
        2,
      )
      .toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`
    .toUpperCase();
}

// ============================================================
// INFO ROW
// ============================================================

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
  mono?: boolean;
};

const InfoRow = ({
  icon,
  label,
  value,
  mono = false,
}: InfoRowProps) => {
  const hasValue =
    value !== null &&
    value !== undefined &&
    value !== "";

  return (
    <div className="flex min-w-0 gap-3 py-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
          {label}
        </p>

        <p
          className={
            hasValue
              ? `mt-1 break-words text-sm font-medium leading-relaxed text-foreground ${
                  mono
                    ? "font-mono"
                    : ""
                }`
              : "mt-1 text-sm leading-relaxed text-muted-foreground"
          }
        >
          {displayValue(
            value,
          )}
        </p>
      </div>
    </div>
  );
};

// ============================================================
// SECTION CARD
// ============================================================

type SectionCardProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
};

const SectionCard = ({
  title,
  subtitle,
  icon,
  children,
}: SectionCardProps) => {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="premium-card min-w-0 overflow-hidden"
    >
      <div className="flex min-w-0 items-center gap-3 border-b bg-muted/20 px-4 py-4 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="break-words text-sm font-semibold">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-0.5 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 px-4 py-2 sm:px-5">
        {children}
      </div>
    </motion.section>
  );
};

// ============================================================
// PAGE
// ============================================================

const OwnerProfilePage =
  () => {
    const {
      data: profile,
      isLoading,
      isError,
      error,
      refetch,
    } =
      useMyOwnerProfile();

    // ========================================================
    // LOADING
    // ========================================================

    if (isLoading) {
      return (
        <div className="flex min-h-[20rem] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }

    // ========================================================
    // ERROR
    // ========================================================

    if (isError) {
      return (
        <div className="premium-card border-destructive/20 bg-destructive/5 p-5 sm:p-6">
          <h1 className="font-semibold text-destructive">
            Impossible de charger votre profil
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Une erreur est survenue pendant la récupération de vos informations.
          </p>

          {error instanceof
            Error && (
            <p className="mt-3 break-words text-xs text-destructive">
              {error.message}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="mt-5 w-full sm:w-auto"
            onClick={() =>
              void refetch()
            }
          >
            Réessayer
          </Button>
        </div>
      );
    }

    // ========================================================
    // EMPTY
    // ========================================================

    if (!profile) {
      return (
        <div className="premium-card p-8 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <UserRound className="h-5 w-5 text-muted-foreground" />
          </div>

          <h1 className="mt-4 font-semibold">
            Profil indisponible
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Aucun profil propriétaire n'est actuellement associé à votre compte.
          </p>
        </div>
      );
    }

    const fullAddress =
      [
        profile.address,
        profile.city,
      ]
        .filter(Boolean)
        .join(", ");

    const paymentMethods =
      [
        profile.bank_account
          ? "Compte bancaire"
          : null,

        profile.mobile_money_number
          ? getMobileMoneyProviderLabel(
              profile.mobile_money_provider,
            ) || "Mobile Money"
          : null,
      ].filter(
        Boolean,
      ) as string[];

    const paymentMethodsCount =
      paymentMethods.length;

    const mobileMoneyProvider =
      getMobileMoneyProviderLabel(
        profile.mobile_money_provider,
      );

    return (
      <PageShell
        title="Mon profil"
        subtitle="Consultez vos informations propriétaire et vos coordonnées de paiement"
        actions={
          <Badge
            variant="outline"
            className="bg-background"
          >
            Lecture seule
          </Badge>
        }
      >
        {/* =================================================== */}
        {/* PROFILE HEADER                                      */}
        {/* =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="premium-card mb-5 min-w-0 overflow-hidden sm:mb-6"
        >
          <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
              {/* AVATAR */}

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground sm:h-16 sm:w-16 sm:text-xl">
                {getInitials(
                  profile.full_name,
                )}
              </div>

              {/* OWNER */}

              <div className="min-w-0 flex-1">
                <h2 className="break-words text-lg font-bold leading-tight tracking-tight sm:text-xl">
                  {displayValue(
                    profile.full_name,
                  )}
                </h2>

                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="max-w-full"
                  >
                    {getOwnerKindLabel(
                      profile.kind,
                    )}
                  </Badge>

                  {profile.company && (
                    <Badge
                      variant="outline"
                      className="max-w-full break-words whitespace-normal text-left"
                    >
                      {
                        profile.company
                      }
                    </Badge>
                  )}
                </div>

                {fullAddress && (
                  <div className="mt-2 flex min-w-0 items-start gap-1.5 text-sm leading-relaxed text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                    <span className="min-w-0 break-words">
                      {fullAddress}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* RATE */}

            <div className="min-w-0 rounded-xl border bg-muted/20 px-4 py-4 sm:px-5 lg:min-w-[190px]">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                Taux propriétaire
              </p>

              <div className="mt-1 flex min-w-0 items-center gap-2">
                <Percent className="h-5 w-5 shrink-0 text-primary" />

                <p className="break-words text-xl font-bold tracking-tight sm:text-2xl">
                  {profile.management_commission_rate !==
                  null
                    ? `${profile.management_commission_rate}%`
                    : "—"}
                </p>
              </div>

              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                Taux de gestion par défaut
              </p>
            </div>
          </div>
        </motion.section>

        {/* =================================================== */}
        {/* CONTENT                                             */}
        {/* =================================================== */}

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
          {/* ================================================= */}
          {/* IDENTITY                                          */}
          {/* ================================================= */}

          <SectionCard
            title="Identité"
            subtitle="Informations du propriétaire"
            icon={
              <UserRound className="h-4 w-4" />
            }
          >
            <InfoRow
              icon={
                <UserRound className="h-4 w-4" />
              }
              label="Nom complet"
              value={
                profile.full_name
              }
            />

            <div className="border-t" />

            <InfoRow
              icon={
                <Building2 className="h-4 w-4" />
              }
              label="Type de propriétaire"
              value={
                getOwnerKindLabel(
                  profile.kind,
                )
              }
            />

            <div className="border-t" />

            <InfoRow
              icon={
                <Building2 className="h-4 w-4" />
              }
              label="Entreprise / Société"
              value={
                profile.company
              }
            />
          </SectionCard>

          {/* ================================================= */}
          {/* CONTACT                                           */}
          {/* ================================================= */}

          <SectionCard
            title="Contact"
            subtitle="Coordonnées de correspondance"
            icon={
              <Mail className="h-4 w-4" />
            }
          >
            <InfoRow
              icon={
                <Mail className="h-4 w-4" />
              }
              label="Email de contact"
              value={
                profile.email
              }
            />

            <div className="border-t" />

            <InfoRow
              icon={
                <Phone className="h-4 w-4" />
              }
              label="Téléphone"
              value={
                profile.phone
              }
            />

            <div className="border-t" />

            <InfoRow
              icon={
                <MapPin className="h-4 w-4" />
              }
              label="Adresse"
              value={
                profile.address
              }
            />

            <div className="border-t" />

            <InfoRow
              icon={
                <MapPin className="h-4 w-4" />
              }
              label="Ville"
              value={
                profile.city
              }
            />
          </SectionCard>

          {/* ================================================= */}
          {/* BANK                                              */}
          {/* ================================================= */}

          <SectionCard
            title="Coordonnées bancaires"
            subtitle="Informations utilisées pour les reversements bancaires"
            icon={
              <Landmark className="h-4 w-4" />
            }
          >
            <InfoRow
              icon={
                <Landmark className="h-4 w-4" />
              }
              label="Banque"
              value={
                profile.bank_name
              }
            />

            <div className="border-t" />

            <InfoRow
              icon={
                <CreditCard className="h-4 w-4" />
              }
              label="Compte bancaire"
              value={
                profile.bank_account
              }
              mono
            />
          </SectionCard>

          {/* ================================================= */}
          {/* MOBILE MONEY                                      */}
          {/* ================================================= */}

          <SectionCard
            title="Mobile Money"
            subtitle="Coordonnées utilisées pour les reversements mobiles"
            icon={
              <Smartphone className="h-4 w-4" />
            }
          >
            <InfoRow
              icon={
                <WalletCards className="h-4 w-4" />
              }
              label="Opérateur"
              value={
                mobileMoneyProvider
              }
            />

            <div className="border-t" />

            <InfoRow
              icon={
                <Smartphone className="h-4 w-4" />
              }
              label="Numéro Mobile Money"
              value={
                profile.mobile_money_number
              }
            />
          </SectionCard>
        </div>

        {/* =================================================== */}
        {/* MANAGEMENT                                          */}
        {/* =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.05,
          }}
          className="premium-card mt-5 min-w-0 overflow-hidden sm:mt-6"
        >
          <div className="border-b bg-muted/20 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Percent className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <h2 className="break-words text-sm font-semibold">
                  Paramètres de gestion
                </h2>

                <p className="mt-0.5 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                  Informations contractuelles applicables par défaut
                </p>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-3">
            {/* COMMISSION */}

            <div className="min-w-0 rounded-xl border bg-muted/10 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                Commission propriétaire
              </p>

              <p className="mt-2 break-words text-xl font-bold tracking-tight sm:text-2xl">
                {profile.management_commission_rate !==
                null
                  ? `${profile.management_commission_rate}%`
                  : "Non renseigné"}
              </p>

              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                Taux de gestion par défaut
              </p>
            </div>

            {/* PAYMENT METHODS */}

            <div className="min-w-0 rounded-xl border bg-muted/10 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                Moyens de reversement
              </p>

              <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                {
                  paymentMethodsCount
                }
              </p>

              {paymentMethodsCount >
              0 ? (
                <div className="mt-1 space-y-0.5">
                  {paymentMethods.map(
                    (
                      method,
                    ) => (
                      <p
                        key={
                          method
                        }
                        className="break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs"
                      >
                        {method}
                      </p>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                  Aucune coordonnée renseignée
                </p>
              )}
            </div>

            {/* ACCESS */}

            <div className="min-w-0 rounded-xl border bg-muted/10 p-4 sm:col-span-2 lg:col-span-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                Accès
              </p>

              <p className="mt-2 break-words text-sm font-semibold">
                Consultation uniquement
              </p>

              <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                Les informations du profil ne peuvent pas être modifiées depuis cet espace.
              </p>
            </div>
          </div>
        </motion.section>

        {/* =================================================== */}
        {/* INFORMATION                                         */}
        {/* =================================================== */}

        <div className="mt-5 min-w-0 rounded-xl border border-primary/15 bg-primary/5 px-4 py-4 sm:mt-6 sm:px-5">
          <p className="break-words text-sm font-medium text-foreground">
            Une information est incorrecte ou doit être mise à jour ?
          </p>

          <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">
            Contactez votre gestionnaire ImmoPlate afin de demander la modification de votre fiche propriétaire.
          </p>
        </div>
      </PageShell>
    );
  };

export default OwnerProfilePage;