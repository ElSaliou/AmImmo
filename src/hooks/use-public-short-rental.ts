import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const PUBLIC_SHORT_RENTAL_KEY =
  "public-short-rental";

export type PublicPaymentPlan =
  | "half"
  | "full";

export interface PublicShortRentalSettings {
  id: string;
  property_id: string;

  currency: string;

  base_nightly_rate: number;
  cleaning_fee: number;
  security_deposit: number;

  minimum_stay: number;
  maximum_stay:
    | number
    | null;

  max_guests: number;

  default_check_in_time: string;
  default_check_out_time: string;

  instant_booking: boolean;
  active: boolean;
}

export interface PublicRatePeriod {
  id: string;
  property_id: string;

  name: string;

  start_date: string;
  end_date: string;

  nightly_rate: number;

  minimum_stay:
    | number
    | null;

  priority: number;

  active: boolean;

  created_at: string;
}

export interface PublicPropertyBlock {
  id: string;

  property_id: string;

  start_date: string;
  end_date: string;

  block_type: string;

  reason:
    | string
    | null;
}

export interface PublicBlockingBooking {
  id: string;

  property_id: string;

  check_in: string;
  check_out: string;

  status:
    | "request"
    | "option"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled";

  option_expires_at:
    | string
    | null;
}

export interface ShortRentalNight {
  date: string;

  nightly_rate: number;

  rate_period_id:
    | string
    | null;

  rate_period_name:
    | string
    | null;
}

export interface ShortRentalQuote {
  property_id: string;

  check_in: string;
  check_out: string;

  nights_count: number;

  nights: ShortRentalNight[];

  accommodation_amount: number;
  cleaning_fee: number;

  total_amount: number;

  security_deposit: number;

  currency: string;

  minimum_stay: number;
  maximum_stay:
    | number
    | null;

  max_guests: number;
}

export interface AvailabilityResult {
  available: boolean;

  reason:
    | string
    | null;

  conflicting_block:
    | PublicPropertyBlock
    | null;

  conflicting_booking:
    | PublicBlockingBooking
    | null;
}

export interface CreatePublicBookingInput {
  property_id: string;

  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_country_of_residence: string;
  guest_special_request?: string;

  guests_count: number;

  check_in: string;
  check_out: string;

  payment_plan:
    PublicPaymentPlan;

  conditions_accepted: boolean;

  quote: ShortRentalQuote;

  notes?: string;
}

type PublicShortRentalContext = {
  settings:
    | PublicShortRentalSettings
    | null;

  rates: PublicRatePeriod[];

  blocks: PublicPropertyBlock[];

  bookings:
    PublicBlockingBooking[];
};

/**
 * Transforme une date locale YYYY-MM-DD
 * en Date sans passer par UTC.
 */
const parseIsoDate = (
  value: string,
) => {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0,
  );
};

const formatIsoDate = (
  date: Date,
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
};

const addDays = (
  value: string,
  days: number,
) => {
  const date =
    parseIsoDate(
      value,
    );

  date.setDate(
    date.getDate() +
      days,
  );

  return formatIsoDate(
    date,
  );
};

const countNights = (
  checkIn: string,
  checkOut: string,
) => {
  const start =
    parseIsoDate(
      checkIn,
    );

  const end =
    parseIsoDate(
      checkOut,
    );

  const difference =
    end.getTime() -
    start.getTime();

  return Math.round(
    difference /
      86_400_000,
  );
};

/**
 * Convention canonique :
 * [check_in, check_out)
 */
const rangesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) =>
  startA < endB &&
  endA > startB;

const bookingBlocksDates = (
  booking: PublicBlockingBooking,
) => {
  if (
    booking.status ===
      "confirmed" ||
    booking.status ===
      "in_progress"
  ) {
    return true;
  }

  if (
    booking.status ===
      "option" &&
    booking.option_expires_at
  ) {
    return (
      new Date(
        booking.option_expires_at,
      ).getTime() >
      Date.now()
    );
  }

  return false;
};

const resolveNightRateFromData = (
  settings:
    PublicShortRentalSettings,
  rates:
    PublicRatePeriod[],
  date: string,
) => {
  const applicable =
    rates
      .filter(
        (
          rate,
        ) =>
          rate.active &&
          date >=
            rate.start_date &&
          date <
            rate.end_date,
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
            countNights(
              a.start_date,
              a.end_date,
            );

          const durationB =
            countNights(
              b.start_date,
              b.end_date,
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

          const createdComparison =
            new Date(
              b.created_at,
            ).getTime() -
            new Date(
              a.created_at,
            ).getTime();

          if (
            createdComparison !==
            0
          ) {
            return createdComparison;
          }

          return b.id.localeCompare(
            a.id,
          );
        },
      );

  const selected =
    applicable[0];

  if (!selected) {
    return {
      nightly_rate:
        Number(
          settings.base_nightly_rate,
        ),

      rate_period_id:
        null as string | null,

      rate_period_name:
        null as string | null,

      minimum_stay:
        null as number | null,
    };
  }

  return {
    nightly_rate:
      Number(
        selected.nightly_rate,
      ),

    rate_period_id:
      selected.id,

    rate_period_name:
      selected.name,

    minimum_stay:
      selected.minimum_stay,
  };
};

const checkAvailabilityFromData = (
  blocks:
    PublicPropertyBlock[],
  bookings:
    PublicBlockingBooking[],
  checkIn: string,
  checkOut: string,
): AvailabilityResult => {
  if (
    !checkIn ||
    !checkOut
  ) {
    return {
      available:
        false,

      reason:
        "Sélectionnez une date d'arrivée et une date de départ.",

      conflicting_block:
        null,

      conflicting_booking:
        null,
    };
  }

  if (
    checkOut <=
    checkIn
  ) {
    return {
      available:
        false,

      reason:
        "La date de départ doit être postérieure à la date d'arrivée.",

      conflicting_block:
        null,

      conflicting_booking:
        null,
    };
  }

  const block =
    blocks.find(
      (
        item,
      ) =>
        rangesOverlap(
          checkIn,
          checkOut,
          item.start_date,
          item.end_date,
        ),
    ) ??
    null;

  if (block) {
    return {
      available:
        false,

      reason:
        "Le logement n'est pas disponible sur toute la période sélectionnée.",

      conflicting_block:
        block,

      conflicting_booking:
        null,
    };
  }

  const booking =
    bookings.find(
      (
        item,
      ) =>
        bookingBlocksDates(
          item,
        ) &&
        rangesOverlap(
          checkIn,
          checkOut,
          item.check_in,
          item.check_out,
        ),
    ) ??
    null;

  if (booking) {
    return {
      available:
        false,

      reason:
        "Le logement est déjà réservé sur une partie de cette période.",

      conflicting_block:
        null,

      conflicting_booking:
        booking,
    };
  }

  return {
    available:
      true,

    reason:
      null,

    conflicting_block:
      null,

    conflicting_booking:
      null,
  };
};

/**
 * Contexte public sécurisé.
 *
 * IMPORTANT :
 * le navigateur ne lit plus directement
 * bookings / property_blocks / rates / settings.
 *
 * Le RPC SECURITY DEFINER ne renvoie que
 * les informations strictement nécessaires
 * à l'affichage et au pré-calcul.
 */
export const usePublicShortRentalContext =
  (
    propertyId?: string,
  ) =>
    useQuery({
      queryKey: [
        PUBLIC_SHORT_RENTAL_KEY,
        "context",
        propertyId,
      ],

      enabled:
        Boolean(
          propertyId,
        ),

      queryFn:
        async () => {
          if (
            !propertyId
          ) {
            return {
              settings:
                null,
              rates: [],
              blocks: [],
              bookings: [],
            } as PublicShortRentalContext;
          }

          const {
            data,
            error,
          } =
            await db.rpc(
              "get_public_short_rental_context",
              {
                p_property_id:
                  propertyId,
              },
            );

          if (error) {
            throw error;
          }

          const value =
            (data ??
              {}) as Partial<PublicShortRentalContext>;

          return {
            settings:
              value.settings ??
              null,

            rates:
              Array.isArray(
                value.rates,
              )
                ? value.rates
                : [],

            blocks:
              Array.isArray(
                value.blocks,
              )
                ? value.blocks
                : [],

            bookings:
              Array.isArray(
                value.bookings,
              )
                ? value.bookings
                : [],
          } as PublicShortRentalContext;
        },
    });

/**
 * Compatibilité avec les noms utilisés
 * ailleurs dans le frontend.
 */
export const usePublicShortRentalSettings =
  (
    propertyId?: string,
  ) => {
    const context =
      usePublicShortRentalContext(
        propertyId,
      );

    return {
      ...context,

      data:
        context.data
          ?.settings ??
        null,
    };
  };

export const usePublicRatePeriods =
  (
    propertyId?: string,
  ) => {
    const context =
      usePublicShortRentalContext(
        propertyId,
      );

    return {
      ...context,

      data:
        context.data
          ?.rates ??
        [],
    };
  };

export const usePublicPropertyBlocks =
  (
    propertyId?: string,
  ) => {
    const context =
      usePublicShortRentalContext(
        propertyId,
      );

    return {
      ...context,

      data:
        context.data
          ?.blocks ??
        [],
    };
  };

export const usePublicBlockingBookings =
  (
    propertyId?: string,
  ) => {
    const context =
      usePublicShortRentalContext(
        propertyId,
      );

    return {
      ...context,

      data:
        context.data
          ?.bookings ??
        [],
    };
  };

/**
 * Moteur public.
 *
 * Le calcul présenté dans l'interface
 * reste un aperçu.
 *
 * La création définitive est recalculée
 * et validée côté PostgreSQL par
 * create_public_short_rental_booking().
 */
export const usePublicShortRental =
  (
    propertyId?: string,
  ) => {
    const contextQuery =
      usePublicShortRentalContext(
        propertyId,
      );

    const settings =
      contextQuery.data
        ?.settings ??
      null;

    const rates =
      contextQuery.data
        ?.rates ??
      [];

    const blocks =
      contextQuery.data
        ?.blocks ??
      [];

    const bookings =
      contextQuery.data
        ?.bookings ??
      [];

    const checkAvailability =
      (
        checkIn: string,
        checkOut: string,
      ) =>
        checkAvailabilityFromData(
          blocks,
          bookings,
          checkIn,
          checkOut,
        );

    const resolveNightRate =
      (
        date: string,
      ): {
        nightly_rate: number;
        rate_period_id:
          | string
          | null;
        rate_period_name:
          | string
          | null;
        minimum_stay:
          | number
          | null;
      } => {
        if (!settings) {
          throw new Error(
            "Ce logement n'est pas configuré pour la location courte durée.",
          );
        }

        return resolveNightRateFromData(
          settings,
          rates,
          date,
        );
      };

    const calculateQuote =
      (
        checkIn: string,
        checkOut: string,
        guestsCount: number,
      ): ShortRentalQuote => {
        if (!settings) {
          throw new Error(
            "Ce logement n'est pas configuré pour la location courte durée.",
          );
        }

        if (
          !settings.active
        ) {
          throw new Error(
            "La réservation en ligne n'est pas disponible pour ce logement.",
          );
        }

        const availability =
          checkAvailability(
            checkIn,
            checkOut,
          );

        if (
          !availability.available
        ) {
          throw new Error(
            availability.reason ??
              "Période indisponible.",
          );
        }

        const nightsCount =
          countNights(
            checkIn,
            checkOut,
          );

        if (
          nightsCount <= 0
        ) {
          throw new Error(
            "Le séjour doit comporter au moins une nuit.",
          );
        }

        if (
          nightsCount <
          Number(
            settings.minimum_stay,
          )
        ) {
          throw new Error(
            `Le séjour minimum est de ${settings.minimum_stay} nuit(s).`,
          );
        }

        if (
          settings.maximum_stay !==
            null &&
          nightsCount >
            Number(
              settings.maximum_stay,
            )
        ) {
          throw new Error(
            `Le séjour maximum est de ${settings.maximum_stay} nuit(s).`,
          );
        }

        if (
          guestsCount < 1
        ) {
          throw new Error(
            "Indiquez au moins un voyageur.",
          );
        }

        if (
          guestsCount >
          Number(
            settings.max_guests,
          )
        ) {
          throw new Error(
            `Ce logement accepte au maximum ${settings.max_guests} voyageur(s).`,
          );
        }

        const nights:
          ShortRentalNight[] =
          [];

        let accommodationAmount =
          0;

        let effectiveMinimumStay =
          Number(
            settings.minimum_stay,
          );

        for (
          let index = 0;
          index <
          nightsCount;
          index += 1
        ) {
          const date =
            addDays(
              checkIn,
              index,
            );

          const rate =
            resolveNightRateFromData(
              settings,
              rates,
              date,
            );

          if (
            rate.minimum_stay !==
              null &&
            Number(
              rate.minimum_stay,
            ) >
              effectiveMinimumStay
          ) {
            effectiveMinimumStay =
              Number(
                rate.minimum_stay,
              );
          }

          accommodationAmount +=
            rate.nightly_rate;

          nights.push({
            date,

            nightly_rate:
              rate.nightly_rate,

            rate_period_id:
              rate.rate_period_id,

            rate_period_name:
              rate.rate_period_name,
          });
        }

        if (
          nightsCount <
          effectiveMinimumStay
        ) {
          throw new Error(
            `Les tarifs sélectionnés imposent un séjour minimum de ${effectiveMinimumStay} nuit(s).`,
          );
        }

        const cleaningFee =
          Number(
            settings.cleaning_fee ??
              0,
          );

        return {
          property_id:
            propertyId!,

          check_in:
            checkIn,

          check_out:
            checkOut,

          nights_count:
            nightsCount,

          nights,

          accommodation_amount:
            accommodationAmount,

          cleaning_fee:
            cleaningFee,

          total_amount:
            accommodationAmount +
            cleaningFee,

          security_deposit:
            Number(
              settings.security_deposit ??
                0,
            ),

          currency:
            settings.currency,

          minimum_stay:
            effectiveMinimumStay,

          maximum_stay:
            settings.maximum_stay,

          max_guests:
            Number(
              settings.max_guests,
            ),
        };
      };

    return {
      settings,

      ratePeriods:
        rates,

      blocks,

      blockingBookings:
        bookings,

      isLoading:
        contextQuery.isLoading,

      error:
        contextQuery.error,

      checkAvailability,
      resolveNightRate,
      calculateQuote,

      refetch:
        contextQuery.refetch,
    };
  };

/**
 * Création publique sécurisée.
 *
 * Le navigateur transmet uniquement :
 * - identité/contact
 * - dates
 * - voyageurs
 * - plan 50/100 %
 *
 * Il ne transmet plus aucun montant
 * faisant autorité.
 *
 * PostgreSQL :
 * - recontrôle disponibilité
 * - recalcule tarif
 * - applique les périodes tarifaires
 * - impose min/max séjour
 * - génère UUID + référence
 * - enregistre uniquement status=request
 */
export const useCreatePublicShortRentalBooking =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input: CreatePublicBookingInput,
        ) => {
          if (
            !input.conditions_accepted
          ) {
            throw new Error(
              "Vous devez accepter les conditions avant de réserver.",
            );
          }

          if (
            !input.guest_name.trim()
          ) {
            throw new Error(
              "Le nom du voyageur est obligatoire.",
            );
          }

          if (
            input.guests_count <
            1
          ) {
            throw new Error(
              "Le nombre de voyageurs est invalide.",
            );
          }

          if (!input.guest_phone.trim()) {
            throw new Error("Le numéro de téléphone est obligatoire.");
          }

          if (!input.guest_email.trim()) {
            throw new Error("L'adresse e-mail est obligatoire.");
          }

          if (!input.guest_country_of_residence.trim()) {
            throw new Error("Le pays de résidence est obligatoire.");
          }

          if (input.guest_name.trim().length > 200) {
            throw new Error("Le nom du voyageur est trop long.");
          }

          if (input.guest_email.trim().length > 320) {
            throw new Error("L'adresse e-mail est trop longue.");
          }

          if (input.guest_phone.trim().length > 50) {
            throw new Error("Le numéro de téléphone est trop long.");
          }

          if (input.guest_country_of_residence.trim().length > 100) {
            throw new Error("Le pays de résidence est trop long.");
          }

          if ((input.guest_special_request?.trim().length ?? 0) > 2000) {
            throw new Error("La demande spéciale est trop longue.");
          }

          if (
            !input.check_in ||
            !input.check_out ||
            input.check_out <=
              input.check_in
          ) {
            throw new Error(
              "Les dates de séjour sont invalides.",
            );
          }

          const {
            data,
            error,
          } =
            await db.rpc(
              "create_public_short_rental_booking",
              {
                p_property_id:
                  input.property_id,

                p_guest_name:
                  input.guest_name.trim(),

                p_guest_email:
                  input.guest_email?.trim() ||
                  null,

                p_guest_phone:
                  input.guest_phone.trim(),

                p_guest_country_of_residence:
                  input.guest_country_of_residence.trim(),

                p_guest_special_request:
                  input.guest_special_request?.trim() ||
                  null,

                p_guests_count:
                  input.guests_count,

                p_check_in:
                  input.check_in,

                p_check_out:
                  input.check_out,

                p_payment_plan:
                  input.payment_plan,

                p_conditions_accepted:
                  true,

                p_notes:
                  input.notes?.trim() ||
                  "",
              },
            );

          if (error) {
            throw error;
          }

          const row =
            Array.isArray(
              data,
            )
              ? data[0]
              : data;

          if (!row?.id) {
            throw new Error(
              "La réservation a été créée mais aucune réponse valide n'a été retournée.",
            );
          }

          return row;
        },

      onSuccess:
        (
          data,
        ) => {
          queryClient.invalidateQueries({
            queryKey: [
              PUBLIC_SHORT_RENTAL_KEY,
              "context",
              data.property_id,
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              PUBLIC_SHORT_RENTAL_KEY,
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              "bookings",
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              "short-rental-calendar-bookings",
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              "short-rental-calendar",
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              "short-rental-availability",
            ],
          });
        },
    });
  };
