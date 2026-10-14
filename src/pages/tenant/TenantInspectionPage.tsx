import {
    useState,
} from "react";

import {
    useParams,
} from "react-router-dom";

import {
    BadgeCheck,
    Clock3,
    FileText,
    Gauge,
    Home,
    ListChecks,
    PenLine,
    TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    type InspectionSignatureSnapshot,
    type InspectionSnapshot,
    useInspection,
    useSignInspection,
} from "@/hooks/use-inspections";


const conditionLabels: Record<
    string,
    string
> = {
    excellent: "Excellent",
    good: "Bon",
    fair: "Correct",
    poor: "Mauvais",
    damaged: "Endommagé",
    not_applicable: "Non applicable",
};

const kindLabels: Record<
    string,
    string
> = {
    checkin: "État des lieux d'entrée",
    checkout: "État des lieux de sortie",
};

const statusLabels: Record<
    string,
    string
> = {
    draft: "Brouillon",
    ready_for_signature: "À signer",
    finalized: "Finalisé",
    cancelled: "Annulé",
};

const severityLabels: Record<
    string,
    string
> = {
    minor: "Mineure",
    moderate: "Modérée",
    major: "Majeure",
    critical: "Critique",
};


const formatDateTime = (
    value: string | null,
) => {
    if (!value) {
        return "—";
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


const getErrorMessage = (
    error: unknown,
) =>
    error instanceof Error
        ? error.message
        : "Une erreur est survenue.";


const SignatureStatus = ({
    title,
    signature,
}: {
    title: string;
    signature:
        | InspectionSignatureSnapshot
        | undefined;
}) => {
    return (
        <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">
                {title}
            </h3>

            {signature ? (
                <div className="mt-3 flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />

                    <div>
                        <p className="text-sm font-medium">
                            Signé par{" "}
                            {signature.signer_name}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(
                                signature.signed_at,
                            )}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Version{" "}
                            {signature.accepted_version}
                            {" · "}
                            {signature.signature_method}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="mt-3 flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

                    <p className="text-sm text-muted-foreground">
                        En attente de signature.
                    </p>
                </div>
            )}
        </div>
    );
};


const InspectionReadOnlyView = ({
    snapshot,
}: {
    snapshot: InspectionSnapshot;
}) => {
    const {
        inspection,
        rooms,
        meters,
        findings,
        documents,
    } = snapshot;

    return (
        <div className="space-y-6">
            <section className="rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2">
                    <Home className="h-5 w-5" />

                    <h2 className="text-lg font-semibold">
                        Informations générales
                    </h2>
                </div>

                <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <dt className="text-xs text-muted-foreground">
                            Référence
                        </dt>

                        <dd className="mt-1 font-medium">
                            {inspection.reference ??
                                inspection.id}
                        </dd>
                    </div>

                    <div>
                        <dt className="text-xs text-muted-foreground">
                            Type
                        </dt>

                        <dd className="mt-1 font-medium">
                            {kindLabels[
                                inspection.kind
                            ] ??
                                inspection.kind}
                        </dd>
                    </div>

                    <div>
                        <dt className="text-xs text-muted-foreground">
                            Statut
                        </dt>

                        <dd className="mt-1 font-medium">
                            {statusLabels[
                                inspection.status
                            ] ??
                                inspection.status}
                        </dd>
                    </div>

                    <div>
                        <dt className="text-xs text-muted-foreground">
                            Version
                        </dt>

                        <dd className="mt-1 font-medium">
                            {inspection.version}
                        </dd>
                    </div>

                    <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">
                            Date de l'état des lieux
                        </dt>

                        <dd className="mt-1 font-medium">
                            {formatDateTime(
                                inspection.performed_at,
                            )}
                        </dd>
                    </div>
                </dl>

                {inspection.observations && (
                    <div className="mt-5 border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                            Observations générales
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm">
                            {inspection.observations}
                        </p>
                    </div>
                )}
            </section>

            <section className="rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5" />

                    <h2 className="text-lg font-semibold">
                        Pièces et équipements
                    </h2>
                </div>

                {rooms.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                        Aucune pièce enregistrée.
                    </p>
                ) : (
                    <div className="mt-4 space-y-4">
                        {rooms.map(
                            (
                                room,
                                roomIndex,
                            ) => (
                                <div
                                    key={
                                        room.id
                                    }
                                    className="rounded-lg border p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-semibold">
                                                {room.name ||
                                                    `Pièce ${roomIndex + 1}`}
                                            </h3>

                                            {room.room_type && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {room.room_type}
                                                </p>
                                            )}
                                        </div>

                                        <span className="rounded-full border px-2.5 py-1 text-xs">
                                            {room.condition
                                                ? conditionLabels[
                                                      room.condition
                                                  ] ??
                                                  room.condition
                                                : "Non renseigné"}
                                        </span>
                                    </div>

                                    {room.observations && (
                                        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                                            {room.observations}
                                        </p>
                                    )}

                                    {room.items.length > 0 && (
                                        <div className="mt-4 space-y-2 border-t pt-4">
                                            {room.items.map(
                                                (
                                                    item,
                                                ) => (
                                                    <div
                                                        key={
                                                            item.id
                                                        }
                                                        className="rounded-md bg-muted/40 p-3"
                                                    >
                                                        <div className="flex flex-wrap justify-between gap-2">
                                                            <p className="text-sm font-medium">
                                                                {item.name}
                                                            </p>

                                                            <p className="text-xs text-muted-foreground">
                                                                {item.condition
                                                                    ? conditionLabels[
                                                                          item.condition
                                                                      ] ??
                                                                      item.condition
                                                                    : "Non renseigné"}
                                                            </p>
                                                        </div>

                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Quantité :{" "}
                                                            {item.quantity ??
                                                                1}
                                                        </p>

                                                        {item.observations && (
                                                            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                                                                {
                                                                    item.observations
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            ),
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />

                    <h2 className="text-lg font-semibold">
                        Compteurs
                    </h2>
                </div>

                {meters.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                        Aucun compteur enregistré.
                    </p>
                ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {meters.map(
                            (meter) => (
                                <div
                                    key={
                                        meter.id
                                    }
                                    className="rounded-lg border p-4"
                                >
                                    <p className="font-medium">
                                        {meter.meter_type}
                                    </p>

                                    {meter.meter_number && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            N°{" "}
                                            {meter.meter_number}
                                        </p>
                                    )}

                                    <p className="mt-3 text-sm">
                                        Relevé :{" "}
                                        <strong>
                                            {meter.reading}
                                            {meter.unit
                                                ? ` ${meter.unit}`
                                                : ""}
                                        </strong>
                                    </p>

                                    {meter.observations && (
                                        <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                                            {meter.observations}
                                        </p>
                                    )}
                                </div>
                            ),
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2">
                    <TriangleAlert className="h-5 w-5" />

                    <h2 className="text-lg font-semibold">
                        Constats et anomalies
                    </h2>
                </div>

                {findings.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                        Aucun constat enregistré.
                    </p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {findings.map(
                            (finding) => (
                                <div
                                    key={
                                        finding.id
                                    }
                                    className="rounded-lg border p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <p className="font-medium">
                                            {finding.title}
                                        </p>

                                        <span className="rounded-full border px-2.5 py-1 text-xs">
                                            {severityLabels[
                                                finding.severity ??
                                                    ""
                                            ] ??
                                                finding.severity ??
                                                "Non renseignée"}
                                        </span>
                                    </div>

                                    {finding.description && (
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                            {finding.description}
                                        </p>
                                    )}

                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {finding.resolved
                                            ? "Résolu"
                                            : "Non résolu"}
                                    </p>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />

                    <h2 className="text-lg font-semibold">
                        Documents et photos
                    </h2>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                    {documents.length} document
                    {documents.length > 1
                        ? "s"
                        : ""}{" "}
                    associé
                    {documents.length > 1
                        ? "s"
                        : ""}{" "}
                    à cet état des lieux.
                </p>

                {documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {documents.map(
                            (
                                document,
                                index,
                            ) => (
                                <div
                                    key={
                                        document.id
                                    }
                                    className="flex items-center justify-between rounded-md border px-3 py-2"
                                >
                                    <span className="text-sm">
                                        Document{" "}
                                        {index + 1}
                                    </span>

                                    <span className="text-xs text-muted-foreground">
                                        {document.category ??
                                            "other"}
                                    </span>
                                </div>
                            ),
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};


export default function TenantInspectionPage() {
    const {
        inspectionId,
    } = useParams<{
        inspectionId: string;
    }>();

    const inspectionQuery =
        useInspection(
            inspectionId,
        );

    const signInspection =
        useSignInspection();

    const [
        signerName,
        setSignerName,
    ] =
        useState("");

    const [
        accepted,
        setAccepted,
    ] =
        useState(false);

    const [
        actionError,
        setActionError,
    ] =
        useState<string | null>(
            null,
        );


    if (!inspectionId) {
        return (
            <div className="rounded-lg border bg-card p-6">
                <h1 className="text-xl font-semibold">
                    État des lieux introuvable
                </h1>
            </div>
        );
    }


    if (inspectionQuery.isLoading) {
        return (
            <div className="rounded-lg border bg-card p-6">
                Chargement de l'état des lieux...
            </div>
        );
    }


    if (inspectionQuery.isError) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-card p-6">
                <h1 className="text-xl font-semibold">
                    Impossible de charger l'état des lieux
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                    {inspectionQuery.error instanceof Error
                        ? inspectionQuery.error.message
                        : "Une erreur inconnue est survenue."}
                </p>
            </div>
        );
    }


    const snapshot =
        inspectionQuery.data;

    if (!snapshot) {
        return (
            <div className="rounded-lg border bg-card p-6">
                <h1 className="text-xl font-semibold">
                    État des lieux introuvable
                </h1>
            </div>
        );
    }


    const currentInspection =
        snapshot.inspection;

    const counterpartyRole =
        currentInspection.lease_id
            ? "tenant"
            : currentInspection.booking_id
              ? "guest"
              : null;

    const counterpartyLabel =
        counterpartyRole ===
        "guest"
            ? "Voyageur"
            : "Locataire";

    const agencySignature =
        snapshot.signatures.find(
            (signature) =>
                signature.signer_role ===
                "agency",
        );

    const counterpartySignature =
        counterpartyRole
            ? snapshot.signatures.find(
                  (signature) =>
                      signature.signer_role ===
                      counterpartyRole,
              )
            : undefined;

    const trimmedName =
        signerName.trim();

    const canSign =
        counterpartyRole !== null &&
        currentInspection.status ===
            "ready_for_signature" &&
        !counterpartySignature;

    const canSubmit =
        canSign &&
        trimmedName.length > 0 &&
        trimmedName.length <= 255 &&
        accepted &&
        !signInspection.isPending;


    const handleSignature =
        async () => {
            if (
                !canSubmit ||
                !counterpartyRole
            ) {
                return;
            }

            const confirmed =
                window.confirm(
                    [
                        "Confirmer votre signature ?",
                        "",
                        `Signataire : ${trimmedName}`,
                        `Rôle : ${counterpartyLabel}`,
                        `Version acceptée : ${currentInspection.version}`,
                        "",
                        "Cette signature sera enregistrée de manière permanente pour cette version de l'état des lieux.",
                    ].join("\n"),
                );

            if (!confirmed) {
                return;
            }

            setActionError(
                null,
            );

            try {
                await signInspection.mutateAsync({
                    p_inspection_id:
                        currentInspection.id,

                    p_signer_role:
                        counterpartyRole,

                    p_signer_name:
                        trimmedName,

                    p_signature_method:
                        "typed",

                    p_accepted_version:
                        currentInspection.version,
                });

                setSignerName("");
                setAccepted(false);
            } catch (error) {
                setActionError(
                    getErrorMessage(
                        error,
                    ),
                );
            }
        };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Mon état des lieux
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Consultez le contenu complet avant de le signer.
                </p>
            </div>

            <InspectionReadOnlyView
                snapshot={
                    snapshot
                }
            />

            <section className="space-y-5 rounded-lg border bg-card p-5">
                <div className="flex items-center gap-2">
                    <PenLine className="h-5 w-5" />

                    <div>
                        <h2 className="text-lg font-semibold">
                            Signatures
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Version{" "}
                            {currentInspection.version}
                        </p>
                    </div>
                </div>

                {actionError && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {actionError}
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <SignatureStatus
                        title="Agence"
                        signature={
                            agencySignature
                        }
                    />

                    <SignatureStatus
                        title={
                            counterpartyLabel
                        }
                        signature={
                            counterpartySignature
                        }
                    />
                </div>

                {!counterpartyRole && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        La source de cet état des lieux est invalide.
                    </div>
                )}

                {canSign && (
                    <div className="space-y-4 border-t pt-5">
                        <div className="space-y-2">
                            <Label htmlFor="tenant-inspection-signer-name">
                                Nom du signataire
                            </Label>

                            <Input
                                id="tenant-inspection-signer-name"
                                value={
                                    signerName
                                }
                                maxLength={
                                    255
                                }
                                autoComplete="name"
                                placeholder="Nom et prénom"
                                onChange={(
                                    event,
                                ) =>
                                    setSignerName(
                                        event.target
                                            .value,
                                    )
                                }
                            />

                            <p className="text-xs text-muted-foreground">
                                Le nom saisi sera associé à votre compte
                                authentifié lors de la signature.
                            </p>
                        </div>

                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="tenant-inspection-consent"
                                checked={
                                    accepted
                                }
                                onCheckedChange={(
                                    value,
                                ) =>
                                    setAccepted(
                                        value ===
                                            true,
                                    )
                                }
                            />

                            <Label
                                htmlFor="tenant-inspection-consent"
                                className="cursor-pointer text-sm font-normal leading-5"
                            >
                                Je confirme avoir consulté cet état des
                                lieux et accepter la version{" "}
                                {currentInspection.version}.
                            </Label>
                        </div>

                        <Button
                            type="button"
                            disabled={
                                !canSubmit
                            }
                            onClick={() =>
                                void handleSignature()
                            }
                        >
                            <PenLine className="mr-2 h-4 w-4" />

                            {signInspection.isPending
                                ? "Signature..."
                                : "Signer l'état des lieux"}
                        </Button>
                    </div>
                )}

                {!counterpartySignature &&
                    currentInspection.status ===
                        "draft" && (
                        <p className="border-t pt-4 text-sm text-muted-foreground">
                            L'état des lieux n'est pas encore ouvert à
                            la signature.
                        </p>
                    )}

                {!counterpartySignature &&
                    currentInspection.status !==
                        "draft" &&
                    currentInspection.status !==
                        "ready_for_signature" && (
                        <p className="border-t pt-4 text-sm text-muted-foreground">
                            La signature n'est pas disponible dans
                            l'état actuel du dossier.
                        </p>
                    )}
            </section>
        </div>
    );
}