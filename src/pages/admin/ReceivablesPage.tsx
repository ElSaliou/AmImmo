import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  Search,
  Users,
  WalletCards,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import {
  TenantReceivable,
  useRecordTenantPayment,
  useTenantBalances,
  useTenantReceivables,
  useTenantReceivablesKpis,
} from "@/hooks/use-receivables";

const money = (value: number, currency = "GNF") =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value) + ` ${currency}`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
};

function StatusBadge({ row }: { row: TenantReceivable }) {
  if (row.status === "overdue" || row.due_state === "overdue") {
    return <Badge variant="destructive">En retard</Badge>;
  }

  if (row.status === "partially_paid") {
    return <Badge variant="secondary">Partiellement payé</Badge>;
  }

  if (row.status === "paid") {
    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Payé
      </Badge>
    );
  }

  if (row.due_state === "due_today") {
    return <Badge variant="secondary">Aujourd'hui</Badge>;
  }

  if (row.due_state === "due_soon") {
    return <Badge variant="outline">Échéance proche</Badge>;
  }

  return <Badge variant="outline">À encaisser</Badge>;
}

export default function ReceivablesPage() {
  const { toast } = useToast();

  const receivables = useTenantReceivables();
  const kpis = useTenantReceivablesKpis();
  const balances = useTenantBalances();

  const payment = useRecordTenantPayment();

  const [search, setSearch] = useState("");

  const [selected, setSelected] =
    useState<TenantReceivable | null>(null);

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("mobile_money");

  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  const rows = useMemo(() => {
    return (receivables.data ?? []).filter((row) => {
      if (!normalizedSearch) return true;

      return [
        row.invoice_number,
        row.tenant_name,
        row.property_title,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch)
        );
    });
  }, [receivables.data, normalizedSearch]);

  const overdueRows = rows.filter(
    (row) =>
      row.status === "overdue" ||
      row.due_state === "overdue"
  );

  const dueSoonRows = rows.filter(
    (row) =>
      row.due_state === "due_soon" ||
      row.due_state === "due_today"
  );

  const openPayment = (row: TenantReceivable) => {
    setSelected(row);
    setAmount(String(row.balance_due));
    setPaymentMethod("mobile_money");
    setReference("");
    setNotes("");
  };

  const closePayment = () => {
    if (payment.isPending) return;

    setSelected(null);
    setAmount("");
    setReference("");
    setNotes("");
  };

  const submitPayment = async () => {
    if (!selected) return;

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Montant incorrect",
        description:
          "Le montant de l'encaissement doit être supérieur à zéro.",
        variant: "destructive",
      });

      return;
    }

    if (numericAmount > selected.balance_due) {
      toast({
        title: "Montant trop élevé",
        description: `Le reste dû est de ${money(
          selected.balance_due,
          selected.currency
        )}.`,
        variant: "destructive",
      });

      return;
    }

    try {
      await payment.mutateAsync({
        invoiceId: selected.invoice_id,
        amount: numericAmount,

        paymentMethod: paymentMethod as
          | "cash"
          | "transfer"
          | "mobile_money"
          | "card"
          | "cheque",

        reference,
        notes,
      });

      toast({
        title: "Encaissement enregistré",
        description: `${money(
          numericAmount,
          selected.currency
        )} encaissé pour ${selected.tenant_name ?? "le locataire"}.`,
      });

      closePayment();
    } catch (error: any) {
      toast({
        title: "Encaissement impossible",
        description:
          error?.message ??
          "Une erreur est survenue pendant l'encaissement.",
        variant: "destructive",
      });
    }
  };

  const renderReceivableTable = (
    tableRows: TenantReceivable[]
  ) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Locataire</TableHead>
            <TableHead>Bien</TableHead>
            <TableHead>Facture</TableHead>
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
          {tableRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="h-28 text-center text-muted-foreground"
              >
                Aucune créance correspondant à ce filtre.
              </TableCell>
            </TableRow>
          ) : (
            tableRows.map((row) => (
              <TableRow key={row.invoice_id}>
                <TableCell className="font-medium">
                  {row.tenant_name ?? "—"}
                </TableCell>

                <TableCell>
                  {row.property_title ?? "—"}
                </TableCell>

                <TableCell>
                  {row.invoice_number}
                </TableCell>

                <TableCell>
                  {formatDate(row.due_date)}
                </TableCell>

                <TableCell>
                  <StatusBadge row={row} />
                </TableCell>

                <TableCell className="text-right">
                  {money(row.amount, row.currency)}
                </TableCell>

                <TableCell className="text-right">
                  {money(row.paid_amount, row.currency)}
                </TableCell>

                <TableCell className="text-right font-semibold">
                  {money(row.balance_due, row.currency)}
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    size="sm"
                    disabled={row.balance_due <= 0}
                    onClick={() => openPayment(row)}
                  >
                    Encaisser
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Créances locataires
        </h1>

        <p className="text-sm text-muted-foreground">
          Loyers à encaisser, échéances, retards et
          règlements locataires.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              À encaisser
            </CardTitle>

            <WalletCards className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(kpis.data?.total_receivables ?? 0)}
            </div>

            <p className="text-xs text-muted-foreground">
              {kpis.data?.open_invoice_count ?? 0} facture(s)
              ouverte(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              En retard
            </CardTitle>

            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(kpis.data?.overdue_amount ?? 0)}
            </div>

            <p className="text-xs text-muted-foreground">
              {kpis.data?.overdue_invoice_count ?? 0} impayé(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Échéances proches
            </CardTitle>

            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {money(kpis.data?.due_soon_amount ?? 0)}
            </div>

            <p className="text-xs text-muted-foreground">
              À suivre dans les prochains jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Locataires débiteurs
            </CardTitle>

            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.data?.tenant_count ?? 0}
            </div>

            <p className="text-xs text-muted-foreground">
              Locataire(s) avec solde ouvert
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Suivi des encaissements</CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Locataire, bien ou facture..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="open">
            <TabsList>
              <TabsTrigger value="open">
                À encaisser
              </TabsTrigger>

              <TabsTrigger value="overdue">
                En retard
              </TabsTrigger>

              <TabsTrigger value="due-soon">
                Échéances
              </TabsTrigger>

              <TabsTrigger value="tenants">
                Locataires
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="mt-4">
              {renderReceivableTable(rows)}
            </TabsContent>

            <TabsContent value="overdue" className="mt-4">
              {renderReceivableTable(overdueRows)}
            </TabsContent>

            <TabsContent value="due-soon" className="mt-4">
              {renderReceivableTable(dueSoonRows)}
            </TabsContent>

            <TabsContent value="tenants" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Locataire</TableHead>

                      <TableHead className="text-right">
                        Factures ouvertes
                      </TableHead>

                      <TableHead className="text-right">
                        En retard
                      </TableHead>

                      <TableHead className="text-right">
                        Solde à recevoir
                      </TableHead>

                      <TableHead>
                        Prochaine échéance
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {(balances.data ?? []).map((row) => (
                      <TableRow key={row.tenant_id}>
                        <TableCell className="font-medium">
                          {row.tenant_name ?? "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          {row.open_invoice_count}
                        </TableCell>

                        <TableCell className="text-right">
                          {money(
                            row.overdue_balance,
                            row.currency
                          )}
                        </TableCell>

                        <TableCell className="text-right font-semibold">
                          {money(
                            row.total_balance_due,
                            row.currency
                          )}
                        </TableCell>

                        <TableCell>
                          {formatDate(row.next_due_date)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {(balances.data ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-28 text-center text-muted-foreground"
                        >
                          Aucun solde locataire ouvert.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) closePayment();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Encaisser un loyer</DialogTitle>

            <DialogDescription>
              Le paiement mettra automatiquement à jour la
              facture, la créance, la trésorerie et la
              comptabilité.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="font-medium">
                  {selected.tenant_name}
                </div>

                <div className="text-sm text-muted-foreground">
                  {selected.property_title}
                </div>

                <div className="mt-3 flex justify-between text-sm">
                  <span>Facture</span>
                  <span>{selected.invoice_number}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Reste à payer</span>

                  <span className="font-semibold">
                    {money(
                      selected.balance_due,
                      selected.currency
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Montant encaissé</Label>

                <Input
                  type="number"
                  min="1"
                  max={selected.balance_due}
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Mode d'encaissement</Label>

                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
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
                <Label>Référence externe</Label>

                <Input
                  placeholder="Optionnel"
                  value={reference}
                  onChange={(event) =>
                    setReference(event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>

                <Textarea
                  placeholder="Informations complémentaires..."
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closePayment}
              disabled={payment.isPending}
            >
              Annuler
            </Button>

            <Button
              onClick={submitPayment}
              disabled={payment.isPending}
              className="gap-2"
            >
              <Banknote className="h-4 w-4" />

              {payment.isPending
                ? "Encaissement..."
                : "Valider l'encaissement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}