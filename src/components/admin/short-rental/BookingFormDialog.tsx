import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useQuery } from "@tanstack/react-query";

import {
  CalendarDays,
  Loader2,
  Plus,
  UserPlus,
} from "lucide-react";

import { toast } from "sonner";

import {
  Guest,
  useGuests,
} from "@/hooks/use-guests";

import {
  Booking,
  useCreateBooking,
} from "@/hooks/use-bookings";

import {
  ShortRentalSettings,
  useShortRentalSettings,
} from "@/hooks/use-short-rental-settings";

import GuestFormDialog from "@/components/admin/short-rental/GuestFormDialog";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

const db = supabase as any;

// ============================================================
// TYPES
// ============================================================

interface BookingFormDialogProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  onSuccess?: (
    booking: Booking,
  ) => void;
}

interface ShortRentalProperty {
  id: string;

  reference: string | null;
  title: string | null;

  commune: string | null;
  district: string | null;
  city: string | null;

  listing_type: string | null;
  status: string | null;
}

interface RatePeriod {
  id: string;

  property_id: string;

  name: string;

  start_date: string;
  end_date: string;

  nightly_rate: number;

  minimum_stay: number | null;

  priority: number;

  active: boolean;

  created_at: string;
}

interface QuoteNight {
  date: string;

  rate: number;

  ratePeriodId: string | null;

  ratePeriodName: string | null;
}

interface QuoteResult {
  nights: QuoteNight[];

  nightsCount: number;

  accommodationAmount: number;

  cleaningFee: number;

  serviceFee: number;

  taxAmount: number;

  discountAmount: number;

  deposit: number;

  totalAmount: number;

  minimumStay: number;

  maximumStay: number | null;

  maxGuests: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const EMPTY_PROPERTY_VALUE =
  "__no_property__";

const EMPTY_GUEST_VALUE =
  "__no_guest__";

// ============================================================
// HELPERS
// ============================================================

const formatMoney = (
  value: number,
  currency = "GNF",
) =>
  `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(value)} ${currency}`;

const toDate = (
  date: string,
) =>
  new Date(
    `${date}T00:00:00`,
  );

const dateToString = (
  date: Date,
) => {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(
    2,
    "0",
  );

  const day = String(
    date.getDate(),
  ).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
};

const getDateRange = (
  checkIn: string,
  checkOut: string,
) => {
  if (
    !checkIn ||
    !checkOut
  ) {
    return [];
  }

  const start =
    toDate(checkIn);

  const end =
    toDate(checkOut);

  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(
      end.getTime(),
    ) ||
    end <= start
  ) {
    return [];
  }

  const result: string[] =
    [];

  const cursor =
    new Date(start);

  while (
    cursor < end
  ) {
    result.push(
      dateToString(
        cursor,
      ),
    );

    cursor.setDate(
      cursor.getDate() + 1,
    );
  }

  return result;
};

const getPeriodDuration = (
  period: RatePeriod,
) => {
  const start =
    toDate(
      period.start_date,
    );

  const end =
    toDate(
      period.end_date,
    );

  return (
    end.getTime() -
    start.getTime()
  );
};

/**
 * Résolution canonique d'un tarif pour une nuit.
 *
 * Priorité :
 * 1. période active couvrant la nuit
 * 2. priority DESC
 * 3. durée de période ASC
 * 4. created_at DESC
 * 5. id DESC
 * 6. tarif de base
 */
const resolveNightRate = ({
  stayDate,
  settings,
  ratePeriods,
}: {
  stayDate: string;

  settings: ShortRentalSettings;

  ratePeriods: RatePeriod[];
}): QuoteNight => {
  const candidates =
    ratePeriods
      .filter(
        (period) =>
          period.active &&
          period.property_id ===
            settings.property_id &&
          period.start_date <=
            stayDate &&
          stayDate <
            period.end_date,
      )
      .sort(
        (
          a,
          b,
        ) => {
          if (
            b.priority !==
            a.priority
          ) {
            return (
              b.priority -
              a.priority
            );
          }

          const durationA =
            getPeriodDuration(
              a,
            );

          const durationB =
            getPeriodDuration(
              b,
            );

          if (
            durationA !==
            durationB
          ) {
            return (
              durationA -
              durationB
            );
          }

          const createdA =
            new Date(
              a.created_at,
            ).getTime();

          const createdB =
            new Date(
              b.created_at,
            ).getTime();

          if (
            createdA !==
            createdB
          ) {
            return (
              createdB -
              createdA
            );
          }

          return b.id.localeCompare(
            a.id,
          );
        },
      );

  const selected =
    candidates[0];

  if (selected) {
    return {
      date: stayDate,

      rate:
        Number(
          selected.nightly_rate,
        ) || 0,

      ratePeriodId:
        selected.id,

      ratePeriodName:
        selected.name,
    };
  }

  return {
    date: stayDate,

    rate:
      Number(
        settings.base_nightly_rate,
      ) || 0,

    ratePeriodId: null,

    ratePeriodName: null,
  };
};

const getPropertyLabel = (
  property: ShortRentalProperty,
) => {
  const title =
    property.title ||
    "Bien sans titre";

  if (
    property.reference
  ) {
    return `${property.reference} — ${title}`;
  }

  return title;
};

const getGuestLabel = (
  guest: Guest,
) => {
  const contact =
    guest.phone ||
    guest.email;

  if (contact) {
    return `${guest.full_name} — ${contact}`;
  }

  return guest.full_name;
};

// ============================================================
// COMPONENT
// ============================================================

export default function BookingFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: BookingFormDialogProps) {
  const createBooking =
    useCreateBooking();

  const {
    data: guests = [],
    isLoading:
      guestsLoading,
  } = useGuests();

  const {
    data:
      shortRentalSettings = [],
    isLoading:
      settingsLoading,
  } =
    useShortRentalSettings();

  const [
    guestDialogOpen,
    setGuestDialogOpen,
  ] =
    useState(false);

  const [
    selectedGuestId,
    setSelectedGuestId,
  ] =
    useState("");

  const [
    selectedPropertyId,
    setSelectedPropertyId,
  ] =
    useState("");

  const [
    checkIn,
    setCheckIn,
  ] =
    useState("");

  const [
    checkOut,
    setCheckOut,
  ] =
    useState("");

  const [
    guestsCount,
    setGuestsCount,
  ] =
    useState(1);

  const [
    notes,
    setNotes,
  ] =
    useState("");

  // ==========================================================
  // PROPERTIES
  // ==========================================================

  const activeSettings =
    useMemo(
      () =>
        shortRentalSettings.filter(
          (
            item,
          ) =>
            item.active,
        ),
      [
        shortRentalSettings,
      ],
    );

  const activePropertyIds =
    useMemo(
      () =>
        activeSettings.map(
          (
            item,
          ) =>
            item.property_id,
        ),
      [
        activeSettings,
      ],
    );

  const {
    data:
      properties = [],
    isLoading:
      propertiesLoading,
  } =
    useQuery({
      queryKey: [
        "booking-form",
        "short-rental-properties",
        activePropertyIds,
      ],

      enabled:
        activePropertyIds.length >
        0,

      queryFn:
        async (): Promise<
          ShortRentalProperty[]
        > => {
          if (
            activePropertyIds.length ===
            0
          ) {
            return [];
          }

          const {
            data,
            error,
          } =
            await db
              .from(
                "properties",
              )
              .select(
                `
                  id,
                  reference,
                  title,
                  commune,
                  district,
                  city,
                  listing_type,
                  status
                `,
              )
              .in(
                "id",
                activePropertyIds,
              )
              .eq(
                "listing_type",
                "short_rental",
              )
              .order(
                "title",
                {
                  ascending:
                    true,
                },
              );

          if (error) {
            console.error(
              "[BookingFormDialog] Erreur chargement biens :",
              error,
            );

            throw error;
          }

          return (
            data ?? []
          ) as ShortRentalProperty[];
        },
    });

  // ==========================================================
  // RATE PERIODS
  // ==========================================================

  const {
    data:
      ratePeriods = [],
    isLoading:
      ratesLoading,
  } =
    useQuery({
      queryKey: [
        "booking-form",
        "rate-periods",
        selectedPropertyId,
      ],

      enabled:
        Boolean(
          selectedPropertyId,
        ),

      queryFn:
        async (): Promise<
          RatePeriod[]
        > => {
          if (
            !selectedPropertyId
          ) {
            return [];
          }

          const {
            data,
            error,
          } =
            await db
              .from(
                "property_rate_periods",
              )
              .select(
                `
                  id,
                  property_id,
                  name,
                  start_date,
                  end_date,
                  nightly_rate,
                  minimum_stay,
                  priority,
                  active,
                  created_at
                `,
              )
              .eq(
                "property_id",
                selectedPropertyId,
              )
              .eq(
                "active",
                true,
              );

          if (error) {
            console.error(
              "[BookingFormDialog] Erreur chargement périodes tarifaires :",
              error,
            );

            throw error;
          }

          return (
            data ?? []
          ) as RatePeriod[];
        },
    });

  // ==========================================================
  // CURRENT SELECTIONS
  // ==========================================================

  const selectedGuest =
    useMemo(
      () =>
        guests.find(
          (
            guest,
          ) =>
            guest.id ===
            selectedGuestId,
        ) ?? null,
      [
        guests,
        selectedGuestId,
      ],
    );

  const selectedSettings =
    useMemo(
      () =>
        activeSettings.find(
          (
            settings,
          ) =>
            settings.property_id ===
            selectedPropertyId,
        ) ?? null,
      [
        activeSettings,
        selectedPropertyId,
      ],
    );

  // ==========================================================
  // QUOTE
  // ==========================================================

  const quote =
    useMemo<
      QuoteResult | null
    >(() => {
      if (
        !selectedSettings ||
        !checkIn ||
        !checkOut
      ) {
        return null;
      }

      const stayDates =
        getDateRange(
          checkIn,
          checkOut,
        );

      if (
        stayDates.length ===
        0
      ) {
        return null;
      }

      const nights =
        stayDates.map(
          (
            stayDate,
          ) =>
            resolveNightRate(
              {
                stayDate,

                settings:
                  selectedSettings,

                ratePeriods,
              },
            ),
        );

      const accommodationAmount =
        nights.reduce(
          (
            total,
            night,
          ) =>
            total +
            night.rate,
          0,
        );

      const cleaningFee =
        Math.max(
          0,
          Number(
            selectedSettings.cleaning_fee ??
              0,
          ),
        );

      /**
       * Pas encore de paramétrage global
       * service/taxe dans short_rental_settings.
       *
       * On les garde donc volontairement
       * à zéro dans cette première version.
       */
      const serviceFee = 0;
      const taxAmount = 0;
      const discountAmount =
        0;

      const deposit =
        Math.max(
          0,
          Number(
            selectedSettings.security_deposit ??
              0,
          ),
        );

      const totalAmount =
        Math.max(
          0,
          accommodationAmount +
            cleaningFee +
            serviceFee +
            taxAmount -
            discountAmount,
        );

      /**
       * Minimum de séjour applicable :
       * on prend le minimum_stay du setting,
       * puis l'override le plus contraignant
       * parmi les périodes réellement utilisées.
       *
       * Cette logique est indicative à ce stade.
       * La future RPC de confirmation restera
       * l'autorité métier finale.
       */
      const periodMinimumStays =
        ratePeriods
          .filter(
            (
              period,
            ) =>
              period.active &&
              period.minimum_stay !==
                null &&
              nights.some(
                (
                  night,
                ) =>
                  night.ratePeriodId ===
                  period.id,
              ),
          )
          .map(
            (
              period,
            ) =>
              Number(
                period.minimum_stay,
              ),
          )
          .filter(
            (
              value,
            ) =>
              Number.isFinite(
                value,
              ) &&
              value > 0,
          );

      const minimumStay =
        Math.max(
          Number(
            selectedSettings.minimum_stay ??
              1,
          ),
          ...periodMinimumStays,
        );

      return {
        nights,

        nightsCount:
          nights.length,

        accommodationAmount,

        cleaningFee,

        serviceFee,

        taxAmount,

        discountAmount,

        deposit,

        totalAmount,

        minimumStay,

        maximumStay:
          selectedSettings.maximum_stay,

        maxGuests:
          selectedSettings.max_guests,
      };
    }, [
      selectedSettings,
      checkIn,
      checkOut,
      ratePeriods,
    ]);

  // ==========================================================
  // RESET
  // ==========================================================

  const resetForm =
    () => {
      setSelectedGuestId(
        "",
      );

      setSelectedPropertyId(
        "",
      );

      setCheckIn("");

      setCheckOut("");

      setGuestsCount(1);

      setNotes("");
    };

  useEffect(
    () => {
      if (!open) {
        return;
      }

      resetForm();
    },
    [open],
  );

  // ==========================================================
  // CREATE GUEST
  // ==========================================================

  const handleGuestCreated =
    (
      guest: Guest,
    ) => {
      setSelectedGuestId(
        guest.id,
      );

      setGuestDialogOpen(
        false,
      );

      toast.success(
        "Le voyageur a été sélectionné pour la réservation.",
      );
    };

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validate =
    () => {
      if (
        !selectedGuest
      ) {
        toast.error(
          "Sélectionnez un voyageur.",
        );

        return false;
      }

      if (
        !selectedPropertyId
      ) {
        toast.error(
          "Sélectionnez un bien.",
        );

        return false;
      }

      if (
        !selectedSettings
      ) {
        toast.error(
          "Le paramétrage courte durée du bien est introuvable.",
        );

        return false;
      }

      if (
        !checkIn ||
        !checkOut
      ) {
        toast.error(
          "Les dates d'arrivée et de départ sont obligatoires.",
        );

        return false;
      }

      if (!quote) {
        toast.error(
          "Les dates du séjour sont invalides.",
        );

        return false;
      }

      if (
        quote.nightsCount <
        quote.minimumStay
      ) {
        toast.error(
          `Ce bien exige au minimum ${quote.minimumStay} nuit${
            quote.minimumStay >
            1
              ? "s"
              : ""
          }.`,
        );

        return false;
      }

      if (
        quote.maximumStay !==
          null &&
        quote.nightsCount >
          quote.maximumStay
      ) {
        toast.error(
          `Ce bien accepte au maximum ${quote.maximumStay} nuits.`,
        );

        return false;
      }

      if (
        guestsCount < 1
      ) {
        toast.error(
          "Le nombre de voyageurs doit être supérieur à zéro.",
        );

        return false;
      }

      if (
        guestsCount >
        quote.maxGuests
      ) {
        toast.error(
          `Ce bien accepte au maximum ${quote.maxGuests} voyageur${
            quote.maxGuests >
            1
              ? "s"
              : ""
          }.`,
        );

        return false;
      }

      return true;
    };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        createBooking.isPending
      ) {
        return;
      }

      if (!validate()) {
        return;
      }

      if (
        !selectedGuest ||
        !selectedSettings ||
        !quote
      ) {
        return;
      }

      try {
        /**
         * nightly_price reste ici un indicateur.
         *
         * Si toutes les nuits ont le même tarif,
         * il correspond exactement à ce tarif.
         *
         * En cas de période saisonnière, nous utilisons
         * le tarif moyen indicatif.
         *
         * booking_nights figera ultérieurement
         * le tarif exact nuit par nuit.
         */
        const averageNightlyPrice =
          quote.nightsCount >
          0
            ? Math.round(
                quote.accommodationAmount /
                  quote.nightsCount,
              )
            : Number(
                selectedSettings.base_nightly_rate,
              );

        const booking =
          await createBooking.mutateAsync(
            {
              property_id:
                selectedPropertyId,

              guest_id:
                selectedGuest.id,

              /**
               * On conserve également les coordonnées
               * dans les champs historiques du booking.
               *
               * Cela facilite l'affichage et préserve
               * la compatibilité avec le modèle existant.
               */
              guest_name:
                selectedGuest.full_name,

              guest_phone:
                selectedGuest.phone,

              guest_email:
                selectedGuest.email,

              guests_count:
                guestsCount,

              check_in:
                checkIn,

              check_out:
                checkOut,

              nightly_price:
                averageNightlyPrice,

              accommodation_amount:
                quote.accommodationAmount,

              cleaning_fee:
                quote.cleaningFee,

              service_fee:
                quote.serviceFee,

              tax_amount:
                quote.taxAmount,

              discount_amount:
                quote.discountAmount,

              deposit:
                quote.deposit,

              total_amount:
                quote.totalAmount,

              currency:
                selectedSettings.currency ||
                "GNF",

              /**
               * IMPÉRATIF :
               * cette première création reste une demande.
               */
              status:
                "request",

              source:
                "direct",

              notes:
                notes.trim() ||
                null,
            },
          );

        toast.success(
          `Réservation ${booking.reference} créée en statut Demande.`,
        );

        onSuccess?.(
          booking,
        );

        onOpenChange(
          false,
        );

        resetForm();
      } catch (
        error
      ) {
        console.error(
          "[BookingFormDialog] Erreur création réservation :",
          error,
        );

        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de créer la réservation.",
        );
      }
    };

  const handleOpenChange =
    (
      nextOpen: boolean,
    ) => {
      if (
        !nextOpen &&
        createBooking.isPending
      ) {
        return;
      }

      onOpenChange(
        nextOpen,
      );
    };

  const loading =
    guestsLoading ||
    settingsLoading ||
    propertiesLoading;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={
          handleOpenChange
        }
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <form
            onSubmit={
              handleSubmit
            }
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />

                Nouvelle réservation
              </DialogTitle>

              <DialogDescription>
                Enregistrez une demande de réservation courte durée.
                Le devis reste indicatif jusqu'à la confirmation définitive.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
              {/* ========================================== */}
              {/* VOYAGEUR                                   */}
              {/* ========================================== */}

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">
                    Voyageur
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Sélectionnez un voyageur existant ou créez-en un nouveau.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <Label>
                      Voyageur *
                    </Label>

                    <Select
                      value={
                        selectedGuestId ||
                        EMPTY_GUEST_VALUE
                      }
                      onValueChange={(
                        value,
                      ) =>
                        setSelectedGuestId(
                          value ===
                            EMPTY_GUEST_VALUE
                            ? ""
                            : value,
                        )
                      }
                      disabled={
                        loading ||
                        createBooking.isPending
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Sélectionner un voyageur" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem
                          value={
                            EMPTY_GUEST_VALUE
                          }
                        >
                          Sélectionner un voyageur
                        </SelectItem>

                        {guests.map(
                          (
                            guest,
                          ) => (
                            <SelectItem
                              key={
                                guest.id
                              }
                              value={
                                guest.id
                              }
                            >
                              {getGuestLabel(
                                guest,
                              )}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setGuestDialogOpen(
                          true,
                        )
                      }
                      disabled={
                        createBooking.isPending
                      }
                    >
                      <UserPlus className="mr-2 h-4 w-4" />

                      Nouveau voyageur
                    </Button>
                  </div>
                </div>
              </section>

              {/* ========================================== */}
              {/* BIEN                                       */}
              {/* ========================================== */}

              <section className="space-y-4 border-t pt-5">
                <div>
                  <h3 className="text-sm font-semibold">
                    Bien
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Seuls les biens courte durée ayant un paramétrage actif sont proposés.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>
                    Bien courte durée *
                  </Label>

                  <Select
                    value={
                      selectedPropertyId ||
                      EMPTY_PROPERTY_VALUE
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setSelectedPropertyId(
                        value ===
                          EMPTY_PROPERTY_VALUE
                          ? ""
                          : value,
                      )
                    }
                    disabled={
                      loading ||
                      createBooking.isPending
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un bien" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem
                        value={
                          EMPTY_PROPERTY_VALUE
                        }
                      >
                        Sélectionner un bien
                      </SelectItem>

                      {properties.map(
                        (
                          property,
                        ) => (
                          <SelectItem
                            key={
                              property.id
                            }
                            value={
                              property.id
                            }
                          >
                            {getPropertyLabel(
                              property,
                            )}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSettings && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Base :{" "}
                      {formatMoney(
                        Number(
                          selectedSettings.base_nightly_rate,
                        ),
                        selectedSettings.currency,
                      )}{" "}
                      / nuit
                    </Badge>

                    <Badge variant="outline">
                      Min.{" "}
                      {
                        selectedSettings.minimum_stay
                      }{" "}
                      nuit
                      {selectedSettings.minimum_stay >
                      1
                        ? "s"
                        : ""}
                    </Badge>

                    <Badge variant="outline">
                      Max.{" "}
                      {
                        selectedSettings.max_guests
                      }{" "}
                      voyageur
                      {selectedSettings.max_guests >
                      1
                        ? "s"
                        : ""}
                    </Badge>
                  </div>
                )}
              </section>

              {/* ========================================== */}
              {/* SEJOUR                                     */}
              {/* ========================================== */}

              <section className="space-y-4 border-t pt-5">
                <div>
                  <h3 className="text-sm font-semibold">
                    Séjour
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    La date de départ est libre : la période utilise la convention [arrivée, départ).
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="booking-check-in">
                      Arrivée *
                    </Label>

                    <Input
                      id="booking-check-in"
                      type="date"
                      value={
                        checkIn
                      }
                      onChange={(
                        event,
                      ) =>
                        setCheckIn(
                          event.target.value,
                        )
                      }
                      disabled={
                        createBooking.isPending
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="booking-check-out">
                      Départ *
                    </Label>

                    <Input
                      id="booking-check-out"
                      type="date"
                      value={
                        checkOut
                      }
                      min={
                        checkIn ||
                        undefined
                      }
                      onChange={(
                        event,
                      ) =>
                        setCheckOut(
                          event.target.value,
                        )
                      }
                      disabled={
                        createBooking.isPending
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="booking-guests-count">
                      Voyageurs *
                    </Label>

                    <Input
                      id="booking-guests-count"
                      type="number"
                      min={1}
                      max={
                        selectedSettings?.max_guests ??
                        undefined
                      }
                      value={
                        guestsCount
                      }
                      onChange={(
                        event,
                      ) =>
                        setGuestsCount(
                          Math.max(
                            1,
                            Number(
                              event.target.value,
                            ) ||
                              1,
                          ),
                        )
                      }
                      disabled={
                        createBooking.isPending
                      }
                    />
                  </div>
                </div>
              </section>

              {/* ========================================== */}
              {/* QUOTE                                      */}
              {/* ========================================== */}

              {selectedSettings &&
                checkIn &&
                checkOut && (
                  <section className="space-y-4 border-t pt-5">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Devis indicatif
                      </h3>

                      <p className="text-xs text-muted-foreground">
                        Ce calcul n'est pas encore le snapshot financier définitif de la réservation.
                      </p>
                    </div>

                    {ratesLoading ? (
                      <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />

                        Calcul des tarifs...
                      </div>
                    ) : !quote ? (
                      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                        Sélectionnez une période valide pour obtenir une estimation.
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="space-y-4 pt-6">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Nombre de nuits
                            </span>

                            <span className="font-medium">
                              {
                                quote.nightsCount
                              }
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Hébergement
                            </span>

                            <span className="font-medium">
                              {formatMoney(
                                quote.accommodationAmount,
                                selectedSettings.currency,
                              )}
                            </span>
                          </div>

                          {quote.cleaningFee >
                            0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Frais de ménage
                              </span>

                              <span className="font-medium">
                                {formatMoney(
                                  quote.cleaningFee,
                                  selectedSettings.currency,
                                )}
                              </span>
                            </div>
                          )}

                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">
                                Total séjour
                              </span>

                              <span className="text-lg font-bold">
                                {formatMoney(
                                  quote.totalAmount,
                                  selectedSettings.currency,
                                )}
                              </span>
                            </div>
                          </div>

                          {quote.deposit >
                            0 && (
                            <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                              <div>
                                <div className="text-sm font-medium">
                                  Caution
                                </div>

                                <div className="text-xs text-muted-foreground">
                                  Hors total du séjour
                                </div>
                              </div>

                              <span className="font-semibold">
                                {formatMoney(
                                  quote.deposit,
                                  selectedSettings.currency,
                                )}
                              </span>
                            </div>
                          )}

                          {quote.nights.some(
                            (
                              night,
                            ) =>
                              Boolean(
                                night.ratePeriodName,
                              ),
                          ) && (
                            <div className="space-y-2 border-t pt-4">
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Tarification appliquée
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {Array.from(
                                  new Set(
                                    quote.nights
                                      .map(
                                        (
                                          night,
                                        ) =>
                                          night.ratePeriodName,
                                      )
                                      .filter(
                                        Boolean,
                                      ) as string[],
                                  ),
                                ).map(
                                  (
                                    name,
                                  ) => (
                                    <Badge
                                      key={
                                        name
                                      }
                                      variant="outline"
                                    >
                                      {name}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </section>
                )}

              {/* ========================================== */}
              {/* NOTES                                      */}
              {/* ========================================== */}

              <section className="space-y-2 border-t pt-5">
                <Label htmlFor="booking-notes">
                  Notes internes
                </Label>

                <Textarea
                  id="booking-notes"
                  value={
                    notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setNotes(
                      event.target.value,
                    )
                  }
                  placeholder="Informations complémentaires sur la demande..."
                  rows={3}
                  disabled={
                    createBooking.isPending
                  }
                />
              </section>

              <div className="rounded-lg border border-dashed p-4">
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm font-medium">
                      Création en statut Demande
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Cette opération ne confirme pas le séjour et ne crée ni booking_nights, ni facture, ni paiement.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  handleOpenChange(
                    false,
                  )
                }
                disabled={
                  createBooking.isPending
                }
              >
                Annuler
              </Button>

              <Button
                type="submit"
                disabled={
                  createBooking.isPending ||
                  loading ||
                  ratesLoading
                }
              >
                {createBooking.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />

                    Créer la demande
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <GuestFormDialog
        open={
          guestDialogOpen
        }
        onOpenChange={
          setGuestDialogOpen
        }
        onSuccess={
          handleGuestCreated
        }
      />
    </>
  );
}