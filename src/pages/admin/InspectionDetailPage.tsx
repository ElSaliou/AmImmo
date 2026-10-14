import {
    Link,
    useParams,
} from "react-router-dom";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import { InspectionHeader } from "@/components/inspections/InspectionHeader";
import { InspectionRoomEditor } from "@/components/inspections/InspectionRoomEditor";
import { InspectionMeterEditor } from "@/components/inspections/InspectionMeterEditor";
import { InspectionFindingEditor } from "@/components/inspections/InspectionFindingEditor";
import { InspectionDocumentEditor } from "@/components/inspections/InspectionDocumentEditor";
import { InspectionPreview } from "@/components/inspections/InspectionPreview";

import {
    useInspection,
} from "@/hooks/use-inspections";

import {
    useLease,
} from "@/hooks/use-leases";

import {
    useBooking,
} from "@/hooks/use-bookings";

export default function InspectionDetailPage() {
    const { inspectionId } =
        useParams<{
            inspectionId: string;
        }>();

    const inspection =
        useInspection(inspectionId);

    const snapshot =
        inspection.data;

    const leaseId =
        snapshot?.inspection.lease_id ??
        null;

    const bookingId =
        snapshot?.inspection.booking_id ??
        null;

    const lease =
        useLease(leaseId);

    const booking =
        useBooking(bookingId);

    if (!inspectionId) {
        return (
            <div className="rounded-lg border bg-card p-6">
                <h1 className="text-xl font-semibold">
                    État des lieux introuvable
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                    Aucun identifiant d’état des lieux
                    n’a été fourni.
                </p>
            </div>
        );
    }

    if (inspection.isLoading) {
        return (
            <div className="rounded-lg border bg-card p-6">
                Chargement de l’état des lieux...
            </div>
        );
    }

    if (
        inspection.isError ||
        !snapshot
    ) {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                >
                    <Link to="/admin/inspections">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour aux états des lieux
                    </Link>
                </Button>

                <div className="rounded-lg border border-destructive/50 bg-card p-6">
                    <h1 className="text-xl font-semibold">
                        Impossible de charger
                        l’état des lieux
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        {inspection.error instanceof Error
                            ? inspection.error.message
                            : "L’état des lieux est indisponible."}
                    </p>
                </div>
            </div>
        );
    }

    const sourceLoading =
        leaseId
            ? lease.isLoading
            : booking.isLoading;

    const sourceError =
        leaseId
            ? lease.isError
            : booking.isError;

    return (
        <div className="space-y-6">
            <Button
                variant="ghost"
                size="sm"
                asChild
            >
                <Link to="/admin/inspections">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour aux états des lieux
                </Link>
            </Button>

            <InspectionHeader
                inspection={
                    snapshot.inspection
                }
                lease={
                    lease.data ?? null
                }
                booking={
                    booking.data ?? null
                }
                sourceLoading={
                    sourceLoading
                }
                sourceError={
                    sourceError
                }
            />

            <InspectionPreview
                snapshot={
                    snapshot
                }
            />

            <InspectionRoomEditor
                inspectionId={
                    snapshot.inspection.id
                }
                status={
                    snapshot.inspection.status
                }
                rooms={
                    snapshot.rooms
                }
            />

            <InspectionMeterEditor
                inspectionId={
                    snapshot.inspection.id
                }
                status={
                    snapshot.inspection.status
                }
                meters={
                    snapshot.meters
                }
            />

            <InspectionFindingEditor
                inspectionId={
                    snapshot.inspection.id
                }
                status={
                    snapshot.inspection.status
                }
                findings={
                    snapshot.findings
                }
                rooms={
                    snapshot.rooms
                }
            />

            <InspectionDocumentEditor
                inspectionId={
                    snapshot.inspection.id
                }
                organizationId={
                    snapshot.inspection.organization_id
                }
                status={
                    snapshot.inspection.status
                }
                documents={
                    snapshot.documents
                }
                rooms={
                    snapshot.rooms
                }
                meters={
                    snapshot.meters
                }
                findings={
                    snapshot.findings
                }
            />
        </div>
    );
}