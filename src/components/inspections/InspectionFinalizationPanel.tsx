import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Link,
} from "react-router-dom";

import {
    AlertTriangle,
    CheckCircle2,
    Download,
    ExternalLink,
    FileCheck2,
    Loader2,
    RotateCcw,
    UserRoundCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
    type InspectionSnapshot,
    useFinalizeInspection,
    useInspection,
} from "@/hooks/use-inspections";

import {
    createInspectionDocumentAccessUrl,
    useInspectionDocumentMetadata,
} from "@/hooks/use-inspection-documents";

import {
    buildInspectionFinalPdf,
} from "@/lib/inspection-final-pdf";

import {
    type UploadedInspectionFinalPdf,
    uploadInspectionFinalPdf,
} from "@/lib/inspection-final-storage";


type InspectionFinalizationPanelProps = {
    snapshot: InspectionSnapshot;
};


type FinalizationPhase =
    | "idle"
    | "generating"
    | "uploading"
    | "finalizing"
    | "verifying";


type PendingFinalizationAttempt = {
    inspectionId: string;
    expectedVersion: number;
    fileName: string;
    storagePath: string;
    fileSize: number;
    sha256: string;
    uploadedAt: string;
};


type RpcLikeError = {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
};


// ============================================================
// PENDING FINALIZATION STORAGE
// ============================================================

const getPendingStorageKey = (
    inspectionId: string,
) =>
    `amimmo:inspection-finalization:${inspectionId}`;


// ============================================================
// ERROR NORMALIZATION
//
// Les erreurs Supabase/PostgREST ne sont pas toujours des
// instances natives de Error.
// ============================================================

const getErrorMessage = (
    error: unknown,
): string => {
    if (
        error instanceof Error &&
        error.message.trim()
    ) {
        return error.message;
    }

    if (
        typeof error === "object" &&
        error !== null
    ) {
        const candidate =
            error as RpcLikeError;

        if (
            typeof candidate.message ===
                "string" &&
            candidate.message.trim()
        ) {
            return candidate.message;
        }

        if (
            typeof candidate.details ===
                "string" &&
            candidate.details.trim()
        ) {
            return candidate.details;
        }

        if (
            typeof candidate.hint ===
                "string" &&
            candidate.hint.trim()
        ) {
            return candidate.hint;
        }
    }

    return "Une erreur est survenue.";
};


const isPendingFinalizationAttempt = (
    value: unknown,
): value is PendingFinalizationAttempt => {
    if (
        typeof value !== "object" ||
        value === null
    ) {
        return false;
    }

    const candidate =
        value as Partial<PendingFinalizationAttempt>;

    return (
        typeof candidate.inspectionId ===
            "string" &&
        typeof candidate.expectedVersion ===
            "number" &&
        Number.isInteger(
            candidate.expectedVersion,
        ) &&
        typeof candidate.fileName ===
            "string" &&
        candidate.fileName
            .toLowerCase()
            .endsWith(".pdf") &&
        typeof candidate.storagePath ===
            "string" &&
        candidate.storagePath.length > 0 &&
        typeof candidate.fileSize ===
            "number" &&
        Number.isFinite(
            candidate.fileSize,
        ) &&
        candidate.fileSize > 0 &&
        typeof candidate.sha256 ===
            "string" &&
        /^[0-9a-f]{64}$/.test(
            candidate.sha256,
        ) &&
        typeof candidate.uploadedAt ===
            "string"
    );
};


const clearPendingAttempt = (
    inspectionId: string,
) => {
    if (
        typeof window ===
        "undefined"
    ) {
        return;
    }

    try {
        window.sessionStorage.removeItem(
            getPendingStorageKey(
                inspectionId,
            ),
        );
    } catch {
        // Session storage is only a retry aid.
    }
};


const savePendingAttempt = (
    attempt: PendingFinalizationAttempt,
) => {
    if (
        typeof window ===
        "undefined"
    ) {
        return;
    }

    try {
        window.sessionStorage.setItem(
            getPendingStorageKey(
                attempt.inspectionId,
            ),
            JSON.stringify(
                attempt,
            ),
        );
    } catch {
        // The current in-memory attempt still remains usable.
    }
};


const loadPendingAttempt = (
    inspectionId: string,
    expectedVersion: number,
) => {
    if (
        typeof window ===
        "undefined"
    ) {
        return null;
    }

    try {
        const raw =
            window.sessionStorage.getItem(
                getPendingStorageKey(
                    inspectionId,
                ),
            );

        if (!raw) {
            return null;
        }

        const parsed: unknown =
            JSON.parse(
                raw,
            );

        if (
            !isPendingFinalizationAttempt(
                parsed,
            ) ||
            parsed.inspectionId !==
                inspectionId ||
            parsed.expectedVersion !==
                expectedVersion
        ) {
            clearPendingAttempt(
                inspectionId,
            );

            return null;
        }

        return parsed;
    } catch {
        clearPendingAttempt(
            inspectionId,
        );

        return null;
    }
};


const buildPendingAttempt = (
    inspectionId: string,
    expectedVersion: number,
    uploaded:
        UploadedInspectionFinalPdf,
): PendingFinalizationAttempt => ({
    inspectionId,
    expectedVersion,

    fileName:
        uploaded.fileName,

    storagePath:
        uploaded.storagePath,

    fileSize:
        uploaded.fileSize,

    sha256:
        uploaded.sha256,

    uploadedAt:
        new Date().toISOString(),
});


const getPhaseLabel = (
    phase: FinalizationPhase,
) => {
    switch (phase) {
        case "generating":
            return "Génération du PDF...";

        case "uploading":
            return "Téléversement du PDF...";

        case "finalizing":
            return "Finalisation...";

        case "verifying":
            return "Vérification...";

        default:
            return null;
    }
};


// ============================================================
// COMPONENT
// ============================================================

export function InspectionFinalizationPanel({
    snapshot,
}: InspectionFinalizationPanelProps) {
    const finalize =
        useFinalizeInspection();

    const inspection =
        snapshot.inspection;

    const verification =
        useInspection(
            inspection.id,
        );


    // ========================================================
    // FINAL DOCUMENT
    // ========================================================

    const finalDocumentLinks =
        useMemo(
            () =>
                inspection.final_document_id
                    ? snapshot.documents.filter(
                          (link) =>
                              link.document_id ===
                              inspection.final_document_id,
                      )
                    : [],
            [
                snapshot.documents,
                inspection.final_document_id,
            ],
        );


    const finalDocumentMetadata =
        useInspectionDocumentMetadata(
            inspection.id,
            finalDocumentLinks,
        );


    const finalDocument =
        useMemo(
            () =>
                finalDocumentMetadata.data?.find(
                    (document) =>
                        document.documentId ===
                        inspection.final_document_id,
                ) ?? null,
            [
                finalDocumentMetadata.data,
                inspection.final_document_id,
            ],
        );


    const [
        finalDocumentAction,
        setFinalDocumentAction,
    ] =
        useState<
            "open" |
            "download" |
            null
        >(
            null,
        );


    // ========================================================
    // FINALIZATION STATE
    // ========================================================

    const [
        pendingAttempt,
        setPendingAttempt,
    ] =
        useState<
            PendingFinalizationAttempt |
            null
        >(
            () =>
                loadPendingAttempt(
                    inspection.id,
                    inspection.version,
                ),
        );


    const [
        phase,
        setPhase,
    ] =
        useState<FinalizationPhase>(
            "idle",
        );


    const [
        actionError,
        setActionError,
    ] =
        useState<
            string |
            null
        >(
            null,
        );


    const [
        actionInfo,
        setActionInfo,
    ] =
        useState<
            string |
            null
        >(
            null,
        );


    const [
        finalizationConfirmed,
        setFinalizationConfirmed,
    ] =
        useState(
            () =>
                inspection.status ===
                "finalized",
        );


    // ========================================================
    // COUNTERPARTY
    // ========================================================

    const counterpartyRole =
        inspection.lease_id
            ? "tenant"
            : inspection.booking_id
                ? "guest"
                : null;


    const counterpartyLabel =
        counterpartyRole ===
            "tenant"
            ? "locataire"
            : counterpartyRole ===
                  "guest"
                ? "voyageur"
                : "cocontractant";


    // ========================================================
    // SIGNATURES CURRENT VERSION
    // ========================================================

    const agencySignature =
        useMemo(
            () =>
                snapshot.signatures.find(
                    (signature) =>
                        signature.signer_role ===
                            "agency" &&
                        signature.accepted_version ===
                            inspection.version,
                ) ??
                null,
            [
                snapshot.signatures,
                inspection.version,
            ],
        );


    const counterpartySignature =
        useMemo(
            () => {
                if (!counterpartyRole) {
                    return null;
                }

                return (
                    snapshot.signatures.find(
                        (signature) =>
                            signature.signer_role ===
                                counterpartyRole &&
                            signature.accepted_version ===
                                inspection.version,
                    ) ??
                    null
                );
            },
            [
                snapshot.signatures,
                counterpartyRole,
                inspection.version,
            ],
        );


    const agencySignatureReady =
        Boolean(
            agencySignature,
        );


    const counterpartySignatureReady =
        Boolean(
            counterpartySignature,
        );


    const signaturesReady =
        Boolean(
            counterpartyRole &&
            agencySignatureReady &&
            counterpartySignatureReady,
        );


    // ========================================================
    // SYNCHRONIZATION
    // ========================================================

    useEffect(
        () => {
            if (
                inspection.status ===
                "finalized"
            ) {
                setFinalizationConfirmed(
                    true,
                );

                clearPendingAttempt(
                    inspection.id,
                );

                setPendingAttempt(
                    null,
                );

                return;
            }

            setFinalizationConfirmed(
                false,
            );

            setPendingAttempt(
                loadPendingAttempt(
                    inspection.id,
                    inspection.version,
                ),
            );
        },
        [
            inspection.id,
            inspection.version,
            inspection.status,
        ],
    );


    // ========================================================
    // ACTION AVAILABILITY
    // ========================================================

    const isBusy =
        phase !==
            "idle" ||
        finalize.isPending;


    const canStart =
        inspection.status ===
            "ready_for_signature" &&
        signaturesReady &&
        !pendingAttempt &&
        !finalizationConfirmed &&
        !isBusy;


    const canRetry =
        inspection.status ===
            "ready_for_signature" &&
        signaturesReady &&
        Boolean(
            pendingAttempt,
        ) &&
        !finalizationConfirmed &&
        !isBusy;


    const phaseLabel =
        getPhaseLabel(
            phase,
        );


    // ========================================================
    // SIGNATURE WAITING MESSAGE
    // ========================================================

    const missingSignatureMessage =
        useMemo(
            () => {
                if (
                    inspection.status !==
                    "ready_for_signature"
                ) {
                    return null;
                }

                if (
                    agencySignatureReady &&
                    counterpartySignatureReady
                ) {
                    return null;
                }

                if (
                    !agencySignatureReady &&
                    !counterpartySignatureReady
                ) {
                    return (
                        "La finalisation attend encore la signature de " +
                        "l’agence et celle du " +
                        counterpartyLabel +
                        " sur la version actuelle."
                    );
                }

                if (
                    !agencySignatureReady
                ) {
                    return (
                        "La finalisation attend uniquement la signature " +
                        "de l’agence sur la version actuelle."
                    );
                }

                return (
                    "La signature de l’agence est enregistrée. " +
                    "La finalisation attend uniquement la signature du " +
                    counterpartyLabel +
                    " sur la version actuelle."
                );
            },
            [
                inspection.status,
                agencySignatureReady,
                counterpartySignatureReady,
                counterpartyLabel,
            ],
        );


    // ========================================================
    // MARK FINALIZED
    // ========================================================

    const markFinalized = (
        message: string,
    ) => {
        setFinalizationConfirmed(
            true,
        );

        clearPendingAttempt(
            inspection.id,
        );

        setPendingAttempt(
            null,
        );

        setActionError(
            null,
        );

        setActionInfo(
            message,
        );
    };


    // ========================================================
    // VERIFY AMBIGUOUS FINALIZATION
    // ========================================================

    const verifyAmbiguousFinalization =
        async (
            attempt:
                PendingFinalizationAttempt,
        ) => {
            setPhase(
                "verifying",
            );

            const result =
                await verification.refetch();

            const current =
                result.data
                    ?.inspection;

            if (
                current?.status !==
                "finalized"
            ) {
                return false;
            }

            const currentSha =
                current.final_document_sha256
                    ?.toLowerCase() ??
                null;

            if (
                currentSha !==
                attempt.sha256
            ) {
                clearPendingAttempt(
                    inspection.id,
                );

                setPendingAttempt(
                    null,
                );

                throw new Error(
                    "L’état des lieux est finalisé avec un autre document final.",
                );
            }

            markFinalized(
                "Finalisation confirmée après vérification du serveur.",
            );

            return true;
        };


    // ========================================================
    // FINALIZE UPLOADED ATTEMPT
    // ========================================================

    const finalizeUploadedAttempt =
        async (
            attempt:
                PendingFinalizationAttempt,
        ) => {
            try {
                setPhase(
                    "finalizing",
                );

                try {
                    await finalize.mutateAsync({
                        p_inspection_id:
                            attempt.inspectionId,

                        p_expected_version:
                            attempt.expectedVersion,

                        p_name:
                            attempt.fileName,

                        p_storage_path:
                            attempt.storagePath,

                        p_file_size:
                            attempt.fileSize,

                        p_sha256:
                            attempt.sha256,
                    });
                } catch (error) {
                    try {
                        const recovered =
                            await verifyAmbiguousFinalization(
                                attempt,
                            );

                        if (recovered) {
                            return true;
                        }
                    } catch (
                        verificationError
                    ) {
                        setActionError(
                            getErrorMessage(
                                verificationError,
                            ),
                        );

                        return false;
                    }

                    setActionError(
                        [
                            getErrorMessage(
                                error,
                            ),
                            "",
                            "Le PDF déjà téléversé est conservé pour la prochaine tentative.",
                            "Le bouton de reprise ne générera ni ne téléversera un nouveau PDF.",
                        ].join(
                            "\n",
                        ),
                    );

                    return false;
                }

                /*
                 * finalize_inspection() réussi :
                 * le serveur devient la source d'autorité.
                 */

                markFinalized(
                    "Le document final a été enregistré avec succès.",
                );

                setPhase(
                    "verifying",
                );

                try {
                    await verification.refetch();
                } catch {
                    /*
                     * La mutation serveur a déjà réussi.
                     * Un prochain refresh réconciliera l'UI.
                     */
                }

                return true;
            } finally {
                setPhase(
                    "idle",
                );
            }
        };


    // ========================================================
    // START FINALIZATION
    // ========================================================

    const handleStart =
        async () => {
            if (!canStart) {
                return;
            }

            const organizationId =
                inspection.organization_id;

            if (!organizationId) {
                setActionError(
                    "Organisation introuvable pour cet état des lieux.",
                );

                return;
            }

            const confirmed =
                window.confirm(
                    [
                        "Finaliser cet état des lieux ?",
                        "",
                        "Le PDF définitif va être généré, téléversé puis verrouillé par le serveur.",
                        `Version : ${inspection.version}`,
                        "",
                        "Cette opération ne doit être lancée qu’après les deux signatures.",
                    ].join(
                        "\n",
                    ),
                );

            if (!confirmed) {
                return;
            }

            setActionError(
                null,
            );

            setActionInfo(
                null,
            );

            try {
                setPhase(
                    "generating",
                );

                const artifact =
                    buildInspectionFinalPdf(
                        snapshot,
                    );

                setPhase(
                    "uploading",
                );

                const uploaded =
                    await uploadInspectionFinalPdf({
                        organizationId,

                        inspectionId:
                            inspection.id,

                        artifact,
                    });

                const attempt =
                    buildPendingAttempt(
                        inspection.id,
                        inspection.version,
                        uploaded,
                    );

                savePendingAttempt(
                    attempt,
                );

                setPendingAttempt(
                    attempt,
                );

                await finalizeUploadedAttempt(
                    attempt,
                );
            } catch (error) {
                setActionError(
                    getErrorMessage(
                        error,
                    ),
                );

                setPhase(
                    "idle",
                );
            }
        };


    // ========================================================
    // RETRY FINALIZATION
    // ========================================================

    const handleRetry =
        async () => {
            if (
                !canRetry ||
                !pendingAttempt
            ) {
                return;
            }

            setActionError(
                null,
            );

            setActionInfo(
                null,
            );

            await finalizeUploadedAttempt(
                pendingAttempt,
            );
        };


    // ========================================================
    // OPEN FINAL DOCUMENT
    // ========================================================

    const handleOpenFinalDocument =
        async () => {
            if (
                !finalDocument ||
                finalDocumentAction
            ) {
                return;
            }

            setActionError(
                null,
            );

            /*
             * Ouverture synchrone afin d'éviter le blocage popup
             * du navigateur avant résolution de l'URL signée.
             */

            const previewWindow =
                window.open(
                    "about:blank",
                    "_blank",
                );

            if (!previewWindow) {
                setActionError(
                    "Le navigateur a bloqué l’ouverture du document final.",
                );

                return;
            }

            previewWindow.opener =
                null;

            setFinalDocumentAction(
                "open",
            );

            try {
                const url =
                    await createInspectionDocumentAccessUrl(
                        finalDocument,
                    );

                previewWindow.location.replace(
                    url,
                );
            } catch (error) {
                previewWindow.close();

                setActionError(
                    getErrorMessage(
                        error,
                    ),
                );
            } finally {
                setFinalDocumentAction(
                    null,
                );
            }
        };


    // ========================================================
    // DOWNLOAD FINAL DOCUMENT
    // ========================================================

    const handleDownloadFinalDocument =
        async () => {
            if (
                !finalDocument ||
                finalDocumentAction
            ) {
                return;
            }

            setActionError(
                null,
            );

            setFinalDocumentAction(
                "download",
            );

            let objectUrl:
                string |
                null =
                null;

            try {
                const url =
                    await createInspectionDocumentAccessUrl(
                        finalDocument,
                    );

                const response =
                    await fetch(
                        url,
                    );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        `Téléchargement du PDF impossible (${response.status}).`,
                    );
                }

                const blob =
                    await response.blob();

                objectUrl =
                    URL.createObjectURL(
                        blob,
                    );

                const anchor =
                    document.createElement(
                        "a",
                    );

                anchor.href =
                    objectUrl;

                anchor.download =
                    finalDocument.name ||
                    "etat-des-lieux-final.pdf";

                anchor.rel =
                    "noopener";

                document.body.appendChild(
                    anchor,
                );

                anchor.click();

                anchor.remove();
            } catch (error) {
                setActionError(
                    getErrorMessage(
                        error,
                    ),
                );
            } finally {
                if (objectUrl) {
                    URL.revokeObjectURL(
                        objectUrl,
                    );
                }

                setFinalDocumentAction(
                    null,
                );
            }
        };


    // ========================================================
    // SERVER CONFIRMED / LOCAL SNAPSHOT NOT YET REFRESHED
    // ========================================================

    if (
        finalizationConfirmed &&
        inspection.status !==
            "finalized"
    ) {
        return (
            <section className="space-y-4 rounded-lg border bg-card p-6">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />

                    <div>
                        <h2 className="font-semibold">
                            Finalisation enregistrée
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Le serveur a confirmé le document final.
                            Les détails sont en cours de synchronisation.
                            Aucun nouveau PDF ne sera généré.
                        </p>
                    </div>
                </div>

                {actionInfo && (
                    <p className="text-sm text-emerald-700">
                        {actionInfo}
                    </p>
                )}
            </section>
        );
    }


    // ========================================================
    // FINALIZED
    // ========================================================

    if (
        inspection.status ===
        "finalized"
    ) {
        return (
            <section className="space-y-4 rounded-lg border bg-card p-6">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />

                    <div>
                        <h2 className="font-semibold">
                            Document final enregistré
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            L’état des lieux est finalisé et son document
                            définitif est verrouillé.
                        </p>
                    </div>
                </div>


                <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                        <span className="text-muted-foreground">
                            Document
                        </span>

                        <p className="font-mono text-xs">
                            {inspection.final_document_id ??
                                "Non renseigné"}
                        </p>
                    </div>


                    <div>
                        <span className="text-muted-foreground">
                            SHA-256
                        </span>

                        <p className="break-all font-mono text-xs">
                            {inspection.final_document_sha256 ??
                                "Non renseigné"}
                        </p>
                    </div>
                </div>


                <div className="space-y-3 rounded-md border p-4">
                    {finalDocumentMetadata.isLoading && (
                        <p className="text-sm text-muted-foreground">
                            Chargement du document final...
                        </p>
                    )}


                    {finalDocumentMetadata.isError && (
                        <p className="text-sm text-destructive">
                            Impossible de charger les métadonnées du document final.
                        </p>
                    )}


                    {!finalDocumentMetadata.isLoading &&
                        !finalDocumentMetadata.isError &&
                        inspection.final_document_id &&
                        !finalDocument && (
                            <p className="text-sm text-destructive">
                                Le document final référencé est introuvable.
                            </p>
                        )}


                    {finalDocument && (
                        <>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    {finalDocument.name}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                    {finalDocument.mimeType ??
                                        "application/pdf"}

                                    {typeof finalDocument.fileSize ===
                                        "number" &&
                                        ` · ${Math.max(
                                            1,
                                            Math.round(
                                                finalDocument.fileSize /
                                                    1024,
                                            ),
                                        )} Ko`}
                                </p>
                            </div>


                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        void handleOpenFinalDocument()
                                    }
                                    disabled={
                                        finalDocumentAction !==
                                        null
                                    }
                                >
                                    {finalDocumentAction ===
                                    "open" ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                    )}

                                    Ouvrir le PDF
                                </Button>


                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        void handleDownloadFinalDocument()
                                    }
                                    disabled={
                                        finalDocumentAction !==
                                        null
                                    }
                                >
                                    {finalDocumentAction ===
                                    "download" ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}

                                    Télécharger le PDF
                                </Button>
                            </div>
                        </>
                    )}


                    {actionError && (
                        <p className="text-sm text-destructive">
                            {actionError}
                        </p>
                    )}
                </div>


                {actionInfo && (
                    <p className="text-sm text-emerald-700">
                        {actionInfo}
                    </p>
                )}
            </section>
        );
    }


    // ========================================================
    // NON FINALIZED
    // ========================================================

    return (
        <section className="space-y-5 rounded-lg border bg-card p-6">
            <div className="flex items-start gap-3">
                <FileCheck2 className="mt-0.5 h-5 w-5" />

                <div>
                    <h2 className="font-semibold">
                        Document final
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Génération du PDF définitif, empreinte SHA-256,
                        téléversement sécurisé puis finalisation serveur.
                    </p>
                </div>
            </div>


            {/* ================================================= */}
            {/* SIGNATURE STATUS                                  */}
            {/* ================================================= */}

            {inspection.status ===
                "ready_for_signature" && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div
                        className={
                            agencySignatureReady
                                ? "rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4"
                                : "rounded-md border border-amber-500/40 bg-amber-500/5 p-4"
                        }
                    >
                        <div className="flex items-start gap-3">
                            {agencySignatureReady ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                            ) : (
                                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                            )}

                            <div>
                                <p className="text-sm font-medium">
                                    Signature agence
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    {agencySignatureReady
                                        ? `Enregistrée sur la version ${inspection.version}.`
                                        : `En attente sur la version ${inspection.version}.`}
                                </p>
                            </div>
                        </div>
                    </div>


                    <div
                        className={
                            counterpartySignatureReady
                                ? "rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4"
                                : "rounded-md border border-amber-500/40 bg-amber-500/5 p-4"
                        }
                    >
                        <div className="flex items-start gap-3">
                            {counterpartySignatureReady ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                            ) : (
                                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                            )}

                            <div>
                                <p className="text-sm font-medium">
                                    Signature{" "}
                                    {counterpartyRole ===
                                    "guest"
                                        ? "voyageur"
                                        : counterpartyRole ===
                                              "tenant"
                                            ? "locataire"
                                            : "cocontractant"}
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                    {counterpartySignatureReady
                                        ? `Enregistrée sur la version ${inspection.version}.`
                                        : `En attente sur la version ${inspection.version}.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* ================================================= */}
            {/* MISSING SIGNATURE WARNING                         */}
            {/* ================================================= */}

            {missingSignatureMessage && (
                <div className="space-y-4 rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
                    <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                        <div>
                            <p className="text-sm font-medium">
                                Finalisation en attente
                            </p>

                            <p className="mt-1 text-sm">
                                {missingSignatureMessage}
                            </p>
                        </div>
                    </div>


                    {counterpartyRole ===
                        "guest" &&
                        !counterpartySignatureReady && (
                            <div className="space-y-3 border-t border-amber-500/20 pt-4">
                                <div className="flex items-start gap-3">
                                    <UserRoundCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                                    <div>
                                        <p className="text-sm font-medium">
                                            Signature du voyageur
                                        </p>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Pour des raisons de sécurité,
                                            l’agence ne signe pas à la place
                                            du voyageur. La signature doit
                                            être réalisée depuis son espace
                                            voyageur authentifié.
                                        </p>
                                    </div>
                                </div>


                                {inspection.booking_id && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        asChild
                                    >
                                        <Link
                                            to={`/admin/bookings/${inspection.booking_id}`}
                                        >
                                            <UserRoundCheck className="mr-2 h-4 w-4" />

                                            Gérer l’accès voyageur
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        )}


                    {counterpartyRole ===
                        "tenant" &&
                        !counterpartySignatureReady && (
                            <div className="border-t border-amber-500/20 pt-4">
                                <p className="text-sm text-muted-foreground">
                                    La signature du locataire doit être
                                    réalisée depuis son espace locataire
                                    authentifié.
                                </p>
                            </div>
                        )}
                </div>
            )}


            {/* ================================================= */}
            {/* DRAFT                                             */}
            {/* ================================================= */}

            {inspection.status ===
                "draft" && (
                <p className="text-sm text-muted-foreground">
                    Le document final sera disponible après préparation
                    et signature de l’état des lieux.
                </p>
            )}


            {/* ================================================= */}
            {/* CANCELLED                                         */}
            {/* ================================================= */}

            {inspection.status ===
                "cancelled" && (
                <p className="text-sm text-muted-foreground">
                    Un état des lieux annulé ne peut pas être finalisé.
                </p>
            )}


            {/* ================================================= */}
            {/* INVALID SOURCE                                    */}
            {/* ================================================= */}

            {inspection.status ===
                "ready_for_signature" &&
                !counterpartyRole && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        Impossible d’identifier la contrepartie de cet
                        état des lieux. Aucun bail ni aucune réservation
                        valide n’est rattaché.
                    </div>
                )}


            {/* ================================================= */}
            {/* PENDING RETRY                                     */}
            {/* ================================================= */}

            {pendingAttempt && (
                <div className="space-y-2 rounded-md border p-4">
                    <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />

                        <p className="font-medium">
                            PDF déjà téléversé
                        </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        La prochaine tentative réutilisera exactement le
                        même fichier, le même chemin Storage et la même
                        empreinte SHA-256.
                    </p>

                    <p className="break-all font-mono text-xs text-muted-foreground">
                        {pendingAttempt.storagePath}
                    </p>
                </div>
            )}


            {/* ================================================= */}
            {/* ERROR                                             */}
            {/* ================================================= */}

            {actionError && (
                <div className="whitespace-pre-line rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                    {actionError}
                </div>
            )}


            {/* ================================================= */}
            {/* INFO                                              */}
            {/* ================================================= */}

            {actionInfo && (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm text-emerald-700">
                    {actionInfo}
                </div>
            )}


            {/* ================================================= */}
            {/* BUSY                                              */}
            {/* ================================================= */}

            {phaseLabel && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />

                    {phaseLabel}
                </div>
            )}


            {/* ================================================= */}
            {/* START                                             */}
            {/* ================================================= */}

            {canStart && (
                <Button
                    onClick={() =>
                        void handleStart()
                    }
                    disabled={
                        isBusy
                    }
                >
                    <FileCheck2 className="mr-2 h-4 w-4" />

                    Générer et finaliser le PDF
                </Button>
            )}


            {/* ================================================= */}
            {/* RETRY                                             */}
            {/* ================================================= */}

            {canRetry && (
                <Button
                    variant="outline"
                    onClick={() =>
                        void handleRetry()
                    }
                    disabled={
                        isBusy
                    }
                >
                    <RotateCcw className="mr-2 h-4 w-4" />

                    Réessayer la finalisation
                </Button>
            )}
        </section>
    );
}