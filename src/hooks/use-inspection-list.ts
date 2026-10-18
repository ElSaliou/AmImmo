import {
    useQuery,
} from "@tanstack/react-query";

import {
    supabase,
} from "@/integrations/supabase/client";

import type {
    InspectionKind,
    InspectionStatus,
} from "@/hooks/use-inspections";

const db =
    supabase as any;

// ============================================================
// TYPES
// ============================================================

export interface InspectionListProperty {
    id: string;
    reference: string | null;
    title: string | null;
    address: string | null;
    district: string | null;
    commune: string | null;
    city: string | null;
}

export interface InspectionListBooking {
    id: string;
    reference: string;
    guest_name: string | null;
    status: string;
    check_in: string;
    check_out: string;
}

export interface InspectionListLease {
    id: string;
    reference: string | null;
    status: string;
    start_date: string;
    end_date: string | null;
}

export interface InspectionListItem {
    id: string;

    reference: string | null;

    organization_id: string;
    property_id: string;

    lease_id: string | null;
    booking_id: string | null;

    kind: InspectionKind;
    status: InspectionStatus;

    performed_at: string;
    created_at: string;
    updated_at: string;

    finalized_at: string | null;

    version: number;

    property:
        | InspectionListProperty
        | null;

    booking:
        | InspectionListBooking
        | null;

    lease:
        | InspectionListLease
        | null;
}

// ============================================================
// HELPERS
// ============================================================

const firstRelation = <T>(
    value: unknown,
): T | null => {
    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    if (Array.isArray(value)) {
        return (
            (value[0] as T | undefined) ??
            null
        );
    }

    return value as T;
};

// ============================================================
// QUERY
// ============================================================

export const useInspectionList = () =>
    useQuery<InspectionListItem[]>({
        queryKey: [
            "inspections",
            "list",
        ],

        queryFn: async () => {
            const {
                data,
                error,
            } = await db
                .from("inspections")
                .select(`
                    id,
                    reference,
                    organization_id,
                    property_id,
                    lease_id,
                    booking_id,
                    kind,
                    status,
                    performed_at,
                    created_at,
                    updated_at,
                    finalized_at,
                    version,

                    property:properties!inspections_property_organization_fkey(
                        id,
                        reference,
                        title,
                        address,
                        district,
                        commune,
                        city
                    ),

                    booking:bookings!inspections_booking_organization_fkey(
                        id,
                        reference,
                        guest_name,
                        status,
                        check_in,
                        check_out
                    ),

                    lease:leases!inspections_lease_organization_fkey(
                        id,
                        reference,
                        status,
                        start_date,
                        end_date
                    )
                `)
                .order(
                    "performed_at",
                    {
                        ascending: false,
                    },
                )
                .order(
                    "created_at",
                    {
                        ascending: false,
                    },
                );

            if (error) {
                throw error;
            }

            return (
                data ?? []
            ).map(
                (
                    row: any,
                ): InspectionListItem => ({
                    id:
                        row.id,

                    reference:
                        row.reference ?? null,

                    organization_id:
                        row.organization_id,

                    property_id:
                        row.property_id,

                    lease_id:
                        row.lease_id ?? null,

                    booking_id:
                        row.booking_id ?? null,

                    kind:
                        row.kind,

                    status:
                        row.status,

                    performed_at:
                        row.performed_at,

                    created_at:
                        row.created_at,

                    updated_at:
                        row.updated_at,

                    finalized_at:
                        row.finalized_at ?? null,

                    version:
                        Number(
                            row.version ?? 1,
                        ),

                    property:
                        firstRelation<InspectionListProperty>(
                            row.property,
                        ),

                    booking:
                        firstRelation<InspectionListBooking>(
                            row.booking,
                        ),

                    lease:
                        firstRelation<InspectionListLease>(
                            row.lease,
                        ),
                }),
            );
        },
    });