import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  Search,
  Users,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

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

import { Textarea } from "@/components/ui/textarea";

import { useToast } from "@/hooks/use-toast";

import {
  ExpensePayable,
  ExpenseSupplierBalance,
  useExpensePayables,
  useExpensePayablesKpis,
  useExpenseSupplierBalances,
  usePayableTreasuryAccounts,
  usePayExpenseFromPayables,
} from "@/hooks/use-payables";

type ActiveTab = "all" | "overdue" | "due_soon" | "suppliers";

type PaymentFormState = {
  amount: string;
  treasuryAccountId: string;
  paymentDate: string;
  reference: string;
  notes: string;
};

function formatCurrency(
  value: number | null | undefined,
  currency = "GNF",
) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "GNF",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(`${value.substring(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getLocalDateTimeValue() {
  const date = new Date();

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function getDueBadge(payable: ExpensePayable) {
  switch (payable.due_state) {
    case "overdue":
      return (
        <Badge variant="destructive">
          {payable.overdue_days && payable.overdue_days > 0
            ? `${payable.overdue_days} j de retard`
            : "En retard"}
        </Badge>
      );

    case "due_soon":
      return (
        <Badge
          variant="outline"
          className="border-amber-500 text-amber-700"
        >
          {payable.days_until_due === 0
            ? "Aujourd'hui"
            : payable.days_until_due === 1
              ? "Demain"
              : `Dans ${payable.days_until_due} j`}
        </Badge>
      );

    case "future":
      return (
        <Badge variant="secondary">
          {payable.days_until_due !== null
            ? `Dans ${payable.days_until_due} j`
            : "À venir"}
        </Badge>
      );

    default:
      return <Badge variant="outline">Sans échéance</Badge>;
  }
}

function getExpenseStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return (
        <Badge
          variant="outline"
          className="border-blue-500 text-blue-700"
        >
          À payer
        </Badge>
      );

    case "partially_paid":
      return (
        <Badge
          variant="outline"
          className="border-amber-500 text-amber-700"
        >
          Partiellement payée
        </Badge>
      );

    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function createPaymentForm(
  payable?: ExpensePayable | null,
): PaymentFormState {
  return {
    amount: payable ? String(payable.balance_due) : "",
    treasuryAccountId: "",
    paymentDate: getLocalDateTimeValue(),
    reference: "",
    notes: "",
  };
}

export default function PayablesPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [search, setSearch] = useState("");

  const [selectedPayable, setSelectedPayable] =
    useState<ExpensePayable | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);

  const [paymentForm, setPaymentForm] =
    useState<PaymentFormState>(createPaymentForm());

  const {
    data: payables = [],
    isLoading: payablesLoading,
    error: payablesError,
  } = useExpensePayables();

  const {
    data: suppliers = [],
    isLoading: suppliersLoading,
    error: suppliersError,
  } = useExpenseSupplierBalances();

  const {
    data: kpis,
    isLoading: kpisLoading,
  } = useExpensePayablesKpis();

  const {
    data: treasuryAccounts = [],
    isLoading: treasuryLoading,
  } = usePayableTreasuryAccounts();

  const payExpense = usePayExpenseFromPayables();

  const filteredPayables = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payables.filter((item) => {
      if (
        activeTab === "overdue" &&
        item.due_state !== "overdue"
      ) {
        return false;
      }

      if (
        activeTab === "due_soon" &&
        item.due_state !== "due_soon"
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableValues = [
        item.expense_reference,
        item.document_number,
        item.supplier_name,
        item.label,
        item.category_name,
        item.property_title,
        item.owner_name,
        item.sale_reference,
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [payables, search, activeTab]);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [
        supplier.supplier_name,
        supplier.supplier_phone,
        supplier.supplier_email,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [suppliers, search]);

  const handleOpenPayment = (payable: ExpensePayable) => {
    setSelectedPayable(payable);
    setPaymentForm(createPaymentForm(payable));
    setPaymentOpen(true);
  };

  const handleClosePayment = () => {
    if (payExpense.isPending) return;

    setPaymentOpen(false);
    setSelectedPayable(null);
    setPaymentForm(createPaymentForm());
  };

  const handlePay = async () => {
    if (!selectedPayable) {
      return;
    }

    const amount = Number(
      paymentForm.amount.replace(/\s/g, "").replace(",", "."),
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Montant invalide",
        description:
          "Le montant du paiement doit être supérieur à zéro.",
        variant: "destructive",
      });

      return;
    }

    if (amount > selectedPayable.balance_due) {
      toast({
        title: "Montant trop élevé",
        description: `Le reste à payer est de ${formatCurrency(
          selectedPayable.balance_due,
          selectedPayable.currency,
        )}.`,
        variant: "destructive",
      });

      return;
    }

    if (!paymentForm.treasuryAccountId) {
      toast({
        title: "Compte de paiement requis",
        description:
          "Sélectionnez la caisse, la banque ou Mobile Money.",
        variant: "destructive",
      });

      return;
    }

    try {
      await payExpense.mutateAsync({
        expenseId: selectedPayable.expense_id,
        amount,
        treasuryAccountId: paymentForm.treasuryAccountId,

        paymentDate: paymentForm.paymentDate
          ? new Date(paymentForm.paymentDate).toISOString()
          : new Date().toISOString(),

        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });

      const fullyPaid =
        Math.abs(amount - selectedPayable.balance_due) < 0.01;

      toast({
        title: fullyPaid
          ? "Dépense payée"
          : "Paiement enregistré",

        description: fullyPaid
          ? "La dette fournisseur est maintenant entièrement réglée."
          : "Le paiement partiel a été enregistré et la dette restante a été recalculée.",
      });

      handleClosePayment();
    } catch (error: any) {
      toast({
        title: "Paiement impossible",

        description:
          error?.message ??
          "Une erreur est survenue pendant l'enregistrement du paiement.",

        variant: "destructive",
      });
    }
  };

  const setFullBalance = () => {
    if (!selectedPayable) return;

    setPaymentForm((current) => ({
      ...current,
      amount: String(selectedPayable.balance_due),
    }));
  };

  const loading =
    payablesLoading ||
    suppliersLoading ||
    kpisLoading;

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement des dettes fournisseurs...
        </div>
      </div>
    );
  }

  if (payablesError || suppliersError) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />

            <div>
              <p className="font-medium">
                Impossible de charger les dettes fournisseurs.
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {(payablesError as any)?.message ??
                  (suppliersError as any)?.message ??
                  "Erreur Supabase."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Dettes fournisseurs
          </h1>

          <p className="text-sm text-muted-foreground">
            Échéances, factures à payer et paiements fournisseurs.
          </p>
        </div>
      </div>

      {/* ===================================================== */}
      {/* KPI */}
      {/* ===================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Dette fournisseurs
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(kpis?.total_payables ?? 0)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatNumber(kpis?.open_expense_count ?? 0)} dossier(s)
                  ouvert(s)
                </p>
              </div>

              <div className="rounded-lg bg-muted p-2.5">
                <WalletCards className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  En retard
                </p>

                <p className="mt-2 text-2xl font-semibold text-destructive">
                  {formatCurrency(kpis?.overdue_amount ?? 0)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatNumber(
                    kpis?.overdue_expense_count ?? 0,
                  )}{" "}
                  échéance(s)
                </p>
              </div>

              <div className="rounded-lg bg-muted p-2.5">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Sous 7 jours
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(kpis?.due_soon_amount ?? 0)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatNumber(
                    kpis?.due_soon_expense_count ?? 0,
                  )}{" "}
                  échéance(s)
                </p>
              </div>

              <div className="rounded-lg bg-muted p-2.5">
                <CalendarClock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Fournisseurs concernés
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {formatNumber(kpis?.supplier_count ?? 0)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Avec au moins une dette ouverte
                </p>
              </div>

              <div className="rounded-lg bg-muted p-2.5">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================================================== */}
      {/* TABS */}
      {/* ===================================================== */}

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as ActiveTab)
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="all">
              À payer
            </TabsTrigger>

            <TabsTrigger value="overdue">
              En retard
              {(kpis?.overdue_expense_count ?? 0) > 0 && (
                <span className="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-destructive-foreground">
                  {kpis?.overdue_expense_count}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger value="due_soon">
              Échéances proches
            </TabsTrigger>

            <TabsTrigger value="suppliers">
              Fournisseurs
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full lg:w-[330px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher..."
              className="pl-9"
            />
          </div>
        </div>

        {/* =================================================== */}
        {/* DETTES */}
        {/* =================================================== */}

        <TabsContent value="all" className="mt-5">
          <PayablesTable
            payables={filteredPayables}
            onPay={handleOpenPayment}
          />
        </TabsContent>

        <TabsContent value="overdue" className="mt-5">
          <PayablesTable
            payables={filteredPayables}
            onPay={handleOpenPayment}
            emptyTitle="Aucune dette en retard"
            emptyDescription="Toutes les échéances fournisseurs sont actuellement à jour."
          />
        </TabsContent>

        <TabsContent value="due_soon" className="mt-5">
          <PayablesTable
            payables={filteredPayables}
            onPay={handleOpenPayment}
            emptyTitle="Aucune échéance proche"
            emptyDescription="Aucun paiement fournisseur n'arrive à échéance dans les 7 prochains jours."
          />
        </TabsContent>

        {/* =================================================== */}
        {/* FOURNISSEURS */}
        {/* =================================================== */}

        <TabsContent value="suppliers" className="mt-5">
          <SuppliersTable suppliers={filteredSuppliers} />
        </TabsContent>
      </Tabs>

      {/* ===================================================== */}
      {/* DIALOG PAIEMENT */}
      {/* ===================================================== */}

      <Dialog
        open={paymentOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClosePayment();
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              Régler une dépense
            </DialogTitle>

            <DialogDescription>
              Le paiement réduira la dette fournisseur et le
              solde du compte de trésorerie sélectionné.
            </DialogDescription>
          </DialogHeader>

          {selectedPayable && (
            <div className="space-y-5">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {selectedPayable.supplier_name}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedPayable.expense_reference ??
                        selectedPayable.document_number ??
                        selectedPayable.label}
                    </p>
                  </div>

                  {getExpenseStatusBadge(
                    selectedPayable.status,
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      Montant
                    </p>

                    <p className="mt-1 font-medium">
                      {formatCurrency(
                        selectedPayable.amount,
                        selectedPayable.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">
                      Déjà payé
                    </p>

                    <p className="mt-1 font-medium">
                      {formatCurrency(
                        selectedPayable.amount_paid,
                        selectedPayable.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">
                      Reste
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatCurrency(
                        selectedPayable.balance_due,
                        selectedPayable.currency,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">
                    Montant du paiement *
                  </Label>

                  <div className="flex gap-2">
                    <Input
                      id="payment-amount"
                      type="number"
                      min="1"
                      max={selectedPayable.balance_due}
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={setFullBalance}
                    >
                      Solde
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Compte de paiement *
                  </Label>

                  <Select
                    value={paymentForm.treasuryAccountId}
                    onValueChange={(value) =>
                      setPaymentForm((current) => ({
                        ...current,
                        treasuryAccountId: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          treasuryLoading
                            ? "Chargement..."
                            : "Sélectionner"
                        }
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {treasuryAccounts.map((account) => (
                        <SelectItem
                          key={account.id}
                          value={account.id}
                        >
                          {account.name} — {account.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date">
                  Date du paiement
                </Label>

                <Input
                  id="payment-date"
                  type="datetime-local"
                  value={paymentForm.paymentDate}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      paymentDate: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-reference">
                  Référence
                </Label>

                <Input
                  id="payment-reference"
                  value={paymentForm.reference}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  placeholder="Ex. Virement, reçu, référence banque..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-notes">
                  Notes
                </Label>

                <Textarea
                  id="payment-notes"
                  value={paymentForm.notes}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Commentaire facultatif"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClosePayment}
              disabled={payExpense.isPending}
            >
              Annuler
            </Button>

            <Button
              onClick={handlePay}
              disabled={
                payExpense.isPending ||
                !selectedPayable
              }
            >
              {payExpense.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Paiement...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Enregistrer le paiement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========================================================= */
/* TABLE DETTES */
/* ========================================================= */

function PayablesTable({
  payables,
  onPay,
  emptyTitle = "Aucune dette fournisseur",
  emptyDescription = "Aucune dépense validée avec un solde restant à payer.",
}: {
  payables: ExpensePayable[];
  onPay: (payable: ExpensePayable) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (payables.length === 0) {
    return (
      <Card>
        <CardContent className="py-14">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="mb-3 h-9 w-9 text-muted-foreground" />

            <p className="font-medium">
              {emptyTitle}
            </p>

            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {emptyDescription}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">
                  Montant
                </TableHead>
                <TableHead className="text-right">
                  Payé
                </TableHead>
                <TableHead className="text-right">
                  Reste
                </TableHead>
                <TableHead className="text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {payables.map((payable) => (
                <TableRow key={payable.expense_id}>
                  <TableCell>
                    <div className="min-w-[190px]">
                      <p className="font-medium">
                        {payable.supplier_name}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {payable.category_name ??
                          "Sans catégorie"}
                      </p>

                      {payable.property_title && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Bien : {payable.property_title}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="min-w-[150px]">
                      <p className="text-sm">
                        {payable.expense_reference ?? "—"}
                      </p>

                      {payable.document_number && (
                        <p className="text-xs text-muted-foreground">
                          Pièce : {payable.document_number}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="min-w-[150px] space-y-1.5">
                      <p className="text-sm">
                        {formatDate(payable.due_date)}
                      </p>

                      {getDueBadge(payable)}
                    </div>
                  </TableCell>

                  <TableCell>
                    {getExpenseStatusBadge(
                      payable.status,
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right">
                    {formatCurrency(
                      payable.amount,
                      payable.currency,
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right">
                    {formatCurrency(
                      payable.amount_paid,
                      payable.currency,
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right font-semibold">
                    {formatCurrency(
                      payable.balance_due,
                      payable.currency,
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => onPay(payable)}
                    >
                      <Banknote className="mr-2 h-4 w-4" />
                      Payer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================= */
/* TABLE FOURNISSEURS */
/* ========================================================= */

function SuppliersTable({
  suppliers,
}: {
  suppliers: ExpenseSupplierBalance[];
}) {
  if (suppliers.length === 0) {
    return (
      <Card>
        <CardContent className="py-14">
          <div className="flex flex-col items-center text-center">
            <Users className="mb-3 h-9 w-9 text-muted-foreground" />

            <p className="font-medium">
              Aucun fournisseur débiteur
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Aucun fournisseur ne présente actuellement de dette
              ouverte.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Situation par fournisseur
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-center">
                  Factures
                </TableHead>
                <TableHead className="text-right">
                  Dette totale
                </TableHead>
                <TableHead className="text-right">
                  En retard
                </TableHead>
                <TableHead className="text-right">
                  Sous 7 jours
                </TableHead>
                <TableHead>
                  Plus ancienne échéance
                </TableHead>
                <TableHead>
                  Prochaine échéance
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {suppliers.map((supplier, index) => (
                <TableRow
                  key={
                    supplier.party_id ??
                    `${supplier.supplier_name}-${index}`
                  }
                >
                  <TableCell>
                    <div className="min-w-[200px]">
                      <p className="font-medium">
                        {supplier.supplier_name}
                      </p>

                      {supplier.supplier_phone && (
                        <p className="text-xs text-muted-foreground">
                          {supplier.supplier_phone}
                        </p>
                      )}

                      {supplier.supplier_email && (
                        <p className="text-xs text-muted-foreground">
                          {supplier.supplier_email}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    {formatNumber(
                      supplier.open_expense_count,
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right font-semibold">
                    {formatCurrency(
                      supplier.total_balance_due,
                      supplier.currency ?? "GNF",
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right">
                    {supplier.overdue_balance > 0 ? (
                      <span className="font-medium text-destructive">
                        {formatCurrency(
                          supplier.overdue_balance,
                          supplier.currency ?? "GNF",
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-right">
                    {supplier.due_soon_balance > 0
                      ? formatCurrency(
                          supplier.due_soon_balance,
                          supplier.currency ?? "GNF",
                        )
                      : "—"}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {formatDate(
                      supplier.oldest_due_date,
                    )}

                    {(supplier.max_overdue_days ?? 0) > 0 && (
                      <div className="mt-1">
                        <Badge variant="destructive">
                          {supplier.max_overdue_days} j max.
                        </Badge>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {formatDate(
                      supplier.next_due_date,
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}