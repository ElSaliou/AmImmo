import {
  useQuery,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

// ============================================================
// DASHBOARD TYPES
// ============================================================

export type TenantPortalTenant = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
};

export type TenantPortalProperty = {
  id: string;
  reference: string | null;
  title: string | null;
  status: string | null;
  published: boolean;
  currency: string | null;
};

export type TenantPortalLease = {
  id: string;
  reference: string | null;
  status: string | null;

  startDate: string | null;
  endDate: string | null;

  monthlyRent: number;
  charges: number;
  deposit: number;
  dueDay: number | null;

  property:
    | TenantPortalProperty
    | null;
};

export type TenantPortalInvoiceSummary = {
  total: number;
  paid: number;
  partiallyPaid: number;
  overdue: number;
  open: number;

  totalAmount: number;
  paidAmount: number;
  balanceDue: number;

  currency: string;
};

export type TenantPortalPaymentSummary = {
  total: number;
  completed: number;
  totalCompletedAmount: number;
};

export type TenantPortalDashboard = {
  tenantId: string;

  tenant:
    | TenantPortalTenant
    | null;

  activeLease:
    | TenantPortalLease
    | null;

  invoices:
    TenantPortalInvoiceSummary;

  payments:
    TenantPortalPaymentSummary;

  maintenanceCount: number;
  documentsCount: number;
};

// ============================================================
// F2.1D — INVOICE TYPES
// ============================================================

export type TenantPortalInvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type TenantPortalInvoice = {
  id: string;
  number: string;

  kind: string;
  status: TenantPortalInvoiceStatus;

  leaseId: string | null;
  propertyId: string | null;

  issueDate: string | null;
  dueDate: string | null;

  periodStart: string | null;
  periodEnd: string | null;

  currency: string;

  amount: number;
  paidAmount: number;
  balanceDue: number;

  notes: string | null;
  createdAt: string | null;
};

// ============================================================
// F2.1D — PAYMENT TYPES
// ============================================================

export type TenantPortalPayment = {
  id: string;
  reference: string | null;

  invoiceId: string | null;
  invoiceNumber: string | null;

  method: string | null;
  status: string | null;

  amount: number;
  currency: string;

  paidAt: string | null;

  isRefund: boolean;

  notes: string | null;
  createdAt: string | null;
};

// ============================================================
// GENERIC HELPERS
// ============================================================

const toNumber = (
  value: unknown,
): number => {
  const parsed =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
};

const toNullableNumber = (
  value: unknown,
): number | null => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
};

const toNullableString = (
  value: unknown,
): string | null => {
  return (
    typeof value === "string" &&
    value.length > 0
  )
    ? value
    : null;
};

// ============================================================
// CURRENT TENANT
//
// Source d'autorité :
//
// auth.uid()
//      ↓
// tenants.user_id
//      ↓
// my_tenant_id()
//
// Cette fonction est utilisée par toutes les lectures
// du portail locataire.
// ============================================================

const resolveCurrentTenantId =
  async (): Promise<string> => {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "my_tenant_id",
      );

    if (error) {
      throw error;
    }

    if (
      typeof data !== "string" ||
      data.length === 0
    ) {
      throw new Error(
        "Aucun locataire n'est associé au compte connecté.",
      );
    }

    return data;
  };

// ============================================================
// TENANT DASHBOARD
// ============================================================

export const useTenantPortalDashboard =
  () =>
    useQuery<TenantPortalDashboard>({
      queryKey: [
        "tenant-portal",
        "dashboard",
      ],

      queryFn:
        async () => {
          // ==================================================
          // 1. IDENTITÉ LOCATAIRE
          // ==================================================

          const tenantId =
            await resolveCurrentTenantId();

          // ==================================================
          // 2. LECTURES RLS EN PARALLÈLE
          // ==================================================

          const [
            tenantResult,
            leaseResult,
            invoicesResult,
            paymentsResult,
            maintenanceResult,
            documentsResult,
          ] =
            await Promise.all([
              // ----------------------------------------------
              // LOCATAIRE
              // ----------------------------------------------

              supabase
                .from(
                  "tenants",
                )
                .select(
                  `
                    id,
                    full_name,
                    email,
                    phone
                  `,
                )
                .eq(
                  "id",
                  tenantId,
                )
                .maybeSingle(),

              // ----------------------------------------------
              // BAIL ACTIF + LOGEMENT
              // ----------------------------------------------

              supabase
                .from(
                  "leases",
                )
                .select(
                  `
                    *,
                    property:properties(
                      id,
                      reference,
                      title,
                      status,
                      published,
                      currency
                    )
                  `,
                )
                .eq(
                  "tenant_id",
                  tenantId,
                )
                .eq(
                  "status",
                  "active",
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                )
                .limit(1)
                .maybeSingle(),

              // ----------------------------------------------
              // FACTURES
              // ----------------------------------------------

              supabase
                .from(
                  "invoices",
                )
                .select("*")
                .eq(
                  "tenant_id",
                  tenantId,
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                ),

              // ----------------------------------------------
              // PAIEMENTS
              // ----------------------------------------------

              supabase
                .from(
                  "payments",
                )
                .select("*")
                .eq(
                  "tenant_id",
                  tenantId,
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                ),

              // ----------------------------------------------
              // MAINTENANCE
              //
              // Le RLS décide ce que le locataire peut lire.
              // ----------------------------------------------

              supabase
                .from(
                  "maintenance_requests",
                )
                .select(
                  "id",
                  {
                    count:
                      "exact",

                    head:
                      true,
                  },
                ),

              // ----------------------------------------------
              // DOCUMENTS
              //
              // visible_to_tenant + RLS filtrent les lignes.
              // ----------------------------------------------

              supabase
                .from(
                  "documents",
                )
                .select(
                  "id",
                  {
                    count:
                      "exact",

                    head:
                      true,
                  },
                ),
            ]);

          // ==================================================
          // 3. ERREURS
          // ==================================================

          if (
            tenantResult.error
          ) {
            throw tenantResult.error;
          }

          if (
            leaseResult.error
          ) {
            throw leaseResult.error;
          }

          if (
            invoicesResult.error
          ) {
            throw invoicesResult.error;
          }

          if (
            paymentsResult.error
          ) {
            throw paymentsResult.error;
          }

          if (
            maintenanceResult.error
          ) {
            throw maintenanceResult.error;
          }

          if (
            documentsResult.error
          ) {
            throw documentsResult.error;
          }

          // ==================================================
          // 4. TENANT
          // ==================================================

          const tenant:
            TenantPortalTenant | null =
            tenantResult.data
              ? {
                  id:
                    tenantResult.data.id,

                  fullName:
                    tenantResult.data.full_name,

                  email:
                    tenantResult.data.email,

                  phone:
                    tenantResult.data.phone,
                }
              : null;

          // ==================================================
          // 5. ACTIVE LEASE
          // ==================================================

          const rawLease =
            leaseResult.data as
              | Record<
                  string,
                  any
                >
              | null;

          const rawProperty =
            rawLease
              ?.property as
              | Record<
                  string,
                  any
                >
              | null
              | undefined;

          const activeLease:
            TenantPortalLease | null =
            rawLease
              ? {
                  id:
                    String(
                      rawLease.id,
                    ),

                  reference:
                    toNullableString(
                      rawLease.reference,
                    ),

                  status:
                    toNullableString(
                      rawLease.status,
                    ),

                  startDate:
                    toNullableString(
                      rawLease.start_date,
                    ),

                  endDate:
                    toNullableString(
                      rawLease.end_date,
                    ),

                  monthlyRent:
                    toNumber(
                      rawLease.monthly_rent,
                    ),

                  charges:
                    toNumber(
                      rawLease.charges,
                    ),

                  deposit:
                    toNumber(
                      rawLease.deposit,
                    ),

                  dueDay:
                    toNullableNumber(
                      rawLease.due_day,
                    ),

                  property:
                    rawProperty
                      ? {
                          id:
                            String(
                              rawProperty.id,
                            ),

                          reference:
                            toNullableString(
                              rawProperty.reference,
                            ),

                          title:
                            toNullableString(
                              rawProperty.title,
                            ),

                          status:
                            toNullableString(
                              rawProperty.status,
                            ),

                          published:
                            rawProperty.published ===
                            true,

                          currency:
                            toNullableString(
                              rawProperty.currency,
                            ),
                        }
                      : null,
                }
              : null;

          // ==================================================
          // 6. INVOICE SUMMARY
          // ==================================================

          const rawInvoices =
            (
              invoicesResult.data ??
              []
            ) as Record<
              string,
              any
            >[];

          const invoiceTotal =
            rawInvoices.reduce(
              (
                total,
                invoice,
              ) =>
                total +
                toNumber(
                  invoice.amount,
                ),
              0,
            );

          const invoicePaid =
            rawInvoices.reduce(
              (
                total,
                invoice,
              ) =>
                total +
                toNumber(
                  invoice.paid_amount,
                ),
              0,
            );

          const invoiceBalance =
            rawInvoices.reduce(
              (
                total,
                invoice,
              ) => {
                const amount =
                  toNumber(
                    invoice.amount,
                  );

                const paid =
                  toNumber(
                    invoice.paid_amount,
                  );

                return (
                  total +
                  Math.max(
                    0,
                    amount -
                      paid,
                  )
                );
              },
              0,
            );

          const paidInvoices =
            rawInvoices.filter(
              (invoice) =>
                invoice.status ===
                "paid",
            ).length;

          const partiallyPaidInvoices =
            rawInvoices.filter(
              (invoice) =>
                invoice.status ===
                "partially_paid",
            ).length;

          const overdueInvoices =
            rawInvoices.filter(
              (invoice) =>
                invoice.status ===
                "overdue",
            ).length;

          const openInvoices =
            rawInvoices.filter(
              (invoice) =>
                invoice.status !==
                  "paid" &&
                invoice.status !==
                  "cancelled",
            ).length;

          const currency =
            toNullableString(
              rawInvoices[0]
                ?.currency,
            ) ??
            activeLease
              ?.property
              ?.currency ??
            "GNF";

          // ==================================================
          // 7. PAYMENT SUMMARY
          // ==================================================

          const rawPayments =
            (
              paymentsResult.data ??
              []
            ) as Record<
              string,
              any
            >[];

          const completedPayments =
            rawPayments.filter(
              (payment) =>
                payment.status ===
                  "completed" ||
                payment.status ===
                  "paid",
            );

          const completedAmount =
            completedPayments.reduce(
              (
                total,
                payment,
              ) =>
                total +
                toNumber(
                  payment.amount,
                ),
              0,
            );

          // ==================================================
          // 8. RESULT
          // ==================================================

          return {
            tenantId,

            tenant,

            activeLease,

            invoices: {
              total:
                rawInvoices.length,

              paid:
                paidInvoices,

              partiallyPaid:
                partiallyPaidInvoices,

              overdue:
                overdueInvoices,

              open:
                openInvoices,

              totalAmount:
                invoiceTotal,

              paidAmount:
                invoicePaid,

              balanceDue:
                invoiceBalance,

              currency,
            },

            payments: {
              total:
                rawPayments.length,

              completed:
                completedPayments.length,

              totalCompletedAmount:
                completedAmount,
            },

            maintenanceCount:
              maintenanceResult.count ??
              0,

            documentsCount:
              documentsResult.count ??
              0,
          };
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// F2.1D — TENANT INVOICES
//
// READ ONLY
//
// RLS reste la source d'autorité de l'accès aux factures.
// ============================================================

export const useTenantPortalInvoices =
  () =>
    useQuery<TenantPortalInvoice[]>({
      queryKey: [
        "tenant-portal",
        "invoices",
      ],

      queryFn:
        async () => {
          const tenantId =
            await resolveCurrentTenantId();

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "invoices",
              )
              .select(
                `
                  id,
                  number,
                  kind,
                  status,
                  lease_id,
                  property_id,
                  issue_date,
                  due_date,
                  period_start,
                  period_end,
                  currency,
                  amount,
                  paid_amount,
                  notes,
                  created_at
                `,
              )
              .eq(
                "tenant_id",
                tenantId,
              )
              .order(
                "issue_date",
                {
                  ascending:
                    false,
                },
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                },
              );

          if (error) {
            throw error;
          }

          const rows =
            (
              data ?? []
            ) as Record<
              string,
              any
            >[];

          return rows.map(
            (
              row,
            ): TenantPortalInvoice => {
              const amount =
                toNumber(
                  row.amount,
                );

              const paidAmount =
                toNumber(
                  row.paid_amount,
                );

              return {
                id:
                  String(
                    row.id,
                  ),

                number:
                  String(
                    row.number ??
                    "",
                  ),

                kind:
                  String(
                    row.kind ??
                    "",
                  ),

                status:
                  row.status as
                    TenantPortalInvoiceStatus,

                leaseId:
                  toNullableString(
                    row.lease_id,
                  ),

                propertyId:
                  toNullableString(
                    row.property_id,
                  ),

                issueDate:
                  toNullableString(
                    row.issue_date,
                  ),

                dueDate:
                  toNullableString(
                    row.due_date,
                  ),

                periodStart:
                  toNullableString(
                    row.period_start,
                  ),

                periodEnd:
                  toNullableString(
                    row.period_end,
                  ),

                currency:
                  toNullableString(
                    row.currency,
                  ) ??
                  "GNF",

                amount,

                paidAmount,

                balanceDue:
                  Math.max(
                    0,
                    amount -
                      paidAmount,
                  ),

                notes:
                  toNullableString(
                    row.notes,
                  ),

                createdAt:
                  toNullableString(
                    row.created_at,
                  ),
              };
            },
          );
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// F2.1D — TENANT PAYMENTS
//
// READ ONLY
//
// Deux lectures séparées sont volontairement utilisées :
// - payments
// - invoices
//
// Cela évite de dépendre d'un embed PostgREST ambigu et permet
// de résoudre proprement le numéro de facture lié au paiement.
// Les deux tables restent protégées par leurs RLS.
// ============================================================

export const useTenantPortalPayments =
  () =>
    useQuery<TenantPortalPayment[]>({
      queryKey: [
        "tenant-portal",
        "payments",
      ],

      queryFn:
        async () => {
          const tenantId =
            await resolveCurrentTenantId();

          const [
            paymentsResult,
            invoicesResult,
          ] =
            await Promise.all([
              // ----------------------------------------------
              // PAYMENTS
              // ----------------------------------------------

              supabase
                .from(
                  "payments",
                )
                .select(
                  `
                    id,
                    reference,
                    invoice_id,
                    method,
                    status,
                    amount,
                    currency,
                    paid_at,
                    is_refund,
                    notes,
                    created_at
                  `,
                )
                .eq(
                  "tenant_id",
                  tenantId,
                )
                .order(
                  "paid_at",
                  {
                    ascending:
                      false,
                  },
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                ),

              // ----------------------------------------------
              // INVOICE REFERENCES
              //
              // Utilisées uniquement pour afficher le numéro
              // de facture lié à chaque paiement.
              // ----------------------------------------------

              supabase
                .from(
                  "invoices",
                )
                .select(
                  `
                    id,
                    number
                  `,
                )
                .eq(
                  "tenant_id",
                  tenantId,
                ),
            ]);

          if (
            paymentsResult.error
          ) {
            throw paymentsResult.error;
          }

          if (
            invoicesResult.error
          ) {
            throw invoicesResult.error;
          }

          const invoiceRows =
            (
              invoicesResult.data ??
              []
            ) as Record<
              string,
              any
            >[];

          const invoiceNumberById =
            new Map<
              string,
              string
            >();

          invoiceRows.forEach(
            (invoice) => {
              const id =
                toNullableString(
                  invoice.id,
                );

              const number =
                toNullableString(
                  invoice.number,
                );

              if (
                id &&
                number
              ) {
                invoiceNumberById.set(
                  id,
                  number,
                );
              }
            },
          );

          const paymentRows =
            (
              paymentsResult.data ??
              []
            ) as Record<
              string,
              any
            >[];

          return paymentRows.map(
            (
              row,
            ): TenantPortalPayment => {
              const invoiceId =
                toNullableString(
                  row.invoice_id,
                );

              return {
                id:
                  String(
                    row.id,
                  ),

                reference:
                  toNullableString(
                    row.reference,
                  ),

                invoiceId,

                invoiceNumber:
                  invoiceId
                    ? invoiceNumberById.get(
                        invoiceId,
                      ) ??
                      null
                    : null,

                method:
                  toNullableString(
                    row.method,
                  ),

                status:
                  toNullableString(
                    row.status,
                  ),

                amount:
                  toNumber(
                    row.amount,
                  ),

                currency:
                  toNullableString(
                    row.currency,
                  ) ??
                  "GNF",

                paidAt:
                  toNullableString(
                    row.paid_at,
                  ),

                isRefund:
                  row.is_refund ===
                  true,

                notes:
                  toNullableString(
                    row.notes,
                  ),

                createdAt:
                  toNullableString(
                    row.created_at,
                  ),
              };
            },
          );
        },

      staleTime:
        15_000,

      retry:
        false,
    });