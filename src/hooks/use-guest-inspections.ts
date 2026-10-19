import {
  useQuery,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";


export type GuestInspectionListItem = {
  id: string;
  reference: string | null;
  kind: string;
  status: string;
  version: number;
  performed_at: string | null;
  booking_id: string;
  final_document_id: string | null;
};


type GuestInspectionRpcResult = {
  data: unknown;
  error:
    | {
        message: string;
      }
    | null;
};


type GuestInspectionRpcClient = {
  rpc: (
    functionName: "list_my_guest_inspections",
  ) => PromiseLike<GuestInspectionRpcResult>;
};


const guestInspectionRpcClient =
  supabase as unknown as GuestInspectionRpcClient;


const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);


const requiredString = (
  row: Record<string, unknown>,
  key: string,
) => {
  const value = row[key];

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `Réponse EDL voyageur invalide : ${key}.`,
    );
  }

  return value;
};


const nullableString = (
  row: Record<string, unknown>,
  key: string,
) => {
  const value = row[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      `Réponse EDL voyageur invalide : ${key}.`,
    );
  }

  return value;
};


const parseGuestInspection = (
  value: unknown,
): GuestInspectionListItem => {

  if (!isRecord(value)) {
    throw new Error(
      "Réponse EDL voyageur invalide.",
    );
  }

  const version = value.version;

  if (
    typeof version !== "number" ||
    !Number.isFinite(version)
  ) {
    throw new Error(
      "Réponse EDL voyageur invalide : version.",
    );
  }

  return {
    id: requiredString(
      value,
      "id",
    ),

    reference: nullableString(
      value,
      "reference",
    ),

    kind: requiredString(
      value,
      "kind",
    ),

    status: requiredString(
      value,
      "status",
    ),

    version,

    performed_at: nullableString(
      value,
      "performed_at",
    ),

    booking_id: requiredString(
      value,
      "booking_id",
    ),

    final_document_id: nullableString(
      value,
      "final_document_id",
    ),
  };
};


export const listMyGuestInspections =
  async (): Promise<
    GuestInspectionListItem[]
  > => {

    const {
      data,
      error,
    } =
      await guestInspectionRpcClient.rpc(
        "list_my_guest_inspections",
      );

    if (error) {
      throw new Error(
        error.message ||
          "Impossible de charger vos états des lieux.",
      );
    }

    if (!Array.isArray(data)) {
      throw new Error(
        "Réponse EDL voyageur invalide.",
      );
    }

    return data.map(
      parseGuestInspection,
    );
  };


export const useGuestInspections =
  () =>
    useQuery({
      queryKey: [
        "guest",
        "inspections",
      ] as const,

      queryFn:
        listMyGuestInspections,

      staleTime:
        0,

      retry:
        false,

      refetchOnMount:
        true,
    });