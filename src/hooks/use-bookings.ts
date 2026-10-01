import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Les types Supabase générés peuvent ne pas encore contenir
 * toutes les colonnes / RPC ajoutées pour la location courte durée.
 * On limite volontairement le `any` à ce hook.
 */
const db = supabase as any;

export const BOOKINGS_KEY = "bookings";

// ============================================================
// STATUTS
// ============================================================

export type BookingStatus =
  | "request"
  | "option"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export const BOOKING_STATUSES: BookingStatus[] = [
  "request",
  "option",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  request: "Demande",
  option: "Option",
  confirmed: "Confirmée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export type ShortRentalRefundMethod =
  | "cash"
  | "transfer"
  | "mobile_money"
  | "card"
  | "cheque"
  | "other";

// ============================================================
// TYPES RELATIONS
// ============================================================

export interface BookingGuestSummary {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
}

export interface BookingPropertySummary {
  id: string;
  reference: string | null;
  title: string | null;
  commune: string | null;
  district: string | null;
  city: string | null;
  listing_type: string | null;
  status: string | null;
}

// ============================================================
// BOOKING
// ============================================================

export interface Booking {
  id: string;
  organization_id: string | null;
  property_id: string;
  lead_id: string | null;
  tenant_id: string | null;
  guest_id: string | null;
  reference: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guests_count: number;
  check_in: string;
  check_out: string;
  nightly_price: number;
  accommodation_amount: number;
  cleaning_fee: number;
  service_fee: number;
  tax_amount: number;
  discount_amount: number;
  fees: number;
  deposit: number;
  total_amount: number;
  currency: string;
  status: BookingStatus;
  source: string;
  external_reference: string | null;
  option_expires_at: string | null;
  confirmed_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  payment_plan?: "half" | "full" | null;
  initial_payment_percent?: number | null;
  free_cancellation_hours?: number | null;
  late_cancellation_penalty_rate?: number | null;
  payment_policy_version?: string | null;
  cancellation_policy_version?: string | null;
  conditions_accepted_at?: string | null;
  conditions_accepted_by?: string | null;
  payment_policy_text?: string | null;
  cancellation_policy_text?: string | null;

  guest?: BookingGuestSummary | null;
  property?: BookingPropertySummary | null;
}

// ============================================================
// RESULTATS RPC
// ============================================================

export interface ConfirmBookingResult {
  booking_id: string;
  reference: string;
  status: BookingStatus;
  property_id: string;
  check_in: string;
  check_out: string;
  nights_count: number;
  nightly_price: number;
  accommodation_amount: number;
  cleaning_fee: number;
  service_fee: number;
  tax_amount: number;
  discount_amount: number;
  fees: number;
  deposit: number;
  total_amount: number;
  currency: string;
  confirmed_at: string;
}

export interface CheckInBookingResult {
  booking_id: string;
  reference: string;
  status: BookingStatus;
  property_id?: string;
  checked_in_at: string;
}

export interface CheckOutBookingResult {
  booking_id: string;
  reference: string;
  status: BookingStatus;
  property_id?: string;
  checked_out_at: string;
}

export interface ShortRentalCancellationPreview {
  booking_id: string;
  total_booking_amount: number;
  free_cancellation: boolean;
  free_cancellation_deadline: string | null;
  penalty_rate: number;
  penalty_amount: number;
}

export interface CancelShortRentalBookingResult {
  booking_id: string;
  reference: string;
  status: BookingStatus;
  total_booking_amount: number;
  free_cancellation: boolean;
  free_cancellation_deadline: string | null;
  contractual_penalty_amount: number;
  effective_penalty_amount: number;
  net_collected_before_refund: number;
  refund_amount: number;
  refund_payment_id: string | null;
  cancelled_at: string;
}

export interface CancellationPreviewInput {
  bookingId: string;
  cancelledAt?: string;
}

export interface CancelBookingInput {
  id: string;
  reason: string;
  refundMethod?: ShortRentalRefundMethod | null;
  cancelledAt?: string;
}

// ============================================================
// FILTRES / INPUTS
// ============================================================

export interface BookingFilters {
  status?: BookingStatus | "all";
  propertyId?: string;
  guestId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface BookingInput {
  organization_id?: string | null;
  property_id: string;
  lead_id?: string | null;
  tenant_id?: string | null;
  guest_id?: string | null;
  reference?: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  guests_count?: number;
  check_in: string;
  check_out: string;
  nightly_price?: number;
  accommodation_amount?: number;
  cleaning_fee?: number;
  service_fee?: number;
  tax_amount?: number;
  discount_amount?: number;
  deposit?: number;
  total_amount?: number;
  currency?: string;
  status?: BookingStatus;
  source?: string | null;
  external_reference?: string | null;
  option_expires_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export type BookingUpdateInput = {
  id: string;
} & Partial<BookingInput>;

export interface BookingStatusInput {
  id: string;
  status: BookingStatus;
  option_expires_at?: string | null;
}

// ============================================================
// HELPERS
// ============================================================

const nullableText = (
  value: string | null | undefined,
): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const nonNullText = (
  value: string | null | undefined,
  fallback = "",
): string => {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
};

const numericValue = (
  value: number | null | undefined,
): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const assertBookingDates = (
  checkIn: string,
  checkOut: string,
) => {
  if (!checkIn || !checkOut) {
    throw new Error(
      "Les dates d'arrivée et de départ sont obligatoires.",
    );
  }

  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    throw new Error("Les dates de réservation sont invalides.");
  }

  if (end <= start) {
    throw new Error(
      "La date de départ doit être postérieure à la date d'arrivée.",
    );
  }
};

const createBookingReference = () => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase();

  return `RESA-${year}${month}${day}-${random}`;
};

const firstRpcRow = <T,>(data: unknown): T => {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    throw new Error("La RPC n'a retourné aucun résultat.");
  }

  return row as T;
};

const normalizeCancellationPreview = (
  data: unknown,
): ShortRentalCancellationPreview => {
  const row = firstRpcRow<Record<string, unknown>>(data);

  return {
    booking_id: String(row.booking_id ?? ""),
    total_booking_amount: Number(row.total_booking_amount ?? 0),
    free_cancellation: Boolean(row.free_cancellation),
    free_cancellation_deadline:
      row.free_cancellation_deadline == null
        ? null
        : String(row.free_cancellation_deadline),
    penalty_rate: Number(row.penalty_rate ?? 0),
    penalty_amount: Number(row.penalty_amount ?? 0),
  };
};

const normalizeCancellationResult = (
  data: unknown,
): CancelShortRentalBookingResult => {
  const row = firstRpcRow<Record<string, unknown>>(data);

  return {
    booking_id: String(row.booking_id ?? ""),
    reference: String(row.reference ?? ""),
    status: String(row.status ?? "cancelled") as BookingStatus,
    total_booking_amount: Number(row.total_booking_amount ?? 0),
    free_cancellation: Boolean(row.free_cancellation),
    free_cancellation_deadline:
      row.free_cancellation_deadline == null
        ? null
        : String(row.free_cancellation_deadline),
    contractual_penalty_amount: Number(
      row.contractual_penalty_amount ?? 0,
    ),
    effective_penalty_amount: Number(
      row.effective_penalty_amount ?? 0,
    ),
    net_collected_before_refund: Number(
      row.net_collected_before_refund ?? 0,
    ),
    refund_amount: Number(row.refund_amount ?? 0),
    refund_payment_id:
      row.refund_payment_id == null
        ? null
        : String(row.refund_payment_id),
    cancelled_at: String(row.cancelled_at ?? new Date().toISOString()),
  };
};

// ============================================================
// SELECT COMMUN
// ============================================================

const BOOKING_SELECT = `
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
// INVALIDATION
// ============================================================

const invalidateBookingCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  booking?: {
    id?: string;
    property_id?: string;
  },
) => {
  void queryClient.invalidateQueries({ queryKey: [BOOKINGS_KEY] });
  void queryClient.invalidateQueries({ queryKey: ["booking-detail"] });
  void queryClient.invalidateQueries({ queryKey: ["short-rental-calendar"] });
  void queryClient.invalidateQueries({ queryKey: ["short-rental-availability"] });
  void queryClient.invalidateQueries({ queryKey: ["short-rental"] });

  if (booking?.id) {
    void queryClient.invalidateQueries({
      queryKey: [BOOKINGS_KEY, "detail", booking.id],
    });
    void queryClient.invalidateQueries({
      queryKey: ["booking-detail", booking.id],
    });
  }

  if (booking?.property_id) {
    void queryClient.invalidateQueries({
      queryKey: ["short-rental-availability", booking.property_id],
    });
  }
};

const invalidateFinancialCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  bookingId?: string,
) => {
  void queryClient.invalidateQueries({ queryKey: ["invoices"] });
  void queryClient.invalidateQueries({ queryKey: ["payments"] });
  void queryClient.invalidateQueries({ queryKey: ["short-rental-payments"] });
  void queryClient.invalidateQueries({ queryKey: ["treasury"] });
  void queryClient.invalidateQueries({ queryKey: ["treasury-movements"] });
  void queryClient.invalidateQueries({ queryKey: ["accounting"] });
  void queryClient.invalidateQueries({ queryKey: ["accounting-entries"] });
  void queryClient.invalidateQueries({ queryKey: ["owner-statements"] });

  // La facture de la fiche courante n'est pas invalidée ici :
  // useBookingInvoice filtre actuellement les factures cancelled.
  // Le cache est mis à jour explicitement dans useCancelBooking.
};

// ============================================================
// LISTE
// ============================================================

export const useBookings = (filters?: BookingFilters) =>
  useQuery({
    queryKey: [BOOKINGS_KEY, "list", filters ?? {}],
    queryFn: async (): Promise<Booking[]> => {
      let query = db
        .from("bookings")
        .select(BOOKING_SELECT)
        .order("check_in", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.propertyId) {
        query = query.eq("property_id", filters.propertyId);
      }

      if (filters?.guestId) {
        query = query.eq("guest_id", filters.guestId);
      }

      const term = filters?.search?.trim();

      if (term) {
        const safeTerm = term
          .replace(/,/g, " ")
          .replace(/[()]/g, " ")
          .trim();

        if (safeTerm) {
          query = query.or(
            [
              `reference.ilike.%${safeTerm}%`,
              `guest_name.ilike.%${safeTerm}%`,
              `guest_email.ilike.%${safeTerm}%`,
              `guest_phone.ilike.%${safeTerm}%`,
              `external_reference.ilike.%${safeTerm}%`,
            ].join(","),
          );
        }
      }

      if (filters?.from) {
        query = query.gt("check_out", filters.from);
      }

      if (filters?.to) {
        query = query.lt("check_in", filters.to);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[Bookings] Erreur chargement réservations :", error);
        throw error;
      }

      return (data ?? []) as Booking[];
    },
  });

// ============================================================
// DETAIL
// ============================================================

export const useBooking = (bookingId?: string | null) =>
  useQuery({
    queryKey: [BOOKINGS_KEY, "detail", bookingId ?? null],
    enabled: Boolean(bookingId),
    queryFn: async (): Promise<Booking> => {
      if (!bookingId) {
        throw new Error("Identifiant réservation manquant.");
      }

      const { data, error } = await db
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("id", bookingId)
        .single();

      if (error) {
        console.error("[Bookings] Erreur chargement réservation :", error);
        throw error;
      }

      return data as Booking;
    },
  });

// ============================================================
// CREATE
// ============================================================

export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BookingInput): Promise<Booking> => {
      if (!input.property_id) {
        throw new Error("Le bien est obligatoire.");
      }

      assertBookingDates(input.check_in, input.check_out);

      const status = input.status ?? "request";

      if (["confirmed", "in_progress", "completed", "cancelled"].includes(status)) {
        throw new Error(
          "La création directe dans ce statut est interdite. Utilisez le workflow sécurisé.",
        );
      }

      if (status === "option" && !input.option_expires_at) {
        throw new Error(
          "Une réservation en option doit avoir une date d'expiration.",
        );
      }

      if (
        status === "option" &&
        input.option_expires_at &&
        new Date(input.option_expires_at).getTime() <= Date.now()
      ) {
        throw new Error(
          "La date d'expiration de l'option doit être future.",
        );
      }

      const accommodationAmount = Math.max(
        0,
        numericValue(input.accommodation_amount),
      );
      const cleaningFee = Math.max(0, numericValue(input.cleaning_fee));
      const serviceFee = Math.max(0, numericValue(input.service_fee));
      const taxAmount = Math.max(0, numericValue(input.tax_amount));
      const discountAmount = Math.max(0, numericValue(input.discount_amount));
      const calculatedTotal = Math.max(
        0,
        accommodationAmount + cleaningFee + serviceFee + taxAmount - discountAmount,
      );

      const payload = {
        organization_id: input.organization_id ?? null,
        property_id: input.property_id,
        lead_id: input.lead_id ?? null,
        tenant_id: input.tenant_id ?? null,
        guest_id: input.guest_id ?? null,
        reference: input.reference?.trim() || createBookingReference(),
        guest_name: nonNullText(input.guest_name),
        guest_phone: nonNullText(input.guest_phone),
        guest_email: nonNullText(input.guest_email),
        guests_count: Math.max(1, Math.trunc(numericValue(input.guests_count ?? 1))),
        check_in: input.check_in,
        check_out: input.check_out,
        nightly_price: Math.max(0, numericValue(input.nightly_price)),
        accommodation_amount: accommodationAmount,
        cleaning_fee: cleaningFee,
        service_fee: serviceFee,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        fees: cleaningFee + serviceFee + taxAmount,
        deposit: Math.max(0, numericValue(input.deposit)),
        total_amount:
          input.total_amount !== undefined
            ? Math.max(0, numericValue(input.total_amount))
            : calculatedTotal,
        currency: nonNullText(input.currency, "GNF"),
        status,
        source: nonNullText(input.source, "direct"),
        external_reference: nullableText(input.external_reference),
        option_expires_at:
          status === "option" ? input.option_expires_at ?? null : null,
        confirmed_at: null,
        checked_in_at: null,
        checked_out_at: null,
        cancelled_at: null,
        cancellation_reason: null,
        notes: nonNullText(input.notes),
        created_by: input.created_by ?? null,
      };

      const { data, error } = await db
        .from("bookings")
        .insert(payload)
        .select(BOOKING_SELECT)
        .single();

      if (error) {
        console.error("[Bookings] Erreur création réservation :", error);
        throw error;
      }

      return data as Booking;
    },
    onSuccess: (booking: Booking) => {
      invalidateBookingCaches(queryClient, booking);
      queryClient.setQueryData(
        [BOOKINGS_KEY, "detail", booking.id],
        booking,
      );
    },
  });
};

// ============================================================
// UPDATE GENERAL
// ============================================================

export const useUpdateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: BookingUpdateInput): Promise<Booking> => {
      if (!id) {
        throw new Error("Identifiant réservation manquant.");
      }

      if (input.status !== undefined) {
        throw new Error(
          "Le statut d'une réservation doit être modifié via le workflow dédié.",
        );
      }

      const payload: Record<string, unknown> = {};

      if (input.check_in !== undefined || input.check_out !== undefined) {
        const { data: currentDates, error: currentDatesError } = await db
          .from("bookings")
          .select("check_in, check_out")
          .eq("id", id)
          .single();

        if (currentDatesError) throw currentDatesError;

        assertBookingDates(
          input.check_in ?? currentDates.check_in,
          input.check_out ?? currentDates.check_out,
        );
      }

      const simpleFields: (keyof BookingInput)[] = [
        "organization_id",
        "property_id",
        "lead_id",
        "tenant_id",
        "guest_id",
        "check_in",
        "check_out",
        "option_expires_at",
        "created_by",
      ];

      simpleFields.forEach((field) => {
        if (input[field] !== undefined) {
          payload[field] = input[field] as unknown;
        }
      });

      if (input.reference !== undefined) {
        const reference = input.reference.trim();
        if (!reference) throw new Error("La référence ne peut pas être vide.");
        payload.reference = reference;
      }

      if (input.guest_name !== undefined) payload.guest_name = nonNullText(input.guest_name);
      if (input.guest_phone !== undefined) payload.guest_phone = nonNullText(input.guest_phone);
      if (input.guest_email !== undefined) payload.guest_email = nonNullText(input.guest_email);
      if (input.guests_count !== undefined) {
        payload.guests_count = Math.max(1, Math.trunc(numericValue(input.guests_count)));
      }
      if (input.nightly_price !== undefined) payload.nightly_price = Math.max(0, numericValue(input.nightly_price));
      if (input.deposit !== undefined) payload.deposit = Math.max(0, numericValue(input.deposit));
      if (input.currency !== undefined) payload.currency = nonNullText(input.currency, "GNF");
      if (input.source !== undefined) payload.source = nonNullText(input.source, "direct");
      if (input.external_reference !== undefined) payload.external_reference = nullableText(input.external_reference);
      if (input.notes !== undefined) payload.notes = nonNullText(input.notes);

      const financialFieldsChanged =
        input.accommodation_amount !== undefined ||
        input.cleaning_fee !== undefined ||
        input.service_fee !== undefined ||
        input.tax_amount !== undefined ||
        input.discount_amount !== undefined;

      if (financialFieldsChanged) {
        const { data: current, error: currentError } = await db
          .from("bookings")
          .select(`
            accommodation_amount,
            cleaning_fee,
            service_fee,
            tax_amount,
            discount_amount
          `)
          .eq("id", id)
          .single();

        if (currentError) throw currentError;

        const accommodation = input.accommodation_amount !== undefined
          ? Math.max(0, numericValue(input.accommodation_amount))
          : numericValue(current.accommodation_amount);
        const cleaning = input.cleaning_fee !== undefined
          ? Math.max(0, numericValue(input.cleaning_fee))
          : numericValue(current.cleaning_fee);
        const service = input.service_fee !== undefined
          ? Math.max(0, numericValue(input.service_fee))
          : numericValue(current.service_fee);
        const tax = input.tax_amount !== undefined
          ? Math.max(0, numericValue(input.tax_amount))
          : numericValue(current.tax_amount);
        const discount = input.discount_amount !== undefined
          ? Math.max(0, numericValue(input.discount_amount))
          : numericValue(current.discount_amount);

        payload.accommodation_amount = accommodation;
        payload.cleaning_fee = cleaning;
        payload.service_fee = service;
        payload.tax_amount = tax;
        payload.discount_amount = discount;
        payload.fees = cleaning + service + tax;

        if (input.total_amount === undefined) {
          payload.total_amount = Math.max(
            0,
            accommodation + cleaning + service + tax - discount,
          );
        }
      }

      if (input.total_amount !== undefined) {
        payload.total_amount = Math.max(0, numericValue(input.total_amount));
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("Aucune modification à enregistrer.");
      }

      const { data, error } = await db
        .from("bookings")
        .update(payload)
        .eq("id", id)
        .select(BOOKING_SELECT)
        .single();

      if (error) {
        console.error("[Bookings] Erreur modification réservation :", error);
        throw error;
      }

      return data as Booking;
    },
    onSuccess: (booking: Booking) => {
      invalidateBookingCaches(queryClient, booking);
      queryClient.setQueryData(
        [BOOKINGS_KEY, "detail", booking.id],
        booking,
      );
    },
  });
};

// ============================================================
// CONFIRMATION ATOMIQUE
// ============================================================

export const useConfirmBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string): Promise<ConfirmBookingResult> => {
      if (!bookingId) throw new Error("Identifiant réservation manquant.");

      const { data, error } = await db.rpc(
        "confirm_short_rental_booking",
        { p_booking_id: bookingId },
      );

      if (error) {
        console.error("[Bookings] Erreur confirmation réservation :", error);
        throw error;
      }

      const result = firstRpcRow<ConfirmBookingResult>(data);

      if (result.status !== "confirmed") {
        throw new Error("La réservation n'a pas été confirmée.");
      }

      return result;
    },
    onSuccess: (result) => {
      invalidateBookingCaches(queryClient, {
        id: result.booking_id,
        property_id: result.property_id,
      });
    },
  });
};

// ============================================================
// CHECK-IN ATOMIQUE
// ============================================================

export const useCheckInBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string): Promise<CheckInBookingResult> => {
      if (!bookingId) throw new Error("Identifiant réservation manquant.");

      const { data, error } = await db.rpc(
        "check_in_short_rental_booking",
        { p_booking_id: bookingId },
      );

      if (error) {
        console.error("[Bookings] Erreur check-in :", error);
        throw error;
      }

      const result = firstRpcRow<CheckInBookingResult>(data);

      if (result.status !== "in_progress") {
        throw new Error("Le check-in n'a pas été finalisé.");
      }

      return result;
    },
    onSuccess: (result) => {
      invalidateBookingCaches(queryClient, {
        id: result.booking_id,
        property_id: result.property_id,
      });
    },
  });
};

// ============================================================
// CHECK-OUT ATOMIQUE
// ============================================================

export const useCheckOutBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string): Promise<CheckOutBookingResult> => {
      if (!bookingId) throw new Error("Identifiant réservation manquant.");

      const { data, error } = await db.rpc(
        "check_out_short_rental_booking",
        { p_booking_id: bookingId },
      );

      if (error) {
        console.error("[Bookings] Erreur check-out :", error);
        throw error;
      }

      const result = firstRpcRow<CheckOutBookingResult>(data);

      if (result.status !== "completed") {
        throw new Error("Le check-out n'a pas été finalisé.");
      }

      return result;
    },
    onSuccess: (result) => {
      invalidateBookingCaches(queryClient, {
        id: result.booking_id,
        property_id: result.property_id,
      });
    },
  });
};

// ============================================================
// STATUS WORKFLOW SIMPLE
// ============================================================

/**
 * Ce hook ne gère que request <-> option.
 * confirmed / in_progress / completed / cancelled passent
 * exclusivement par leurs RPC dédiées.
 */
export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      option_expires_at,
    }: BookingStatusInput): Promise<Booking> => {
      if (!id) throw new Error("Identifiant réservation manquant.");

      if (!BOOKING_STATUSES.includes(status)) {
        throw new Error("Statut de réservation invalide.");
      }

      if (!["request", "option"].includes(status)) {
        throw new Error(
          "Ce changement de statut doit passer par son workflow RPC sécurisé.",
        );
      }

      const payload: Record<string, unknown> = { status };

      if (status === "request") {
        payload.option_expires_at = null;
      }

      if (status === "option") {
        if (!option_expires_at) {
          throw new Error(
            "Une date d'expiration est obligatoire pour une option.",
          );
        }

        if (new Date(option_expires_at).getTime() <= Date.now()) {
          throw new Error(
            "La date d'expiration de l'option doit être future.",
          );
        }

        payload.option_expires_at = option_expires_at;
      }

      const { data, error } = await db
        .from("bookings")
        .update(payload)
        .eq("id", id)
        .select(BOOKING_SELECT)
        .single();

      if (error) {
        console.error("[Bookings] Erreur changement statut :", error);
        throw error;
      }

      return data as Booking;
    },
    onSuccess: (booking: Booking) => {
      invalidateBookingCaches(queryClient, booking);
      queryClient.setQueryData(
        [BOOKINGS_KEY, "detail", booking.id],
        booking,
      );
    },
  });
};

// ============================================================
// PREVISUALISATION ANNULATION
// ============================================================

export const useShortRentalCancellationPreview = () =>
  useMutation({
    mutationFn: async ({
      bookingId,
      cancelledAt,
    }: CancellationPreviewInput): Promise<ShortRentalCancellationPreview> => {
      if (!bookingId) {
        throw new Error("Identifiant réservation manquant.");
      }

      const { data, error } = await db.rpc(
        "calculate_short_rental_cancellation_penalty",
        {
          p_booking_id: bookingId,
          p_cancelled_at: cancelledAt ?? new Date().toISOString(),
        },
      );

      if (error) {
        console.error(
          "[Bookings] Erreur calcul politique d'annulation :",
          error,
        );
        throw error;
      }

      return normalizeCancellationPreview(data);
    },
  });

// ============================================================
// ANNULATION ATOMIQUE + REMBOURSEMENT
// ============================================================

/**
 * SEULE voie frontend autorisée pour annuler une réservation
 * courte durée.
 *
 * La RPC gère atomiquement :
 * - calcul de pénalité ;
 * - remboursement éventuel ;
 * - trésorerie ;
 * - écritures comptables ;
 * - statut facture ;
 * - statut réservation.
 */
export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reason,
      refundMethod = null,
      cancelledAt,
    }: CancelBookingInput): Promise<CancelShortRentalBookingResult> => {
      if (!id) {
        throw new Error("Identifiant réservation manquant.");
      }

      const normalizedReason = reason.trim();

      if (!normalizedReason) {
        throw new Error("Le motif d'annulation est obligatoire.");
      }

      const { data, error } = await db.rpc(
        "cancel_short_rental_booking",
        {
          p_booking_id: id,
          p_reason: normalizedReason,
          p_refund_method: refundMethod,
          p_cancelled_at: cancelledAt ?? new Date().toISOString(),
        },
      );

      if (error) {
        console.error("[Bookings] Erreur annulation réservation :", error);
        throw error;
      }

      const result = normalizeCancellationResult(data);

      if (result.status !== "cancelled") {
        throw new Error("La réservation n'a pas été annulée.");
      }

      return result;
    },
    onSuccess: (result, input) => {
      invalidateBookingCaches(queryClient, { id: result.booking_id });
      invalidateFinancialCaches(queryClient, result.booking_id);

      /**
       * La requête useBookingInvoice actuelle filtre les factures
       * cancelled. Pour que la fiche courante affiche immédiatement
       * le résultat financier après l'annulation, on met à jour son
       * cache local avant tout éventuel rechargement.
       */
      queryClient.setQueryData(
        ["booking-invoice", result.booking_id],
        (current: any) => {
          if (!current) return current;

          return {
            ...current,
            status: "cancelled",
            paid_amount: result.effective_penalty_amount,
            updated_at: result.cancelled_at,
          };
        },
      );

      if (result.refund_payment_id) {
        void queryClient.invalidateQueries({
          queryKey: ["short-rental-payments"],
        });
      }

      void queryClient.invalidateQueries({
        queryKey: ["booking-detail", input.id],
      });
    },
  });
};
