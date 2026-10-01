import {
  type ReactNode,
  useState,
} from "react";

import {
  ArrowLeft,
  Ban,
  Banknote,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Home,
  Landmark,
  Loader2,
  LogIn,
  LogOut,
  Link2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  RefreshCw,
  Share2,
  Send,
  ShieldCheck,
  Smartphone,
  User,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  format,
  parseISO,
} from "date-fns";

import { fr } from "date-fns/locale";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import PageShell from "@/components/PageShell";

import {
  type BookingStatus,
  type ShortRentalRefundMethod,
  useCancelBooking,
  useCheckInBooking,
  useCheckOutBooking,
  useConfirmBooking,
  useShortRentalCancellationPreview,
} from "@/hooks/use-bookings";

import {
  type BookingNightDetail,
  useBookingDetail,
} from "@/hooks/use-booking-detail";

import {
  type InvoiceStatus,
  useBookingInvoice,
  useCreateBookingInvoice,
} from "@/hooks/use-booking-invoice";

import {
  type ShortRentalPaymentMethod,
  useRecordShortRentalPayment,
  useShortRentalPayments,
} from "@/hooks/use-short-rental-payments";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

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

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Textarea } from "@/components/ui/textarea";

const db = supabase as any;

type PaymentAccessState = {
  accessId: string;
  paymentToken: string;
  paymentUrl: string;
  expiresAt: string | null;
  paymentDueAt: string | null;
  revoked: boolean;
};

const normalizePhoneForWhatsApp = (
  value: string,
) =>
  value.replace(/[^0-9]/g, "");

const normalizePhoneForSms = (
  value: string,
) =>
  value.trim();

const firstRpcRow = <T,>(data: unknown): T => {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    throw new Error("La RPC n'a retourné aucun résultat.");
  }

  return row as T;
};

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
  const amount =
    Number(
      value ?? 0,
    );

  return `${new Intl.NumberFormat(
    "fr-FR",
    {
      maximumFractionDigits:
        0,
    },
  ).format(amount)} ${currency}`;
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
      "dd MMM yyyy à HH:mm",
      {
        locale: fr,
      },
    );
  } catch {
    return value;
  }
};

const formatNightDate = (
  value: string,
) => {
  try {
    return format(
      parseISO(value),
      "EEE dd MMM yyyy",
      {
        locale: fr,
      },
    );
  } catch {
    return value;
  }
};

// ============================================================
// BOOKING STATUS
// ============================================================

function BookingStatusBadge({
  status,
}: {
  status: BookingStatus;
}) {
  switch (status) {
    case "request":
      return (
        <Badge variant="secondary">
          Demande
        </Badge>
      );

    case "option":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-700"
        >
          Option
        </Badge>
      );

    case "confirmed":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-emerald-700"
        >
          Confirmée
        </Badge>
      );

    case "in_progress":
      return (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-700"
        >
          En cours
        </Badge>
      );

    case "completed":
      return (
        <Badge
          variant="outline"
          className="border-slate-300 bg-slate-50 text-slate-700"
        >
          Terminée
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
// INVOICE STATUS
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
// PAYMENT HELPERS
// ============================================================

const getPaymentMethodLabel = (
  method:
    | string
    | null
    | undefined,
) => {
  switch (method) {
    case "cash":
      return "Espèces";

    case "transfer":
      return "Virement";

    case "mobile_money":
      return "Mobile Money";

    case "card":
      return "Carte";

    case "cheque":
      return "Chèque";

    case "other":
      return "Autre";

    default:
      return method || "—";
  }
};

function PaymentMethodIcon({
  method,
}: {
  method:
    | string
    | null
    | undefined;
}) {
  switch (method) {
    case "cash":
      return (
        <Banknote className="h-4 w-4" />
      );

    case "mobile_money":
      return (
        <Smartphone className="h-4 w-4" />
      );

    case "transfer":
      return (
        <Landmark className="h-4 w-4" />
      );

    case "card":
      return (
        <CreditCard className="h-4 w-4" />
      );

    default:
      return (
        <WalletCards className="h-4 w-4" />
      );
  }
}

// ============================================================
// RPC ERROR HELPERS
// ============================================================

const getRpcMessage = (
  error: unknown,
) => {
  const rpcError =
    error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

  return (
    rpcError?.message ||
    rpcError?.details ||
    rpcError?.hint ||
    ""
  );
};

const getConfirmationErrorMessage = (
  error: unknown,
): string => {
  const message =
    getRpcMessage(
      error,
    ) ||
    "Impossible de confirmer la réservation.";

  if (
    message.includes(
      "Dates unavailable because of booking",
    )
  ) {
    return "Ces dates ne sont plus disponibles : une autre réservation les bloque.";
  }

  if (
    message.includes(
      "Dates unavailable because of property block",
    )
  ) {
    return "Ces dates sont bloquées dans le calendrier du logement.";
  }

  if (
    message.includes(
      "Guest count exceeds property capacity",
    )
  ) {
    return "Le nombre de voyageurs dépasse la capacité maximale du logement.";
  }

  if (
    message.includes(
      "Minimum stay is",
    )
  ) {
    return "La durée du séjour ne respecte pas le nombre minimum de nuits requis.";
  }

  if (
    message.includes(
      "Stay exceeds maximum stay",
    )
  ) {
    return "La durée du séjour dépasse la durée maximale autorisée.";
  }

  if (
    message.includes(
      "has expired",
    )
  ) {
    return "Cette option a expiré et ne peut plus être confirmée.";
  }

  if (
    message.includes(
      "cannot be confirmed from status",
    )
  ) {
    return "Cette réservation ne peut plus être confirmée depuis son statut actuel.";
  }

  if (
    message.includes(
      "Active short-rental settings not found",
    )
  ) {
    return "Les paramètres de location courte durée de ce logement sont absents ou inactifs.";
  }

  if (
    message.includes(
      "Property is not configured for short rental",
    )
  ) {
    return "Ce bien n'est pas configuré pour la location courte durée.";
  }

  if (
    message.includes(
      "Not authorized",
    ) ||
    message.includes(
      "Authentication required",
    )
  ) {
    return "Vous n'êtes pas autorisé à confirmer cette réservation.";
  }

  return message;
};

const getCheckInErrorMessage = (
  error: unknown,
): string => {
  const message =
    getRpcMessage(
      error,
    ) ||
    "Impossible d'effectuer le check-in.";

  if (
    message.includes(
      "Full payment required before check-in"
    )
  ) {
    return "Le paiement intégral du séjour est obligatoire avant le check-in.";
  }

  if (
    message.includes(
      "Booking cannot be checked in from status",
    )
  ) {
    return "Cette réservation ne peut pas effectuer de check-in depuis son statut actuel.";
  }

  if (
    message.includes(
      "Booking already checked in",
    )
  ) {
    return "Le check-in de cette réservation a déjà été effectué.";
  }

  if (
    message.includes(
      "Confirmed booking has no confirmed_at timestamp",
    )
  ) {
    return "La réservation présente une incohérence de confirmation et ne peut pas effectuer le check-in.";
  }

  if (
    message.includes(
      "Booking not found",
    )
  ) {
    return "Réservation introuvable.";
  }

  if (
    message.includes(
      "Not authorized",
    ) ||
    message.includes(
      "Authentication required",
    )
  ) {
    return "Vous n'êtes pas autorisé à effectuer le check-in.";
  }

  return message;
};

const getCheckOutErrorMessage = (
  error: unknown,
): string => {
  const message =
    getRpcMessage(
      error,
    ) ||
    "Impossible d'effectuer le check-out.";

  if (
    message.includes(
      "Booking cannot be checked out from status",
    )
  ) {
    return "Cette réservation ne peut pas effectuer de check-out depuis son statut actuel.";
  }

  if (
    message.includes(
      "Booking already checked out",
    )
  ) {
    return "Le check-out de cette réservation a déjà été effectué.";
  }

  if (
    message.includes(
      "Booking has no checked_in_at timestamp",
    )
  ) {
    return "Aucun check-in valide n'a été enregistré pour cette réservation.";
  }

  if (
    message.includes(
      "Booking not found",
    )
  ) {
    return "Réservation introuvable.";
  }

  if (
    message.includes(
      "Not authorized",
    ) ||
    message.includes(
      "Authentication required",
    )
  ) {
    return "Vous n'êtes pas autorisé à effectuer le check-out.";
  }

  return message;
};

const getCancellationErrorMessage = (
  error: unknown,
): string => {
  const message =
    getRpcMessage(error) ||
    "Impossible d'annuler la réservation.";

  if (message.includes("already cancelled")) {
    return "Cette réservation est déjà annulée.";
  }

  if (
    message.includes("cannot be cancelled from status") ||
    message.includes("cannot be cancelled")
  ) {
    return "Cette réservation ne peut plus être annulée depuis son statut actuel.";
  }

  if (message.includes("Booking not found")) {
    return "Réservation introuvable.";
  }

  if (
    message.includes("refund method") ||
    message.includes("Refund method")
  ) {
    return "Un mode de remboursement est obligatoire pour cette annulation.";
  }

  if (
    message.includes("treasury") ||
    message.includes("trésorerie") ||
    message.includes("Journal comptable introuvable")
  ) {
    return "La configuration de trésorerie ou de comptabilité du remboursement est incomplète.";
  }

  if (
    message.includes("Not authorized") ||
    message.includes("Authentication required")
  ) {
    return "Vous n'êtes pas autorisé à annuler cette réservation.";
  }

  return message;
};

const getCancellationPreviewErrorMessage = (
  error: unknown,
): string => {
  const message =
    getRpcMessage(error) ||
    "Impossible de calculer les conditions d'annulation.";

  if (message.includes("Booking not found")) {
    return "Réservation introuvable.";
  }

  if (
    message.includes("Not authorized") ||
    message.includes("Authentication required")
  ) {
    return "Vous n'êtes pas autorisé à calculer cette annulation.";
  }

  return message;
};

const getInvoiceErrorMessage = (
  error: unknown,
): string => {
  const message =
    getRpcMessage(
      error,
    ) ||
    "Impossible de générer la facture.";

  if (
    message.includes(
      "cannot be invoiced with status",
    )
  ) {
    return "Cette réservation ne peut pas être facturée depuis son statut actuel.";
  }

  if (
    message.includes(
      "Booking financial snapshot is inconsistent",
    )
  ) {
    return "Les montants financiers de la réservation sont incohérents. La facture n'a pas été générée.";
  }

  if (
    message.includes(
      "Booking financial components cannot be negative",
    )
  ) {
    return "Un montant financier invalide a été détecté sur la réservation.";
  }

  if (
    message.includes(
      "Booking total amount cannot be negative",
    )
  ) {
    return "Le total de la réservation est invalide.";
  }

  if (
    message.includes(
      "Property not found",
    )
  ) {
    return "Le logement rattaché à cette réservation est introuvable.";
  }

  if (
    message.includes(
      "Booking not found",
    )
  ) {
    return "Réservation introuvable.";
  }

  if (
    message.includes(
      "Not authorized",
    ) ||
    message.includes(
      "Authentication required",
    )
  ) {
    return "Vous n'êtes pas autorisé à générer cette facture.";
  }

  return message;
};

const getPaymentErrorMessage = (
  error: unknown,
): string => {
  const message =
    getRpcMessage(
      error,
    ) ||
    "Impossible d'enregistrer le paiement.";

  if (
    message.includes(
      "dépasse le solde restant",
    )
  ) {
    return "Le montant saisi dépasse le solde restant de la facture.";
  }

  if (
    message.includes(
      "déjà entièrement payée",
    ) ||
    message.includes(
      "aucun solde à payer",
    )
  ) {
    return "Cette facture est déjà entièrement payée.";
  }

  if (
    message.includes(
      "facture courte durée",
    )
  ) {
    return "Cette facture n'est pas une facture de séjour courte durée.";
  }

  if (
    message.includes(
      "réservation annulée",
    )
  ) {
    return "Impossible d'enregistrer un paiement sur une réservation annulée.";
  }

  if (
    message.includes(
      "propriétaire",
    )
  ) {
    return "Le propriétaire du bien doit être correctement renseigné avant l'encaissement.";
  }

  if (
    message.includes(
      "trésorerie",
    ) ||
    message.includes(
      "Journal comptable introuvable",
    )
  ) {
    return "La configuration comptable du moyen de paiement est incomplète.";
  }

  if (
    message.includes(
      "Not authorized",
    ) ||
    message.includes(
      "Authentication required",
    )
  ) {
    return "Vous n'êtes pas autorisé à enregistrer ce paiement.";
  }

  return message;
};

const getPaymentLinkErrorMessage = (
  error: unknown,
): string => {
  const message =
    getRpcMessage(error) ||
    "Impossible de gérer le lien de paiement.";

  if (message.includes("Lien de paiement impossible")) {
    return "Le lien de paiement n'est disponible que pour une réservation confirmée ou en cours.";
  }

  if (message.includes("Aucune facture active")) {
    return "Aucune facture active n'est disponible pour cette réservation.";
  }

  if (message.includes("montant de la facture est invalide")) {
    return "Le montant de la facture est invalide.";
  }

  if (message.includes("Réservation introuvable")) {
    return "Réservation introuvable.";
  }

  if (
    message.includes("Accès réservé") ||
    message.includes("Authentification requise") ||
    message.includes("Not authorized") ||
    message.includes("Authentication required")
  ) {
    return "Vous n'êtes pas autorisé à gérer les liens de paiement.";
  }

  return message;
};

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <div className="text-right text-sm font-medium">
        {value}
      </div>
    </div>
  );
}

// ============================================================
// NIGHT RATE
// ============================================================

function NightRateBadge({
  night,
}: {
  night: BookingNightDetail;
}) {
  if (
    night.rate_period
  ) {
    return (
      <Badge
        variant="outline"
        className="border-violet-200 bg-violet-50 text-violet-700"
      >
        {
          night
            .rate_period
            .name
        }
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      Tarif de base
    </Badge>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function BookingDetailPage() {
  const navigate =
    useNavigate();

  const {
    bookingId,
  } = useParams<{
    bookingId: string;
  }>();

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useBookingDetail(
    bookingId,
  );

  const {
    data: invoice,
    isLoading:
      isInvoiceLoading,
    isError:
      isInvoiceError,
    error:
      invoiceError,
    refetch:
      refetchInvoice,
  } = useBookingInvoice(
    bookingId,
  );

  const {
    data: payments = [],
    isLoading:
      isPaymentsLoading,
    isError:
      isPaymentsError,
    error:
      paymentsError,
    refetch:
      refetchPayments,
  } = useShortRentalPayments(
    invoice?.id,
  );

  // ==========================================================
  // MUTATIONS
  // ==========================================================

  const confirmBooking =
    useConfirmBooking();

  const checkInBooking =
    useCheckInBooking();

  const checkOutBooking =
    useCheckOutBooking();

  const createInvoice =
    useCreateBookingInvoice();

  const recordPayment =
    useRecordShortRentalPayment();

  const cancellationPreview =
    useShortRentalCancellationPreview();

  const cancelBooking =
    useCancelBooking();

  const workflowPending =
    confirmBooking.isPending ||
    checkInBooking.isPending ||
    checkOutBooking.isPending ||
    cancelBooking.isPending;

  const financialPending =
    createInvoice.isPending ||
    recordPayment.isPending ||
    cancelBooking.isPending;

  // ==========================================================
  // PAYMENT DIALOG
  // ==========================================================

  const [
    paymentDialogOpen,
    setPaymentDialogOpen,
  ] = useState(false);

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<ShortRentalPaymentMethod>(
      "cash",
    );

  const [
    paymentReference,
    setPaymentReference,
  ] = useState("");

  const [
    paymentNotes,
    setPaymentNotes,
  ] = useState("");

  // ==========================================================
  // PUBLIC PAYMENT LINK
  // ==========================================================

  const [
    paymentAccess,
    setPaymentAccess,
  ] = useState<PaymentAccessState | null>(null);

  const [
    paymentLinkPending,
    setPaymentLinkPending,
  ] = useState(false);

  const [
    paymentLinkRevokePending,
    setPaymentLinkRevokePending,
  ] = useState(false);

  // ==========================================================
  // CANCELLATION DIALOG
  // ==========================================================

  const [
    cancellationDialogOpen,
    setCancellationDialogOpen,
  ] = useState(false);

  const [
    cancellationReason,
    setCancellationReason,
  ] = useState("");

  const [
    refundMethod,
    setRefundMethod,
  ] = useState<ShortRentalRefundMethod>("cash");

  const [
    cancellationCalculatedAt,
    setCancellationCalculatedAt,
  ] = useState<string | null>(null);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (isLoading) {
    return (
      <PageShell
        title="Réservation"
        subtitle="Chargement de la réservation..."
      >
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />

            <span className="text-sm">
              Chargement de la fiche réservation...
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
    !detail
  ) {
    return (
      <PageShell
        title="Réservation"
        subtitle="Impossible de charger cette réservation."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                "/admin/bookings",
              )
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />

            Retour
          </Button>
        }
      >
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
          <XCircle className="h-10 w-10 text-destructive" />

          <div>
            <p className="font-medium">
              Réservation introuvable
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

  const {
    booking,
    guest,
    property,
    nights,
    nights_count,
    nights_total,
  } = detail;

  const currency =
    booking.currency ||
    "GNF";

  // ==========================================================
  // WORKFLOW STATE
  // ==========================================================

  const canConfirm =
    booking.status ===
      "request" ||
    booking.status ===
      "option";

  const canCheckIn =
    booking.status ===
    "confirmed";

  // Mirror the backend date guards for check-in.
  // Supabase/PostgreSQL evaluates CURRENT_DATE in UTC in this project,
  // so we compare ISO date keys (YYYY-MM-DD) in UTC as well.
  const todayDateKey =
    new Date()
      .toISOString()
      .slice(0, 10);

  const checkInBeforeArrival =
    canCheckIn &&
    Boolean(
      booking.check_in &&
        todayDateKey <
          booking.check_in,
    );

  const checkInWindowExpired =
    canCheckIn &&
    Boolean(
      booking.check_out &&
        todayDateKey >=
          booking.check_out,
    );

  const checkInDateBlocked =
    checkInBeforeArrival ||
    checkInWindowExpired;

  const canCheckOut =
    booking.status ===
    "in_progress";

  const isCompleted =
    booking.status ===
    "completed";

  const isCancelled =
    booking.status ===
    "cancelled";

  const canCancel =
    booking.status === "request" ||
    booking.status === "option" ||
    booking.status === "confirmed";

  const canGenerateInvoice =
    booking.status ===
      "confirmed" ||
    booking.status ===
      "in_progress" ||
    booking.status ===
      "completed";

  const financialDifference =
    Number(
      booking
        .accommodation_amount ??
        0,
    ) - nights_total;

  const invoiceAmount =
    invoice
      ? Number(
          invoice.amount ??
            0,
        )
      : 0;

  const invoicePaidAmount =
    invoice
      ? Number(
          invoice.paid_amount ??
            0,
        )
      : 0;

  const invoiceRemainingAmount =
    Math.max(
      0,
      invoiceAmount -
        invoicePaidAmount,
    );

  const invoiceHalfAmount =
    Math.round(
      invoiceAmount *
        0.5,
    );

  const hasPaymentBalance =
    Boolean(
      invoice &&
        invoiceRemainingAmount >
          0 &&
        invoice.status !==
          "cancelled",
    );

  const bookingPaymentDueAt =
    (booking as {
      payment_due_at?: string | null;
    }).payment_due_at ??
    null;

  const effectivePaymentDueAt =
    paymentAccess?.paymentDueAt ??
    bookingPaymentDueAt;

  const paymentDeadlinePassed =
    Boolean(
      effectivePaymentDueAt &&
        invoicePaidAmount <= 0 &&
        new Date(effectivePaymentDueAt).getTime() < Date.now(),
    );

  const canManagePaymentLink =
    (booking.status === "confirmed" ||
      booking.status === "in_progress") &&
    Boolean(invoice) &&
    invoice?.status !== "cancelled" &&
    invoiceRemainingAmount > 0;

  const canGeneratePaymentLink =
    canManagePaymentLink &&
    !paymentDeadlinePassed;

  const activePaymentAccess =
    Boolean(
      paymentAccess &&
        !paymentAccess.revoked &&
        (!paymentAccess.expiresAt ||
          new Date(paymentAccess.expiresAt).getTime() > Date.now()),
    );

  const travelerName =
    guest?.full_name ||
    booking.guest_name ||
    "";

  const travelerPhone =
    guest?.phone ||
    booking.guest_phone ||
    "";

  const travelerEmail =
    guest?.email ||
    booking.guest_email ||
    "";

  const canShareActivePaymentLink =
    Boolean(
      paymentAccess &&
        !paymentAccess.revoked &&
        activePaymentAccess,
    );

  const paymentMessage =
    paymentAccess
      ? [
          `Bonjour ${
            travelerName.trim().split(/\\s+/)[0] ||
            "Madame, Monsieur"
          },`,
          "",
          `Votre réservation ${booking.reference} est confirmée.`,
          `Montant restant à régler : ${formatMoney(
            invoiceRemainingAmount,
            invoice?.currency || currency,
          )}.`,
          effectivePaymentDueAt
            ? `Échéance de paiement : ${formatDateTime(
                effectivePaymentDueAt,
              )}.`
            : "Merci d'effectuer le règlement dans les délais indiqués sur la page de paiement.",
          "",
          "Vous pouvez effectuer le paiement via le lien sécurisé ci-dessous :",
          paymentAccess.paymentUrl,
          "",
          "Merci.",
          "ImmoPlate",
        ].join("\n")
      : "";

  // ==========================================================
  // CHECK-IN FINANCIAL LOCK
  // ==========================================================

  const checkInPaymentBlocked =
    canCheckIn &&
    (
      isInvoiceLoading ||
      !invoice ||
      invoice.status !==
        "paid" ||
      invoiceRemainingAmount >
        0
    );

  const checkInPaymentReady =
    canCheckIn &&
    !isInvoiceLoading &&
    Boolean(invoice) &&
    invoice?.status ===
      "paid" &&
    invoiceRemainingAmount <=
      0;

  const completedPayments =
    payments.filter(
      (payment) =>
        payment.status ===
          "completed" &&
        !payment.is_refund,
    );

  const refunds =
    payments.filter(
      (payment) =>
        payment.is_refund ||
        payment.status ===
          "refunded",
    );

  const netCollected = Math.max(
    0,
    payments.reduce(
      (total, payment) => {
        const amount = Number(
          payment.amount ?? 0,
        );

        if (
          payment.status === "completed" &&
          !payment.is_refund
        ) {
          return total + amount;
        }

        if (
          (payment.status === "completed" &&
            payment.is_refund) ||
          payment.status === "refunded"
        ) {
          return total - amount;
        }

        return total;
      },
      0,
    ),
  );

  const cancellationPreviewData =
    cancellationPreview.data;

  const contractualPenalty = Number(
    cancellationPreviewData?.penalty_amount ?? 0,
  );

  const effectivePenalty = Math.min(
    contractualPenalty,
    netCollected,
  );

  const estimatedRefund = Math.max(
    0,
    netCollected - effectivePenalty,
  );

  // ==========================================================
  // CONFIRM
  // ==========================================================

  const handleConfirm =
    async () => {
      if (
        !canConfirm ||
        workflowPending
      ) {
        return;
      }

      try {
        const result =
          await confirmBooking.mutateAsync(
            booking.id,
          );

        toast.success(
          `Réservation ${result.reference} confirmée avec succès.`,
        );

        await Promise.all([
          refetch(),
          refetchInvoice(),
        ]);
      } catch (
        confirmationError
      ) {
        console.error(
          "[BookingDetailPage] Erreur confirmation :",
          confirmationError,
        );

        toast.error(
          getConfirmationErrorMessage(
            confirmationError,
          ),
        );
      }
    };

  // ==========================================================
  // CHECK-IN
  // ==========================================================

  const handleCheckIn =
    async () => {
      if (
        !canCheckIn ||
        workflowPending ||
        checkInPaymentBlocked ||
        checkInDateBlocked
      ) {
        return;
      }

      try {
        const result =
          await checkInBooking.mutateAsync(
            booking.id,
          );

        toast.success(
          `Check-in effectué pour la réservation ${result.reference}.`,
        );

        await refetch();
      } catch (
        checkInError
      ) {
        console.error(
          "[BookingDetailPage] Erreur check-in :",
          checkInError,
        );

        toast.error(
          getCheckInErrorMessage(
            checkInError,
          ),
        );
      }
    };

  // ==========================================================
  // CHECK-OUT
  // ==========================================================

  const handleCheckOut =
    async () => {
      if (
        !canCheckOut ||
        workflowPending
      ) {
        return;
      }

      try {
        const result =
          await checkOutBooking.mutateAsync(
            booking.id,
          );

        toast.success(
          `Check-out effectué pour la réservation ${result.reference}.`,
        );

        await refetch();
      } catch (
        checkOutError
      ) {
        console.error(
          "[BookingDetailPage] Erreur check-out :",
          checkOutError,
        );

        toast.error(
          getCheckOutErrorMessage(
            checkOutError,
          ),
        );
      }
    };

  // ==========================================================
  // CANCELLATION
  // ==========================================================

  const openCancellationDialog =
    async () => {
      if (
        !canCancel ||
        workflowPending
      ) {
        return;
      }

      const calculatedAt =
        new Date().toISOString();

      setCancellationReason("");
      setRefundMethod("cash");
      setCancellationCalculatedAt(
        calculatedAt,
      );
      setCancellationDialogOpen(true);

      try {
        await cancellationPreview.mutateAsync({
          bookingId: booking.id,
          cancelledAt: calculatedAt,
        });
      } catch (previewError) {
        console.error(
          "[BookingDetailPage] Erreur aperçu annulation :",
          previewError,
        );

        toast.error(
          getCancellationPreviewErrorMessage(
            previewError,
          ),
        );
      }
    };

  const handleCancelBooking =
    async () => {
      if (
        !canCancel ||
        cancelBooking.isPending
      ) {
        return;
      }

      const reason =
        cancellationReason.trim();

      if (!reason) {
        toast.error(
          "Le motif d'annulation est obligatoire.",
        );
        return;
      }

      if (
        !cancellationPreviewData ||
        cancellationPreview.isPending
      ) {
        toast.error(
          "Le calcul des conditions d'annulation doit être terminé avant validation.",
        );
        return;
      }

      if (
        estimatedRefund > 0 &&
        !refundMethod
      ) {
        toast.error(
          "Sélectionnez un mode de remboursement.",
        );
        return;
      }

      try {
        const result =
          await cancelBooking.mutateAsync({
            id: booking.id,
            reason,
            refundMethod:
              estimatedRefund > 0
                ? refundMethod
                : null,
            cancelledAt:
              cancellationCalculatedAt ??
              new Date().toISOString(),
          });

        setCancellationDialogOpen(false);

        if (result.refund_amount > 0) {
          toast.success(
            `Réservation ${result.reference} annulée. Remboursement : ${formatMoney(
              result.refund_amount,
              currency,
            )}.`,
          );
        } else if (
          result.effective_penalty_amount > 0
        ) {
          toast.success(
            `Réservation ${result.reference} annulée. Pénalité conservée : ${formatMoney(
              result.effective_penalty_amount,
              currency,
            )}.`,
          );
        } else {
          toast.success(
            `Réservation ${result.reference} annulée avec succès.`,
          );
        }

        await Promise.all([
          refetch(),
          invoice
            ? refetchPayments()
            : Promise.resolve(),
        ]);
      } catch (cancellationError) {
        console.error(
          "[BookingDetailPage] Erreur annulation :",
          cancellationError,
        );

        toast.error(
          getCancellationErrorMessage(
            cancellationError,
          ),
        );
      }
    };

  // ==========================================================
  // PUBLIC PAYMENT LINK
  // ==========================================================

  const handleGeneratePaymentLink =
    async () => {
      if (
        !canGeneratePaymentLink ||
        paymentLinkPending ||
        paymentLinkRevokePending
      ) {
        return;
      }

      setPaymentLinkPending(true);

      try {
        const {
          data,
          error: paymentLinkError,
        } = await db.rpc(
          "create_short_rental_payment_access",
          {
            p_booking_id: booking.id,
          },
        );

        if (paymentLinkError) {
          throw paymentLinkError;
        }

        const result = firstRpcRow<{
          access_id: string;
          booking_id: string;
          payment_token: string;
          expires_at: string | null;
          payment_due_at: string | null;
        }>(data);

        if (
          !result.access_id ||
          !result.payment_token
        ) {
          throw new Error(
            "Le serveur n'a pas retourné un lien de paiement valide.",
          );
        }

        const paymentUrl = `${window.location.origin}/payment/${result.payment_token}`;

        setPaymentAccess({
          accessId: result.access_id,
          paymentToken: result.payment_token,
          paymentUrl,
          expiresAt: result.expires_at ?? null,
          paymentDueAt: result.payment_due_at ?? null,
          revoked: false,
        });

        toast.success(
          activePaymentAccess
            ? "Nouveau lien généré. L'ancien lien a été révoqué automatiquement."
            : "Lien de paiement généré avec succès.",
        );
      } catch (paymentLinkError) {
        console.error(
          "[BookingDetailPage] Erreur création lien paiement :",
          paymentLinkError,
        );

        toast.error(
          getPaymentLinkErrorMessage(
            paymentLinkError,
          ),
        );
      } finally {
        setPaymentLinkPending(false);
      }
    };

  const handleCopyPaymentLink =
    async () => {
      if (
        !paymentAccess ||
        paymentAccess.revoked
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          paymentAccess.paymentUrl,
        );

        toast.success(
          "Lien de paiement copié.",
        );
      } catch (copyError) {
        console.error(
          "[BookingDetailPage] Erreur copie lien :",
          copyError,
        );

        toast.error(
          "Impossible de copier automatiquement le lien.",
        );
      }
    };

  const handleSharePaymentLink =
    async () => {
      if (
        !paymentAccess ||
        paymentAccess.revoked
      ) {
        return;
      }

      const shareText =
        `Paiement de la réservation ${booking.reference}`;

      try {
        if (navigator.share) {
          await navigator.share({
            title: shareText,
            text: `Utilisez ce lien sécurisé pour régler votre réservation ${booking.reference}.`,
            url: paymentAccess.paymentUrl,
          });

          return;
        }

        await navigator.clipboard.writeText(
          paymentAccess.paymentUrl,
        );

        toast.success(
          "Le partage direct n'est pas disponible. Le lien a été copié.",
        );
      } catch (shareError) {
        if (
          shareError instanceof DOMException &&
          shareError.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[BookingDetailPage] Erreur partage lien :",
          shareError,
        );

        toast.error(
          "Impossible de partager le lien de paiement.",
        );
      }
    };

  const handleSendPaymentLinkWhatsApp =
    () => {
      if (
        !paymentAccess ||
        !canShareActivePaymentLink
      ) {
        return;
      }

      const phone =
        normalizePhoneForWhatsApp(
          travelerPhone,
        );

      if (!phone) {
        toast.error(
          "Aucun numéro de téléphone valide n'est renseigné pour ce voyageur.",
        );
        return;
      }

      const url =
        `https://wa.me/${phone}?text=${encodeURIComponent(
          paymentMessage,
        )}`;

      window.open(
        url,
        "_blank",
        "noopener,noreferrer",
      );
    };

  const handleSendPaymentLinkEmail =
    () => {
      if (
        !paymentAccess ||
        !canShareActivePaymentLink
      ) {
        return;
      }

      const email =
        travelerEmail.trim();

      if (!email) {
        toast.error(
          "Aucune adresse e-mail n'est renseignée pour ce voyageur.",
        );
        return;
      }

      const subject =
        `Paiement de votre réservation ${booking.reference}`;

      window.location.href =
        `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
          subject,
        )}&body=${encodeURIComponent(
          paymentMessage,
        )}`;
    };

  const handleSendPaymentLinkSms =
    () => {
      if (
        !paymentAccess ||
        !canShareActivePaymentLink
      ) {
        return;
      }

      const phone =
        normalizePhoneForSms(
          travelerPhone,
        );

      if (!phone) {
        toast.error(
          "Aucun numéro de téléphone n'est renseigné pour ce voyageur.",
        );
        return;
      }

      const compactMessage = [
        `ImmoPlate - Réservation ${booking.reference} confirmée.`,
        `Reste à payer : ${formatMoney(
          invoiceRemainingAmount,
          invoice?.currency || currency,
        )}.`,
        effectivePaymentDueAt
          ? `Échéance : ${formatDateTime(
              effectivePaymentDueAt,
            )}.`
          : null,
        `Paiement sécurisé : ${paymentAccess.paymentUrl}`,
      ]
        .filter(Boolean)
        .join(" ");

      const separator =
        /iPad|iPhone|iPod/.test(
          navigator.userAgent,
        )
          ? "&"
          : "?";

      window.location.href =
        `sms:${encodeURIComponent(phone)}${separator}body=${encodeURIComponent(
          compactMessage,
        )}`;
    };

  const handleOpenPaymentLink =
    () => {
      if (
        !paymentAccess ||
        paymentAccess.revoked
      ) {
        return;
      }

      window.open(
        paymentAccess.paymentUrl,
        "_blank",
        "noopener,noreferrer",
      );
    };

  const handleRevokePaymentLink =
    async () => {
      if (
        !paymentAccess ||
        paymentAccess.revoked ||
        paymentLinkRevokePending ||
        paymentLinkPending
      ) {
        return;
      }

      setPaymentLinkRevokePending(true);

      try {
        const {
          data,
          error: revokeError,
        } = await db.rpc(
          "revoke_short_rental_payment_access",
          {
            p_access_id: paymentAccess.accessId,
          },
        );

        if (revokeError) {
          throw revokeError;
        }

        if (data !== true) {
          throw new Error(
            "Le lien n'a pas pu être révoqué.",
          );
        }

        setPaymentAccess((current) =>
          current
            ? {
                ...current,
                revoked: true,
              }
            : current,
        );

        toast.success(
          "Lien de paiement révoqué.",
        );
      } catch (revokeError) {
        console.error(
          "[BookingDetailPage] Erreur révocation lien paiement :",
          revokeError,
        );

        toast.error(
          getPaymentLinkErrorMessage(
            revokeError,
          ),
        );
      } finally {
        setPaymentLinkRevokePending(false);
      }
    };

  // ==========================================================
  // GENERATE INVOICE
  // ==========================================================

  const handleGenerateInvoice =
    async () => {
      if (
        !canGenerateInvoice ||
        invoice ||
        financialPending
      ) {
        return;
      }

      try {
        const result =
          await createInvoice.mutateAsync(
            booking.id,
          );

        toast.success(
          `Facture ${result.invoice_number} générée avec succès.`,
        );

        await Promise.all([
          refetchInvoice(),
          refetch(),
        ]);
      } catch (
        createInvoiceError
      ) {
        console.error(
          "[BookingDetailPage] Erreur génération facture :",
          createInvoiceError,
        );

        toast.error(
          getInvoiceErrorMessage(
            createInvoiceError,
          ),
        );
      }
    };

  // ==========================================================
  // OPEN INVOICE
  // ==========================================================

  const handleOpenInvoice =
    () => {
      if (!invoice) {
        return;
      }

      navigate(
        `/admin/invoices/${invoice.id}`,
      );
    };

  // ==========================================================
  // OPEN PAYMENT DIALOG
  // ==========================================================

  const openPaymentDialog =
    (
      suggestedAmount?: number,
    ) => {
      if (
        !invoice ||
        !hasPaymentBalance
      ) {
        return;
      }

      const amount =
        Math.min(
          suggestedAmount ??
            invoiceRemainingAmount,
          invoiceRemainingAmount,
        );

      setPaymentAmount(
        String(amount),
      );

      setPaymentMethod(
        "cash",
      );

      setPaymentReference(
        "",
      );

      setPaymentNotes(
        "",
      );

      setPaymentDialogOpen(
        true,
      );
    };

  // ==========================================================
  // SAVE PAYMENT
  // ==========================================================

  const handleRecordPayment =
    async () => {
      if (
        !invoice ||
        recordPayment.isPending
      ) {
        return;
      }

      const amount =
        Number(
          paymentAmount,
        );

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        toast.error(
          "Saisissez un montant de paiement valide.",
        );

        return;
      }

      if (
        amount >
        invoiceRemainingAmount
      ) {
        toast.error(
          "Le montant saisi dépasse le solde restant.",
        );

        return;
      }

      try {
        const paymentId =
          await recordPayment.mutateAsync(
            {
              invoiceId:
                invoice.id,

              bookingId:
                booking.id,

              amount,

              method:
                paymentMethod,

              reference:
                paymentReference,

              notes:
                paymentNotes,
            },
          );

        console.info(
          "[BookingDetailPage] Paiement enregistré :",
          paymentId,
        );

        toast.success(
          "Paiement enregistré avec succès.",
        );

        setPaymentDialogOpen(
          false,
        );

        await Promise.all([
          refetchInvoice(),
          refetchPayments(),
          refetch(),
        ]);
      } catch (
        paymentError
      ) {
        console.error(
          "[BookingDetailPage] Erreur paiement :",
          paymentError,
        );

        toast.error(
          getPaymentErrorMessage(
            paymentError,
          ),
        );
      }
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <PageShell
        title={
          booking.reference
        }
        subtitle="Fiche opérationnelle de la réservation courte durée."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  "/admin/bookings",
                )
              }
              disabled={
                workflowPending
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />

              Retour
            </Button>

            {canConfirm && (
              <Button
                onClick={
                  handleConfirm
                }
                disabled={
                  workflowPending
                }
              >
                {confirmBooking.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}

                {confirmBooking.isPending
                  ? "Confirmation..."
                  : "Confirmer"}
              </Button>
            )}

            {canCheckIn && (
              <Button
                onClick={
                  handleCheckIn
                }
                disabled={
                  workflowPending ||
                  checkInPaymentBlocked ||
                  checkInDateBlocked
                }
                title={
                  checkInBeforeArrival
                    ? `Check-in disponible à partir du ${formatDate(
                        booking.check_in,
                      )}.`
                    : checkInWindowExpired
                      ? `La date de départ prévue (${formatDate(
                          booking.check_out,
                        )}) est atteinte ou dépassée.`
                      : checkInPaymentBlocked
                        ? "Le séjour doit être intégralement payé avant le check-in."
                        : "Effectuer le check-in"
                }
              >
                {checkInBooking.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : checkInBeforeArrival ? (
                  <Clock3 className="mr-2 h-4 w-4" />
                ) : checkInWindowExpired ? (
                  <Ban className="mr-2 h-4 w-4" />
                ) : checkInPaymentBlocked ? (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}

                {checkInBooking.isPending
                  ? "Check-in..."
                  : "Check-in"}
              </Button>
            )}

            {canCheckOut && (
              <Button
                onClick={
                  handleCheckOut
                }
                disabled={
                  workflowPending
                }
              >
                {checkOutBooking.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}

                {checkOutBooking.isPending
                  ? "Check-out..."
                  : "Check-out"}
              </Button>
            )}

            {canCancel && (
              <Button
                variant="destructive"
                onClick={
                  openCancellationDialog
                }
                disabled={
                  workflowPending
                }
              >
                {cancelBooking.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="mr-2 h-4 w-4" />
                )}

                Annuler
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">

          {/* ================================================== */}
          {/* ENTETE METIER                                     */}
          {/* ================================================== */}

          <Card className="premium-card">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold">
                      {
                        booking.reference
                      }
                    </h2>

                    <BookingStatusBadge
                      status={
                        booking.status
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Home className="h-4 w-4" />

                      {property?.title ||
                        property?.reference ||
                        "Bien immobilier"}
                    </span>

                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />

                      {guest?.full_name ||
                        booking.guest_name ||
                        "Voyageur non renseigné"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Arrivée
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDate(
                        booking.check_in,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Départ
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDate(
                        booking.check_out,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Nuits
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {
                        nights_count
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Voyageurs
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {
                        booking.guests_count
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ================================================== */}
          {/* MESSAGE WORKFLOW                                  */}
          {/* ================================================== */}

          {canConfirm && (
            <Alert>
              <Clock3 className="h-4 w-4" />

              <AlertDescription>
                Cette réservation n'est pas encore confirmée.
                La confirmation sécurisée vérifie la disponibilité,
                les blocages, la capacité du logement et fige le
                tarif nuit par nuit.
              </AlertDescription>
            </Alert>
          )}

          {canCheckIn &&
            isInvoiceLoading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />

                <AlertDescription>
                  Vérification du règlement du séjour avant
                  d'autoriser le check-in...
                </AlertDescription>
              </Alert>
            )}

          {canCheckIn &&
            !isInvoiceLoading &&
            checkInPaymentBlocked && (
              <Alert className="border-amber-300 bg-amber-50 text-amber-950">
                <CreditCard className="h-4 w-4 text-amber-700" />

                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">
                      Paiement intégral requis avant le check-in.
                    </p>

                    {!invoice ? (
                      <p>
                        Aucune facture active n'est disponible pour ce séjour.
                        Générez la facture et encaissez son règlement avant
                        la remise des clés.
                      </p>
                    ) : (
                      <p>
                        Reste à payer :{" "}
                        <span className="font-semibold">
                          {formatMoney(
                            invoiceRemainingAmount,
                            invoice.currency,
                          )}
                        </span>
                        . Le bouton Check-in sera automatiquement
                        disponible lorsque le solde sera nul.
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

          {checkInBeforeArrival && (
            <Alert className="border-blue-300 bg-blue-50 text-blue-950">
              <Clock3 className="h-4 w-4 text-blue-700" />

              <AlertDescription>
                <span className="font-medium">
                  Check-in pas encore disponible.
                </span>{" "}
                Le check-in pourra être effectué à partir du{" "}
                <span className="font-semibold">
                  {formatDate(
                    booking.check_in,
                  )}
                </span>
                .
              </AlertDescription>
            </Alert>
          )}

          {checkInWindowExpired && (
            <Alert variant="destructive">
              <Ban className="h-4 w-4" />

              <AlertDescription>
                La date de départ prévue (
                {formatDate(
                  booking.check_out,
                )}
                ) est atteinte ou dépassée. Le check-in n'est plus
                disponible pour cette réservation.
              </AlertDescription>
            </Alert>
          )}

          {checkInPaymentReady &&
            !checkInDateBlocked && (
              <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />

                <AlertDescription>
                  <span className="font-medium">
                    Paiement intégral confirmé.
                  </span>{" "}
                  Le séjour est entièrement réglé. Le check-in peut
                  maintenant être effectué.
                </AlertDescription>
              </Alert>
            )}

          {canCheckOut && (
            <Alert>
              <LogOut className="h-4 w-4" />

              <AlertDescription>
                Le voyageur est actuellement enregistré comme présent.
                Le check-out terminera officiellement le séjour.
              </AlertDescription>
            </Alert>
          )}

          {isCompleted && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />

              <AlertDescription>
                Ce séjour est terminé. Le check-in et le check-out
                ont été enregistrés.
              </AlertDescription>
            </Alert>
          )}

          {isCancelled && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />

              <AlertDescription>
                Cette réservation est annulée. Aucune opération
                Check-in / Check-out n'est disponible.
              </AlertDescription>
            </Alert>
          )}

          {/* ================================================== */}
          {/* INFORMATIONS PRINCIPALES                          */}
          {/* ================================================== */}

          <div className="grid gap-6 xl:grid-cols-3">

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Voyageur
                </CardTitle>
              </CardHeader>

              <CardContent>
                <InfoRow
                  label="Nom"
                  value={
                    guest?.full_name ||
                    booking.guest_name ||
                    "—"
                  }
                />

                <Separator />

                <InfoRow
                  label="Téléphone"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />

                      {guest?.phone ||
                        booking.guest_phone ||
                        "—"}
                    </span>
                  }
                />

                <Separator />

                <InfoRow
                  label="E-mail"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />

                      {guest?.email ||
                        booking.guest_email ||
                        "—"}
                    </span>
                  }
                />

                <Separator />

                <InfoRow
                  label="Voyageurs"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />

                      {
                        booking.guests_count
                      }
                    </span>
                  }
                />
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Home className="h-4 w-4" />
                  Logement
                </CardTitle>
              </CardHeader>

              <CardContent>
                <InfoRow
                  label="Bien"
                  value={
                    property?.title ||
                    "—"
                  }
                />

                <Separator />

                <InfoRow
                  label="Référence"
                  value={
                    property?.reference ||
                    "—"
                  }
                />

                <Separator />

                <InfoRow
                  label="Localisation"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />

                      {[
                        property?.district,
                        property?.commune,
                        property?.city,
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                        "—"}
                    </span>
                  }
                />

                <Separator />

                <InfoRow
                  label="Type d'annonce"
                  value={
                    property?.listing_type ===
                    "short_rental"
                      ? "Location courte durée"
                      : property?.listing_type ||
                        "—"
                  }
                />
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4" />
                  Séjour
                </CardTitle>
              </CardHeader>

              <CardContent>
                <InfoRow
                  label="Arrivée"
                  value={formatDate(
                    booking.check_in,
                  )}
                />

                <Separator />

                <InfoRow
                  label="Départ"
                  value={formatDate(
                    booking.check_out,
                  )}
                />

                <Separator />

                <InfoRow
                  label="Nombre de nuits"
                  value={
                    nights_count
                  }
                />

                <Separator />

                <InfoRow
                  label="Source"
                  value={
                    booking.source ||
                    "—"
                  }
                />

                {booking.external_reference && (
                  <>
                    <Separator />

                    <InfoRow
                      label="Référence externe"
                      value={
                        booking.external_reference
                      }
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ================================================== */}
          {/* DETAIL FINANCIER                                  */}
          {/* ================================================== */}

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Détail financier
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Hébergement
                  </p>

                  <InfoRow
                    label="Tarif moyen / nuit"
                    value={formatMoney(
                      booking.nightly_price,
                      currency,
                    )}
                  />

                  <Separator />

                  <InfoRow
                    label="Total nuits"
                    value={formatMoney(
                      booking.accommodation_amount,
                      currency,
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Frais
                  </p>

                  <InfoRow
                    label="Ménage"
                    value={formatMoney(
                      booking.cleaning_fee,
                      currency,
                    )}
                  />

                  <Separator />

                  <InfoRow
                    label="Service"
                    value={formatMoney(
                      booking.service_fee,
                      currency,
                    )}
                  />

                  <Separator />

                  <InfoRow
                    label="Taxes"
                    value={formatMoney(
                      booking.tax_amount,
                      currency,
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Ajustements
                  </p>

                  <InfoRow
                    label="Remise"
                    value={formatMoney(
                      booking.discount_amount,
                      currency,
                    )}
                  />

                  <Separator />

                  <InfoRow
                    label="Caution"
                    value={formatMoney(
                      booking.deposit,
                      currency,
                    )}
                  />

                  <p className="text-xs text-muted-foreground">
                    La caution n'est pas incluse dans le total du séjour.
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    Total séjour
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {formatMoney(
                      booking.total_amount,
                      currency,
                    )}
                  </p>

                  <Separator className="my-4" />

                  <p className="text-xs text-muted-foreground">
                    Hébergement + frais − remise
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ================================================== */}
          {/* BOOKING NIGHTS                                    */}
          {/* ================================================== */}

          <Card className="premium-card overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BedDouble className="h-5 w-5" />
                    Détail nuit par nuit
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Snapshot tarifaire figé lors de la confirmation.
                  </p>
                </div>

                {nights.length > 0 && (
                  <Badge variant="outline">
                    {nights.length} nuit
                    {nights.length > 1
                      ? "s"
                      : ""}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {nights.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center">
                  <Clock3 className="mb-3 h-8 w-8 text-muted-foreground" />

                  <p className="font-medium">
                    Aucun snapshot tarifaire
                  </p>

                  <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                    Les lignes booking_nights seront créées
                    automatiquement lors de la confirmation sécurisée
                    de la réservation.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          Nuit
                        </TableHead>

                        <TableHead>
                          Tarification
                        </TableHead>

                        <TableHead className="text-right">
                          Tarif de base
                        </TableHead>

                        <TableHead className="text-right">
                          Ajustement
                        </TableHead>

                        <TableHead className="text-right">
                          Tarif final
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {nights.map(
                        (
                          night,
                          index,
                        ) => (
                          <TableRow
                            key={
                              night.id
                            }
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium capitalize">
                                  {formatNightDate(
                                    night.stay_date,
                                  )}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  Nuit {index + 1}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <NightRateBadge
                                night={
                                  night
                                }
                              />
                            </TableCell>

                            <TableCell className="text-right">
                              {formatMoney(
                                night.base_rate,
                                currency,
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              {night.adjustment_amount === 0 ? (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              ) : (
                                <span>
                                  {night.adjustment_amount > 0
                                    ? "+"
                                    : ""}

                                  {formatMoney(
                                    night.adjustment_amount,
                                    currency,
                                  )}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-right font-medium">
                              {formatMoney(
                                night.nightly_rate,
                                currency,
                              )}
                            </TableCell>
                          </TableRow>
                        ),
                      )}

                      <TableRow>
                        <TableCell
                          colSpan={
                            4
                          }
                          className="text-right font-medium"
                        >
                          Total hébergement
                        </TableCell>

                        <TableCell className="text-right text-base font-bold">
                          {formatMoney(
                            nights_total,
                            currency,
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================================================== */}
          {/* COHERENCE FINANCIERE                              */}
          {/* ================================================== */}

          {nights.length >
            0 &&
            Math.abs(
              financialDifference,
            ) >
              0.01 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />

                <AlertDescription>
                  Une incohérence tarifaire a été détectée :
                  le total des nuits ne correspond pas au montant
                  d'hébergement enregistré sur la réservation.
                </AlertDescription>
              </Alert>
            )}

          {/* ================================================== */}
          {/* NOTES                                             */}
          {/* ================================================== */}

          {booking.notes && (
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
                  {
                    booking.notes
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {/* ================================================== */}
          {/* HISTORIQUE                                        */}
          {/* ================================================== */}

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-5 w-5" />
                Historique du séjour
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Création
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      booking.created_at,
                    )}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Confirmation
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      booking.confirmed_at,
                    )}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Check-in
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      booking.checked_in_at,
                    )}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Check-out
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      booking.checked_out_at,
                    )}
                  </p>
                </div>
              </div>

              {booking.cancelled_at && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />

                    <p className="font-medium text-destructive">
                      Réservation annulée
                    </p>
                  </div>

                  <p className="mt-2 text-sm">
                    {formatDateTime(
                      booking.cancelled_at,
                    )}
                  </p>

                  {booking.cancellation_reason && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Motif :{" "}
                      {
                        booking
                          .cancellation_reason
                      }
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================================================== */}
          {/* WORKFLOW                                          */}
          {/* ================================================== */}

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-base">
                Workflow opérationnel
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    booking.confirmed_at
                      ? "default"
                      : "outline"
                  }
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Confirmation
                </Badge>

                <span className="text-muted-foreground">
                  →
                </span>

                <Badge
                  variant={
                    booking.checked_in_at
                      ? "default"
                      : "outline"
                  }
                >
                  <LogIn className="mr-1 h-3 w-3" />
                  Check-in
                </Badge>

                <span className="text-muted-foreground">
                  →
                </span>

                <Badge
                  variant={
                    booking.checked_out_at
                      ? "default"
                      : "outline"
                  }
                >
                  <LogOut className="mr-1 h-3 w-3" />
                  Check-out
                </Badge>

                <span className="text-muted-foreground">
                  →
                </span>

                <Badge
                  variant={
                    booking.status ===
                    "completed"
                      ? "default"
                      : "outline"
                  }
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Terminé
                </Badge>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Confirmation
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      booking.confirmed_at,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Check-in
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      booking.checked_in_at,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Check-out
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      booking.checked_out_at,
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                Les transitions Confirmation, Check-in, Check-out et
                Annulation passent exclusivement par leurs RPC PostgreSQL
                sécurisées. Aucun changement direct vers Confirmée, En cours,
                Terminée ou Annulée n'est effectué depuis cette fiche.
              </p>
            </CardContent>
          </Card>

          {/* ================================================== */}
          {/* FACTURATION                                       */}
          {/* ================================================== */}

          <Card className="premium-card">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="h-4 w-4" />
                    Facturation
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Facture du séjour rattachée directement à la réservation.
                  </p>
                </div>

                {invoice && (
                  <InvoiceStatusBadge
                    status={
                      invoice.status
                    }
                  />
                )}
              </div>
            </CardHeader>

            <CardContent>
              {isInvoiceLoading ? (
                <div className="flex min-h-[120px] items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement de la facturation...
                  </div>
                </div>
              ) : isInvoiceError ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />

                  <AlertDescription>
                    Impossible de charger la facture :{" "}
                    {invoiceError instanceof
                    Error
                      ? invoiceError.message
                      : "erreur inconnue"}
                  </AlertDescription>
                </Alert>
              ) : !invoice ? (
                <div className="rounded-lg border border-dashed p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />

                        <p className="font-medium">
                          Aucune facture générée
                        </p>
                      </div>

                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        La facture reprendra le montant figé du séjour.
                        La caution de{" "}
                        {formatMoney(
                          booking.deposit,
                          currency,
                        )}{" "}
                        reste exclue de cette facture.
                      </p>
                    </div>

                    {canGenerateInvoice ? (
                      <Button
                        onClick={
                          handleGenerateInvoice
                        }
                        disabled={
                          financialPending
                        }
                      >
                        {createInvoice.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Receipt className="mr-2 h-4 w-4" />
                        )}

                        {createInvoice.isPending
                          ? "Génération..."
                          : "Générer la facture"}
                      </Button>
                    ) : (
                      <Badge variant="outline">
                        {isCancelled
                          ? "Réservation annulée"
                          : "Confirmation requise"}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 rounded-lg border p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Facture
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {
                          invoice.number
                        }
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Émise le{" "}
                        {formatDate(
                          invoice.issue_date,
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-5">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total
                        </p>

                        <p className="mt-1 font-semibold">
                          {formatMoney(
                            invoice.amount,
                            invoice.currency,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payé
                        </p>

                        <p className="mt-1 font-semibold">
                          {formatMoney(
                            invoice.paid_amount,
                            invoice.currency,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Reste
                        </p>

                        <p className="mt-1 font-semibold">
                          {formatMoney(
                            invoiceRemainingAmount,
                            invoice.currency,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {invoice.lines.length >
                    0 && (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              Désignation
                            </TableHead>

                            <TableHead className="text-right">
                              Qté
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
                          {invoice.lines.map(
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

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      La caution n'est pas comprise dans cette facture de séjour.
                    </p>

                    <Button
                      variant="outline"
                      onClick={
                        handleOpenInvoice
                      }
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Voir la facture
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================================================== */}
          {/* LIEN DE PAIEMENT PUBLIC                           */}
          {/* ================================================== */}

          <Card className="premium-card">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4" />
                    Lien de paiement voyageur
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Générez un accès public sécurisé uniquement après confirmation de la réservation.
                  </p>
                </div>

                {paymentAccess ? (
                  paymentAccess.revoked ? (
                    <Badge variant="destructive">
                      Révoqué
                    </Badge>
                  ) : activePaymentAccess ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-300 bg-emerald-50 text-emerald-700"
                    >
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Expiré
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline">
                    Non généré dans cette session
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {!invoice ? (
                <Alert>
                  <Receipt className="h-4 w-4" />
                  <AlertDescription>
                    La facture de séjour doit exister avant de pouvoir générer un lien de paiement.
                  </AlertDescription>
                </Alert>
              ) : booking.status === "request" || booking.status === "option" ? (
                <Alert>
                  <Clock3 className="h-4 w-4" />
                  <AlertDescription>
                    Confirmez d'abord la demande. Le voyageur ne doit recevoir aucun lien de paiement avant la confirmation officielle.
                  </AlertDescription>
                </Alert>
              ) : isCancelled ? (
                <Alert variant="destructive">
                  <Ban className="h-4 w-4" />
                  <AlertDescription>
                    La réservation est annulée. Aucun lien de paiement ne peut être généré.
                  </AlertDescription>
                </Alert>
              ) : isCompleted ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Le séjour est terminé. La génération d'un nouveau lien de paiement n'est plus disponible.
                  </AlertDescription>
                </Alert>
              ) : invoiceRemainingAmount <= 0 ? (
                <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <AlertDescription>
                    Cette réservation est entièrement réglée. Aucun nouveau lien de paiement n'est nécessaire.
                  </AlertDescription>
                </Alert>
              ) : paymentDeadlinePassed ? (
                <Alert variant="destructive">
                  <Clock3 className="h-4 w-4" />
                  <AlertDescription>
                    L'échéance du premier paiement est dépassée. Le serveur public refusera le paiement tant que la situation n'aura pas été régularisée.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Reste à payer
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {formatMoney(
                          invoiceRemainingAmount,
                          invoice.currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Échéance contractuelle
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        {formatDateTime(
                          effectivePaymentDueAt,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Plan de paiement
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        {booking.payment_plan === "full"
                          ? "100 % au premier paiement"
                          : `${Number(booking.initial_payment_percent ?? 50)} % au premier paiement`}
                      </p>
                    </div>
                  </div>

                  {paymentAccess && (
                    <div
                      className={
                        paymentAccess.revoked
                          ? "rounded-lg border border-destructive/30 bg-destructive/5 p-4"
                          : "rounded-lg border bg-muted/20 p-4"
                      }
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {paymentAccess.revoked
                                ? "Lien révoqué"
                                : activePaymentAccess
                                  ? "Lien sécurisé actif"
                                  : "Lien expiré"}
                            </p>

                            {!paymentAccess.revoked && activePaymentAccess && (
                              <Badge
                                variant="outline"
                                className="border-emerald-300 bg-emerald-50 text-emerald-700"
                              >
                                Prêt à partager
                              </Badge>
                            )}
                          </div>

                          <p className="mt-2 break-all rounded-md border bg-background px-3 py-2 font-mono text-xs">
                            {paymentAccess.paymentUrl}
                          </p>

                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            <span>
                              Expiration technique : {formatDateTime(paymentAccess.expiresAt)}
                            </span>
                            <span>
                              Échéance paiement : {formatDateTime(paymentAccess.paymentDueAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyPaymentLink}
                            disabled={
                              paymentAccess.revoked ||
                              !activePaymentAccess
                            }
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copier
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSharePaymentLink}
                            disabled={
                              paymentAccess.revoked ||
                              !activePaymentAccess
                            }
                          >
                            <Share2 className="mr-2 h-4 w-4" />
                            Partager
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpenPaymentLink}
                            disabled={
                              paymentAccess.revoked ||
                              !activePaymentAccess
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ouvrir
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentAccess &&
                    !paymentAccess.revoked &&
                    activePaymentAccess && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-medium text-blue-950">
                              Envoyer le lien au voyageur
                            </p>

                            <p className="mt-1 text-sm text-blue-900/80">
                              Le message reprend automatiquement la référence,
                              le montant restant, l'échéance et le lien sécurisé actif.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-blue-900/80">
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                {travelerPhone || "Téléphone non renseigné"}
                              </span>

                              <span className="inline-flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                {travelerEmail || "E-mail non renseigné"}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleSendPaymentLinkWhatsApp}
                              disabled={!travelerPhone}
                              className="bg-background"
                            >
                              <Smartphone className="mr-2 h-4 w-4" />
                              WhatsApp
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleSendPaymentLinkEmail}
                              disabled={!travelerEmail}
                              className="bg-background"
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              E-mail
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleSendPaymentLinkSms}
                              disabled={!travelerPhone}
                              className="bg-background"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              SMS
                            </Button>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div>
                          <p className="text-xs font-medium text-blue-950">
                            Aperçu du message
                          </p>

                          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border bg-background p-3 font-sans text-xs text-foreground">
                            {paymentMessage}
                          </pre>
                        </div>
                      </div>
                    )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleGeneratePaymentLink}
                      disabled={
                        !canGeneratePaymentLink ||
                        paymentLinkPending ||
                        paymentLinkRevokePending
                      }
                    >
                      {paymentLinkPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : activePaymentAccess ? (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      ) : (
                        <Link2 className="mr-2 h-4 w-4" />
                      )}

                      {paymentLinkPending
                        ? "Génération..."
                        : activePaymentAccess
                          ? "Régénérer le lien"
                          : "Générer le lien de paiement"}
                    </Button>

                    {paymentAccess &&
                      !paymentAccess.revoked &&
                      activePaymentAccess && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleRevokePaymentLink}
                          disabled={
                            paymentLinkRevokePending ||
                            paymentLinkPending
                          }
                        >
                          {paymentLinkRevokePending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="mr-2 h-4 w-4" />
                          )}

                          {paymentLinkRevokePending
                            ? "Révocation..."
                            : "Révoquer le lien"}
                        </Button>
                      )}
                  </div>

                  <Alert>
                    <ShieldCheck className="h-4 w-4" />
                    <AlertDescription>
                      Le token brut n'est jamais stocké en base. Il est visible uniquement après sa génération dans cette session. Après un rechargement de page, générez un nouveau lien si nécessaire : la RPC révoquera automatiquement l'ancien accès actif.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ================================================== */}
          {/* ENCAISSEMENT                                      */}
          {/* ================================================== */}

          <Card className="premium-card">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4" />
                    Encaissement
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Encaissements du séjour enregistrés via la comptabilité et la trésorerie.
                  </p>
                </div>

                {invoice && (
                  <InvoiceStatusBadge
                    status={
                      invoice.status
                    }
                  />
                )}
              </div>
            </CardHeader>

            <CardContent>
              {!invoice ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />

                  <p className="mt-3 font-medium">
                    Facture requise
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Générez d'abord la facture du séjour avant d'enregistrer un encaissement.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Total à payer
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatMoney(
                          invoiceAmount,
                          invoice.currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Déjà encaissé
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatMoney(
                          invoicePaidAmount,
                          invoice.currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Reste à payer
                      </p>

                      <p
                        className={
                          invoiceRemainingAmount >
                          0
                            ? "mt-2 text-xl font-bold"
                            : "mt-2 text-xl font-bold text-emerald-700"
                        }
                      >
                        {formatMoney(
                          invoiceRemainingAmount,
                          invoice.currency,
                        )}
                      </p>
                    </div>
                  </div>

                  {invoice.status ===
                  "paid" ? (
                    <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />

                      <AlertDescription>
                        Le séjour est entièrement payé. Aucun solde
                        n'est restant sur cette facture.
                      </AlertDescription>
                    </Alert>
                  ) : invoice.status ===
                    "cancelled" ? (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />

                      <AlertDescription>
                        Cette facture est annulée. Aucun nouvel encaissement n'est autorisé.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {invoicePaidAmount ===
                        0 &&
                        invoiceHalfAmount >
                          0 && (
                          <Button
                            variant="outline"
                            onClick={() =>
                              openPaymentDialog(
                                Math.min(
                                  invoiceHalfAmount,
                                  invoiceRemainingAmount,
                                ),
                              )
                            }
                            disabled={
                              financialPending
                            }
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Encaisser 50 %
                          </Button>
                        )}

                      <Button
                        onClick={() =>
                          openPaymentDialog(
                            invoiceRemainingAmount,
                          )
                        }
                        disabled={
                          financialPending ||
                          !hasPaymentBalance
                        }
                      >
                        <Banknote className="mr-2 h-4 w-4" />

                        {invoicePaidAmount >
                        0
                          ? "Encaisser le solde"
                          : "Encaisser 100 %"}
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() =>
                          openPaymentDialog()
                        }
                        disabled={
                          financialPending ||
                          !hasPaymentBalance
                        }
                      >
                        Autre montant
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          Historique des paiements
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Paiements et remboursements rattachés à cette facture.
                        </p>
                      </div>

                      {completedPayments.length >
                        0 && (
                        <Badge variant="outline">
                          {completedPayments.length} encaissement
                          {completedPayments.length >
                          1
                            ? "s"
                            : ""}
                        </Badge>
                      )}
                    </div>

                    {isPaymentsLoading ? (
                      <div className="flex min-h-[100px] items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : isPaymentsError ? (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />

                        <AlertDescription>
                          Impossible de charger les paiements :{" "}
                          {paymentsError instanceof
                          Error
                            ? paymentsError.message
                            : "erreur inconnue"}
                        </AlertDescription>
                      </Alert>
                    ) : payments.length ===
                      0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <CreditCard className="mx-auto h-7 w-7 text-muted-foreground" />

                        <p className="mt-3 text-sm font-medium">
                          Aucun paiement enregistré
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
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
                                Mode
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
                            {payments.map(
                              (
                                payment,
                              ) => (
                                <TableRow
                                  key={
                                    payment.id
                                  }
                                >
                                  <TableCell>
                                    {formatDateTime(
                                      payment.paid_at,
                                    )}
                                  </TableCell>

                                  <TableCell className="font-medium">
                                    {
                                      payment.reference
                                    }
                                  </TableCell>

                                  <TableCell>
                                    <span className="inline-flex items-center gap-2">
                                      <PaymentMethodIcon
                                        method={
                                          payment.method
                                        }
                                      />

                                      {getPaymentMethodLabel(
                                        payment.method,
                                      )}
                                    </span>
                                  </TableCell>

                                  <TableCell>
                                    {payment.is_refund ||
                                    payment.status ===
                                      "refunded" ? (
                                      <Badge variant="secondary">
                                        Remboursement
                                      </Badge>
                                    ) : payment.status ===
                                      "completed" ? (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-300 bg-emerald-50 text-emerald-700"
                                      >
                                        Encaissé
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        {
                                          payment.status
                                        }
                                      </Badge>
                                    )}
                                  </TableCell>

                                  <TableCell
                                    className={
                                      payment.is_refund ||
                                      payment.status ===
                                        "refunded"
                                        ? "text-right font-medium text-destructive"
                                        : "text-right font-medium"
                                    }
                                  >
                                    {payment.is_refund ||
                                    payment.status ===
                                      "refunded"
                                      ? "-"
                                      : ""}

                                    {formatMoney(
                                      payment.amount,
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

                    {refunds.length >
                      0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Les remboursements sont déduits automatiquement du montant payé de la facture.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageShell>

      {/* ====================================================== */}
      {/* PAYMENT DIALOG                                        */}
      {/* ====================================================== */}

      <Dialog
        open={
          paymentDialogOpen
        }
        onOpenChange={
          (
            open,
          ) => {
            if (
              !recordPayment.isPending
            ) {
              setPaymentDialogOpen(
                open,
              );
            }
          }
        }
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              Enregistrer un paiement
            </DialogTitle>

            <DialogDescription>
              Le paiement sera rattaché à la facture{" "}
              <span className="font-medium">
                {invoice?.number}
              </span>
              , puis comptabilisé automatiquement dans la trésorerie.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Facture
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {formatMoney(
                    invoiceAmount,
                    invoice?.currency ||
                      currency,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Déjà payé
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {formatMoney(
                    invoicePaidAmount,
                    invoice?.currency ||
                      currency,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Solde
                </p>

                <p className="mt-1 text-sm font-bold">
                  {formatMoney(
                    invoiceRemainingAmount,
                    invoice?.currency ||
                      currency,
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="short-rental-payment-amount">
                Montant encaissé
              </Label>

              <Input
                id="short-rental-payment-amount"
                type="number"
                min="1"
                step="1"
                value={
                  paymentAmount
                }
                onChange={(
                  event,
                ) =>
                  setPaymentAmount(
                    event.target.value,
                  )
                }
                disabled={
                  recordPayment.isPending
                }
              />

              <div className="flex flex-wrap gap-2">
                {invoicePaidAmount ===
                  0 &&
                  invoiceHalfAmount >
                    0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPaymentAmount(
                          String(
                            Math.min(
                              invoiceHalfAmount,
                              invoiceRemainingAmount,
                            ),
                          ),
                        )
                      }
                      disabled={
                        recordPayment.isPending
                      }
                    >
                      50 %
                    </Button>
                  )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPaymentAmount(
                      String(
                        invoiceRemainingAmount,
                      ),
                    )
                  }
                  disabled={
                    recordPayment.isPending
                  }
                >
                  Solde complet
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Mode de paiement
              </Label>

              <Select
                value={
                  paymentMethod
                }
                onValueChange={(
                  value,
                ) =>
                  setPaymentMethod(
                    value as ShortRentalPaymentMethod,
                  )
                }
                disabled={
                  recordPayment.isPending
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un mode de paiement" />
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

                  <SelectItem value="other">
                    Autre
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="short-rental-payment-reference">
                Référence externe
              </Label>

              <Input
                id="short-rental-payment-reference"
                value={
                  paymentReference
                }
                onChange={(
                  event,
                ) =>
                  setPaymentReference(
                    event.target.value,
                  )
                }
                placeholder="Ex. reçu, transaction Mobile Money, virement..."
                disabled={
                  recordPayment.isPending
                }
              />

              <p className="text-xs text-muted-foreground">
                Facultatif. Une référence interne sera générée automatiquement si ce champ est vide.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="short-rental-payment-notes">
                Notes
              </Label>

              <Textarea
                id="short-rental-payment-notes"
                value={
                  paymentNotes
                }
                onChange={(
                  event,
                ) =>
                  setPaymentNotes(
                    event.target.value,
                  )
                }
                placeholder="Information complémentaire sur l'encaissement..."
                rows={
                  3
                }
                disabled={
                  recordPayment.isPending
                }
              />
            </div>

            {Number(
              paymentAmount,
            ) >
              invoiceRemainingAmount && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />

                <AlertDescription>
                  Le montant saisi dépasse le solde restant de{" "}
                  {formatMoney(
                    invoiceRemainingAmount,
                    invoice?.currency ||
                      currency,
                  )}
                  .
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPaymentDialogOpen(
                  false,
                )
              }
              disabled={
                recordPayment.isPending
              }
            >
              Annuler
            </Button>

            <Button
              type="button"
              onClick={
                handleRecordPayment
              }
              disabled={
                recordPayment.isPending ||
                !paymentAmount ||
                Number(
                  paymentAmount,
                ) <= 0 ||
                Number(
                  paymentAmount,
                ) >
                  invoiceRemainingAmount
              }
            >
              {recordPayment.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Banknote className="mr-2 h-4 w-4" />
              )}

              {recordPayment.isPending
                ? "Enregistrement..."
                : "Enregistrer le paiement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====================================================== */}
      {/* CANCELLATION DIALOG                                   */}
      {/* ====================================================== */}

      <Dialog
        open={cancellationDialogOpen}
        onOpenChange={(open) => {
          if (!cancelBooking.isPending) {
            setCancellationDialogOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>
              Annuler la réservation
            </DialogTitle>

            <DialogDescription>
              La politique contractuelle sera appliquée automatiquement.
              Toute pénalité, remboursement, écriture comptable et sortie
              de trésorerie sera exécuté par le workflow sécurisé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Réservation
                  </p>
                  <p className="mt-1 font-semibold">
                    {booking.reference}
                  </p>
                </div>

                <BookingStatusBadge
                  status={booking.status}
                />
              </div>
            </div>

            {cancellationPreview.isPending ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calcul des conditions d'annulation...
                </div>
              </div>
            ) : cancellationPreview.isError ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {getCancellationPreviewErrorMessage(
                    cancellationPreview.error,
                  )}
                </AlertDescription>
              </Alert>
            ) : cancellationPreviewData ? (
              <div className="space-y-4">
                <Alert
                  className={
                    cancellationPreviewData.free_cancellation
                      ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                      : "border-amber-300 bg-amber-50 text-amber-950"
                  }
                >
                  {cancellationPreviewData.free_cancellation ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-amber-700" />
                  )}

                  <AlertDescription>
                    {cancellationPreviewData.free_cancellation
                      ? "Annulation gratuite : aucune pénalité contractuelle ne sera appliquée."
                      : `Le délai d'annulation gratuite est dépassé. Une pénalité de ${cancellationPreviewData.penalty_rate}% est applicable.`}
                  </AlertDescription>
                </Alert>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Total réservation
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatMoney(
                        cancellationPreviewData.total_booking_amount,
                        currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Net déjà encaissé
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatMoney(
                        netCollected,
                        currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Pénalité contractuelle
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatMoney(
                        contractualPenalty,
                        currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Pénalité effectivement conservée
                    </p>
                    <p className="mt-1 font-semibold">
                      {formatMoney(
                        effectivePenalty,
                        currency,
                      )}
                    </p>
                  </div>
                </div>

                <div
                  className={
                    estimatedRefund > 0
                      ? "rounded-lg border border-blue-200 bg-blue-50 p-4"
                      : "rounded-lg border bg-muted/20 p-4"
                  }
                >
                  <p className="text-xs text-muted-foreground">
                    Montant à rembourser
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {formatMoney(
                      estimatedRefund,
                      currency,
                    )}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground">
                  Délai d'annulation gratuite :{" "}
                  <span className="font-medium text-foreground">
                    {formatDateTime(
                      cancellationPreviewData.free_cancellation_deadline,
                    )}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="short-rental-cancellation-reason">
                Motif de l'annulation
              </Label>

              <Textarea
                id="short-rental-cancellation-reason"
                value={cancellationReason}
                onChange={(event) =>
                  setCancellationReason(
                    event.target.value,
                  )
                }
                placeholder="Indiquez le motif de l'annulation..."
                rows={4}
                disabled={cancelBooking.isPending}
              />

              <p className="text-xs text-muted-foreground">
                Obligatoire. Ce motif sera conservé dans l'historique de la réservation.
              </p>
            </div>

            {estimatedRefund > 0 &&
              cancellationPreviewData && (
                <div className="space-y-2">
                  <Label>
                    Mode de remboursement
                  </Label>

                  <Select
                    value={refundMethod}
                    onValueChange={(value) =>
                      setRefundMethod(
                        value as ShortRentalRefundMethod,
                      )
                    }
                    disabled={cancelBooking.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le mode de remboursement" />
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
                      <SelectItem value="other">
                        Autre
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-muted-foreground">
                    Ce mode sera utilisé pour la sortie de trésorerie du remboursement.
                  </p>
                </div>
              )}

            {cancellationPreviewData &&
              estimatedRefund === 0 && (
                <Alert>
                  <Ban className="h-4 w-4" />
                  <AlertDescription>
                    Aucun remboursement ne sera généré pour cette annulation.
                  </AlertDescription>
                </Alert>
              )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setCancellationDialogOpen(false)
              }
              disabled={cancelBooking.isPending}
            >
              Retour
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={
                cancelBooking.isPending ||
                cancellationPreview.isPending ||
                !cancellationPreviewData ||
                !cancellationReason.trim()
              }
            >
              {cancelBooking.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}

              {cancelBooking.isPending
                ? "Annulation..."
                : estimatedRefund > 0
                  ? `Annuler et rembourser ${formatMoney(
                      estimatedRefund,
                      currency,
                    )}`
                  : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
