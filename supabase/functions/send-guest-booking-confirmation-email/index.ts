import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type RequestBody = {
  bookingId: string;
};

type PreparedDelivery = {
  delivery_id: string;
  delivery_status: string;
  attempt_count: number;

  booking_id: string;
  booking_reference: string;
  booking_status: string;

  guest_id: string;
  guest_user_id: string | null;
  guest_name: string | null;

  recipient: string;

  check_in: string;
  check_out: string;

  payment_plan: string | null;
  initial_payment_percent:
    | number
    | string
    | null;

  payment_due_at:
    | string
    | null;

  payment_policy_text:
    | string
    | null;

  cancellation_policy_text:
    | string
    | null;

  total_amount:
    | number
    | string
    | null;

  deposit:
    | number
    | string
    | null;

  currency:
    | string
    | null;

  invoice_id: string;
  invoice_number: string;
  invoice_status: string;
};

type DeliveryAttempt = {
  delivery_id: string;
  should_send: boolean;
  already_sent: boolean;
  in_progress: boolean;
  attempt_no: number;
};

type PaymentAccess = {
  access_id: string;
  booking_id: string;
  payment_token: string;
  expires_at:
    | string
    | null;
  payment_due_at:
    | string
    | null;
};

type PublicPaymentContext = {
  booking_reference: string;
  booking_status: string;

  check_in: string;
  check_out: string;

  guests_count: number;

  currency: string;

  payment_plan: string;
  initial_payment_percent: number;

  payment_due_at:
    | string
    | null;

  invoice_number: string;
  invoice_status: string;

  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  amount_due_now: number;

  access_expires_at: string;

  can_pay: boolean;

  payment_block_reason:
    | string
    | null;
};

class HttpError extends Error {
  status: number;

  constructor(
    status: number,
    message: string,
  ) {
    super(message);

    this.status =
      status;
  }
}

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return Response.json(
    body,
    {
      status,
    },
  );
}

function isUuid(
  value: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function firstRow<T>(
  data:
    | T
    | T[]
    | null,
): T | null {
  if (
    data === null
  ) {
    return null;
  }

  if (
    Array.isArray(
      data,
    )
  ) {
    return data.length > 0
      ? data[0]
      : null;
  }

  return data;
}

function normalizePublicUrl(
  value: string,
) {
  return value
    .trim()
    .replace(
      /\/+$/,
      "",
    );
}

function escapeHtml(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return String(
    value ?? "",
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}

function htmlMultiline(
  value:
    | string
    | null
    | undefined,
) {
  return escapeHtml(
    value,
  )
    .replaceAll(
      "\r\n",
      "\n",
    )
    .replaceAll(
      "\r",
      "\n",
    )
    .replaceAll(
      "\n",
      "<br />",
    );
}

function toNumber(
  value: unknown,
) {
  const parsed =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function formatMoney(
  value: unknown,
  currency:
    | string
    | null
    | undefined,
) {
  const amount =
    toNumber(
      value,
    );

  const normalizedCurrency =
    currency?.trim() ||
    "GNF";

  try {
    return new Intl.NumberFormat(
      "fr-FR",
      {
        style:
          "currency",

        currency:
          normalizedCurrency,

        maximumFractionDigits:
          normalizedCurrency ===
          "GNF"
            ? 0
            : 2,
      },
    ).format(
      amount,
    );
  } catch {
    return `${new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits:
          2,
      },
    ).format(
      amount,
    )} ${normalizedCurrency}`;
  }
}

function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
  }

  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  if (!match) {
    return value;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatDateTime(
  value:
    | string
    | null
    | undefined,
) {
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

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  ).format(
    date,
  );
}

export default {
  fetch: withSupabase(
    {
      auth: "user",
    },

    async (
      req,
      ctx,
    ) => {
      let claimedDeliveryId:
        | string
        | null =
        null;

      let claimedAttemptNo:
        | number
        | null =
        null;

      try {
        // ====================================================
        // METHOD
        // ====================================================

        if (
          req.method !==
          "POST"
        ) {
          throw new HttpError(
            405,
            "Méthode non autorisée.",
          );
        }


        // ====================================================
        // ENVIRONMENT
        // ====================================================

        const resendApiKey =
          Deno.env.get(
            "RESEND_API_KEY",
          );

        const publicUrl =
          normalizePublicUrl(
            Deno.env.get(
              "APP_PUBLIC_URL",
            ) ??
              "",
          );

        const configuredFrom =
          Deno.env.get(
            "GUEST_EMAIL_FROM",
          )?.trim();

        const emailFrom =
          configuredFrom ||
          "AmImmo <onboarding@resend.dev>";


        if (!resendApiKey) {
          throw new HttpError(
            500,
            "RESEND_API_KEY n'est pas configurée.",
          );
        }


        if (!publicUrl) {
          throw new HttpError(
            500,
            "APP_PUBLIC_URL n'est pas configurée.",
          );
        }


        // ====================================================
        // AUTHENTICATED STAFF
        // ====================================================

        const {
          data:
            authenticatedUser,

          error:
            authenticatedUserError,
        } =
          await ctx.supabase
            .auth
            .getUser();


        if (
          authenticatedUserError ||
          !authenticatedUser.user
        ) {
          throw new HttpError(
            401,
            "Session utilisateur invalide.",
          );
        }


        const {
          data:
            staffAllowed,

          error:
            staffError,
        } =
          await ctx.supabase.rpc(
            "is_staff",
            {
              _user_id:
                authenticatedUser
                  .user
                  .id,
            },
          );


        if (staffError) {
          console.error(
            "is_staff error:",
            staffError,
          );

          throw new HttpError(
            500,
            "Impossible de vérifier les autorisations.",
          );
        }


        if (
          staffAllowed !==
          true
        ) {
          throw new HttpError(
            403,
            "Accès réservé au personnel autorisé.",
          );
        }


        // ====================================================
        // BODY
        //
        // IMPORTANT:
        // the browser supplies bookingId only.
        //
        // No recipient.
        // No amount.
        // No payment URL.
        // ====================================================

        let body:
          RequestBody;


        try {
          body =
            (await req.json()) as RequestBody;
        } catch {
          throw new HttpError(
            400,
            "Corps JSON invalide.",
          );
        }


        const bookingId =
          body.bookingId
            ?.trim();


        if (
          !bookingId ||
          !isUuid(
            bookingId,
          )
        ) {
          throw new HttpError(
            400,
            "Identifiant de réservation invalide.",
          );
        }


        // ====================================================
        // PREPARE CANONICAL DELIVERY
        //
        // Server resolves:
        // booking
        // -> booking.guest_email
        // -> guest
        // -> invoice
        // ====================================================

        const {
          data:
            preparedRaw,

          error:
            prepareError,
        } =
          await ctx.supabase.rpc(
            "prepare_guest_booking_confirmation_delivery",
            {
              p_booking_id:
                bookingId,
            },
          );


        if (prepareError) {
          console.error(
            "prepare_guest_booking_confirmation_delivery error:",
            prepareError,
          );

          throw new HttpError(
            400,
            prepareError.message ??
              "Impossible de préparer l'email de confirmation.",
          );
        }


        if (
          !preparedRaw ||
          typeof preparedRaw !==
            "object" ||
          Array.isArray(
            preparedRaw,
          )
        ) {
          throw new HttpError(
            500,
            "Réponse de préparation d'envoi invalide.",
          );
        }


        const prepared =
          preparedRaw as unknown as
            PreparedDelivery;


        // ====================================================
        // CLAIM ONE ATTEMPT
        //
        // Prevents simultaneous payment-token rotation.
        // ====================================================

        const {
          data:
            attemptRaw,

          error:
            attemptError,
        } =
          await ctx.supabase.rpc(
            "begin_guest_booking_confirmation_delivery_attempt",
            {
              p_delivery_id:
                prepared.delivery_id,
            },
          );


        if (attemptError) {
          console.error(
            "begin_guest_booking_confirmation_delivery_attempt error:",
            attemptError,
          );

          throw new HttpError(
            500,
            attemptError.message ??
              "Impossible de démarrer l'envoi de l'email.",
          );
        }


        if (
          !attemptRaw ||
          typeof attemptRaw !==
            "object" ||
          Array.isArray(
            attemptRaw,
          )
        ) {
          throw new HttpError(
            500,
            "Réponse de verrouillage d'envoi invalide.",
          );
        }


        const attempt =
          attemptRaw as unknown as
            DeliveryAttempt;


        if (
          attempt.already_sent
        ) {
          return jsonResponse(
            {
              success:
                true,

              alreadySent:
                true,

              deliveryId:
                prepared.delivery_id,

              bookingId:
                prepared.booking_id,

              bookingReference:
                prepared.booking_reference,

              recipient:
                prepared.recipient,
            },
          );
        }


        if (
          attempt.in_progress
        ) {
          return jsonResponse(
            {
              success:
                false,

              code:
                "delivery_in_progress",

              error:
                "Un envoi de confirmation est déjà en cours.",

              deliveryId:
                prepared.delivery_id,
            },
            409,
          );
        }


        if (
          attempt.should_send !==
          true
        ) {
          throw new HttpError(
            409,
            "L'envoi de confirmation n'est pas disponible actuellement.",
          );
        }


        claimedDeliveryId =
          prepared.delivery_id;

        claimedAttemptNo =
          Number(
            attempt.attempt_no,
          );


        if (
          !Number.isInteger(
            claimedAttemptNo,
          ) ||
          claimedAttemptNo < 1
        ) {
          throw new HttpError(
            500,
            "Numéro de tentative d'envoi invalide.",
          );
        }


        // ====================================================
        // CREATE / ROTATE PAYMENT ACCESS
        //
        // This happens only AFTER the attempt is claimed.
        // ====================================================

        const {
          data:
            paymentAccessRaw,

          error:
            paymentAccessError,
        } =
          await ctx.supabase.rpc(
            "create_short_rental_payment_access",
            {
              p_booking_id:
                prepared.booking_id,
            },
          );


        if (
          paymentAccessError
        ) {
          console.error(
            "create_short_rental_payment_access error:",
            paymentAccessError,
          );

          throw new HttpError(
            400,
            paymentAccessError.message ??
              "Impossible de créer le lien de paiement.",
          );
        }


        const paymentAccess =
          firstRow<PaymentAccess>(
            paymentAccessRaw as
              | PaymentAccess
              | PaymentAccess[]
              | null,
          );


        if (
          !paymentAccess ||
          !paymentAccess.access_id ||
          !paymentAccess.payment_token ||
          !/^[0-9a-f]{64}$/i.test(
            paymentAccess.payment_token,
          )
        ) {
          throw new HttpError(
            500,
            "Le serveur n'a pas retourné un lien de paiement valide.",
          );
        }


        const paymentUrl =
          new URL(
            `/payment/${paymentAccess.payment_token}`,
            `${publicUrl}/`,
          ).toString();


        // ====================================================
        // AUTHORITATIVE PUBLIC PAYMENT CONTEXT
        //
        // We use the same server decision consumed by
        // ShortRentalPaymentPage.
        // ====================================================

        const {
          data:
            paymentContextRaw,

          error:
            paymentContextError,
        } =
          await ctx.supabase.rpc(
            "get_public_short_rental_payment_context",
            {
              p_token:
                paymentAccess.payment_token,
            },
          );


        if (
          paymentContextError
        ) {
          console.error(
            "get_public_short_rental_payment_context error:",
            paymentContextError,
          );

          throw new HttpError(
            500,
            "Impossible de charger le contexte de paiement.",
          );
        }


        const paymentContext =
          firstRow<PublicPaymentContext>(
            paymentContextRaw as
              | PublicPaymentContext
              | PublicPaymentContext[]
              | null,
          );


        if (!paymentContext) {
          throw new HttpError(
            500,
            "Contexte de paiement introuvable.",
          );
        }


        if (
          paymentContext.booking_reference !==
          prepared.booking_reference
        ) {
          throw new HttpError(
            500,
            "Le contexte de paiement ne correspond pas à la réservation.",
          );
        }


        if (
          paymentContext.can_pay !==
          true
        ) {
          throw new HttpError(
            409,
            `Le paiement n'est pas disponible : ${
              paymentContext.payment_block_reason ??
              "raison inconnue"
            }.`,
          );
        }


        const amountDueNow =
          toNumber(
            paymentContext.amount_due_now,
          );


        if (
          amountDueNow <= 0
        ) {
          throw new HttpError(
            409,
            "Aucun montant positif n'est actuellement exigible.",
          );
        }


        // ====================================================
        // EMAIL CONTENT
        // ====================================================

        const guestName =
          escapeHtml(
            prepared.guest_name ||
              "Madame, Monsieur",
          );


        const bookingReference =
          escapeHtml(
            prepared.booking_reference,
          );


        const invoiceNumber =
          escapeHtml(
            paymentContext.invoice_number ||
              prepared.invoice_number,
          );


        const safePaymentUrl =
          escapeHtml(
            paymentUrl,
          );


        const currency =
          paymentContext.currency ||
          prepared.currency ||
          "GNF";


        const totalAmount =
          formatMoney(
            paymentContext.total_amount,
            currency,
          );


        const dueNow =
          formatMoney(
            amountDueNow,
            currency,
          );


        const deposit =
          formatMoney(
            prepared.deposit,
            currency,
          );


        const paymentPlanLabel =
          paymentContext.payment_plan ===
            "half"
            ? `Paiement en 2 fois — ${
                paymentContext
                  .initial_payment_percent
              } % au premier règlement`
            : "Paiement intégral";


        const paymentDueAt =
          paymentContext.payment_due_at ||
          prepared.payment_due_at;


        const subject =
          `Réservation confirmée – ${prepared.booking_reference}`;


        const html = `
          <!doctype html>
          <html lang="fr">
            <body style="
              margin:0;
              padding:0;
              background:#f5f7fa;
              font-family:Arial,sans-serif;
              color:#1f2937;
            ">
              <div style="
                max-width:660px;
                margin:32px auto;
                background:#ffffff;
                border:1px solid #e5e7eb;
                border-radius:16px;
                overflow:hidden;
              ">

                <div style="
                  background:#172554;
                  padding:26px 32px;
                  color:#ffffff;
                ">
                  <div style="
                    font-size:20px;
                    font-weight:700;
                  ">
                    AmImmo
                  </div>

                  <div style="
                    margin-top:6px;
                    font-size:13px;
                    color:#cbd5e1;
                  ">
                    Confirmation de réservation
                  </div>
                </div>

                <div style="
                  padding:32px;
                ">

                  <h1 style="
                    margin:0 0 20px;
                    font-size:24px;
                    line-height:1.3;
                    color:#172554;
                  ">
                    Votre réservation est confirmée
                  </h1>

                  <p style="
                    margin:0 0 16px;
                    line-height:1.7;
                  ">
                    Bonjour
                    <strong>${guestName}</strong>,
                  </p>

                  <p style="
                    margin:0 0 22px;
                    line-height:1.7;
                  ">
                    L'agence a validé votre demande de réservation
                    <strong>${bookingReference}</strong>.
                    Vous trouverez ci-dessous les informations
                    nécessaires pour poursuivre votre réservation.
                  </p>

                  <div style="
                    border:1px solid #e5e7eb;
                    background:#f8fafc;
                    border-radius:12px;
                    padding:18px;
                    margin-bottom:22px;
                  ">

                    <table
                      role="presentation"
                      style="
                        width:100%;
                        border-collapse:collapse;
                      "
                    >
                      <tr>
                        <td style="
                          padding:6px 0;
                          color:#64748b;
                        ">
                          Référence
                        </td>

                        <td style="
                          padding:6px 0;
                          text-align:right;
                          font-weight:700;
                        ">
                          ${bookingReference}
                        </td>
                      </tr>

                      <tr>
                        <td style="
                          padding:6px 0;
                          color:#64748b;
                        ">
                          Arrivée
                        </td>

                        <td style="
                          padding:6px 0;
                          text-align:right;
                          font-weight:600;
                        ">
                          ${
                            escapeHtml(
                              formatDate(
                                paymentContext.check_in,
                              ),
                            )
                          }
                        </td>
                      </tr>

                      <tr>
                        <td style="
                          padding:6px 0;
                          color:#64748b;
                        ">
                          Départ
                        </td>

                        <td style="
                          padding:6px 0;
                          text-align:right;
                          font-weight:600;
                        ">
                          ${
                            escapeHtml(
                              formatDate(
                                paymentContext.check_out,
                              ),
                            )
                          }
                        </td>
                      </tr>

                      <tr>
                        <td style="
                          padding:6px 0;
                          color:#64748b;
                        ">
                          Facture
                        </td>

                        <td style="
                          padding:6px 0;
                          text-align:right;
                          font-weight:600;
                        ">
                          ${invoiceNumber}
                        </td>
                      </tr>
                    </table>
                  </div>


                  <div style="
                    border:1px solid #bfdbfe;
                    background:#eff6ff;
                    border-radius:12px;
                    padding:18px;
                    margin-bottom:22px;
                  ">
                    <div style="
                      font-size:13px;
                      color:#1e40af;
                    ">
                      Montant du séjour
                    </div>

                    <div style="
                      margin-top:4px;
                      font-size:20px;
                      font-weight:700;
                      color:#172554;
                    ">
                      ${
                        escapeHtml(
                          totalAmount,
                        )
                      }
                    </div>

                    <div style="
                      margin-top:16px;
                      font-size:13px;
                      color:#1e40af;
                    ">
                      À régler maintenant
                    </div>

                    <div style="
                      margin-top:4px;
                      font-size:26px;
                      font-weight:700;
                      color:#172554;
                    ">
                      ${
                        escapeHtml(
                          dueNow,
                        )
                      }
                    </div>

                    <div style="
                      margin-top:12px;
                      font-size:13px;
                      line-height:1.6;
                      color:#334155;
                    ">
                      ${
                        escapeHtml(
                          paymentPlanLabel,
                        )
                      }
                    </div>

                    ${
                      paymentDueAt
                        ? `
                          <div style="
                            margin-top:8px;
                            font-size:13px;
                            color:#334155;
                          ">
                            Échéance du premier règlement :
                            <strong>
                              ${
                                escapeHtml(
                                  formatDateTime(
                                    paymentDueAt,
                                  ),
                                )
                              }
                            </strong>
                          </div>
                        `
                        : ""
                    }
                  </div>


                  ${
                    toNumber(
                      prepared.deposit,
                    ) > 0
                      ? `
                        <div style="
                          border:1px solid #e5e7eb;
                          border-radius:12px;
                          padding:16px;
                          margin-bottom:22px;
                        ">
                          <div style="
                            font-size:13px;
                            color:#64748b;
                          ">
                            Caution prévue
                          </div>

                          <div style="
                            margin-top:4px;
                            font-weight:700;
                          ">
                            ${
                              escapeHtml(
                                deposit,
                              )
                            }
                          </div>

                          <div style="
                            margin-top:7px;
                            font-size:12px;
                            line-height:1.5;
                            color:#64748b;
                          ">
                            La caution est suivie séparément
                            du montant du séjour.
                          </div>
                        </div>
                      `
                      : ""
                  }


                  <div style="
                    margin:28px 0;
                    text-align:center;
                  ">
                    <a
                      href="${safePaymentUrl}"
                      style="
                        display:inline-block;
                        background:#172554;
                        color:#ffffff;
                        text-decoration:none;
                        font-weight:700;
                        padding:14px 24px;
                        border-radius:10px;
                      "
                    >
                      Consulter votre paiement
                    </a>
                  </div>


                  <p style="
                    margin:0 0 24px;
                    font-size:13px;
                    line-height:1.7;
                    color:#64748b;
                  ">
                    Ce lien est personnel et sécurisé.
                    Ne le transmettez pas à un tiers.
                  </p>


                  ${
                    prepared.payment_policy_text
                      ? `
                        <div style="
                          border-top:1px solid #e5e7eb;
                          padding-top:20px;
                          margin-top:20px;
                        ">
                          <h2 style="
                            margin:0 0 10px;
                            font-size:16px;
                            color:#172554;
                          ">
                            Conditions de paiement
                          </h2>

                          <p style="
                            margin:0;
                            font-size:13px;
                            line-height:1.7;
                            color:#475569;
                          ">
                            ${
                              htmlMultiline(
                                prepared.payment_policy_text,
                              )
                            }
                          </p>
                        </div>
                      `
                      : ""
                  }


                  ${
                    prepared.cancellation_policy_text
                      ? `
                        <div style="
                          border-top:1px solid #e5e7eb;
                          padding-top:20px;
                          margin-top:20px;
                        ">
                          <h2 style="
                            margin:0 0 10px;
                            font-size:16px;
                            color:#172554;
                          ">
                            Conditions d'annulation
                          </h2>

                          <p style="
                            margin:0;
                            font-size:13px;
                            line-height:1.7;
                            color:#475569;
                          ">
                            ${
                              htmlMultiline(
                                prepared.cancellation_policy_text,
                              )
                            }
                          </p>
                        </div>
                      `
                      : ""
                  }


                  <hr style="
                    border:none;
                    border-top:1px solid #e5e7eb;
                    margin:28px 0 20px;
                  " />

                  <p style="
                    margin:0;
                    font-size:12px;
                    line-height:1.6;
                    color:#64748b;
                  ">
                    Message automatique envoyé par AmImmo.
                  </p>

                </div>
              </div>
            </body>
          </html>
        `;


        // ====================================================
        // RESEND
        //
        // IMPORTANT:
        //
        // Attempt number is part of the idempotency key.
        //
        // A later retry creates a new payment token and
        // therefore MUST be allowed to send a new email.
        // ====================================================

        const resendResponse =
          await fetch(
            "https://api.resend.com/emails",
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${resendApiKey}`,

                "Content-Type":
                  "application/json",

                "Idempotency-Key":
                  `guest-booking-confirmation-${prepared.delivery_id}-${claimedAttemptNo}`,
              },

              body:
                JSON.stringify({
                  from:
                    emailFrom,

                  to: [
                    prepared.recipient,
                  ],

                  subject,

                  html,
                }),
            },
          );


        let resendData:
          | Record<
              string,
              unknown
            >
          | null =
          null;


        try {
          resendData =
            await resendResponse.json();
        } catch {
          resendData =
            null;
        }


        if (
          !resendResponse.ok
        ) {
          const resendMessage =
            typeof resendData?.message ===
              "string"
              ? resendData.message
              : `Resend HTTP ${resendResponse.status}`;


          console.error(
            "Resend error:",
            resendData,
          );


          throw new HttpError(
            resendResponse.status >=
                400 &&
              resendResponse.status <
                600
              ? resendResponse.status
              : 502,

            resendMessage,
          );
        }


        const providerReference =
          typeof resendData?.id ===
            "string"
            ? resendData.id
            : null;


        if (
          !providerReference
        ) {
          throw new HttpError(
            502,
            "Resend n'a retourné aucun identifiant d'email.",
          );
        }


        // ====================================================
        // FINISH SUCCESS
        // ====================================================

        const {
          error:
            finishSuccessError,
        } =
          await ctx.supabase.rpc(
            "finish_guest_booking_confirmation_delivery_attempt",
            {
              p_delivery_id:
                prepared.delivery_id,

              p_succeeded:
                true,

              p_provider_reference:
                providerReference,

              p_error_message:
                null,
            },
          );


        if (
          finishSuccessError
        ) {
          console.error(
            "finish successful booking confirmation delivery error:",
            finishSuccessError,
          );

          throw new HttpError(
            500,
            "L'email a été accepté par le fournisseur, mais son statut n'a pas pu être finalisé dans AmImmo.",
          );
        }


        claimedDeliveryId =
          null;

        claimedAttemptNo =
          null;


        // ====================================================
        // SUCCESS
        // ====================================================

        return jsonResponse(
          {
            success:
              true,

            alreadySent:
              false,

            deliveryId:
              prepared.delivery_id,

            providerReference,

            recipient:
              prepared.recipient,

            bookingId:
              prepared.booking_id,

            bookingReference:
              prepared.booking_reference,

            invoiceNumber:
              paymentContext.invoice_number,

            amountDueNow,

            currency,

            paymentDueAt:
              paymentContext.payment_due_at,

            attemptNo:
              attempt.attempt_no,
          },
        );
      } catch (
        error
      ) {
        const message =
          error instanceof Error
            ? error.message
            : "Erreur interne lors de l'envoi de la confirmation.";


        // ====================================================
        // FINISH FAILED CLAIMED ATTEMPT
        // ====================================================

        if (
          claimedDeliveryId &&
          claimedAttemptNo !==
            null
        ) {
          const {
            error:
              finishFailureError,
          } =
            await ctx.supabase.rpc(
              "finish_guest_booking_confirmation_delivery_attempt",
              {
                p_delivery_id:
                  claimedDeliveryId,

                p_succeeded:
                  false,

                p_provider_reference:
                  null,

                p_error_message:
                  message,
              },
            );


          if (
            finishFailureError
          ) {
            console.error(
              "finish failed booking confirmation delivery error:",
              finishFailureError,
            );
          }
        }


        console.error(
          "send-guest-booking-confirmation-email:",
          error,
        );


        return jsonResponse(
          {
            success:
              false,

            error:
              message,
          },

          error instanceof HttpError
            ? error.status
            : 500,
        );
      }
    },
  ),
};