import { useParams } from "react-router-dom";

import { useInspection } from "@/hooks/use-inspections";

export default function TenantInspectionPage() {
    const { inspectionId } = useParams<{
        inspectionId: string;
    }>();

    const inspection = useInspection(inspectionId);

    if (!inspectionId) {
        return (
            <div className="rounded-lg border bg-card p-6">
                <h1 className="text-xl font-semibold">
                    État des lieux introuvable
                </h1>
            </div>
        );
    }

    if (inspection.isLoading) {
        return (
            <div className="rounded-lg border bg-card p-6">
                Chargement de l'état des lieux...
            </div>
        );
    }

    if (inspection.isError) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-card p-6">
                <h1 className="text-xl font-semibold">
                    Impossible de charger l'état des lieux
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                    {inspection.error instanceof Error
                        ? inspection.error.message
                        : "Une erreur inconnue est survenue."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Mon état des lieux
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Consultez et signez votre état des lieux.
                </p>
            </div>

            <div className="rounded-lg border bg-card p-6">
                <h2 className="font-medium">
                    État des lieux chargé
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                    La consultation détaillée et la signature seront
                    activées dans les prochaines étapes.
                </p>
            </div>
        </div>
    );
}