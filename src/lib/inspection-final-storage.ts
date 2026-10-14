import {
    supabase,
} from "@/integrations/supabase/client";

import {
    FINAL_INSPECTION_PDF_MIME,
    type InspectionFinalPdfArtifact,
} from "@/lib/inspection-final-pdf";


export const FINAL_INSPECTION_PDF_BUCKET =
    "entity-documents" as const;

export const FINAL_INSPECTION_PDF_MAX_SIZE =
    10 * 1024 * 1024;


export type UploadInspectionFinalPdfInput = {
    organizationId: string;
    inspectionId: string;
    artifact: InspectionFinalPdfArtifact;
};


export type UploadedInspectionFinalPdf = {
    storageBucket:
        typeof FINAL_INSPECTION_PDF_BUCKET;

    storagePath: string;

    fileName: string;
    fileSize: number;
    sha256: string;

    uploadedBy: string;
};


const assertPathSegment = (
    value: string,
    label: string,
) => {
    const trimmed =
        value.trim();

    if (
        !trimmed ||
        trimmed === "." ||
        trimmed === ".." ||
        /[\\/]/.test(trimmed)
    ) {
        throw new Error(
            `${label} invalide.`,
        );
    }

    return trimmed;
};


const sanitizeFinalPdfFileName = (
    value: string,
) => {
    const leaf =
        value
            .trim()
            .replace(/\\/g, "/")
            .split("/")
            .pop() ??
        "";

    const withoutExtension =
        leaf.replace(
            /\.pdf$/i,
            "",
        );

    const sanitized =
        withoutExtension
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                "",
            )
            .replace(
                /[^a-zA-Z0-9._-]+/g,
                "-",
            )
            .replace(
                /-+/g,
                "-",
            )
            .replace(
                /^[-._]+|[-._]+$/g,
                "",
            );

    return `${
        sanitized ||
        "etat-des-lieux"
    }.pdf`;
};


const getWebCrypto = () => {
    const cryptoApi =
        globalThis.crypto;

    if (
        !cryptoApi ||
        !cryptoApi.subtle
    ) {
        throw new Error(
            "Web Crypto API indisponible.",
        );
    }

    return cryptoApi;
};


export const sha256Hex = async (
    arrayBuffer: ArrayBuffer,
) => {
    if (
        arrayBuffer.byteLength <= 0
    ) {
        throw new Error(
            "Impossible de calculer l’empreinte d’un PDF vide.",
        );
    }

    const cryptoApi =
        getWebCrypto();

    const digest =
        await cryptoApi.subtle.digest(
            "SHA-256",
            arrayBuffer,
        );

    const sha256 =
        Array.from(
            new Uint8Array(
                digest,
            ),
            (byte) =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0",
                    ),
        ).join("");

    if (
        !/^[0-9a-f]{64}$/.test(
            sha256,
        )
    ) {
        throw new Error(
            "Empreinte SHA-256 générée invalide.",
        );
    }

    return sha256;
};


export const buildInspectionFinalStoragePath =
    (
        organizationId: string,
        userId: string,
        inspectionId: string,
        sha256: string,
    ) => {
        const organization =
            assertPathSegment(
                organizationId,
                "Organisation",
            );

        const user =
            assertPathSegment(
                userId,
                "Utilisateur",
            );

        const inspection =
            assertPathSegment(
                inspectionId,
                "Etat des lieux",
            );

        const normalizedSha256 =
            sha256
                .trim()
                .toLowerCase();

        if (
            !/^[0-9a-f]{64}$/.test(
                normalizedSha256,
            )
        ) {
            throw new Error(
                "Empreinte SHA-256 invalide pour le chemin Storage final.",
            );
        }

        /*
         * Backend canonical contract:
         *
         * agency/<org>/<auth.uid()>/inspection/<inspection>/final/<file.pdf>
         *
         * The final leaf is content-addressed.
         */
        const storageFileName =
            `${normalizedSha256}.pdf`;

        return [
            "agency",
            organization,
            user,
            "inspection",
            inspection,
            "final",
            storageFileName,
        ].join("/");
    };

const validateArtifact = (
    artifact: InspectionFinalPdfArtifact,
) => {
    const byteLength =
        artifact.arrayBuffer
            .byteLength;

    if (
        byteLength <= 0
    ) {
        throw new Error(
            "Le PDF final est vide.",
        );
    }

    if (
        byteLength >
        FINAL_INSPECTION_PDF_MAX_SIZE
    ) {
        throw new Error(
            "Le PDF final dépasse la taille maximale de 10 Mo.",
        );
    }

    if (
        artifact.fileSize !==
        byteLength
    ) {
        throw new Error(
            "La taille déclarée du PDF ne correspond pas à ses bytes.",
        );
    }

    if (
        artifact.blob.size !==
        byteLength
    ) {
        throw new Error(
            "Le Blob PDF ne correspond pas à l’ArrayBuffer.",
        );
    }

    if (
        artifact.blob.type
            .toLowerCase() !==
        FINAL_INSPECTION_PDF_MIME
    ) {
        throw new Error(
            "Le Blob final doit être de type application/pdf.",
        );
    }

    const fileName =
        sanitizeFinalPdfFileName(
            artifact.fileName,
        );

    if (
        !fileName
            .toLowerCase()
            .endsWith(
                ".pdf",
            )
    ) {
        throw new Error(
            "Le nom du document final doit terminer par .pdf.",
        );
    }

    return {
        fileName,
        fileSize:
            byteLength,
    };
};


const verifyExistingInspectionFinalPdfObject =
    async (
        storagePath: string,
        expectedFileSize: number,
        expectedSha256: string,
    ) => {
        const {
            data:
                existingBlob,
            error:
                downloadError,
        } =
            await supabase.storage
                .from(
                    FINAL_INSPECTION_PDF_BUCKET,
                )
                .download(
                    storagePath,
                );

        if (
            downloadError ||
            !existingBlob
        ) {
            return false;
        }

        if (
            existingBlob.size !==
            expectedFileSize
        ) {
            throw new Error(
                "Un objet existe déjà au chemin final avec une taille différente. Aucun écrasement n’a été effectué.",
            );
        }

        const existingArrayBuffer =
            await existingBlob
                .arrayBuffer();

        if (
            existingArrayBuffer.byteLength !==
            expectedFileSize
        ) {
            throw new Error(
                "Les bytes de l’objet Storage existant ont une taille inattendue.",
            );
        }

        const existingSha256 =
            await sha256Hex(
                existingArrayBuffer,
            );

        if (
            existingSha256 !==
            expectedSha256
        ) {
            throw new Error(
                "Collision d’intégrité sur le chemin du PDF final. Aucun écrasement n’a été effectué.",
            );
        }

        return true;
    };

export const uploadInspectionFinalPdf =
    async (
        input: UploadInspectionFinalPdfInput,
    ): Promise<UploadedInspectionFinalPdf> => {
        const organizationId =
            assertPathSegment(
                input.organizationId,
                "Organisation",
            );

        const inspectionId =
            assertPathSegment(
                input.inspectionId,
                "État des lieux",
            );

        const {
            fileName,
            fileSize,
        } =
            validateArtifact(
                input.artifact,
            );


        const {
            data:
                userData,
            error:
                userError,
        } =
            await supabase.auth
                .getUser();

        if (userError) {
            throw userError;
        }

        const user =
            userData.user;

        if (!user) {
            throw new Error(
                "Authentification requise.",
            );
        }


        /*
         * CRITICAL ORDER:
         *
         * Hash the exact ArrayBuffer produced by 6B BEFORE upload.
         */
        const sha256 =
            await sha256Hex(
                input.artifact
                    .arrayBuffer,
            );


        const storagePath =
            buildInspectionFinalStoragePath(
                organizationId,
                user.id,
                inspectionId,
                sha256,
            );


        /*
         * Re-wrap the exact same PDF bytes.
         * This does NOT regenerate the PDF.
         */
        const uploadBlob =
            new Blob(
                [
                    input.artifact
                        .arrayBuffer,
                ],
                {
                    type:
                        FINAL_INSPECTION_PDF_MIME,
                },
            );

        if (
            uploadBlob.size !==
            fileSize
        ) {
            throw new Error(
                "Le Blob d’upload ne correspond pas aux bytes signés.",
            );
        }


        const {
            error:
                uploadError,
        } =
            await supabase.storage
                .from(
                    FINAL_INSPECTION_PDF_BUCKET,
                )
                .upload(
                    storagePath,
                    uploadBlob,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            false,

                        contentType:
                            FINAL_INSPECTION_PDF_MIME,
                    },
                );

        if (uploadError) {
            /*
             * The request may have reached Storage even when the browser
             * receives an error (timeout / interrupted response).
             *
             * Because storagePath is content-addressed, verify the object
             * already present at that exact path. Reuse it only when both
             * size and SHA-256 match the bytes produced by 6B.
             *
             * Never overwrite or delete a conflicting final object here.
             */
            const recoveredExistingObject =
                await verifyExistingInspectionFinalPdfObject(
                    storagePath,
                    fileSize,
                    sha256,
                );

            if (!recoveredExistingObject) {
                throw uploadError;
            }
        }


        return {
            storageBucket:
                FINAL_INSPECTION_PDF_BUCKET,

            storagePath,

            fileName,
            fileSize,
            sha256,

            uploadedBy:
                user.id,
        };
    };