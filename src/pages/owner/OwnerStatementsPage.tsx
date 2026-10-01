import {
  CircleDollarSign,
  Download,
  FileCheck2,
  FileText,
  HandCoins,
  Landmark,
  Loader2,
} from "lucide-react";

import {
  motion,
} from "framer-motion";

import {
  useState,
} from "react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import PageShell from "@/components/PageShell";

import {
  useMyOwnerStatements,
  type OwnerStatement,
} from "@/hooks/use-owner-portal";

import {
  supabase,
} from "@/integrations/supabase/client";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================
// TYPES PDF
// ============================================================

type StatementCollectionLine = {
  id: string;
  statement_id: string;
  ledger_id: string | null;

  property_id: string | null;
  property_title: string | null;

  invoice_number: string | null;
  payment_reference: string | null;

  collected_at: string;

  currency: string;

  gross_collected: number;
  commission_rate: number;
  commission_source: string | null;
  commission_amount: number;

  net_owner_amount: number;
  settled_amount: number;
  balance_to_settle: number;

  created_at: string;
};

type StatementSettlementLine = {
  id: string;
  statement_id: string;
  settlement_id: string;

  reference: string | null;
  settlement_date: string;

  amount: number;
  currency: string;

  treasury_account_name: string | null;
  external_reference: string | null;
  notes: string | null;

  created_at: string;
};

// ============================================================
// FORMATTERS
// ============================================================

function formatMoney(
  value:
    | number
    | null
    | undefined,
  currency = "GNF",
) {
  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits: 0,
    },
  ).format(
    Number(
      value ?? 0,
    ),
  )} ${currency}`;
}

function formatMoneyPdf(
  value:
    | number
    | null
    | undefined,
  currency = "GNF",
) {
  const formatted =
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 0,
      },
    )
      .format(
        Number(
          value ?? 0,
        ),
      )
      .replace(
        /\u202f|\u00a0/g,
        " ",
      );

  return `${formatted} ${currency}`;
}

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

function formatPeriod(
  start:
    | string
    | null
    | undefined,
  end:
    | string
    | null
    | undefined,
) {
  if (
    !start ||
    !end
  ) {
    return "—";
  }

  return `${formatDate(
    start,
  )} → ${formatDate(
    end,
  )}`;
}

// ============================================================
// COMMISSION SOURCE
// ============================================================

function getCommissionSourceLabel(
  source:
    | string
    | null
    | undefined,
) {
  switch (
    source
  ) {
    case "mandate":
      return "Mandat";

    case "owner":
      return "Propriétaire";

    default:
      return "Historique";
  }
}

// ============================================================
// STATUS
// ============================================================

function getStatementStatus(
  status:
    | string
    | null
    | undefined,
) {
  switch (
    status
  ) {
    case "issued":
      return {
        label:
          "Émis",

        className:
          "bg-info/15 text-info",
      };

    case "sent":
      return {
        label:
          "Envoyé",

        className:
          "bg-success/15 text-success",
      };

    case "cancelled":
      return {
        label:
          "Annulé",

        className:
          "bg-destructive/15 text-destructive",
      };

    default:
      return {
        label:
          status ??
          "—",

        className:
          "bg-muted text-muted-foreground",
      };
  }
}

// ============================================================
// PDF HELPERS
// ============================================================

function getPdfStatusLabel(
  status:
    | string
    | null
    | undefined,
) {
  switch (
    status
  ) {
    case "sent":
      return "ENVOYE";

    case "issued":
      return "EMIS";

    case "cancelled":
      return "ANNULE";

    default:
      return (
        status?.toUpperCase() ??
        "OFFICIEL"
      );
  }
}

function drawPdfHeader(
  pdf: jsPDF,
  statement: OwnerStatement,
) {
  const pageWidth =
    pdf.internal.pageSize.getWidth();

  pdf.setFillColor(
    17,
    24,
    39,
  );

  pdf.rect(
    0,
    0,
    pageWidth,
    31,
    "F",
  );

  pdf.setFillColor(
    245,
    158,
    11,
  );

  pdf.roundedRect(
    16,
    8,
    15,
    15,
    3,
    3,
    "F",
  );

  pdf.setTextColor(
    17,
    24,
    39,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    11,
  );

  pdf.text(
    "IP",
    23.5,
    17.5,
    {
      align: "center",
    },
  );

  pdf.setTextColor(
    255,
    255,
    255,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    16,
  );

  pdf.text(
    "ImmoPlate",
    37,
    14,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    8,
  );

  pdf.setTextColor(
    190,
    198,
    210,
  );

  pdf.text(
    "Gestion immobiliere",
    37,
    20,
  );

  pdf.setTextColor(
    255,
    255,
    255,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    13,
  );

  pdf.text(
    "RELEVE PROPRIETAIRE",
    pageWidth - 16,
    13,
    {
      align: "right",
    },
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    8,
  );

  pdf.setTextColor(
    190,
    198,
    210,
  );

  pdf.text(
    statement.reference,
    pageWidth - 16,
    20,
    {
      align: "right",
    },
  );

  pdf.setTextColor(
    20,
    25,
    35,
  );
}

function addPdfFooters(
  pdf: jsPDF,
  statement: OwnerStatement,
) {
  const pages =
    pdf.getNumberOfPages();

  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  for (
    let page = 1;
    page <= pages;
    page += 1
  ) {
    pdf.setPage(
      page,
    );

    pdf.setDrawColor(
      220,
      224,
      230,
    );

    pdf.line(
      15,
      pageHeight - 16,
      pageWidth - 15,
      pageHeight - 16,
    );

    pdf.setFont(
      "helvetica",
      "normal",
    );

    pdf.setFontSize(
      7.5,
    );

    pdf.setTextColor(
      110,
      118,
      130,
    );

    pdf.text(
      `ImmoPlate • Relevé ${statement.reference}`,
      15,
      pageHeight - 10,
    );

    pdf.text(
      `Page ${page} / ${pages}`,
      pageWidth - 15,
      pageHeight - 10,
      {
        align: "right",
      },
    );
  }
}

// ============================================================
// LOAD SNAPSHOT DETAIL
// ============================================================

async function loadStatementDetail(
  statementId: string,
) {
  const [
    collectionsResponse,
    settlementsResponse,
  ] =
    await Promise.all([
      supabase.rpc(
        "get_my_owner_statement_collections",
        {
          p_statement_id:
            statementId,
        },
      ),

      supabase.rpc(
        "get_my_owner_statement_settlements",
        {
          p_statement_id:
            statementId,
        },
      ),
    ]);

  if (
    collectionsResponse.error
  ) {
    throw collectionsResponse.error;
  }

  if (
    settlementsResponse.error
  ) {
    throw settlementsResponse.error;
  }

  const collections =
    (
      collectionsResponse.data ??
      []
    ).map(
      (
        row: any,
      ) => ({
        ...row,

        gross_collected:
          Number(
            row.gross_collected ??
              0,
          ),

        commission_rate:
          Number(
            row.commission_rate ??
              0,
          ),

        commission_amount:
          Number(
            row.commission_amount ??
              0,
          ),

        net_owner_amount:
          Number(
            row.net_owner_amount ??
              0,
          ),

        settled_amount:
          Number(
            row.settled_amount ??
              0,
          ),

        balance_to_settle:
          Number(
            row.balance_to_settle ??
              0,
          ),
      }),
    ) as StatementCollectionLine[];

  const settlements =
    (
      settlementsResponse.data ??
      []
    ).map(
      (
        row: any,
      ) => ({
        ...row,

        amount:
          Number(
            row.amount ??
              0,
          ),
      }),
    ) as StatementSettlementLine[];

  return {
    collections,
    settlements,
  };
}

// ============================================================
// PROFESSIONAL PDF
// ============================================================

async function downloadStatementPdf(
  statement: OwnerStatement,
) {
  const {
    collections,
    settlements,
  } =
    await loadStatementDetail(
      statement.id,
    );

  const pdf =
    new jsPDF({
      orientation:
        "portrait",

      unit:
        "mm",

      format:
        "a4",
    });

  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const margin =
    15;

  drawPdfHeader(
    pdf,
    statement,
  );

  let y =
    40;

  // ==========================================================
  // REFERENCE / PERIOD / STATUS
  // ==========================================================

  pdf.setFillColor(
    247,
    248,
    250,
  );

  pdf.roundedRect(
    margin,
    y,
    pageWidth -
      margin * 2,
    27,
    3,
    3,
    "F",
  );

  pdf.setFontSize(
    7.5,
  );

  pdf.setTextColor(
    105,
    115,
    130,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.text(
    "REFERENCE",
    margin + 6,
    y + 7,
  );

  pdf.text(
    "PERIODE",
    76,
    y + 7,
  );

  pdf.text(
    "DATE D'EMISSION",
    130,
    y + 7,
  );

  pdf.setTextColor(
    20,
    25,
    35,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    9.5,
  );

  pdf.text(
    statement.reference,
    margin + 6,
    y + 15,
  );

  pdf.text(
    `${formatDate(
      statement.period_start,
    )} - ${formatDate(
      statement.period_end,
    )}`,
    76,
    y + 15,
  );

  pdf.text(
    formatDate(
      statement.issued_at ??
        statement.created_at,
    ),
    130,
    y + 15,
  );

  const statusLabel =
    getPdfStatusLabel(
      statement.status,
    );

  if (
    statement.status ===
    "cancelled"
  ) {
    pdf.setFillColor(
      254,
      226,
      226,
    );

    pdf.setTextColor(
      185,
      28,
      28,
    );
  } else if (
    statement.status ===
    "sent"
  ) {
    pdf.setFillColor(
      220,
      252,
      231,
    );

    pdf.setTextColor(
      22,
      101,
      52,
    );
  } else {
    pdf.setFillColor(
      219,
      234,
      254,
    );

    pdf.setTextColor(
      30,
      64,
      175,
    );
  }

  pdf.roundedRect(
    pageWidth - 42,
    y + 18,
    21,
    5.5,
    2,
    2,
    "F",
  );

  pdf.setFontSize(
    6.5,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.text(
    statusLabel,
    pageWidth - 31.5,
    y + 21.7,
    {
      align:
        "center",
    },
  );

  pdf.setTextColor(
    20,
    25,
    35,
  );

  y +=
    35;

  // ==========================================================
  // OWNER INFORMATION
  // ==========================================================

  pdf.setFontSize(
    11,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.text(
    "Informations propriétaire",
    margin,
    y,
  );

  y +=
    5;

  pdf.setDrawColor(
    230,
    233,
    238,
  );

  pdf.setFillColor(
    252,
    252,
    253,
  );

  pdf.roundedRect(
    margin,
    y,
    pageWidth -
      margin * 2,
    30,
    2,
    2,
    "FD",
  );

  const ownerLeft =
    margin + 6;

  const ownerRight =
    109;

  pdf.setFontSize(
    7.5,
  );

  pdf.setTextColor(
    110,
    118,
    130,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.text(
    "PROPRIETAIRE",
    ownerLeft,
    y + 7,
  );

  pdf.text(
    "CONTACT",
    ownerRight,
    y + 7,
  );

  pdf.setTextColor(
    25,
    30,
    40,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    10,
  );

  pdf.text(
    statement.owner_name ??
      "—",
    ownerLeft,
    y + 14,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    8.5,
  );

  const address =
    [
      statement.owner_address,
      statement.owner_city,
    ]
      .filter(
        Boolean,
      )
      .join(
        ", ",
      );

  pdf.text(
    address ||
      "Adresse non renseignée",
    ownerLeft,
    y + 21,
  );

  const contactLines =
    [
      statement.owner_phone
        ? `Tel. : ${statement.owner_phone}`
        : null,

      statement.owner_email
        ? `E-mail : ${statement.owner_email}`
        : null,
    ].filter(
      Boolean,
    ) as string[];

  contactLines.forEach(
    (
      text,
      index,
    ) => {
      pdf.text(
        text,
        ownerRight,
        y +
          14 +
          index *
            6,
      );
    },
  );

  y +=
    40;

  // ==========================================================
  // FINANCIAL SUMMARY
  // ==========================================================

  pdf.setTextColor(
    20,
    25,
    35,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    11,
  );

  pdf.text(
    "Synthèse financière",
    margin,
    y,
  );

  y +=
    5;

  autoTable(
    pdf,
    {
      startY:
        y,

      margin: {
        left:
          margin,

        right:
          margin,
      },

      theme:
        "plain",

      body: [
        [
          "Solde d'ouverture",
          formatMoneyPdf(
            statement.opening_balance,
            statement.currency,
          ),
        ],

        [
          "Loyers encaissés",
          formatMoneyPdf(
            statement.gross_collected,
            statement.currency,
          ),
        ],

        [
          "Commissions de gestion",
          formatMoneyPdf(
            statement.commission_amount,
            statement.currency,
          ),
        ],

        [
          "Net propriétaire",
          formatMoneyPdf(
            statement.net_owner_amount,
            statement.currency,
          ),
        ],

        [
          "Reversements effectués",
          formatMoneyPdf(
            statement.settlements_amount,
            statement.currency,
          ),
        ],
      ],

      styles: {
        font:
          "helvetica",

        fontSize:
          8.8,

        cellPadding:
          3,

        textColor: [
          35,
          40,
          50,
        ],
      },

      columnStyles: {
        0: {
          cellWidth:
            105,
        },

        1: {
          halign:
            "right",

          fontStyle:
            "bold",
        },
      },

      alternateRowStyles: {
        fillColor: [
          249,
          250,
          251,
        ],
      },
    },
  );

  y =
    (
      pdf as any
    ).lastAutoTable
      .finalY +
    4;

  // ==========================================================
  // FINAL BALANCE
  // ==========================================================

  pdf.setFillColor(
    17,
    24,
    39,
  );

  pdf.roundedRect(
    margin,
    y,
    pageWidth -
      margin * 2,
    15,
    2.5,
    2.5,
    "F",
  );

  pdf.setTextColor(
    255,
    255,
    255,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    9,
  );

  pdf.text(
    "SOLDE A REVERSER",
    margin + 6,
    y + 9.5,
  );

  pdf.setFontSize(
    13,
  );

  pdf.text(
    formatMoneyPdf(
      statement.closing_balance,
      statement.currency,
    ),
    pageWidth -
      margin -
      6,
    y + 9.7,
    {
      align:
        "right",
    },
  );

  pdf.setTextColor(
    20,
    25,
    35,
  );

  y +=
    24;

  // ==========================================================
  // COLLECTION DETAILS
  // ==========================================================

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    11,
  );

  pdf.text(
    "Détail des encaissements",
    margin,
    y,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    7.5,
  );

  pdf.setTextColor(
    110,
    118,
    130,
  );

  pdf.text(
    `${collections.length} opération${
      collections.length >
      1
        ? "s"
        : ""
    }`,
    pageWidth - margin,
    y,
    {
      align:
        "right",
    },
  );

  pdf.setTextColor(
    20,
    25,
    35,
  );

  y +=
    4;

  autoTable(
    pdf,
    {
      startY:
        y,

      margin: {
        left:
          margin,

        right:
          margin,

        bottom:
          23,
      },

      head: [
        [
          "Date",
          "Bien / Pièce",
          "Encaissé",
          "Commission",
          "Net propriétaire",
        ],
      ],

      body:
        collections.length >
        0
          ? collections.map(
              (
                line,
              ) => [
                formatDate(
                  line.collected_at,
                ),

                [
                  line.property_title ||
                    "Bien immobilier",

                  line.invoice_number
                    ? `Facture : ${line.invoice_number}`
                    : null,

                  line.payment_reference
                    ? `Paiement : ${line.payment_reference}`
                    : null,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    "\n",
                  ),

                formatMoneyPdf(
                  line.gross_collected,
                  line.currency,
                ),

                `${formatMoneyPdf(
                  line.commission_amount,
                  line.currency,
                )}\n${line.commission_rate}% • ${getCommissionSourceLabel(
                  line.commission_source,
                )}`,

                formatMoneyPdf(
                  line.net_owner_amount,
                  line.currency,
                ),
              ],
            )
          : [
              [
                "—",
                "Aucun encaissement",
                "—",
                "—",
                "—",
              ],
            ],

      theme:
        "grid",

      styles: {
        font:
          "helvetica",

        fontSize:
          7,

        cellPadding:
          2.6,

        lineColor: [
          225,
          228,
          233,
        ],

        lineWidth:
          0.15,

        valign:
          "middle",
      },

      headStyles: {
        fillColor: [
          17,
          24,
          39,
        ],

        textColor: [
          255,
          255,
          255,
        ],

        fontStyle:
          "bold",

        fontSize:
          7.2,
      },

      columnStyles: {
        0: {
          cellWidth:
            22,
        },

        1: {
          cellWidth:
            60,
        },

        2: {
          cellWidth:
            33,

          halign:
            "right",
        },

        3: {
          cellWidth:
            37,

          halign:
            "right",
        },

        4: {
          cellWidth:
            33,

          halign:
            "right",
        },
      },

      alternateRowStyles: {
        fillColor: [
          249,
          250,
          251,
        ],
      },

      didDrawPage: (
        data,
      ) => {
        if (
          data.pageNumber >
          1
        ) {
          drawPdfHeader(
            pdf,
            statement,
          );
        }
      },
    },
  );

  y =
    (
      pdf as any
    ).lastAutoTable
      .finalY +
    10;

  // ==========================================================
  // SETTLEMENT DETAILS
  // ==========================================================

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  if (
    y >
    pageHeight -
      65
  ) {
    pdf.addPage();

    drawPdfHeader(
      pdf,
      statement,
    );

    y =
      40;
  }

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    11,
  );

  pdf.setTextColor(
    20,
    25,
    35,
  );

  pdf.text(
    "Détail des reversements",
    margin,
    y,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    7.5,
  );

  pdf.setTextColor(
    110,
    118,
    130,
  );

  pdf.text(
    `${settlements.length} reversement${
      settlements.length >
      1
        ? "s"
        : ""
    }`,
    pageWidth - margin,
    y,
    {
      align:
        "right",
    },
  );

  y +=
    4;

  autoTable(
    pdf,
    {
      startY:
        y,

      margin: {
        left:
          margin,

        right:
          margin,

        bottom:
          23,
      },

      head: [
        [
          "Date",
          "Référence",
          "Moyen de paiement",
          "Réf. externe",
          "Montant",
        ],
      ],

      body:
        settlements.length >
        0
          ? settlements.map(
              (
                line,
              ) => [
                formatDate(
                  line.settlement_date,
                ),

                line.reference ||
                  "—",

                line.treasury_account_name ||
                  "—",

                line.external_reference ||
                  "—",

                formatMoneyPdf(
                  line.amount,
                  line.currency,
                ),
              ],
            )
          : [
              [
                "—",
                "Aucun reversement",
                "—",
                "—",
                "—",
              ],
            ],

      theme:
        "grid",

      styles: {
        font:
          "helvetica",

        fontSize:
          7,

        cellPadding:
          2.6,

        lineColor: [
          225,
          228,
          233,
        ],

        lineWidth:
          0.15,

        valign:
          "middle",
      },

      headStyles: {
        fillColor: [
          17,
          24,
          39,
        ],

        textColor: [
          255,
          255,
          255,
        ],

        fontStyle:
          "bold",
      },

      columnStyles: {
        0: {
          cellWidth:
            23,
        },

        1: {
          cellWidth:
            52,
        },

        2: {
          cellWidth:
            38,
        },

        3: {
          cellWidth:
            35,
        },

        4: {
          cellWidth:
            37,

          halign:
            "right",
        },
      },

      alternateRowStyles: {
        fillColor: [
          249,
          250,
          251,
        ],
      },

      didDrawPage: (
        data,
      ) => {
        if (
          data.pageNumber >
          1
        ) {
          drawPdfHeader(
            pdf,
            statement,
          );
        }
      },
    },
  );

  y =
    (
      pdf as any
    ).lastAutoTable
      .finalY +
    10;

  // ==========================================================
  // NOTES
  // ==========================================================

  if (
    statement.notes
  ) {
    if (
      y >
      pageHeight -
        50
    ) {
      pdf.addPage();

      drawPdfHeader(
        pdf,
        statement,
      );

      y =
        40;
    }

    pdf.setFont(
      "helvetica",
      "bold",
    );

    pdf.setFontSize(
      9,
    );

    pdf.setTextColor(
      20,
      25,
      35,
    );

    pdf.text(
      "Notes",
      margin,
      y,
    );

    y +=
      5;

    pdf.setFillColor(
      249,
      250,
      251,
    );

    const notes =
      pdf.splitTextToSize(
        statement.notes,
        pageWidth -
          margin * 2 -
          12,
      );

    const notesHeight =
      Math.max(
        13,
        notes.length *
          4 +
          8,
      );

    pdf.roundedRect(
      margin,
      y,
      pageWidth -
        margin * 2,
      notesHeight,
      2,
      2,
      "F",
    );

    pdf.setFont(
      "helvetica",
      "normal",
    );

    pdf.setFontSize(
      8,
    );

    pdf.setTextColor(
      80,
      88,
      100,
    );

    pdf.text(
      notes,
      margin + 6,
      y + 7,
    );

    y +=
      notesHeight +
      7;
  }

  // ==========================================================
  // CANCELLED NOTICE
  // ==========================================================

  if (
    statement.status ===
    "cancelled"
  ) {
    if (
      y >
      pageHeight -
        42
    ) {
      pdf.addPage();

      drawPdfHeader(
        pdf,
        statement,
      );

      y =
        40;
    }

    pdf.setFillColor(
      254,
      226,
      226,
    );

    pdf.roundedRect(
      margin,
      y,
      pageWidth -
        margin * 2,
      20,
      2,
      2,
      "F",
    );

    pdf.setTextColor(
      185,
      28,
      28,
    );

    pdf.setFont(
      "helvetica",
      "bold",
    );

    pdf.setFontSize(
      10,
    );

    pdf.text(
      "RELEVE ANNULE",
      margin + 6,
      y + 7,
    );

    const reason =
      statement.cancellation_reason
        ? `Motif : ${statement.cancellation_reason}`
        : "Ce relevé a été annulé.";

    pdf.setFont(
      "helvetica",
      "normal",
    );

    pdf.setFontSize(
      8,
    );

    pdf.text(
      reason,
      margin + 6,
      y + 14,
    );
  }

  addPdfFooters(
    pdf,
    statement,
  );

  const safeReference =
    statement.reference.replace(
      /[^a-zA-Z0-9-_]/g,
      "_",
    );

  pdf.save(
    `${safeReference}.pdf`,
  );
}

// ============================================================
// KPI CARD
// ============================================================

type KpiCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
};

const KpiCard = ({
  title,
  value,
  subtitle,
  icon,
}: KpiCardProps) => {
  return (
    <div className="premium-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground sm:text-sm">
            {title}
          </p>

          <p className="mt-1 break-words text-xl font-bold tracking-tight sm:text-2xl">
            {value}
          </p>

          <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            {subtitle}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10">
          {icon}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MOBILE STATEMENT CARD
// ============================================================

type StatementMobileCardProps = {
  statement: OwnerStatement;
  index: number;
  downloading: boolean;
  onDownload: (
    statement: OwnerStatement,
  ) => void;
};

const StatementMobileCard = ({
  statement,
  index,
  downloading,
  onDownload,
}: StatementMobileCardProps) => {
  const status =
    getStatementStatus(
      statement.status,
    );

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay:
          index * 0.025,
      }}
      className="premium-card overflow-hidden"
    >
      {/* ===================================================== */}
      {/* HEADER                                                */}
      {/* ===================================================== */}

      <div className="border-b bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />

              <p className="min-w-0 break-all text-sm font-semibold">
                {
                  statement.reference
                }
              </p>
            </div>

            <p className="mt-1.5 text-xs text-muted-foreground">
              Émis le{" "}
              {formatDate(
                statement.issued_at ??
                  statement.created_at,
              )}
            </p>
          </div>

          <Badge
            className={`${status.className} shrink-0 whitespace-nowrap border-0 text-[10px]`}
          >
            {
              status.label
            }
          </Badge>
        </div>

        <div className="mt-3 rounded-lg border bg-background/70 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Période
          </p>

          <p className="mt-1 text-sm font-medium">
            {formatPeriod(
              statement.period_start,
              statement.period_end,
            )}
          </p>
        </div>
      </div>

      {/* ===================================================== */}
      {/* MAIN VALUES                                           */}
      {/* ===================================================== */}

      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Encaissé
          </p>

          <p className="mt-1 break-words text-base font-bold">
            {formatMoney(
              statement.gross_collected,
              statement.currency,
            )}
          </p>
        </div>

        <div className="bg-card p-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Solde
          </p>

          <p className="mt-1 break-words text-base font-bold text-primary">
            {formatMoney(
              statement.closing_balance,
              statement.currency,
            )}
          </p>
        </div>
      </div>

      {/* ===================================================== */}
      {/* FINANCIAL DETAILS                                     */}
      {/* ===================================================== */}

      <div className="divide-y px-4">
        <div className="flex items-start justify-between gap-4 py-3">
          <span className="text-xs text-muted-foreground">
            Commissions
          </span>

          <span className="text-right text-sm font-medium">
            {formatMoney(
              statement.commission_amount,
              statement.currency,
            )}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 py-3">
          <span className="text-xs text-muted-foreground">
            Net propriétaire
          </span>

          <span className="text-right text-sm font-semibold">
            {formatMoney(
              statement.net_owner_amount,
              statement.currency,
            )}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 py-3">
          <span className="text-xs text-muted-foreground">
            Reversements
          </span>

          <span className="text-right text-sm font-medium">
            {formatMoney(
              statement.settlements_amount,
              statement.currency,
            )}
          </span>
        </div>
      </div>

      {/* ===================================================== */}
      {/* DOCUMENT                                              */}
      {/* ===================================================== */}

      <div className="border-t bg-muted/10 p-4">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={
            downloading
          }
          onClick={() =>
            onDownload(
              statement,
            )
          }
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}

          {downloading
            ? "Génération du PDF..."
            : "Télécharger le relevé PDF"}
        </Button>
      </div>
    </motion.article>
  );
};

// ============================================================
// OWNER STATEMENTS PAGE
// ============================================================

const OwnerStatementsPage =
  () => {
    const {
      data:
        statements,

      isLoading,

      isError,

      error,

      refetch,
    } =
      useMyOwnerStatements();

    const [
      downloadingId,
      setDownloadingId,
    ] =
      useState<
        string | null
      >(
        null,
      );

    const [
      pdfError,
      setPdfError,
    ] =
      useState<
        string | null
      >(
        null,
      );

    const rows =
      statements ??
      [];

    const activeRows =
      rows.filter(
        (
          statement,
        ) =>
          statement.status !==
          "cancelled",
      );

    const totalGross =
      activeRows.reduce(
        (
          sum,
          statement,
        ) =>
          sum +
          Number(
            statement.gross_collected ??
              0,
          ),
        0,
      );

    const totalSettlements =
      activeRows.reduce(
        (
          sum,
          statement,
        ) =>
          sum +
          Number(
            statement.settlements_amount ??
              0,
          ),
        0,
      );

    const latestStatement =
      activeRows[0] ??
      null;

    // ========================================================
    // DOWNLOAD
    // ========================================================

    const handleDownload =
      async (
        statement:
          OwnerStatement,
      ) => {
        try {
          setPdfError(
            null,
          );

          setDownloadingId(
            statement.id,
          );

          await downloadStatementPdf(
            statement,
          );
        } catch (
          downloadError
        ) {
          console.error(
            "[OwnerStatements] PDF :",
            downloadError,
          );

          setPdfError(
            downloadError instanceof
              Error
              ? downloadError.message
              : "Impossible de générer le relevé PDF.",
          );
        } finally {
          setDownloadingId(
            null,
          );
        }
      };

    // ========================================================
    // LOADING
    // ========================================================

    if (
      isLoading
    ) {
      return (
        <div className="flex min-h-[20rem] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      );
    }

    // ========================================================
    // ERROR
    // ========================================================

    if (
      isError
    ) {
      return (
        <div className="premium-card border-destructive/20 bg-destructive/5 p-5 sm:p-6">
          <h1 className="font-semibold text-destructive">
            Impossible de charger vos relevés
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Une erreur est survenue pendant la récupération de vos relevés propriétaire.
          </p>

          {error instanceof
            Error && (
            <p className="mt-3 break-words text-xs text-destructive">
              {
                error.message
              }
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() =>
              void refetch()
            }
          >
            Réessayer
          </Button>
        </div>
      );
    }

    // ========================================================
    // UI
    // ========================================================

    return (
      <PageShell
        title="Mes relevés"
        subtitle="Consultez et téléchargez vos relevés propriétaire officiels"
        actions={
          <Badge
            variant="outline"
            className="bg-background"
          >
            Lecture seule
          </Badge>
        }
      >
        {/* =================================================== */}
        {/* KPI                                                 */}
        {/* =================================================== */}

        <section className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            title="Relevés disponibles"
            value={String(
              activeRows.length,
            )}
            subtitle="Relevés officiels"
            icon={
              <FileCheck2 className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Loyers encaissés"
            value={formatMoney(
              totalGross,
            )}
            subtitle="Sur les relevés disponibles"
            icon={
              <CircleDollarSign className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Reversements"
            value={formatMoney(
              totalSettlements,
            )}
            subtitle="Montants déjà reversés"
            icon={
              <HandCoins className="h-5 w-5" />
            }
          />

          <KpiCard
            title="Dernier solde"
            value={
              latestStatement
                ? formatMoney(
                    latestStatement.closing_balance,
                    latestStatement.currency,
                  )
                : "—"
            }
            subtitle={
              latestStatement
                ? `Relevé ${latestStatement.reference}`
                : "Aucun relevé disponible"
            }
            icon={
              <Landmark className="h-5 w-5" />
            }
          />
        </section>

        {/* =================================================== */}
        {/* PDF ERROR                                           */}
        {/* =================================================== */}

        {pdfError && (
          <div className="mb-4 break-words rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {pdfError}
          </div>
        )}

        {/* =================================================== */}
        {/* EMPTY                                               */}
        {/* =================================================== */}

        {rows.length ===
        0 ? (
          <div className="premium-card p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>

            <h2 className="mt-4 font-semibold">
              Aucun relevé disponible
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Aucun relevé propriétaire officiel n'a encore été émis pour votre compte.
            </p>
          </div>
        ) : (
          <>
            {/* =============================================== */}
            {/* MOBILE CARDS                                    */}
            {/* =============================================== */}

            <section className="space-y-3 md:hidden">
              {rows.map(
                (
                  statement,
                  index,
                ) => (
                  <StatementMobileCard
                    key={
                      statement.id
                    }
                    statement={
                      statement
                    }
                    index={
                      index
                    }
                    downloading={
                      downloadingId ===
                      statement.id
                    }
                    onDownload={(
                      value,
                    ) =>
                      void handleDownload(
                        value,
                      )
                    }
                  />
                ),
              )}
            </section>

            {/* =============================================== */}
            {/* DESKTOP TABLE                                   */}
            {/* =============================================== */}

            <div className="premium-card hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">
                        Référence
                      </TableHead>

                      <TableHead className="font-semibold">
                        Période
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Encaissé
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Commissions
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Net propriétaire
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Reversements
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Solde
                      </TableHead>

                      <TableHead className="font-semibold">
                        Statut
                      </TableHead>

                      <TableHead className="text-right font-semibold">
                        Document
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rows.map(
                      (
                        statement,
                        index,
                      ) => {
                        const status =
                          getStatementStatus(
                            statement.status,
                          );

                        const downloading =
                          downloadingId ===
                          statement.id;

                        return (
                          <motion.tr
                            key={
                              statement.id
                            }
                            initial={{
                              opacity:
                                0,
                            }}
                            animate={{
                              opacity:
                                1,
                            }}
                            transition={{
                              delay:
                                index *
                                0.02,
                            }}
                            className="transition-colors hover:bg-muted/30"
                          >
                            <TableCell>
                              <div className="min-w-[170px]">
                                <p className="text-sm font-semibold">
                                  {
                                    statement.reference
                                  }
                                </p>

                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  Émis le{" "}
                                  {formatDate(
                                    statement.issued_at ??
                                      statement.created_at,
                                  )}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-sm">
                              {formatPeriod(
                                statement.period_start,
                                statement.period_end,
                              )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                              {formatMoney(
                                statement.gross_collected,
                                statement.currency,
                              )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {formatMoney(
                                statement.commission_amount,
                                statement.currency,
                              )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-right text-sm font-semibold">
                              {formatMoney(
                                statement.net_owner_amount,
                                statement.currency,
                              )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {formatMoney(
                                statement.settlements_amount,
                                statement.currency,
                              )}
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-right text-sm font-bold">
                              {formatMoney(
                                statement.closing_balance,
                                statement.currency,
                              )}
                            </TableCell>

                            <TableCell>
                              <Badge
                                className={`${status.className} whitespace-nowrap border-0 text-xs`}
                              >
                                {
                                  status.label
                                }
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  downloading
                                }
                                className="gap-2"
                                onClick={() =>
                                  void handleDownload(
                                    statement,
                                  )
                                }
                              >
                                {downloading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}

                                <span className="hidden xl:inline">
                                  {downloading
                                    ? "Génération..."
                                    : "PDF"}
                                </span>
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      },
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </PageShell>
    );
  };

export default OwnerStatementsPage;