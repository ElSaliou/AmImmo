import {
  useMutation,
  useQuery,
  useQueryClient,
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
// INVOICES
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
// PAYMENTS
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
// F2.1E — INVOICE LINES
// ============================================================

export type TenantPortalInvoiceLine = {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

// ============================================================
// F2.1E — DOCUMENT CONTEXT
// ============================================================

export type TenantPortalDocumentLease = {
  id: string;
  reference: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type TenantPortalDocumentProperty = {
  id: string;
  reference: string | null;
  title: string | null;
};

export type TenantPortalInvoiceDetail =
  TenantPortalInvoice & {
    tenant:
      | TenantPortalTenant
      | null;

    lease:
      | TenantPortalDocumentLease
      | null;

    property:
      | TenantPortalDocumentProperty
      | null;

    payments:
      TenantPortalPayment[];

    lines:
      TenantPortalInvoiceLine[];
  };

export type TenantPortalPaymentDetail = {
  payment:
    TenantPortalPayment;

  tenant:
    | TenantPortalTenant
    | null;

  invoice:
    | TenantPortalInvoice
    | null;

  lease:
    | TenantPortalDocumentLease
    | null;

  property:
    | TenantPortalDocumentProperty
    | null;
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
    typeof value ===
      "string" &&
    value.length > 0
  )
    ? value
    : null;
};

// ============================================================
// CURRENT TENANT
//
// auth.uid()
//    ↓
// tenants.user_id
//    ↓
// my_tenant_id()
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
      typeof data !==
        "string" ||
      data.length ===
        0
    ) {
      throw new Error(
        "Aucun locataire n'est associé au compte connecté.",
      );
    }

    return data;
  };

// ============================================================
// MAPPERS
// ============================================================

const mapTenantPortalInvoice = (
  row: Record<
    string,
    any
  >,
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
};

const mapTenantPortalPayment = (
  row: Record<
    string,
    any
  >,

  invoiceNumber:
    | string
    | null =
    null,
): TenantPortalPayment => {
  return {
    id:
      String(
        row.id,
      ),

    reference:
      toNullableString(
        row.reference,
      ),

    invoiceId:
      toNullableString(
        row.invoice_id,
      ),

    invoiceNumber,

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
};

const mapTenantPortalInvoiceLine = (
  row: Record<
    string,
    any
  >,
): TenantPortalInvoiceLine => {
  return {
    id:
      String(
        row.id,
      ),

    label:
      String(
        row.label ??
          "",
      ),

    quantity:
      toNumber(
        row.quantity,
      ),

    unitPrice:
      toNumber(
        row.unit_price,
      ),

    amount:
      toNumber(
        row.amount,
      ),
  };
};

const mapDocumentLease = (
  row:
    | Record<
        string,
        any
      >
    | null,
): TenantPortalDocumentLease | null => {
  if (!row) {
    return null;
  }

  return {
    id:
      String(
        row.id,
      ),

    reference:
      toNullableString(
        row.reference,
      ),

    startDate:
      toNullableString(
        row.start_date,
      ),

    endDate:
      toNullableString(
        row.end_date,
      ),
  };
};

const mapDocumentProperty = (
  row:
    | Record<
        string,
        any
      >
    | null,
): TenantPortalDocumentProperty | null => {
  if (!row) {
    return null;
  }

  return {
    id:
      String(
        row.id,
      ),

    reference:
      toNullableString(
        row.reference,
      ),

    title:
      toNullableString(
        row.title,
      ),
  };
};

// ============================================================
// TENANT DOCUMENT CONTEXT
// ============================================================

const loadTenantDocumentContext =
  async (
    tenantId: string,
    invoice:
      TenantPortalInvoice,
  ): Promise<{
    tenant:
      | TenantPortalTenant
      | null;

    lease:
      | TenantPortalDocumentLease
      | null;

    property:
      | TenantPortalDocumentProperty
      | null;
  }> => {
    const tenantPromise =
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
        .maybeSingle();

    const leasePromise =
      invoice.leaseId
        ? supabase
            .from(
              "leases",
            )
            .select(
              `
                id,
                reference,
                start_date,
                end_date
              `,
            )
            .eq(
              "id",
              invoice.leaseId,
            )
            .eq(
              "tenant_id",
              tenantId,
            )
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          });

    const propertyPromise =
      invoice.propertyId
        ? supabase
            .from(
              "properties",
            )
            .select(
              `
                id,
                reference,
                title
              `,
            )
            .eq(
              "id",
              invoice.propertyId,
            )
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          });

    const [
      tenantResult,
      leaseResult,
      propertyResult,
    ] =
      await Promise.all([
        tenantPromise,
        leasePromise,
        propertyPromise,
      ]);

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
      propertyResult.error
    ) {
      throw propertyResult.error;
    }

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

    return {
      tenant,

      lease:
        mapDocumentLease(
          leaseResult.data as
            | Record<
                string,
                any
              >
            | null,
        ),

      property:
        mapDocumentProperty(
          propertyResult.data as
            | Record<
                string,
                any
              >
            | null,
        ),
    };
  };

// ============================================================
// DASHBOARD
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
          const tenantId =
            await resolveCurrentTenantId();

          const [
            tenantResult,
            leaseResult,
            invoicesResult,
            paymentsResult,
            maintenanceResult,
            documentsResult,
          ] =
            await Promise.all([
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
// TENANT INVOICES
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

          return (
            (
              data ??
              []
            ) as Record<
              string,
              any
            >[]
          ).map(
            mapTenantPortalInvoice,
          );
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// TENANT PAYMENTS
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

          const invoiceNumberById =
            new Map<
              string,
              string
            >();

          (
            (
              invoicesResult.data ??
              []
            ) as Record<
              string,
              any
            >[]
          ).forEach(
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

          return (
            (
              paymentsResult.data ??
              []
            ) as Record<
              string,
              any
            >[]
          ).map(
            (row) => {
              const invoiceId =
                toNullableString(
                  row.invoice_id,
                );

              return mapTenantPortalPayment(
                row,
                invoiceId
                  ? invoiceNumberById.get(
                      invoiceId,
                    ) ??
                    null
                  : null,
              );
            },
          );
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// F2.1E — TENANT INVOICE DETAIL
//
// READ ONLY
//
// invoice_lines est lu séparément pour conserver un contrat
// explicite et réutilisable dans les PDF.
// ============================================================

export const useTenantPortalInvoiceDetail =
  (
    invoiceId:
      | string
      | undefined,
  ) =>
    useQuery<TenantPortalInvoiceDetail>({
      queryKey: [
        "tenant-portal",
        "invoice-detail",
        invoiceId ??
          null,
      ],

      enabled:
        Boolean(
          invoiceId,
        ),

      queryFn:
        async () => {
          if (!invoiceId) {
            throw new Error(
              "Identifiant de facture manquant.",
            );
          }

          const tenantId =
            await resolveCurrentTenantId();

          // ==================================================
          // INVOICE OWNERSHIP
          // ==================================================

          const {
            data:
              invoiceData,

            error:
              invoiceError,
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
                  tenant_id,
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
                "id",
                invoiceId,
              )
              .eq(
                "tenant_id",
                tenantId,
              )
              .maybeSingle();

          if (invoiceError) {
            throw invoiceError;
          }

          if (!invoiceData) {
            throw new Error(
              "Facture introuvable ou non accessible.",
            );
          }

          const invoice =
            mapTenantPortalInvoice(
              invoiceData as Record<
                string,
                any
              >,
            );

          // ==================================================
          // RELATED DATA
          // ==================================================

          const [
            paymentsResult,
            linesResult,
            context,
          ] =
            await Promise.all([
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
                .eq(
                  "invoice_id",
                  invoice.id,
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

              supabase
                .from(
                  "invoice_lines",
                )
                .select(
                  `
                    id,
                    invoice_id,
                    label,
                    quantity,
                    unit_price,
                    amount,
                    created_at
                  `,
                )
                .eq(
                  "invoice_id",
                  invoice.id,
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      true,
                  },
                )
                .order(
                  "id",
                  {
                    ascending:
                      true,
                  },
                ),

              loadTenantDocumentContext(
                tenantId,
                invoice,
              ),
            ]);

          if (
            paymentsResult.error
          ) {
            throw paymentsResult.error;
          }

          if (
            linesResult.error
          ) {
            throw linesResult.error;
          }

          const payments =
            (
              (
                paymentsResult.data ??
                []
              ) as Record<
                string,
                any
              >[]
            ).map(
              (row) =>
                mapTenantPortalPayment(
                  row,
                  invoice.number,
                ),
            );

          const lines =
            (
              (
                linesResult.data ??
                []
              ) as Record<
                string,
                any
              >[]
            ).map(
              mapTenantPortalInvoiceLine,
            );

          return {
            ...invoice,

            tenant:
              context.tenant,

            lease:
              context.lease,

            property:
              context.property,

            payments,

            lines,
          };
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// F2.1E — TENANT PAYMENT DETAIL
// ============================================================

export const useTenantPortalPaymentDetail =
  (
    paymentId:
      | string
      | undefined,
  ) =>
    useQuery<TenantPortalPaymentDetail>({
      queryKey: [
        "tenant-portal",
        "payment-detail",
        paymentId ??
          null,
      ],

      enabled:
        Boolean(
          paymentId,
        ),

      queryFn:
        async () => {
          if (!paymentId) {
            throw new Error(
              "Identifiant de paiement manquant.",
            );
          }

          const tenantId =
            await resolveCurrentTenantId();

          const {
            data:
              paymentData,

            error:
              paymentError,
          } =
            await supabase
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
                "id",
                paymentId,
              )
              .eq(
                "tenant_id",
                tenantId,
              )
              .maybeSingle();

          if (paymentError) {
            throw paymentError;
          }

          if (!paymentData) {
            throw new Error(
              "Paiement introuvable ou non accessible.",
            );
          }

          const rawPayment =
            paymentData as Record<
              string,
              any
            >;

          const invoiceId =
            toNullableString(
              rawPayment.invoice_id,
            );

          let invoice:
            TenantPortalInvoice | null =
            null;

          if (invoiceId) {
            const {
              data:
                invoiceData,

              error:
                invoiceError,
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
                  "id",
                  invoiceId,
                )
                .eq(
                  "tenant_id",
                  tenantId,
                )
                .maybeSingle();

            if (
              invoiceError
            ) {
              throw invoiceError;
            }

            if (invoiceData) {
              invoice =
                mapTenantPortalInvoice(
                  invoiceData as Record<
                    string,
                    any
                  >,
                );
            }
          }

          const payment =
            mapTenantPortalPayment(
              rawPayment,
              invoice
                ?.number ??
                null,
            );

          if (invoice) {
            const context =
              await loadTenantDocumentContext(
                tenantId,
                invoice,
              );

            return {
              payment,

              tenant:
                context.tenant,

              invoice,

              lease:
                context.lease,

              property:
                context.property,
            };
          }

          const {
            data:
              tenantData,

            error:
              tenantError,
          } =
            await supabase
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
              .maybeSingle();

          if (
            tenantError
          ) {
            throw tenantError;
          }

          return {
            payment,

            tenant:
              tenantData
                ? {
                    id:
                      tenantData.id,

                    fullName:
                      tenantData.full_name,

                    email:
                      tenantData.email,

                    phone:
                      tenantData.phone,
                  }
                : null,

            invoice:
              null,

            lease:
              null,

            property:
              null,
          };
        },

      staleTime:
        15_000,

      retry:
        false,
    });
// ============================================================
// F2.1F — TENANT DOCUMENTS
// ============================================================

export type TenantPortalDocument = {
  id: string;

  name: string;

  entityType: string;
  entityId: string;

  fileType: string | null;

  storageBucket: string | null;
  storagePath: string | null;

  fileUrl: string | null;

  mimeType: string | null;
  fileSize: number | null;

  uploadedAt: string | null;

  visibleToTenant: boolean;
};

const mapTenantPortalDocument = (
  row: Record<string, any>,
): TenantPortalDocument => ({
  id: String(row.id),

  name:
    String(
      row.name ??
        "Document",
    ),

  entityType:
    String(
      row.entity_type ??
        "",
    ),

  entityId:
    String(
      row.entity_id ??
        "",
    ),

  fileType:
    toNullableString(
      row.file_type,
    ),

  storageBucket:
    toNullableString(
      row.storage_bucket,
    ),

  storagePath:
    toNullableString(
      row.storage_path,
    ),

  fileUrl:
    toNullableString(
      row.file_url,
    ),

  mimeType:
    toNullableString(
      row.mime_type,
    ),

  fileSize:
    row.file_size == null
      ? null
      : toNumber(
          row.file_size,
        ),

  uploadedAt:
    toNullableString(
      row.uploaded_at,
    ),

  visibleToTenant:
    row.visible_to_tenant ===
    true,
});

export const useTenantPortalDocuments =
  () =>
    useQuery<
      TenantPortalDocument[]
    >({
      queryKey: [
        "tenant-portal",
        "documents",
      ],

      queryFn:
        async () => {
          // Vérifie également qu'un tenant
          // est réellement associé au compte.
          await resolveCurrentTenantId();

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "documents",
              )
              .select(
                `
                  id,
                  name,
                  entity_type,
                  entity_id,
                  file_type,
                  storage_bucket,
                  storage_path,
                  file_url,
                  mime_type,
                  file_size,
                  uploaded_at,
                  visible_to_tenant
                `,
              )
              .eq(
                "visible_to_tenant",
                true,
              )
              .order(
                "uploaded_at",
                {
                  ascending:
                    false,
                },
              );

          if (error) {
            throw error;
          }

          // La RLS constitue l'autorité :
          // tenant/lease appartenant au tenant connecté.
          return (
            (
              data ??
              []
            ) as Record<
              string,
              any
            >[]
          ).map(
            mapTenantPortalDocument,
          );
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// F2.1F — DOCUMENT SECURE ACCESS
// ============================================================

export const createTenantDocumentAccessUrl =
  async (
    document:
      TenantPortalDocument,
    expiresIn =
      300,
  ): Promise<string> => {
    if (
      document.storageBucket &&
      document.storagePath
    ) {
      const {
        data,
        error,
      } =
        await supabase.storage
          .from(
            document.storageBucket,
          )
          .createSignedUrl(
            document.storagePath,
            expiresIn,
          );

      if (error) {
        throw error;
      }

      if (
        !data?.signedUrl
      ) {
        throw new Error(
          "Impossible de générer le lien sécurisé du document.",
        );
      }

      return data.signedUrl;
    }

    if (
      document.fileUrl
    ) {
      return document.fileUrl;
    }

    throw new Error(
      "Aucun fichier n'est associé à ce document.",
    );
  };

// ============================================================
// F2.1F — TENANT MAINTENANCE
// ============================================================

export type TenantMaintenancePriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export type TenantMaintenanceStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

export type TenantPortalMaintenanceRequest = {
  id: string;

  propertyId: string;
  tenantId: string;

  title: string;
  description: string | null;

  priority:
    TenantMaintenancePriority;

  status:
    TenantMaintenanceStatus;

  createdAt: string | null;
  updatedAt: string | null;
};

const mapTenantMaintenanceRequest =
  (
    row: Record<
      string,
      any
    >,
  ): TenantPortalMaintenanceRequest => ({
    id:
      String(
        row.id,
      ),

    propertyId:
      String(
        row.property_id,
      ),

    tenantId:
      String(
        row.tenant_id,
      ),

    title:
      String(
        row.title ??
          "",
      ),

    description:
      toNullableString(
        row.description,
      ),

    priority:
      row.priority as
        TenantMaintenancePriority,

    status:
      row.status as
        TenantMaintenanceStatus,

    createdAt:
      toNullableString(
        row.created_at,
      ),

    updatedAt:
      toNullableString(
        row.updated_at,
      ),
  });

// ============================================================
// F2.1F — READ OWN MAINTENANCE
// ============================================================

export const useTenantPortalMaintenanceRequests =
  () =>
    useQuery<
      TenantPortalMaintenanceRequest[]
    >({
      queryKey: [
        "tenant-portal",
        "maintenance",
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
                "maintenance_requests",
              )
              .select(
                `
                  id,
                  property_id,
                  tenant_id,
                  title,
                  description,
                  priority,
                  status,
                  created_at,
                  updated_at
                `,
              )
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
              );

          if (error) {
            throw error;
          }

          return (
            (
              data ??
              []
            ) as Record<
              string,
              any
            >[]
          ).map(
            mapTenantMaintenanceRequest,
          );
        },

      staleTime:
        15_000,

      retry:
        false,
    });

// ============================================================
// F2.1F — CREATE OWN MAINTENANCE
//
// Important :
// - aucun tenant_id fourni par l'UI
// - aucun property_id fourni par l'UI
// - aucun status fourni par l'UI
//
// Ces valeurs sont résolues depuis le contexte authentifié.
// PostgreSQL/RLS constitue ensuite la deuxième barrière.
// ============================================================

export type CreateTenantMaintenanceInput = {
  title: string;

  description: string;

  priority:
    TenantMaintenancePriority;
};

export const useCreateTenantMaintenanceRequest =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          input:
            CreateTenantMaintenanceInput,
        ) => {
          const tenantId =
            await resolveCurrentTenantId();

          // --------------------------------------------------
          // ACTIVE LEASE
          // --------------------------------------------------

          const {
            data:
              leaseData,

            error:
              leaseError,
          } =
            await supabase
              .from(
                "leases",
              )
              .select(
                `
                  id,
                  property_id
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
              .limit(1)
              .maybeSingle();

          if (leaseError) {
            throw leaseError;
          }

          if (
            !leaseData
          ) {
            throw new Error(
              "Aucun bail actif n'est associé à votre compte.",
            );
          }

          if (
            !leaseData.property_id
          ) {
            throw new Error(
              "Le logement associé au bail actif est introuvable.",
            );
          }

          const title =
            input.title.trim();

          const description =
            input.description.trim();

          if (
            title.length <
            3
          ) {
            throw new Error(
              "Veuillez renseigner un titre suffisamment précis.",
            );
          }

          if (
            description.length <
            5
          ) {
            throw new Error(
              "Veuillez décrire le problème rencontré.",
            );
          }

          // --------------------------------------------------
          // INSERT
          //
          // status volontairement absent :
          // DB default = open
          // RLS impose également status = open.
          // --------------------------------------------------

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "maintenance_requests",
              )
              .insert({
                property_id:
                  leaseData.property_id,

                tenant_id:
                  tenantId,

                title,

                description,

                priority:
                  input.priority,
              })
              .select(
                `
                  id,
                  property_id,
                  tenant_id,
                  title,
                  description,
                  priority,
                  status,
                  created_at,
                  updated_at
                `,
              )
              .single();

          if (error) {
            throw error;
          }

          return mapTenantMaintenanceRequest(
            data as Record<
              string,
              any
            >,
          );
        },

      onSuccess:
        async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "tenant-portal",
                "maintenance",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "tenant-portal",
                "dashboard",
              ],
            }),
          ]);
        },
    });
  };