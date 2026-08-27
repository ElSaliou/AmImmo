import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  BadgeCheck,
  FileSignature,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

import PageShell from "@/components/PageShell";
import EmptyState from "@/components/admin/EmptyState";
import TableSkeleton from "@/components/admin/TableSkeleton";

import {
  useBuyers,
  useCreateSaleTransaction,
  useDeleteSaleTransaction,
  useSalesTransactions,
  useUpdateSaleTransaction,
} from "@/hooks/use-sales";

import {
  useProperties,
} from "@/hooks/use-properties";

import {
  useOwners,
} from "@/hooks/use-owners";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const statusConfig = {
  draft: {
    label: "Brouillon",
    className:
      "bg-muted text-muted-foreground",
  },

  reserved: {
    label: "Réservée",
    className:
      "bg-warning/15 text-warning",
  },

  completed: {
    label: "Finalisée",
    className:
      "bg-success/15 text-success",
  },

  cancelled: {
    label: "Annulée",
    className:
      "bg-destructive/15 text-destructive",
  },
};

const emptyForm = {
  property_id: "",
  buyer_id: "",
  lead_id: "",
  owner_id: "",

  sale_price: 0,
  currency: "GNF",

  reference: "",
  reservation_date: "",
  agreement_date: "",
  payment_method: "",
  notes: "",
};

const SalesPage = () => {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const {
    data: sales,
    isLoading,
  } =
    useSalesTransactions();

  const {
    data: buyers,
  } = useBuyers();

  const {
    data: properties,
  } = useProperties();

  const {
    data: owners,
  } = useOwners();

  const createSale =
    useCreateSaleTransaction();

  const updateSale =
    useUpdateSaleTransaction();

  const deleteSale =
    useDeleteSaleTransaction();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState(
    "__all__",
  );

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState(
    emptyForm,
  );

  const saleProperties =
    useMemo(
      () =>
        (
          properties ??
          []
        ).filter(
          (property) =>
            property.listing_type ===
            "sale",
        ),
      [properties],
    );

  const filtered =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      return (
        sales ?? []
      ).filter(
        (sale) => {
          if (
            status !==
              "__all__" &&
            sale.status !==
              status
          ) {
            return false;
          }

          if (!q) {
            return true;
          }

          return [
            sale.reference,
            sale.property
              ?.title,
            sale.buyer
              ?.full_name,
            sale.owner
              ?.full_name,
          ]
            .filter(Boolean)
            .some(
              (value) =>
                String(
                  value,
                )
                  .toLowerCase()
                  .includes(
                    q,
                  ),
            );
        },
      );
    }, [
      sales,
      search,
      status,
    ]);

  /*
   * Préremplissage depuis le CRM :
   *
   * /admin/sales?
   * buyer_id=...
   * property_id=...
   * lead_id=...
   */
  useEffect(() => {
    const buyerId =
      searchParams.get(
        "buyer_id",
      );

    const propertyId =
      searchParams.get(
        "property_id",
      );

    const leadId =
      searchParams.get(
        "lead_id",
      );

    if (
      !buyerId ||
      !propertyId
    ) {
      return;
    }

    const property =
      saleProperties.find(
        (item) =>
          item.id ===
          propertyId,
      );

    setForm({
      ...emptyForm,

      buyer_id:
        buyerId,

      property_id:
        propertyId,

      lead_id:
        leadId ?? "",

      owner_id:
        property?.owner_id ??
        "",

      sale_price:
        Number(
          property?.price ??
            0,
        ),

      currency:
        property?.currency ??
        "GNF",
    });

    setOpen(true);
  }, [
    searchParams,
    saleProperties,
  ]);

  const handlePropertyChange =
    (
      propertyId: string,
    ) => {
      const property =
        saleProperties.find(
          (item) =>
            item.id ===
            propertyId,
        );

      setForm(
        (previous) => ({
          ...previous,

          property_id:
            propertyId,

          owner_id:
            property?.owner_id ??
            "",

          sale_price:
            Number(
              property?.price ??
                0,
            ),

          currency:
            property?.currency ??
            "GNF",
        }),
      );
    };

  const closeDialog = () => {
    if (
      createSale.isPending
    ) {
      return;
    }

    setOpen(false);
    setForm(emptyForm);

    if (
      searchParams.size >
      0
    ) {
      setSearchParams(
        {},
        {
          replace: true,
        },
      );
    }
  };

  const handleSubmit =
    async (
      event: React.FormEvent,
    ) => {
      event.preventDefault();

      if (
        !form.property_id
      ) {
        toast.error(
          "Sélectionnez un bien.",
        );
        return;
      }

      if (
        !form.buyer_id
      ) {
        toast.error(
          "Sélectionnez un acquéreur.",
        );
        return;
      }

      if (
        form.sale_price <=
        0
      ) {
        toast.error(
          "Le prix de vente doit être supérieur à zéro.",
        );
        return;
      }

      try {
        await createSale.mutateAsync(
          {
            property_id:
              form.property_id,

            buyer_id:
              form.buyer_id,

            lead_id:
              form.lead_id ||
              null,

            owner_id:
              form.owner_id ||
              null,

            sale_price:
              form.sale_price,

            currency:
              form.currency,

            reference:
              form.reference ||
              null,

            reservation_date:
              form.reservation_date ||
              null,

            agreement_date:
              form.agreement_date ||
              null,

            payment_method:
              form.payment_method ||
              null,

            notes:
              form.notes,

            status:
              "draft",
          },
        );

        toast.success(
          "Transaction de vente créée",
        );

        closeDialog();
      } catch (
        error: any
      ) {
        toast.error(
          error?.message ??
            "Impossible de créer la transaction",
        );
      }
    };

  const handleStatusChange =
    async (
      sale: any,
      nextStatus: string,
    ) => {
      if (
        nextStatus ===
          "completed" &&
        !sale.owner_id
      ) {
        toast.error(
          "Associez un propriétaire avant de finaliser la vente.",
        );
        return;
      }

      try {
        await updateSale.mutateAsync(
          {
            id:
              sale.id,

            status:
              nextStatus,
          },
        );

        if (
          nextStatus ===
          "reserved"
        ) {
          toast.success(
            "Transaction réservée. Le bien reste marqué Réservé.",
          );
        } else if (
          nextStatus ===
          "completed"
        ) {
          toast.success(
            "Vente finalisée. Le bien est maintenant marqué Vendu.",
          );
        } else if (
          nextStatus ===
          "cancelled"
        ) {
          toast.success(
            "Transaction annulée. Le bien reste à traiter manuellement.",
          );
        } else {
          toast.success(
            "Statut mis à jour",
          );
        }
      } catch (
        error: any
      ) {
        toast.error(
          error?.message ??
            "Impossible de modifier la transaction",
        );
      }
    };

  return (
    <PageShell
      title="Ventes"
      subtitle="Gestion des transactions immobilières"
      actions={
        <Button
          variant="premium"
          onClick={() => {
            setForm(
              emptyForm,
            );
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />

          Nouvelle vente
        </Button>
      }
    >
      <div className="premium-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

            <Input
              className="pl-9"
              placeholder="Référence, bien, acquéreur..."
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event
                    .target
                    .value,
                )
              }
            />
          </div>

          <Select
            value={
              status
            }
            onValueChange={
              setStatus
            }
          >
            <SelectTrigger className="md:w-44">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__all__">
                Tous les statuts
              </SelectItem>

              <SelectItem value="draft">
                Brouillon
              </SelectItem>

              <SelectItem value="reserved">
                Réservée
              </SelectItem>

              <SelectItem value="completed">
                Finalisée
              </SelectItem>

              <SelectItem value="cancelled">
                Annulée
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton
          rows={5}
          columns={7}
        />
      ) : filtered.length ===
        0 ? (
        <EmptyState
          icon={
            FileSignature
          }
          title="Aucune vente"
          description="Créez votre première transaction de vente."
        />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>
                  Référence
                </TableHead>

                <TableHead>
                  Bien
                </TableHead>

                <TableHead>
                  Acquéreur
                </TableHead>

                <TableHead>
                  Propriétaire
                </TableHead>

                <TableHead>
                  Prix
                </TableHead>

                <TableHead>
                  Statut
                </TableHead>

                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map(
                (sale) => {
                  const config =
                    statusConfig[
                      sale.status
                    ];

                  return (
                    <TableRow
                      key={
                        sale.id
                      }
                      className="group"
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {sale.reference ||
                          "—"}
                      </TableCell>

                      <TableCell className="font-medium text-sm">
                        {sale.property
                          ?.title ??
                          "—"}
                      </TableCell>

                      <TableCell className="text-sm">
                        {sale.buyer
                          ?.full_name ??
                          "—"}
                      </TableCell>

                      <TableCell className="text-sm">
                        {sale.owner
                          ?.full_name ??
                          "—"}
                      </TableCell>

                      <TableCell className="font-semibold text-sm">
                        {Number(
                          sale.sale_price,
                        ).toLocaleString(
                          "fr-FR",
                        )}{" "}
                        {
                          sale.currency
                        }
                      </TableCell>

                      <TableCell>
                        <Select
                          value={
                            sale.status
                          }
                          onValueChange={(
                            value,
                          ) =>
                            void handleStatusChange(
                              sale,
                              value,
                            )
                          }
                          disabled={
                            updateSale.isPending ||
                            sale.status ===
                              "completed"
                          }
                        >
                          <SelectTrigger className="w-[145px] h-8">
                            <SelectValue>
                              <Badge
                                className={`${config.className} border-0 text-xs`}
                              >
                                {
                                  config.label
                                }
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="draft">
                              Brouillon
                            </SelectItem>

                            <SelectItem value="reserved">
                              Réservée
                            </SelectItem>

                            <SelectItem value="completed">
                              Finalisée
                            </SelectItem>

                            <SelectItem value="cancelled">
                              Annulée
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          disabled={
                            sale.status ===
                            "completed"
                          }
                          onClick={() =>
                            deleteSale.mutate(
                              sale.id,
                              {
                                onSuccess:
                                  () =>
                                    toast.success(
                                      "Transaction supprimée",
                                    ),
                              },
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                },
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(
          value,
        ) => {
          if (!value) {
            closeDialog();
          } else {
            setOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nouvelle transaction de vente
            </DialogTitle>

            <DialogDescription>
              Le dossier sera créé en brouillon avant réservation ou finalisation.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Bien *
                </Label>

                <Select
                  value={
                    form.property_id
                  }
                  onValueChange={
                    handlePropertyChange
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>

                  <SelectContent>
                    {saleProperties.map(
                      (
                        property,
                      ) => (
                        <SelectItem
                          key={
                            property.id
                          }
                          value={
                            property.id
                          }
                        >
                          {
                            property.title
                          }
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Acquéreur *
                </Label>

                <Select
                  value={
                    form.buyer_id
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        buyer_id:
                          value,
                      }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>

                  <SelectContent>
                    {(buyers ??
                      []).map(
                      (
                        buyer,
                      ) => (
                        <SelectItem
                          key={
                            buyer.id
                          }
                          value={
                            buyer.id
                          }
                        >
                          {
                            buyer.full_name
                          }
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Propriétaire
              </Label>

              <Select
                value={
                  form.owner_id ||
                  "__none__"
                }
                onValueChange={(
                  value,
                ) =>
                  setForm(
                    (
                      previous,
                    ) => ({
                      ...previous,

                      owner_id:
                        value ===
                        "__none__"
                          ? ""
                          : value,
                    }),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="__none__">
                    Aucun propriétaire
                  </SelectItem>

                  {(owners ??
                    []).map(
                    (
                      owner,
                    ) => (
                      <SelectItem
                        key={
                          owner.id
                        }
                        value={
                          owner.id
                        }
                      >
                        {
                          owner.full_name
                        }
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>

              {!form.owner_id && (
                <p className="text-xs text-warning">
                  La vente pourra être préparée, mais pas finalisée sans propriétaire.
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Prix de vente
                </Label>

                <Input
                  type="number"
                  min="0"
                  value={
                    form.sale_price
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        sale_price:
                          Number(
                            event
                              .target
                              .value,
                          ),
                      }),
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Devise
                </Label>

                <Input
                  value={
                    form.currency
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        currency:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Date réservation
                </Label>

                <Input
                  type="date"
                  value={
                    form.reservation_date
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        reservation_date:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Date d'accord
                </Label>

                <Input
                  type="date"
                  value={
                    form.agreement_date
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        agreement_date:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Référence
              </Label>

              <Input
                value={
                  form.reference
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      previous,
                    ) => ({
                      ...previous,
                      reference:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                placeholder="Ex. VTE-2026-001"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Mode de paiement
              </Label>

              <Input
                value={
                  form.payment_method
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      previous,
                    ) => ({
                      ...previous,

                      payment_method:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                placeholder="Virement, chèque, financement..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Notes
              </Label>

              <Textarea
                rows={3}
                value={
                  form.notes
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      previous,
                    ) => ({
                      ...previous,
                      notes:
                        event
                          .target
                          .value,
                    }),
                  )
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={
                  closeDialog
                }
              >
                Annuler
              </Button>

              <Button
                type="submit"
                disabled={
                  createSale.isPending
                }
              >
                {createSale.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}

                Créer la transaction
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default SalesPage;
