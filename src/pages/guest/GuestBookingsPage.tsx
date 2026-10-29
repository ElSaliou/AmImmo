import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  RefreshCw,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  type GuestBookingHistoryItem,
  useGuestBookings,
} from "@/hooks/use-guest-bookings";

import {
  cn,
} from "@/lib/utils";


type BookingFilter =
  | "all"
  | "upcoming"
  | "current"
  | "completed"
  | "cancelled";


const bookingStatusLabels:
  Record<string, string> = {
    request:
      "Demande",

    option:
      "Option",

    confirmed:
      "Confirmée",

    in_progress:
      "En cours",

    completed:
      "Terminée",

    cancelled:
      "Annulée",
  };


const paymentStatusLabels:
  Record<string, string> = {
    not_invoiced:
      "Non facturée",

    unpaid:
      "À payer",

    pending:
      "À payer",

    partially_paid:
      "Partiellement payée",

    paid:
      "Payée",

    cancelled:
      "Annulée",
  };


const formatDate = (
  value: string,
) => {
  const date =
    new Date(
      `${value}T00:00:00`,
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
      dateStyle:
        "medium",
    },
  ).format(date);
};


const formatAmount = (
  amount: number,
  currency: string,
) =>
  `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(amount)} ${currency}`;


const localDateKey = () => {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
};


const bookingCategory = (
  booking: GuestBookingHistoryItem,
): Exclude<
  BookingFilter,
  "all"
> => {
  if (
    booking.booking_status ===
    "cancelled"
  ) {
    return "cancelled";
  }

  if (
    booking.booking_status ===
    "completed"
  ) {
    return "completed";
  }

  if (
    booking.booking_status ===
    "in_progress"
  ) {
    return "current";
  }

  const today =
    localDateKey();

  if (
    booking.check_in <= today &&
    booking.check_out > today
  ) {
    return "current";
  }

  if (
    booking.check_in > today
  ) {
    return "upcoming";
  }

  return "completed";
};


const bookingStatusClass = (
  status: string,
) => {
  if (
    status === "cancelled"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    status === "completed"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status === "in_progress"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (
    status === "confirmed"
  ) {
    return "border-primary/20 bg-primary/5 text-primary";
  }

  return "";
};


const paymentStatusClass = (
  status: string,
) => {
  if (status === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status ===
    "partially_paid"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (
    status === "cancelled"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "";
};


const BookingCard = ({
  booking,
}: {
  booking:
    GuestBookingHistoryItem;
}) => {
  const location = [
    booking.property_district,
    booking.property_commune,
    booking.property_city,
  ]
    .filter(Boolean)
    .join(", ");

  const title =
    booking.property_title ||
    booking.property_reference ||
    "Hébergement";

  return (
    <article className="overflow-hidden rounded-3xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BedDouble className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold">
                  {title}
                </h2>

                <Badge
                  variant="outline"
                  className={cn(
                    bookingStatusClass(
                      booking.booking_status,
                    ),
                  )}
                >
                  {
                    bookingStatusLabels[
                      booking.booking_status
                    ] ??
                    booking.booking_status
                  }
                </Badge>
              </div>

              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {
                  booking.booking_reference
                }
              </p>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />

                  {formatDate(
                    booking.check_in,
                  )}

                  {" → "}

                  {formatDate(
                    booking.check_out,
                  )}
                </span>

                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />

                  {
                    booking.guests_count
                  }{" "}
                  voyageur
                  {
                    booking.guests_count >
                    1
                      ? "s"
                      : ""
                  }
                </span>

                {location ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "w-fit",
              paymentStatusClass(
                booking.payment_status,
              ),
            )}
          >
            <WalletCards className="mr-1.5 h-3.5 w-3.5" />

            {
              paymentStatusLabels[
                booking.payment_status
              ] ??
              booking.payment_status
            }
          </Badge>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Montant
            </p>

            <p className="mt-2 text-lg font-bold">
              {formatAmount(
                booking.total_amount,
                booking.currency,
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">
              Payé
            </p>

            <p className="mt-2 text-lg font-bold text-emerald-900">
              {formatAmount(
                booking.paid_amount,
                booking.currency,
              )}
            </p>
          </div>

          <div
            className={cn(
              "rounded-2xl p-4",
              booking.remaining_amount >
                0
                ? "bg-amber-50"
                : "bg-muted/50",
            )}
          >
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-[0.1em]",
                booking.remaining_amount >
                  0
                  ? "text-amber-700"
                  : "text-muted-foreground",
              )}
            >
              Solde
            </p>

            <p
              className={cn(
                "mt-2 text-lg font-bold",
                booking.remaining_amount >
                  0 &&
                  "text-amber-900",
              )}
            >
              {formatAmount(
                booking.remaining_amount,
                booking.currency,
              )}
            </p>
          </div>
        </div>

        {booking.invoice_number ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Facture :{" "}
            <span className="font-medium text-foreground">
              {
                booking.invoice_number
              }
            </span>
          </p>
        ) : null}
      </div>
    </article>
  );
};


export default function GuestBookingsPage() {
  const bookingsQuery =
    useGuestBookings();

  const [
    filter,
    setFilter,
  ] =
    useState<BookingFilter>(
      "all",
    );

  const bookings =
    bookingsQuery.data ??
    [];

  const categorized =
    useMemo(
      () =>
        bookings.map(
          (booking) => ({
            booking,
            category:
              bookingCategory(
                booking,
              ),
          }),
        ),
      [
        bookings,
      ],
    );

  const counts =
    useMemo(
      () => ({
        all:
          categorized.length,

        upcoming:
          categorized.filter(
            (entry) =>
              entry.category ===
              "upcoming",
          ).length,

        current:
          categorized.filter(
            (entry) =>
              entry.category ===
              "current",
          ).length,

        completed:
          categorized.filter(
            (entry) =>
              entry.category ===
              "completed",
          ).length,

        cancelled:
          categorized.filter(
            (entry) =>
              entry.category ===
              "cancelled",
          ).length,
      }),
      [
        categorized,
      ],
    );

  const filteredBookings =
    useMemo(
      () =>
        categorized
          .filter(
            (entry) =>
              filter === "all" ||
              entry.category ===
                filter,
          )
          .map(
            (entry) =>
              entry.booking,
          ),
      [
        categorized,
        filter,
      ],
    );


  if (bookingsQuery.isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />

          <p className="mt-4 text-sm text-muted-foreground">
            Chargement de vos réservations...
          </p>
        </div>
      </div>
    );
  }


  if (bookingsQuery.isError) {
    return (
      <section className="rounded-3xl border border-destructive/30 bg-card p-6 shadow-sm">
        <h1 className="font-display text-xl font-bold">
          Impossible de charger vos réservations
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {
            bookingsQuery.error
              instanceof Error
              ? bookingsQuery.error.message
              : "Une erreur inconnue est survenue."
          }
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-5 rounded-xl"
          onClick={() =>
            void bookingsQuery.refetch()
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </section>
    );
  }


  const filters: Array<{
    key: BookingFilter;
    label: string;
    icon: typeof History;
  }> = [
    {
      key:
        "all",
      label:
        "Toutes",
      icon:
        History,
    },
    {
      key:
        "upcoming",
      label:
        "À venir",
      icon:
        CalendarDays,
    },
    {
      key:
        "current",
      label:
        "En cours",
      icon:
        Clock3,
    },
    {
      key:
        "completed",
      label:
        "Terminées",
      icon:
        CheckCircle2,
    },
    {
      key:
        "cancelled",
      label:
        "Annulées",
      icon:
        XCircle,
    },
  ];


  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] gradient-primary p-7 text-primary-foreground shadow-xl sm:p-9">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm font-medium ring-1 ring-primary-foreground/15">
            <History className="h-4 w-4 text-secondary" />
            Historique de séjour
          </div>

          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Mes réservations
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-primary-foreground/80 sm:text-base">
            Retrouvez tous vos séjours associés à votre adresse email,
            ainsi que leur statut et leur situation de paiement.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {filters.map(
          ({
            key,
            label,
            icon: Icon,
          }) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setFilter(
                  key,
                )
              }
              className={cn(
                "rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/25",
                filter ===
                  key &&
                  "border-primary ring-1 ring-primary/10",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />

                <span className="text-2xl font-bold">
                  {counts[key]}
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold">
                {label}
              </p>
            </button>
          ),
        )}
      </section>

      {filteredBookings.length ===
      0 ? (
        <section className="rounded-3xl border bg-card p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <CalendarDays className="h-7 w-7 text-muted-foreground" />
          </div>

          <h2 className="mt-5 font-display text-xl font-bold">
            Aucune réservation dans cette catégorie
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Vos réservations associées à cette adresse email apparaîtront automatiquement ici.
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredBookings.map(
            (booking) => (
              <BookingCard
                key={
                  booking.booking_id
                }
                booking={
                  booking
                }
              />
            ),
          )}
        </section>
      )}
    </div>
  );
}