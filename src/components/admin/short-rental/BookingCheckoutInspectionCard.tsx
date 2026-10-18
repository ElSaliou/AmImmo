import {
    ClipboardCheck,
    Eye,
    Loader2,
    Plus,
} from "lucide-react";

import {
    useNavigate,
} from "react-router-dom";

import {
    toast,
} from "sonner";

import {
    InspectionStatusBadge,
} from "@/components/inspections/InspectionStatusBadge";

import {
    useBookingInspection,
    useCreateInspectionDraft,
} from "@/hooks/use-inspections";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import {
    Button,
} from "@/components/ui/button";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

// ============================================================
// PROPS
// ============================================================

interface BookingCheckoutInspectionCardProps {
    bookingId: string;

    bookingReference:
        | string
        | null
        | undefined;

    bookingStatus: string;

    checkedOutAt:
        | string
        | null
        | undefined;
}

// ============================================================
// HELPERS
// ============================================================

const formatDateTime = (
    value:
        | string
        | null
        | undefined,
) => {
    if (!value) {
        return "—";
    }

    try {
        return new Intl.DateTimeFormat(
            "fr-FR",
            {
                dateStyle: "medium",
                timeStyle: "short",
            },
        ).format(
            new Date(value),
        );
    } catch {
        return value;
    }
};

const getCreatedInspectionId = (
    value: unknown,
): string | null => {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        return null;
    }

    const inspectionId =
        (
            value as Record<
                string,
                unknown
            >
        ).inspection_id;

    return typeof inspectionId ===
        "string"
        ? inspectionId
        : null;
};

// ============================================================
// COMPONENT
// ============================================================

export default function BookingCheckoutInspectionCard({
    bookingId,
    bookingReference,
    bookingStatus,
    checkedOutAt,
}: BookingCheckoutInspectionCardProps) {
    const navigate =
        useNavigate();

    const inspection =
        useBookingInspection(
            bookingId,
            "checkout",
        );

    const createInspection =
        useCreateInspectionDraft();

    const existingInspection =
        inspection.data ?? null;

    const checkoutCompleted =
        bookingStatus ===
            "completed" &&
        Boolean(
            checkedOutAt,
        );

    const openInspection = (
        inspectionId: string,
    ) => {
        navigate(
            `/admin/inspections/${inspectionId}`,
        );
    };

    const handleCreate =
        async () => {
            if (
                !checkoutCompleted ||
                createInspection.isPending
            ) {
                return;
            }

            try {
                const result =
                    await createInspection.mutateAsync({
                        p_kind:
                            "checkout",

                        p_booking_id:
                            bookingId,

                        p_performed_at:
                            new Date().toISOString(),

                        p_observations:
                            `État des lieux de sortie de la réservation ${
                                bookingReference ||
                                bookingId
                            }.`,
                    });

                const inspectionId =
                    getCreatedInspectionId(
                        result,
                    );

                if (!inspectionId) {
                    throw new Error(
                        "Le serveur n'a pas retourné l'identifiant de l'état des lieux.",
                    );
                }

                toast.success(
                    "État des lieux de sortie créé en brouillon.",
                );

                openInspection(
                    inspectionId,
                );
            } catch (
                creationError
            ) {
                console.error(
                    "[BookingCheckoutInspectionCard] Création EDL sortie :",
                    creationError,
                );

                const refreshed =
                    await inspection.refetch();

                if (
                    refreshed.data?.id
                ) {
                    toast.info(
                        "Un état des lieux de sortie existe déjà pour cette réservation.",
                    );

                    openInspection(
                        refreshed.data.id,
                    );

                    return;
                }

                toast.error(
                    creationError instanceof
                    Error
                        ? creationError.message
                        : "Impossible de créer l'état des lieux de sortie.",
                );
            }
        };

    return (
        <Card className="premium-card">
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ClipboardCheck className="h-5 w-5" />

                            État des lieux de sortie
                        </CardTitle>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Contrôlez le logement après le départ avant de décider de la restitution de la caution.
                        </p>
                    </div>

                    {existingInspection && (
                        <InspectionStatusBadge
                            status={
                                existingInspection.status
                            }
                        />
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {inspection.isLoading ? (
                    <div className="flex min-h-[90px] items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />

                        Vérification de l'état des lieux...
                    </div>
                ) : inspection.isError ? (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Impossible de vérifier l'état des lieux de sortie :{" "}
                            {inspection.error instanceof
                            Error
                                ? inspection.error.message
                                : "erreur inconnue"}
                        </AlertDescription>
                    </Alert>
                ) : existingInspection ? (
                    <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-medium">
                                {existingInspection.reference ||
                                    "État des lieux de sortie"}
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Réalisé le{" "}
                                {formatDateTime(
                                    existingInspection.performed_at,
                                )}
                            </p>

                            {existingInspection.finalized_at && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Finalisé le{" "}
                                    {formatDateTime(
                                        existingInspection.finalized_at,
                                    )}
                                </p>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            onClick={() =>
                                openInspection(
                                    existingInspection.id,
                                )
                            }
                        >
                            <Eye className="mr-2 h-4 w-4" />

                            Ouvrir l'état des lieux
                        </Button>
                    </div>
                ) : !checkoutCompleted ? (
                    <div className="rounded-lg border border-dashed p-5">
                        <p className="font-medium">
                            État des lieux de sortie non disponible
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Le check-out doit être effectué avant de créer l'état des lieux de sortie.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-medium">
                                Check-out effectué
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Aucun état des lieux de sortie n'est encore rattaché à cette réservation.
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Check-out :{" "}
                                {formatDateTime(
                                    checkedOutAt,
                                )}
                            </p>
                        </div>

                        <Button
                            onClick={
                                handleCreate
                            }
                            disabled={
                                createInspection.isPending
                            }
                        >
                            {createInspection.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}

                            Créer l'état des lieux de sortie
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}