import { useState } from "react";

import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Download,
  FileText,
  Home,
  Loader2,
  Receipt,
  User,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  format,
  parseISO,
} from "date-fns";

import { fr } from "date-fns/locale";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import PageShell from "@/components/PageShell";

import {
  type RecordTenantPaymentInput,
  useRecordTenantPayment,
} from "@/hooks/use-receivables";

import { supabase } from "@/integrations/supabase/client";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Separator,
} from "@/components/ui/separator";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ============================================================
// SUPABASE
// ============================================================

const db =
  supabase as any;

// ============================================================
// TYPES
// ============================================================

type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

interface InvoiceLine {
  id: string;
  invoice_id: string;
  label: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at: string;
}

interface InvoicePayment {
  id: string;
  reference: string;
  invoice_id: string | null;
  method: string;
  status: string;
  amount: number;
  currency: string;
  paid_at: string;
  is_refund: boolean;
  notes: string;
  accounting_entry_id: string | null;
  created_at: string;
}

interface InvoiceBooking {
  id: string;
  reference: string;
  guest_name: string;
  check_in: string;
  check_out: string;
}

interface InvoiceTenant {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface InvoiceLease {
  id: string;
  reference: string | null;
  start_date: string;
  end_date: string | null;
}

interface InvoiceProperty {
  id: string;
  reference: string | null;
  title: string | null;
}

interface InvoiceDetail {
  id: string;
  number: string;

  kind: string;
  status: InvoiceStatus;

  booking_id: string | null;
  lease_id: string | null;

  tenant_id: string | null;
  owner_id: string | null;
  property_id: string | null;

  issue_date: string;
  due_date: string;

  period_start: string | null;
  period_end: string | null;

  currency: string;

  amount: number;
  paid_amount: number;

  notes: string | null;

  created_at: string;
  updated_at: string;

  invoice_lines: InvoiceLine[];
  payments: InvoicePayment[];

  booking:
    | InvoiceBooking
    | null;

  tenant:
    | InvoiceTenant
    | null;

  lease:
    | InvoiceLease
    | null;

  property:
    | InvoiceProperty
    | null;
}

// ============================================================
// FORMATTERS
// ============================================================

const formatMoney = (
  value:
    | number
    | null
    | undefined,
  currency = "GNF",
) => {
  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits:
        0,
    },
  ).format(
    Number(
      value ?? 0,
    ),
  )} ${currency}`;
};

/**
 * Formatter spécialement destiné à jsPDF.
 *
 * Intl.NumberFormat("fr-FR") génère normalement des espaces
 * insécables / espaces fines insécables entre les milliers.
 *
 * Certaines polices intégrées à jsPDF les affichent mal.
 *
 * On les remplace donc par de vrais espaces standards.
 *
 * Exemple :
 * 2130000 -> "2 130 000 GNF"
 */
const formatMoneyPdf = (
  value:
    | number
    | null
    | undefined,
  currency = "GNF",
) => {
  const formatted =
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits:
          0,

        useGrouping:
          true,
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

  try {
    return format(
      parseISO(value),
      "dd MMMM yyyy",
      {
        locale: fr,
      },
    );
  } catch {
    return value;
  }
};

const formatDateShort = (
  value:
    | string
    | null
    | undefined,
) => {
  if (!value) {
    return "—";
  }

  try {
    return format(
      parseISO(value),
      "dd/MM/yyyy",
    );
  } catch {
    return value;
  }
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

  try {
    return format(
      parseISO(value),
      "dd MMM yyyy 'à' HH:mm",
      {
        locale: fr,
      },
    );
  } catch {
    return value;
  }
};

const getPaymentMethodLabel = (
  method: string,
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
      return method || "Non renseigné";
  }
};

const getPaymentStatusLabel = (
  status: string,
) => {
  switch (status) {
    case "completed":
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
      return status;
  }
};

// ============================================================
// LABELS
// ============================================================

const getInvoiceStatusLabel = (
  status: InvoiceStatus,
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
      return status;
  }
};

const getInvoiceKindLabel = (
  kind: string,
) => {
  if (
    kind === "booking"
  ) {
    return "Séjour courte durée";
  }

  if (
    kind === "rent"
  ) {
    return "Loyer";
  }

  if (
    kind === "deposit"
  ) {
    return "Caution";
  }

  if (
    kind === "charges"
  ) {
    return "Charges";
  }

  if (
    kind === "service"
  ) {
    return "Service";
  }

  if (
    kind === "commission"
  ) {
    return "Commission";
  }

  if (
    kind === "penalty"
  ) {
    return "Pénalité";
  }

  return kind;
};

const getInvoiceSubtitle = (
  kind: string,
) => {
  switch (kind) {
    case "booking":
      return "Facture de séjour";

    case "rent":
      return "Facture de loyer";

    case "deposit":
      return "Facture de caution";

    case "charges":
      return "Facture de charges";

    case "service":
      return "Facture de service";

    case "commission":
      return "Facture de commission";

    case "penalty":
      return "Facture de pénalité";

    default:
      return "Facture";
  }
};

// ============================================================
// STATUS
// ============================================================

function InvoiceStatusBadge({
  status,
}: {
  status: InvoiceStatus;
}) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="secondary">
          Brouillon
        </Badge>
      );

    case "issued":
      return (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-700"
        >
          Émise
        </Badge>
      );

    case "partially_paid":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-700"
        >
          Partiellement payée
        </Badge>
      );

    case "paid":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-emerald-700"
        >
          Payée
        </Badge>
      );

    case "overdue":
      return (
        <Badge variant="destructive">
          En retard
        </Badge>
      );

    case "cancelled":
      return (
        <Badge variant="destructive">
          Annulée
        </Badge>
      );

    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
}

// ============================================================
// PAGE
// ============================================================

export default function InvoiceDetailPage() {
  const navigate =
    useNavigate();

  const {
    invoiceId,
  } = useParams<{
    invoiceId: string;
  }>();

  const recordPayment =
    useRecordTenantPayment();

  const [
    paymentOpen,
    setPaymentOpen,
  ] = useState(false);

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<
    RecordTenantPaymentInput["paymentMethod"]
  >("mobile_money");

  const [
    paymentReference,
    setPaymentReference,
  ] = useState("");

  const [
    paymentNotes,
    setPaymentNotes,
  ] = useState("");

  // ==========================================================
  // QUERY
  // ==========================================================

  const {
    data: invoice,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "invoice",
      invoiceId,
    ],

    enabled:
      Boolean(
        invoiceId,
      ),

    queryFn:
      async (): Promise<
        InvoiceDetail
      > => {
        if (!invoiceId) {
          throw new Error(
            "Identifiant de facture manquant.",
          );
        }

        const {
          data,
          error:
            queryError,
        } = await db
          .from(
            "invoices",
          )
          .select(`
            id,
            number,
            kind,
            status,
            booking_id,
            lease_id,
            tenant_id,
            owner_id,
            property_id,
            issue_date,
            due_date,
            period_start,
            period_end,
            currency,
            amount,
            paid_amount,
            notes,
            created_at,
            updated_at,

            invoice_lines (
              id,
              invoice_id,
              label,
              quantity,
              unit_price,
              amount,
              created_at
            ),

            payments (
              id,
              reference,
              invoice_id,
              method,
              status,
              amount,
              currency,
              paid_at,
              is_refund,
              notes,
              accounting_entry_id,
              created_at
            ),

            booking:bookings (
              id,
              reference,
              guest_name,
              check_in,
              check_out
            ),

            tenant:tenants (
              id,
              full_name,
              email,
              phone
            ),

            lease:leases (
              id,
              reference,
              start_date,
              end_date
            ),

            property:properties (
              id,
              reference,
              title
            )
          `)
          .eq(
            "id",
            invoiceId,
          )
          .single();

        if (queryError) {
          throw queryError;
        }

        if (!data) {
          throw new Error(
            "Facture introuvable.",
          );
        }

        return {
          ...data,

          amount:
            Number(
              data.amount ??
                0,
            ),

          paid_amount:
            Number(
              data.paid_amount ??
                0,
            ),

          payments:
            Array.isArray(
              data.payments,
            )
              ? data.payments
                  .map(
                    (
                      payment: any,
                    ): InvoicePayment => ({
                      ...payment,

                      amount:
                        Number(
                          payment.amount ??
                            0,
                        ),

                      is_refund:
                        Boolean(
                          payment.is_refund,
                        ),
                    }),
                  )
                  .sort(
                    (
                      a:
                        InvoicePayment,
                      b:
                        InvoicePayment,
                    ) =>
                      new Date(
                        b.paid_at,
                      ).getTime() -
                      new Date(
                        a.paid_at,
                      ).getTime(),
                  )
              : [],

          invoice_lines:
            Array.isArray(
              data.invoice_lines,
            )
              ? data.invoice_lines.map(
                  (
                    line: any,
                  ) => ({
                    ...line,

                    quantity:
                      Number(
                        line.quantity ??
                          0,
                      ),

                    unit_price:
                      Number(
                        line.unit_price ??
                          0,
                      ),

                    amount:
                      Number(
                        line.amount ??
                          0,
                      ),
                  }),
                )
              : [],
        };
      },
  });

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {
    return (
      <PageShell
        title="Facture"
        subtitle="Chargement de la facture..."
      >
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />

            <span className="text-sm">
              Chargement de la facture...
            </span>
          </div>
        </div>
      </PageShell>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    isError ||
    !invoice
  ) {
    return (
      <PageShell
        title="Facture"
        subtitle="Impossible de charger cette facture."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                -1,
              )
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />

            Retour
          </Button>
        }
      >
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-4">
          <XCircle className="h-10 w-10 text-destructive" />

          <div className="text-center">
            <p className="font-medium">
              Facture introuvable
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof
              Error
                ? error.message
                : "Une erreur est survenue."}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              refetch()
            }
          >
            Réessayer
          </Button>
        </div>
      </PageShell>
    );
  }

  // ==========================================================
  // CALCULATIONS
  // ==========================================================

  const remaining =
    Math.max(
      0,
      Number(
        invoice.amount,
      ) -
        Number(
          invoice.paid_amount,
        ),
    );

  const isBookingInvoice =
    invoice.kind ===
    "booking";

  const isRentInvoice =
    invoice.kind ===
    "rent";

  const customerLabel =
    isRentInvoice
      ? "Locataire"
      : isBookingInvoice
        ? "Voyageur"
        : "Client";

  const customerName =
    isRentInvoice
      ? invoice.tenant
          ?.full_name ||
        "—"
      : isBookingInvoice
        ? invoice.booking
            ?.guest_name ||
          "—"
        : invoice.tenant
            ?.full_name ||
          invoice.booking
            ?.guest_name ||
          "—";

  const contextReferenceLabel =
    isRentInvoice
      ? "Bail"
      : isBookingInvoice
        ? "Réservation"
        : null;

  const contextReference =
    isRentInvoice
      ? invoice.lease
          ?.reference ??
        null
      : isBookingInvoice
        ? invoice.booking
            ?.reference ??
          null
        : null;

  const canRecordRentPayment =
    isRentInvoice &&
    remaining > 0 &&
    invoice.status !==
      "paid" &&
    invoice.status !==
      "cancelled";

  const openPaymentDialog =
    () => {
      if (
        !canRecordRentPayment
      ) {
        return;
      }

      setPaymentAmount(
        String(remaining),
      );

      setPaymentMethod(
        "mobile_money",
      );

      setPaymentReference(
        "",
      );

      setPaymentNotes(
        "",
      );

      setPaymentOpen(
        true,
      );
    };

  const closePaymentDialog =
    () => {
      if (
        recordPayment.isPending
      ) {
        return;
      }

      setPaymentOpen(
        false,
      );

      setPaymentAmount(
        "",
      );

      setPaymentReference(
        "",
      );

      setPaymentNotes(
        "",
      );
    };

  const handleRecordPayment =
    async () => {
      if (
        !canRecordRentPayment
      ) {
        return;
      }

      const numericAmount =
        Number(
          paymentAmount,
        );

      if (
        !Number.isFinite(
          numericAmount,
        ) ||
        numericAmount <= 0
      ) {
        toast.error(
          "Le montant de l'encaissement doit être supérieur à zéro.",
        );

        return;
      }

      if (
        numericAmount >
        remaining
      ) {
        toast.error(
          `Le reste dû est de ${formatMoney(
            remaining,
            invoice.currency,
          )}.`,
        );

        return;
      }

      try {
        await recordPayment.mutateAsync(
          {
            invoiceId:
              invoice.id,

            amount:
              numericAmount,

            paymentMethod,

            reference:
              paymentReference,

            notes:
              paymentNotes,
          },
        );

        toast.success(
          `${formatMoney(
            numericAmount,
            invoice.currency,
          )} encaissé pour ${customerName}.`,
        );

        setPaymentOpen(
          false,
        );

        setPaymentAmount(
          "",
        );

        setPaymentReference(
          "",
        );

        setPaymentNotes(
          "",
        );
      } catch (
        error: any
      ) {
        toast.error(
          error?.message ??
            "Une erreur est survenue pendant l'encaissement.",
        );
      }
    };

  // ==========================================================
  // PDF
  // ==========================================================

  const handleDownloadPdf =
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

      const pageWidth =
        doc.internal.pageSize.getWidth();

      const margin =
        16;

      // ======================================================
      // HEADER
      // ======================================================

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(
        18,
      );

      doc.text(
        "FACTURE",
        margin,
        20,
      );

      doc.setFontSize(
        11,
      );

      doc.text(
        invoice.number,
        margin,
        28,
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(
        9,
      );

      doc.text(
        `Statut : ${getInvoiceStatusLabel(
          invoice.status,
        )}`,
        margin,
        35,
      );

      doc.text(
        `Type : ${getInvoiceKindLabel(
          invoice.kind,
        )}`,
        margin,
        40,
      );

      // ======================================================
      // DATES
      // ======================================================

      const rightX =
        pageWidth -
        margin;

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.text(
        "Date d'émission",
        rightX,
        20,
        {
          align:
            "right",
        },
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        formatDateShort(
          invoice.issue_date,
        ),
        rightX,
        25,
        {
          align:
            "right",
        },
      );

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.text(
        "Échéance",
        rightX,
        32,
        {
          align:
            "right",
        },
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        formatDateShort(
          invoice.due_date,
        ),
        rightX,
        37,
        {
          align:
            "right",
        },
      );

      // ======================================================
      // SEPARATOR
      // ======================================================

      doc.line(
        margin,
        47,
        pageWidth -
          margin,
        47,
      );

      // ======================================================
      // CLIENT / CONTEXTE METIER
      // ======================================================

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(
        10,
      );

      doc.text(
        customerLabel,
        margin,
        57,
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        customerName,
        margin,
        63,
      );

      if (
        contextReferenceLabel &&
        contextReference
      ) {
        doc.text(
          `${contextReferenceLabel} : ${contextReference}`,
          margin,
          69,
        );
      }

      // ======================================================
      // BIEN
      // ======================================================

      const propertyX =
        80;

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.text(
        "Bien",
        propertyX,
        57,
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        invoice.property
          ?.title ||
          "—",
        propertyX,
        63,
      );

      if (
        invoice.property
          ?.reference
      ) {
        doc.text(
          invoice.property
            .reference,
          propertyX,
          69,
        );
      }

      // ======================================================
      // PERIODE
      // ======================================================

      const stayX =
        145;

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.text(
        "Période",
        stayX,
        57,
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        `Du ${formatDateShort(
          invoice.period_start,
        )}`,
        stayX,
        63,
      );

      doc.text(
        `Au ${formatDateShort(
          invoice.period_end,
        )}`,
        stayX,
        69,
      );

      // ======================================================
      // INVOICE LINES
      // ======================================================

      autoTable(
        doc,
        {
          startY:
            82,

          margin: {
            left:
              margin,

            right:
              margin,
          },

          head: [
            [
              "Désignation",
              "Qté",
              "Prix unitaire",
              "Montant",
            ],
          ],

          body:
            invoice.invoice_lines.map(
              (
                line,
              ) => [
                line.label,

                String(
                  line.quantity,
                ),

                formatMoneyPdf(
                  line.unit_price,
                  invoice.currency,
                ),

                formatMoneyPdf(
                  line.amount,
                  invoice.currency,
                ),
              ],
            ),

          styles: {
            font:
              "helvetica",

            fontSize:
              9,

            cellPadding:
              3,
          },

          headStyles: {
            fontStyle:
              "bold",
          },

          columnStyles: {
            0: {
              cellWidth:
                "auto",
            },

            1: {
              halign:
                "right",

              cellWidth:
                20,
            },

            2: {
              halign:
                "right",

              cellWidth:
                45,
            },

            3: {
              halign:
                "right",

              cellWidth:
                45,
            },
          },
        },
      );

      // ======================================================
      // TOTALS
      // ======================================================

      const tableEndY =
        (
          doc as jsPDF & {
            lastAutoTable?: {
              finalY: number;
            };
          }
        )
          .lastAutoTable
          ?.finalY ??
        120;

      let currentY =
        tableEndY +
        12;

      const labelX =
        pageWidth -
        80;

      const valueX =
        pageWidth -
        margin;

      doc.setFontSize(
        10,
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        "Total facture",
        labelX,
        currentY,
      );

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.text(
        formatMoneyPdf(
          invoice.amount,
          invoice.currency,
        ),
        valueX,
        currentY,
        {
          align:
            "right",
        },
      );

      currentY +=
        7;

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        "Payé",
        labelX,
        currentY,
      );

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.text(
        formatMoneyPdf(
          invoice.paid_amount,
          invoice.currency,
        ),
        valueX,
        currentY,
        {
          align:
            "right",
        },
      );

      currentY +=
        7;

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.text(
        "Reste à payer",
        labelX,
        currentY,
      );

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.text(
        formatMoneyPdf(
          remaining,
          invoice.currency,
        ),
        valueX,
        currentY,
        {
          align:
            "right",
        },
      );

      // ======================================================
      // CAUTION COURTE DUREE
      // ======================================================

      if (
        invoice.kind ===
        "booking"
      ) {
        currentY +=
          15;

        doc.setFont(
          "helvetica",
          "normal",
        );

        doc.setFontSize(
          8,
        );

        const cautionText =
          "Cette facture correspond uniquement au séjour. La caution éventuelle est gérée séparément et n'est pas incluse dans le montant facturé.";

        const cautionLines =
          doc.splitTextToSize(
            cautionText,
            pageWidth -
              margin *
                2,
          );

        doc.text(
          cautionLines,
          margin,
          currentY,
        );

        currentY +=
          cautionLines.length *
            4 +
          4;
      }

      // ======================================================
      // NOTES
      // ======================================================

      if (
        invoice.notes
      ) {
        if (
          currentY >
          250
        ) {
          doc.addPage();

          currentY =
            20;
        } else {
          currentY +=
            8;
        }

        doc.setFont(
          "helvetica",
          "bold",
        );

        doc.setFontSize(
          9,
        );

        doc.text(
          "Notes",
          margin,
          currentY,
        );

        currentY +=
          6;

        doc.setFont(
          "helvetica",
          "normal",
        );

        const notes =
          doc.splitTextToSize(
            invoice.notes,
            pageWidth -
              margin *
                2,
          );

        doc.text(
          notes,
          margin,
          currentY,
        );
      }

      // ======================================================
      // FOOTER
      // ======================================================

      const totalPages =
        doc.getNumberOfPages();

      for (
        let page =
          1;
        page <=
        totalPages;
        page++
      ) {
        doc.setPage(
          page,
        );

        const pageHeight =
          doc.internal.pageSize.getHeight();

        doc.setFont(
          "helvetica",
          "normal",
        );

        doc.setFontSize(
          7,
        );

        doc.text(
          `Facture ${invoice.number}`,
          margin,
          pageHeight -
            10,
        );

        doc.text(
          `Page ${page} / ${totalPages}`,
          pageWidth -
            margin,
          pageHeight -
            10,
          {
            align:
              "right",
          },
        );
      }

      // ======================================================
      // DOWNLOAD
      // ======================================================

      const safeNumber =
        invoice.number.replace(
          /[^a-zA-Z0-9-_]/g,
          "_",
        );

      doc.save(
        `${safeNumber}.pdf`,
      );
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageShell
      title={
        invoice.number
      }
      subtitle="Détail de la facture."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                -1,
              )
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />

            Retour
          </Button>

          {canRecordRentPayment && (
            <Button
              onClick={openPaymentDialog}
              disabled={
                recordPayment.isPending
              }
            >
              <Banknote className="mr-2 h-4 w-4" />

              Encaisser
            </Button>
          )}

          <Button
            onClick={
              handleDownloadPdf
            }
          >
            <Download className="mr-2 h-4 w-4" />

            Télécharger PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* ==================================================== */}
        {/* HEADER                                             */}
        {/* ==================================================== */}

        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Receipt className="h-6 w-6" />

                  <h2 className="text-xl font-semibold">
                    {
                      invoice.number
                    }
                  </h2>

                  <InvoiceStatusBadge
                    status={
                      invoice.status
                    }
                  />
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {getInvoiceSubtitle(
                    invoice.kind,
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Émission
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDate(
                      invoice.issue_date,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Échéance
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDate(
                      invoice.due_date,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Type
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {getInvoiceKindLabel(
                      invoice.kind,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Devise
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {
                      invoice.currency
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================== */}
        {/* CONTEXTE                                           */}
        {/* ==================================================== */}

        <div className="grid gap-6 lg:grid-cols-3">

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />

                {customerLabel}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="font-medium">
                {customerName}
              </p>

              {isBookingInvoice &&
                invoice.booking && (
                  <Button
                    variant="link"
                    className="mt-2 h-auto p-0"
                    onClick={() =>
                      navigate(
                        `/admin/bookings/${invoice.booking?.id}`,
                      )
                    }
                  >
                    Voir la réservation
                  </Button>
                )}

              {isRentInvoice &&
                contextReference && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Bail :{" "}
                    {contextReference}
                  </p>
                )}
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4" />

                Bien
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="font-medium">
                {invoice.property
                  ?.title ||
                  invoice.property
                    ?.reference ||
                  "—"}
              </p>

              {invoice.property
                ?.reference && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {
                    invoice
                      .property
                      .reference
                  }
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />

                Période
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Du
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDate(
                      invoice.period_start,
                    )}
                  </p>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground">
                    Au
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDate(
                      invoice.period_end,
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ==================================================== */}
        {/* DETAILS                                            */}
        {/* ==================================================== */}

        <Card className="premium-card overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />

              Détail de la facture
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {invoice.invoice_lines.length ===
            0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Aucune ligne de facture.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Désignation
                      </TableHead>

                      <TableHead className="text-right">
                        Quantité
                      </TableHead>

                      <TableHead className="text-right">
                        Prix unitaire
                      </TableHead>

                      <TableHead className="text-right">
                        Montant
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {invoice.invoice_lines.map(
                      (
                        line,
                      ) => (
                        <TableRow
                          key={
                            line.id
                          }
                        >
                          <TableCell className="font-medium">
                            {
                              line.label
                            }
                          </TableCell>

                          <TableCell className="text-right">
                            {
                              line.quantity
                            }
                          </TableCell>

                          <TableCell className="text-right">
                            {formatMoney(
                              line.unit_price,
                              invoice.currency,
                            )}
                          </TableCell>

                          <TableCell className="text-right font-medium">
                            {formatMoney(
                              line.amount,
                              invoice.currency,
                            )}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ==================================================== */}
        {/* FINANCIAL SUMMARY                                  */}
        {/* ==================================================== */}

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-base">
              Situation financière
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-5">
                <p className="text-sm text-muted-foreground">
                  Total facture
                </p>

                <p className="mt-2 text-xl font-bold">
                  {formatMoney(
                    invoice.amount,
                    invoice.currency,
                  )}
                </p>
              </div>

              <div className="rounded-lg border p-5">
                <p className="text-sm text-muted-foreground">
                  Payé
                </p>

                <p className="mt-2 text-xl font-bold">
                  {formatMoney(
                    invoice.paid_amount,
                    invoice.currency,
                  )}
                </p>
              </div>

              <div className="rounded-lg border p-5">
                <p className="text-sm text-muted-foreground">
                  Reste à payer
                </p>

                <p className="mt-2 text-xl font-bold">
                  {formatMoney(
                    remaining,
                    invoice.currency,
                  )}
                </p>
              </div>
            </div>

            {invoice.kind ===
              "booking" && (
              <Alert className="mt-5">
                <Receipt className="h-4 w-4" />

                <AlertDescription>
                  Cette facture correspond uniquement au séjour.
                  La caution éventuelle de la réservation est gérée
                  séparément et n'est pas incluse dans le montant
                  facturé.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ==================================================== */}
        {/* PAYMENT HISTORY                                    */}
        {/* ==================================================== */}

        <Card className="premium-card overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4" />

              Historique des règlements
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {invoice.payments.length ===
            0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Aucun règlement enregistré pour cette facture.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Date
                      </TableHead>

                      <TableHead>
                        Type
                      </TableHead>

                      <TableHead>
                        Référence
                      </TableHead>

                      <TableHead>
                        Moyen
                      </TableHead>

                      <TableHead>
                        Statut
                      </TableHead>

                      <TableHead className="text-right">
                        Montant
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {invoice.payments.map(
                      (
                        payment,
                      ) => (
                        <TableRow
                          key={
                            payment.id
                          }
                        >
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(
                              payment.paid_at,
                            )}
                          </TableCell>

                          <TableCell>
                            {payment.is_refund
                              ? "Remboursement"
                              : "Encaissement"}
                          </TableCell>

                          <TableCell>
                            <div className="font-medium">
                              {
                                payment.reference
                              }
                            </div>

                            {payment.notes && (
                              <div className="mt-1 max-w-[320px] whitespace-pre-wrap text-xs text-muted-foreground">
                                {
                                  payment.notes
                                }
                              </div>
                            )}

                            {payment.accounting_entry_id && (
                              <Button
                                type="button"
                                variant="link"
                                className="mt-1 h-auto p-0 text-xs"
                                onClick={() =>
                                  navigate(
                                    `/admin/finance?accountingEntryId=${encodeURIComponent(
                                      payment.accounting_entry_id!,
                                    )}`,
                                  )
                                }
                              >
                                Voir la preuve financière
                              </Button>
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {getPaymentMethodLabel(
                              payment.method,
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline">
                              {getPaymentStatusLabel(
                                payment.status,
                              )}
                            </Badge>
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-right font-medium">
                            {formatMoney(
                              payment.is_refund
                                ? -payment.amount
                                : payment.amount,
                              payment.currency,
                            )}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ==================================================== */}
        {/* NOTES                                              */}
        {/* ==================================================== */}

        {invoice.notes && (
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-base">
                Notes
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {
                  invoice.notes
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={paymentOpen}
        onOpenChange={(
          open,
        ) => {
          if (!open) {
            closePaymentDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Encaisser un loyer
            </DialogTitle>

            <DialogDescription>
              Le paiement mettra automatiquement à jour la facture,
              la créance, la trésorerie et la comptabilité.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="font-medium">
                {customerName}
              </div>

              <div className="text-sm text-muted-foreground">
                {invoice.property
                  ?.title ||
                  invoice.property
                    ?.reference ||
                  "—"}
              </div>

              <div className="mt-3 flex justify-between text-sm">
                <span>
                  Facture
                </span>

                <span>
                  {invoice.number}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span>
                  Reste à payer
                </span>

                <span className="font-semibold">
                  {formatMoney(
                    remaining,
                    invoice.currency,
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Montant encaissé
              </Label>

              <Input
                type="number"
                min="1"
                max={remaining}
                value={paymentAmount}
                onChange={(
                  event,
                ) =>
                  setPaymentAmount(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Mode d'encaissement
              </Label>

              <Select
                value={paymentMethod}
                onValueChange={(
                  value,
                ) =>
                  setPaymentMethod(
                    value as RecordTenantPaymentInput["paymentMethod"],
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="cash">
                    Espèces
                  </SelectItem>

                  <SelectItem value="transfer">
                    Virement bancaire
                  </SelectItem>

                  <SelectItem value="mobile_money">
                    Mobile Money
                  </SelectItem>

                  <SelectItem value="card">
                    Carte bancaire
                  </SelectItem>

                  <SelectItem value="cheque">
                    Chèque
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Référence externe
              </Label>

              <Input
                placeholder="Optionnel"
                value={paymentReference}
                onChange={(
                  event,
                ) =>
                  setPaymentReference(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Notes
              </Label>

              <Textarea
                placeholder="Informations complémentaires..."
                value={paymentNotes}
                onChange={(
                  event,
                ) =>
                  setPaymentNotes(
                    event.target.value,
                  )
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={
                closePaymentDialog
              }
              disabled={
                recordPayment.isPending
              }
            >
              Annuler
            </Button>

            <Button
              onClick={
                handleRecordPayment
              }
              disabled={
                recordPayment.isPending
              }
              className="gap-2"
            >
              {recordPayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="h-4 w-4" />
              )}

              {recordPayment.isPending
                ? "Encaissement..."
                : "Valider l'encaissement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}