import {
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Plus,
  Search,
  Users,
  XCircle,
} from "lucide-react";

import {
  format,
  parseISO,
} from "date-fns";

import { fr } from "date-fns/locale";

import {
  useNavigate,
} from "react-router-dom";

import { toast } from "sonner";

import PageShell from "@/components/PageShell";

import BookingFormDialog from "@/components/admin/short-rental/BookingFormDialog";

import {
  type Booking,
  type BookingStatus,
  useBookings,
  useConfirmBooking,
} from "@/hooks/use-bookings";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================
// TYPES
// ============================================================

type StatusFilter =
  | BookingStatus
  | "all";

const STATUS_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "Tous les statuts",
  },
  {
    value: "request",
    label: "Demandes",
  },
  {
    value: "option",
    label: "Options",
  },
  {
    value: "confirmed",
    label: "Confirmées",
  },
  {
    value: "in_progress",
    label: "En cours",
  },
  {
    value: "completed",
    label: "Terminées",
  },
  {
    value: "cancelled",
    label: "Annulées",
  },
];

// ============================================================
// FORMATTERS
// ============================================================

const formatMoney = (
  value:
    | number
    | null
    | undefined,
  currency = "GNF",
) => {
  const amount =
    Number(value ?? 0);

  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(amount)} ${currency}`;
};

const formatDate = (
  value:
    | string
    | null
    | undefined,
) => {
  if (!value) {
    return "—";
  }

  try {
    return format(
      parseISO(value),
      "dd MMM yyyy",
      {
        locale: fr,
      },
    );
  } catch {
    return value;
  }
};

const getNightCount = (
  checkIn: string,
  checkOut: string,
) => {
  try {
    const start =
      parseISO(checkIn);

    const end =
      parseISO(checkOut);

    const milliseconds =
      end.getTime() -
      start.getTime();

    return Math.max(
      0,
      Math.round(
        milliseconds /
          (
            1000 *
            60 *
            60 *
            24
          ),
      ),
    );
  } catch {
    return 0;
  }
};

// ============================================================
// HELPERS AFFICHAGE
// ============================================================

const getGuestName = (
  booking: Booking,
) =>
  booking.guest?.full_name ||
  booking.guest_name ||
  "Voyageur non renseigné";

const getGuestContact = (
  booking: Booking,
) =>
  booking.guest?.phone ||
  booking.guest?.email ||
  booking.guest_phone ||
  booking.guest_email ||
  "—";

const getPropertyName = (
  booking: Booking,
) =>
  booking.property?.title ||
  booking.property?.reference ||
  "Bien immobilier";

const getPropertyLocation = (
  booking: Booking,
) => {
  const parts = [
    booking.property?.district,
    booking.property?.commune,
    booking.property?.city,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : "—";
};

// ============================================================
// ERREURS RPC CONFIRMATION
// ============================================================

/**
 * Traduit les principaux messages métier
 * retournés par confirm_short_rental_booking().
 *
 * PostgreSQL reste la source de vérité.
 */
const getConfirmationErrorMessage = (
  error: unknown,
): string => {
  const rpcError =
    error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

  const rawMessage =
    rpcError?.message ||
    rpcError?.details ||
    rpcError?.hint ||
    "Impossible de confirmer la réservation.";

  if (
    rawMessage.includes(
      "Dates unavailable because of booking",
    )
  ) {
    return "Ces dates ne sont plus disponibles : une autre réservation les bloque.";
  }

  if (
    rawMessage.includes(
      "Dates unavailable because of property block",
    )
  ) {
    return "Ces dates sont bloquées dans le calendrier du logement.";
  }

  if (
    rawMessage.includes(
      "Guest count exceeds property capacity",
    )
  ) {
    return "Le nombre de voyageurs dépasse la capacité maximale du logement.";
  }

  if (
    rawMessage.includes(
      "Minimum stay is",
    )
  ) {
    return "La durée du séjour ne respecte pas le nombre minimum de nuits requis.";
  }

  if (
    rawMessage.includes(
      "Stay exceeds maximum stay",
    )
  ) {
    return "La durée du séjour dépasse la durée maximale autorisée.";
  }

  if (
    rawMessage.includes(
      "has expired",
    )
  ) {
    return "Cette option a expiré et ne peut plus être confirmée.";
  }

  if (
    rawMessage.includes(
      "cannot be confirmed from status",
    )
  ) {
    return "Cette réservation ne peut plus être confirmée depuis son statut actuel.";
  }

  if (
    rawMessage.includes(
      "Active short-rental settings not found",
    )
  ) {
    return "Les paramètres de location courte durée de ce logement sont absents ou inactifs.";
  }

  if (
    rawMessage.includes(
      "Property is not configured for short rental",
    )
  ) {
    return "Ce bien n'est pas configuré pour la location courte durée.";
  }

  if (
    rawMessage.includes(
      "Base nightly rate must be greater than zero",
    )
  ) {
    return "Le tarif de base par nuit du logement doit être supérieur à zéro.";
  }

  if (
    rawMessage.includes(
      "Invalid nightly rate",
    )
  ) {
    return "Un tarif journalier invalide empêche la confirmation de cette réservation.";
  }

  if (
    rawMessage.includes(
      "booking_nights snapshot is incomplete",
    )
  ) {
    return "Le calcul des nuits du séjour est incomplet. La réservation n'a pas été confirmée.";
  }

  if (
    rawMessage.includes(
      "Not authorized",
    ) ||
    rawMessage.includes(
      "Authentication required",
    )
  ) {
    return "Vous n'êtes pas autorisé à confirmer cette réservation.";
  }

  return rawMessage;
};

// ============================================================
// BADGE STATUT
// ============================================================

function BookingStatusBadge({
  status,
}: {
  status: BookingStatus;
}) {
  switch (status) {
    case "request":
      return (
        <Badge variant="secondary">
          Demande
        </Badge>
      );

    case "option":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-700"
        >
          Option
        </Badge>
      );

    case "confirmed":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-emerald-700"
        >
          Confirmée
        </Badge>
      );

    case "in_progress":
      return (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-700"
        >
          En cours
        </Badge>
      );

    case "completed":
      return (
        <Badge variant="secondary">
          Terminée
        </Badge>
      );

    case "cancelled":
      return (
        <Badge variant="destructive">
          Annulée
        </Badge>
      );

    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
}

// ============================================================
// ACTIONS RESERVATION
// ============================================================

function BookingActions({
  booking,
}: {
  booking: Booking;
}) {
  const navigate =
    useNavigate();

  /**
   * La liste n'effectue plus de changement générique de statut.
   *
   * Les transitions protégées passent exclusivement par les RPC
   * métier depuis la fiche détaillée :
   * - confirmation : confirm_short_rental_booking()
   * - annulation : cancel_short_rental_booking()
   * - check-in : check_in_short_rental_booking()
   * - check-out : check_out_short_rental_booking()
   */
  const confirmBooking =
    useConfirmBooking();

  const isPending =
    confirmBooking.isPending;

  const canConfirm =
    booking.status ===
      "request" ||
    booking.status ===
      "option";

  const canCancel =
    booking.status ===
      "request" ||
    booking.status ===
      "option" ||
    booking.status ===
      "confirmed";

  const canCheckIn =
    booking.status ===
    "confirmed";

  const canCheckOut =
    booking.status ===
    "in_progress";

  // ==========================================================
  // NAVIGATION FICHE
  // ==========================================================

  const handleView = () => {
    navigate(
      `/admin/bookings/${booking.id}`,
    );
  };

  // ==========================================================
  // CONFIRMATION SECURISEE
  // ==========================================================

  const handleConfirmBooking =
    async () => {
      if (
        !canConfirm ||
        isPending
      ) {
        return;
      }

      try {
        const result =
          await confirmBooking.mutateAsync(
            booking.id,
          );

        toast.success(
          `Réservation ${result.reference} confirmée avec succès.`,
        );
      } catch (error) {
        console.error(
          "[BookingsPage] Erreur confirmation réservation :",
          error,
        );

        toast.error(
          getConfirmationErrorMessage(
            error,
          ),
        );
      }
    };

  // ==========================================================
  // ACTIONS METIER DEPUIS LA FICHE
  // ==========================================================

  /**
   * Annulation, check-in et check-out ouvrent volontairement
   * la fiche détaillée. Cela évite de dupliquer ici les contrôles
   * financiers, l'aperçu de pénalité/remboursement et les boîtes
   * de dialogue métier déjà branchées sur les RPC validées.
   */
  const handleOpenForCancellation = () => {
    navigate(
      `/admin/bookings/${booking.id}`,
    );
  };

  const handleOpenForCheckIn = () => {
    navigate(
      `/admin/bookings/${booking.id}`,
    );
  };

  const handleOpenForCheckOut = () => {
    navigate(
      `/admin/bookings/${booking.id}`,
    );
  };

  return (
    <div className="flex min-w-[260px] flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={
          handleView
        }
        disabled={
          isPending
        }
      >
        <Eye className="mr-2 h-4 w-4" />

        Voir
      </Button>

      {canConfirm && (
        <Button
          type="button"
          size="sm"
          onClick={
            handleConfirmBooking
          }
          disabled={
            isPending
          }
        >
          {confirmBooking.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}

          {confirmBooking.isPending
            ? "Confirmation..."
            : "Confirmer"}
        </Button>
      )}

      {canCancel && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={
            handleOpenForCancellation
          }
          disabled={
            isPending
          }
          title="Ouvrir la fiche pour calculer la pénalité et le remboursement avant annulation"
        >
          <XCircle className="mr-2 h-4 w-4" />

          Annuler
        </Button>
      )}

      {canCheckIn && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={
            handleOpenForCheckIn
          }
          disabled={
            isPending
          }
          title="Ouvrir la fiche pour effectuer le check-in sécurisé"
        >
          Check-in
        </Button>
      )}

      {canCheckOut && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={
            handleOpenForCheckOut
          }
          disabled={
            isPending
          }
          title="Ouvrir la fiche pour effectuer le check-out sécurisé"
        >
          Check-out
        </Button>
      )}
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function BookingsPage() {
  const [
    bookingDialogOpen,
    setBookingDialogOpen,
  ] =
    useState(false);

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all",
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const {
    data:
      bookings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useBookings({
    status:
      statusFilter,

    search:
      search.trim() ||
      undefined,
  });

  // ==========================================================
  // KPI
  // ==========================================================

  const stats =
    useMemo(() => {
      const requestCount =
        bookings.filter(
          (booking) =>
            booking.status ===
            "request",
        ).length;

      const optionCount =
        bookings.filter(
          (booking) =>
            booking.status ===
            "option",
        ).length;

      const confirmedCount =
        bookings.filter(
          (booking) =>
            booking.status ===
            "confirmed",
        ).length;

      const inProgressCount =
        bookings.filter(
          (booking) =>
            booking.status ===
            "in_progress",
        ).length;

      return {
        total:
          bookings.length,

        requestCount,

        optionCount,

        confirmedCount,

        inProgressCount,
      };
    }, [
      bookings,
    ]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <PageShell
        title="Réservations"
        subtitle="Suivez les demandes et séjours de location courte durée."
        actions={
          <Button
            onClick={() =>
              setBookingDialogOpen(
                true,
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" />

            Nouvelle réservation
          </Button>
        }
      >
        <div className="space-y-6">
          {/* ==================================================
              KPI
          ================================================== */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Réservations
                </CardTitle>

                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    stats.total
                  }
                </div>

                <p className="text-xs text-muted-foreground">
                  Résultats affichés
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Demandes
                </CardTitle>

                <Clock3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    stats.requestCount
                  }
                </div>

                <p className="text-xs text-muted-foreground">
                  À traiter
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Options
                </CardTitle>

                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    stats.optionCount
                  }
                </div>

                <p className="text-xs text-muted-foreground">
                  En attente
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Confirmées
                </CardTitle>

                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    stats.confirmedCount
                  }
                </div>

                <p className="text-xs text-muted-foreground">
                  Séjours confirmés
                </p>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  En cours
                </CardTitle>

                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>

              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    stats.inProgressCount
                  }
                </div>

                <p className="text-xs text-muted-foreground">
                  Voyageurs présents
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ==================================================
              FILTRES
          ================================================== */}

          <Card className="premium-card">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    value={
                      search
                    }
                    onChange={(
                      event,
                    ) =>
                      setSearch(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Rechercher par référence, nom, téléphone ou e-mail..."
                    className="pl-9"
                  />
                </div>

                <Select
                  value={
                    statusFilter
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setStatusFilter(
                      value as StatusFilter,
                    )
                  }
                >
                  <SelectTrigger className="w-full md:w-[210px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {STATUS_OPTIONS.map(
                      (
                        option,
                      ) => (
                        <SelectItem
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ==================================================
              TABLEAU
          ================================================== */}

          <Card className="premium-card overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>
                    Liste des réservations
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {
                      bookings.length
                    }{" "}
                    réservation
                    {bookings.length >
                    1
                      ? "s"
                      : ""}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    refetch()
                  }
                  disabled={
                    isLoading
                  }
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  Actualiser
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex min-h-[320px] items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-7 w-7 animate-spin" />

                    <span className="text-sm">
                      Chargement des réservations...
                    </span>
                  </div>
                </div>
              ) : isError ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 text-center">
                  <XCircle className="h-9 w-9 text-destructive" />

                  <div>
                    <p className="font-medium">
                      Impossible de charger les réservations.
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {error instanceof
                      Error
                        ? error.message
                        : "Une erreur est survenue."}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() =>
                      refetch()
                    }
                  >
                    Réessayer
                  </Button>
                </div>
              ) : bookings.length ===
                0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                  <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground" />

                  <p className="font-medium">
                    Aucune réservation
                  </p>

                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Aucune réservation ne correspond aux critères sélectionnés.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          Réservation
                        </TableHead>

                        <TableHead>
                          Voyageur
                        </TableHead>

                        <TableHead>
                          Bien
                        </TableHead>

                        <TableHead>
                          Séjour
                        </TableHead>

                        <TableHead className="text-center">
                          Voyageurs
                        </TableHead>

                        <TableHead>
                          Montant
                        </TableHead>

                        <TableHead>
                          Statut
                        </TableHead>

                        <TableHead>
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {bookings.map(
                        (
                          booking,
                        ) => {
                          const nights =
                            getNightCount(
                              booking.check_in,
                              booking.check_out,
                            );

                          return (
                            <TableRow
                              key={
                                booking.id
                              }
                            >
                              {/* =================================
                                  RESERVATION
                              ================================= */}

                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">
                                    {
                                      booking.reference
                                    }
                                  </div>

                                  <div className="text-xs text-muted-foreground">
                                    {booking.source
                                      ? `Source : ${booking.source}`
                                      : "Source non renseignée"}
                                  </div>
                                </div>
                              </TableCell>

                              {/* =================================
                                  VOYAGEUR
                              ================================= */}

                              <TableCell>
                                <div className="min-w-[160px] space-y-1">
                                  <div className="font-medium">
                                    {getGuestName(
                                      booking,
                                    )}
                                  </div>

                                  <div className="text-xs text-muted-foreground">
                                    {getGuestContact(
                                      booking,
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              {/* =================================
                                  BIEN
                              ================================= */}

                              <TableCell>
                                <div className="min-w-[170px] space-y-1">
                                  <div className="font-medium">
                                    {getPropertyName(
                                      booking,
                                    )}
                                  </div>

                                  <div className="text-xs text-muted-foreground">
                                    {getPropertyLocation(
                                      booking,
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              {/* =================================
                                  SEJOUR
                              ================================= */}

                              <TableCell>
                                <div className="min-w-[160px] space-y-1">
                                  <div className="text-sm">
                                    {formatDate(
                                      booking.check_in,
                                    )}
                                  </div>

                                  <div className="text-sm">
                                    →{" "}
                                    {formatDate(
                                      booking.check_out,
                                    )}
                                  </div>

                                  <div className="text-xs text-muted-foreground">
                                    {
                                      nights
                                    }{" "}
                                    nuit
                                    {nights >
                                    1
                                      ? "s"
                                      : ""}
                                  </div>
                                </div>
                              </TableCell>

                              {/* =================================
                                  VOYAGEURS
                              ================================= */}

                              <TableCell className="text-center">
                                {booking.guests_count ??
                                  1}
                              </TableCell>

                              {/* =================================
                                  MONTANT
                              ================================= */}

                              <TableCell>
                                <div className="min-w-[145px] space-y-1">
                                  <div className="font-medium">
                                    {formatMoney(
                                      booking.total_amount,
                                      booking.currency,
                                    )}
                                  </div>

                                  {booking.deposit >
                                    0 && (
                                    <div className="text-xs text-muted-foreground">
                                      Caution :{" "}
                                      {formatMoney(
                                        booking.deposit,
                                        booking.currency,
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              {/* =================================
                                  STATUT
                              ================================= */}

                              <TableCell>
                                <BookingStatusBadge
                                  status={
                                    booking.status
                                  }
                                />
                              </TableCell>

                              {/* =================================
                                  ACTIONS
                              ================================= */}

                              <TableCell>
                                <BookingActions
                                  booking={
                                    booking
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          );
                        },
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageShell>

      {/* ======================================================
          CREATION RESERVATION
      ====================================================== */}

      <BookingFormDialog
        open={
          bookingDialogOpen
        }
        onOpenChange={
          setBookingDialogOpen
        }
        onSuccess={() => {
          setBookingDialogOpen(
            false,
          );
        }}
      />
    </>
  );
}