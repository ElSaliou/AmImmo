import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  AlertTriangle,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

import PageShell from "@/components/PageShell";
import EmptyState from "@/components/admin/EmptyState";
import TableSkeleton from "@/components/admin/TableSkeleton";
import LeaseAmendmentDialog, {
  type LeaseAmendmentDialogLease,
} from "@/components/admin/LeaseAmendmentDialog";

import {
  type LeaseBillingPreview,
  type LeaseTerminationInitiator,
  type RentBillingRule,
  useActivateLease,
  useCreateLease,
  useDeleteLease,
  useExpireLease,
  useLeases,
  usePreviewLeaseExpirationBilling,
  usePreviewLeaseTerminationBilling,
  useTerminateLease,
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
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Textarea,
} from "@/components/ui/textarea";

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

const initiatorLabels: Record<
  LeaseTerminationInitiator,
  string
> = {
  landlord:
    "Bailleur",

  tenant:
    "Locataire",

  mutual_agreement:
    "Accord mutuel",
};

const billingRuleLabels: Record<
  RentBillingRule,
  string
> = {
  prorata:
    "Prorata",

  full_month:
    "Mois complet",
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

const getTodayInputValue =
  () => {
    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() +
          1,
      ).padStart(
        2,
        "0",
      );

    const day =
      String(
        today.getDate(),
      ).padStart(
        2,
        "0",
      );

    return `${year}-${month}-${day}`;
  };

const getPreviousDateValue =
  (
    value: string,
  ) => {
    const parts =
      value
        .split("-")
        .map(Number);

    if (
      parts.length !== 3 ||
      parts.some(
        (part) =>
          !Number.isFinite(
            part,
          ),
      )
    ) {
      return "";
    }

    const [
      year,
      month,
      day,
    ] = parts;

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day,
        ),
      );

    date.setUTCDate(
      date.getUTCDate() -
        1,
    );

    return date
      .toISOString()
      .slice(0, 10);
  };

const getTerminationMaxDate =
  (
    lease: any,
  ) => {
    const today =
      getTodayInputValue();

    if (
      !lease?.end_date
    ) {
      return today;
    }

    const dayBeforeEnd =
      getPreviousDateValue(
        lease.end_date,
      );

    if (!dayBeforeEnd) {
      return today;
    }

    return dayBeforeEnd <
      today
      ? dayBeforeEnd
      : today;
  };

const getInitialTerminationDate =
  (
    lease: any,
  ) => {
    const maxDate =
      getTerminationMaxDate(
        lease,
      );

    if (
      !maxDate ||
      maxDate <
        lease.start_date
    ) {
      return "";
    }

    return maxDate;
  };

const formatMoney =
  (
    value:
      | number
      | null
      | undefined,
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "—";
    }

    return `${Number(
      value,
    ).toLocaleString(
      "fr-FR",
    )} GNF`;
  };

const formatDate =
  (
    value:
      | string
      | null
      | undefined,
  ) => {
    if (!value) {
      return "—";
    }

    const [
      year,
      month,
      day,
    ] = value
      .slice(0, 10)
      .split("-");

    if (
      !year ||
      !month ||
      !day
    ) {
      return value;
    }

    return `${day}/${month}/${year}`;
  };

const billingResolutionMessage =
  (
    code:
      | string
      | null
      | undefined,
  ) => {
    switch (code) {
      case "BILLING_MUTUAL_RULE_REQUIRED":
        return "Pour un accord mutuel, choisissez explicitement Prorata ou Mois complet.";

      case "BILLING_RULE_NOT_ALLOWED":
        return "La règle de facturation choisie n'est pas autorisée pour cet initiateur.";

      case "BILLING_TERMINATION_NOT_EARLY":
        return "La résiliation doit être strictement antérieure à la date de fin contractuelle.";

      case "BILLING_SAME_MONTH_POLICY_CONFLICT":
        return "Ce cas nécessite une revue manuelle avant clôture du bail.";

      case "BILLING_INVALID_EFFECTIVE_DATE":
        return "La date effective de sortie n'est pas valide.";

      case "BILLING_CONTEXT_MISMATCH":
        return "Le contexte de facturation ne correspond pas à la sortie demandée.";

      default:
        return code
          ? `Le calcul n'est pas validé (${code}).`
          : "Le calcul de facturation n'est pas validé.";
    }
  };

const billingRpcErrorMessage =
  (
    error: any,
    fallback: string,
  ) => {
    const message =
      String(
        error?.message ??
          "",
      );

    if (
      message.includes(
        "BILLING_EXISTING_INVOICE_CONFLICT",
      )
    ) {
      return "Une facture de loyer déjà comptabilisée est incompatible avec cette sortie. Une régularisation comptable est nécessaire avant de clôturer le bail.";
    }

    if (
      message.includes(
        "BILLING_LATER_INVOICE_REQUIRES_REGULARIZATION",
      )
    ) {
      return "Une facture existe pour un mois postérieur à la date de sortie. Régularisez-la avant de clôturer le bail.";
    }

    if (
      message.includes(
        "BILLING_EXISTING_INVOICE_PERIOD_INVALID",
      )
    ) {
      return "Une facture existante possède une période invalide. Une régularisation est requise avant la clôture.";
    }

    if (
      message.includes(
        "BILLING_TERMINATION_NOT_EARLY",
      )
    ) {
      return "Pour un bail à durée déterminée, la date de résiliation doit être strictement antérieure à la date de fin contractuelle.";
    }

    if (
      message.includes(
        "BILLING_MUTUAL_RULE_REQUIRED",
      )
    ) {
      return "Pour un accord mutuel, choisissez explicitement Prorata ou Mois complet.";
    }

    if (
      message.includes(
        "BILLING_RULE_NOT_ALLOWED",
      )
    ) {
      return "La règle de facturation sélectionnée n'est pas autorisée pour cet initiateur.";
    }

    if (
      message.includes(
        "BILLING_SAME_MONTH_POLICY_CONFLICT",
      )
    ) {
      return "Ce cas nécessite une revue manuelle avant clôture du bail.";
    }

    return message ||
      fallback;
  };

const BillingPreviewCard =
  ({
    preview,
  }: {
    preview:
      LeaseBillingPreview;
  }) => {
    if (
      preview.resolution_status !==
      "resolved"
    ) {
      return (
        <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

          <div className="space-y-1">
            <p className="text-sm font-medium">
              Aperçu non validé
            </p>

            <p className="text-xs">
              {billingResolutionMessage(
                preview.resolution_code,
              )}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              Aperçu de la facture finale
            </p>

            <p className="text-xs text-muted-foreground">
              Policy{" "}
              {preview.policy_version ??
                "LONG_TERM_C_V1"}
            </p>
          </div>

          {preview.billing_rule ? (
            <Badge variant="secondary">
              {
                billingRuleLabels[
                  preview.billing_rule
                ]
              }
            </Badge>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">
            Période
          </span>

          <span className="text-right font-medium">
            {formatDate(
              preview.period_start,
            )}{" "}
            →{" "}
            {formatDate(
              preview.period_end,
            )}
          </span>

          <span className="text-muted-foreground">
            Jours facturés
          </span>

          <span className="text-right font-medium">
            {preview.billed_days ??
              "—"}{" "}
            /{" "}
            {preview.days_in_month ??
              "—"}
          </span>

          <span className="text-muted-foreground">
            Loyer
          </span>

          <span className="text-right">
            {formatMoney(
              preview.rent_amount,
            )}
          </span>

          <span className="text-muted-foreground">
            Charges
          </span>

          <span className="text-right">
            {formatMoney(
              preview.charges_amount,
            )}
          </span>

          <span className="border-t pt-2 font-semibold">
            Total
          </span>

          <span className="border-t pt-2 text-right font-semibold">
            {formatMoney(
              preview.total_amount,
            )}
          </span>
        </div>
      </div>
    );
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

  const activateLease =
    useActivateLease();

  const previewExpiration =
    usePreviewLeaseExpirationBilling();

  const expireLease =
    useExpireLease();

  const previewTermination =
    usePreviewLeaseTerminationBilling();

  const terminateLease =
    useTerminateLease();

  const deleteLease =
    useDeleteLease();
  const [
    leaseToDelete,
    setLeaseToDelete,
  ] = useState<any | null>(
    null,
  );

  const [
    amendmentLease,
    setAmendmentLease,
  ] = useState<LeaseAmendmentDialogLease | null>(
    null,
  );

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    expirationLease,
    setExpirationLease,
  ] = useState<any | null>(
    null,
  );

  const [
    expirationPreview,
    setExpirationPreview,
  ] =
    useState<LeaseBillingPreview | null>(
      null,
    );

  const [
    terminationLease,
    setTerminationLease,
  ] = useState<any | null>(
    null,
  );

  const [
    terminationDate,
    setTerminationDate,
  ] = useState("");

  const [
    terminationInitiator,
    setTerminationInitiator,
  ] = useState<
    LeaseTerminationInitiator | ""
  >("");

  const [
    terminationBillingRule,
    setTerminationBillingRule,
  ] = useState<
    RentBillingRule | ""
  >("");

  const [
    terminationReason,
    setTerminationReason,
  ] = useState("");

  const [
    terminationPreview,
    setTerminationPreview,
  ] =
    useState<LeaseBillingPreview | null>(
      null,
    );

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

  const terminationMaxDate =
    useMemo(
      () =>
        terminationLease
          ? getTerminationMaxDate(
              terminationLease,
            )
          : getTodayInputValue(),
      [terminationLease],
    );

  const expirationPreviewResolved =
    expirationPreview
      ?.resolution_status ===
    "resolved";

  const terminationPreviewResolved =
    terminationPreview
      ?.resolution_status ===
    "resolved";

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

  const resetExpirationPreview =
    () => {
      setExpirationPreview(
        null,
      );

      previewExpiration.reset();
    };

  const resetTerminationPreview =
    () => {
      setTerminationPreview(
        null,
      );

      previewTermination.reset();
    };

  const handleStatusChange =
    async (
      lease: any,
      status: string,
    ) => {
      if (
        status ===
        lease.status
      ) {
        return;
      }

      if (
        lease.status ===
          "pending" &&
        status ===
          "active"
      ) {
        if (
          !lease.owner_id
        ) {
          toast.error(
            "Associez d'abord un propriétaire avant d'activer ce bail.",
          );

          return;
        }

        try {
          await activateLease.mutateAsync({
            leaseId: lease.id,
          });

          toast.success(
            "Bail activé. Le bien est maintenant marqué Loué.",
          );
        } catch (
          error: any
        ) {
          toast.error(
            error?.message ??
              "Impossible d'activer le bail",
          );
        }

        return;
      }

      if (
        lease.status ===
          "active" &&
        status ===
          "expired"
      ) {
        if (
          !lease.end_date
        ) {
          toast.error(
            "Ce bail n'a pas de date de fin contractuelle. Utilisez la résiliation.",
          );

          return;
        }

        if (
          lease.end_date >
          getTodayInputValue()
        ) {
          toast.error(
            "Le bail ne peut pas être expiré avant sa date de fin contractuelle.",
          );

          return;
        }

        resetExpirationPreview();

        setExpirationLease(
          lease,
        );

        return;
      }

      if (
        lease.status ===
          "active" &&
        status ===
          "terminated"
      ) {
        resetTerminationPreview();

        setTerminationLease(
          lease,
        );

        setTerminationDate(
          getInitialTerminationDate(
            lease,
          ),
        );

        setTerminationInitiator(
          "",
        );

        setTerminationBillingRule(
          "",
        );

        setTerminationReason(
          "",
        );

        return;
      }

      toast.error(
        "Cette transition de statut n'est pas autorisée.",
      );
    };

  const closeExpirationDialog =
    () => {
      setExpirationLease(
        null,
      );

      resetExpirationPreview();
    };

  const handlePreviewExpiration =
    async () => {
      if (
        !expirationLease
      ) {
        return;
      }

      try {
        const preview =
          await previewExpiration.mutateAsync(
            {
              leaseId:
                expirationLease.id,
            },
          );

        setExpirationPreview(
          preview,
        );

        if (
          preview.resolution_status !==
          "resolved"
        ) {
          toast.error(
            billingResolutionMessage(
              preview.resolution_code,
            ),
          );
        }
      } catch (
        error: any
      ) {
        setExpirationPreview(
          null,
        );

        toast.error(
          billingRpcErrorMessage(
            error,
            "Impossible de calculer l'aperçu d'expiration.",
          ),
        );
      }
    };

  const handleExpireLease =
    async () => {
      if (
        !expirationLease
      ) {
        return;
      }

      if (
        !expirationPreviewResolved
      ) {
        toast.error(
          "Calculez et validez l'aperçu de la facture finale avant de confirmer l'expiration.",
        );

        return;
      }

      try {
        const result =
          await expireLease.mutateAsync(
            {
              leaseId:
                expirationLease.id,
            },
          );

        toast.success(
          `Bail expiré. Facture finale ${result.final_invoice_number} : ${Number(
            result.final_invoice_amount,
          ).toLocaleString(
            "fr-FR",
          )} GNF${
            result.invoice_reused
              ? " (facture existante réutilisée)"
              : ""
          }.`,
        );

        closeExpirationDialog();
      } catch (
        error: any
      ) {
        toast.error(
          billingRpcErrorMessage(
            error,
            "Impossible d'expirer le bail",
          ),
        );
      }
    };

  const closeTerminationDialog =
    () => {
      setTerminationLease(
        null,
      );

      setTerminationDate(
        "",
      );

      setTerminationInitiator(
        "",
      );

      setTerminationBillingRule(
        "",
      );

      setTerminationReason(
        "",
      );

      resetTerminationPreview();
    };

  const handleTerminationDateChange =
    (
      value: string,
    ) => {
      setTerminationDate(
        value,
      );

      resetTerminationPreview();
    };

  const handleTerminationInitiatorChange =
    (
      value: string,
    ) => {
      const initiator =
        value as LeaseTerminationInitiator;

      setTerminationInitiator(
        initiator,
      );

      if (
        initiator ===
        "landlord"
      ) {
        setTerminationBillingRule(
          "prorata",
        );
      } else if (
        initiator ===
        "tenant"
      ) {
        setTerminationBillingRule(
          "full_month",
        );
      } else {
        setTerminationBillingRule(
          "",
        );
      }

      resetTerminationPreview();
    };

  const handleTerminationBillingRuleChange =
    (
      value: string,
    ) => {
      setTerminationBillingRule(
        value as RentBillingRule,
      );

      resetTerminationPreview();
    };

  const validateTerminationInputs =
    () => {
      if (
        !terminationLease
      ) {
        return false;
      }

      if (
        !terminationDate
      ) {
        toast.error(
          "La date effective de résiliation est obligatoire.",
        );

        return false;
      }

      if (
        terminationDate <
        terminationLease.start_date
      ) {
        toast.error(
          "La date de résiliation ne peut pas être antérieure au début du bail.",
        );

        return false;
      }

      if (
        terminationDate >
        getTodayInputValue()
      ) {
        toast.error(
          "La date de résiliation ne peut pas être future.",
        );

        return false;
      }

      if (
        terminationLease.end_date &&
        terminationDate >=
          terminationLease.end_date
      ) {
        toast.error(
          "Pour un bail à durée déterminée, la résiliation doit être strictement antérieure à la date de fin contractuelle. À la date de fin ou après, utilisez l'expiration.",
        );

        return false;
      }

      if (
        !terminationInitiator
      ) {
        toast.error(
          "Sélectionnez l'initiateur de la résiliation.",
        );

        return false;
      }

      if (
        !terminationBillingRule
      ) {
        toast.error(
          terminationInitiator ===
            "mutual_agreement"
            ? "Pour un accord mutuel, choisissez Prorata ou Mois complet."
            : "La règle de facturation est obligatoire.",
        );

        return false;
      }

      return true;
    };

  const handlePreviewTermination =
    async () => {
      if (
        !validateTerminationInputs() ||
        !terminationLease ||
        !terminationInitiator ||
        !terminationBillingRule
      ) {
        return;
      }

      try {
        const preview =
          await previewTermination.mutateAsync(
            {
              leaseId:
                terminationLease.id,

              terminationDate,

              initiator:
                terminationInitiator,

              billingRule:
                terminationBillingRule,
            },
          );

        setTerminationPreview(
          preview,
        );

        if (
          preview.resolution_status !==
          "resolved"
        ) {
          toast.error(
            billingResolutionMessage(
              preview.resolution_code,
            ),
          );
        }
      } catch (
        error: any
      ) {
        setTerminationPreview(
          null,
        );

        toast.error(
          billingRpcErrorMessage(
            error,
            "Impossible de calculer l'aperçu de résiliation.",
          ),
        );
      }
    };

  const handleTerminateLease =
    async () => {
      if (
        !validateTerminationInputs() ||
        !terminationLease ||
        !terminationInitiator ||
        !terminationBillingRule
      ) {
        return;
      }

      if (
        !terminationPreviewResolved
      ) {
        toast.error(
          "Calculez et validez l'aperçu de la facture finale avant de confirmer la résiliation.",
        );

        return;
      }

      try {
        const result =
          await terminateLease.mutateAsync(
            {
              leaseId:
                terminationLease.id,

              terminationDate,

              initiator:
                terminationInitiator,

              billingRule:
                terminationBillingRule,

              reason:
                terminationReason,
            },
          );

        toast.success(
          `Bail résilié. Facture finale ${result.final_invoice_number} : ${Number(
            result.final_invoice_amount,
          ).toLocaleString(
            "fr-FR",
          )} GNF${
            result.invoice_reused
              ? " (facture existante réutilisée)"
              : ""
          }.`,
        );

        closeTerminationDialog();
      } catch (
        error: any
      ) {
        toast.error(
          billingRpcErrorMessage(
            error,
            "Impossible de résilier le bail",
          ),
        );
      }
    };

  const handleDeleteLease =
    async () => {
      if (
        !leaseToDelete
      ) {
        return;
      }

      try {
        await deleteLease.mutateAsync(
          leaseToDelete.id,
        );

        toast.success(
          "Bail en attente supprimé",
        );

        setLeaseToDelete(
          null,
        );
      } catch (
        error: any
      ) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer ce bail.",
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
      ) : (leases ?? [])
          .length === 0 ? (
        <EmptyState
          icon={FileText}
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
              {(leases ?? []).map(
                (
                  lease: any,
                ) => {
                  const config =
                    statusLabels[
                      lease.status
                    ] ?? {
                      label:
                        lease.status,

                      className:
                        "",
                    };

                  return (
                    <TableRow
                      key={lease.id}
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
                        {formatDate(
                          lease.start_date,
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(
                          lease.end_date,
                        )}
                      </TableCell>

                      <TableCell className="font-semibold text-sm">
                        {formatMoney(
                          Number(
                            lease.monthly_rent,
                          ),
                        )}
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
                            activateLease.isPending ||
                            expireLease.isPending ||
                            terminateLease.isPending ||
                            lease.status ===
                              "expired" ||
                            lease.status ===
                              "terminated"
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
                            {lease.status ===
                              "pending" && (
                              <>
                                <SelectItem value="pending">
                                  En attente
                                </SelectItem>

                                <SelectItem value="active">
                                  Activer
                                </SelectItem>
                              </>
                            )}

                            {lease.status ===
                              "active" && (
                              <>
                                <SelectItem value="active">
                                  Actif
                                </SelectItem>

                                {lease.end_date &&
                                  lease.end_date <=
                                    getTodayInputValue() && (
                                    <SelectItem value="expired">
                                      Expirer
                                    </SelectItem>
                                  )}

                                <SelectItem value="terminated">
                                  Résilier
                                </SelectItem>
                              </>
                            )}

                            {lease.status ===
                              "expired" && (
                              <SelectItem value="expired">
                                Expiré
                              </SelectItem>
                            )}

                            {lease.status ===
                              "terminated" && (
                              <SelectItem value="terminated">
                                Résilié
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {lease.status ===
                            "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              title="Créer ou consulter les avenants"
                              onClick={() =>
                                setAmendmentLease(
                                  lease,
                                )
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Avenant
                            </Button>
                          )}

                          {lease.status ===
                            "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                              title="Supprimer ce bail en attente"
                              disabled={deleteLease.isPending}
                                onClick={() =>
                                  setLeaseToDelete(
                                    lease,
                                  )
                                }
                            >
                              {deleteLease.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                            </Button>
                          )}
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
      {/* SUPPRESSION D'UN BAIL EN ATTENTE */}
      <Dialog
        open={Boolean(
          leaseToDelete,
        )}
        onOpenChange={(
          value,
        ) => {
          if (
            !value &&
            !deleteLease.isPending
          ) {
            setLeaseToDelete(
              null,
            );
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              Supprimer ce bail ?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cette suppression est définitive. Elle est autorisée uniquement
              pour un bail encore en attente et sans facture rattachée.
            </p>

            <div className="rounded-lg bg-muted/60 p-3 text-sm">
              <span className="text-muted-foreground">
                Bail :{" "}
              </span>

              <strong>
                {leaseToDelete?.reference ||
                  "Sans référence"}
              </strong>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setLeaseToDelete(
                    null,
                  )
                }
                disabled={
                  deleteLease.isPending
                }
              >
                Annuler
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  void handleDeleteLease()
                }
                disabled={
                  deleteLease.isPending
                }
              >
                {deleteLease.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}

                Supprimer définitivement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* AVENANTS */}
      <LeaseAmendmentDialog
        lease={amendmentLease}
        onClose={() =>
          setAmendmentLease(
            null,
          )
        }
      />
      {/* EXPIRATION DU BAIL */}
      <Dialog
        open={Boolean(
          expirationLease,
        )}
        onOpenChange={(
          value,
        ) => {
          if (!value) {
            closeExpirationDialog();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Expirer le bail
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-sm text-muted-foreground">
                L'expiration utilise la date de fin contractuelle et applique la règle Policy C : le dernier mois est facturé en mois complet. Un aperçu financier doit être validé avant la confirmation.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>
                Date de fin contractuelle
              </Label>

              <Input
                type="date"
                value={
                  expirationLease?.end_date ??
                  ""
                }
                disabled
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                void handlePreviewExpiration()
              }
              disabled={
                previewExpiration.isPending ||
                expireLease.isPending
              }
            >
              {previewExpiration.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              {expirationPreview
                ? "Recalculer l'aperçu"
                : "Calculer l'aperçu"}
            </Button>

            {expirationPreview ? (
              <BillingPreviewCard
                preview={
                  expirationPreview
                }
              />
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={
                  closeExpirationDialog
                }
                disabled={
                  expireLease.isPending
                }
              >
                Annuler
              </Button>

              <Button
                type="button"
                onClick={() =>
                  void handleExpireLease()
                }
                disabled={
                  expireLease.isPending ||
                  previewExpiration.isPending ||
                  !expirationPreviewResolved
                }
              >
                {expireLease.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}

                Confirmer l'expiration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RÉSILIATION DU BAIL */}
      <Dialog
        open={Boolean(
          terminationLease,
        )}
        onOpenChange={(
          value,
        ) => {
          if (!value) {
            closeTerminationDialog();
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Résilier le bail
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                Cette opération met fin au bail et déclenche le contrôle obligatoire du bien. La facture finale dépend de l'initiateur de la résiliation selon Policy C.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>
                Date effective de résiliation *
              </Label>

              <Input
                type="date"
                value={
                  terminationDate
                }
                min={
                  terminationLease?.start_date ??
                  undefined
                }
                max={
                  terminationMaxDate ||
                  undefined
                }
                onChange={(
                  event,
                ) =>
                  handleTerminationDateChange(
                    event.target.value,
                  )
                }
              />

              {terminationLease?.end_date ? (
                <p className="text-xs text-muted-foreground">
                  La date doit être strictement antérieure au{" "}
                  {formatDate(
                    terminationLease.end_date,
                  )}
                  . À cette date ou après, utilisez l'expiration.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>
                Initiateur de la résiliation *
              </Label>

              <Select
                value={
                  terminationInitiator
                }
                onValueChange={
                  handleTerminationInitiatorChange
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner l'initiateur" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="landlord">
                    Bailleur
                  </SelectItem>

                  <SelectItem value="tenant">
                    Locataire
                  </SelectItem>

                  <SelectItem value="mutual_agreement">
                    Accord mutuel
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Règle de facturation *
              </Label>

              <Select
                value={
                  terminationBillingRule
                }
                onValueChange={
                  handleTerminationBillingRuleChange
                }
                disabled={
                  !terminationInitiator ||
                  terminationInitiator !==
                    "mutual_agreement"
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !terminationInitiator
                        ? "Sélectionnez d'abord l'initiateur"
                        : "Sélectionner la règle"
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="prorata">
                    Prorata
                  </SelectItem>

                  <SelectItem value="full_month">
                    Mois complet
                  </SelectItem>
                </SelectContent>
              </Select>

              {terminationInitiator ===
              "landlord" ? (
                <p className="text-xs text-muted-foreground">
                  Policy C : une résiliation initiée par le bailleur est facturée au prorata.
                </p>
              ) : null}

              {terminationInitiator ===
              "tenant" ? (
                <p className="text-xs text-muted-foreground">
                  Policy C : une résiliation initiée par le locataire facture le mois complet.
                </p>
              ) : null}

              {terminationInitiator ===
              "mutual_agreement" ? (
                <p className="text-xs text-muted-foreground">
                  Accord mutuel : le choix entre Prorata et Mois complet est obligatoire et sans valeur par défaut.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>
                Motif de résiliation
              </Label>

              <Textarea
                rows={4}
                value={
                  terminationReason
                }
                onChange={(
                  event,
                ) =>
                  setTerminationReason(
                    event.target.value,
                  )
                }
                placeholder="Motif facultatif..."
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                void handlePreviewTermination()
              }
              disabled={
                previewTermination.isPending ||
                terminateLease.isPending ||
                !terminationDate ||
                !terminationInitiator ||
                !terminationBillingRule
              }
            >
              {previewTermination.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              {terminationPreview
                ? "Recalculer l'aperçu"
                : "Calculer l'aperçu"}
            </Button>

            {terminationPreview ? (
              <BillingPreviewCard
                preview={
                  terminationPreview
                }
              />
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={
                  closeTerminationDialog
                }
                disabled={
                  terminateLease.isPending
                }
              >
                Annuler
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  void handleTerminateLease()
                }
                disabled={
                  terminateLease.isPending ||
                  previewTermination.isPending ||
                  !terminationPreviewResolved
                }
              >
                {terminateLease.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}

                Confirmer la résiliation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FORMULAIRE DE CRÉATION */}
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
                Le bail sera créé avec le statut{" "}
                <strong>
                  En attente
                </strong>
                . Le bien restera{" "}
                <strong>
                  Réservé
                </strong>{" "}
                jusqu'à l'activation du bail.
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
