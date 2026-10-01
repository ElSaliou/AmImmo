import {
  useMemo,
  useState,
} from "react";

import {
  Banknote,
  Building2,
  CircleDollarSign,
  HandCoins,
  Search,
  Users,
  WalletCards,
} from "lucide-react";

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
  OwnerRentBalance,
  useOwnerRentBalances,
  useOwnerRentLedger,
  useOwnerSettlementKpis,
  useOwnerSettlements,
  useOwnerTreasuryAccounts,
  useRecordOwnerSettlement,
} from "@/hooks/use-owner-settlements";


const formatMoney = (
  value: number,
  currency = "GNF"
) =>
  `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} ${currency}`;


const formatDate = (
  value?: string | null
) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
};


export default function OwnerSettlementsPage() {
  const { toast } = useToast();

  const kpis =
    useOwnerSettlementKpis();

  const balances =
    useOwnerRentBalances();

  const ledger =
    useOwnerRentLedger();

  const settlements =
    useOwnerSettlements();

  const treasuryAccounts =
    useOwnerTreasuryAccounts();

  const recordSettlement =
    useRecordOwnerSettlement();


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    selectedOwner,
    setSelectedOwner,
  ] =
    useState<OwnerRentBalance | null>(
      null
    );


  const [
    amount,
    setAmount,
  ] = useState("");


  const [
    treasuryAccountId,
    setTreasuryAccountId,
  ] = useState("");


  const [
    reference,
    setReference,
  ] = useState("");


  const [
    notes,
    setNotes,
  ] = useState("");


  const normalizedSearch =
    search.trim().toLowerCase();


  const ownerRows =
    useMemo(() => {
      return (
        balances.data ?? []
      ).filter((row) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          row.owner_name,
          row.owner_phone,
          row.owner_email,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(
                normalizedSearch
              )
          );
      });
    }, [
      balances.data,
      normalizedSearch,
    ]);


  const ledgerRows =
    useMemo(() => {
      return (
        ledger.data ?? []
      ).filter((row) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          row.owner_name,
          row.property_title,
          row.invoice_number,
          row.payment_reference,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(
                normalizedSearch
              )
          );
      });
    }, [
      ledger.data,
      normalizedSearch,
    ]);


  const settlementRows =
    useMemo(() => {
      return (
        settlements.data ?? []
      ).filter((row) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          row.owner_name,
          row.reference,
          row.treasury_name,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(
                normalizedSearch
              )
          );
      });
    }, [
      settlements.data,
      normalizedSearch,
    ]);


  const openSettlement = (
    owner: OwnerRentBalance
  ) => {
    setSelectedOwner(owner);

    setAmount(
      String(
        owner.balance_to_settle
      )
    );

    setReference("");
    setNotes("");

    setTreasuryAccountId(
      treasuryAccounts.data?.[0]?.id ??
        ""
    );
  };


  const closeSettlement = () => {
    if (
      recordSettlement.isPending
    ) {
      return;
    }

    setSelectedOwner(null);

    setAmount("");

    setTreasuryAccountId("");

    setReference("");

    setNotes("");
  };


  const submitSettlement =
    async () => {
      if (!selectedOwner) {
        return;
      }

      const numericAmount =
        Number(amount);


      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        toast({
          title:
            "Montant invalide",

          description:
            "Le montant du reversement doit être supérieur à zéro.",

          variant:
            "destructive",
        });

        return;
      }


      if (
        numericAmount >
        selectedOwner.balance_to_settle
      ) {
        toast({
          title:
            "Montant trop élevé",

          description:
            `Le maximum à reverser est ${formatMoney(
              selectedOwner.balance_to_settle,
              selectedOwner.currency
            )}.`,

          variant:
            "destructive",
        });

        return;
      }


      if (!treasuryAccountId) {
        toast({
          title:
            "Compte de trésorerie requis",

          description:
            "Sélectionnez le compte utilisé pour le reversement.",

          variant:
            "destructive",
        });

        return;
      }


      try {
        await recordSettlement.mutateAsync({
          ownerId:
            selectedOwner.owner_id,

          amount:
            numericAmount,

          treasuryAccountId,

          reference,

          notes,
        });


        toast({
          title:
            "Reversement enregistré",

          description:
            `${formatMoney(
              numericAmount,
              selectedOwner.currency
            )} reversé à ${selectedOwner.owner_name}.`,
        });


        closeSettlement();

      } catch (error: any) {
        toast({
          title:
            "Reversement impossible",

          description:
            error?.message ??
            "Une erreur est survenue.",

          variant:
            "destructive",
        });
      }
    };


  return (
    <div className="space-y-6">

      {/* ===================================================== */}
      {/* HEADER                                                */}
      {/* ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reversements propriétaires
          </h1>

          <p className="text-sm text-muted-foreground">
            Loyers encaissés, commissions de gestion et montants à reverser.
          </p>
        </div>

      </div>


      {/* ===================================================== */}
      {/* KPI                                                   */}
      {/* ===================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">

            <CardTitle className="text-sm font-medium">
              Loyers encaissés
            </CardTitle>

            <WalletCards className="h-4 w-4 text-muted-foreground" />

          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold">
              {formatMoney(
                kpis.data?.gross_collected ??
                  0
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Encaissements locataires
            </p>

          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">

            <CardTitle className="text-sm font-medium">
              Commissions ImmoPlate
            </CardTitle>

            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />

          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold">
              {formatMoney(
                kpis.data?.commission_amount ??
                  0
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Gestion locative
            </p>

          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">

            <CardTitle className="text-sm font-medium">
              À reverser
            </CardTitle>

            <HandCoins className="h-4 w-4 text-muted-foreground" />

          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold">
              {formatMoney(
                kpis.data?.balance_to_settle ??
                  0
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {kpis.data?.owner_count_to_settle ??
                0}{" "}
              propriétaire(s)
            </p>

          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">

            <CardTitle className="text-sm font-medium">
              Déjà reversé
            </CardTitle>

            <Banknote className="h-4 w-4 text-muted-foreground" />

          </CardHeader>

          <CardContent>

            <div className="text-2xl font-bold">
              {formatMoney(
                kpis.data?.settled_amount ??
                  0
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Paiements propriétaires
            </p>

          </CardContent>
        </Card>

      </div>


      {/* ===================================================== */}
      {/* CONTENT                                               */}
      {/* ===================================================== */}

      <Card>

        <CardHeader>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <CardTitle>
              Gestion des propriétaires
            </CardTitle>


            <div className="relative w-full md:w-80">

              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Propriétaire, bien, facture..."
                className="pl-9"
              />

            </div>

          </div>

        </CardHeader>


        <CardContent>

          <Tabs defaultValue="owners">

            <TabsList>

              <TabsTrigger value="owners">
                À reverser
              </TabsTrigger>

              <TabsTrigger value="collections">
                Encaissements
              </TabsTrigger>

              <TabsTrigger value="settlements">
                Reversements
              </TabsTrigger>

            </TabsList>


            {/* ================================================= */}
            {/* PROPRIETAIRES                                    */}
            {/* ================================================= */}

            <TabsContent
              value="owners"
              className="mt-4"
            >

              <div className="rounded-md border">

                <Table>

                  <TableHeader>

                    <TableRow>

                      <TableHead>
                        Propriétaire
                      </TableHead>

                      <TableHead className="text-right">
                        Encaissé
                      </TableHead>

                      <TableHead className="text-right">
                        Commission
                      </TableHead>

                      <TableHead className="text-right">
                        Net
                      </TableHead>

                      <TableHead className="text-right">
                        Reversé
                      </TableHead>

                      <TableHead className="text-right">
                        À reverser
                      </TableHead>

                      <TableHead className="text-right">
                        Action
                      </TableHead>

                    </TableRow>

                  </TableHeader>


                  <TableBody>

                    {ownerRows.length === 0 ? (

                      <TableRow>

                        <TableCell
                          colSpan={7}
                          className="h-28 text-center text-muted-foreground"
                        >
                          Aucun montant à reverser.
                        </TableCell>

                      </TableRow>

                    ) : (

                      ownerRows.map(
                        (row) => (

                          <TableRow
                            key={row.owner_id}
                          >

                            <TableCell>

                              <div className="font-medium">
                                {row.owner_name}
                              </div>

                              <div className="text-xs text-muted-foreground">
                                {row.owner_phone ??
                                  row.owner_email ??
                                  "—"}
                              </div>

                            </TableCell>


                            <TableCell className="text-right">
                              {formatMoney(
                                row.gross_collected,
                                row.currency
                              )}
                            </TableCell>


                            <TableCell className="text-right">
                              {formatMoney(
                                row.commission_amount,
                                row.currency
                              )}
                            </TableCell>


                            <TableCell className="text-right">
                              {formatMoney(
                                row.net_owner_amount,
                                row.currency
                              )}
                            </TableCell>


                            <TableCell className="text-right">
                              {formatMoney(
                                row.settled_amount,
                                row.currency
                              )}
                            </TableCell>


                            <TableCell className="text-right font-semibold">
                              {formatMoney(
                                row.balance_to_settle,
                                row.currency
                              )}
                            </TableCell>


                            <TableCell className="text-right">

                              <Button
                                size="sm"
                                disabled={
                                  row.balance_to_settle <=
                                  0
                                }
                                onClick={() =>
                                  openSettlement(
                                    row
                                  )
                                }
                              >
                                Reverser
                              </Button>

                            </TableCell>

                          </TableRow>

                        )
                      )

                    )}

                  </TableBody>

                </Table>

              </div>

            </TabsContent>


            {/* ================================================= */}
            {/* ENCAISSEMENTS                                    */}
            {/* ================================================= */}

            <TabsContent
              value="collections"
              className="mt-4"
            >

              <div className="rounded-md border">

                <Table>

                  <TableHeader>

                    <TableRow>

                      <TableHead>
                        Propriétaire
                      </TableHead>

                      <TableHead>
                        Bien
                      </TableHead>

                      <TableHead>
                        Facture
                      </TableHead>

                      <TableHead>
                        Date
                      </TableHead>

                      <TableHead className="text-right">
                        Encaissé
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

                    {ledgerRows.length === 0 ? (

                      <TableRow>

                        <TableCell
                          colSpan={8}
                          className="h-28 text-center text-muted-foreground"
                        >
                          Aucun encaissement locataire.
                        </TableCell>

                      </TableRow>

                    ) : (

                      ledgerRows.map(
                        (row) => (

                          <TableRow
                            key={row.ledger_id}
                          >

                            <TableCell className="font-medium">
                              {row.owner_name}
                            </TableCell>


                            <TableCell>
                              {row.property_title ??
                                "—"}
                            </TableCell>


                            <TableCell>
                              {row.invoice_number}
                            </TableCell>


                            <TableCell>
                              {formatDate(
                                row.collected_at
                              )}
                            </TableCell>


                            <TableCell className="text-right">
                              {formatMoney(
                                row.gross_collected,
                                row.currency
                              )}
                            </TableCell>


                            <TableCell className="text-right">

                              <div>
                                {formatMoney(
                                  row.commission_amount,
                                  row.currency
                                )}
                              </div>

                              <div className="text-xs text-muted-foreground">
                                {row.commission_rate} %
                              </div>

                            </TableCell>


                            <TableCell className="text-right">
                              {formatMoney(
                                row.net_owner_amount,
                                row.currency
                              )}
                            </TableCell>


                            <TableCell className="text-right">

                              <div className="font-medium">
                                {formatMoney(
                                  row.balance_to_settle,
                                  row.currency
                                )}
                              </div>

                              {row.settlement_status ===
                              "settled" ? (

                                <Badge variant="outline">
                                  Reversé
                                </Badge>

                              ) : row.settlement_status ===
                                "partially_settled" ? (

                                <Badge variant="secondary">
                                  Partiel
                                </Badge>

                              ) : (

                                <Badge variant="secondary">
                                  À reverser
                                </Badge>

                              )}

                            </TableCell>

                          </TableRow>

                        )
                      )

                    )}

                  </TableBody>

                </Table>

              </div>

            </TabsContent>


            {/* ================================================= */}
            {/* REVERSEMENTS                                     */}
            {/* ================================================= */}

            <TabsContent
              value="settlements"
              className="mt-4"
            >

              <div className="rounded-md border">

                <Table>

                  <TableHeader>

                    <TableRow>

                      <TableHead>
                        Référence
                      </TableHead>

                      <TableHead>
                        Propriétaire
                      </TableHead>

                      <TableHead>
                        Date
                      </TableHead>

                      <TableHead>
                        Trésorerie
                      </TableHead>

                      <TableHead className="text-right">
                        Montant
                      </TableHead>

                      <TableHead>
                        Statut
                      </TableHead>

                    </TableRow>

                  </TableHeader>


                  <TableBody>

                    {settlementRows.length ===
                    0 ? (

                      <TableRow>

                        <TableCell
                          colSpan={6}
                          className="h-28 text-center text-muted-foreground"
                        >
                          Aucun reversement enregistré.
                        </TableCell>

                      </TableRow>

                    ) : (

                      settlementRows.map(
                        (row) => (

                          <TableRow
                            key={
                              row.settlement_id
                            }
                          >

                            <TableCell className="font-medium">
                              {row.reference}
                            </TableCell>


                            <TableCell>
                              {row.owner_name}
                            </TableCell>


                            <TableCell>
                              {formatDate(
                                row.settlement_date
                              )}
                            </TableCell>


                            <TableCell>
                              {row.treasury_name ??
                                row.treasury_code ??
                                "—"}
                            </TableCell>


                            <TableCell className="text-right font-medium">
                              {formatMoney(
                                row.amount,
                                row.currency
                              )}
                            </TableCell>


                            <TableCell>
                              <Badge variant="outline">
                                Effectué
                              </Badge>
                            </TableCell>

                          </TableRow>

                        )
                      )

                    )}

                  </TableBody>

                </Table>

              </div>

            </TabsContent>

          </Tabs>

        </CardContent>

      </Card>


      {/* ===================================================== */}
      {/* DIALOG REVERSEMENT                                   */}
      {/* ===================================================== */}

      <Dialog
        open={Boolean(selectedOwner)}
        onOpenChange={(open) => {
          if (!open) {
            closeSettlement();
          }
        }}
      >

        <DialogContent className="sm:max-w-lg">

          <DialogHeader>

            <DialogTitle>
              Reversement propriétaire
            </DialogTitle>

            <DialogDescription>
              Le reversement mettra automatiquement à jour le compte propriétaire, la trésorerie et la comptabilité.
            </DialogDescription>

          </DialogHeader>


          {selectedOwner && (

            <div className="space-y-5">

              <div className="rounded-lg border bg-muted/30 p-4">

                <div className="flex items-center gap-2">

                  <Building2 className="h-4 w-4" />

                  <div className="font-medium">
                    {selectedOwner.owner_name}
                  </div>

                </div>


                <div className="mt-4 flex justify-between text-sm">

                  <span>
                    Loyers encaissés
                  </span>

                  <span>
                    {formatMoney(
                      selectedOwner.gross_collected,
                      selectedOwner.currency
                    )}
                  </span>

                </div>


                <div className="flex justify-between text-sm">

                  <span>
                    Commission ImmoPlate
                  </span>

                  <span>
                    {formatMoney(
                      selectedOwner.commission_amount,
                      selectedOwner.currency
                    )}
                  </span>

                </div>


                <div className="mt-2 flex justify-between border-t pt-2 text-sm">

                  <span className="font-medium">
                    Disponible à reverser
                  </span>

                  <span className="font-semibold">
                    {formatMoney(
                      selectedOwner.balance_to_settle,
                      selectedOwner.currency
                    )}
                  </span>

                </div>

              </div>


              <div className="space-y-2">

                <Label>
                  Montant à reverser
                </Label>

                <Input
                  type="number"
                  min="1"
                  max={
                    selectedOwner.balance_to_settle
                  }
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                />

              </div>


              <div className="space-y-2">

                <Label>
                  Compte de paiement
                </Label>

                <Select
                  value={
                    treasuryAccountId
                  }
                  onValueChange={
                    setTreasuryAccountId
                  }
                >

                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un compte" />
                  </SelectTrigger>


                  <SelectContent>

                    {(
                      treasuryAccounts.data ??
                      []
                    ).map(
                      (account) => (

                        <SelectItem
                          key={account.id}
                          value={account.id}
                        >
                          {account.name}
                          {" — "}
                          {account.currency}
                        </SelectItem>

                      )
                    )}

                  </SelectContent>

                </Select>

              </div>


              <div className="space-y-2">

                <Label>
                  Référence externe
                </Label>

                <Input
                  placeholder="Optionnel"
                  value={reference}
                  onChange={(event) =>
                    setReference(
                      event.target.value
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
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>

          )}


          <DialogFooter>

            <Button
              variant="outline"
              onClick={
                closeSettlement
              }
              disabled={
                recordSettlement.isPending
              }
            >
              Annuler
            </Button>


            <Button
              onClick={
                submitSettlement
              }
              disabled={
                recordSettlement.isPending
              }
              className="gap-2"
            >

              <Banknote className="h-4 w-4" />

              {recordSettlement.isPending
                ? "Reversement..."
                : "Valider le reversement"}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>
  );
}