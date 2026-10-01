import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  Eye,
  FileSignature,
  History,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Search,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  toast,
} from "sonner";

import PageShell from "@/components/PageShell";
import EmptyState from "@/components/admin/EmptyState";
import TableSkeleton from "@/components/admin/TableSkeleton";

import {
  useBuyers,
  useCreateSale,
  useDeleteSale,
  useSale,
  useSales,
  useSaleStatusHistory,
  useUpdateSale,
  type Sale,
  type SaleStatus,
} from "@/hooks/use-sales";

import {
  useRecordSaleCommissionPayment,
  useSaleCommission,
  useSaleCommissionPayments,
} from "@/hooks/use-sale-finance";

import {
  useProperties,
} from "@/hooks/use-properties";

import {
  useOwners,
} from "@/hooks/use-owners";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

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

// ============================================================
// STATUTS
// ============================================================

const statusConfig: Record<
  SaleStatus,
  {
    label: string;
    className: string;
  }
> = {
  prospect: {
    label: "Prospect",
    className:
      "bg-muted text-muted-foreground",
  },

  visit: {
    label: "Visite",
    className:
      "bg-info/15 text-info",
  },

  offer: {
    label: "Offre",
    className:
      "bg-blue-500/15 text-blue-600",
  },

  negotiation: {
    label: "Négociation",
    className:
      "bg-warning/15 text-warning",
  },

  reservation: {
    label: "Réservée",
    className:
      "bg-orange-500/15 text-orange-600",
  },

  sold: {
    label: "Vendue",
    className:
      "bg-success/15 text-success",
  },

  closed: {
    label: "Clôturée",
    className:
      "bg-success/15 text-success",
  },

  cancelled: {
    label: "Annulée",
    className:
      "bg-destructive/15 text-destructive",
  },
};

const SALE_STATUS_ENTRIES =
  Object.entries(
    statusConfig,
  ) as [
    SaleStatus,
    (typeof statusConfig)[SaleStatus],
  ][];

// ============================================================
// TRANSITIONS AUTORISEES
// ============================================================

const ALLOWED_SALE_TRANSITIONS: Record<
  SaleStatus,
  SaleStatus[]
> = {
  prospect: [
    "prospect",
    "visit",
    "offer",
    "negotiation",
    "reservation",
    "cancelled",
  ],

  visit: [
    "visit",
    "offer",
    "negotiation",
    "reservation",
    "cancelled",
  ],

  offer: [
    "offer",
    "negotiation",
    "reservation",
    "cancelled",
  ],

  negotiation: [
    "negotiation",
    "reservation",
    "cancelled",
  ],

  reservation: [
    "reservation",
    "sold",
    "cancelled",
  ],

  // Vendue peut uniquement évoluer vers Clôturée.
  // La clôture est autorisée seulement si la commission est payée.
  sold: [
    "sold",
    "closed",
  ],

  closed: [
    "closed",
  ],

  cancelled: [
    "cancelled",
  ],
};

const getAllowedSaleStatuses = (
  current: SaleStatus,
) =>
  SALE_STATUS_ENTRIES.filter(
    ([value]) =>
      ALLOWED_SALE_TRANSITIONS[
        current
      ].includes(value),
  );

const isSaleStatusLocked = (
  status: SaleStatus,
) =>
  status === "closed" ||
  status === "cancelled";

const isSaleReadOnly = (
  status: SaleStatus,
) =>
  status === "sold" ||
  status === "closed" ||
  status === "cancelled";

// ============================================================
// HELPERS
// ============================================================

const formatAmount = (
  amount:
    number |
    null |
    undefined,
  currency = "GNF",
) =>
  `${Number(
    amount ?? 0,
  ).toLocaleString(
    "fr-FR",
  )} ${currency}`;

const formatDateTime = (
  value:
    string |
    null |
    undefined,
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "fr-FR",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    },
  );
};

const getSaleLockMessage = (
  status: SaleStatus,
) => {
  if (
    status === "closed"
  ) {
    return "Cette vente est clôturée. Elle ne peut plus changer de statut.";
  }

  if (
    status === "cancelled"
  ) {
    return "Cette vente est annulée. Créez une nouvelle transaction pour reprendre le processus commercial.";
  }

  if (
    status === "sold"
  ) {
    return "La vente est finalisée. Les données commerciales sont verrouillées. La clôture administrative sera autorisée lorsque la commission sera entièrement encaissée.";
  }

  return "";
};

// ============================================================
// FORMULAIRE CREATION
// ============================================================

const emptyForm = {
  property_id: "",
  buyer_id: "",
  lead_id: "",
  owner_id: "",

  reference: "",

  asking_price: 0,
  offered_price: 0,
  agreed_price: 0,

  commission_rate: 0,
  commission_amount: 0,

  currency: "GNF",

  notes: "",
};

// ============================================================
// FORMULAIRE EDITION
// ============================================================

type EditSaleForm = {
  buyer_id: string;
  owner_id: string;

  asking_price: number;
  offered_price: number;
  agreed_price: number;

  commission_rate: number;
  commission_amount: number;

  notes: string;
};

const emptyEditForm:
  EditSaleForm = {
  buyer_id: "",
  owner_id: "",

  asking_price: 0,
  offered_price: 0,
  agreed_price: 0,

  commission_rate: 0,
  commission_amount: 0,

  notes: "",
};

// ============================================================
// FORMULAIRE PAIEMENT
// ============================================================

const emptyPaymentForm = {
  amount: 0,
  payment_method: "",
  reference: "",
  notes: "",
};

// ============================================================
// PAGE
// ============================================================

const SalesPage =
  () => {
    const [
      searchParams,
      setSearchParams,
    ] =
      useSearchParams();

    // ========================================================
    // DATA
    // ========================================================

    const {
      data: sales,
      isLoading,
    } =
      useSales();

    const {
      data: buyers,
    } =
      useBuyers();

    const {
      data: properties,
    } =
      useProperties();

    const {
      data: owners,
    } =
      useOwners();

    const createSale =
      useCreateSale();

    const updateSale =
      useUpdateSale();

    const deleteSale =
      useDeleteSale();

    // ========================================================
    // FILTRES
    // ========================================================

    const [
      search,
      setSearch,
    ] =
      useState("");

    const [
      status,
      setStatus,
    ] =
      useState(
        "__all__",
      );

    // ========================================================
    // CREATION
    // ========================================================

    const [
      createOpen,
      setCreateOpen,
    ] =
      useState(false);

    const [
      form,
      setForm,
    ] =
      useState(
        emptyForm,
      );

    // ========================================================
    // DETAIL
    // ========================================================

    const [
      detailOpen,
      setDetailOpen,
    ] =
      useState(false);

    const [
      selectedSaleId,
      setSelectedSaleId,
    ] =
      useState<
        string | null
      >(null);

    const [
      editMode,
      setEditMode,
    ] =
      useState(false);

    const [
      editForm,
      setEditForm,
    ] =
      useState<EditSaleForm>(
        emptyEditForm,
      );

    const {
      data:
        selectedSale,
      isLoading:
        detailLoading,
    } =
      useSale(
        selectedSaleId,
      );

    const {
      data: history,
      isLoading:
        historyLoading,
    } =
      useSaleStatusHistory(
        selectedSaleId,
      );

    // ========================================================
    // FINANCE
    // ========================================================

    const {
      data:
        saleCommission,
      isLoading:
        commissionLoading,
    } =
      useSaleCommission(
        selectedSaleId,
      );

    const {
      data:
        commissionPayments,
      isLoading:
        paymentsLoading,
    } =
      useSaleCommissionPayments(
        selectedSaleId,
      );

    const recordCommissionPayment =
      useRecordSaleCommissionPayment();

    const [
      paymentOpen,
      setPaymentOpen,
    ] =
      useState(false);

    const [
      paymentForm,
      setPaymentForm,
    ] =
      useState(
        emptyPaymentForm,
      );

    // ========================================================
    // REGLES FINANCIERES
    // ========================================================

    const commissionIsPaid =
      saleCommission?.status ===
        "paid" &&
      Number(
        saleCommission.balance_due,
      ) <= 0;

    const selectedSaleCanClose =
      selectedSale?.status ===
        "sold" &&
      commissionIsPaid;

    // ========================================================
    // BIENS EN VENTE
    // ========================================================

    const saleProperties =
      useMemo(
        () =>
          (
            properties ?? []
          ).filter(
            (
              property,
            ) =>
              property.listing_type ===
              "sale",
          ),
        [
          properties,
        ],
      );

    // ========================================================
    // ACQUEREUR DU FORMULAIRE
    // ========================================================

    const selectedBuyer =
      useMemo(
        () =>
          (
            buyers ?? []
          ).find(
            (
              buyer,
            ) =>
              buyer.id ===
              form.buyer_id,
          ),
        [
          buyers,
          form.buyer_id,
        ],
      );

    // ========================================================
    // LISTE FILTREE
    // ========================================================

    const filtered =
      useMemo(() => {
        const q =
          search
            .trim()
            .toLowerCase();

        return (
          sales ?? []
        ).filter(
          (
            sale,
          ) => {
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
              sale.buyer_name,
              sale.owner
                ?.full_name,
            ]
              .filter(Boolean)
              .some(
                (
                  value,
                ) =>
                  String(
                    value,
                  )
                    .toLowerCase()
                    .includes(q),
              );
          },
        );
      }, [
        sales,
        search,
        status,
      ]);

    // ========================================================
    // CRM -> VENTE
    // ========================================================

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
          (
            item,
          ) =>
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

        asking_price:
          Number(
            property?.price ??
              0,
          ),

        currency:
          property?.currency ??
          "GNF",
      });

      setCreateOpen(true);
    }, [
      searchParams,
      saleProperties,
    ]);

    // ========================================================
    // DETAIL -> FORM EDITION
    // ========================================================

    useEffect(() => {
      if (
        !selectedSale
      ) {
        return;
      }

      setEditForm({
        buyer_id:
          selectedSale.buyer_id ??
          "",

        owner_id:
          selectedSale.owner_id ??
          "",

        asking_price:
          Number(
            selectedSale.asking_price ??
              0,
          ),

        offered_price:
          Number(
            selectedSale.offered_price ??
              0,
          ),

        agreed_price:
          Number(
            selectedSale.agreed_price ??
              0,
          ),

        commission_rate:
          Number(
            selectedSale.commission_rate ??
              0,
          ),

        commission_amount:
          Number(
            selectedSale.commission_amount ??
              0,
          ),

        notes:
          selectedSale.notes ??
          "",
      });
    }, [
      selectedSale,
    ]);

    // ========================================================
    // SELECTION BIEN
    // ========================================================

    const handlePropertyChange =
      (
        propertyId:
          string,
      ) => {
        const property =
          saleProperties.find(
            (
              item,
            ) =>
              item.id ===
              propertyId,
          );

        setForm(
          (
            previous,
          ) => ({
            ...previous,

            property_id:
              propertyId,

            owner_id:
              property?.owner_id ??
              "",

            asking_price:
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

    // ========================================================
    // FERMER CREATION
    // ========================================================

    const closeCreateDialog =
      () => {
        if (
          createSale.isPending
        ) {
          return;
        }

        setCreateOpen(false);
        setForm(emptyForm);

        if (
          searchParams.size >
          0
        ) {
          setSearchParams(
            {},
            {
              replace:
                true,
            },
          );
        }
      };

    // ========================================================
    // CREATION VENTE
    // ========================================================

    const handleSubmit =
      async (
        event:
          React.FormEvent,
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
          !form.buyer_id ||
          !selectedBuyer
        ) {
          toast.error(
            "Sélectionnez un acquéreur.",
          );
          return;
        }

        if (
          form.asking_price <=
          0
        ) {
          toast.error(
            "Le prix demandé doit être supérieur à zéro.",
          );
          return;
        }

        if (
          !form.reference.trim()
        ) {
          toast.error(
            "La référence de vente est obligatoire.",
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

              reference:
                form.reference.trim(),

              buyer_name:
                selectedBuyer.full_name,

              buyer_phone:
                selectedBuyer.phone ??
                "",

              buyer_email:
                selectedBuyer.email ??
                "",

              asking_price:
                form.asking_price,

              offered_price:
                form.offered_price,

              agreed_price:
                form.agreed_price,

              commission_rate:
                form.commission_rate,

              commission_amount:
                form.commission_amount,

              currency:
                form.currency,

              status:
                "prospect",

              notes:
                form.notes,
            },
          );

          toast.success(
            "Dossier de vente créé.",
          );

          closeCreateDialog();
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ??
              "Impossible de créer la vente.",
          );
        }
      };

    // ========================================================
    // CHANGEMENT DE STATUT
    // ========================================================

    const handleStatusChange =
      async (
        sale: Sale,
        nextStatus:
          SaleStatus,
      ) => {
        const currentStatus =
          sale.status;

        if (
          nextStatus ===
          currentStatus
        ) {
          return;
        }

        const allowed =
          ALLOWED_SALE_TRANSITIONS[
            currentStatus
          ];

        if (
          !allowed.includes(
            nextStatus,
          )
        ) {
          toast.error(
            `Transition impossible : ${
              statusConfig[
                currentStatus
              ].label
            } → ${
              statusConfig[
                nextStatus
              ].label
            }.`,
          );
          return;
        }

        // ====================================================
        // FINALISATION DE LA VENTE
        // ====================================================

        if (
          nextStatus ===
            "sold" &&
          !sale.buyer_id
        ) {
          toast.error(
            "Associez un acquéreur avant de finaliser la vente.",
          );
          return;
        }

        if (
          nextStatus ===
            "sold" &&
          !sale.owner_id
        ) {
          toast.error(
            "Associez un propriétaire avant de finaliser la vente.",
          );
          return;
        }

        if (
          nextStatus ===
            "sold" &&
          Number(
            sale.agreed_price,
          ) <= 0
        ) {
          toast.error(
            "Renseignez le prix convenu avant de finaliser la vente.",
          );
          return;
        }

        // ====================================================
        // CLOTURE FINANCIERE
        // ====================================================

        if (
          currentStatus ===
            "sold" &&
          nextStatus ===
            "closed" &&
          selectedSaleId ===
            sale.id
        ) {
          if (
            commissionLoading
          ) {
            toast.error(
              "Les informations financières sont encore en cours de chargement.",
            );
            return;
          }

          if (
            !saleCommission
          ) {
            toast.error(
              "Clôture impossible : aucune commission financière n'est associée à cette vente.",
            );
            return;
          }

          if (
            saleCommission.status !==
              "paid" ||
            Number(
              saleCommission.balance_due,
            ) >
              0
          ) {
            toast.error(
              `Clôture impossible : il reste ${formatAmount(
                saleCommission.balance_due,
                saleCommission.currency,
              )} de commission à encaisser.`,
            );
            return;
          }
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
            "reservation"
          ) {
            toast.success(
              "Vente réservée. Le bien est maintenant marqué Réservé.",
            );
          } else if (
            nextStatus ===
            "sold"
          ) {
            toast.success(
              "Vente finalisée. Le bien est maintenant marqué Vendu et la commission est générée.",
            );
          } else if (
            nextStatus ===
            "cancelled"
          ) {
            toast.success(
              "Vente annulée. Le bien passe dans le workflow de réévaluation commerciale.",
            );
          } else if (
            nextStatus ===
            "closed"
          ) {
            toast.success(
              "Vente clôturée. La commission a été entièrement encaissée.",
            );
          } else {
            toast.success(
              "Statut de vente mis à jour.",
            );
          }
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ??
              "Impossible de modifier le statut.",
          );
        }
      };

    // ========================================================
    // OUVRIR DETAIL
    // ========================================================

    const openSaleDetail =
      (
        saleId: string,
      ) => {
        setSelectedSaleId(
          saleId,
        );

        setEditMode(false);
        setPaymentOpen(false);

        setPaymentForm(
          emptyPaymentForm,
        );

        setDetailOpen(true);
      };

    // ========================================================
    // FERMER DETAIL
    // ========================================================

    const closeSaleDetail =
      () => {
        if (
          updateSale.isPending ||
          recordCommissionPayment.isPending
        ) {
          return;
        }

        setDetailOpen(false);

        setSelectedSaleId(
          null,
        );

        setEditMode(false);

        setEditForm(
          emptyEditForm,
        );

        setPaymentOpen(false);

        setPaymentForm(
          emptyPaymentForm,
        );
      };

    // ========================================================
    // ENREGISTRER MODIFICATIONS
    // ========================================================

    const handleSaveSale =
      async () => {
        if (
          !selectedSale
        ) {
          return;
        }

        if (
          isSaleReadOnly(
            selectedSale.status,
          )
        ) {
          toast.error(
            getSaleLockMessage(
              selectedSale.status,
            ),
          );
          return;
        }

        if (
          editForm.asking_price <=
          0
        ) {
          toast.error(
            "Le prix demandé doit être supérieur à zéro.",
          );
          return;
        }

        const buyer =
          (
            buyers ?? []
          ).find(
            (
              item,
            ) =>
              item.id ===
              editForm.buyer_id,
          );

        try {
          await updateSale.mutateAsync(
            {
              id:
                selectedSale.id,

              buyer_id:
                editForm.buyer_id ||
                null,

              owner_id:
                editForm.owner_id ||
                null,

              buyer_name:
                buyer?.full_name ??
                selectedSale.buyer_name,

              buyer_phone:
                buyer?.phone ??
                selectedSale.buyer_phone ??
                "",

              buyer_email:
                buyer?.email ??
                selectedSale.buyer_email ??
                "",

              asking_price:
                editForm.asking_price,

              offered_price:
                editForm.offered_price,

              agreed_price:
                editForm.agreed_price,

              commission_rate:
                editForm.commission_rate,

              commission_amount:
                editForm.commission_amount,

              notes:
                editForm.notes,
            },
          );

          toast.success(
            "Dossier de vente mis à jour.",
          );

          setEditMode(false);
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ??
              "Impossible d'enregistrer les modifications.",
          );
        }
      };

    // ========================================================
    // PAIEMENT COMMISSION
    // ========================================================

    const handleCommissionPayment =
      async () => {
        if (
          !selectedSale ||
          !saleCommission
        ) {
          return;
        }

        const amount =
          Number(
            paymentForm.amount,
          );

        if (
          amount <= 0
        ) {
          toast.error(
            "Le montant doit être supérieur à zéro.",
          );
          return;
        }

        if (
          amount >
          Number(
            saleCommission.balance_due,
          )
        ) {
          toast.error(
            `Le paiement dépasse le solde restant de ${formatAmount(
              saleCommission.balance_due,
              saleCommission.currency,
            )}.`,
          );
          return;
        }

        try {
          const result =
            await recordCommissionPayment.mutateAsync(
              {
                saleId:
                  selectedSale.id,

                amount,

                paymentMethod:
                  paymentForm.payment_method,

                reference:
                  paymentForm.reference,

                notes:
                  paymentForm.notes,
              },
            );

          if (
            result.status ===
            "paid"
          ) {
            toast.success(
              "Commission entièrement encaissée. La vente peut maintenant être clôturée.",
            );
          } else {
            toast.success(
              "Paiement enregistré. La commission est partiellement encaissée.",
            );
          }

          setPaymentForm(
            emptyPaymentForm,
          );

          setPaymentOpen(false);
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ??
              "Impossible d'enregistrer le paiement.",
          );
        }
      };

    // ========================================================
    // PROGRESSION COMMISSION
    // ========================================================

    const commissionProgress =
      saleCommission &&
      Number(
        saleCommission.amount_due,
      ) >
        0
        ? Math.min(
            100,
            Math.round(
              (
                Number(
                  saleCommission.amount_paid,
                ) /
                Number(
                  saleCommission.amount_due,
                )
              ) *
                100,
            ),
          )
        : 0;

    // ========================================================
    // RENDER
    // ========================================================

    return (
      <PageShell
        title="Ventes"
        subtitle="Gestion commerciale et financière des transactions immobilières"
        actions={
          <Button
            variant="premium"
            onClick={() => {
              setForm(
                emptyForm,
              );

              setCreateOpen(
                true,
              );
            }}
          >
            <Plus className="h-4 w-4" />

            Nouvelle vente
          </Button>
        }
      >
        {/* ================================================= */}
        {/* FILTRES                                           */}
        {/* ================================================= */}

        <div className="premium-card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Référence, bien, acquéreur, propriétaire..."
                value={
                  search
                }
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
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
              <SelectTrigger className="md:w-48">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Tous les statuts
                </SelectItem>

                {SALE_STATUS_ENTRIES.map(
                  ([
                    value,
                    config,
                  ]) => (
                    <SelectItem
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {
                        config.label
                      }
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ================================================= */}
        {/* TABLE                                             */}
        {/* ================================================= */}

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
                    Prix
                  </TableHead>

                  <TableHead>
                    Commission
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
                  (
                    sale,
                  ) => {
                    const config =
                      statusConfig[
                        sale.status
                      ];

                    const locked =
                      isSaleStatusLocked(
                        sale.status,
                      );

                    return (
                      <TableRow
                        key={
                          sale.id
                        }
                        className="group"
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {
                            sale.reference
                          }
                        </TableCell>

                        <TableCell className="font-medium text-sm">
                          {sale.property
                            ?.title ??
                            "—"}
                        </TableCell>

                        <TableCell className="text-sm">
                          {sale.buyer
                            ?.full_name ??
                            sale.buyer_name ??
                            "—"}
                        </TableCell>

                        <TableCell className="text-sm">
                          <div>
                            {formatAmount(
                              sale.asking_price,
                              sale.currency,
                            )}
                          </div>

                          {Number(
                            sale.agreed_price,
                          ) >
                            0 && (
                            <div className="text-xs font-semibold text-success">
                              Convenu :{" "}
                              {formatAmount(
                                sale.agreed_price,
                                sale.currency,
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-sm">
                          {Number(
                            sale.commission_amount,
                          ) >
                          0
                            ? formatAmount(
                                sale.commission_amount,
                                sale.currency,
                              )
                            : "—"}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={
                                sale.status
                              }
                              disabled={
                                updateSale.isPending ||
                                locked
                              }
                              onValueChange={(
                                value,
                              ) =>
                                void handleStatusChange(
                                  sale,
                                  value as SaleStatus,
                                )
                              }
                            >
                              <SelectTrigger className="w-[190px] h-8">
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
                                {getAllowedSaleStatuses(
                                  sale.status,
                                ).map(
                                  ([
                                    value,
                                    item,
                                  ]) => {
                                    /*
                                     * IMPORTANT :
                                     * La clôture d'une vente dépend
                                     * de son état financier.
                                     *
                                     * Le tableau général ne charge pas
                                     * la commission de chaque vente.
                                     *
                                     * On impose donc l'ouverture de la
                                     * fiche complète pour clôturer.
                                     */
                                    const closeFromTable =
                                      sale.status ===
                                        "sold" &&
                                      value ===
                                        "closed";

                                    return (
                                      <SelectItem
                                        key={
                                          value
                                        }
                                        value={
                                          value
                                        }
                                        disabled={
                                          closeFromTable
                                        }
                                      >
                                        {
                                          item.label
                                        }

                                        {closeFromTable
                                          ? " — ouvrir la fiche"
                                          : ""}
                                      </SelectItem>
                                    );
                                  },
                                )}
                              </SelectContent>
                            </Select>

                            {locked && (
                              <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Voir / Modifier"
                              onClick={() =>
                                openSaleDetail(
                                  sale.id,
                                )
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              disabled={
                                [
                                  "sold",
                                  "closed",
                                  "cancelled",
                                ].includes(
                                  sale.status,
                                )
                              }
                              title="Supprimer"
                              onClick={() =>
                                deleteSale.mutate(
                                  sale.id,
                                  {
                                    onSuccess:
                                      () =>
                                        toast.success(
                                          "Vente supprimée.",
                                        ),

                                    onError:
                                      (
                                        error: any,
                                      ) =>
                                        toast.error(
                                          error?.message ??
                                            "Impossible de supprimer la vente.",
                                        ),
                                  },
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ================================================= */}
        {/* CREATION                                          */}
        {/* ================================================= */}

        <Dialog
          open={
            createOpen
          }
          onOpenChange={(
            value,
          ) => {
            if (!value) {
              closeCreateDialog();
            } else {
              setCreateOpen(true);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Nouveau dossier de vente
              </DialogTitle>

              <DialogDescription>
                Création d'une transaction immobilière au statut Prospect.
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
                    Le dossier peut être créé, mais la vente ne pourra pas être finalisée sans propriétaire.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>
                  Référence *
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
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Ex. VTE-2026-001"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    Prix demandé
                  </Label>

                  <Input
                    type="number"
                    min="0"
                    value={
                      form.asking_price
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          previous,
                        ) => ({
                          ...previous,

                          asking_price:
                            Number(
                              event.target
                                .value,
                            ),
                        }),
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Offre acquéreur
                  </Label>

                  <Input
                    type="number"
                    min="0"
                    value={
                      form.offered_price
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          previous,
                        ) => ({
                          ...previous,

                          offered_price:
                            Number(
                              event.target
                                .value,
                            ),
                        }),
                      )
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Prix convenu
                  </Label>

                  <Input
                    type="number"
                    min="0"
                    value={
                      form.agreed_price
                    }
                    onChange={(
                      event,
                    ) => {
                      const agreedPrice =
                        Number(
                          event.target
                            .value,
                        );

                      setForm(
                        (
                          previous,
                        ) => ({
                          ...previous,

                          agreed_price:
                            agreedPrice,

                          commission_amount:
                            previous.commission_rate >
                            0
                              ? (
                                  agreedPrice *
                                  previous.commission_rate
                                ) /
                                100
                              : previous.commission_amount,
                        }),
                      );
                    }}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    Commission %
                  </Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.commission_rate
                    }
                    onChange={(
                      event,
                    ) => {
                      const rate =
                        Number(
                          event.target
                            .value,
                        );

                      const base =
                        form.agreed_price >
                        0
                          ? form.agreed_price
                          : form.asking_price;

                      setForm(
                        (
                          previous,
                        ) => ({
                          ...previous,

                          commission_rate:
                            rate,

                          commission_amount:
                            (
                              base *
                              rate
                            ) /
                            100,
                        }),
                      );
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Commission
                  </Label>

                  <Input
                    type="number"
                    min="0"
                    value={
                      form.commission_amount
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          previous,
                        ) => ({
                          ...previous,

                          commission_amount:
                            Number(
                              event.target
                                .value,
                            ),
                        }),
                      )
                    }
                  />
                </div>
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
                          event.target
                            .value,
                      }),
                    )
                  }
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
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Conditions, observations, financement..."
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                La transaction sera créée au statut{" "}
                <strong>
                  Prospect
                </strong>
                .
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    closeCreateDialog
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
                    <BadgeDollarSign className="h-4 w-4" />
                  )}

                  Créer la vente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* DETAIL                                            */}
        {/* ================================================= */}

        <Dialog
          open={
            detailOpen
          }
          onOpenChange={(
            value,
          ) => {
            if (!value) {
              closeSaleDetail();
            } else {
              setDetailOpen(true);
            }
          }}
        >
          <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto">
            {detailLoading ||
            !selectedSale ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <DialogTitle className="flex items-center gap-2">
                        <FileSignature className="h-5 w-5" />

                        Vente{" "}
                        {
                          selectedSale.reference
                        }
                      </DialogTitle>

                      <DialogDescription>
                        Dossier commercial et financier de la transaction.
                      </DialogDescription>
                    </div>

                    <Badge
                      className={`${
                        statusConfig[
                          selectedSale.status
                        ].className
                      } border-0`}
                    >
                      {
                        statusConfig[
                          selectedSale.status
                        ].label
                      }
                    </Badge>
                  </div>
                </DialogHeader>

                {isSaleReadOnly(
                  selectedSale.status,
                ) && (
                  <div className="rounded-lg border bg-muted/40 p-3 flex gap-2 text-sm">
                    <LockKeyhole className="h-4 w-4 shrink-0 mt-0.5" />

                    <div>
                      <p className="font-medium">
                        Données commerciales verrouillées
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {getSaleLockMessage(
                          selectedSale.status,
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* ================================================= */}
                {/* RESUME                                            */}
                {/* ================================================= */}

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Bien
                    </p>

                    <p className="font-medium text-sm mt-1">
                      {selectedSale.property
                        ?.title ??
                        "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Acquéreur
                    </p>

                    <p className="font-medium text-sm mt-1">
                      {selectedSale.buyer
                        ?.full_name ??
                        selectedSale.buyer_name ??
                        "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Propriétaire
                    </p>

                    <p className="font-medium text-sm mt-1">
                      {selectedSale.owner
                        ?.full_name ??
                        "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Création
                    </p>

                    <p className="font-medium text-sm mt-1">
                      {formatDateTime(
                        selectedSale.created_at,
                      )}
                    </p>
                  </div>
                </div>

                {/* ================================================= */}
                {/* STATUT                                            */}
                {/* ================================================= */}

                {!isSaleStatusLocked(
                  selectedSale.status,
                ) && (
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="max-w-sm space-y-1.5">
                      <Label>
                        Statut
                      </Label>

                      <Select
                        value={
                          selectedSale.status
                        }
                        disabled={
                          updateSale.isPending
                        }
                        onValueChange={(
                          value,
                        ) =>
                          void handleStatusChange(
                            selectedSale,
                            value as SaleStatus,
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          {getAllowedSaleStatuses(
                            selectedSale.status,
                          ).map(
                            ([
                              value,
                              item,
                            ]) => {
                              const closeDisabled =
                                selectedSale.status ===
                                  "sold" &&
                                value ===
                                  "closed" &&
                                !selectedSaleCanClose;

                              return (
                                <SelectItem
                                  key={
                                    value
                                  }
                                  value={
                                    value
                                  }
                                  disabled={
                                    closeDisabled
                                  }
                                >
                                  {
                                    item.label
                                  }

                                  {closeDisabled
                                    ? " — commission à encaisser"
                                    : ""}
                                </SelectItem>
                              );
                            },
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSale.status ===
                      "sold" &&
                      commissionLoading && (
                        <p className="text-xs text-muted-foreground">
                          Vérification de la situation financière...
                        </p>
                      )}

                    {selectedSale.status ===
                      "sold" &&
                      !commissionLoading &&
                      !saleCommission && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                          <p className="font-medium text-destructive">
                            Clôture impossible
                          </p>

                          <p className="text-xs text-muted-foreground mt-1">
                            Aucune commission financière n'est associée à cette vente.
                          </p>
                        </div>
                      )}

                    {selectedSale.status ===
                      "sold" &&
                      saleCommission &&
                      !commissionIsPaid && (
                        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
                          <div className="flex gap-2">
                            <LockKeyhole className="h-4 w-4 text-warning shrink-0 mt-0.5" />

                            <div>
                              <p className="font-medium">
                                Clôture bloquée
                              </p>

                              <p className="text-xs text-muted-foreground mt-1">
                                La transaction pourra être clôturée après encaissement complet de la commission.
                              </p>

                              <p className="text-xs font-medium mt-2">
                                Reste à encaisser :{" "}
                                {formatAmount(
                                  saleCommission.balance_due,
                                  saleCommission.currency,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {selectedSale.status ===
                      "sold" &&
                      commissionIsPaid && (
                        <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                          <p className="font-medium text-success">
                            Commission entièrement encaissée
                          </p>

                          <p className="text-xs text-muted-foreground mt-1">
                            Cette vente peut maintenant être clôturée administrativement.
                          </p>
                        </div>
                      )}
                  </div>
                )}

                {/* ================================================= */}
                {/* DONNEES COMMERCIALES                              */}
                {/* ================================================= */}

                <div className="rounded-xl border p-4 space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        Données commerciales
                      </h3>

                      <p className="text-xs text-muted-foreground">
                        Prix, commission et intervenants.
                      </p>
                    </div>

                    {!isSaleReadOnly(
                      selectedSale.status,
                    ) &&
                      !editMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditMode(
                              true,
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />

                          Modifier
                        </Button>
                      )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>
                        Acquéreur
                      </Label>

                      {editMode ? (
                        <Select
                          value={
                            editForm.buyer_id
                          }
                          onValueChange={(
                            value,
                          ) =>
                            setEditForm(
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
                            <SelectValue />
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
                      ) : (
                        <Input
                          disabled
                          value={
                            selectedSale.buyer
                              ?.full_name ??
                            selectedSale.buyer_name ??
                            ""
                          }
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>
                        Propriétaire
                      </Label>

                      {editMode ? (
                        <Select
                          value={
                            editForm.owner_id ||
                            "__none__"
                          }
                          onValueChange={(
                            value,
                          ) =>
                            setEditForm(
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
                      ) : (
                        <Input
                          disabled
                          value={
                            selectedSale.owner
                              ?.full_name ??
                            ""
                          }
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>
                        Prix demandé
                      </Label>

                      <Input
                        type="number"
                        disabled={
                          !editMode
                        }
                        value={
                          editForm.asking_price
                        }
                        onChange={(
                          event,
                        ) =>
                          setEditForm(
                            (
                              previous,
                            ) => ({
                              ...previous,

                              asking_price:
                                Number(
                                  event.target
                                    .value,
                                ),
                            }),
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>
                        Offre acquéreur
                      </Label>

                      <Input
                        type="number"
                        disabled={
                          !editMode
                        }
                        value={
                          editForm.offered_price
                        }
                        onChange={(
                          event,
                        ) =>
                          setEditForm(
                            (
                              previous,
                            ) => ({
                              ...previous,

                              offered_price:
                                Number(
                                  event.target
                                    .value,
                                ),
                            }),
                          )
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>
                        Prix convenu
                      </Label>

                      <Input
                        type="number"
                        disabled={
                          !editMode
                        }
                        value={
                          editForm.agreed_price
                        }
                        onChange={(
                          event,
                        ) => {
                          const agreedPrice =
                            Number(
                              event.target
                                .value,
                            );

                          setEditForm(
                            (
                              previous,
                            ) => ({
                              ...previous,

                              agreed_price:
                                agreedPrice,

                              commission_amount:
                                previous.commission_rate >
                                0
                                  ? (
                                      agreedPrice *
                                      previous.commission_rate
                                    ) /
                                    100
                                  : previous.commission_amount,
                            }),
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>
                        Commission %
                      </Label>

                      <Input
                        type="number"
                        step="0.01"
                        disabled={
                          !editMode
                        }
                        value={
                          editForm.commission_rate
                        }
                        onChange={(
                          event,
                        ) => {
                          const rate =
                            Number(
                              event.target
                                .value,
                            );

                          const base =
                            editForm.agreed_price >
                            0
                              ? editForm.agreed_price
                              : editForm.asking_price;

                          setEditForm(
                            (
                              previous,
                            ) => ({
                              ...previous,

                              commission_rate:
                                rate,

                              commission_amount:
                                (
                                  base *
                                  rate
                                ) /
                                100,
                            }),
                          );
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>
                        Commission
                      </Label>

                      <Input
                        type="number"
                        disabled={
                          !editMode
                        }
                        value={
                          editForm.commission_amount
                        }
                        onChange={(
                          event,
                        ) =>
                          setEditForm(
                            (
                              previous,
                            ) => ({
                              ...previous,

                              commission_amount:
                                Number(
                                  event.target
                                    .value,
                                ),
                            }),
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      Notes
                    </Label>

                    <Textarea
                      rows={4}
                      disabled={
                        !editMode
                      }
                      value={
                        editForm.notes
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditForm(
                          (
                            previous,
                          ) => ({
                            ...previous,

                            notes:
                              event.target
                                .value,
                          }),
                        )
                      }
                    />
                  </div>

                  {editMode && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setEditMode(
                            false,
                          )
                        }
                      >
                        Annuler
                      </Button>

                      <Button
                        disabled={
                          updateSale.isPending
                        }
                        onClick={() =>
                          void handleSaveSale()
                        }
                      >
                        {updateSale.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}

                        Enregistrer
                      </Button>
                    </div>
                  )}
                </div>

                {/* ================================================= */}
                {/* FINANCES                                          */}
                {/* ================================================= */}

                {[
                  "sold",
                  "closed",
                ].includes(
                  selectedSale.status,
                ) && (
                  <div className="rounded-xl border p-4 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          <WalletCards className="h-4 w-4" />

                          Finances de la vente
                        </h3>

                        <p className="text-xs text-muted-foreground mt-1">
                          Suivi de l'encaissement de la commission.
                        </p>
                      </div>

                      {saleCommission &&
                        saleCommission.status !==
                          "paid" &&
                        saleCommission.status !==
                          "cancelled" &&
                        Number(
                          saleCommission.balance_due,
                        ) >
                          0 && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setPaymentForm({
                                ...emptyPaymentForm,

                                amount:
                                  Number(
                                    saleCommission.balance_due,
                                  ),
                              });

                              setPaymentOpen(
                                true,
                              );
                            }}
                          >
                            <CreditCard className="h-4 w-4" />

                            Enregistrer un paiement
                          </Button>
                        )}
                    </div>

                    {commissionLoading ? (
                      <div className="py-6 flex justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : !saleCommission ? (
                      <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                        Aucune commission financière n'est associée à cette vente.
                      </div>
                    ) : (
                      <>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Commission attendue
                            </p>

                            <p className="font-semibold mt-1">
                              {formatAmount(
                                saleCommission.amount_due,
                                saleCommission.currency,
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Encaissée
                            </p>

                            <p className="font-semibold mt-1 text-success">
                              {formatAmount(
                                saleCommission.amount_paid,
                                saleCommission.currency,
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Reste à encaisser
                            </p>

                            <p className="font-semibold mt-1">
                              {formatAmount(
                                saleCommission.balance_due,
                                saleCommission.currency,
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">
                              Statut
                            </p>

                            <div className="mt-1">
                              {saleCommission.status ===
                              "paid" ? (
                                <Badge className="bg-success/15 text-success border-0">
                                  Encaissée
                                </Badge>
                              ) : saleCommission.status ===
                                "partial" ? (
                                <Badge className="bg-warning/15 text-warning border-0">
                                  Partiellement encaissée
                                </Badge>
                              ) : saleCommission.status ===
                                "cancelled" ? (
                                <Badge className="bg-destructive/15 text-destructive border-0">
                                  Annulée
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  À encaisser
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              Progression
                            </span>

                            <span>
                              {
                                commissionProgress
                              }
                              %
                            </span>
                          </div>

                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{
                                width: `${commissionProgress}%`,
                              }}
                            />
                          </div>
                        </div>

                        {saleCommission.status ===
                          "paid" &&
                          Number(
                            saleCommission.balance_due,
                          ) <= 0 && (
                            <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                              <p className="text-sm font-medium text-success">
                                Commission entièrement encaissée
                              </p>

                              <p className="text-xs text-muted-foreground mt-1">
                                Le solde de la commission est à zéro. La vente peut être clôturée.
                              </p>
                            </div>
                          )}

                        <div>
                          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                            <ReceiptText className="h-4 w-4" />

                            Historique des paiements
                          </h4>

                          {paymentsLoading ? (
                            <div className="py-4 flex justify-center">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : !commissionPayments ||
                            commissionPayments.length ===
                              0 ? (
                            <p className="text-sm text-muted-foreground">
                              Aucun paiement enregistré.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {commissionPayments.map(
                                (
                                  payment,
                                ) => (
                                  <div
                                    key={
                                      payment.id
                                    }
                                    className="rounded-lg border px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                  >
                                    <div>
                                      <p className="text-sm font-medium">
                                        {formatAmount(
                                          payment.amount,
                                          payment.currency,
                                        )}
                                      </p>

                                      <p className="text-xs text-muted-foreground">
                                        {payment.payment_method ||
                                          "Mode non renseigné"}

                                        {payment.reference
                                          ? ` · ${payment.reference}`
                                          : ""}
                                      </p>

                                      {payment.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {
                                            payment.notes
                                          }
                                        </p>
                                      )}
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                      {formatDateTime(
                                        payment.payment_date,
                                      )}
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ================================================= */}
                {/* COORDONNEES                                       */}
                {/* ================================================= */}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <UserRound className="h-4 w-4" />

                      Acquéreur
                    </h3>

                    <div className="mt-3 space-y-2 text-sm">
                      <p>
                        Nom :{" "}
                        <strong>
                          {selectedSale.buyer
                            ?.full_name ??
                            selectedSale.buyer_name ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Téléphone :{" "}
                        {selectedSale.buyer
                          ?.phone ??
                          selectedSale.buyer_phone ??
                          "—"}
                      </p>

                      <p>
                        E-mail :{" "}
                        {selectedSale.buyer
                          ?.email ??
                          selectedSale.buyer_email ??
                          "—"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />

                      Dates
                    </h3>

                    <div className="mt-3 space-y-2 text-sm">
                      <p>
                        Création :{" "}
                        {formatDateTime(
                          selectedSale.created_at,
                        )}
                      </p>

                      <p>
                        Modification :{" "}
                        {formatDateTime(
                          selectedSale.updated_at,
                        )}
                      </p>

                      <p>
                        Clôture :{" "}
                        {formatDateTime(
                          selectedSale.closed_at,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ================================================= */}
                {/* HISTORIQUE                                        */}
                {/* ================================================= */}

                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="h-4 w-4" />

                    Historique des statuts
                  </h3>

                  <div className="mt-4">
                    {historyLoading ? (
                      <div className="py-6 flex justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : !history ||
                      history.length ===
                        0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun changement de statut enregistré.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {history.map(
                          (
                            item,
                          ) => (
                            <div
                              key={
                                item.id
                              }
                              className="rounded-lg bg-muted/40 px-3 py-2"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                {item.old_status && (
                                  <>
                                    <Badge
                                      className={`${
                                        statusConfig[
                                          item.old_status
                                        ].className
                                      } border-0 text-[11px]`}
                                    >
                                      {
                                        statusConfig[
                                          item.old_status
                                        ].label
                                      }
                                    </Badge>

                                    <span className="text-xs text-muted-foreground">
                                      →
                                    </span>
                                  </>
                                )}

                                <Badge
                                  className={`${
                                    statusConfig[
                                      item.new_status
                                    ].className
                                  } border-0 text-[11px]`}
                                >
                                  {
                                    statusConfig[
                                      item.new_status
                                    ].label
                                  }
                                </Badge>

                                <span className="ml-auto text-[11px] text-muted-foreground">
                                  {formatDateTime(
                                    item.created_at,
                                  )}
                                </span>
                              </div>

                              {item.note && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {
                                    item.note
                                  }
                                </p>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={
                      closeSaleDetail
                    }
                  >
                    Fermer
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* PAIEMENT COMMISSION                               */}
        {/* ================================================= */}

        <Dialog
          open={
            paymentOpen
          }
          onOpenChange={(
            value,
          ) => {
            if (
              recordCommissionPayment.isPending
            ) {
              return;
            }

            setPaymentOpen(
              value,
            );

            if (!value) {
              setPaymentForm(
                emptyPaymentForm,
              );
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Enregistrer un paiement
              </DialogTitle>

              <DialogDescription>
                Encaissement de la commission liée à la vente{" "}
                {
                  selectedSale?.reference
                }
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {saleCommission && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Solde restant
                    </span>

                    <strong>
                      {formatAmount(
                        saleCommission.balance_due,
                        saleCommission.currency,
                      )}
                    </strong>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>
                  Montant *
                </Label>

                <Input
                  type="number"
                  min="1"
                  max={
                    saleCommission
                      ? Number(
                          saleCommission.balance_due,
                        )
                      : undefined
                  }
                  value={
                    paymentForm.amount
                  }
                  onChange={(
                    event,
                  ) =>
                    setPaymentForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        amount:
                          Number(
                            event.target
                              .value,
                          ),
                      }),
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Mode de paiement
                </Label>

                <Select
                  value={
                    paymentForm.payment_method
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setPaymentForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        payment_method:
                          value,
                      }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="cash">
                      Espèces
                    </SelectItem>

                    <SelectItem value="bank_transfer">
                      Virement bancaire
                    </SelectItem>

                    <SelectItem value="mobile_money">
                      Mobile Money
                    </SelectItem>

                    <SelectItem value="cheque">
                      Chèque
                    </SelectItem>

                    <SelectItem value="card">
                      Carte bancaire
                    </SelectItem>

                    <SelectItem value="other">
                      Autre
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Référence paiement
                </Label>

                <Input
                  value={
                    paymentForm.reference
                  }
                  onChange={(
                    event,
                  ) =>
                    setPaymentForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        reference:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Ex. VIR-2026-001"
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Notes
                </Label>

                <Textarea
                  rows={3}
                  value={
                    paymentForm.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setPaymentForm(
                      (
                        previous,
                      ) => ({
                        ...previous,

                        notes:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={
                    recordCommissionPayment.isPending
                  }
                  onClick={() => {
                    setPaymentOpen(
                      false,
                    );

                    setPaymentForm(
                      emptyPaymentForm,
                    );
                  }}
                >
                  Annuler
                </Button>

                <Button
                  disabled={
                    recordCommissionPayment.isPending ||
                    Number(
                      paymentForm.amount,
                    ) <= 0
                  }
                  onClick={() =>
                    void handleCommissionPayment()
                  }
                >
                  {recordCommissionPayment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}

                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageShell>
    );
  };

export default SalesPage;