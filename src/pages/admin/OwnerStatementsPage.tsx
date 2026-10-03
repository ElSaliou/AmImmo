import {
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";

import { fr } from "date-fns/locale";

import {
  ArrowDownToLine,
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  ReceiptText,
  Send,
  WalletCards,
  Ban,
  Mail,
  MessageCircle,
} from "lucide-react";

import * as XLSX from "xlsx";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  getOfficialOwnerStatementBundle,
  useCreateOfficialOwnerStatement,
  useOfficialOwnerStatements,
  useOwnerStatement,
  useOwnerStatementOwners,
  useMarkOwnerStatementSent,
  useCancelOwnerStatement,
  type CommissionSource,
  type OwnerStatementSendChannel,
  type OfficialOwnerStatement,
  type OfficialOwnerStatementBundle,
} from "@/hooks/use-owner-statements";

// ============================================================
// HELPERS
// ============================================================

const toInputDate = (
  date: Date,
) =>
  format(
    date,
    "yyyy-MM-dd",
  );

// ============================================================
// FORMATAGE MONTANTS INTERFACE / EXCEL
// ============================================================

const formatMoney = (
  value: number | null | undefined,
  currency = "GNF",
) => {
  const amount = Number(value ?? 0);

  const formatted =
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 0,
      },
    )
      .format(amount)
      .replace(/\u202F/g, " ")
      .replace(/\u00A0/g, " ");

  return `${formatted} ${currency}`;
};

// ============================================================
// FORMATAGE MONTANTS PDF
// ============================================================

const formatMoneyPdf = (
  value: number | null | undefined,
  currency = "GNF",
) => {
  const amount = Math.round(
    Number(value ?? 0),
  );

  const formatted = amount
    .toString()
    .replace(
      /\B(?=(\d{3})+(?!\d))/g,
      " ",
    );

  return `${formatted} ${currency}`;
};

const formatDate = (
  value: string | null | undefined,
) => {
  if (!value) return "—";

  try {
    return format(
      new Date(value),
      "dd/MM/yyyy",
      {
        locale: fr,
      },
    );
  } catch {
    return value;
  }
};

const formatDateTime = (
  value: string | null | undefined,
) => {
  if (!value) return "—";

  try {
    return format(
      new Date(value),
      "dd/MM/yyyy HH:mm",
      {
        locale: fr,
      },
    );
  } catch {
    return value;
  }
};

const getCommissionSourceLabel = (
  source: CommissionSource,
) => {
  switch (source) {
    case "mandate":
      return "Mandat";

    case "owner":
      return "Propriétaire";

    case "global":
      return "Global";

    default:
      return "Historique";
  }
};

const getStatusLabel = (
  status: OfficialOwnerStatement["status"],
) => {
  switch (status) {
    case "issued":
      return "Émis";

    case "sent":
      return "Envoyé";

    case "cancelled":
      return "Annulé";

    case "draft":
      return "Brouillon";

    default:
      return status;
  }
};

const getStatusVariant = (
  status: OfficialOwnerStatement["status"],
):
  | "default"
  | "secondary"
  | "outline"
  | "destructive" => {
  switch (status) {
    case "sent":
      return "default";

    case "issued":
      return "secondary";

    case "cancelled":
      return "destructive";

    default:
      return "outline";
  }
};

const getSendChannelLabel = (
  channel: OfficialOwnerStatement["sent_channel"],
) => {
  switch (channel) {
    case "email":
      return "Email";
    case "whatsapp":
      return "WhatsApp";
    case "manual":
      return "Manuel";
    default:
      return "—";
  }
};

// ============================================================
// KPI
// ============================================================

function KpiCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description?: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {title}
            </p>

            <p className="text-xl font-semibold tracking-tight">
              {value}
            </p>

            {description ? (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg bg-muted p-2.5">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// OFFICIAL PDF
// ============================================================

const buildOfficialPdf = (
  bundle: OfficialOwnerStatementBundle,
) => {
  const {
    statement,
    collections,
    settlements,
  } = bundle;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  // ==========================================================
  // HEADER
  // ==========================================================

  doc.setFontSize(19);

  doc.text(
    "ImmoPlate",
    14,
    16,
  );

  doc.setFontSize(15);

  doc.text(
    "RELEVÉ PROPRIÉTAIRE",
    14,
    25,
  );

  doc.setFontSize(10);

  doc.text(
    `Référence : ${statement.reference}`,
    14,
    33,
  );

  doc.text(
    `Statut : ${getStatusLabel(
      statement.status,
    ).toUpperCase()}`,
    14,
    39,
  );

  doc.text(
    `Période : ${formatDate(
      statement.period_start,
    )} au ${formatDate(
      statement.period_end,
    )}`,
    14,
    45,
  );

  doc.text(
    `Date d'émission : ${formatDate(
      statement.issued_at ??
        statement.created_at,
    )}`,
    14,
    51,
  );

  // ==========================================================
  // OWNER
  // ==========================================================

  doc.setFontSize(12);

  doc.text(
    "Propriétaire",
    14,
    62,
  );

  doc.setFontSize(9);

  let ownerY = 69;

  doc.text(
    `Nom : ${
      statement.owner_name ?? "—"
    }`,
    14,
    ownerY,
  );

  ownerY += 5;

  if (statement.owner_company) {
    doc.text(
      `Société : ${statement.owner_company}`,
      14,
      ownerY,
    );

    ownerY += 5;
  }

  doc.text(
    `Téléphone : ${
      statement.owner_phone ?? "—"
    }`,
    14,
    ownerY,
  );

  ownerY += 5;

  doc.text(
    `Email : ${
      statement.owner_email ?? "—"
    }`,
    14,
    ownerY,
  );

  ownerY += 5;

  doc.text(
    `Adresse : ${
      statement.owner_address ?? "—"
    }${
      statement.owner_city
        ? `, ${statement.owner_city}`
        : ""
    }`,
    14,
    ownerY,
  );

  // ==========================================================
  // PROPERTIES
  // ==========================================================

  const properties = Array.from(
    new Set(
      collections
        .map(
          (line) =>
            line.property_title,
        )
        .filter(Boolean),
    ),
  );

  ownerY += 10;

  doc.setFontSize(12);

  doc.text(
    "Bien(s) concerné(s)",
    14,
    ownerY,
  );

  doc.setFontSize(9);

  ownerY += 6;

  if (properties.length) {
    properties.forEach(
      (property) => {
        doc.text(
          `• ${property}`,
          16,
          ownerY,
        );

        ownerY += 5;
      },
    );
  } else {
    doc.text(
      "—",
      16,
      ownerY,
    );

    ownerY += 5;
  }

  // ==========================================================
  // SUMMARY
  // ==========================================================

  autoTable(doc, {
    startY:
      ownerY + 4,

    head: [
      [
        "Synthèse financière",
        "Montant",
      ],
    ],

    body: [
      [
        "Solde d'ouverture",

        formatMoneyPdf(
          statement.opening_balance,
          statement.currency,
        ),
      ],

      [
        "Encaissements bruts",

        formatMoneyPdf(
          statement.gross_collected,
          statement.currency,
        ),
      ],

      [
        "Commissions ImmoPlate",

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

      [
        "SOLDE DE CLÔTURE",

        formatMoneyPdf(
          statement.closing_balance,
          statement.currency,
        ),
      ],
    ],

    styles: {
      fontSize: 9,
    },

    columnStyles: {
      1: {
        halign: "right",
      },
    },

    didParseCell: (data) => {
      if (
        data.section === "body" &&
        data.row.index === 5
      ) {
        data.cell.styles.fontStyle =
          "bold";
      }
    },
  });

  let y =
    (doc as any)
      .lastAutoTable
      ?.finalY ?? 120;

  // ==========================================================
  // COLLECTIONS
  // ==========================================================

  y += 9;

  doc.setFontSize(11);

  doc.text(
    "Détail des encaissements",
    14,
    y,
  );

  autoTable(doc, {
    startY: y + 4,

    head: [
      [
        "Date",
        "Bien",
        "Facture",
        "Brut",
        "Taux",
        "Commission",
        "Net",
      ],
    ],

    body:
      collections.length > 0
        ? collections.map(
            (line) => [
              formatDate(
                line.collected_at,
              ),

              line.property_title ??
                "—",

              line.invoice_number ??
                "—",

              formatMoneyPdf(
                line.gross_collected,
                line.currency,
              ),

              `${line.commission_rate}%`,

              formatMoneyPdf(
                line.commission_amount,
                line.currency,
              ),

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
              "—",
              "—",
            ],
          ],

    styles: {
      fontSize: 7,
    },

    margin: {
      left: 8,
      right: 8,
    },
  });

  y =
    (doc as any)
      .lastAutoTable
      ?.finalY ?? y;

  // ==========================================================
  // SETTLEMENTS
  // ==========================================================

  y += 9;

  if (
    y >
    doc.internal.pageSize.getHeight() -
      45
  ) {
    doc.addPage();

    y = 18;
  }

  doc.setFontSize(11);

  doc.text(
    "Reversements au propriétaire",
    14,
    y,
  );

  autoTable(doc, {
    startY:
      y + 4,

    head: [
      [
        "Date",
        "Référence",
        "Compte",
        "Montant",
      ],
    ],

    body:
      settlements.length > 0
        ? settlements.map(
            (line) => [
              formatDate(
                line.settlement_date,
              ),

              line.reference,

              line.treasury_account_name ??
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
              "0 GNF",
            ],
          ],

    styles: {
      fontSize: 8,
    },
  });

  y =
    (doc as any)
      .lastAutoTable
      ?.finalY ?? y;

  // ==========================================================
  // VALIDATION
  // ==========================================================

  y += 8;

  if (
    y >
    doc.internal.pageSize.getHeight() -
      38
  ) {
    doc.addPage();

    y = 20;
  }

  doc.setFontSize(10);

  doc.text(
    "Validation",
    14,
    y,
  );

  doc.setFontSize(8);

  doc.text(
    "Établi par ImmoPlate",
    14,
    y + 8,
  );

  doc.text(
    `Émis le ${formatDate(
      statement.issued_at ??
        statement.created_at,
    )}`,
    14,
    y + 14,
  );

  doc.text(
    "Signature / cachet :",
    120,
    y + 8,
  );

  doc.setFontSize(7.5);

  doc.text(
    "Ce relevé récapitule les encaissements enregistrés et les reversements comptabilisés sur la période indiquée.",
    14,
    y + 24,
    {
      maxWidth: 180,
    },
  );

  // ==========================================================
  // FOOTER
  // ==========================================================

  const pageCount =
    doc.getNumberOfPages();

  for (
    let page = 1;
    page <= pageCount;
    page += 1
  ) {
    doc.setPage(page);

    doc.setFontSize(7);

    doc.text(
      `${statement.reference} — Page ${page}/${pageCount}`,
      pageWidth / 2,
      290,
      {
        align: "center",
      },
    );
  }

  return doc;
};

const exportOfficialPdf = (
  bundle: OfficialOwnerStatementBundle,
) => {
  const doc = buildOfficialPdf(bundle);

  doc.save(
    `${bundle.statement.reference}.pdf`,
  );
};

const getOfficialPdfBase64 = (
  bundle: OfficialOwnerStatementBundle,
) => {
  const doc = buildOfficialPdf(bundle);
  const dataUri = doc.output("datauristring");
  const commaIndex = dataUri.indexOf(",");

  if (commaIndex === -1) {
    throw new Error("Impossible de convertir le relevé PDF pour l'envoi.");
  }

  return dataUri.slice(commaIndex + 1);
};

// ============================================================
// OFFICIAL EXCEL
// ============================================================

const exportOfficialExcel = (
  bundle: OfficialOwnerStatementBundle,
) => {
  const {
    statement,
    collections,
    settlements,
  } = bundle;

  const workbook =
    XLSX.utils.book_new();

  const properties = Array.from(
    new Set(
      collections
        .map(
          (line) =>
            line.property_title,
        )
        .filter(Boolean),
    ),
  );

  const summarySheet =
    XLSX.utils.aoa_to_sheet([
      [
        "RELEVÉ PROPRIÉTAIRE",
        "",
      ],

      [
        "Référence",
        statement.reference,
      ],

      [
        "Statut",
        getStatusLabel(
          statement.status,
        ),
      ],

      [
        "Propriétaire",
        statement.owner_name ?? "",
      ],

      [
        "Téléphone",
        statement.owner_phone ?? "",
      ],

      [
        "Email",
        statement.owner_email ?? "",
      ],

      [
        "Adresse",
        [
          statement.owner_address,
          statement.owner_city,
        ]
          .filter(Boolean)
          .join(", "),
      ],

      [
        "Biens concernés",
        properties.join(" / "),
      ],

      [
        "Période",
        `${formatDate(
          statement.period_start,
        )} - ${formatDate(
          statement.period_end,
        )}`,
      ],

      [
        "Date d'émission",
        formatDate(
          statement.issued_at ??
            statement.created_at,
        ),
      ],

      [],

      [
        "Solde d'ouverture",
        statement.opening_balance,
      ],

      [
        "Encaissements",
        statement.gross_collected,
      ],

      [
        "Commissions",
        statement.commission_amount,
      ],

      [
        "Net propriétaire",
        statement.net_owner_amount,
      ],

      [
        "Reversements",
        statement.settlements_amount,
      ],

      [
        "Solde de clôture",
        statement.closing_balance,
      ],
    ]);

  summarySheet["!cols"] = [
    {
      wch: 28,
    },

    {
      wch: 48,
    },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    "Relevé",
  );

  const collectionSheet =
    XLSX.utils.json_to_sheet(
      collections.map(
        (line) => ({
          Date:
            formatDateTime(
              line.collected_at,
            ),

          Bien:
            line.property_title ??
            "",

          Facture:
            line.invoice_number ??
            "",

          Paiement:
            line.payment_reference ??
            "",

          Brut:
            line.gross_collected,

          "Taux (%)":
            line.commission_rate,

          Source:
            getCommissionSourceLabel(
              line.commission_source,
            ),

          Commission:
            line.commission_amount,

          "Net propriétaire":
            line.net_owner_amount,

          "Reste à reverser":
            line.balance_to_settle,

          Devise:
            line.currency,
        }),
      ),
    );

  XLSX.utils.book_append_sheet(
    workbook,
    collectionSheet,
    "Encaissements",
  );

  const settlementSheet =
    XLSX.utils.json_to_sheet(
      settlements.map(
        (line) => ({
          Date:
            formatDateTime(
              line.settlement_date,
            ),

          Référence:
            line.reference,

          Compte:
            line.treasury_account_name ??
            "",

          Montant:
            line.amount,

          Devise:
            line.currency,

          "Référence externe":
            line.external_reference ??
            "",

          Notes:
            line.notes,
        }),
      ),
    );

  XLSX.utils.book_append_sheet(
    workbook,
    settlementSheet,
    "Reversements",
  );

  XLSX.writeFile(
    workbook,
    `${statement.reference}.xlsx`,
  );
};

// ============================================================
// PAGE
// ============================================================

export default function OwnerStatementsPage() {
  const now =
    new Date();

  const [
    ownerId,
    setOwnerId,
  ] = useState("");

  const [
    startDate,
    setStartDate,
  ] = useState(
    toInputDate(
      startOfMonth(now),
    ),
  );

  const [
    endDate,
    setEndDate,
  ] = useState(
    toInputDate(
      endOfMonth(now),
    ),
  );

  const [
    officialActionId,
    setOfficialActionId,
  ] = useState<
    string | null
  >(null);

  const [sendDialogStatement, setSendDialogStatement] =
    useState<OfficialOwnerStatement | null>(null);

  const [sendChannel, setSendChannel] =
    useState<OwnerStatementSendChannel>("email");

  const [sendTo, setSendTo] = useState("");
  const [sendReference, setSendReference] = useState("");

  const [isSendingStatement, setIsSendingStatement] =
    useState(false);

  const sendInFlightRef =
    useRef(false);

  const emailAttemptRef =
    useRef<{
      id: string;
      statementId: string;
      recipient: string;
      pdfBase64: string;
      filename: string;
    } | null>(null);

  const [cancelDialogStatement, setCancelDialogStatement] =
    useState<OfficialOwnerStatement | null>(null);

  const [cancellationReason, setCancellationReason] =
    useState("");

  // ==========================================================
  // DATA
  // ==========================================================

  const ownersQuery =
    useOwnerStatementOwners();

  const statement =
    useOwnerStatement({
      ownerId,
      startDate,
      endDate,
    });

  const officialHistory =
    useOfficialOwnerStatements(
      ownerId,
    );

  const createOfficial =
    useCreateOfficialOwnerStatement();

  const markSent = useMarkOwnerStatementSent();
  const cancelStatement = useCancelOwnerStatement();

  const {
    summary,
    lines,
    settlements,
  } = statement;

  const selectedOwner =
    useMemo(
      () =>
        ownersQuery.data?.find(
          (owner) =>
            owner.id ===
            ownerId,
        ) ?? null,
      [
        ownersQuery.data,
        ownerId,
      ],
    );

  const currency =
    summary?.currency ??
    "GNF";

  const existingOfficialForPeriod =
    useMemo(
      () =>
        officialHistory.data?.find(
          (item) =>
            item.period_start ===
              startDate &&
            item.period_end ===
              endDate &&
            (
              item.status ===
                "issued" ||
              item.status ===
                "sent"
            ),
        ) ?? null,
      [
        officialHistory.data,
        startDate,
        endDate,
      ],
    );

  // ==========================================================
  // PERIOD
  // ==========================================================

  const setCurrentMonth = () => {
    const date =
      new Date();

    setStartDate(
      toInputDate(
        startOfMonth(date),
      ),
    );

    setEndDate(
      toInputDate(
        endOfMonth(date),
      ),
    );
  };

  const setPreviousMonth = () => {
    const date =
      subMonths(
        new Date(),
        1,
      );

    setStartDate(
      toInputDate(
        startOfMonth(date),
      ),
    );

    setEndDate(
      toInputDate(
        endOfMonth(date),
      ),
    );
  };

  const hasValidPeriod =
    Boolean(
      startDate &&
        endDate &&
        startDate <= endDate,
    );

  // ==========================================================
  // GENERATE OFFICIAL
  // ==========================================================

  const handleCreateOfficial =
    async () => {
      if (
        !ownerId ||
        !summary ||
        !hasValidPeriod
      ) {
        return;
      }

      try {
        const id =
          await createOfficial.mutateAsync({
            ownerId,
            startDate,
            endDate,

            notes:
              `Relevé officiel ${formatDate(
                startDate,
              )} au ${formatDate(
                endDate,
              )}`,
          });

        toast.success(
          "Le relevé officiel a été généré.",
        );

        const bundle =
          await getOfficialOwnerStatementBundle(
            id,
          );

        exportOfficialPdf(
          bundle,
        );
      } catch (error: any) {
        toast.error(
          error?.message ??
            "Impossible de générer le relevé officiel.",
        );
      }
    };

  // ==========================================================
  // OFFICIAL EXPORT
  // ==========================================================

  const handleOfficialPdf =
    async (
      statementId: string,
    ) => {
      try {
        setOfficialActionId(
          statementId,
        );

        const bundle =
          await getOfficialOwnerStatementBundle(
            statementId,
          );

        exportOfficialPdf(
          bundle,
        );
      } catch (error: any) {
        toast.error(
          error?.message ??
            "Impossible de générer le PDF.",
        );
      } finally {
        setOfficialActionId(
          null,
        );
      }
    };

  const handleOfficialExcel =
    async (
      statementId: string,
    ) => {
      try {
        setOfficialActionId(
          statementId,
        );

        const bundle =
          await getOfficialOwnerStatementBundle(
            statementId,
          );

        exportOfficialExcel(
          bundle,
        );
      } catch (error: any) {
        toast.error(
          error?.message ??
            "Impossible de générer le fichier Excel.",
        );
      } finally {
        setOfficialActionId(
          null,
        );
      }
    };

  // ==========================================================
  // DELIVERY
  // ==========================================================

  const openSendDialog = (document: OfficialOwnerStatement) => {
    if (document.status === "cancelled") {
      toast.error("Un relevé annulé ne peut pas être envoyé.");
      return;
    }

    const channel: OwnerStatementSendChannel =
      document.owner_email
        ? "email"
        : document.owner_phone
          ? "whatsapp"
          : "manual";

    setSendChannel(channel);

    setSendTo(
      channel === "email"
        ? document.owner_email ?? ""
        : channel === "whatsapp"
          ? document.owner_phone ?? ""
          : document.owner_email ?? document.owner_phone ?? "",
    );

    setSendReference("");
    emailAttemptRef.current = null;
    setSendDialogStatement(document);
  };

  const handleChannelChange = (channel: OwnerStatementSendChannel) => {
    emailAttemptRef.current = null;
    setSendChannel(channel);

    if (!sendDialogStatement) return;

    if (channel === "email") {
      setSendTo(sendDialogStatement.owner_email ?? "");
    } else if (channel === "whatsapp") {
      setSendTo(sendDialogStatement.owner_phone ?? "");
    } else {
      setSendTo(
        sendDialogStatement.owner_email ??
          sendDialogStatement.owner_phone ??
          "",
      );
    }
  };

  const handleConfirmSent = async () => {
    if (
      !sendDialogStatement ||
      sendInFlightRef.current
    ) {
      return;
    }

    const recipient = sendTo.trim();

    if (!recipient) {
      toast.error("Le destinataire est obligatoire.");
      return;
    }

    if (
      sendChannel === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
    ) {
      toast.error("L'adresse email du destinataire est invalide.");
      return;
    }

    sendInFlightRef.current = true;
    setIsSendingStatement(true);

    try {
      let effectiveSendReference =
        sendReference.trim() || null;

      // Envoi email réel via Supabase Edge Function + Resend.
      if (sendChannel === "email") {
        let emailAttempt =
          emailAttemptRef.current;

        if (
          !emailAttempt ||
          emailAttempt.statementId !==
            sendDialogStatement.id ||
          emailAttempt.recipient !==
            recipient
        ) {
          const bundle =
            await getOfficialOwnerStatementBundle(
              sendDialogStatement.id,
            );

          const pdfBase64 =
            getOfficialPdfBase64(bundle);

          emailAttempt = {
            id: crypto.randomUUID(),
            statementId:
              sendDialogStatement.id,
            recipient,
            pdfBase64,
            filename:
              `${sendDialogStatement.reference}.pdf`,
          };

          emailAttemptRef.current =
            emailAttempt;
        }

        const {
          data,
          error,
        } = await supabase.functions.invoke(
          "send-owner-statement-email",
          {
            body: {
              statementId:
                emailAttempt.statementId,
              recipient:
                emailAttempt.recipient,
              pdfBase64:
                emailAttempt.pdfBase64,
              filename:
                emailAttempt.filename,
              deliveryAttemptId:
                emailAttempt.id,
            },
          },
        );

        if (error) {
          throw new Error(
            error.message ||
              "L'envoi de l'email a échoué.",
          );
        }

        if (!data?.success) {
          throw new Error(
            data?.error ||
              "L'envoi de l'email a échoué.",
          );
        }

        effectiveSendReference =
          data.emailId ||
          effectiveSendReference;
      }

      await markSent.mutateAsync({
        id: sendDialogStatement.id,
        ownerId:
          sendDialogStatement.owner_id,
        channel: sendChannel,
        sentTo: recipient,
        sentReference:
          effectiveSendReference,
      });

      toast.success(
        sendChannel === "email"
          ? "Le relevé PDF a été envoyé par email et marqué comme envoyé."
          : "Le relevé est maintenant marqué comme envoyé.",
      );

      emailAttemptRef.current = null;
      setSendDialogStatement(null);
      setSendReference("");
    } catch (error: any) {
      toast.error(
        error?.message ??
          (sendChannel === "email"
            ? "Impossible d'envoyer le relevé par email."
            : "Impossible de marquer le relevé comme envoyé."),
      );
    } finally {
      sendInFlightRef.current = false;
      setIsSendingStatement(false);
    }
  };

  // ==========================================================
  // CANCELLATION
  // ==========================================================

  const openCancelDialog = (document: OfficialOwnerStatement) => {
    if (document.status === "cancelled") {
      toast.error("Ce relevé est déjà annulé.");
      return;
    }

    setCancellationReason("");
    setCancelDialogStatement(document);
  };

  const handleConfirmCancellation = async () => {
    if (!cancelDialogStatement) return;

    const reason = cancellationReason.trim();

    if (!reason) {
      toast.error("Le motif d'annulation est obligatoire.");
      return;
    }

    try {
      await cancelStatement.mutateAsync({
        id: cancelDialogStatement.id,
        ownerId: cancelDialogStatement.owner_id,
        reason,
      });

      toast.success("Le relevé a été annulé.");
      setCancelDialogStatement(null);
      setCancellationReason("");
    } catch (error: any) {
      toast.error(
        error?.message ??
          "Impossible d'annuler le relevé.",
      );
    }
  };

  // ==========================================================
  // ERROR
  // ==========================================================

  const errorMessage =
    statement.error instanceof Error
      ? statement.error.message
      : "Impossible de charger le relevé.";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* ===================================================== */}
      {/* HEADER                                                */}
      {/* ===================================================== */}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Relevés propriétaires
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Consultation financière et génération des relevés officiels.
        </p>
      </div>

      {/* ===================================================== */}
      {/* FILTERS                                               */}
      {/* ===================================================== */}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Sélection du relevé
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Propriétaire
              </label>

              <Select
                value={ownerId}
                onValueChange={
                  setOwnerId
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un propriétaire" />
                </SelectTrigger>

                <SelectContent>
                  {ownersQuery.data?.map(
                    (owner) => (
                      <SelectItem
                        key={owner.id}
                        value={owner.id}
                      >
                        {owner.full_name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Date de début
              </label>

              <Input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Date de fin
              </label>

              <Input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={
                  setCurrentMonth
                }
              >
                Ce mois
              </Button>

              <Button
                variant="outline"
                className="flex-1"
                onClick={
                  setPreviousMonth
                }
              >
                Mois précédent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================================================== */}
      {/* EMPTY STATE                                           */}
      {/* ===================================================== */}

      {!ownerId ? (
        <Card>
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <ReceiptText className="mb-4 h-10 w-10 text-muted-foreground" />

            <h2 className="text-lg font-medium">
              Sélectionnez un propriétaire
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Choisissez un propriétaire pour consulter sa situation.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ===================================================== */}
      {/* LOADING                                               */}
      {/* ===================================================== */}

      {ownerId &&
      statement.isLoading ? (
        <Card>
          <CardContent className="flex min-h-[250px] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin" />
          </CardContent>
        </Card>
      ) : null}

      {/* ===================================================== */}
      {/* ERROR                                                 */}
      {/* ===================================================== */}

      {ownerId &&
      statement.isError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center">
            <p className="font-medium text-destructive">
              Impossible de charger le relevé
            </p>

            <p className="text-sm text-muted-foreground">
              {errorMessage}
            </p>

            <Button
              variant="outline"
              onClick={() =>
                statement.refetch()
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />

              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ===================================================== */}
      {/* STATEMENT                                             */}
      {/* ===================================================== */}

      {ownerId &&
      !statement.isLoading &&
      !statement.isError &&
      summary ? (
        <>
          {/* ================================================= */}
          {/* OWNER                                             */}
          {/* ================================================= */}

          <Card>
            <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Relevé de
                </p>

                <h2 className="text-xl font-semibold">
                  {summary.owner_name}
                </h2>

                {selectedOwner ? (
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {selectedOwner.phone ? (
                      <p>
                        {selectedOwner.phone}
                      </p>
                    ) : null}

                    {selectedOwner.email ? (
                      <p>
                        {selectedOwner.email}
                      </p>
                    ) : null}

                    <p>
                      {[
                        selectedOwner.address,
                        selectedOwner.city,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />

                  Du{" "}
                  {formatDate(
                    summary.period_start,
                  )}{" "}
                  au{" "}
                  {formatDate(
                    summary.period_end,
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  statement.refetch()
                }
              >
                <RefreshCw className="mr-2 h-4 w-4" />

                Actualiser
              </Button>
            </CardContent>
          </Card>

          {/* ================================================= */}
          {/* KPI                                               */}
          {/* ================================================= */}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              title="Solde d'ouverture"
              value={formatMoney(
                summary.opening_balance,
                currency,
              )}
              description="Situation avant la période"
              icon={
                <WalletCards className="h-5 w-5" />
              }
            />

            <KpiCard
              title="Encaissements"
              value={formatMoney(
                summary.gross_collected,
                currency,
              )}
              description={`${summary.collections_count} encaissement(s)`}
              icon={
                <ArrowDownToLine className="h-5 w-5" />
              }
            />

            <KpiCard
              title="Commissions ImmoPlate"
              value={formatMoney(
                summary.commission_amount,
                currency,
              )}
              description="Commissions réellement appliquées"
              icon={
                <ReceiptText className="h-5 w-5" />
              }
            />

            <KpiCard
              title="Net propriétaire"
              value={formatMoney(
                summary.net_owner_amount,
                currency,
              )}
              description="Après déduction des commissions"
              icon={
                <Banknote className="h-5 w-5" />
              }
            />

            <KpiCard
              title="Reversements"
              value={formatMoney(
                summary.settlements_amount,
                currency,
              )}
              description={`${summary.settlements_count} reversement(s)`}
              icon={
                <Landmark className="h-5 w-5" />
              }
            />

            <KpiCard
              title="Solde de clôture"
              value={formatMoney(
                summary.closing_balance,
                currency,
              )}
              description="Montant restant dû au propriétaire"
              icon={
                <WalletCards className="h-5 w-5" />
              }
            />
          </div>

          {/* ================================================= */}
          {/* OFFICIAL CURRENT PERIOD                           */}
          {/* ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck2 className="h-5 w-5" />

                Relevé officiel
              </CardTitle>
            </CardHeader>

            <CardContent>
              {existingOfficialForPeriod ? (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {
                          existingOfficialForPeriod.reference
                        }
                      </p>

                      <Badge
                        variant={getStatusVariant(
                          existingOfficialForPeriod.status,
                        )}
                      >
                        {getStatusLabel(
                          existingOfficialForPeriod.status,
                        )}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Émis le{" "}
                      {formatDateTime(
                        existingOfficialForPeriod.issued_at ??
                          existingOfficialForPeriod.created_at,
                      )}
                    </p>

                    <p className="mt-1 text-sm">
                      Solde figé :{" "}

                      <strong>
                        {formatMoney(
                          existingOfficialForPeriod.closing_balance,
                          existingOfficialForPeriod.currency,
                        )}
                      </strong>
                    </p>

                    {existingOfficialForPeriod.status === "sent" ? (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>
                          Envoyé le {formatDateTime(existingOfficialForPeriod.sent_at)}
                          {" · "}
                          {getSendChannelLabel(existingOfficialForPeriod.sent_channel)}
                          {existingOfficialForPeriod.sent_to
                            ? ` · ${existingOfficialForPeriod.sent_to}`
                            : ""}
                        </p>

                        {existingOfficialForPeriod.sent_reference ? (
                          <p>
                            Référence d'envoi : {existingOfficialForPeriod.sent_reference}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {existingOfficialForPeriod.status === "cancelled" ? (
                      <div className="mt-2 space-y-1 text-xs text-destructive">
                        <p>
                          Annulé le {formatDateTime(existingOfficialForPeriod.cancelled_at)}
                        </p>
                        <p>
                          Motif : {existingOfficialForPeriod.cancellation_reason ?? "—"}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleOfficialExcel(
                          existingOfficialForPeriod.id,
                        )
                      }
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />

                      Excel officiel
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        handleOfficialPdf(
                          existingOfficialForPeriod.id,
                        )
                      }
                    >
                      <FileText className="mr-2 h-4 w-4" />

                      PDF officiel
                    </Button>

                    {existingOfficialForPeriod.status !== "cancelled" ? (
                      <Button
                        onClick={() =>
                          openSendDialog(existingOfficialForPeriod)
                        }
                        disabled={markSent.isPending}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {existingOfficialForPeriod.status === "sent"
                          ? "Renvoyer / mettre à jour"
                          : "Envoyer le relevé"}
                      </Button>
                    ) : null}

                    {existingOfficialForPeriod.status !== "cancelled" ? (
                      <Button
                        variant="destructive"
                        onClick={() =>
                          openCancelDialog(existingOfficialForPeriod)
                        }
                        disabled={cancelStatement.isPending}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Annuler
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium">
                      Aucun relevé officiel n'a encore été émis pour cette période.
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      La génération figera les coordonnées, les montants,
                      les encaissements et les reversements.
                    </p>
                  </div>

                  <Button
                    onClick={
                      handleCreateOfficial
                    }
                    disabled={
                      createOfficial.isPending
                    }
                  >
                    {createOfficial.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileCheck2 className="mr-2 h-4 w-4" />
                    )}

                    Générer le relevé officiel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================================================= */}
          {/* INTERNAL DETAILS                                  */}
          {/* ================================================= */}

          <Tabs
            defaultValue="collections"
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="collections">
                Encaissements ({lines.length})
              </TabsTrigger>

              <TabsTrigger value="settlements">
                Reversements ({settlements.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="collections">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Détail des encaissements
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            Date
                          </TableHead>

                          <TableHead>
                            Bien
                          </TableHead>

                          <TableHead>
                            Facture
                          </TableHead>

                          <TableHead>
                            Paiement
                          </TableHead>

                          <TableHead className="text-right">
                            Encaissé
                          </TableHead>

                          <TableHead className="text-center">
                            Taux
                          </TableHead>

                          <TableHead>
                            Source
                          </TableHead>

                          <TableHead className="text-right">
                            Commission
                          </TableHead>

                          <TableHead className="text-right">
                            Net propriétaire
                          </TableHead>

                          <TableHead className="text-right">
                            Reste à reverser
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {lines.map(
                          (line) => (
                            <TableRow
                              key={
                                line.ledger_id
                              }
                            >
                              <TableCell>
                                {formatDateTime(
                                  line.collected_at,
                                )}
                              </TableCell>

                              <TableCell className="font-medium">
                                {line.property_title ??
                                  "—"}
                              </TableCell>

                              <TableCell>
                                {line.invoice_number ??
                                  "—"}
                              </TableCell>

                              <TableCell className="font-mono text-xs">
                                {line.payment_reference ??
                                  "—"}
                              </TableCell>

                              <TableCell className="text-right">
                                {formatMoney(
                                  line.gross_collected,
                                  line.currency,
                                )}
                              </TableCell>

                              <TableCell className="text-center">
                                <Badge variant="outline">
                                  {line.commission_rate}%
                                </Badge>
                              </TableCell>

                              <TableCell>
                                {getCommissionSourceLabel(
                                  line.commission_source,
                                )}
                              </TableCell>

                              <TableCell className="text-right">
                                {formatMoney(
                                  line.commission_amount,
                                  line.currency,
                                )}
                              </TableCell>

                              <TableCell className="text-right font-medium">
                                {formatMoney(
                                  line.net_owner_amount,
                                  line.currency,
                                )}
                              </TableCell>

                              <TableCell className="text-right">
                                {formatMoney(
                                  line.balance_to_settle,
                                  line.currency,
                                )}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settlements">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Reversements de la période
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          Date
                        </TableHead>

                        <TableHead>
                          Référence
                        </TableHead>

                        <TableHead>
                          Compte
                        </TableHead>

                        <TableHead className="text-right">
                          Montant
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {settlements.map(
                        (item) => (
                          <TableRow
                            key={
                              item.settlement_id
                            }
                          >
                            <TableCell>
                              {formatDateTime(
                                item.settlement_date,
                              )}
                            </TableCell>

                            <TableCell>
                              {item.reference}
                            </TableCell>

                            <TableCell>
                              {item.treasury_account_name ??
                                "—"}
                            </TableCell>

                            <TableCell className="text-right font-medium">
                              {formatMoney(
                                item.amount,
                                item.currency,
                              )}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ================================================= */}
          {/* HISTORY                                           */}
          {/* ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Historique des relevés officiels
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Référence
                      </TableHead>

                      <TableHead>
                        Période
                      </TableHead>

                      <TableHead>
                        Émission
                      </TableHead>

                      <TableHead>
                        Statut
                      </TableHead>

                      <TableHead className="text-right">
                        Net propriétaire
                      </TableHead>

                      <TableHead className="text-right">
                        Reversements
                      </TableHead>

                      <TableHead className="text-right">
                        Solde
                      </TableHead>

                      <TableHead>
                        Envoi / annulation
                      </TableHead>

                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {officialHistory.isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="h-24 text-center"
                        >
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : officialHistory.data
                        ?.length ? (
                      officialHistory.data.map(
                        (document) => (
                          <TableRow
                            key={
                              document.id
                            }
                          >
                            <TableCell className="font-medium">
                              {document.reference}
                            </TableCell>

                            <TableCell>
                              {formatDate(
                                document.period_start,
                              )}{" "}
                              →{" "}
                              {formatDate(
                                document.period_end,
                              )}
                            </TableCell>

                            <TableCell>
                              {formatDateTime(
                                document.issued_at ??
                                  document.created_at,
                              )}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={getStatusVariant(
                                  document.status,
                                )}
                              >
                                {getStatusLabel(
                                  document.status,
                                )}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              {formatMoney(
                                document.net_owner_amount,
                                document.currency,
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              {formatMoney(
                                document.settlements_amount,
                                document.currency,
                              )}
                            </TableCell>

                            <TableCell className="text-right font-semibold">
                              {formatMoney(
                                document.closing_balance,
                                document.currency,
                              )}
                            </TableCell>

                            <TableCell>
                              {document.status === "sent" ? (
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    {document.sent_channel === "email" ? (
                                      <Mail className="h-3.5 w-3.5" />
                                    ) : document.sent_channel === "whatsapp" ? (
                                      <MessageCircle className="h-3.5 w-3.5" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                    {getSendChannelLabel(document.sent_channel)}
                                  </div>

                                  <p className="text-muted-foreground">
                                    {formatDateTime(document.sent_at)}
                                  </p>

                                  {document.sent_to ? (
                                    <p className="max-w-[220px] truncate text-muted-foreground">
                                      {document.sent_to}
                                    </p>
                                  ) : null}
                                </div>
                              ) : document.status === "cancelled" ? (
                                <div className="space-y-1 text-xs">
                                  <p className="font-medium text-destructive">
                                    Annulé le {formatDateTime(document.cancelled_at)}
                                  </p>
                                  <p
                                    className="max-w-[260px] text-muted-foreground"
                                    title={document.cancellation_reason ?? ""}
                                  >
                                    {document.cancellation_reason ?? "—"}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Non envoyé
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Excel officiel"
                                  onClick={() =>
                                    handleOfficialExcel(document.id)
                                  }
                                  disabled={officialActionId === document.id}
                                >
                                  <FileSpreadsheet className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="PDF officiel"
                                  onClick={() =>
                                    handleOfficialPdf(document.id)
                                  }
                                  disabled={officialActionId === document.id}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>

                                {document.status !== "cancelled" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    title="Envoyer le relevé"
                                    onClick={() => openSendDialog(document)}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                ) : null}

                                {document.status !== "cancelled" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    title="Annuler le relevé"
                                    onClick={() => openCancelDialog(document)}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ),
                      )
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Aucun relevé officiel.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* ===================================================== */}
      {/* SEND DIALOG                                           */}
      {/* ===================================================== */}

      <Dialog
        open={Boolean(sendDialogStatement)}
        onOpenChange={(open) => {
          if (
            !open &&
            !isSendingStatement &&
            !markSent.isPending
          ) {
            emailAttemptRef.current = null;
            setSendDialogStatement(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Envoyer le relevé
            </DialogTitle>

            <DialogDescription>
              {sendDialogStatement
                ? `${sendDialogStatement.reference} — choisissez le canal et le destinataire.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Canal
              </label>

              <Select
                value={sendChannel}
                onValueChange={(value) =>
                  handleChannelChange(
                    value as OwnerStatementSendChannel,
                  )
                }
                disabled={
                  isSendingStatement ||
                  markSent.isPending
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="email">
                    Email
                  </SelectItem>

                  <SelectItem value="whatsapp">
                    WhatsApp
                  </SelectItem>

                  <SelectItem value="manual">
                    Envoi manuel
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Destinataire
              </label>

              <Input
                value={sendTo}
                onChange={(event) => {
                  setSendTo(event.target.value);
                  emailAttemptRef.current = null;
                }}
                disabled={
                  isSendingStatement ||
                  markSent.isPending
                }
                placeholder={
                  sendChannel === "email"
                    ? "proprietaire@email.com"
                    : sendChannel === "whatsapp"
                      ? "+224..."
                      : "Email, téléphone ou destinataire"
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Référence d'envoi
                <span className="ml-1 font-normal text-muted-foreground">
                  (optionnel)
                </span>
              </label>

              <Input
                value={sendReference}
                onChange={(event) =>
                  setSendReference(event.target.value)
                }
                disabled={
                  isSendingStatement ||
                  markSent.isPending
                }
                placeholder="Ex. MSG-20260829-001"
              />
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              {sendChannel === "email"
                ? "Le PDF officiel sera réellement envoyé par email via Resend. Le relevé ne sera marqué comme envoyé qu'après confirmation du service d'envoi."
                : sendChannel === "whatsapp"
                  ? "L'envoi WhatsApp réel n'est pas encore connecté. Cette option enregistre pour l'instant le canal et le destinataire dans le workflow."
                  : "L'envoi manuel enregistre le canal, le destinataire et, si renseignée, la référence d'envoi."}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                emailAttemptRef.current = null;
                setSendDialogStatement(null);
              }}
              disabled={
                isSendingStatement ||
                markSent.isPending
              }
            >
              Retour
            </Button>

            <Button
              onClick={handleConfirmSent}
              disabled={
                isSendingStatement ||
                markSent.isPending ||
                !sendTo.trim()
              }
            >
              {isSendingStatement || markSent.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {sendChannel === "email"
                ? "Envoyer le PDF par email"
                : "Confirmer l'envoi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================== */}
      {/* CANCELLATION DIALOG                                   */}
      {/* ===================================================== */}

      <Dialog
        open={Boolean(cancelDialogStatement)}
        onOpenChange={(open) => {
          if (!open && !cancelStatement.isPending) {
            setCancelDialogStatement(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Annuler le relevé
            </DialogTitle>

            <DialogDescription>
              {cancelDialogStatement
                ? `Le relevé ${cancelDialogStatement.reference} restera archivé avec le statut Annulé.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">
              Motif d'annulation
            </label>

            <Textarea
              value={cancellationReason}
              onChange={(event) =>
                setCancellationReason(event.target.value)
              }
              placeholder="Indiquez précisément pourquoi ce relevé est annulé..."
              rows={4}
            />

            <p className="text-xs text-muted-foreground">
              Le motif est obligatoire et sera conservé dans
              l'historique.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogStatement(null)}
              disabled={cancelStatement.isPending}
            >
              Retour
            </Button>

            <Button
              variant="destructive"
              onClick={handleConfirmCancellation}
              disabled={
                cancelStatement.isPending ||
                !cancellationReason.trim()
              }
            >
              {cancelStatement.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}