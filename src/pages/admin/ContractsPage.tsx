import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  FileText,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { toast } from "sonner";

import PageShell from "@/components/PageShell";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";

import {
  useCreateLease,
  useDeleteLease,
  useLeases,
  useUpdateLease,
} from "@/hooks/use-leases";

import {
  useProperties,
} from "@/hooks/use-properties";

import {
  useTenants,
} from "@/hooks/use-tenants";

import {
  useOwners,
} from "@/hooks/use-owners";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusLabels: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "En attente",
    className:
      "bg-warning/15 text-warning",
  },

  active: {
    label: "Actif",
    className:
      "bg-success/15 text-success",
  },

  expired: {
    label: "Expiré",
    className:
      "bg-muted text-muted-foreground",
  },

  terminated: {
    label: "Résilié",
    className:
      "bg-destructive/15 text-destructive",
  },
};

const emptyForm = {
  property_id: "",
  tenant_id: "",
  owner_id: "",

  start_date: "",
  end_date: "",

  monthly_rent: 0,
  deposit: 0,
  charges: 0,

  status: "pending",

  periodicity: "monthly",
  due_day: 1,

  contract_kind:
    "long_term",

  reference: "",
  notes: "",
};

const ContractsPage = () => {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const {
    data: leases,
    isLoading,
  } = useLeases();

  const {
    data: properties,
  } = useProperties();

  const {
    data: tenants,
  } = useTenants();

  const {
    data: owners,
  } = useOwners();

  const createLease =
    useCreateLease();

  const updateLease =
    useUpdateLease();

  const deleteLease =
    useDeleteLease();

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

  const selectedProperty =
    useMemo(
      () =>
        (
          properties ??
          []
        ).find(
          (property) =>
            property.id ===
            form.property_id,
        ),
      [
        properties,
        form.property_id,
      ],
    );

  /*
   * ==========================================================
   * PRÉREMPLISSAGE DEPUIS LE LEAD CONVERTI
   * ==========================================================
   */

  useEffect(() => {
    const tenantId =
      searchParams.get(
        "tenant_id",
      );

    const propertyId =
      searchParams.get(
        "property_id",
      );

    if (
      !tenantId ||
      !propertyId
    ) {
      return;
    }

    const property =
      (
        properties ??
        []
      ).find(
        (item) =>
          item.id ===
          propertyId,
      );

    setForm({
      ...emptyForm,

      tenant_id:
        tenantId,

      property_id:
        propertyId,

      owner_id:
        property?.owner_id ??
        "",

      monthly_rent:
        Number(
          property?.price ??
            0,
        ),

      charges:
        Number(
          property?.charges ??
            0,
        ),

      status:
        "pending",
    });

    setOpen(true);
  }, [
    searchParams,
    properties,
  ]);

  /*
   * ==========================================================
   * CHANGEMENT DU BIEN
   * ==========================================================
   */

  const handlePropertyChange =
    (
      propertyId: string,
    ) => {
      const property =
        (
          properties ??
          []
        ).find(
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

          monthly_rent:
            Number(
              property?.price ??
                0,
            ),

          charges:
            Number(
              property?.charges ??
                0,
            ),
        }),
      );
    };

  /*
   * ==========================================================
   * CRÉATION DU BAIL
   * ==========================================================
   */

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
        !form.tenant_id
      ) {
        toast.error(
          "Sélectionnez un locataire.",
        );

        return;
      }

      if (
        !form.start_date
      ) {
        toast.error(
          "La date de début est obligatoire.",
        );

        return;
      }

      if (
        form.monthly_rent <=
        0
      ) {
        toast.error(
          "Le loyer doit être supérieur à zéro.",
        );

        return;
      }

      try {
        await createLease.mutateAsync(
          {
            property_id:
              form.property_id,

            tenant_id:
              form.tenant_id,

            owner_id:
              form.owner_id ||
              null,

            start_date:
              form.start_date,

            end_date:
              form.end_date ||
              null,

            monthly_rent:
              form.monthly_rent,

            deposit:
              form.deposit,

            charges:
              form.charges,

            status:
              "pending",

            periodicity:
              form.periodicity,

            due_day:
              form.due_day,

            contract_kind:
              form.contract_kind,

            reference:
              form.reference ||
              null,

            notes:
              form.notes,
          } as any,
        );

        toast.success(
          "Bail créé en attente",
        );

        setOpen(false);

        setForm(
          emptyForm,
        );

        setSearchParams(
          {},
          {
            replace: true,
          },
        );
      } catch (
        error: any
      ) {
        toast.error(
          error?.message ??
            "Impossible de créer le bail",
        );
      }
    };

  /*
   * ==========================================================
   * MODIFICATION DU STATUT
   * ==========================================================
   */

  const handleStatusChange =
    async (
      lease: any,
      status: string,
    ) => {
      if (
        status ===
          "active" &&
        !lease.owner_id
      ) {
        toast.error(
          "Associez d'abord un propriétaire avant d'activer ce bail.",
        );

        return;
      }

      try {
        await updateLease.mutateAsync(
          {
            id:
              lease.id,

            status,
          } as any,
        );

        if (
          status ===
          "active"
        ) {
          toast.success(
            "Bail activé. Le bien est maintenant marqué Loué.",
          );
        } else {
          toast.success(
            "Statut du bail mis à jour",
          );
        }
      } catch (
        error: any
      ) {
        toast.error(
          error?.message ??
            "Impossible de modifier le bail",
        );
      }
    };

  const closeDialog =
    () => {
      setOpen(false);

      setForm(
        emptyForm,
      );

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

  return (
    <PageShell
      title="Contrats"
      subtitle="Gestion des baux et contrats"
      actions={
        <Button
          onClick={() => {
            setForm(
              emptyForm,
            );

            setOpen(
              true,
            );
          }}
        >
          <Plus className="h-4 w-4" />

          Ajouter
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton
          rows={4}
          columns={7}
        />
      ) : (
        <>
          {(leases ?? [])
            .length ===
          0 ? (
            <EmptyState
              icon={
                FileText
              }
              title="Aucun contrat"
              description="Créez votre premier contrat de bail."
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
                      Locataire
                    </TableHead>

                    <TableHead>
                      Début
                    </TableHead>

                    <TableHead>
                      Fin
                    </TableHead>

                    <TableHead>
                      Loyer
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
                  {(leases ??
                    []).map(
                    (
                      lease: any,
                    ) => {
                      const config =
                        statusLabels[
                          lease
                            .status
                        ] ?? {
                          label:
                            lease.status,

                          className:
                            "",
                        };

                      return (
                        <TableRow
                          key={
                            lease.id
                          }
                          className="group"
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {lease.reference ||
                              "—"}
                          </TableCell>

                          <TableCell className="font-medium text-sm">
                            {lease
                              .property
                              ?.title ??
                              "—"}
                          </TableCell>

                          <TableCell className="text-sm">
                            {lease
                              .tenant
                              ?.full_name ??
                              "—"}
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(
                              lease.start_date,
                            ).toLocaleDateString(
                              "fr-FR",
                            )}
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {lease.end_date
                              ? new Date(
                                  lease.end_date,
                                ).toLocaleDateString(
                                  "fr-FR",
                                )
                              : "—"}
                          </TableCell>

                          <TableCell className="font-semibold text-sm">
                            {Number(
                              lease.monthly_rent,
                            ).toLocaleString(
                              "fr-FR",
                            )}{" "}
                            GNF
                          </TableCell>

                          <TableCell>
                            <Select
                              value={
                                lease.status
                              }
                              onValueChange={(
                                value,
                              ) =>
                                void handleStatusChange(
                                  lease,
                                  value,
                                )
                              }
                              disabled={
                                updateLease.isPending
                              }
                            >
                              <SelectTrigger className="w-[145px] h-8">
                                <SelectValue>
                                  <Badge
                                    className={`${config.className} text-xs border-0`}
                                  >
                                    {
                                      config.label
                                    }
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>

                              <SelectContent>
                                <SelectItem value="pending">
                                  En attente
                                </SelectItem>

                                <SelectItem value="active">
                                  Actif
                                </SelectItem>

                                <SelectItem value="expired">
                                  Expiré
                                </SelectItem>

                                <SelectItem value="terminated">
                                  Résilié
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              onClick={() =>
                                deleteLease.mutate(
                                  lease.id,
                                  {
                                    onSuccess:
                                      () =>
                                        toast.success(
                                          "Contrat supprimé",
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
        </>
      )}

      {/* ===================================================== */}
      {/* FORMULAIRE                                            */}
      {/* ===================================================== */}

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
            <DialogTitle className="font-display">
              Nouveau bail
            </DialogTitle>
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
                    {(properties ??
                      [])
                      .filter(
                        (
                          property,
                        ) =>
                          property.listing_type ===
                          "long_rental",
                      )
                      .map(
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
                  Locataire *
                </Label>

                <Select
                  value={
                    form.tenant_id
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        tenant_id:
                          value,
                      }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>

                  <SelectContent>
                    {(tenants ??
                      []).map(
                      (
                        tenant,
                      ) => (
                        <SelectItem
                          key={
                            tenant.id
                          }
                          value={
                            tenant.id
                          }
                        >
                          {
                            tenant.full_name
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
                  <SelectValue placeholder="Sélectionner" />
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

              {!form.owner_id &&
                selectedProperty && (
                  <div className="flex items-start gap-2 rounded-lg bg-warning/10 text-warning p-3 mt-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />

                    <p className="text-xs">
                      Ce bien n'a pas encore de propriétaire associé. Le bail pourra être créé en attente, mais il ne pourra pas être activé.
                    </p>
                  </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Date de début *
                </Label>

                <Input
                  type="date"
                  value={
                    form.start_date
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        start_date:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Date de fin
                </Label>

                <Input
                  type="date"
                  value={
                    form.end_date
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        end_date:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Loyer mensuel
                </Label>

                <Input
                  type="number"
                  min="0"
                  value={
                    form.monthly_rent
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        monthly_rent:
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
                  Charges
                </Label>

                <Input
                  type="number"
                  min="0"
                  value={
                    form.charges
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        charges:
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
                  Caution
                </Label>

                <Input
                  type="number"
                  min="0"
                  value={
                    form.deposit
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        deposit:
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
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Jour d'échéance
                </Label>

                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={
                    form.due_day
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        due_day:
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
                  placeholder="Ex. BAIL-2026-001"
                />
              </div>
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
                placeholder="Conditions particulières, informations utiles..."
              />
            </div>

            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">
                Le bail sera créé avec le statut <strong>En attente</strong>. Le bien restera <strong>Réservé</strong> jusqu'à l'activation du bail.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
                  createLease.isPending
                }
              >
                {createLease.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}

                Créer le bail
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default ContractsPage;