import {
  useQuery,
} from "@tanstack/react-query";

import {
  supabase,
} from "@/integrations/supabase/client";

// ============================================================
// TYPES
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
    TenantPortalTenant | null;

  activeLease:
    TenantPortalLease | null;

  invoices:
    TenantPortalInvoiceSummary;

  payments:
    TenantPortalPaymentSummary;

  maintenanceCount: number;
  documentsCount: number;
};

// ============================================================
// HELPERS
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
  return typeof value ===
      "string" &&
    value.length > 0
    ? value
    : null;
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

          const {
            data:
              tenantIdData,

            error:
              tenantIdError,
          } =
            await supabase.rpc(
              "my_tenant_id",
            );

          if (tenantIdError) {
            throw tenantIdError;
          }

          const tenantId =
            typeof tenantIdData ===
              "string" &&
            tenantIdData.length > 0
              ? tenantIdData
              : null;

          if (!tenantId) {
            throw new Error(
              "Aucun locataire n'est associé au compte connecté.",
            );
          }

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

          const tenant =
            tenantResult.data
              ? {
                  id:
                    tenantResult
                      .data.id,

                  fullName:
                    tenantResult
                      .data
                      .full_name,

                  email:
                    tenantResult
                      .data
                      .email,

                  phone:
                    tenantResult
                      .data
                      .phone,
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
          // 6. INVOICES
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
          // 7. PAYMENTS
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

      retry: false,
    });