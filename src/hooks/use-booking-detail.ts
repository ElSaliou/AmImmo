import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import type {
  Booking,
  BookingGuestSummary,
  BookingPropertySummary,
} from "@/hooks/use-bookings";

/**
 * Les types Supabase générés ne contiennent
 * pas encore nécessairement les nouvelles tables
 * de location courte durée.
 *
 * On limite donc volontairement le `any`
 * à ce hook.
 */
const db = supabase as any;

// ============================================================
// QUERY KEY
// ============================================================

export const BOOKING_DETAIL_KEY =
  "booking-detail";

// ============================================================
// TYPES
// ============================================================

/**
 * Période tarifaire ayant déterminé
 * le tarif d'une nuit.
 *
 * Elle est facultative :
 * une nuit au tarif de base possède
 * rate_period_id = null.
 */
export interface BookingNightRatePeriod {
  id: string;

  property_id: string;

  name: string;

  start_date: string;
  end_date: string;

  nightly_rate: number;

  minimum_stay: number | null;

  priority: number;

  active: boolean;

  created_at: string | null;
}

/**
 * Snapshot tarifaire figé
 * au moment de la confirmation.
 *
 * IMPORTANT :
 *
 * booking_nights représente la vérité historique
 * du prix confirmé.
 *
 * Une modification ultérieure des tarifs du logement
 * ne doit pas modifier ces montants.
 */
export interface BookingNightDetail {
  id: string;

  booking_id: string;

  stay_date: string;

  /**
   * Tarif standard du logement
   * au moment de la confirmation.
   */
  base_rate: number;

  /**
   * Écart avec le tarif de base.
   *
   * Exemple :
   *
   * base_rate = 300 000
   * nightly_rate = 650 000
   * adjustment_amount = 350 000
   */
  adjustment_amount: number;

  /**
   * Tarif réellement figé
   * pour cette nuit.
   */
  nightly_rate: number;

  rate_period_id: string | null;

  /**
   * Résolu par le hook à partir
   * de property_rate_periods.
   */
  rate_period: BookingNightRatePeriod | null;
}

/**
 * Objet complet utilisé
 * par BookingDetailPage.
 */
export interface BookingDetail {
  booking: Booking;

  guest: BookingGuestSummary | null;

  property: BookingPropertySummary | null;

  nights: BookingNightDetail[];

  /**
   * Nombre de nuits calculé
   * depuis booking_nights.
   *
   * Pour une réservation confirmée,
   * cette valeur doit normalement correspondre
   * à check_out - check_in.
   */
  nights_count: number;

  /**
   * Somme réelle des nightly_rate
   * du snapshot booking_nights.
   */
  nights_total: number;
}

// ============================================================
// TYPES DB INTERNES
// ============================================================

interface BookingNightRow {
  id: string;

  booking_id: string;

  stay_date: string;

  base_rate: number | string | null;

  adjustment_amount:
    | number
    | string
    | null;

  nightly_rate:
    | number
    | string
    | null;

  rate_period_id:
    | string
    | null;
}

interface RatePeriodRow {
  id: string;

  property_id: string;

  name: string;

  start_date: string;
  end_date: string;

  nightly_rate:
    | number
    | string
    | null;

  minimum_stay:
    | number
    | string
    | null;

  priority:
    | number
    | string
    | null;

  active: boolean;

  created_at:
    | string
    | null;
}

// ============================================================
// HELPERS
// ============================================================

const numericValue = (
  value:
    | number
    | string
    | null
    | undefined,
): number => {
  const parsed =
    Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const nullableNumericValue = (
  value:
    | number
    | string
    | null
    | undefined,
): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
};

// ============================================================
// SELECT BOOKING
// ============================================================

/**
 * Même structure que dans use-bookings.ts.
 *
 * On conserve ici le SELECT explicitement
 * afin que le hook puisse fonctionner indépendamment
 * de la page liste.
 */
const BOOKING_DETAIL_SELECT = `
  *,
  guest:guests (
    id,
    full_name,
    email,
    phone
  ),
  property:properties (
    id,
    reference,
    title,
    commune,
    district,
    city,
    listing_type,
    status
  )
`;

// ============================================================
// HOOK
// ============================================================

export const useBookingDetail = (
  bookingId?: string | null,
) =>
  useQuery({
    queryKey: [
      BOOKING_DETAIL_KEY,
      bookingId ?? null,
    ],

    enabled:
      Boolean(bookingId),

    queryFn: async (): Promise<
      BookingDetail
    > => {
      if (!bookingId) {
        throw new Error(
          "Identifiant réservation manquant.",
        );
      }

      // ======================================================
      // 1. RESERVATION + VOYAGEUR + LOGEMENT
      // ======================================================

      const {
        data: bookingData,
        error: bookingError,
      } = await db
        .from("bookings")
        .select(
          BOOKING_DETAIL_SELECT,
        )
        .eq(
          "id",
          bookingId,
        )
        .single();

      if (bookingError) {
        console.error(
          "[BookingDetail] Erreur chargement réservation :",
          bookingError,
        );

        throw bookingError;
      }

      if (!bookingData) {
        throw new Error(
          "Réservation introuvable.",
        );
      }

      const booking =
        bookingData as Booking;

      // ======================================================
      // 2. SNAPSHOT BOOKING_NIGHTS
      // ======================================================

      const {
        data: nightsData,
        error: nightsError,
      } = await db
        .from("booking_nights")
        .select(
          `
            id,
            booking_id,
            stay_date,
            base_rate,
            adjustment_amount,
            nightly_rate,
            rate_period_id
          `,
        )
        .eq(
          "booking_id",
          bookingId,
        )
        .order(
          "stay_date",
          {
            ascending: true,
          },
        );

      if (nightsError) {
        console.error(
          "[BookingDetail] Erreur chargement booking_nights :",
          nightsError,
        );

        throw nightsError;
      }

      const nightRows =
        (nightsData ??
          []) as BookingNightRow[];

      // ======================================================
      // 3. PERIODES TARIFAIRES UTILISEES
      // ======================================================

      /**
       * On extrait uniquement les rate_period_id présents
       * dans le snapshot.
       *
       * Une nuit utilisant le tarif de base
       * possède rate_period_id = null.
       */
      const ratePeriodIds =
        Array.from(
          new Set(
            nightRows
              .map(
                (night) =>
                  night.rate_period_id,
              )
              .filter(
                (
                  id,
                ): id is string =>
                  Boolean(id),
              ),
          ),
        );

      const ratePeriodsMap =
        new Map<
          string,
          BookingNightRatePeriod
        >();

      if (
        ratePeriodIds.length > 0
      ) {
        const {
          data: periodsData,
          error: periodsError,
        } = await db
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
          .in(
            "id",
            ratePeriodIds,
          );

        if (periodsError) {
          console.error(
            "[BookingDetail] Erreur chargement périodes tarifaires :",
            periodsError,
          );

          throw periodsError;
        }

        (
          (periodsData ??
            []) as RatePeriodRow[]
        ).forEach(
          (period) => {
            ratePeriodsMap.set(
              period.id,
              {
                id:
                  period.id,

                property_id:
                  period.property_id,

                name:
                  period.name,

                start_date:
                  period.start_date,

                end_date:
                  period.end_date,

                nightly_rate:
                  numericValue(
                    period.nightly_rate,
                  ),

                minimum_stay:
                  nullableNumericValue(
                    period.minimum_stay,
                  ),

                priority:
                  numericValue(
                    period.priority,
                  ),

                active:
                  Boolean(
                    period.active,
                  ),

                created_at:
                  period.created_at ??
                  null,
              },
            );
          },
        );
      }

      // ======================================================
      // 4. NORMALISATION BOOKING_NIGHTS
      // ======================================================

      const nights: BookingNightDetail[] =
        nightRows.map(
          (night) => ({
            id:
              night.id,

            booking_id:
              night.booking_id,

            stay_date:
              night.stay_date,

            base_rate:
              numericValue(
                night.base_rate,
              ),

            adjustment_amount:
              numericValue(
                night.adjustment_amount,
              ),

            nightly_rate:
              numericValue(
                night.nightly_rate,
              ),

            rate_period_id:
              night.rate_period_id,

            rate_period:
              night.rate_period_id
                ? ratePeriodsMap.get(
                    night.rate_period_id,
                  ) ?? null
                : null,
          }),
        );

      // ======================================================
      // 5. CONTROLES / AGREGATS
      // ======================================================

      const nightsTotal =
        nights.reduce(
          (
            total,
            night,
          ) =>
            total +
            night.nightly_rate,
          0,
        );

      /**
       * Pour request / option :
       *
       * booking_nights peut être vide.
       *
       * C'est normal car le snapshot tarifaire
       * n'est créé qu'à la confirmation.
       */
      if (
        booking.status ===
          "confirmed" &&
        nights.length === 0
      ) {
        console.warn(
          `[BookingDetail] La réservation ${booking.reference} est confirmée mais ne possède aucun booking_night.`,
        );
      }

      /**
       * Contrôle de cohérence uniquement informatif.
       *
       * La vérité métier reste côté PostgreSQL.
       */
      if (
        booking.status ===
          "confirmed" &&
        nights.length > 0
      ) {
        const bookingAccommodation =
          numericValue(
            booking.accommodation_amount,
          );

        if (
          Math.abs(
            nightsTotal -
              bookingAccommodation,
          ) > 0.01
        ) {
          console.warn(
            `[BookingDetail] Écart financier détecté sur ${booking.reference}. booking_nights=${nightsTotal}, accommodation_amount=${bookingAccommodation}.`,
          );
        }
      }

      // ======================================================
      // 6. RESULTAT
      // ======================================================

      return {
        booking,

        guest:
          booking.guest ??
          null,

        property:
          booking.property ??
          null,

        nights,

        nights_count:
          nights.length,

        nights_total:
          nightsTotal,
      };
    },

    /**
     * Une fiche réservation n'a pas besoin
     * d'être rechargée à chaque focus fenêtre.
     *
     * Les mutations métier invalideront
     * explicitement son cache.
     */
    refetchOnWindowFocus:
      false,

    staleTime:
      30_000,
  });