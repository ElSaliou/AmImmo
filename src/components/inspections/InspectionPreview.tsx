import {
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    CheckCircle2,
    Eye,
    LockKeyhole,
    Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
    type InspectionSnapshot,
    usePrepareInspectionForSignature,
} from "@/hooks/use-inspections";

type InspectionPreviewProps = {
    snapshot: InspectionSnapshot;
};

const CONDITION_LABELS: Record<string, string> = {
    excellent: "Excellent",
    good: "Bon",
    fair: "Moyen",
    poor: "Mauvais",
    damaged: "Endommagé",
    not_applicable: "Non applicable",
};

const SEVERITY_LABELS: Record<string, string> = {
    minor: "Faible",
    moderate: "Moyenne",
    major: "Élevée",
    critical: "Critique",
};

const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
    overview: "Vue générale",
    room: "Pièce",
    item: "Équipement",
    meter: "Compteur",
    finding: "Constat",
    other: "Autre",
};

const getErrorMessage = (
    error: unknown,
) =>
    error instanceof Error
        ? error.message
        : "Une erreur est survenue.";

const formatDate = (
    value: string | null,
) => {
    if (!value) {
        return "Non renseignée";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            dateStyle: "long",
            timeStyle: "short",
        },
    ).format(date);
};

const formatMoney = (
    value: number | null,
) => {
    if (value === null) {
        return null;
    }

    return `${new Intl.NumberFormat(
        "fr-FR",
        {
            maximumFractionDigits: 0,
        },
    ).format(value)} GNF`;
};

export function InspectionPreview({
    snapshot,
}: InspectionPreviewProps) {
    const prepare =
        usePrepareInspectionForSignature();

    const [
        actionError,
        setActionError,
    ] =
        useState<string | null>(
            null,
        );

    const inspection =
        snapshot.inspection;

    const rooms =
        snapshot.rooms;

    const meters =
        snapshot.meters;

    const findings =
        snapshot.findings;

    const documents =
        snapshot.documents;

    const signatures =
        snapshot.signatures;

    const itemCount =
        useMemo(
            () =>
                rooms.reduce(
                    (
                        total,
                        room,
                    ) =>
                        total +
                        room.items.length,
                    0,
                ),
            [rooms],
        );

    const unresolvedFindingCount =
        useMemo(
            () =>
                findings.filter(
                    (finding) =>
                        !finding.resolved,
                ).length,
            [findings],
        );

    const canPrepare =
        inspection.status === "draft" &&
        rooms.length > 0 &&
        signatures.length === 0;

    const isLocked =
        inspection.status !== "draft";

    const counterpartyLabel =
        inspection.lease_id
            ? "Locataire"
            : "Voyageur";

    const kindLabel =
        inspection.kind === "checkin"
            ? "État des lieux d’entrée"
            : "État des lieux de sortie";

    const handlePrepare =
        async () => {
            if (
                !canPrepare ||
                prepare.isPending
            ) {
                return;
            }

            const confirmed =
                window.confirm(
                    [
                        "Préparer cet état des lieux pour signature ?",
                        "",
                        `Version concernée : ${inspection.version}`,
                        "",
                        "Cette opération verrouillera le contenu.",
                        "Les pièces, équipements, compteurs, constats et documents ne pourront plus être modifiés.",
                        "",
                        "Signataires requis : agence + " +
                            counterpartyLabel.toLowerCase() +
                            ".",
                    ].join("\n"),
                );

            if (!confirmed) {
                return;
            }

            setActionError(
                null,
            );

            try {
                await prepare.mutateAsync({
                    p_inspection_id:
                        inspection.id,

                    p_expected_version:
                        inspection.version,
                });
            } catch (error) {
                setActionError(
                    getErrorMessage(
                        error,
                    ),
                );
            }
        };

    return (
        <section className="space-y-4 rounded-lg border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />

                        <h2 className="text-lg font-semibold">
                            Prévisualisation avant signature
                        </h2>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Vérifiez le contenu complet avant de verrouiller
                        cette version de l’état des lieux.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full border px-3 py-1">
                        Version {inspection.version}
                    </span>

                    {isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1">
                            <LockKeyhole className="h-3.5 w-3.5" />
                            Contenu verrouillé
                        </span>
                    )}
                </div>
            </div>

            {actionError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {actionError}
                </div>
            )}

            {inspection.status === "draft" &&
                rooms.length === 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <AlertTriangle className="mr-2 inline h-4 w-4" />
                        Ajoutez au moins une pièce avant de préparer
                        l’état des lieux pour signature.
                    </div>
                )}

            {inspection.status === "draft" &&
                signatures.length > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <AlertTriangle className="mr-2 inline h-4 w-4" />
                        Des signatures existent déjà sur ce brouillon.
                        Le backend refusera son passage à la signature.
                    </div>
                )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                        Pièces
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                        {rooms.length}
                    </p>
                </div>

                <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                        Équipements
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                        {itemCount}
                    </p>
                </div>

                <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                        Compteurs
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                        {meters.length}
                    </p>
                </div>

                <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                        Constats ouverts
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                        {unresolvedFindingCount}
                    </p>
                </div>

                <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                        Documents
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                        {documents.length}
                    </p>
                </div>
            </div>

            <details className="rounded-lg border">
                <summary className="cursor-pointer select-none px-4 py-3 font-medium">
                    Voir la prévisualisation détaillée
                </summary>

                <div className="space-y-6 border-t p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Type
                            </p>

                            <p className="mt-1 text-sm">
                                {kindLabel}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Référence
                            </p>

                            <p className="mt-1 text-sm">
                                {inspection.reference ||
                                    "Sans référence"}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Date
                            </p>

                            <p className="mt-1 text-sm">
                                {formatDate(
                                    inspection.performed_at,
                                )}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Contrepartie
                            </p>

                            <p className="mt-1 text-sm">
                                {counterpartyLabel}
                            </p>
                        </div>
                    </div>

                    {inspection.observations && (
                        <div>
                            <p className="text-sm font-semibold">
                                Observations générales
                            </p>

                            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/30 p-3 text-sm">
                                {inspection.observations}
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <h3 className="font-semibold">
                            Pièces et équipements
                        </h3>

                        {rooms.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aucune pièce.
                            </p>
                        ) : (
                            rooms.map(
                                (room) => (
                                    <div
                                        key={room.id}
                                        className="rounded-lg border p-4"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-medium">
                                                {room.name}
                                            </p>

                                            <span className="text-xs text-muted-foreground">
                                                {CONDITION_LABELS[
                                                    room.condition
                                                ] ??
                                                    room.condition}
                                            </span>
                                        </div>

                                        {room.observations && (
                                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                                {room.observations}
                                            </p>
                                        )}

                                        {room.items.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {room.items.map(
                                                    (item) => (
                                                        <div
                                                            key={item.id}
                                                            className="rounded-md bg-muted/30 px-3 py-2 text-sm"
                                                        >
                                                            <div className="flex flex-wrap justify-between gap-2">
                                                                <span>
                                                                    {item.name}
                                                                    {" · "}
                                                                    Qté{" "}
                                                                    {item.quantity}
                                                                </span>

                                                                <span className="text-muted-foreground">
                                                                    {CONDITION_LABELS[
                                                                        item.condition
                                                                    ] ??
                                                                        item.condition}
                                                                </span>
                                                            </div>

                                                            {item.observations && (
                                                                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                                                                    {item.observations}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ),
                            )
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold">
                            Compteurs
                        </h3>

                        {meters.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aucun relevé de compteur.
                            </p>
                        ) : (
                            meters.map(
                                (meter) => (
                                    <div
                                        key={meter.id}
                                        className="rounded-lg border p-3 text-sm"
                                    >
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <span className="font-medium">
                                                {meter.meter_type}
                                                {meter.meter_number
                                                    ? ` · ${meter.meter_number}`
                                                    : ""}
                                            </span>

                                            <span>
                                                {meter.reading}{" "}
                                                {meter.unit || ""}
                                            </span>
                                        </div>

                                        {meter.observations && (
                                            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                                                {meter.observations}
                                            </p>
                                        )}
                                    </div>
                                ),
                            )
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold">
                            Anomalies et constats
                        </h3>

                        {findings.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aucun constat.
                            </p>
                        ) : (
                            findings.map(
                                (finding) => (
                                    <div
                                        key={finding.id}
                                        className="rounded-lg border p-3 text-sm"
                                    >
                                        <div className="flex flex-wrap justify-between gap-2">
                                            <div>
                                                <p className="font-medium">
                                                    {finding.title}
                                                </p>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {SEVERITY_LABELS[
                                                        finding.severity
                                                    ] ??
                                                        finding.severity}
                                                    {" · "}
                                                    {finding.resolved
                                                        ? "Résolu"
                                                        : "Ouvert"}
                                                </p>
                                            </div>

                                            {formatMoney(
                                                finding.estimated_cost,
                                            ) && (
                                                <span>
                                                    {formatMoney(
                                                        finding.estimated_cost,
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {finding.description && (
                                            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                                                {finding.description}
                                            </p>
                                        )}
                                    </div>
                                ),
                            )
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold">
                            Photos et documents
                        </h3>

                        {documents.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aucun document joint.
                            </p>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {documents.map(
                                    (document) => (
                                        <div
                                            key={document.id}
                                            className="rounded-lg border p-3 text-sm"
                                        >
                                            {DOCUMENT_CATEGORY_LABELS[
                                                document.category
                                            ] ??
                                                document.category}
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
                        <p className="font-medium">
                            Signataires requis après verrouillage
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Agence
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {counterpartyLabel}
                            </span>
                        </div>
                    </div>
                </div>
            </details>

            {inspection.status === "draft" ? (
                <div className="flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-sm text-muted-foreground">
                        La préparation conserve la version{" "}
                        <strong className="text-foreground">
                            {inspection.version}
                        </strong>{" "}
                        et verrouille définitivement le contenu pour
                        cette phase de signature.
                    </div>

                    <Button
                        type="button"
                        onClick={() =>
                            void handlePrepare()
                        }
                        disabled={
                            !canPrepare ||
                            prepare.isPending
                        }
                    >
                        <Send className="mr-2 h-4 w-4" />

                        {prepare.isPending
                            ? "Préparation..."
                            : "Préparer pour signature"}
                    </Button>
                </div>
            ) : (
                <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />

                    <div>
                        <p className="font-medium">
                            État des lieux verrouillé
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Cette version n’est plus modifiable.
                            Le workflow peut maintenant poursuivre
                            vers la signature.
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}