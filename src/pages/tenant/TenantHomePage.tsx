import type {
  ReactNode,
} from "react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  FileText,
  FolderOpen,
  Home,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  Wrench,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import {
  useTenantPortalDashboard,
} from "@/hooks/use-tenant-portal";

import {
  Button,
} from "@/components/ui/button";

import heroImg from "@/assets/hero-property.jpg";

// ============================================================
// ANIMATION
// ============================================================

const fadeUp = {
  initial: {
    opacity: 0,
    y: 24,
  },

  whileInView: {
    opacity: 1,
    y: 0,
  },

  viewport: {
    once: true,
    margin: "-30px",
  },

  transition: {
    duration: 0.5,
  },
};

// ============================================================
// HELPERS
// ============================================================

const formatMoney = (
  amount: number,
  currency: string,
) => {
  return (
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 0,
      },
    ).format(amount) +
    ` ${currency}`
  );
};

const formatDate = (
  value: string | null,
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(date);
};

const translatePropertyStatus = (
  status: string | null,
) => {
  switch (status) {
    case "rented":
      return "Loué";

    case "available":
      return "Disponible";

    case "maintenance":
      return "Maintenance";

    case "unavailable":
      return "Indisponible";

    default:
      return status ?? "—";
  }
};

const translateLeaseStatus = (
  status: string | null,
) => {
  switch (status) {
    case "active":
      return "Actif";

    case "pending":
      return "En attente";

    case "terminated":
      return "Résilié";

    case "expired":
      return "Expiré";

    default:
      return status ?? "—";
  }
};

// ============================================================
// STATUS BADGE
// ============================================================

type BadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "primary"
  | "neutral";

const badgeToneClasses:
  Record<
    BadgeTone,
    string
  > = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    warning:
      "border-amber-200 bg-amber-50 text-amber-700",

    danger:
      "border-red-200 bg-red-50 text-red-700",

    primary:
      "border-primary/20 bg-primary/10 text-primary",

    neutral:
      "border-border bg-muted text-muted-foreground",
  };

type StatusBadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
};

const StatusBadge = ({
  children,
  tone = "neutral",
}: StatusBadgeProps) => {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${badgeToneClasses[tone]}`}
    >
      {children}
    </span>
  );
};

// ============================================================
// KPI CARD
// ============================================================

type KpiTone =
  | "primary"
  | "gold"
  | "emerald"
  | "violet";

const kpiToneClasses:
  Record<
    KpiTone,
    {
      card: string;
      icon: string;
    }
  > = {
    primary: {
      card:
        "from-primary via-primary/95 to-primary/75 shadow-primary/20",

      icon:
        "bg-white/15 text-white ring-white/20",
    },

    gold: {
      card:
        "from-amber-400 via-amber-500 to-orange-500 shadow-amber-500/20",

      icon:
        "bg-white/20 text-white ring-white/25",
    },

    emerald: {
      card:
        "from-emerald-500 via-emerald-600 to-emerald-700 shadow-emerald-500/20",

      icon:
        "bg-white/15 text-white ring-white/20",
    },

    violet: {
      card:
        "from-violet-500 via-purple-600 to-indigo-700 shadow-violet-500/20",

      icon:
        "bg-white/15 text-white ring-white/20",
    },
  };

type PremiumKpiProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: KpiTone;
};

const PremiumKpi = ({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: PremiumKpiProps) => {
  const styles =
    kpiToneClasses[tone];

  return (
    <motion.div
      {...fadeUp}
      className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-xl transition-transform duration-300 hover:-translate-y-1 ${styles.card}`}
    >
      {/* decorative glow */}

      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

      <div className="pointer-events-none absolute -bottom-16 left-0 h-32 w-32 rounded-full bg-black/5 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-white/80">
            {label}
          </p>

          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${styles.icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <p className="mt-5 break-words text-2xl font-bold tracking-tight sm:text-3xl">
          {value}
        </p>

        <p className="mt-2 text-xs leading-5 text-white/75">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

// ============================================================
// INFO ROW
// ============================================================

type InfoRowProps = {
  label: string;
  value: string;
};

const InfoRow = ({
  label,
  value,
}: InfoRowProps) => {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="text-sm font-semibold text-foreground sm:text-right">
        {value}
      </span>
    </div>
  );
};

// ============================================================
// PREMIUM SECTION
// ============================================================

type PremiumSectionProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent:
    | "primary"
    | "emerald"
    | "gold"
    | "violet";
  children: ReactNode;
};

const sectionAccentClasses = {
  primary:
    "from-primary to-primary/80",

  emerald:
    "from-emerald-500 to-emerald-600",

  gold:
    "from-amber-400 to-orange-500",

  violet:
    "from-violet-500 to-indigo-600",
};

const PremiumSection = ({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: PremiumSectionProps) => {
  return (
    <motion.div
      {...fadeUp}
      className="group overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-sm)] transition-all duration-300 hover:shadow-[var(--shadow-lg)]"
    >
      <div className="relative border-b bg-gradient-to-r from-muted/40 via-background to-background p-5 sm:p-6">
        <div
          className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${sectionAccentClasses[accent]}`}
        />

        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${sectionAccentClasses[accent]}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {title}
            </h2>

            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </motion.div>
  );
};

// ============================================================
// TENANT HOME
// ============================================================

const TenantHomePage = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } =
    useTenantPortalDashboard();

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {
    return (
      <div className="container flex min-h-[520px] items-center justify-center py-12">
        <div className="rounded-3xl border bg-card px-10 py-12 text-center shadow-lg">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="mt-5 font-semibold">
            Chargement de votre espace
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Nous récupérons les informations de votre location.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    isError ||
    !data
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de charger votre espace locataire.";

    return (
      <div className="container py-12">
        <div className="rounded-3xl border border-destructive/20 bg-card p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-destructive">
            Impossible de charger le tableau de bord
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {message}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-5 rounded-xl"
            onClick={() => {
              void refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />

            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // DATA
  // ==========================================================

  const {
    tenant,
    activeLease,
    invoices,
    payments,
    maintenanceCount,
    documentsCount,
  } = data;

  const property =
    activeLease?.property ??
    null;

  const currency =
    invoices.currency ||
    property?.currency ||
    "GNF";

  const tenantName =
    tenant?.fullName?.trim() ||
    "Locataire";

  const firstName =
    tenantName.split(/\s+/)[0] ||
    tenantName;

  // ==========================================================
  // FINANCIAL STATUS
  // ==========================================================

  const paymentProgress =
    invoices.totalAmount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (
                invoices.paidAmount /
                invoices.totalAmount
              ) * 100,
            ),
          ),
        )
      : 0;

  const financialStatus:
    {
      label: string;
      tone: BadgeTone;
    } =
    invoices.overdue > 0
      ? {
          label:
            `${invoices.overdue} facture${invoices.overdue > 1 ? "s" : ""} en retard`,
          tone:
            "danger",
        }
      : invoices.balanceDue > 0
        ? {
            label:
              "Solde en cours",
            tone:
              "warning",
          }
        : {
            label:
              "À jour",
            tone:
              "success",
          };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div>
      {/* ==================================================== */}
      {/* HERO                                                 */}
      {/* ==================================================== */}

      <section className="relative min-h-[420px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt=""
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(220,25%,7%,0.92)] via-[hsl(220,25%,8%,0.72)] to-[hsl(220,25%,10%,0.45)]" />

          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,25%,8%,0.55)] via-transparent to-transparent" />
        </div>

        <div className="container relative z-10 flex min-h-[420px] items-center py-14">
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
            className="max-w-3xl"
          >
            {/* =============================================== */}
            {/* PREMIUM BADGE                                   */}
            {/* =============================================== */}

            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-secondary/20 px-4 py-2 text-sm font-medium text-secondary backdrop-blur-md ring-1 ring-secondary/20">
              <Sparkles className="h-4 w-4" />

              Votre espace locataire
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Bonjour{" "}
              <span className="text-secondary">
                {firstName}
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              Votre location en un coup d'œil.
              Consultez votre logement, votre bail,
              vos loyers et le suivi de vos paiements.
            </p>

            {/* =============================================== */}
            {/* STATUS PILLS                                    */}
            {/* =============================================== */}

            <div className="mt-8 flex flex-wrap gap-3">
              {activeLease && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md">
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />

                  Bail actif
                </div>
              )}

              {property && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md">
                  <Home className="h-4 w-4 text-secondary" />

                  {property.title}
                </div>
              )}

              {activeLease?.dueDay && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md">
                  <CalendarClock className="h-4 w-4 text-secondary" />

                  Échéance le {activeLease.dueDay}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* CONTENT                                              */}
      {/* ==================================================== */}

      <div className="container relative z-20 -mt-10 space-y-8 pb-14">
        {/* ================================================== */}
        {/* KPI                                                */}
        {/* ================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PremiumKpi
            label="Solde à payer"
            value={
              formatMoney(
                invoices.balanceDue,
                currency,
              )
            }
            description={
              invoices.open > 0
                ? `${invoices.open} facture${invoices.open > 1 ? "s" : ""} ouverte${invoices.open > 1 ? "s" : ""}`
                : "Aucune facture ouverte"
            }
            icon={CircleDollarSign}
            tone={
              invoices.balanceDue > 0
                ? "gold"
                : "emerald"
            }
          />

          <PremiumKpi
            label="Mes factures"
            value={
              String(
                invoices.total,
              )
            }
            description={`${invoices.paid} payée${invoices.paid > 1 ? "s" : ""} · ${invoices.partiallyPaid} partiellement payée${invoices.partiallyPaid > 1 ? "s" : ""}`}
            icon={FileText}
            tone="primary"
          />

          <PremiumKpi
            label="Mes paiements"
            value={
              String(
                payments.completed,
              )
            }
            description={`${formatMoney(
              payments.totalCompletedAmount,
              currency,
            )} réglés`}
            icon={WalletCards}
            tone="emerald"
          />

          <PremiumKpi
            label="Mes demandes"
            value={
              String(
                maintenanceCount,
              )
            }
            description="Demandes de maintenance"
            icon={Wrench}
            tone="violet"
          />
        </section>

        {/* ================================================== */}
        {/* STATUS STRIP                                       */}
        {/* ================================================== */}

        <motion.section
          {...fadeUp}
          className="flex flex-col justify-between gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <div className="gradient-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>

            <div>
              <p className="font-display text-lg font-bold">
                Situation de votre location
              </p>

              <p className="text-sm text-muted-foreground">
                Informations actualisées selon votre dossier locatif
              </p>
            </div>
          </div>

          <StatusBadge
            tone={
              financialStatus.tone
            }
          >
            <BadgeCheck className="h-3.5 w-3.5" />

            {financialStatus.label}
          </StatusBadge>
        </motion.section>

        {/* ================================================== */}
        {/* PROPERTY + PROFILE                                 */}
        {/* ================================================== */}

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <PremiumSection
              title="Mon logement"
              subtitle="Bien associé à votre bail actif"
              icon={Home}
              accent="primary"
            >
              {property ? (
                <>
                  <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-muted/50 to-secondary/10 p-5 sm:p-6">
                    <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />

                    <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Votre logement
                        </p>

                        <h3 className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
                          {property.title ??
                            "Logement"}
                        </h3>

                        <p className="mt-2 text-sm font-medium text-muted-foreground">
                          {property.reference ??
                            "Référence non renseignée"}
                        </p>
                      </div>

                      <StatusBadge
                        tone="primary"
                      >
                        <Home className="h-3.5 w-3.5" />

                        {translatePropertyStatus(
                          property.status,
                        )}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="grid gap-x-10 md:grid-cols-2">
                    <InfoRow
                      label="Loyer mensuel"
                      value={
                        formatMoney(
                          activeLease?.monthlyRent ??
                            0,
                          currency,
                        )
                      }
                    />

                    <InfoRow
                      label="Charges"
                      value={
                        formatMoney(
                          activeLease?.charges ??
                            0,
                          currency,
                        )
                      }
                    />

                    <InfoRow
                      label="Jour d'échéance"
                      value={
                        activeLease?.dueDay
                          ? `Le ${activeLease.dueDay} du mois`
                          : "—"
                      }
                    />

                    <InfoRow
                      label="Dépôt de garantie"
                      value={
                        formatMoney(
                          activeLease?.deposit ??
                            0,
                          currency,
                        )
                      }
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun logement associé à un bail actif.
                </p>
              )}
            </PremiumSection>
          </div>

          <PremiumSection
            title="Mon profil"
            subtitle="Informations du locataire"
            icon={UserRound}
            accent="emerald"
          >
            <div className="mb-5 flex items-center gap-4 rounded-2xl bg-emerald-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">
                {firstName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {tenant?.fullName ??
                    "Locataire"}
                </p>

                <p className="truncate text-sm text-muted-foreground">
                  Locataire ImmoPlate
                </p>
              </div>
            </div>

            <InfoRow
              label="Nom"
              value={
                tenant?.fullName ??
                "—"
              }
            />

            <InfoRow
              label="Email"
              value={
                tenant?.email ??
                "—"
              }
            />

            <InfoRow
              label="Téléphone"
              value={
                tenant?.phone ??
                "—"
              }
            />
          </PremiumSection>
        </section>

        {/* ================================================== */}
        {/* LEASE + FINANCE                                    */}
        {/* ================================================== */}

        <section className="grid gap-6 lg:grid-cols-2">
          <PremiumSection
            title="Mon bail"
            subtitle="Informations contractuelles"
            icon={Building2}
            accent="violet"
          >
            {activeLease ? (
              <>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <StatusBadge
                    tone={
                      activeLease.status ===
                      "active"
                        ? "success"
                        : "neutral"
                    }
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />

                    {translateLeaseStatus(
                      activeLease.status,
                    )}
                  </StatusBadge>

                  <span className="text-xs text-muted-foreground">
                    {activeLease.reference ??
                      "—"}
                  </span>
                </div>

                <InfoRow
                  label="Référence"
                  value={
                    activeLease.reference ??
                    "—"
                  }
                />

                <InfoRow
                  label="Date de début"
                  value={
                    formatDate(
                      activeLease.startDate,
                    )
                  }
                />

                <InfoRow
                  label="Date de fin"
                  value={
                    formatDate(
                      activeLease.endDate,
                    )
                  }
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun bail actif trouvé.
              </p>
            )}
          </PremiumSection>

          <PremiumSection
            title="Situation locative"
            subtitle="Progression de vos règlements"
            icon={ReceiptText}
            accent="gold"
          >
            <div className="mb-6 rounded-2xl bg-muted/50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Paiements effectués
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {paymentProgress}%
                  </p>
                </div>

                <StatusBadge
                  tone={
                    financialStatus.tone
                  }
                >
                  {financialStatus.label}
                </StatusBadge>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-secondary transition-all duration-700"
                  style={{
                    width:
                      `${paymentProgress}%`,
                  }}
                />
              </div>
            </div>

            <InfoRow
              label="Montant facturé"
              value={
                formatMoney(
                  invoices.totalAmount,
                  currency,
                )
              }
            />

            <InfoRow
              label="Montant réglé"
              value={
                formatMoney(
                  invoices.paidAmount,
                  currency,
                )
              }
            />

            <InfoRow
              label="Reste à payer"
              value={
                formatMoney(
                  invoices.balanceDue,
                  currency,
                )
              }
            />

            <InfoRow
              label="Factures en retard"
              value={
                String(
                  invoices.overdue,
                )
              }
            />
          </PremiumSection>
        </section>

        {/* ================================================== */}
        {/* BOTTOM CARDS                                       */}
        {/* ================================================== */}

        <section className="grid gap-5 sm:grid-cols-2">
          <motion.div
            {...fadeUp}
            className="group relative overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-50 via-card to-violet-100/50 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-200/50 blur-3xl" />

            <div className="relative flex items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
                  <FolderOpen className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-display text-lg font-bold">
                    Mes documents
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {documentsCount} document
                    {documentsCount !== 1
                      ? "s"
                      : ""}{" "}
                    disponible
                    {documentsCount !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-violet-500/60 transition-transform group-hover:translate-x-1" />
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{
              duration: 0.5,
              delay: 0.08,
            }}
            className="group relative overflow-hidden rounded-3xl border bg-gradient-to-br from-amber-50 via-card to-orange-100/50 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-200/50 blur-3xl" />

            <div className="relative flex items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-display text-lg font-bold">
                    Prochaine échéance
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeLease?.dueDay
                      ? `Loyer à régler le ${activeLease.dueDay} de chaque mois`
                      : "Échéance non renseignée"}
                  </p>
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-amber-500/70 transition-transform group-hover:translate-x-1" />
            </div>
          </motion.div>
        </section>

        {/* ================================================== */}
        {/* TRUST FOOTER                                       */}
        {/* ================================================== */}

        <motion.section
          {...fadeUp}
          className="relative overflow-hidden rounded-3xl gradient-primary px-6 py-8 text-primary-foreground shadow-xl sm:px-8"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                <ShieldCheck className="h-6 w-6 text-secondary" />
              </div>

              <div>
                <h2 className="font-display text-xl font-bold">
                  Votre espace sécurisé ImmoPlate
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-primary-foreground/70">
                  Vos informations locatives sont accessibles
                  uniquement depuis votre compte personnel.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm font-medium ring-1 ring-primary-foreground/15">
              <BadgeCheck className="h-4 w-4 text-secondary" />

              Accès vérifié
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default TenantHomePage;