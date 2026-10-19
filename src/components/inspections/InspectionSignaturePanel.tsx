import {
    useMemo,
    useState,
} from "react";

import {
    BadgeCheck,
    Clock3,
    Mail,
    PenLine,
    ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    type InspectionSignatureSnapshot,
    type InspectionSnapshot,
    useSignInspection,
} from "@/hooks/use-inspections";

import {
    sendGuestInspectionSignatureEmail,
} from "@/lib/guest-inspection-signature-email";

type InspectionSignaturePanelProps = {
    snapshot: InspectionSnapshot;
};

const getErrorMessage = (
    error: unknown,
) =>
    error instanceof Error
        ? error.message
        : "Une erreur est survenue.";

const formatSignedAt = (
    value: string,
) => {
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

const SignatureState = ({
    signature,
    pendingLabel,
}: {
    signature:
        | InspectionSignatureSnapshot
        | undefined;
    pendingLabel: string;
}) => {
    if (!signature) {
        return (
            <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

                <div>
                    <p className="font-medium">
                        En attente
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {pendingLabel}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3">
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="space-y-1">
                <p className="font-medium">
                    Signé par {signature.signer_name}
                </p>

                <p className="text-sm text-muted-foreground">
                    {formatSignedAt(
                        signature.signed_at,
                    )}
                </p>

                <p className="text-xs text-muted-foreground">
                    Version {signature.accepted_version}
                    {" · "}
                    Méthode {signature.signature_method}
                </p>
            </div>
        </div>
    );
};

export function InspectionSignaturePanel({
    snapshot,
}: InspectionSignaturePanelProps) {
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

    const [
        deliveryPending,
        setDeliveryPending,
    ] =
        useState(false);

    const [
        deliveryMessage,
        setDeliveryMessage,
    ] =
        useState<string | null>(
            null,
        );

    const inspection =
        snapshot.inspection;

    const signatures =
        snapshot.signatures;

    const agencySignature =
        useMemo(
            () =>
                signatures.find(
                    (signature) =>
                        signature.signer_role ===
                        "agency",
                ),
            [signatures],
        );

    const counterpartyRole =
        inspection.lease_id
            ? "tenant"
            : "guest";

    const counterpartyLabel =
        inspection.lease_id
            ? "Locataire"
            : "Voyageur";

    const counterpartySignature =
        useMemo(
            () =>
                signatures.find(
                    (signature) =>
                        signature.signer_role ===
                        counterpartyRole,
                ),
            [
                signatures,
                counterpartyRole,
            ],
        );

    const isShortRentalInspection =
        Boolean(
            inspection.booking_id,
        ) &&
        !inspection.lease_id;

    const trimmedName =
        signerName.trim();

    const canSignAgency =
        inspection.status ===
            "ready_for_signature" &&
        !agencySignature;

    const canSubmit =
        canSignAgency &&
        trimmedName.length > 0 &&
        trimmedName.length <= 255 &&
        accepted &&
        !signInspection.isPending &&
        !deliveryPending;

    const sendSignatureRequest =
        async () => {
            if (
                !isShortRentalInspection
            ) {
                return;
            }

            setDeliveryPending(
                true,
            );

            setDeliveryMessage(
                null,
            );

            try {
                const result =
                    await sendGuestInspectionSignatureEmail(
                        inspection.id,
                    );

                setDeliveryMessage(
                    result.alreadySent
                        ? "L'email de signature avait déjà été envoyé au voyageur pour cette version."
                        : "L'email de signature a été envoyé au voyageur.",
                );
            } finally {
                setDeliveryPending(
                    false,
                );
            }
        };


    const handleGuestDeliveryRetry =
        async () => {
            setActionError(
                null,
            );

            try {
                await sendSignatureRequest();
            } catch (error) {
                setActionError(
                    `Impossible d'envoyer l'email au voyageur : ${getErrorMessage(
                        error,
                    )}`,
                );
            }
        };


    const handleAgencySignature =
        async () => {
            if (!canSubmit) {
                return;
            }

            const confirmed =
                window.confirm(
                    [
                        "Confirmer la signature de l'agence ?",
                        "",
                        `Signataire : ${trimmedName}`,
                        `Version acceptée : ${inspection.version}`,
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
                        inspection.id,

                    p_signer_role:
                        "agency",

                    p_signer_name:
                        trimmedName,

                    p_signature_method:
                        "typed",

                    p_accepted_version:
                        inspection.version,
                });
            } catch (error) {
                setActionError(
                    getErrorMessage(
                        error,
                    ),
                );

                return;
            }

            setSignerName("");
            setAccepted(false);

            if (
                isShortRentalInspection
            ) {
                try {
                    await sendSignatureRequest();
                } catch (error) {
                    setActionError(
                        [
                            "La signature de l'agence est bien enregistrée.",
                            "En revanche, l'email au voyageur n'a pas pu être envoyé :",
                            getErrorMessage(
                                error,
                            ),
                        ].join(" "),
                    );
                }
            }
        };

    return (
        <section className="space-y-5 rounded-lg border bg-card p-5">
            <div>
                <div className="flex items-center gap-2">
                    <PenLine className="h-5 w-5" />

                    <h2 className="text-lg font-semibold">
                        Signatures
                    </h2>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                    Les signatures portent sur la version{" "}
                    <strong className="text-foreground">
                        {inspection.version}
                    </strong>{" "}
                    de cet état des lieux.
                </p>
            </div>

            {actionError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {actionError}
                </div>
            )}

            {deliveryMessage && (
                <div className="rounded-lg border border-green-600/30 bg-green-600/5 px-4 py-3 text-sm">
                    {deliveryMessage}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />

                        <h3 className="font-semibold">
                            Agence
                        </h3>
                    </div>

                    <SignatureState
                        signature={
                            agencySignature
                        }
                        pendingLabel="La signature de l'agence n'a pas encore été enregistrée."
                    />

                    {canSignAgency && (
                        <div className="space-y-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="agency-signer-name">
                                    Nom du signataire
                                </Label>

                                <Input
                                    id="agency-signer-name"
                                    value={
                                        signerName
                                    }
                                    maxLength={255}
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
                                    Ce nom sera enregistré comme signataire
                                    au nom de l'agence.
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="agency-signature-consent"
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
                                    htmlFor="agency-signature-consent"
                                    className="cursor-pointer text-sm font-normal leading-5"
                                >
                                    Je confirme signer cet état des lieux
                                    au nom de l'agence et accepter la
                                    version {inspection.version}.
                                </Label>
                            </div>

                            <Button
                                type="button"
                                disabled={
                                    !canSubmit
                                }
                                onClick={() =>
                                    void handleAgencySignature()
                                }
                            >
                                <PenLine className="mr-2 h-4 w-4" />

                                {signInspection.isPending
                                    ? "Signature..."
                                    : "Signer pour l'agence"}
                            </Button>
                        </div>
                    )}

                    {agencySignature &&
                        isShortRentalInspection &&
                        inspection.status ===
                            "ready_for_signature" &&
                        !counterpartySignature && (
                            <div className="space-y-2 border-t pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        deliveryPending
                                    }
                                    onClick={() =>
                                        void handleGuestDeliveryRetry()
                                    }
                                >
                                    <Mail className="mr-2 h-4 w-4" />

                                    {deliveryPending
                                        ? "Envoi..."
                                        : "Envoyer le lien au voyageur"}
                                </Button>

                                <p className="text-xs text-muted-foreground">
                                    L'envoi est idempotent : un email déjà
                                    confirmé comme envoyé pour cette version
                                    ne sera pas dupliqué.
                                </p>
                            </div>
                        )}

                    {!agencySignature &&
                        inspection.status ===
                            "draft" && (
                            <p className="border-t pt-4 text-sm text-muted-foreground">
                                La signature sera disponible après
                                préparation de l'état des lieux.
                            </p>
                        )}

                    {!agencySignature &&
                        inspection.status !==
                            "draft" &&
                        inspection.status !==
                            "ready_for_signature" && (
                            <p className="border-t pt-4 text-sm text-muted-foreground">
                                La signature agence n'est pas disponible
                                dans l'état actuel du dossier.
                            </p>
                        )}
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                        <PenLine className="h-4 w-4" />

                        <h3 className="font-semibold">
                            {counterpartyLabel}
                        </h3>
                    </div>

                    <SignatureState
                        signature={
                            counterpartySignature
                        }
                        pendingLabel={`La signature du ${counterpartyLabel.toLowerCase()} n'a pas encore été enregistrée.`}
                    />

                    {!counterpartySignature && (
                        <p className="border-t pt-4 text-sm text-muted-foreground">
                            Cette signature sera réalisée depuis
                            l'espace du {counterpartyLabel.toLowerCase()}.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}