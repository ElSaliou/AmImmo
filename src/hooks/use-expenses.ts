import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

// ============================================================
// CONSTANTES
// ============================================================

export const EXPENSE_DOCUMENTS_BUCKET =
  "expense-documents";

export const EXPENSE_DOCUMENT_MAX_SIZE =
  10 * 1024 * 1024;

export const EXPENSE_DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// ============================================================
// TYPES
// ============================================================

export type ExpenseStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "partially_paid"
  | "paid"
  | "rejected"
  | "cancelled";

export type ExpensePartyType =
  | "supplier"
  | "beneficiary"
  | "both";

export interface ExpenseCategory {
  id: string;
  name: string;
  slug: string;

  accounting_account_id:
    string | null;

  active: boolean;
}

export interface ExpenseParty {
  id: string;

  party_type:
    ExpensePartyType;

  name: string;

  company_name:
    string | null;

  phone:
    string | null;

  email:
    string | null;

  address:
    string | null;

  tax_number:
    string | null;

  bank_details:
    string | null;

  mobile_money_details:
    string | null;

  notes:
    string;

  active:
    boolean;

  created_at:
    string;
}

export interface ExpenseTreasuryAccount {
  id: string;
  name: string;
  code: string;
  account_type: string;
  currency: string;
  active: boolean;
}

export interface ExpensePayment {
  id: string;

  expense_id: string;
  treasury_account_id: string;

  amount: number;
  currency: string;

  payment_date: string;
  payment_method: string;

  reference: string;

  external_reference:
    string | null;

  notes: string;

  accounting_entry_id:
    string;

  created_at: string;

  treasury_account?: {
    id: string;
    name: string;
    code: string;
    account_type: string;
  } | null;
}

export interface ExpenseDocument {
  id: string;
  expense_id: string;

  file_name: string;
  storage_path: string;

  mime_type:
    string | null;

  file_size:
    number | null;

  document_type:
    string;

  created_at: string;
}

export interface ExpenseStatusHistory {
  id: string;
  expense_id: string;

  old_status:
    ExpenseStatus | null;

  new_status:
    ExpenseStatus;

  note:
    string | null;

  created_at: string;
}

export interface Expense {
  id: string;

  organization_id:
    string | null;

  reference:
    string | null;

  document_number:
    string | null;

  expense_date:
    string | null;

  spent_at:
    string;

  due_date:
    string | null;

  category:
    string;

  category_id:
    string | null;

  party_id:
    string | null;

  beneficiary_name:
    string | null;

  label:
    string;

  description:
    string | null;

  amount:
    number;

  currency:
    string;

  amount_paid:
    number;

  balance_due:
    number;

  status:
    ExpenseStatus;

  property_id:
    string | null;

  owner_id:
    string | null;

  sale_id:
    string | null;

  contract_id:
    string | null;

  maintenance_request_id:
    string | null;

  // Legacy : conservé pour compatibilité
  receipt_url:
    string | null;

  chargeable_to_owner:
    boolean;

  notes:
    string;

  accounting_entry_id:
    string | null;

  approved_at:
    string | null;

  rejected_at:
    string | null;

  rejection_reason:
    string | null;

  cancelled_at:
    string | null;

  cancellation_reason:
    string | null;

  created_at:
    string;

  updated_at:
    string | null;

  category_relation?: {
    id: string;
    name: string;
    slug: string;

    accounting_account_id:
      string | null;
  } | null;

  party?:
    ExpenseParty | null;

  property?: {
    id: string;
    title: string;
  } | null;

  owner?: {
    id: string;
    full_name: string;
  } | null;

  sale?: {
    id: string;
    reference: string;
    buyer_name: string;
    status: string;
  } | null;

  maintenance_request?: {
    id: string;
    [key: string]: any;
  } | null;

  payments?:
    ExpensePayment[];

  documents?:
    ExpenseDocument[];

  status_history?:
    ExpenseStatusHistory[];
}

// ============================================================
// COMPTABILITE
// ============================================================

export interface ExpenseAccountingEntry {
  id: string;

  reference: string;
  entry_date: string;

  label: string;
  status: string;
  currency: string;

  notes: string;

  journal?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface ExpenseAccountingLine {
  id: string;

  entry_id: string;
  account_id: string;

  label: string;

  debit: number;
  credit: number;

  account?: {
    id: string;
    code: string;
    name: string;
    account_type: string;
  } | null;
}

export interface ExpenseAccountingBundle {
  entries:
    ExpenseAccountingEntry[];

  lines:
    ExpenseAccountingLine[];
}

// ============================================================
// RATTACHEMENTS
// ============================================================

export interface ExpensePropertyOption {
  id: string;
  title: string;

  reference?:
    string | null;

  owner_id?:
    string | null;
}

export interface ExpenseOwnerOption {
  id: string;
  full_name: string;
}

export interface ExpenseSaleOption {
  id: string;
  reference: string;

  buyer_name?:
    string | null;

  property_id?:
    string | null;
}

export interface ExpenseLeaseOption {
  id: string;
  [key: string]: any;
}

export interface ExpenseMaintenanceOption {
  id: string;
  [key: string]: any;
}

// ============================================================
// INPUTS
// ============================================================

export interface CreateExpenseInput {
  categoryId: string;

  partyId?: string;
  beneficiaryName?: string;

  documentNumber?: string;

  expenseDate: string;
  dueDate?: string;

  label: string;
  description?: string;

  amount: number;
  currency?: string;

  propertyId?: string;
  ownerId?: string;
  saleId?: string;

  contractId?: string;

  maintenanceRequestId?: string;

  chargeableToOwner?: boolean;

  notes?: string;
}

export interface CreateExpensePartyInput {
  partyType:
    ExpensePartyType;

  name: string;

  companyName?: string;
  phone?: string;
  email?: string;

  address?: string;

  taxNumber?: string;

  bankDetails?: string;
  mobileMoneyDetails?: string;

  notes?: string;
}

export interface PayExpenseInput {
  expenseId: string;

  treasuryAccountId: string;

  amount: number;

  paymentDate: string;

  paymentMethod?: string;

  externalReference?: string;

  notes?: string;
}

export interface UploadExpenseDocumentsInput {
  expenseId: string;

  files:
    File[];

  documentType?:
    string;
}

// ============================================================
// KEYS
// ============================================================

const EXPENSES_KEY =
  "expenses";

const EXPENSE_PARTIES_KEY =
  "expense-parties";

const EXPENSE_CATEGORIES_KEY =
  "expense-categories";

const EXPENSE_ACCOUNTING_KEY =
  "expense-accounting";

const TREASURY_KEY =
  "treasury-account-balances";

// ============================================================
// HELPERS DOCUMENTS
// ============================================================

const getRandomId =
  () => {
    if (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  };

const sanitizeFileName =
  (
    fileName:
      string,
  ) => {
    const normalized =
      fileName
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          "",
        )
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "-",
        )
        .replace(
          /-+/g,
          "-",
        );

    return (
      normalized ||
      "document"
    );
  };

const validateExpenseDocument =
  (
    file:
      File,
  ) => {
    if (
      file.size >
      EXPENSE_DOCUMENT_MAX_SIZE
    ) {
      throw new Error(
        `${file.name} dépasse la taille maximale de 10 Mo.`,
      );
    }

    if (
      file.type &&
      !EXPENSE_DOCUMENT_ALLOWED_TYPES.includes(
        file.type,
      )
    ) {
      throw new Error(
        `${file.name} : format non autorisé. Utilisez PDF, JPG, PNG ou WEBP.`,
      );
    }
  };

export const createExpenseDocumentSignedUrl =
  async (
    document:
      ExpenseDocument,

    expiresIn =
      300,
  ) => {
    const {
      data,
      error,
    } = await supabase.storage
      .from(
        EXPENSE_DOCUMENTS_BUCKET,
      )
      .createSignedUrl(
        document.storage_path,
        expiresIn,
      );

    if (
      error
    ) {
      throw error;
    }

    if (
      !data?.signedUrl
    ) {
      throw new Error(
        "Impossible de générer le lien du justificatif.",
      );
    }

    return data.signedUrl;
  };

// ============================================================
// INVALIDATION
// ============================================================

const invalidateExpenseQueries =
  async (
    qc:
      ReturnType<
        typeof useQueryClient
      >,
  ) => {
    await Promise.all([
      qc.invalidateQueries({
        queryKey: [
          EXPENSES_KEY,
        ],
      }),

      qc.invalidateQueries({
        queryKey: [
          EXPENSE_PARTIES_KEY,
        ],
      }),

      qc.invalidateQueries({
        queryKey: [
          EXPENSE_ACCOUNTING_KEY,
        ],
      }),

      qc.invalidateQueries({
        queryKey: [
          TREASURY_KEY,
        ],
      }),

      qc.invalidateQueries({
        queryKey: [
          "treasury-journal",
        ],
      }),

      qc.invalidateQueries({
        queryKey: [
          "finance-transactions",
        ],
      }),
    ]);
  };

// ============================================================
// LISTE DEPENSES
// ============================================================

export const useExpenses =
  () =>
    useQuery({
      queryKey: [
        EXPENSES_KEY,
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "expenses",
            )
            .select(`
              *,
              category_relation:finance_expense_categories(
                id,
                name,
                slug,
                accounting_account_id
              ),
              party:expense_parties(
                *
              ),
              property:properties(
                id,
                title
              ),
              owner:owners(
                id,
                full_name
              ),
              sale:sales(
                id,
                reference,
                buyer_name,
                status
              )
            `)
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as Expense[];
        },
    });

// ============================================================
// DETAIL DEPENSE
// ============================================================

export const useExpense =
  (
    expenseId:
      string | null,
  ) =>
    useQuery({
      queryKey: [
        EXPENSES_KEY,
        expenseId,
      ],

      enabled:
        Boolean(
          expenseId,
        ),

      queryFn:
        async () => {
          if (
            !expenseId
          ) {
            return null;
          }

          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "expenses",
            )
            .select(`
              *,
              category_relation:finance_expense_categories(
                id,
                name,
                slug,
                accounting_account_id
              ),
              party:expense_parties(
                *
              ),
              property:properties(
                id,
                title
              ),
              owner:owners(
                id,
                full_name
              ),
              sale:sales(
                id,
                reference,
                buyer_name,
                status
              ),
              maintenance_request:maintenance_requests(
                *
              ),
              payments:expense_payments(
                *,
                treasury_account:treasury_accounts(
                  id,
                  name,
                  code,
                  account_type
                )
              ),
              documents:expense_documents(
                *
              ),
              status_history:expense_status_history(
                *
              )
            `)
            .eq(
              "id",
              expenseId,
            )
            .single();

          if (
            error
          ) {
            throw error;
          }

          const expense =
            data as Expense;

          expense.payments =
            [
              ...(
                expense.payments ??
                []
              ),
            ].sort(
              (
                a,
                b,
              ) =>
                new Date(
                  b.payment_date,
                ).getTime() -
                new Date(
                  a.payment_date,
                ).getTime(),
            );

          expense.documents =
            [
              ...(
                expense.documents ??
                []
              ),
            ].sort(
              (
                a,
                b,
              ) =>
                new Date(
                  b.created_at,
                ).getTime() -
                new Date(
                  a.created_at,
                ).getTime(),
            );

          expense.status_history =
            [
              ...(
                expense.status_history ??
                []
              ),
            ].sort(
              (
                a,
                b,
              ) =>
                new Date(
                  b.created_at,
                ).getTime() -
                new Date(
                  a.created_at,
                ).getTime(),
            );

          return expense;
        },
    });

// ============================================================
// UPLOAD JUSTIFICATIFS
// ============================================================

export const useUploadExpenseDocuments =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            UploadExpenseDocumentsInput,
        ) => {
          if (
            !input.expenseId
          ) {
            throw new Error(
              "Dépense introuvable.",
            );
          }

          if (
            !input.files.length
          ) {
            return [] as ExpenseDocument[];
          }

          input.files.forEach(
            validateExpenseDocument,
          );

          const createdDocuments:
            ExpenseDocument[] =
            [];

          const uploadedPaths:
            string[] =
            [];

          try {
            for (
              const file
              of input.files
            ) {
              const cleanName =
                sanitizeFileName(
                  file.name,
                );

              const storagePath =
                `${input.expenseId}/${getRandomId()}-${cleanName}`;

              const {
                error:
                  uploadError,
              } =
                await supabase.storage
                  .from(
                    EXPENSE_DOCUMENTS_BUCKET,
                  )
                  .upload(
                    storagePath,
                    file,
                    {
                      cacheControl:
                        "3600",

                      upsert:
                        false,

                      contentType:
                        file.type ||
                        undefined,
                    },
                  );

              if (
                uploadError
              ) {
                throw uploadError;
              }

              uploadedPaths.push(
                storagePath,
              );

              const {
                data:
                  insertedDocument,
                error:
                  insertError,
              } = await (
                supabase as any
              )
                .from(
                  "expense_documents",
                )
                .insert({
                  expense_id:
                    input.expenseId,

                  file_name:
                    file.name,

                  storage_path:
                    storagePath,

                  mime_type:
                    file.type ||
                    null,

                  file_size:
                    file.size,

                  document_type:
                    input.documentType ||
                    "supporting_document",
                })
                .select()
                .single();

              if (
                insertError
              ) {
                await supabase.storage
                  .from(
                    EXPENSE_DOCUMENTS_BUCKET,
                  )
                  .remove([
                    storagePath,
                  ]);

                throw insertError;
              }

              createdDocuments.push(
                insertedDocument as ExpenseDocument,
              );
            }

            return createdDocuments;
          } catch (
            error
          ) {
            if (
              createdDocuments.length >
              0
            ) {
              await (
                supabase as any
              )
                .from(
                  "expense_documents",
                )
                .delete()
                .in(
                  "id",
                  createdDocuments.map(
                    (
                      item,
                    ) =>
                      item.id,
                  ),
                );
            }

            if (
              uploadedPaths.length >
              0
            ) {
              await supabase.storage
                .from(
                  EXPENSE_DOCUMENTS_BUCKET,
                )
                .remove(
                  uploadedPaths,
                );
            }

            throw error;
          }
        },

      onSuccess:
        async () => {
          await invalidateExpenseQueries(
            qc,
          );
        },
    });
  };

// ============================================================
// COMPTABILITE DEPENSE
// ============================================================

export const useExpenseAccounting =
  (
    expenseId:
      string | null,
  ) =>
    useQuery({
      queryKey: [
        EXPENSE_ACCOUNTING_KEY,
        expenseId,
      ],

      enabled:
        Boolean(
          expenseId,
        ),

      queryFn:
        async () => {
          if (
            !expenseId
          ) {
            return {
              entries:
                [],
              lines:
                [],
            } satisfies ExpenseAccountingBundle;
          }

          const {
            data:
              expense,
            error:
              expenseError,
          } = await (
            supabase as any
          )
            .from(
              "expenses",
            )
            .select(
              "id, accounting_entry_id",
            )
            .eq(
              "id",
              expenseId,
            )
            .single();

          if (
            expenseError
          ) {
            throw expenseError;
          }

          const {
            data:
              payments,
            error:
              paymentsError,
          } = await (
            supabase as any
          )
            .from(
              "expense_payments",
            )
            .select(
              "accounting_entry_id",
            )
            .eq(
              "expense_id",
              expenseId,
            );

          if (
            paymentsError
          ) {
            throw paymentsError;
          }

          const ids =
            Array.from(
              new Set(
                [
                  expense
                    ?.accounting_entry_id,

                  ...(
                    payments ??
                    []
                  ).map(
                    (
                      payment:
                        any,
                    ) =>
                      payment.accounting_entry_id,
                  ),
                ].filter(
                  Boolean,
                ),
              ),
            ) as string[];

          if (
            ids.length ===
            0
          ) {
            return {
              entries:
                [],
              lines:
                [],
            } satisfies ExpenseAccountingBundle;
          }

          const {
            data:
              entries,
            error:
              entriesError,
          } = await (
            supabase as any
          )
            .from(
              "accounting_entries",
            )
            .select(`
              *,
              journal:accounting_journals(
                id,
                code,
                name
              )
            `)
            .in(
              "id",
              ids,
            )
            .order(
              "entry_date",
              {
                ascending:
                  false,
              },
            );

          if (
            entriesError
          ) {
            throw entriesError;
          }

          const {
            data:
              lines,
            error:
              linesError,
          } = await (
            supabase as any
          )
            .from(
              "accounting_entry_lines",
            )
            .select(`
              *,
              account:accounting_accounts(
                id,
                code,
                name,
                account_type
              )
            `)
            .in(
              "entry_id",
              ids,
            );

          if (
            linesError
          ) {
            throw linesError;
          }

          return {
            entries:
              (
                entries ??
                []
              ) as ExpenseAccountingEntry[],

            lines:
              (
                lines ??
                []
              ) as ExpenseAccountingLine[],
          } satisfies ExpenseAccountingBundle;
        },
    });

// ============================================================
// CATEGORIES
// ============================================================

export const useExpenseCategories =
  () =>
    useQuery({
      queryKey: [
        EXPENSE_CATEGORIES_KEY,
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "finance_expense_categories",
            )
            .select(
              "*",
            )
            .eq(
              "active",
              true,
            )
            .order(
              "name",
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as ExpenseCategory[];
        },
    });

// ============================================================
// FOURNISSEURS / BENEFICIAIRES
// ============================================================

export const useExpenseParties =
  () =>
    useQuery({
      queryKey: [
        EXPENSE_PARTIES_KEY,
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "expense_parties",
            )
            .select(
              "*",
            )
            .eq(
              "active",
              true,
            )
            .order(
              "name",
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as ExpenseParty[];
        },
    });

export const useCreateExpenseParty =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            CreateExpensePartyInput,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "expense_parties",
            )
            .insert({
              party_type:
                input.partyType,

              name:
                input.name.trim(),

              company_name:
                input.companyName?.trim() ||
                null,

              phone:
                input.phone?.trim() ||
                null,

              email:
                input.email?.trim() ||
                null,

              address:
                input.address?.trim() ||
                null,

              tax_number:
                input.taxNumber?.trim() ||
                null,

              bank_details:
                input.bankDetails?.trim() ||
                null,

              mobile_money_details:
                input.mobileMoneyDetails?.trim() ||
                null,

              notes:
                input.notes?.trim() ||
                "",
            })
            .select()
            .single();

          if (
            error
          ) {
            throw error;
          }

          return data as ExpenseParty;
        },

      onSuccess:
        async () => {
          await qc.invalidateQueries({
            queryKey: [
              EXPENSE_PARTIES_KEY,
            ],
          });
        },
    });
  };

// ============================================================
// TRESORERIE
// ============================================================

export const useExpenseTreasuryAccounts =
  () =>
    useQuery({
      queryKey: [
        "expense-treasury-accounts",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "treasury_accounts",
            )
            .select(
              "*",
            )
            .eq(
              "active",
              true,
            )
            .order(
              "name",
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as ExpenseTreasuryAccount[];
        },
    });

// ============================================================
// RATTACHEMENTS
// ============================================================

export const useExpenseProperties =
  () =>
    useQuery({
      queryKey: [
        "expense-properties",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "properties",
            )
            .select(
              "id, title, reference, owner_id",
            )
            .order(
              "title",
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as ExpensePropertyOption[];
        },
    });

export const useExpenseOwners =
  () =>
    useQuery({
      queryKey: [
        "expense-owners",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "owners",
            )
            .select(
              "id, full_name",
            )
            .order(
              "full_name",
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as ExpenseOwnerOption[];
        },
    });

export const useExpenseSales =
  () =>
    useQuery({
      queryKey: [
        "expense-sales",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "sales",
            )
            .select(
              "id, reference, buyer_name, property_id",
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as ExpenseSaleOption[];
        },
    });

export const useExpenseLeases =
  () =>
    useQuery({
      queryKey: [
        "expense-leases",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "leases",
            )
            .select(
              "*",
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as ExpenseLeaseOption[];
        },
    });

export const useExpenseMaintenanceRequests =
  () =>
    useQuery({
      queryKey: [
        "expense-maintenance",
      ],

      queryFn:
        async () => {
          const {
            data,
            error,
          } = await (
            supabase as any
          )
            .from(
              "maintenance_requests",
            )
            .select(
              "*",
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              },
            );

          if (
            error
          ) {
            throw error;
          }

          return (
            data ??
            []
          ) as ExpenseMaintenanceOption[];
        },
    });

// ============================================================
// CREER DEPENSE
// ============================================================

export const useCreateExpense =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            CreateExpenseInput,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "create_expense",
            {
              p_category_id:
                input.categoryId,

              p_party_id:
                input.partyId ||
                null,

              p_beneficiary_name:
                input.beneficiaryName?.trim() ||
                null,

              p_document_number:
                input.documentNumber?.trim() ||
                null,

              p_expense_date:
                input.expenseDate,

              p_due_date:
                input.dueDate ||
                null,

              p_label:
                input.label.trim(),

              p_description:
                input.description?.trim() ||
                null,

              p_amount:
                input.amount,

              p_currency:
                input.currency ||
                "GNF",

              p_property_id:
                input.propertyId ||
                null,

              p_owner_id:
                input.ownerId ||
                null,

              p_sale_id:
                input.saleId ||
                null,

              p_contract_id:
                input.contractId ||
                null,

              p_maintenance_request_id:
                input.maintenanceRequestId ||
                null,

              p_notes:
                input.notes?.trim() ||
                null,
            },
          );

          if (
            error
          ) {
            throw error;
          }

          const expenseId =
            data?.expense_id as
              | string
              | undefined;

          if (
            expenseId
          ) {
            const {
              error:
                updateError,
            } = await (
              supabase as any
            )
              .from(
                "expenses",
              )
              .update({
                chargeable_to_owner:
                  input.chargeableToOwner ??
                  true,
              })
              .eq(
                "id",
                expenseId,
              );

            if (
              updateError
            ) {
              throw updateError;
            }
          }

          return data;
        },

      onSuccess:
        async () => {
          await invalidateExpenseQueries(
            qc,
          );
        },
    });
  };

// ============================================================
// SOUMETTRE
// ============================================================

export const useSubmitExpense =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          expenseId:
            string,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "submit_expense_for_approval",
            {
              p_expense_id:
                expenseId,
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data;
        },

      onSuccess:
        async () => {
          await invalidateExpenseQueries(
            qc,
          );
        },
    });
  };

// ============================================================
// APPROUVER
// ============================================================

export const useApproveExpense =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async ({
          expenseId,
          note,
        }: {
          expenseId:
            string;

          note?: string;
        }) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "approve_expense",
            {
              p_expense_id:
                expenseId,

              p_note:
                note?.trim() ||
                null,
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data;
        },

      onSuccess:
        async () => {
          await invalidateExpenseQueries(
            qc,
          );
        },
    });
  };

// ============================================================
// REJETER
// ============================================================

export const useRejectExpense =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async ({
          expenseId,
          reason,
        }: {
          expenseId:
            string;

          reason:
            string;
        }) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "reject_expense",
            {
              p_expense_id:
                expenseId,

              p_reason:
                reason.trim(),
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data;
        },

      onSuccess:
        async () => {
          await invalidateExpenseQueries(
            qc,
          );
        },
    });
  };

// ============================================================
// PAYER
// ============================================================

export const usePayExpense =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            PayExpenseInput,
        ) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "pay_expense",
            {
              p_expense_id:
                input.expenseId,

              p_treasury_account_id:
                input.treasuryAccountId,

              p_amount:
                input.amount,

              p_payment_date:
                input.paymentDate,

              p_payment_method:
                input.paymentMethod?.trim() ||
                null,

              p_external_reference:
                input.externalReference?.trim() ||
                null,

              p_notes:
                input.notes?.trim() ||
                null,
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data;
        },

      onSuccess:
        async () => {
          await invalidateExpenseQueries(
            qc,
          );
        },
    });
  };

// ============================================================
// ANNULER
// ============================================================

export const useCancelExpense =
  () => {
    const qc =
      useQueryClient();

    return useMutation({
      mutationFn:
        async ({
          expenseId,
          reason,
        }: {
          expenseId:
            string;

          reason:
            string;
        }) => {
          const {
            data,
            error,
          } = await (
            supabase as any
          ).rpc(
            "cancel_expense",
            {
              p_expense_id:
                expenseId,

              p_reason:
                reason.trim(),
            },
          );

          if (
            error
          ) {
            throw error;
          }

          return data;
        },

      onSuccess:
        async () => {
          await invalidateExpenseQueries(
            qc,
          );
        },
    });
  };