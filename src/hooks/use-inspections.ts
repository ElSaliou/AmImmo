import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PublicFunctions = Database["public"]["Functions"];
type PublicTables = Database["public"]["Tables"];
type PublicEnums = Database["public"]["Enums"];

type RpcArgs<Name extends keyof PublicFunctions> =
    PublicFunctions[Name] extends { Args: infer Args }
        ? Args
        : never;

type RpcResult<Name extends keyof PublicFunctions> =
    PublicFunctions[Name] extends { Returns: infer Returns }
        ? Returns
        : never;

// ============================================================
// DATABASE TYPES
// ============================================================

export type InspectionRow =
    PublicTables["inspections"]["Row"];

export type InspectionRoomRow =
    PublicTables["inspection_rooms"]["Row"];

export type InspectionItemRow =
    PublicTables["inspection_items"]["Row"];

export type InspectionMeterReadingRow =
    PublicTables["inspection_meter_readings"]["Row"];

export type InspectionFindingRow =
    PublicTables["inspection_findings"]["Row"];

export type InspectionDocumentRow =
    PublicTables["inspection_documents"]["Row"];

export type InspectionSignatureRow =
    PublicTables["inspection_signatures"]["Row"];

// ============================================================
// ENUMS
// ============================================================

export type InspectionCondition =
    PublicEnums["inspection_condition"];

export type InspectionKind =
    PublicEnums["inspection_kind"];

export type InspectionSignerRole =
    PublicEnums["inspection_signer_role"];

export type InspectionStatus =
    PublicEnums["inspection_status"];

export type GetInspectionResult =
    RpcResult<"get_inspection">;

// ============================================================
// CANONICAL get_inspection() SNAPSHOT
//
// Important:
// - Legacy inspections.rooms / meters / photos are not exposed.
// - Legacy tenant_signature / agent_signature are not exposed.
// - Items are nested inside rooms.
// - Signature IP / user-agent are intentionally not exposed.
// ============================================================

export type InspectionHeader = Omit<
    InspectionRow,
    | "rooms"
    | "meters"
    | "photos"
    | "tenant_signature"
    | "agent_signature"
>;

export type InspectionItemSnapshot = Pick<
    InspectionItemRow,
    | "id"
    | "name"
    | "item_type"
    | "position"
    | "quantity"
    | "condition"
    | "observations"
>;

export type InspectionRoomSnapshot = Pick<
    InspectionRoomRow,
    | "id"
    | "name"
    | "room_type"
    | "position"
    | "condition"
    | "observations"
> & {
    items: InspectionItemSnapshot[];
};

export type InspectionMeterSnapshot = Pick<
    InspectionMeterReadingRow,
    | "id"
    | "meter_type"
    | "meter_number"
    | "reading"
    | "unit"
    | "observations"
>;

export type InspectionFindingSnapshot = Pick<
    InspectionFindingRow,
    | "id"
    | "room_id"
    | "item_id"
    | "severity"
    | "title"
    | "description"
    | "estimated_cost"
    | "maintenance_request_id"
    | "resolved"
>;

export type InspectionDocumentSnapshot = Pick<
    InspectionDocumentRow,
    | "id"
    | "document_id"
    | "room_id"
    | "item_id"
    | "meter_reading_id"
    | "finding_id"
    | "category"
    | "created_at"
>;

export type InspectionSignatureSnapshot = Pick<
    InspectionSignatureRow,
    | "id"
    | "signer_role"
    | "signer_name"
    | "signature_document_id"
    | "signature_method"
    | "accepted_version"
    | "signed_at"
>;

export type InspectionSnapshot = {
    inspection: InspectionHeader;
    rooms: InspectionRoomSnapshot[];
    meters: InspectionMeterSnapshot[];
    findings: InspectionFindingSnapshot[];
    documents: InspectionDocumentSnapshot[];
    signatures: InspectionSignatureSnapshot[];
};


// ============================================================
// SNAPSHOT RUNTIME NORMALIZATION
// ============================================================

const ensureRecord = (
    value: unknown,
    label: string,
): Record<string, unknown> => {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        throw new Error(
            `Snapshot EDL invalide : ${label} doit être un objet.`,
        );
    }

    return value as Record<string, unknown>;
};

const ensureArray = (
    value: unknown,
    label: string,
): unknown[] => {
    if (!Array.isArray(value)) {
        throw new Error(
            `Snapshot EDL invalide : ${label} doit être un tableau.`,
        );
    }

    return value;
};

const normalizeInspectionRooms = (
    value: unknown,
): InspectionRoomSnapshot[] =>
    ensureArray(value, "rooms").map(
        (rawRoom, roomIndex) => {
            const room = ensureRecord(
                rawRoom,
                `rooms[${roomIndex}]`,
            );

            const items = ensureArray(
                room.items,
                `rooms[${roomIndex}].items`,
            ).map(
                (rawItem, itemIndex) =>
                    ensureRecord(
                        rawItem,
                        `rooms[${roomIndex}].items[${itemIndex}]`,
                    ) as unknown as InspectionItemSnapshot,
            );

            return {
                ...room,
                items,
            } as unknown as InspectionRoomSnapshot;
        },
    );

const normalizeSnapshotArray = <T>(
    value: unknown,
    label: string,
): T[] =>
    ensureArray(value, label).map(
        (entry, index) =>
            ensureRecord(
                entry,
                `${label}[${index}]`,
            ) as unknown as T,
    );

export const normalizeInspectionSnapshot = (
    raw: GetInspectionResult,
): InspectionSnapshot => {
    const snapshot = ensureRecord(
        raw,
        "racine",
    );

    const inspection = ensureRecord(
        snapshot.inspection,
        "inspection",
    ) as unknown as InspectionHeader;

    return {
        inspection,

        rooms: normalizeInspectionRooms(
            snapshot.rooms,
        ),

        meters:
            normalizeSnapshotArray<InspectionMeterSnapshot>(
                snapshot.meters,
                "meters",
            ),

        findings:
            normalizeSnapshotArray<InspectionFindingSnapshot>(
                snapshot.findings,
                "findings",
            ),

        documents:
            normalizeSnapshotArray<InspectionDocumentSnapshot>(
                snapshot.documents,
                "documents",
            ),

        signatures:
            normalizeSnapshotArray<InspectionSignatureSnapshot>(
                snapshot.signatures,
                "signatures",
            ),
    };
};

export type CreateInspectionDraftInput =
    RpcArgs<"create_inspection_draft">;

export type UpdateInspectionHeaderInput =
    RpcArgs<"update_inspection_header">;

export type AddInspectionRoomInput =
    RpcArgs<"add_inspection_room">;

export type UpdateInspectionRoomInput =
    RpcArgs<"update_inspection_room">;

export type DeleteInspectionRoomInput =
    RpcArgs<"delete_inspection_room">;

export type AddInspectionItemInput =
    RpcArgs<"add_inspection_item">;

export type UpdateInspectionItemInput =
    RpcArgs<"update_inspection_item">;

export type DeleteInspectionItemInput =
    RpcArgs<"delete_inspection_item">;

export type AddInspectionMeterInput =
    RpcArgs<"add_inspection_meter">;

export type UpdateInspectionMeterInput =
    RpcArgs<"update_inspection_meter">;

export type DeleteInspectionMeterInput =
    RpcArgs<"delete_inspection_meter">;

export type AddInspectionFindingInput =
    RpcArgs<"add_inspection_finding">;

export type UpdateInspectionFindingInput =
    RpcArgs<"update_inspection_finding">;

export type DeleteInspectionFindingInput =
    RpcArgs<"delete_inspection_finding">;

export type RegisterInspectionDocumentInput =
    RpcArgs<"register_inspection_document">;

export type DetachInspectionDocumentInput =
    RpcArgs<"detach_inspection_document">;

export type PrepareInspectionForSignatureInput =
    RpcArgs<"prepare_inspection_for_signature">;

export type SignInspectionInput =
    RpcArgs<"sign_inspection">;

export type CancelInspectionInput =
    RpcArgs<"cancel_inspection">;

export type FinalizeInspectionInput =
    RpcArgs<"finalize_inspection">;

// ============================================================
// QUERY KEYS
// ============================================================

export const inspectionKeys = {
    all: ["inspections"] as const,

    detail: (inspectionId: string) =>
        ["inspections", "detail", inspectionId] as const,
};

const useInvalidateInspections = () => {
    const queryClient = useQueryClient();

    return () =>
        queryClient.invalidateQueries({
            queryKey: inspectionKeys.all,
        });
};

// ============================================================
// READ MODEL
//
// get_inspection() is the canonical snapshot reader.
// No frontend reconstruction from legacy columns.
// ============================================================

export const useInspection = (
    inspectionId: string | null | undefined,
) =>
    useQuery<InspectionSnapshot>({
        queryKey: inspectionKeys.detail(
            inspectionId ?? "__disabled__",
        ),

        enabled: Boolean(inspectionId),

        queryFn: async () => {
            if (!inspectionId) {
                throw new Error(
                    "inspectionId est requis pour charger l'état des lieux.",
                );
            }

            const { data, error } = await supabase.rpc(
                "get_inspection",
                {
                    p_inspection_id: inspectionId,
                },
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "get_inspection n'a retourné aucune donnée.",
                );
            }

            return normalizeInspectionSnapshot(data);
        },
    });

// ============================================================
// BOOKING INSPECTION LOOKUP
//
// One inspection of a given kind can be attached to a booking.
// This reader is used by the booking operational workflow.
// ============================================================

export const useBookingInspection = (
    bookingId:
        | string
        | null
        | undefined,
    kind: InspectionKind,
) =>
    useQuery<InspectionRow | null>({
        queryKey: [
            "inspections",
            "booking",
            bookingId ?? "__disabled__",
            kind,
        ],

        enabled:
            Boolean(bookingId),

        queryFn: async () => {
            if (!bookingId) {
                return null;
            }

            const {
                data,
                error,
            } = await supabase
                .from("inspections")
                .select("*")
                .eq(
                    "booking_id",
                    bookingId,
                )
                .eq(
                    "kind",
                    kind,
                )
                .order(
                    "created_at",
                    {
                        ascending: false,
                    },
                )
                .limit(1)
                .maybeSingle();

            if (error) {
                throw error;
            }

            return data;
        },
    });

// ============================================================
// RPC: create_inspection_draft
// ============================================================

export const useCreateInspectionDraft = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"create_inspection_draft">,
        Error,
        CreateInspectionDraftInput
    >({
        mutationKey: ["inspections", "create-draft"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "create_inspection_draft",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "create_inspection_draft n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: update_inspection_header
// ============================================================

export const useUpdateInspectionHeader = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"update_inspection_header">,
        Error,
        UpdateInspectionHeaderInput
    >({
        mutationKey: ["inspections", "update-header"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "update_inspection_header",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "update_inspection_header n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: add_inspection_room
// ============================================================

export const useAddInspectionRoom = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"add_inspection_room">,
        Error,
        AddInspectionRoomInput
    >({
        mutationKey: ["inspections", "rooms", "add"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "add_inspection_room",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "add_inspection_room n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: update_inspection_room
// ============================================================

export const useUpdateInspectionRoom = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"update_inspection_room">,
        Error,
        UpdateInspectionRoomInput
    >({
        mutationKey: ["inspections", "rooms", "update"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "update_inspection_room",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "update_inspection_room n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: delete_inspection_room
// ============================================================

export const useDeleteInspectionRoom = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"delete_inspection_room">,
        Error,
        DeleteInspectionRoomInput
    >({
        mutationKey: ["inspections", "rooms", "delete"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "delete_inspection_room",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "delete_inspection_room n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: add_inspection_item
// ============================================================

export const useAddInspectionItem = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"add_inspection_item">,
        Error,
        AddInspectionItemInput
    >({
        mutationKey: ["inspections", "items", "add"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "add_inspection_item",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "add_inspection_item n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: update_inspection_item
// ============================================================

export const useUpdateInspectionItem = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"update_inspection_item">,
        Error,
        UpdateInspectionItemInput
    >({
        mutationKey: ["inspections", "items", "update"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "update_inspection_item",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "update_inspection_item n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: delete_inspection_item
// ============================================================

export const useDeleteInspectionItem = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"delete_inspection_item">,
        Error,
        DeleteInspectionItemInput
    >({
        mutationKey: ["inspections", "items", "delete"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "delete_inspection_item",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "delete_inspection_item n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: add_inspection_meter
// ============================================================

export const useAddInspectionMeter = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"add_inspection_meter">,
        Error,
        AddInspectionMeterInput
    >({
        mutationKey: ["inspections", "meters", "add"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "add_inspection_meter",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "add_inspection_meter n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: update_inspection_meter
// ============================================================

export const useUpdateInspectionMeter = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"update_inspection_meter">,
        Error,
        UpdateInspectionMeterInput
    >({
        mutationKey: ["inspections", "meters", "update"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "update_inspection_meter",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "update_inspection_meter n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: delete_inspection_meter
// ============================================================

export const useDeleteInspectionMeter = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"delete_inspection_meter">,
        Error,
        DeleteInspectionMeterInput
    >({
        mutationKey: ["inspections", "meters", "delete"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "delete_inspection_meter",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "delete_inspection_meter n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: add_inspection_finding
// ============================================================

export const useAddInspectionFinding = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"add_inspection_finding">,
        Error,
        AddInspectionFindingInput
    >({
        mutationKey: ["inspections", "findings", "add"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "add_inspection_finding",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "add_inspection_finding n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: update_inspection_finding
// ============================================================

export const useUpdateInspectionFinding = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"update_inspection_finding">,
        Error,
        UpdateInspectionFindingInput
    >({
        mutationKey: ["inspections", "findings", "update"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "update_inspection_finding",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "update_inspection_finding n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: delete_inspection_finding
// ============================================================

export const useDeleteInspectionFinding = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"delete_inspection_finding">,
        Error,
        DeleteInspectionFindingInput
    >({
        mutationKey: ["inspections", "findings", "delete"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "delete_inspection_finding",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "delete_inspection_finding n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: register_inspection_document
// ============================================================

export const useRegisterInspectionDocument = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"register_inspection_document">,
        Error,
        RegisterInspectionDocumentInput
    >({
        mutationKey: ["inspections", "documents", "register"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "register_inspection_document",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "register_inspection_document n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: detach_inspection_document
// ============================================================

export const useDetachInspectionDocument = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"detach_inspection_document">,
        Error,
        DetachInspectionDocumentInput
    >({
        mutationKey: ["inspections", "documents", "detach"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "detach_inspection_document",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "detach_inspection_document n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: prepare_inspection_for_signature
// ============================================================

export const usePrepareInspectionForSignature = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"prepare_inspection_for_signature">,
        Error,
        PrepareInspectionForSignatureInput
    >({
        mutationKey: ["inspections", "prepare-for-signature"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "prepare_inspection_for_signature",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "prepare_inspection_for_signature n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: sign_inspection
// ============================================================

export const useSignInspection = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"sign_inspection">,
        Error,
        SignInspectionInput
    >({
        mutationKey: ["inspections", "sign"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "sign_inspection",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "sign_inspection n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: cancel_inspection
// ============================================================

export const useCancelInspection = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"cancel_inspection">,
        Error,
        CancelInspectionInput
    >({
        mutationKey: ["inspections", "cancel"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "cancel_inspection",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "cancel_inspection n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};

// ============================================================
// RPC: finalize_inspection
// ============================================================

export const useFinalizeInspection = () => {
    const invalidate = useInvalidateInspections();

    return useMutation<
        RpcResult<"finalize_inspection">,
        Error,
        FinalizeInspectionInput
    >({
        mutationKey: ["inspections", "finalize"],

        mutationFn: async (input) => {
            const { data, error } = await supabase.rpc(
                "finalize_inspection",
                input,
            );

            if (error) {
                throw error;
            }

            if (data === null) {
                throw new Error(
                    "finalize_inspection n'a retourné aucune donnée.",
                );
            }

            return data;
        },

        onSuccess: () => invalidate(),
    });
};
