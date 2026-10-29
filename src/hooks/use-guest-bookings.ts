import {
  useQuery,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";


export type GuestBookingHistoryItem = {
  booking_id: string;
  booking_reference: string;
  booking_status: string;

  guest_name: string;
  guest_email: string;
  guests_count: number;

  check_in: string;
  check_out: string;

  total_amount: number;
  currency: string;
  deposit_amount: number;

  property_id: string | null;
  property_reference: string | null;
  property_title: string | null;
  property_city: string | null;
  property_commune: string | null;
  property_district: string | null;

  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: string | null;
  invoice_amount: number | null;

  paid_amount: number;
  remaining_amount: number;
  payment_status: string;

  confirmed_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  cancelled_at: string | null;

  created_at: string;
};


type GuestBookingRpcResult = {
  data: unknown;
  error:
    | {
        message?: string;
      }
    | null;
};


type GuestBookingRpcClient = {
  rpc: (
    functionName:
      "list_my_guest_bookings",
  ) => PromiseLike<GuestBookingRpcResult>;
};


const rpcClient =
  supabase as unknown as
    GuestBookingRpcClient;


const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);


const requiredString = (
  row: Record<string, unknown>,
  key: string,
): string => {
  const value =
    row[key];

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `Historique de réservation invalide : ${key}.`,
    );
  }

  return value;
};


const nullableString = (
  row: Record<string, unknown>,
  key: string,
): string | null => {
  const value =
    row[key];

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value !== "string"
  ) {
    throw new Error(
      `Historique de réservation invalide : ${key}.`,
    );
  }

  return value;
};


const requiredNumber = (
  row: Record<string, unknown>,
  key: string,
): number => {
  const value =
    row[key];

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Historique de réservation invalide : ${key}.`,
    );
  }

  return parsed;
};


const nullableNumber = (
  row: Record<string, unknown>,
  key: string,
): number | null => {
  const value =
    row[key];

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Historique de réservation invalide : ${key}.`,
    );
  }

  return parsed;
};


const parseGuestBooking = (
  value: unknown,
): GuestBookingHistoryItem => {
  if (!isRecord(value)) {
    throw new Error(
      "Historique de réservation invalide.",
    );
  }

  return {
    booking_id:
      requiredString(
        value,
        "booking_id",
      ),

    booking_reference:
      requiredString(
        value,
        "booking_reference",
      ),

    booking_status:
      requiredString(
        value,
        "booking_status",
      ),

    guest_name:
      requiredString(
        value,
        "guest_name",
      ),

    guest_email:
      requiredString(
        value,
        "guest_email",
      ),

    guests_count:
      requiredNumber(
        value,
        "guests_count",
      ),

    check_in:
      requiredString(
        value,
        "check_in",
      ),

    check_out:
      requiredString(
        value,
        "check_out",
      ),

    total_amount:
      requiredNumber(
        value,
        "total_amount",
      ),

    currency:
      requiredString(
        value,
        "currency",
      ),

    deposit_amount:
      requiredNumber(
        value,
        "deposit_amount",
      ),

    property_id:
      nullableString(
        value,
        "property_id",
      ),

    property_reference:
      nullableString(
        value,
        "property_reference",
      ),

    property_title:
      nullableString(
        value,
        "property_title",
      ),

    property_city:
      nullableString(
        value,
        "property_city",
      ),

    property_commune:
      nullableString(
        value,
        "property_commune",
      ),

    property_district:
      nullableString(
        value,
        "property_district",
      ),

    invoice_id:
      nullableString(
        value,
        "invoice_id",
      ),

    invoice_number:
      nullableString(
        value,
        "invoice_number",
      ),

    invoice_status:
      nullableString(
        value,
        "invoice_status",
      ),

    invoice_amount:
      nullableNumber(
        value,
        "invoice_amount",
      ),

    paid_amount:
      requiredNumber(
        value,
        "paid_amount",
      ),

    remaining_amount:
      requiredNumber(
        value,
        "remaining_amount",
      ),

    payment_status:
      requiredString(
        value,
        "payment_status",
      ),

    confirmed_at:
      nullableString(
        value,
        "confirmed_at",
      ),

    checked_in_at:
      nullableString(
        value,
        "checked_in_at",
      ),

    checked_out_at:
      nullableString(
        value,
        "checked_out_at",
      ),

    cancelled_at:
      nullableString(
        value,
        "cancelled_at",
      ),

    created_at:
      requiredString(
        value,
        "created_at",
      ),
  };
};


export const listMyGuestBookings =
  async (): Promise<
    GuestBookingHistoryItem[]
  > => {
    const {
      data,
      error,
    } =
      await rpcClient.rpc(
        "list_my_guest_bookings",
      );

    if (error) {
      throw new Error(
        error.message?.trim() ||
          "Impossible de charger vos réservations.",
      );
    }

    if (!Array.isArray(data)) {
      throw new Error(
        "Réponse de l'historique de réservation invalide.",
      );
    }

    return data.map(
      parseGuestBooking,
    );
  };


export const useGuestBookings =
  () =>
    useQuery({
      queryKey: [
        "guest",
        "bookings",
      ] as const,

      queryFn:
        listMyGuestBookings,

      staleTime:
        0,

      retry:
        false,

      refetchOnMount:
        true,
    });