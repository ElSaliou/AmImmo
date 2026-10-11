import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type {
  TenantPortalInvoiceDetail,
  TenantPortalInvoiceLine,
  TenantPortalPayment,
  TenantPortalPaymentDetail,
} from "@/hooks/use-tenant-portal";

// ============================================================
// IMMOPLATE BRAND — SOBER DOCUMENT PALETTE
// ============================================================

type RGB = readonly [
  number,
  number,
  number,
];

const COLORS = {
  navy:
    [14, 39, 88] as RGB,

  orange:
    [255, 153, 0] as RGB,

  text:
    [25, 30, 40] as RGB,

  muted:
    [105, 113, 128] as RGB,

  border:
    [220, 224, 230] as RGB,

  soft:
    [247, 248, 250] as RGB,

  success:
    [31, 145, 91] as RGB,

  warning:
    [217, 135, 0] as RGB,

  danger:
    [200, 45, 45] as RGB,

  white:
    [255, 255, 255] as RGB,
};

const rgb = (
  color: RGB,
): [number, number, number] => [
  color[0],
  color[1],
  color[2],
];

const setFill = (
  doc: jsPDF,
  color: RGB,
) => {
  doc.setFillColor(
    ...rgb(color),
  );
};

const setText = (
  doc: jsPDF,
  color: RGB,
) => {
  doc.setTextColor(
    ...rgb(color),
  );
};

const setDraw = (
  doc: jsPDF,
  color: RGB,
) => {
  doc.setDrawColor(
    ...rgb(color),
  );
};

// ============================================================
// FORMATTERS
// ============================================================

const formatMoney = (
  amount:
    | number
    | null
    | undefined,
  currency = "GNF",
) => {
  const value =
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits:
          0,
      },
    )
      .format(
        Number(
          amount ?? 0,
        ),
      )
      .replace(
        /\u202f|\u00a0/g,
        " ",
      );

  return `${value} ${currency}`;
};

const formatQuantity = (
  value: number,
) => {
  if (
    Number.isInteger(
      value,
    )
  ) {
    return String(value);
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits:
        2,
    },
  ).format(value);
};

const formatDate = (
  value:
    | string
    | null
    | undefined,
) => {
  if (!value) {
    return "—";
  }

  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
      ? new Date(
          `${value}T00:00:00`,
        )
      : new Date(value);

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
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  ).format(date);
};

const formatDateLong = (
  value:
    | string
    | null
    | undefined,
) => {
  if (!value) {
    return "—";
  }

  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
      ? new Date(
          `${value}T00:00:00`,
        )
      : new Date(value);

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
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    },
  ).format(date);
};

const safeFilename = (
  value: string,
) =>
  value.replace(
    /[^a-zA-Z0-9-_]/g,
    "_",
  );

// ============================================================
// LABELS
// ============================================================

const getInvoiceStatusLabel = (
  status:
    | string
    | null,
) => {
  switch (status) {
    case "draft":
      return "Brouillon";

    case "issued":
      return "Émise";

    case "partially_paid":
      return "Partiellement payée";

    case "paid":
      return "Payée";

    case "overdue":
      return "En retard";

    case "cancelled":
      return "Annulée";

    default:
      return (
        status ??
        "—"
      );
  }
};

const getPaymentMethodLabel = (
  method:
    | string
    | null,
) => {
  switch (method) {
    case "cash":
      return "Espèces";

    case "transfer":
    case "bank_transfer":
      return "Virement bancaire";

    case "mobile_money":
      return "Mobile Money";

    case "card":
      return "Carte bancaire";

    case "cheque":
      return "Chèque";

    case "other":
      return "Autre";

    default:
      return (
        method ??
        "Non renseigné"
      );
  }
};

const getPaymentStatusLabel = (
  status:
    | string
    | null,
) => {
  switch (status) {
    case "completed":
    case "paid":
      return "Effectué";

    case "pending":
      return "En attente";

    case "failed":
      return "Échoué";

    case "cancelled":
      return "Annulé";

    case "refunded":
      return "Remboursé";

    default:
      return (
        status ??
        "—"
      );
  }
};

// ============================================================
// BUSINESS RULES
// ============================================================

export const canDownloadTenantPaymentReceipt =
  (
    payment:
      TenantPortalPayment,
  ) =>
    (
      payment.status ===
        "completed" ||
      payment.status ===
        "paid"
    ) &&
    !payment.isRefund;

export const canDownloadTenantRentReceipt =
  (
    invoice:
      TenantPortalInvoiceDetail,
  ) =>
    invoice.kind ===
      "rent" &&
    invoice.status ===
      "paid" &&
    invoice.balanceDue <=
      0;

// ============================================================
// BASIC DOCUMENT
// ============================================================

const createDocument =
  () => {
    const doc =
      new jsPDF({
        orientation:
          "portrait",

        unit:
          "mm",

        format:
          "a4",
      });

    return {
      doc,

      width:
        doc.internal.pageSize.getWidth(),

      height:
        doc.internal.pageSize.getHeight(),

      margin:
        16,
    };
  };

// ============================================================
// SIMPLE VECTOR LOGO
// ============================================================

const drawLogo = (
  doc: jsPDF,
  x: number,
  y: number,
) => {
  setFill(
    doc,
    COLORS.navy,
  );

  doc.roundedRect(
    x,
    y,
    10,
    10,
    2,
    2,
    "F",
  );

  setFill(
    doc,
    COLORS.orange,
  );

  doc.rect(
    x + 2.3,
    y + 2.1,
    5.4,
    1.2,
    "F",
  );

  setFill(
    doc,
    COLORS.white,
  );

  doc.rect(
    x + 3,
    y + 3.8,
    4,
    4.5,
    "F",
  );
};

// ============================================================
// HEADER
// ============================================================

const drawHeader = (
  doc: jsPDF,
  params: {
    title: string;
    reference: string;
    status?: string;
    statusColor?: RGB;
  },
) => {
  const width =
    doc.internal.pageSize.getWidth();

  drawLogo(
    doc,
    16,
    13,
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(15);

  setText(
    doc,
    COLORS.navy,
  );

  doc.text(
    "ImmoPlate",
    30,
    18,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(7.5);

  setText(
    doc,
    COLORS.muted,
  );

  doc.text(
    "Plateforme immobilière premium",
    30,
    23,
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(16);

  setText(
    doc,
    COLORS.text,
  );

  doc.text(
    params.title,
    width - 16,
    18,
    {
      align:
        "right",
    },
  );

  doc.setFontSize(8.5);

  setText(
    doc,
    COLORS.navy,
  );

  doc.text(
    params.reference,
    width - 16,
    24,
    {
      align:
        "right",
    },
  );

  if (
    params.status
  ) {
    doc.setFontSize(7);

    setText(
      doc,
      params.statusColor ??
        COLORS.navy,
    );

    doc.text(
      params.status.toUpperCase(),
      width - 16,
      29,
      {
        align:
          "right",
      },
    );
  }

  setDraw(
    doc,
    COLORS.border,
  );

  doc.line(
    16,
    35,
    width - 16,
    35,
  );

  setDraw(
    doc,
    COLORS.orange,
  );

  doc.setLineWidth(
    1.2,
  );

  doc.line(
    16,
    35,
    47,
    35,
  );

  doc.setLineWidth(
    0.2,
  );

  return 44;
};

// ============================================================
// TWO COLUMN PARTY BLOCK
// ============================================================

const drawParties = (
  doc: jsPDF,
  y: number,
  invoice:
    TenantPortalInvoiceDetail,
) => {
  const leftX =
    16;

  const rightX =
    108;

  const drawTitle =
    (
      title: string,
      x: number,
    ) => {
      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(7);

      setText(
        doc,
        COLORS.muted,
      );

      doc.text(
        title.toUpperCase(),
        x,
        y,
      );
    };

  drawTitle(
    "Locataire",
    leftX,
  );

  drawTitle(
    "Location",
    rightX,
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(10);

  setText(
    doc,
    COLORS.text,
  );

  doc.text(
    invoice.tenant
      ?.fullName ??
      "—",
    leftX,
    y + 7,
  );

  doc.text(
    invoice.property
      ?.title ??
      "—",
    rightX,
    y + 7,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(8);

  setText(
    doc,
    COLORS.muted,
  );

  doc.text(
    invoice.tenant
      ?.email ??
      "—",
    leftX,
    y + 13,
  );

  doc.text(
    invoice.property
      ?.reference ??
      "—",
    rightX,
    y + 13,
  );

  doc.text(
    invoice.tenant
      ?.phone ??
      "",
    leftX,
    y + 19,
  );

  doc.text(
    `Bail : ${
      invoice.lease
        ?.reference ??
      "—"
    }`,
    rightX,
    y + 19,
  );

  doc.text(
    `Période : ${formatDate(
      invoice.periodStart,
    )} au ${formatDate(
      invoice.periodEnd,
    )}`,
    rightX,
    y + 25,
  );

  return y + 34;
};

// ============================================================
// INVOICE LINES TABLE
// ============================================================

const getPdfLines = (
  invoice:
    TenantPortalInvoiceDetail,
): TenantPortalInvoiceLine[] => {
  if (
    invoice.lines.length >
    0
  ) {
    return invoice.lines;
  }

  return [
    {
      id:
        "fallback",

      label:
        "Montant facturé",

      quantity:
        1,

      unitPrice:
        invoice.amount,

      amount:
        invoice.amount,
    },
  ];
};

const drawInvoiceLines = (
  doc: jsPDF,
  y: number,
  invoice:
    TenantPortalInvoiceDetail,
) => {
  const lines =
    getPdfLines(
      invoice,
    );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(8);

  setText(
    doc,
    COLORS.navy,
  );

  doc.text(
    "DÉTAIL DE LA FACTURE",
    16,
    y,
  );

  autoTable(
    doc,
    {
      startY:
        y + 5,

      head: [
        [
          "Désignation",
          "Qté",
          "Prix unitaire",
          "Montant",
        ],
      ],

      body:
        lines.map(
          (
            line,
          ) => [
            line.label,

            formatQuantity(
              line.quantity,
            ),

            formatMoney(
              line.unitPrice,
              invoice.currency,
            ),

            formatMoney(
              line.amount,
              invoice.currency,
            ),
          ],
        ),

      theme:
        "plain",

      headStyles: {
        fillColor:
          rgb(
            COLORS.navy,
          ),

        textColor:
          rgb(
            COLORS.white,
          ),

        fontStyle:
          "bold",

        fontSize:
          7.5,

        cellPadding:
          3,
      },

      bodyStyles: {
        fontSize:
          8,

        cellPadding:
          3.2,

        textColor:
          rgb(
            COLORS.text,
          ),
      },

      styles: {
        font:
          "helvetica",

        lineColor:
          rgb(
            COLORS.border,
          ),

        lineWidth:
          0.1,
      },

      columnStyles: {
        0: {
          cellWidth:
            76,
        },

        1: {
          cellWidth:
            18,

          halign:
            "center",
        },

        2: {
          cellWidth:
            42,

          halign:
            "right",
        },

        3: {
          cellWidth:
            42,

          halign:
            "right",

          fontStyle:
            "bold",
        },
      },

      didParseCell:
        (
          data,
        ) => {
          if (
            data.section ===
              "body" &&
            data.row.index %
              2 ===
              1
          ) {
            data.cell.styles.fillColor =
              rgb(
                COLORS.soft,
              );
          }
        },

      margin: {
        left:
          16,

        right:
          16,
      },
    },
  );

  const table =
    (
      doc as jsPDF & {
        lastAutoTable?: {
          finalY:
            number;
        };
      }
    ).lastAutoTable;

  return (
    table?.finalY ??
    y + 25
  );
};

// ============================================================
// TOTALS
// ============================================================

const drawTotals = (
  doc: jsPDF,
  y: number,
  invoice:
    TenantPortalInvoiceDetail,
) => {
  const labelX =
    125;

  const valueX =
    194;

  const drawRow =
    (
      label: string,
      value: string,
      currentY: number,
      bold = false,
      color:
        RGB =
        COLORS.text,
    ) => {
      doc.setFont(
        "helvetica",
        bold
          ? "bold"
          : "normal",
      );

      doc.setFontSize(
        bold
          ? 9.5
          : 8.5,
      );

      setText(
        doc,
        color,
      );

      doc.text(
        label,
        labelX,
        currentY,
      );

      doc.text(
        value,
        valueX,
        currentY,
        {
          align:
            "right",
        },
      );
    };

  let currentY =
    y + 9;

  drawRow(
    "Total",
    formatMoney(
      invoice.amount,
      invoice.currency,
    ),
    currentY,
    true,
    COLORS.navy,
  );

  currentY +=
    7;

  drawRow(
    "Payé",
    formatMoney(
      invoice.paidAmount,
      invoice.currency,
    ),
    currentY,
    false,
    COLORS.success,
  );

  currentY +=
    7;

  setDraw(
    doc,
    COLORS.border,
  );

  doc.line(
    labelX,
    currentY - 3.5,
    valueX,
    currentY - 3.5,
  );

  drawRow(
    "Reste à payer",
    formatMoney(
      invoice.balanceDue,
      invoice.currency,
    ),
    currentY + 2,
    true,
    invoice.balanceDue >
    0
      ? COLORS.warning
      : COLORS.success,
  );

  return currentY + 13;
};

// ============================================================
// INVOICE META + NOTES
// ============================================================

const drawInvoiceMeta = (
  doc: jsPDF,
  y: number,
  invoice:
    TenantPortalInvoiceDetail,
) => {
  setDraw(
    doc,
    COLORS.border,
  );

  doc.line(
    16,
    y,
    194,
    y,
  );

  y +=
    7;

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(7.5);

  setText(
    doc,
    COLORS.muted,
  );

  doc.text(
    "Date d'émission",
    16,
    y,
  );

  doc.text(
    "Échéance",
    63,
    y,
  );

  doc.text(
    "Statut",
    106,
    y,
  );

  doc.text(
    "Devise",
    158,
    y,
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(8);

  setText(
    doc,
    COLORS.text,
  );

  doc.text(
    formatDate(
      invoice.issueDate,
    ),
    16,
    y + 6,
  );

  doc.text(
    formatDate(
      invoice.dueDate,
    ),
    63,
    y + 6,
  );

  doc.text(
    getInvoiceStatusLabel(
      invoice.status,
    ),
    106,
    y + 6,
  );

  doc.text(
    invoice.currency,
    158,
    y + 6,
  );

  y +=
    18;

  if (
    invoice.notes
  ) {
    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(7);

    setText(
      doc,
      COLORS.muted,
    );

    doc.text(
      "NOTE",
      16,
      y,
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(8);

    setText(
      doc,
      COLORS.text,
    );

    const lines =
      doc.splitTextToSize(
        invoice.notes,
        115,
      );

    doc.text(
      lines,
      16,
      y + 6,
    );

    y +=
      7 +
      lines.length *
        4;
  }

  return y;
};

// ============================================================
// SMALL SIGNATURE / STAMP
// ============================================================

const drawSignature = (
  doc: jsPDF,
  y: number,
) => {
  const height =
    doc.internal.pageSize.getHeight();

  const availableY =
    Math.min(
      Math.max(
        y + 6,
        226,
      ),
      height - 50,
    );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(7);

  setText(
    doc,
    COLORS.muted,
  );

  doc.text(
    "SIGNATURE / CACHET",
    145,
    availableY,
  );

  setDraw(
    doc,
    COLORS.border,
  );

  doc.line(
    145,
    availableY +
      25,
    194,
    availableY +
      25,
  );
};

// ============================================================
// FOOTER
// ============================================================

const drawFooter = (
  doc: jsPDF,
  reference: string,
) => {
  const pages =
    doc.getNumberOfPages();

  for (
    let page =
      1;
    page <=
    pages;
    page++
  ) {
    doc.setPage(page);

    const width =
      doc.internal.pageSize.getWidth();

    const height =
      doc.internal.pageSize.getHeight();

    setDraw(
      doc,
      COLORS.border,
    );

    doc.line(
      16,
      height - 16,
      width - 16,
      height - 16,
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(6.5);

    setText(
      doc,
      COLORS.muted,
    );

    doc.text(
      "Document généré depuis l'espace locataire ImmoPlate.",
      16,
      height - 10,
    );

    doc.text(
      `${reference} • ${page}/${pages}`,
      width - 16,
      height - 10,
      {
        align:
          "right",
      },
    );
  }
};

// ============================================================
// FACTURE
// ============================================================

export const downloadTenantInvoicePdf =
  (
    invoice:
      TenantPortalInvoiceDetail,
  ) => {
    const {
      doc,
    } =
      createDocument();

    const statusColor =
      invoice.status ===
        "paid"
        ? COLORS.success
        : invoice.status ===
            "partially_paid"
          ? COLORS.warning
          : invoice.status ===
              "overdue"
            ? COLORS.danger
            : COLORS.navy;

    let y =
      drawHeader(
        doc,
        {
          title:
            "FACTURE",

          reference:
            invoice.number,

          status:
            getInvoiceStatusLabel(
              invoice.status,
            ),

          statusColor,
        },
      );

    y =
      drawParties(
        doc,
        y,
        invoice,
      );

    y =
      drawInvoiceLines(
        doc,
        y,
        invoice,
      );

    y =
      drawTotals(
        doc,
        y,
        invoice,
      );

    y =
      drawInvoiceMeta(
        doc,
        y,
        invoice,
      );

    drawSignature(
      doc,
      y,
    );

    drawFooter(
      doc,
      invoice.number,
    );

    doc.save(
      `${safeFilename(
        invoice.number,
      )}.pdf`,
    );
  };

// ============================================================
// REÇU — HEADER INFO
// ============================================================

const drawReceiptInfo = (
  doc: jsPDF,
  y: number,
  detail:
    TenantPortalPaymentDetail,
) => {
  const {
    payment,
    invoice,
    tenant,
    lease,
    property,
  } =
    detail;

  autoTable(
    doc,
    {
      startY:
        y,

      body: [
        [
          "Locataire",
          tenant
            ?.fullName ??
            "—",
        ],

        [
          "Date du paiement",
          formatDateLong(
            payment.paidAt ??
              payment.createdAt,
          ),
        ],

        [
          "Mode de paiement",
          getPaymentMethodLabel(
            payment.method,
          ),
        ],

        [
          "Facture",
          invoice
            ?.number ??
            "—",
        ],

        [
          "Bail",
          lease
            ?.reference ??
            "—",
        ],

        [
          "Logement",
          property
            ?.title ??
            "—",
        ],
      ],

      theme:
        "plain",

      styles: {
        font:
          "helvetica",

        fontSize:
          8.5,

        cellPadding:
          3.3,

        textColor:
          rgb(
            COLORS.text,
          ),

        lineColor:
          rgb(
            COLORS.border,
          ),

        lineWidth:
          {
            bottom:
              0.1,
          },
      },

      columnStyles: {
        0: {
          cellWidth:
            52,

          fontStyle:
            "bold",

          textColor:
            rgb(
              COLORS.muted,
            ),
        },

        1: {
          cellWidth:
            126,
        },
      },

      margin: {
        left:
          16,

        right:
          16,
      },
    },
  );

  const table =
    (
      doc as jsPDF & {
        lastAutoTable?: {
          finalY:
            number;
        };
      }
    ).lastAutoTable;

  return (
    table?.finalY ??
    y + 50
  );
};

// ============================================================
// REÇU DE PAIEMENT
// ============================================================

export const downloadTenantPaymentReceiptPdf =
  (
    detail:
      TenantPortalPaymentDetail,
  ) => {
    if (
      !canDownloadTenantPaymentReceipt(
        detail.payment,
      )
    ) {
      throw new Error(
        "Ce paiement ne permet pas encore de générer un reçu définitif.",
      );
    }

    const payment =
      detail.payment;

    const reference =
      payment.reference ??
      payment.id;

    const {
      doc,
    } =
      createDocument();

    let y =
      drawHeader(
        doc,
        {
          title:
            "REÇU DE PAIEMENT",

          reference,

          status:
            getPaymentStatusLabel(
              payment.status,
            ),

          statusColor:
            COLORS.success,
        },
      );

    // Amount
    setFill(
      doc,
      COLORS.soft,
    );

    doc.roundedRect(
      16,
      y,
      178,
      27,
      2.5,
      2.5,
      "F",
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(7);

    setText(
      doc,
      COLORS.muted,
    );

    doc.text(
      "MONTANT REÇU",
      23,
      y + 9,
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(18);

    setText(
      doc,
      COLORS.navy,
    );

    doc.text(
      formatMoney(
        payment.amount,
        payment.currency,
      ),
      23,
      y + 20,
    );

    y +=
      36;

    y =
      drawReceiptInfo(
        doc,
        y,
        detail,
      );

    y +=
      10;

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(8.5);

    setText(
      doc,
      COLORS.text,
    );

    const message =
      detail.invoice
        ? `Paiement de ${formatMoney(
            payment.amount,
            payment.currency,
          )} reçu au titre de la facture ${detail.invoice.number}.`
        : `Paiement de ${formatMoney(
            payment.amount,
            payment.currency,
          )} enregistré sur le dossier locataire.`;

    const messageLines =
      doc.splitTextToSize(
        message,
        150,
      );

    doc.text(
      messageLines,
      16,
      y,
    );

    drawSignature(
      doc,
      y + 10,
    );

    drawFooter(
      doc,
      reference,
    );

    doc.save(
      `recu-${safeFilename(
        reference,
      )}.pdf`,
    );
  };

// ============================================================
// QUITTANCE
// ============================================================

export const downloadTenantRentReceiptPdf =
  (
    invoice:
      TenantPortalInvoiceDetail,
  ) => {
    if (
      !canDownloadTenantRentReceipt(
        invoice,
      )
    ) {
      throw new Error(
        "La quittance est disponible uniquement lorsque le loyer est intégralement réglé.",
      );
    }

    const {
      doc,
    } =
      createDocument();

    let y =
      drawHeader(
        doc,
        {
          title:
            "QUITTANCE DE LOYER",

          reference:
            invoice.number,

          status:
            "Réglée",

          statusColor:
            COLORS.success,
        },
      );

    y =
      drawParties(
        doc,
        y,
        invoice,
      );

    y =
      drawInvoiceLines(
        doc,
        y,
        invoice,
      );

    y =
      drawTotals(
        doc,
        y,
        invoice,
      );

    y +=
      5;

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(8.5);

    setText(
      doc,
      COLORS.text,
    );

    const text =
      `La présente quittance atteste du règlement intégral des sommes dues pour la période du ${formatDateLong(
        invoice.periodStart,
      )} au ${formatDateLong(
        invoice.periodEnd,
      )}, pour un montant total de ${formatMoney(
        invoice.paidAmount,
        invoice.currency,
      )}.`;

    const lines =
      doc.splitTextToSize(
        text,
        150,
      );

    doc.text(
      lines,
      16,
      y,
    );

    drawSignature(
      doc,
      y + 12,
    );

    drawFooter(
      doc,
      invoice.number,
    );

    doc.save(
      `quittance-${safeFilename(
        invoice.number,
      )}.pdf`,
    );
  };