import {
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  Clock3,
  Inbox,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import {
  toast,
} from "sonner";

import {
  Button,
} from "@/components/ui/button";

import {
  cn,
} from "@/lib/utils";

import {
  type TenantPortalNotification,
  useMarkAllTenantNotificationsRead,
  useMarkTenantNotificationRead,
  useTenantPortalNotifications,
  useTenantPortalUnreadNotificationsCount,
} from "@/hooks/use-tenant-portal";

// ============================================================
// HELPERS
// ============================================================

const formatNotificationDate = (
  value:
    | string
    | null,
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

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
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  ).format(
    date,
  );
};

const getNotificationKindLabel = (
  kind: string,
) => {
  switch (
    kind
  ) {
    case "invoice_issued":
      return "Loyer";

    case "invoice_due":
    case "invoice_overdue":
      return "Échéance";

    case "payment_recorded":
    case "payment_received":
      return "Paiement";

    case "document_available":
      return "Document";

    case "maintenance_created":
    case "maintenance_in_progress":
    case "maintenance_resolved":
    case "maintenance_closed":
      return "Maintenance";

    case "lease":
    case "lease_updated":
      return "Bail";

    default:
      return "Information";
  }
};

// ============================================================
// SAFE NAVIGATION
// ============================================================

const resolveNotificationLink = (
  link: string,
):
  | {
      type:
        "internal";

      value:
        string;
    }
  | {
      type:
        "external";

      value:
        string;
    }
  | null => {
  try {
    const url =
      new URL(
        link,
        window.location.origin,
      );

    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      return null;
    }

    if (
      url.origin ===
      window.location.origin
    ) {
      return {
        type:
          "internal",

        value:
          `${url.pathname}${url.search}${url.hash}`,
      };
    }

    return {
      type:
        "external",

      value:
        url.toString(),
    };
  } catch {
    return null;
  }
};

// ============================================================
// NOTIFICATION CARD
// ============================================================

const NotificationCard = ({
  notification,
  isOpening,
  onOpen,
}: {
  notification:
    TenantPortalNotification;

  isOpening:
    boolean;

  onOpen:
    (
      notification:
        TenantPortalNotification,
    ) => void;
}) => {
  const unread =
    !notification.isRead;

  return (
    <motion.button
      type="button"
      initial={{
        opacity: 0,
        y: 14,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -2,
      }}
      onClick={() =>
        onOpen(
          notification,
        )
      }
      disabled={
        isOpening
      }
      className={cn(
        "group w-full overflow-hidden rounded-3xl border text-left shadow-sm transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",

        unread
          ? "border-primary/20 bg-card shadow-primary/5 hover:border-primary/30 hover:shadow-lg"
          : "bg-card hover:border-primary/20 hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "h-1 w-full",

          unread
            ? "bg-gradient-to-r from-primary via-secondary to-primary"
            : "bg-muted",
        )}
      />

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* ICON */}

          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",

              unread
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {unread ? (
              <Bell className="h-6 w-6" />
            ) : (
              <Check className="h-6 w-6" />
            )}
          </div>

          {/* CONTENT */}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",

                  unread
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {unread
                  ? "Nouveau"
                  : "Lu"}
              </span>

              <span className="inline-flex rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                {getNotificationKindLabel(
                  notification.kind,
                )}
              </span>
            </div>

            <h2
              className={cn(
                "mt-4 font-display text-lg leading-6 text-foreground sm:text-xl",

                unread
                  ? "font-bold"
                  : "font-semibold",
              )}
            >
              {notification.title}
            </h2>

            {notification.body && (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {notification.body}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-4 w-4 shrink-0" />

                {formatNotificationDate(
                  notification.createdAt,
                )}
              </div>

              {notification.link && (
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                  Consulter
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              )}
            </div>
          </div>

          {/* PENDING */}

          {isOpening && (
            <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-primary" />
          )}
        </div>
      </div>
    </motion.button>
  );
};

// ============================================================
// PAGE
// ============================================================

const TenantNotificationsPage =
  () => {
    const navigate =
      useNavigate();

    const {
      data:
        notifications = [],

      isLoading,

      isError,

      error,

      refetch,
    } =
      useTenantPortalNotifications();

    const {
      data:
        unreadCount = 0,

      isLoading:
        isUnreadCountLoading,
    } =
      useTenantPortalUnreadNotificationsCount();

    const markOne =
      useMarkTenantNotificationRead();

    const markAll =
      useMarkAllTenantNotificationsRead();

    const [
      openingNotificationId,
      setOpeningNotificationId,
    ] =
      useState<
        string | null
      >(null);

    const readCount =
      notifications.filter(
        (
          notification,
        ) =>
          notification.isRead,
      ).length;

    // ========================================================
    // NAVIGATE TO NOTIFICATION TARGET
    // ========================================================

    const navigateToNotificationLink =
      (
        link: string,
      ) => {
        const resolved =
          resolveNotificationLink(
            link,
          );

        if (!resolved) {
          toast.error(
            "Le lien associé à cette notification est invalide.",
          );

          return;
        }

        if (
          resolved.type ===
          "internal"
        ) {
          navigate(
            resolved.value,
          );

          return;
        }

        const popup =
          window.open(
            resolved.value,
            "_blank",
            "noopener,noreferrer",
          );

        if (!popup) {
          toast.error(
            "Impossible d'ouvrir le lien. Vérifiez les paramètres de votre navigateur.",
          );
        }
      };

    // ========================================================
    // OPEN ONE NOTIFICATION
    // ========================================================

    const handleOpenNotification =
      async (
        notification:
          TenantPortalNotification,
      ) => {
        if (
          openingNotificationId
        ) {
          return;
        }

        setOpeningNotificationId(
          notification.id,
        );

        try {
          if (
            !notification.isRead
          ) {
            await markOne.mutateAsync(
              notification.id,
            );
          }

          if (
            notification.link
          ) {
            navigateToNotificationLink(
              notification.link,
            );
          }
        } catch (
          openError:
            unknown
        ) {
          toast.error(
            openError instanceof
              Error
              ? openError.message
              : "Impossible de traiter cette notification.",
          );
        } finally {
          setOpeningNotificationId(
            null,
          );
        }
      };

    // ========================================================
    // MARK ALL AS READ
    // ========================================================

    const handleMarkAllAsRead =
      async () => {
        if (
          unreadCount <=
          0
        ) {
          return;
        }

        try {
          const updatedCount =
            await markAll.mutateAsync();

          if (
            updatedCount >
            0
          ) {
            toast.success(
              updatedCount ===
                1
                ? "1 notification marquée comme lue."
                : `${updatedCount} notifications marquées comme lues.`,
            );
          }
        } catch (
          markError:
            unknown
        ) {
          toast.error(
            markError instanceof
              Error
              ? markError.message
              : "Impossible de marquer les notifications comme lues.",
          );
        }
      };

    // ========================================================
    // LOADING
    // ========================================================

    if (
      isLoading
    ) {
      return (
        <div className="container flex min-h-[520px] items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />

            <p className="mt-4 text-sm text-muted-foreground">
              Chargement de vos notifications...
            </p>
          </div>
        </div>
      );
    }

    // ========================================================
    // ERROR
    // ========================================================

    if (
      isError
    ) {
      return (
        <div className="container py-12">
          <div className="rounded-3xl border border-destructive/20 bg-card p-8 shadow-sm">
            <h1 className="text-xl font-semibold text-destructive">
              Impossible de charger vos notifications
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof
              Error
                ? error.message
                : "Une erreur est survenue."}
            </p>

            <Button
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

    // ========================================================
    // UI
    // ========================================================

    return (
      <div className="container space-y-8 py-8 sm:py-10">
        {/* ================================================== */}
        {/* BACK                                                */}
        {/* ================================================== */}

        <Button
          asChild
          variant="ghost"
          className="-ml-3"
        >
          <Link to="/tenant">
            <ArrowLeft className="h-4 w-4" />

            Tableau de bord
          </Link>
        </Button>

        {/* ================================================== */}
        {/* HERO                                                */}
        {/* ================================================== */}

        <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

          <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-primary-foreground/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm ring-1 ring-primary-foreground/15">
                <Bell className="h-4 w-4 text-secondary" />

                Centre de notifications
              </div>

              <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
                Mes notifications
              </h1>

              <p className="mt-3 max-w-2xl text-primary-foreground/75">
                Retrouvez les informations importantes concernant
                votre bail, vos loyers, vos paiements, vos documents
                et vos demandes de maintenance.
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="rounded-xl shadow-lg"
              disabled={
                unreadCount <=
                  0 ||
                markAll.isPending
              }
              onClick={() => {
                void handleMarkAllAsRead();
              }}
            >
              {markAll.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />

                  Mise à jour...
                </>
              ) : (
                <>
                  <CheckCheck className="h-5 w-5" />

                  Tout marquer comme lu
                </>
              )}
            </Button>
          </div>
        </section>

        {/* ================================================== */}
        {/* SUMMARY                                             */}
        {/* ================================================== */}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bell className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Notifications affichées
                </p>

                <p className="mt-1 text-3xl font-bold text-foreground">
                  {notifications.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Inbox className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Non lues
                </p>

                <p className="mt-1 text-3xl font-bold text-amber-700">
                  {isUnreadCountLoading
                    ? "—"
                    : unreadCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCheck className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Lues
                </p>

                <p className="mt-1 text-3xl font-bold text-emerald-700">
                  {readCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* NOTIFICATIONS                                       */}
        {/* ================================================== */}

        {notifications.length ===
        0 ? (
          <section className="rounded-3xl border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>

            <h2 className="mt-5 font-display text-xl font-bold text-foreground">
              Aucune notification
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Les nouvelles informations concernant votre espace
              locataire apparaîtront ici.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Activité récente
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Les notifications les plus récentes apparaissent
                  en premier.
                </p>
              </div>

              {unreadCount >
                0 && (
                <span className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  {unreadCount ===
                  1
                    ? "1 non lue"
                    : `${unreadCount} non lues`}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {notifications.map(
                (
                  notification,
                ) => (
                  <NotificationCard
                    key={
                      notification.id
                    }
                    notification={
                      notification
                    }
                    isOpening={
                      openingNotificationId ===
                      notification.id
                    }
                    onOpen={
                      handleOpenNotification
                    }
                  />
                ),
              )}
            </div>
          </section>
        )}

        {/* ================================================== */}
        {/* SECURITY INFO                                       */}
        {/* ================================================== */}

        <section className="flex items-start gap-3 rounded-3xl border bg-muted/30 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <div>
            <p className="text-sm font-semibold text-foreground">
              Espace personnel sécurisé
            </p>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Seules les notifications associées à votre compte
              locataire sont visibles dans cet espace.
            </p>
          </div>
        </section>
      </div>
    );
  };

export default TenantNotificationsPage;