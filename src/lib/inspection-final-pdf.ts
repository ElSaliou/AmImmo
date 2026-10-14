import {
    jsPDF,
} from "jspdf";

import type {
    InspectionSnapshot,
} from "@/hooks/use-inspections";


export const FINAL_INSPECTION_PDF_MIME =
    "application/pdf" as const;


export type InspectionFinalPdfArtifact = {
    fileName: string;
    arrayBuffer: ArrayBuffer;
    blob: Blob;
    fileSize: number;
};


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


const severityLabels: Record<
    string,
    string
> = {
    minor: "Mineure",
    moderate: "Modérée",
    major: "Majeure",
    critical: "Critique",
};


const signerRoleLabels: Record<
    string,
    string
> = {
    agency: "Agence",
    tenant: "Locataire",
    guest: "Voyageur",
};


const kindLabels: Record<
    string,
    string
> = {
    checkin: "Entrée",
    checkout: "Sortie",
};


const cleanText = (
    value:
        | string
        | number
        | null
        | undefined,
) => {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    const text =
        String(value)
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .trim();

    return text || "—";
};


const formatDateTime = (
    value:
        | string
        | null
        | undefined,
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
        return cleanText(value);
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            dateStyle: "long",
            timeStyle: "short",
        },
    ).format(date);
};


const sanitizeFilePart = (
    value: string,
) => {
    const sanitized =
        value
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                "",
            )
            .replace(
                /[^a-zA-Z0-9_-]+/g,
                "-",
            )
            .replace(
                /-+/g,
                "-",
            )
            .replace(
                /^[-_]+|[-_]+$/g,
                "",
            )
            .toLowerCase();

    return (
        sanitized ||
        "inspection"
    );
};


const buildFileName = (
    snapshot: InspectionSnapshot,
) => {
    const inspection =
        snapshot.inspection;

    const identity =
        inspection.reference ||
        inspection.id;

    return [
        "etat-des-lieux",
        sanitizeFilePart(
            identity,
        ),
        `v${inspection.version}`,
    ].join("-") + ".pdf";
};


class PdfWriter {
    private readonly doc: jsPDF;

    private readonly marginX =
        15;

    private readonly topMargin =
        18;

    private readonly bottomMargin =
        16;

    private readonly lineHeight =
        5.5;

    private y =
        this.topMargin;


    constructor(
        doc: jsPDF,
    ) {
        this.doc =
            doc;
    }


    private get pageHeight() {
        return this.doc.internal
            .pageSize
            .getHeight();
    }


    private get pageWidth() {
        return this.doc.internal
            .pageSize
            .getWidth();
    }


    private get contentWidth() {
        return (
            this.pageWidth -
            this.marginX * 2
        );
    }


    private ensureSpace(
        requiredHeight: number,
    ) {
        if (
            this.y +
                requiredHeight >
            this.pageHeight -
                this.bottomMargin
        ) {
            this.doc.addPage();

            this.y =
                this.topMargin;
        }
    }


    title(
        value: string,
    ) {
        this.ensureSpace(
            18,
        );

        this.doc.setFont(
            "helvetica",
            "bold",
        );

        this.doc.setFontSize(
            18,
        );

        this.doc.text(
            value,
            this.marginX,
            this.y,
        );

        this.y +=
            10;
    }


    subtitle(
        value: string,
    ) {
        this.ensureSpace(
            10,
        );

        this.doc.setFont(
            "helvetica",
            "normal",
        );

        this.doc.setFontSize(
            10,
        );

        this.doc.text(
            value,
            this.marginX,
            this.y,
        );

        this.y +=
            8;
    }


    heading(
        value: string,
    ) {
        this.ensureSpace(
            14,
        );

        this.y +=
            3;

        this.doc.setFont(
            "helvetica",
            "bold",
        );

        this.doc.setFontSize(
            12,
        );

        this.doc.text(
            value,
            this.marginX,
            this.y,
        );

        this.y +=
            7;
    }


    labelValue(
        label: string,
        value:
            | string
            | number
            | null
            | undefined,
    ) {
        const text =
            `${label} : ${cleanText(value)}`;

        this.paragraph(
            text,
            {
                fontSize:
                    9.5,
            },
        );
    }


    paragraph(
        value: string,
        options?: {
            fontSize?: number;
            indent?: number;
            spacingAfter?: number;
        },
    ) {
        const fontSize =
            options?.fontSize ??
            9.5;

        const indent =
            options?.indent ??
            0;

        const spacingAfter =
            options?.spacingAfter ??
            2;

        this.doc.setFont(
            "helvetica",
            "normal",
        );

        this.doc.setFontSize(
            fontSize,
        );

        const lines =
            this.doc.splitTextToSize(
                cleanText(value),
                this.contentWidth -
                    indent,
            );

        for (
            const line of lines
        ) {
            this.ensureSpace(
                this.lineHeight,
            );

            this.doc.text(
                line,
                this.marginX +
                    indent,
                this.y,
            );

            this.y +=
                this.lineHeight;
        }

        this.y +=
            spacingAfter;
    }


    divider() {
        this.ensureSpace(
            6,
        );

        this.doc.setLineWidth(
            0.2,
        );

        this.doc.line(
            this.marginX,
            this.y,
            this.pageWidth -
                this.marginX,
            this.y,
        );

        this.y +=
            5;
    }


    addPageNumbers() {
        const pageCount =
            this.doc
                .getNumberOfPages();

        for (
            let page = 1;
            page <= pageCount;
            page += 1
        ) {
            this.doc.setPage(
                page,
            );

            this.doc.setFont(
                "helvetica",
                "normal",
            );

            this.doc.setFontSize(
                8,
            );

            this.doc.text(
                `Page ${page} / ${pageCount}`,
                this.pageWidth -
                    this.marginX,
                this.pageHeight -
                    7,
                {
                    align:
                        "right",
                },
            );
        }
    }
}


export const buildInspectionFinalPdf =
    (
        snapshot: InspectionSnapshot,
    ): InspectionFinalPdfArtifact => {
        const {
            inspection,
            rooms,
            meters,
            findings,
            documents,
            signatures,
        } = snapshot;


        const doc =
            new jsPDF({
                orientation:
                    "portrait",
                unit:
                    "mm",
                format:
                    "a4",
                compress:
                    true,
            });


        const writer =
            new PdfWriter(
                doc,
            );


        const fileName =
            buildFileName(
                snapshot,
            );


        doc.setProperties({
            title:
                `État des lieux ${inspection.reference ?? inspection.id}`,
            subject:
                "État des lieux final",
            creator:
                "AmImmo",
            author:
                "AmImmo",
        });


        writer.title(
            "ÉTAT DES LIEUX",
        );

        writer.subtitle(
            [
                inspection.reference
                    ? `Référence ${inspection.reference}`
                    : `ID ${inspection.id}`,
                `Version ${inspection.version}`,
            ].join(" · "),
        );


        writer.heading(
            "Informations générales",
        );

        writer.labelValue(
            "Type",
            kindLabels[
                inspection.kind
            ] ??
                inspection.kind,
        );

        writer.labelValue(
            "Date",
            formatDateTime(
                inspection.performed_at,
            ),
        );

        writer.labelValue(
            "Bien",
            inspection.property_id,
        );

        writer.labelValue(
            "Organisation",
            inspection.organization_id,
        );

        if (
            inspection.lease_id
        ) {
            writer.labelValue(
                "Bail",
                inspection.lease_id,
            );
        }

        if (
            inspection.booking_id
        ) {
            writer.labelValue(
                "Réservation",
                inspection.booking_id,
            );
        }


        writer.heading(
            "Observations générales",
        );

        writer.paragraph(
            inspection.observations ??
                "Aucune observation générale.",
        );


        writer.heading(
            "Pièces et équipements",
        );

        if (
            rooms.length === 0
        ) {
            writer.paragraph(
                "Aucune pièce enregistrée.",
            );
        }

        rooms.forEach(
            (
                room,
                roomIndex,
            ) => {
                writer.divider();

                writer.paragraph(
                    `${roomIndex + 1}. ${room.name}`,
                    {
                        fontSize:
                            10.5,
                    },
                );

                writer.labelValue(
                    "Type",
                    room.room_type,
                );

                writer.labelValue(
                    "État",
                    room.condition
                        ? conditionLabels[
                              room.condition
                          ] ??
                          room.condition
                        : "Non renseigné",
                );

                if (
                    room.observations
                ) {
                    writer.paragraph(
                        `Observations : ${room.observations}`,
                    );
                }

                if (
                    room.items.length ===
                    0
                ) {
                    writer.paragraph(
                        "Aucun équipement.",
                        {
                            indent:
                                4,
                        },
                    );
                }

                room.items.forEach(
                    (
                        item,
                        itemIndex,
                    ) => {
                        writer.paragraph(
                            `${itemIndex + 1}) ${item.name}`,
                            {
                                indent:
                                    4,
                            },
                        );

                        writer.paragraph(
                            [
                                `Quantité : ${item.quantity ?? 1}`,
                                `État : ${
                                    item.condition
                                        ? conditionLabels[
                                              item.condition
                                          ] ??
                                          item.condition
                                        : "Non renseigné"
                                }`,
                            ].join(
                                " · ",
                            ),
                            {
                                indent:
                                    8,
                                fontSize:
                                    9,
                            },
                        );

                        if (
                            item.observations
                        ) {
                            writer.paragraph(
                                item.observations,
                                {
                                    indent:
                                        8,
                                    fontSize:
                                        9,
                                },
                            );
                        }
                    },
                );
            },
        );


        writer.heading(
            "Compteurs",
        );

        if (
            meters.length === 0
        ) {
            writer.paragraph(
                "Aucun compteur enregistré.",
            );
        }

        meters.forEach(
            (
                meter,
                index,
            ) => {
                writer.paragraph(
                    `${index + 1}. ${meter.meter_type}`,
                );

                writer.paragraph(
                    [
                        meter.meter_number
                            ? `N° ${meter.meter_number}`
                            : null,
                        `Relevé ${meter.reading}${meter.unit ? ` ${meter.unit}` : ""}`,
                    ]
                        .filter(
                            Boolean,
                        )
                        .join(
                            " · ",
                        ),
                    {
                        indent:
                            4,
                        fontSize:
                            9,
                    },
                );

                if (
                    meter.observations
                ) {
                    writer.paragraph(
                        meter.observations,
                        {
                            indent:
                                4,
                            fontSize:
                                9,
                        },
                    );
                }
            },
        );


        writer.heading(
            "Constats et anomalies",
        );

        if (
            findings.length ===
            0
        ) {
            writer.paragraph(
                "Aucun constat enregistré.",
            );
        }

        findings.forEach(
            (
                finding,
                index,
            ) => {
                writer.paragraph(
                    `${index + 1}. ${finding.title}`,
                );

                writer.paragraph(
                    [
                        `Sévérité : ${
                            severityLabels[
                                finding.severity ??
                                    ""
                            ] ??
                            finding.severity ??
                            "Non renseignée"
                        }`,
                        finding.resolved
                            ? "Résolu"
                            : "Non résolu",
                    ].join(
                        " · ",
                    ),
                    {
                        indent:
                            4,
                        fontSize:
                            9,
                    },
                );

                if (
                    finding.description
                ) {
                    writer.paragraph(
                        finding.description,
                        {
                            indent:
                                4,
                            fontSize:
                                9,
                        },
                    );
                }

                if (
                    finding.estimated_cost !==
                        null &&
                    finding.estimated_cost !==
                        undefined
                ) {
                    writer.paragraph(
                        `Coût estimé : ${finding.estimated_cost}`,
                        {
                            indent:
                                4,
                            fontSize:
                                9,
                        },
                    );
                }
            },
        );


        writer.heading(
            "Documents et preuves",
        );

        writer.paragraph(
            `${documents.length} document(s) rattaché(s) à cet état des lieux.`,
        );

        documents.forEach(
            (
                document,
                index,
            ) => {
                writer.paragraph(
                    [
                        `${index + 1}.`,
                        `Catégorie : ${document.category ?? "other"}`,
                        `Référence : ${document.document_id}`,
                    ].join(
                        " ",
                    ),
                    {
                        fontSize:
                            8.5,
                    },
                );
            },
        );


        writer.heading(
            "Signatures",
        );

        signatures.forEach(
            (
                signature,
                index,
            ) => {
                writer.paragraph(
                    `${index + 1}. ${
                        signerRoleLabels[
                            signature.signer_role
                        ] ??
                        signature.signer_role
                    }`,
                );

                writer.paragraph(
                    [
                        `Signataire : ${signature.signer_name}`,
                        `Méthode : ${signature.signature_method}`,
                        `Version acceptée : ${signature.accepted_version}`,
                        `Date : ${formatDateTime(signature.signed_at)}`,
                    ].join(
                        " · ",
                    ),
                    {
                        indent:
                            4,
                        fontSize:
                            9,
                    },
                );
            },
        );


        writer.divider();

        writer.paragraph(
            `Document généré à partir de la version ${inspection.version} de l'état des lieux.`,
            {
                fontSize:
                    8.5,
            },
        );


        writer.addPageNumbers();


        /*
         * CRITICAL:
         * Generate the final PDF bytes exactly once.
         *
         * F2.2C-6C will calculate SHA-256 from this exact
         * ArrayBuffer and upload a Blob created from these
         * exact same bytes.
         */
        const arrayBuffer =
            doc.output(
                "arraybuffer",
            );


        const blob =
            new Blob(
                [
                    arrayBuffer,
                ],
                {
                    type:
                        FINAL_INSPECTION_PDF_MIME,
                },
            );


        return {
            fileName,
            arrayBuffer,
            blob,
            fileSize:
                arrayBuffer.byteLength,
        };
    };