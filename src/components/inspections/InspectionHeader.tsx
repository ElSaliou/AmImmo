import {
    Building2,
    CalendarDays,
    FileText,
    UserRound,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { InspectionStatusBadge } from "@/components/inspections/InspectionStatusBadge";

import type {
    InspectionHeader as InspectionHeaderData,
} from "@/hooks/use-inspections";

type LeaseContext = {
    reference?: string | null;
    start_date?: string | null;
    end_date?: string | null;

    property?: {
        id?: string;
        title?: string | null;
    } | null;

    tenant?: {
        id?: string;
        full_name?: string | null;
        email?: string | null;
        phone?: string | null;
    } | null;
} | null;

type BookingContext = {
    reference: string;
    check_in: string;
    check_out: string;

    guest_name?: string | null;
    guest_email?: string | null;
    guest_phone?: string | null;

    guest?: {
        id: string;
        full_name: string;
        email: string | null;
        phone: string;
    } | null;

    property?: {
        id: string;
        reference: string | null;
        title: string | null;
        commune: string | null;
        district: string | null;
        city: string | null;
    } | null;
} | null;

type InspectionHeaderProps = {
    inspection: InspectionHeaderData;
    lease?: LeaseContext;
    booking?: BookingContext;
    sourceLoading?: boolean;
    sourceError?: boolean;
};

const formatDate = (
    value: string | null | undefined,
) => {
    if (!value) {
        return "—";
    }

    const dateOnly =
        /^\d{4}-\d{2}-\d{2}$/.test(value);

    const date = dateOnly
        ? new Date(`${value}T12:00:00`)
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        },
    ).format(date);
};

const InfoItem = ({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) => (
    <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
        </p>

        <div className="text-sm font-medium text-foreground">
            {value || "—"}
        </div>
    </div>
);

export function InspectionHeader({
    inspection,
    lease,
    booking,
    sourceLoading = false,
    sourceError = false,
}: InspectionHeaderProps) {
    const isLease =
        Boolean(inspection.lease_id);

    const kindLabel =
        inspection.kind === "checkin"
            ? "État des lieux d’entrée"
            : "État des lieux de sortie";

    const partyLabel =
        isLease
            ? "Locataire"
            : "Voyageur";

    const partyName =
        isLease
            ? lease?.tenant?.full_name
            : booking?.guest?.full_name ||
              booking?.guest_name;

    const partyEmail =
        isLease
            ? lease?.tenant?.email
            : booking?.guest?.email ||
              booking?.guest_email;

    const partyPhone =
        isLease
            ? lease?.tenant?.phone
            : booking?.guest?.phone ||
              booking?.guest_phone;

    const propertyTitle =
        isLease
            ? lease?.property?.title
            : booking?.property?.title;

    const sourceReference =
        isLease
            ? lease?.reference
            : booking?.reference;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {kindLabel}
                        </h1>

                        <InspectionStatusBadge
                            status={inspection.status}
                        />
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Référence{" "}
                        <span className="font-medium text-foreground">
                            {inspection.reference}
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md border bg-card px-3 py-1.5">
                        Version {inspection.version}
                    </span>

                    <span className="rounded-md border bg-card px-3 py-1.5">
                        {isLease
                            ? "Location longue durée"
                            : "Location courte durée"}
                    </span>
                </div>
            </div>

            <Card>
                <CardContent className="p-5">
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoItem
                            label="Date de l’état des lieux"
                            value={
                                <span className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                    {formatDate(
                                        inspection.performed_at,
                                    )}
                                </span>
                            }
                        />

                        <InfoItem
                            label={
                                isLease
                                    ? "Bail"
                                    : "Réservation"
                            }
                            value={
                                sourceLoading
                                    ? "Chargement..."
                                    : sourceError
                                      ? "Source indisponible"
                                      : (
                                            <span className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                {sourceReference ||
                                                    "—"}
                                            </span>
                                        )
                            }
                        />

                        <InfoItem
                            label="Bien"
                            value={
                                sourceLoading
                                    ? "Chargement..."
                                    : (
                                            <span className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                {propertyTitle ||
                                                    "Bien lié"}
                                            </span>
                                        )
                            }
                        />

                        <InfoItem
                            label={partyLabel}
                            value={
                                sourceLoading
                                    ? "Chargement..."
                                    : (
                                            <span className="flex items-center gap-2">
                                                <UserRound className="h-4 w-4 text-muted-foreground" />
                                                {partyName ||
                                                    "—"}
                                            </span>
                                        )
                            }
                        />
                    </div>

                    <div className="my-5 border-t" />

                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {isLease ? (
                            <>
                                <InfoItem
                                    label="Début du bail"
                                    value={formatDate(
                                        lease?.start_date,
                                    )}
                                />

                                <InfoItem
                                    label="Fin du bail"
                                    value={formatDate(
                                        lease?.end_date,
                                    )}
                                />
                            </>
                        ) : (
                            <>
                                <InfoItem
                                    label="Arrivée"
                                    value={formatDate(
                                        booking?.check_in,
                                    )}
                                />

                                <InfoItem
                                    label="Départ"
                                    value={formatDate(
                                        booking?.check_out,
                                    )}
                                />
                            </>
                        )}

                        <InfoItem
                            label="Téléphone"
                            value={partyPhone || "—"}
                        />

                        <InfoItem
                            label="E-mail"
                            value={partyEmail || "—"}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}