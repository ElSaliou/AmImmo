import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  Ban,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  History,
  Loader2,
  Paperclip,
  Plus,
  ReceiptText,
  Search,
  Send,
  Upload,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";

import {
  toast,
} from "sonner";

import PageShell from "@/components/PageShell";
import EmptyState from "@/components/admin/EmptyState";
import TableSkeleton from "@/components/admin/TableSkeleton";

import {
  createExpenseDocumentSignedUrl,
  EXPENSE_DOCUMENT_MAX_SIZE,
  useApproveExpense,
  useCancelExpense,
  useCreateExpense,
  useCreateExpenseParty,
  useExpense,
  useExpenseAccounting,
  useExpenseCategories,
  useExpenseLeases,
  useExpenseMaintenanceRequests,
  useExpenseOwners,
  useExpenseParties,
  useExpenseProperties,
  useExpenseSales,
  useExpenses,
  useExpenseTreasuryAccounts,
  usePayExpense,
  useRejectExpense,
  useSubmitExpense,
  useUploadExpenseDocuments,
  type Expense,
  type ExpenseDocument,
  type ExpensePartyType,
  type ExpenseStatus,
} from "@/hooks/use-expenses";

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

// ============================================================
// STATUTS
// ============================================================

const statusConfig:
  Record<
    ExpenseStatus,
    {
      label: string;
      className: string;
    }
  > = {
  draft: {
    label:
      "Brouillon",

    className:
      "bg-muted text-muted-foreground",
  },

  pending_approval: {
    label:
      "À valider",

    className:
      "bg-warning/15 text-warning",
  },

  approved: {
    label:
      "Validée",

    className:
      "bg-info/15 text-info",
  },

  partially_paid: {
    label:
      "Partiellement payée",

    className:
      "bg-orange-500/15 text-orange-600",
  },

  paid: {
    label:
      "Payée",

    className:
      "bg-success/15 text-success",
  },

  rejected: {
    label:
      "Rejetée",

    className:
      "bg-destructive/15 text-destructive",
  },

  cancelled: {
    label:
      "Annulée",

    className:
      "bg-muted text-muted-foreground",
  },
};

// ============================================================
// HELPERS
// ============================================================

const formatAmount =
  (
    amount:
      number |
      null |
      undefined,

    currency =
      "GNF",
  ) =>
    `${Number(
      amount ?? 0,
    ).toLocaleString(
      "fr-FR",
    )} ${currency}`;

const formatFileSize =
  (
    bytes:
      number |
      null |
      undefined,
  ) => {
    const value =
      Number(
        bytes ??
        0,
      );

    if (
      value <= 0
    ) {
      return "—";
    }

    if (
      value <
      1024 * 1024
    ) {
      return `${(
        value /
        1024
      ).toFixed(0)} Ko`;
    }

    return `${(
      value /
      1024 /
      1024
    ).toFixed(2)} Mo`;
  };

const formatDate =
  (
    value:
      string |
      null |
      undefined,
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(
        `${value.substring(
          0,
          10,
        )}T00:00:00`,
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "fr-FR",
    );
  };

const formatDateTime =
  (
    value:
      string |
      null |
      undefined,
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(
        value,
      );

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

const today =
  () =>
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      );

const localDateTime =
  () => {
    const now =
      new Date();

    const local =
      new Date(
        now.getTime() -
          now.getTimezoneOffset() *
            60000,
      );

    return local
      .toISOString()
      .slice(
        0,
        16,
      );
  };

const optionLabel =
  (
    item:
      any,

    fallback:
      string,
  ) =>
    item?.reference ||
    item?.title ||
    item?.name ||
    item?.label ||
    item?.description ||
    `${fallback} ${
      item?.id
        ?.slice(
          0,
          8,
        ) ??
      ""
    }`;

const paymentMethodLabel =
  (
    value:
      string |
      null |
      undefined,
  ) => {
    switch (
      value
    ) {
      case "cash":
        return "Espèces";

      case "bank_transfer":
        return "Virement bancaire";

      case "mobile_money":
        return "Mobile Money";

      case "cheque":
        return "Chèque";

      case "card":
        return "Carte";

      default:
        return value ||
          "Autre";
    }
  };

const isAllowedFile =
  (
    file:
      File,
  ) => {
    const allowedTypes =
      [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

    return (
      !file.type ||
      allowedTypes.includes(
        file.type,
      )
    );
  };

// ============================================================
// CREATION
// ============================================================

const createEmptyExpenseForm =
  () => ({
    categoryId:
      "",

    partyId:
      "",

    beneficiaryName:
      "",

    documentNumber:
      "",

    expenseDate:
      today(),

    dueDate:
      "",

    label:
      "",

    description:
      "",

    amount:
      "",

    currency:
      "GNF",

    propertyId:
      "",

    ownerId:
      "",

    saleId:
      "",

    contractId:
      "",

    maintenanceRequestId:
      "",

    chargeableToOwner:
      "yes",

    notes:
      "",
  });

// ============================================================
// FOURNISSEUR
// ============================================================

const createEmptyPartyForm =
  () => ({
    partyType:
      "supplier" as ExpensePartyType,

    name:
      "",

    companyName:
      "",

    phone:
      "",

    email:
      "",

    address:
      "",

    taxNumber:
      "",

    notes:
      "",
  });

// ============================================================
// PAIEMENT
// ============================================================

const createEmptyPaymentForm =
  () => ({
    treasuryAccountId:
      "",

    amount:
      "",

    paymentDate:
      localDateTime(),

    paymentMethod:
      "",

    externalReference:
      "",

    notes:
      "",
  });

// ============================================================
// PAGE
// ============================================================

const ExpensesPage =
  () => {
    // ========================================================
    // DATA
    // ========================================================

    const {
      data:
        expenses,
      isLoading,
    } =
      useExpenses();

    const {
      data:
        categories,
    } =
      useExpenseCategories();

    const {
      data:
        parties,
    } =
      useExpenseParties();

    const {
      data:
        properties,
    } =
      useExpenseProperties();

    const {
      data:
        owners,
    } =
      useExpenseOwners();

    const {
      data:
        sales,
    } =
      useExpenseSales();

    const {
      data:
        leases,
    } =
      useExpenseLeases();

    const {
      data:
        maintenanceRequests,
    } =
      useExpenseMaintenanceRequests();

    const {
      data:
        treasuryAccounts,
    } =
      useExpenseTreasuryAccounts();

    // ========================================================
    // MUTATIONS
    // ========================================================

    const createExpense =
      useCreateExpense();

    const createParty =
      useCreateExpenseParty();

    const uploadDocuments =
      useUploadExpenseDocuments();

    const submitExpense =
      useSubmitExpense();

    const approveExpense =
      useApproveExpense();

    const rejectExpense =
      useRejectExpense();

    const cancelExpense =
      useCancelExpense();

    const payExpense =
      usePayExpense();

    // ========================================================
    // FILTRES
    // ========================================================

    const [
      search,
      setSearch,
    ] =
      useState("");

    const [
      statusFilter,
      setStatusFilter,
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
        createEmptyExpenseForm(),
      );

    const [
      selectedFiles,
      setSelectedFiles,
    ] =
      useState<File[]>(
        [],
      );

    const [
      createFileInputKey,
      setCreateFileInputKey,
    ] =
      useState(0);

    // ========================================================
    // FOURNISSEUR
    // ========================================================

    const [
      partyOpen,
      setPartyOpen,
    ] =
      useState(false);

    const [
      partyForm,
      setPartyForm,
    ] =
      useState(
        createEmptyPartyForm(),
      );

    // ========================================================
    // DETAIL
    // ========================================================

    const [
      selectedExpenseId,
      setSelectedExpenseId,
    ] =
      useState<
        string |
        null
      >(null);

    const [
      detailOpen,
      setDetailOpen,
    ] =
      useState(false);

    const [
      detailFiles,
      setDetailFiles,
    ] =
      useState<File[]>(
        [],
      );

    const [
      detailFileInputKey,
      setDetailFileInputKey,
    ] =
      useState(0);

    const [
      openingDocumentId,
      setOpeningDocumentId,
    ] =
      useState<
        string |
        null
      >(null);

    const {
      data:
        selectedExpense,
      isLoading:
        expenseDetailLoading,
    } =
      useExpense(
        selectedExpenseId,
      );

    const {
      data:
        accounting,
      isLoading:
        accountingLoading,
    } =
      useExpenseAccounting(
        selectedExpenseId,
      );

    // ========================================================
    // PAIEMENT
    // ========================================================

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
        createEmptyPaymentForm(),
      );

    // ========================================================
    // ACTION MOTIF
    // ========================================================

    const [
      reasonOpen,
      setReasonOpen,
    ] =
      useState(false);

    const [
      reasonMode,
      setReasonMode,
    ] =
      useState<
        "reject" |
        "cancel"
      >(
        "reject",
      );

    const [
      reason,
      setReason,
    ] =
      useState("");

    // ========================================================
    // APPROBATION
    // ========================================================

    const [
      approvalOpen,
      setApprovalOpen,
    ] =
      useState(false);

    const [
      approvalNote,
      setApprovalNote,
    ] =
      useState("");

    // ========================================================
    // CATEGORIE SELECTIONNEE
    // ========================================================

    const selectedCategory =
      useMemo(
        () =>
          (
            categories ??
            []
          ).find(
            (
              category,
            ) =>
              category.id ===
              form.categoryId,
          ) ??
          null,
        [
          categories,
          form.categoryId,
        ],
      );

    // ========================================================
    // KPIS
    // ========================================================

    const totals =
      useMemo(() => {
        const rows =
          expenses ??
          [];

        return {
          total:
            rows.length,

          pending:
            rows.filter(
              (
                row,
              ) =>
                row.status ===
                "pending_approval",
            ).length,

          outstanding:
            rows
              .filter(
                (
                  row,
                ) =>
                  row.status ===
                    "approved" ||
                  row.status ===
                    "partially_paid",
              )
              .reduce(
                (
                  total,
                  row,
                ) =>
                  total +
                  Number(
                    row.balance_due ??
                      0,
                  ),
                0,
              ),

          paid:
            rows
              .filter(
                (
                  row,
                ) =>
                  row.status ===
                  "paid",
              )
              .reduce(
                (
                  total,
                  row,
                ) =>
                  total +
                  Number(
                    row.amount ??
                      0,
                  ),
                0,
              ),
        };
      }, [
        expenses,
      ]);

    // ========================================================
    // FILTRAGE
    // ========================================================

    const filtered =
      useMemo(() => {
        const q =
          search
            .trim()
            .toLowerCase();

        return (
          expenses ??
          []
        ).filter(
          (
            expense,
          ) => {
            if (
              statusFilter !==
                "__all__" &&
              expense.status !==
                statusFilter
            ) {
              return false;
            }

            if (!q) {
              return true;
            }

            return [
              expense.reference,
              expense.document_number,
              expense.label,
              expense.beneficiary_name,
              expense.party?.name,
              expense.party?.company_name,
              expense.category_relation?.name,
              expense.property?.title,
              expense.owner?.full_name,
              expense.sale?.reference,
            ]
              .filter(
                Boolean,
              )
              .some(
                (
                  value,
                ) =>
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
        expenses,
        search,
        statusFilter,
      ]);

    // ========================================================
    // RESET CREATION
    // ========================================================

    const resetCreateForm =
      () => {
        setForm(
          createEmptyExpenseForm(),
        );

        setSelectedFiles(
          [],
        );

        setCreateFileInputKey(
          (
            value,
          ) =>
            value +
            1,
        );
      };

    // ========================================================
    // FICHIERS
    // ========================================================

    const addFiles =
      (
        files:
          FileList |
          null,

        mode:
          "create" |
          "detail",
      ) => {
        if (
          !files
        ) {
          return;
        }

        const incoming =
          Array.from(
            files,
          );

        for (
          const file
          of incoming
        ) {
          if (
            !isAllowedFile(
              file,
            )
          ) {
            toast.error(
              `${file.name} : format non autorisé.`,
            );

            return;
          }

          if (
            file.size >
            EXPENSE_DOCUMENT_MAX_SIZE
          ) {
            toast.error(
              `${file.name} dépasse la limite de 10 Mo.`,
            );

            return;
          }
        }

        if (
          mode ===
          "create"
        ) {
          setSelectedFiles(
            (
              current,
            ) => [
              ...current,
              ...incoming,
            ],
          );
        } else {
          setDetailFiles(
            (
              current,
            ) => [
              ...current,
              ...incoming,
            ],
          );
        }
      };

    const removeCreateFile =
      (
        index:
          number,
      ) => {
        setSelectedFiles(
          (
            current,
          ) =>
            current.filter(
              (
                _,
                currentIndex,
              ) =>
                currentIndex !==
                index,
            ),
        );
      };

    const removeDetailFile =
      (
        index:
          number,
      ) => {
        setDetailFiles(
          (
            current,
          ) =>
            current.filter(
              (
                _,
                currentIndex,
              ) =>
                currentIndex !==
                index,
            ),
        );
      };

    // ========================================================
    // PROPRIETAIRE AUTO
    // ========================================================

    const handlePropertyChange =
      (
        propertyId:
          string,
      ) => {
        const property =
          (
            properties ??
            []
          ).find(
            (
              item,
            ) =>
              item.id ===
              propertyId,
          );

        setForm(
          (
            current,
          ) => ({
            ...current,

            propertyId,

            ownerId:
              property?.owner_id ??
              current.ownerId,
          }),
        );
      };

    // ========================================================
    // CREER DEPENSE
    // ========================================================

    const handleCreateExpense =
      async (
        event:
          FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        const amount =
          Number(
            form.amount,
          );

        if (
          !form.categoryId
        ) {
          toast.error(
            "Sélectionnez une catégorie.",
          );

          return;
        }

        if (
          !form.label.trim()
        ) {
          toast.error(
            "Le libellé est obligatoire.",
          );

          return;
        }

        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <= 0
        ) {
          toast.error(
            "Le montant doit être supérieur à zéro.",
          );

          return;
        }

        try {
          const result =
            await createExpense.mutateAsync(
              {
                categoryId:
                  form.categoryId,

                partyId:
                  form.partyId,

                beneficiaryName:
                  form.beneficiaryName,

                documentNumber:
                  form.documentNumber,

                expenseDate:
                  form.expenseDate,

                dueDate:
                  form.dueDate,

                label:
                  form.label,

                description:
                  form.description,

                amount,

                currency:
                  form.currency,

                propertyId:
                  form.propertyId,

                ownerId:
                  form.ownerId,

                saleId:
                  form.saleId,

                contractId:
                  form.contractId,

                maintenanceRequestId:
                  form.maintenanceRequestId,

                chargeableToOwner:
                  form.chargeableToOwner ===
                  "yes",

                notes:
                  form.notes,
              },
            );

          const expenseId =
            result?.expense_id as
              | string
              | undefined;

          if (
            expenseId &&
            selectedFiles.length >
              0
          ) {
            try {
              await uploadDocuments.mutateAsync(
                {
                  expenseId,

                  files:
                    selectedFiles,
                },
              );
            } catch (
              uploadError:
                any
            ) {
              toast.warning(
                `La dépense a été créée, mais l'envoi du justificatif a échoué : ${
                  uploadError?.message ??
                  "erreur inconnue"
                }`,
              );

              setCreateOpen(
                false,
              );

              resetCreateForm();

              return;
            }
          }

          toast.success(
            `Dépense ${
              result?.reference ??
              ""
            } créée en brouillon${
              selectedFiles.length >
              0
                ? " avec justificatif."
                : "."
            }`,
          );

          setCreateOpen(
            false,
          );

          resetCreateForm();
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ??
              "Impossible de créer la dépense.",
          );
        }
      };

    // ========================================================
    // AJOUTER DOCUMENT APRES CREATION
    // ========================================================

    const handleUploadDetailDocuments =
      async () => {
        if (
          !selectedExpense ||
          detailFiles.length ===
            0
        ) {
          return;
        }

        try {
          await uploadDocuments.mutateAsync(
            {
              expenseId:
                selectedExpense.id,

              files:
                detailFiles,
            },
          );

          toast.success(
            detailFiles.length >
              1
              ? "Justificatifs ajoutés."
              : "Justificatif ajouté.",
          );

          setDetailFiles(
            [],
          );

          setDetailFileInputKey(
            (
              value,
            ) =>
              value +
              1,
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ??
              "Impossible d'envoyer le justificatif.",
          );
        }
      };

    // ========================================================
    // OUVRIR DOCUMENT
    // ========================================================

    const handleOpenDocument =
      async (
        document:
          ExpenseDocument,
      ) => {
        try {
          setOpeningDocumentId(
            document.id,
          );

          const url =
            await createExpenseDocumentSignedUrl(
              document,
            );

          window.open(
            url,
            "_blank",
            "noopener,noreferrer",
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ??
              "Impossible d'ouvrir le justificatif.",
          );
        } finally {
          setOpeningDocumentId(
            null,
          );
        }
      };

    // ========================================================
    // CREER FOURNISSEUR
    // ========================================================

    const handleCreateParty =
      async (
        event:
          FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        if (
          !partyForm.name.trim()
        ) {
          toast.error(
            "Le nom est obligatoire.",
          );

          return;
        }

        try {
          const created =
            await createParty.mutateAsync(
              {
                partyType:
                  partyForm.partyType,

                name:
                  partyForm.name,

                companyName:
                  partyForm.companyName,

                phone:
                  partyForm.phone,

                email:
                  partyForm.email,

                address:
                  partyForm.address,

                taxNumber:
                  partyForm.taxNumber,

                notes:
                  partyForm.notes,
              },
            );

          setForm(
            (
              current,
            ) => ({
              ...current,

              partyId:
                created.id,
            }),
          );

          setPartyOpen(
            false,
          );

          setPartyForm(
            createEmptyPartyForm(),
          );

          toast.success(
            "Fournisseur / bénéficiaire créé.",
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ??
              "Impossible de créer le fournisseur.",
          );
        }
      };

    // ========================================================
    // DETAIL
    // ========================================================

    const openDetail =
      (
        expense:
          Expense,
      ) => {
        setSelectedExpenseId(
          expense.id,
        );

        setDetailFiles(
          [],
        );

        setDetailOpen(
          true,
        );
      };

    const closeDetail =
      () => {
        setDetailOpen(
          false,
        );

        setSelectedExpenseId(
          null,
        );

        setDetailFiles(
          [],
        );

        setPaymentOpen(
          false,
        );

        setApprovalOpen(
          false,
        );

        setReasonOpen(
          false,
        );
      };

    // ========================================================
    // SOUMETTRE
    // ========================================================

    const handleSubmitApproval =
      async () => {
        if (
          !selectedExpense
        ) {
          return;
        }

        try {
          await submitExpense.mutateAsync(
            selectedExpense.id,
          );

          toast.success(
            "Dépense soumise pour validation.",
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ??
              "Impossible de soumettre la dépense.",
          );
        }
      };

    // ========================================================
    // APPROUVER
    // ========================================================

    const handleApprove =
      async () => {
        if (
          !selectedExpense
        ) {
          return;
        }

        if (
          !selectedExpense
            .category_relation
            ?.accounting_account_id
        ) {
          toast.error(
            "Cette catégorie n'est associée à aucun compte comptable.",
          );

          return;
        }

        try {
          await approveExpense.mutateAsync(
            {
              expenseId:
                selectedExpense.id,

              note:
                approvalNote,
            },
          );

          setApprovalOpen(
            false,
          );

          setApprovalNote(
            "",
          );

          toast.success(
            "Dépense validée et comptabilisée. Aucun décaissement n'a encore été effectué.",
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ??
              "Impossible de valider la dépense.",
          );
        }
      };

    // ========================================================
    // REJETER / ANNULER
    // ========================================================

    const handleReasonAction =
      async () => {
        if (
          !selectedExpense
        ) {
          return;
        }

        if (
          !reason.trim()
        ) {
          toast.error(
            "Renseignez un motif.",
          );

          return;
        }

        try {
          if (
            reasonMode ===
            "reject"
          ) {
            await rejectExpense.mutateAsync(
              {
                expenseId:
                  selectedExpense.id,

                reason,
              },
            );

            toast.success(
              "Dépense rejetée.",
            );
          } else {
            await cancelExpense.mutateAsync(
              {
                expenseId:
                  selectedExpense.id,

                reason,
              },
            );

            toast.success(
              "Dépense annulée.",
            );
          }

          setReasonOpen(
            false,
          );

          setReason(
            "",
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ??
              "Opération impossible.",
          );
        }
      };

    // ========================================================
    // PAIEMENT
    // ========================================================

    const handlePayment =
      async (
        event:
          FormEvent<HTMLFormElement>,
      ) => {
        event.preventDefault();

        if (
          !selectedExpense
        ) {
          return;
        }

        const amount =
          Number(
            paymentForm.amount,
          );

        if (
          !paymentForm.treasuryAccountId
        ) {
          toast.error(
            "Sélectionnez un compte de trésorerie.",
          );

          return;
        }

        if (
          !Number.isFinite(
            amount,
          ) ||
          amount <= 0
        ) {
          toast.error(
            "Montant invalide.",
          );

          return;
        }

        if (
          amount >
          Number(
            selectedExpense.balance_due,
          )
        ) {
          toast.error(
            `Le montant dépasse le reste à payer de ${formatAmount(
              selectedExpense.balance_due,
              selectedExpense.currency,
            )}.`,
          );

          return;
        }

        try {
          const result =
            await payExpense.mutateAsync(
              {
                expenseId:
                  selectedExpense.id,

                treasuryAccountId:
                  paymentForm.treasuryAccountId,

                amount,

                paymentDate:
                  new Date(
                    paymentForm.paymentDate,
                  ).toISOString(),

                paymentMethod:
                  paymentForm.paymentMethod,

                externalReference:
                  paymentForm.externalReference,

                notes:
                  paymentForm.notes,
              },
            );

          toast.success(
            result.status ===
              "paid"
              ? "Dépense entièrement payée."
              : "Paiement partiel enregistré.",
          );

          setPaymentOpen(
            false,
          );

          setPaymentForm(
            createEmptyPaymentForm(),
          );
        } catch (
          error:
            any
        ) {
          toast.error(
            error?.message ??
              "Impossible d'enregistrer le paiement.",
          );
        }
      };

    // ========================================================
    // RENDER
    // ========================================================

    return (
      <PageShell
        title="Dépenses"
        subtitle="Dossiers, validation, paiements et rattachements immobiliers"
        actions={
          <Button
            variant="premium"
            onClick={() => {
              resetCreateForm();

              setCreateOpen(
                true,
              );
            }}
          >
            <Plus className="h-4 w-4" />

            Nouvelle dépense
          </Button>
        }
      >
        {/* ================================================= */}
        {/* KPI                                               */}
        {/* ================================================= */}

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="premium-card p-4">
            <div className="flex items-center gap-3">
              <ReceiptText className="h-5 w-5 text-primary" />

              <div>
                <p className="text-xs text-muted-foreground">
                  Dossiers
                </p>

                <p className="font-semibold text-lg">
                  {
                    totals.total
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="premium-card p-4">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-warning" />

              <div>
                <p className="text-xs text-muted-foreground">
                  À valider
                </p>

                <p className="font-semibold text-lg">
                  {
                    totals.pending
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="premium-card p-4">
            <div className="flex items-center gap-3">
              <WalletCards className="h-5 w-5 text-orange-600" />

              <div>
                <p className="text-xs text-muted-foreground">
                  Reste à payer
                </p>

                <p className="font-semibold">
                  {formatAmount(
                    totals.outstanding,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="premium-card p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" />

              <div>
                <p className="text-xs text-muted-foreground">
                  Dépenses payées
                </p>

                <p className="font-semibold">
                  {formatAmount(
                    totals.paid,
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* FILTRES                                           */}
        {/* ================================================= */}

        <div className="premium-card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

              <Input
                className="pl-9"
                placeholder="Référence, fournisseur, catégorie, bien, vente..."
                value={
                  search
                }
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target.value,
                  )
                }
              />
            </div>

            <Select
              value={
                statusFilter
              }
              onValueChange={
                setStatusFilter
              }
            >
              <SelectTrigger className="md:w-56">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Tous les statuts
                </SelectItem>

                {Object.entries(
                  statusConfig,
                ).map(
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
        {/* TABLEAU                                           */}
        {/* ================================================= */}

        {isLoading ? (
          <TableSkeleton
            rows={6}
            columns={8}
          />
        ) : filtered.length ===
          0 ? (
          <EmptyState
            icon={
              ReceiptText
            }
            title="Aucune dépense"
            description="Créez votre premier dossier de dépense."
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
                    Date
                  </TableHead>

                  <TableHead>
                    Fournisseur
                  </TableHead>

                  <TableHead>
                    Libellé
                  </TableHead>

                  <TableHead className="text-right">
                    Montant
                  </TableHead>

                  <TableHead className="text-right">
                    Reste
                  </TableHead>

                  <TableHead>
                    Statut
                  </TableHead>

                  <TableHead className="text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map(
                  (
                    expense,
                  ) => {
                    const config =
                      statusConfig[
                        expense.status
                      ];

                    return (
                      <TableRow
                        key={
                          expense.id
                        }
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          {expense.reference ??
                            "—"}
                        </TableCell>

                        <TableCell className="text-sm">
                          {formatDate(
                            expense.expense_date ??
                              expense.spent_at,
                          )}
                        </TableCell>

                        <TableCell className="text-sm">
                          {expense.party?.company_name ||
                            expense.party?.name ||
                            expense.beneficiary_name ||
                            "—"}
                        </TableCell>

                        <TableCell>
                          <p className="font-medium text-sm">
                            {
                              expense.label
                            }
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {expense.category_relation?.name ??
                              expense.category}
                          </p>
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {formatAmount(
                            expense.amount,
                            expense.currency,
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {formatAmount(
                            expense.balance_due,
                            expense.currency,
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge
                            className={
                              config.className
                            }
                          >
                            {
                              config.label
                            }
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              openDetail(
                                expense,
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
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

        {/* ================================================= */}
        {/* CREATION DEPENSE                                  */}
        {/* ================================================= */}

        <Dialog
          open={
            createOpen
          }
          onOpenChange={(
            open,
          ) => {
            setCreateOpen(
              open,
            );

            if (
              !open
            ) {
              resetCreateForm();
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto">
            <form
              onSubmit={
                handleCreateExpense
              }
            >
              <DialogHeader>
                <DialogTitle>
                  Nouveau dossier de dépense
                </DialogTitle>

                <DialogDescription>
                  La création du brouillon ne génère ni écriture comptable ni sortie de trésorerie.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-5">
                {/* CAT / DATES */}

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Catégorie *
                    </Label>

                    <Select
                      value={
                        form.categoryId
                      }
                      onValueChange={(
                        value,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            categoryId:
                              value,
                          }),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Catégorie" />
                      </SelectTrigger>

                      <SelectContent>
                        {(categories ??
                          []).map(
                          (
                            category,
                          ) => (
                            <SelectItem
                              key={
                                category.id
                              }
                              value={
                                category.id
                              }
                            >
                              {
                                category.name
                              }
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>

                    {selectedCategory && (
                      selectedCategory.accounting_account_id ? (
                        <p className="flex items-center gap-1 text-xs text-success">
                          <FileCheck2 className="h-3.5 w-3.5" />

                          Compte comptable configuré
                        </p>
                      ) : (
                        <p className="text-xs text-destructive">
                          Aucun compte comptable n'est associé à cette catégorie. Le brouillon pourra être créé, mais sa validation comptable sera bloquée.
                        </p>
                      )
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Date *
                    </Label>

                    <Input
                      type="date"
                      value={
                        form.expenseDate
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            expenseDate:
                              event.target.value,
                          }),
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Échéance
                    </Label>

                    <Input
                      type="date"
                      value={
                        form.dueDate
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            dueDate:
                              event.target.value,
                          }),
                        )
                      }
                    />
                  </div>
                </div>

                {/* FOURNISSEUR */}

                <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
                  <div className="space-y-2">
                    <Label>
                      Fournisseur / bénéficiaire
                    </Label>

                    <Select
                      value={
                        form.partyId
                      }
                      onValueChange={(
                        value,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            partyId:
                              value,
                          }),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>

                      <SelectContent>
                        {(parties ??
                          []).map(
                          (
                            party,
                          ) => (
                            <SelectItem
                              key={
                                party.id
                              }
                              value={
                                party.id
                              }
                            >
                              {party.company_name ||
                                party.name}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setPartyOpen(
                        true,
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />

                    Nouveau
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Bénéficiaire libre
                    </Label>

                    <Input
                      value={
                        form.beneficiaryName
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            beneficiaryName:
                              event.target.value,
                          }),
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      N° pièce / facture
                    </Label>

                    <Input
                      value={
                        form.documentNumber
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            documentNumber:
                              event.target.value,
                          }),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Libellé *
                  </Label>

                  <Input
                    value={
                      form.label
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          label:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Description
                  </Label>

                  <Textarea
                    rows={3}
                    value={
                      form.description
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          description:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="grid md:grid-cols-[1fr_160px] gap-4">
                  <div className="space-y-2">
                    <Label>
                      Montant *
                    </Label>

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.amount
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            amount:
                              event.target.value,
                          }),
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
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
                            current,
                          ) => ({
                            ...current,

                            currency:
                              event.target.value.toUpperCase(),
                          }),
                        )
                      }
                    />
                  </div>
                </div>

                {/* RATTACHEMENT */}

                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold mb-4">
                    Rattachement immobilier
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Select
                      value={
                        form.propertyId
                      }
                      onValueChange={
                        handlePropertyChange
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Bien" />
                      </SelectTrigger>

                      <SelectContent>
                        {(properties ??
                          []).map(
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

                    <Select
                      value={
                        form.ownerId
                      }
                      onValueChange={(
                        value,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            ownerId:
                              value,
                          }),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Propriétaire" />
                      </SelectTrigger>

                      <SelectContent>
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

                    <Select
                      value={
                        form.saleId
                      }
                      onValueChange={(
                        value,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            saleId:
                              value,
                          }),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vente" />
                      </SelectTrigger>

                      <SelectContent>
                        {(sales ??
                          []).map(
                          (
                            sale,
                          ) => (
                            <SelectItem
                              key={
                                sale.id
                              }
                              value={
                                sale.id
                              }
                            >
                              {
                                sale.reference
                              }
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>

                    <Select
                      value={
                        form.contractId
                      }
                      onValueChange={(
                        value,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            contractId:
                              value,
                          }),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Contrat / bail" />
                      </SelectTrigger>

                      <SelectContent>
                        {(leases ??
                          []).map(
                          (
                            lease,
                          ) => (
                            <SelectItem
                              key={
                                lease.id
                              }
                              value={
                                lease.id
                              }
                            >
                              {optionLabel(
                                lease,
                                "Bail",
                              )}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>

                    <Select
                      value={
                        form.maintenanceRequestId
                      }
                      onValueChange={(
                        value,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            maintenanceRequestId:
                              value,
                          }),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Maintenance" />
                      </SelectTrigger>

                      <SelectContent>
                        {(maintenanceRequests ??
                          []).map(
                          (
                            request,
                          ) => (
                            <SelectItem
                              key={
                                request.id
                              }
                              value={
                                request.id
                              }
                            >
                              {optionLabel(
                                request,
                                "Maintenance",
                              )}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>

                    <Select
                      value={
                        form.chargeableToOwner
                      }
                      onValueChange={(
                        value,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            chargeableToOwner:
                              value,
                          }),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="yes">
                          Refacturable au propriétaire
                        </SelectItem>

                        <SelectItem value="no">
                          Charge agence
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* JUSTIFICATIFS */}

                <div className="rounded-xl border p-4 space-y-4">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />

                      Justificatifs
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG ou WEBP — 10 Mo maximum par fichier.
                    </p>
                  </div>

                  <Input
                    key={
                      createFileInputKey
                    }
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(
                      event,
                    ) =>
                      addFiles(
                        event.target.files,
                        "create",
                      )
                    }
                  />

                  {selectedFiles.length >
                    0 && (
                    <div className="space-y-2">
                      {selectedFiles.map(
                        (
                          file,
                          index,
                        ) => (
                          <div
                            key={`${file.name}-${file.size}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {
                                  file.name
                                }
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(
                                  file.size,
                                )}
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                removeCreateFile(
                                  index,
                                )
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
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
                          current,
                        ) => ({
                          ...current,

                          notes:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCreateOpen(
                      false,
                    )
                  }
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={
                    createExpense.isPending ||
                    uploadDocuments.isPending
                  }
                >
                  {(createExpense.isPending ||
                    uploadDocuments.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {uploadDocuments.isPending
                    ? "Envoi du justificatif..."
                    : "Créer le brouillon"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* NOUVEAU FOURNISSEUR                              */}
        {/* ================================================= */}

        <Dialog
          open={
            partyOpen
          }
          onOpenChange={
            setPartyOpen
          }
        >
          <DialogContent className="max-w-xl">
            <form
              onSubmit={
                handleCreateParty
              }
            >
              <DialogHeader>
                <DialogTitle>
                  Fournisseur / bénéficiaire
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-5">
                <Select
                  value={
                    partyForm.partyType
                  }
                  onValueChange={(
                    value:
                      ExpensePartyType,
                  ) =>
                    setPartyForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        partyType:
                          value,
                      }),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="supplier">
                      Fournisseur
                    </SelectItem>

                    <SelectItem value="beneficiary">
                      Bénéficiaire
                    </SelectItem>

                    <SelectItem value="both">
                      Les deux
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Nom *"
                  value={
                    partyForm.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setPartyForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        name:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Input
                  placeholder="Société"
                  value={
                    partyForm.companyName
                  }
                  onChange={(
                    event,
                  ) =>
                    setPartyForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        companyName:
                          event.target.value,
                      }),
                    )
                  }
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Téléphone"
                    value={
                      partyForm.phone
                    }
                    onChange={(
                      event,
                    ) =>
                      setPartyForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          phone:
                            event.target.value,
                        }),
                      )
                    }
                  />

                  <Input
                    placeholder="Email"
                    value={
                      partyForm.email
                    }
                    onChange={(
                      event,
                    ) =>
                      setPartyForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          email:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>

                <Input
                  placeholder="NIF / identifiant fiscal"
                  value={
                    partyForm.taxNumber
                  }
                  onChange={(
                    event,
                  ) =>
                    setPartyForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        taxNumber:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Textarea
                  placeholder="Adresse"
                  value={
                    partyForm.address
                  }
                  onChange={(
                    event,
                  ) =>
                    setPartyForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        address:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPartyOpen(
                      false,
                    )
                  }
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={
                    createParty.isPending
                  }
                >
                  {createParty.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* DETAIL DEPENSE                                   */}
        {/* ================================================= */}

        <Dialog
          open={
            detailOpen
          }
          onOpenChange={(
            value,
          ) => {
            if (
              !value
            ) {
              closeDetail();
            }
          }}
        >
          <DialogContent className="max-w-6xl max-h-[94vh] overflow-y-auto">
            {expenseDetailLoading ||
            !selectedExpense ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {selectedExpense.reference ??
                      "Dépense"}
                  </DialogTitle>

                  <DialogDescription>
                    {
                      selectedExpense.label
                    }
                  </DialogDescription>
                </DialogHeader>

                {/* RESUME */}

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Montant
                    </p>

                    <p className="font-semibold">
                      {formatAmount(
                        selectedExpense.amount,
                        selectedExpense.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Payé
                    </p>

                    <p className="font-semibold text-success">
                      {formatAmount(
                        selectedExpense.amount_paid,
                        selectedExpense.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Reste
                    </p>

                    <p className="font-semibold text-orange-600">
                      {formatAmount(
                        selectedExpense.balance_due,
                        selectedExpense.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">
                      Statut
                    </p>

                    <Badge
                      className={
                        statusConfig[
                          selectedExpense.status
                        ].className
                      }
                    >
                      {
                        statusConfig[
                          selectedExpense.status
                        ].label
                      }
                    </Badge>
                  </div>
                </div>

                {/* ALERTE COMPTABLE */}

                {!selectedExpense
                  .category_relation
                  ?.accounting_account_id && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                    <strong className="text-destructive">
                      Configuration comptable manquante.
                    </strong>

                    <p className="mt-1 text-muted-foreground">
                      La catégorie «{" "}
                      {selectedExpense.category_relation?.name ??
                        selectedExpense.category}{" "}
                      » ne possède actuellement aucun compte comptable. La validation sera bloquée tant que ce rattachement n'est pas configuré.
                    </p>
                  </div>
                )}

                {/* ACTIONS */}

                <div className="flex flex-wrap gap-2 rounded-xl border p-4">
                  {selectedExpense.status ===
                    "draft" && (
                    <>
                      <Button
                        onClick={
                          handleSubmitApproval
                        }
                        disabled={
                          submitExpense.isPending
                        }
                      >
                        <Send className="h-4 w-4" />

                        Soumettre
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => {
                          setReasonMode(
                            "cancel",
                          );

                          setReasonOpen(
                            true,
                          );
                        }}
                      >
                        <Ban className="h-4 w-4" />

                        Annuler
                      </Button>
                    </>
                  )}

                  {selectedExpense.status ===
                    "pending_approval" && (
                    <>
                      <Button
                        onClick={() =>
                          setApprovalOpen(
                            true,
                          )
                        }
                        disabled={
                          !selectedExpense
                            .category_relation
                            ?.accounting_account_id
                        }
                      >
                        <BadgeCheck className="h-4 w-4" />

                        Valider
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => {
                          setReasonMode(
                            "reject",
                          );

                          setReasonOpen(
                            true,
                          );
                        }}
                      >
                        <XCircle className="h-4 w-4" />

                        Rejeter
                      </Button>
                    </>
                  )}

                  {(selectedExpense.status ===
                    "approved" ||
                    selectedExpense.status ===
                      "partially_paid") && (
                    <Button
                      onClick={() => {
                        setPaymentForm({
                          ...createEmptyPaymentForm(),

                          amount:
                            String(
                              selectedExpense.balance_due,
                            ),
                        });

                        setPaymentOpen(
                          true,
                        );
                      }}
                    >
                      <CircleDollarSign className="h-4 w-4" />

                      Enregistrer un paiement
                    </Button>
                  )}
                </div>

                {/* INFORMATIONS */}

                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-4">
                    <h3 className="font-semibold mb-3">
                      Informations
                    </h3>

                    <div className="space-y-2 text-sm">
                      <p>
                        Date :{" "}
                        <strong>
                          {formatDate(
                            selectedExpense.expense_date,
                          )}
                        </strong>
                      </p>

                      <p>
                        Échéance :{" "}
                        <strong>
                          {formatDate(
                            selectedExpense.due_date,
                          )}
                        </strong>
                      </p>

                      <p>
                        N° pièce :{" "}
                        <strong>
                          {selectedExpense.document_number ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Catégorie :{" "}
                        <strong>
                          {selectedExpense.category_relation?.name ??
                            selectedExpense.category}
                        </strong>
                      </p>

                      <p>
                        Fournisseur :{" "}
                        <strong>
                          {selectedExpense.party?.company_name ||
                            selectedExpense.party?.name ||
                            selectedExpense.beneficiary_name ||
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Refacturable propriétaire :{" "}
                        <strong>
                          {selectedExpense.chargeable_to_owner
                            ? "Oui"
                            : "Non"}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <h3 className="font-semibold mb-3">
                      Rattachements
                    </h3>

                    <div className="space-y-2 text-sm">
                      <p>
                        Bien :{" "}
                        <strong>
                          {selectedExpense.property?.title ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Propriétaire :{" "}
                        <strong>
                          {selectedExpense.owner?.full_name ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Vente :{" "}
                        <strong>
                          {selectedExpense.sale?.reference ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Contrat :{" "}
                        <strong>
                          {selectedExpense.contract_id ??
                            "—"}
                        </strong>
                      </p>

                      <p>
                        Maintenance :{" "}
                        <strong>
                          {selectedExpense.maintenance_request
                            ? optionLabel(
                                selectedExpense.maintenance_request,
                                "Maintenance",
                              )
                            : "—"}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* JUSTIFICATIFS */}

                <div className="rounded-xl border p-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />

                      Justificatifs
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      Documents stockés dans l'espace sécurisé Supabase.
                    </p>
                  </div>

                  {(selectedExpense.documents ??
                    []).length ===
                    0 &&
                  !selectedExpense.receipt_url ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Aucun justificatif enregistré.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {(selectedExpense.documents ??
                        []).map(
                        (
                          document,
                        ) => (
                          <div
                            key={
                              document.id
                            }
                            className="flex items-center justify-between gap-3 rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="rounded-lg bg-muted p-2">
                                <FileText className="h-4 w-4" />
                              </div>

                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {
                                    document.file_name
                                  }
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(
                                    document.file_size,
                                  )}

                                  {" · "}

                                  {formatDateTime(
                                    document.created_at,
                                  )}
                                </p>
                              </div>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                openingDocumentId ===
                                document.id
                              }
                              onClick={() =>
                                handleOpenDocument(
                                  document,
                                )
                              }
                            >
                              {openingDocumentId ===
                              document.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}

                              Ouvrir
                            </Button>
                          </div>
                        ),
                      )}

                      {selectedExpense.receipt_url && (
                        <a
                          href={
                            selectedExpense.receipt_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/40"
                        >
                          <ExternalLink className="h-4 w-4" />

                          Ancien justificatif externe
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-5 rounded-lg border border-dashed p-4">
                    <Label className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4" />

                      Ajouter un justificatif
                    </Label>

                    <Input
                      key={
                        detailFileInputKey
                      }
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(
                        event,
                      ) =>
                        addFiles(
                          event.target.files,
                          "detail",
                        )
                      }
                    />

                    {detailFiles.length >
                      0 && (
                      <div className="mt-3 space-y-2">
                        {detailFiles.map(
                          (
                            file,
                            index,
                          ) => (
                            <div
                              key={`${file.name}-${file.size}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm truncate">
                                  {
                                    file.name
                                  }
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(
                                    file.size,
                                  )}
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  removeDetailFile(
                                    index,
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ),
                        )}

                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            uploadDocuments.isPending
                          }
                          onClick={
                            handleUploadDetailDocuments
                          }
                        >
                          {uploadDocuments.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}

                          Envoyer
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* PAIEMENTS */}

                <div className="rounded-xl border overflow-hidden">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">
                      Paiements
                    </h3>
                  </div>

                  {(selectedExpense.payments ??
                    []).length ===
                  0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      Aucun paiement.
                    </p>
                  ) : (
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

                          <TableHead>
                            Moyen
                          </TableHead>

                          <TableHead className="text-right">
                            Montant
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {selectedExpense.payments?.map(
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
                                  payment.payment_date,
                                )}
                              </TableCell>

                              <TableCell>
                                {
                                  payment.reference
                                }
                              </TableCell>

                              <TableCell>
                                {payment.treasury_account?.name ??
                                  "—"}
                              </TableCell>

                              <TableCell>
                                {paymentMethodLabel(
                                  payment.payment_method,
                                )}
                              </TableCell>

                              <TableCell className="text-right font-medium">
                                {formatAmount(
                                  payment.amount,
                                  payment.currency,
                                )}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* COMPTABILITE */}

                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ReceiptText className="h-4 w-4" />

                    Écritures comptables
                  </h3>

                  {accountingLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-5 mt-4">
                      {(accounting?.entries ??
                        []).length ===
                      0 ? (
                        <p className="text-sm text-muted-foreground">
                          Aucune écriture comptable. C'est normal pour un brouillon ou une dépense en attente de validation.
                        </p>
                      ) : (
                        accounting?.entries.map(
                          (
                            entry,
                          ) => {
                            const lines =
                              accounting.lines.filter(
                                (
                                  line,
                                ) =>
                                  line.entry_id ===
                                  entry.id,
                              );

                            return (
                              <div
                                key={
                                  entry.id
                                }
                                className="rounded-lg border overflow-hidden"
                              >
                                <div className="p-3 bg-muted/30 text-sm">
                                  <strong>
                                    {
                                      entry.reference
                                    }
                                  </strong>

                                  {" — "}

                                  {
                                    entry.label
                                  }

                                  {" — "}

                                  {entry.journal
                                    ? `${entry.journal.code} - ${entry.journal.name}`
                                    : ""}
                                </div>

                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>
                                        Compte
                                      </TableHead>

                                      <TableHead>
                                        Libellé
                                      </TableHead>

                                      <TableHead className="text-right">
                                        Débit
                                      </TableHead>

                                      <TableHead className="text-right">
                                        Crédit
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>

                                  <TableBody>
                                    {lines.map(
                                      (
                                        line,
                                      ) => (
                                        <TableRow
                                          key={
                                            line.id
                                          }
                                        >
                                          <TableCell>
                                            <strong>
                                              {line.account?.code ??
                                                "—"}
                                            </strong>

                                            <p className="text-xs text-muted-foreground">
                                              {line.account?.name ??
                                                ""}
                                            </p>
                                          </TableCell>

                                          <TableCell>
                                            {
                                              line.label
                                            }
                                          </TableCell>

                                          <TableCell className="text-right">
                                            {Number(
                                              line.debit,
                                            ) >
                                            0
                                              ? formatAmount(
                                                  line.debit,
                                                  entry.currency,
                                                )
                                              : "—"}
                                          </TableCell>

                                          <TableCell className="text-right">
                                            {Number(
                                              line.credit,
                                            ) >
                                            0
                                              ? formatAmount(
                                                  line.credit,
                                                  entry.currency,
                                                )
                                              : "—"}
                                          </TableCell>
                                        </TableRow>
                                      ),
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            );
                          },
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* HISTORIQUE */}

                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="h-4 w-4" />

                    Historique
                  </h3>

                  <div className="mt-4 space-y-3">
                    {(selectedExpense.status_history ??
                      []).map(
                      (
                        history,
                      ) => (
                        <div
                          key={
                            history.id
                          }
                          className="border-l-2 pl-3"
                        >
                          <p className="text-sm font-medium">
                            {
                              statusConfig[
                                history.new_status
                              ].label
                            }
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(
                              history.created_at,
                            )}
                          </p>

                          {history.note && (
                            <p className="text-sm mt-1">
                              {
                                history.note
                              }
                            </p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={
                      closeDetail
                    }
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* VALIDATION                                       */}
        {/* ================================================= */}

        <Dialog
          open={
            approvalOpen
          }
          onOpenChange={
            setApprovalOpen
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Valider la dépense
              </DialogTitle>

              <DialogDescription>
                La validation comptabilise la charge et la dette fournisseur, mais ne retire aucun argent de la trésorerie.
              </DialogDescription>
            </DialogHeader>

            <Textarea
              rows={4}
              placeholder="Note de validation"
              value={
                approvalNote
              }
              onChange={(
                event,
              ) =>
                setApprovalNote(
                  event.target.value,
                )
              }
            />

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setApprovalOpen(
                    false,
                  )
                }
              >
                Annuler
              </Button>

              <Button
                onClick={
                  handleApprove
                }
                disabled={
                  approveExpense.isPending ||
                  !selectedExpense
                    ?.category_relation
                    ?.accounting_account_id
                }
              >
                {approveExpense.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Valider et comptabiliser
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* REJET / ANNULATION                               */}
        {/* ================================================= */}

        <Dialog
          open={
            reasonOpen
          }
          onOpenChange={
            setReasonOpen
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reasonMode ===
                "reject"
                  ? "Rejeter la dépense"
                  : "Annuler la dépense"}
              </DialogTitle>
            </DialogHeader>

            <Textarea
              rows={4}
              placeholder="Motif obligatoire"
              value={
                reason
              }
              onChange={(
                event,
              ) =>
                setReason(
                  event.target.value,
                )
              }
            />

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setReasonOpen(
                    false,
                  )
                }
              >
                Retour
              </Button>

              <Button
                variant="destructive"
                onClick={
                  handleReasonAction
                }
                disabled={
                  rejectExpense.isPending ||
                  cancelExpense.isPending
                }
              >
                {(rejectExpense.isPending ||
                  cancelExpense.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================================================= */}
        {/* PAIEMENT                                         */}
        {/* ================================================= */}

        <Dialog
          open={
            paymentOpen
          }
          onOpenChange={
            setPaymentOpen
          }
        >
          <DialogContent className="max-w-xl">
            <form
              onSubmit={
                handlePayment
              }
            >
              <DialogHeader>
                <DialogTitle>
                  Paiement de la dépense
                </DialogTitle>

                <DialogDescription>
                  Le paiement diminue la dette fournisseur et le compte de trésorerie choisi.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-5">
                {selectedExpense && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      Reste à payer
                    </p>

                    <p className="font-semibold">
                      {formatAmount(
                        selectedExpense.balance_due,
                        selectedExpense.currency,
                      )}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>
                    Compte de trésorerie *
                  </Label>

                  <Select
                    value={
                      paymentForm.treasuryAccountId
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setPaymentForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          treasuryAccountId:
                            value,
                        }),
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Caisse / Banque / Mobile Money" />
                    </SelectTrigger>

                    <SelectContent>
                      {(treasuryAccounts ??
                        []).map(
                        (
                          account,
                        ) => (
                          <SelectItem
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                          >
                            {account.name} —{" "}
                            {
                              account.currency
                            }
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Montant *
                  </Label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      paymentForm.amount
                    }
                    onChange={(
                      event,
                    ) =>
                      setPaymentForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          amount:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Date
                  </Label>

                  <Input
                    type="datetime-local"
                    value={
                      paymentForm.paymentDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setPaymentForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          paymentDate:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Moyen de paiement
                  </Label>

                  <Select
                    value={
                      paymentForm.paymentMethod
                    }
                    onValueChange={(
                      value,
                    ) =>
                      setPaymentForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          paymentMethod:
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
                        Carte
                      </SelectItem>

                      <SelectItem value="other">
                        Autre
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  placeholder="Référence externe"
                  value={
                    paymentForm.externalReference
                  }
                  onChange={(
                    event,
                  ) =>
                    setPaymentForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        externalReference:
                          event.target.value,
                      }),
                    )
                  }
                />

                <Textarea
                  rows={3}
                  placeholder="Notes"
                  value={
                    paymentForm.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setPaymentForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        notes:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPaymentOpen(
                      false,
                    )
                  }
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={
                    payExpense.isPending
                  }
                >
                  {payExpense.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  Enregistrer le paiement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageShell>
    );
  };

export default ExpensesPage;