import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type RequestBody = {
  statementId: string;
  recipient: string;
  pdfBase64: string;
  filename?: string;
  deliveryAttemptId: string;
};

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

function formatMoney(
  value: number | null | undefined,
) {
  const amount =
    Math.round(
      Number(value ?? 0),
    );

  return amount
    .toString()
    .replace(
      /\B(?=(\d{3})+(?!\d))/g,
      " ",
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
      try {
        if (
          req.method !== "POST"
        ) {
          return jsonResponse(
            {
              error:
                "Méthode non autorisée.",
            },
            405,
          );
        }

        const resendApiKey =
          Deno.env.get(
            "RESEND_API_KEY",
          );

        if (!resendApiKey) {
          return jsonResponse(
            {
              error:
                "RESEND_API_KEY n'est pas configurée.",
            },
            500,
          );
        }

        // ====================================================
        // AUTHENTIFICATION UTILISATEUR
        // ====================================================

        const {
          data:
            authenticatedUser,
          error:
            authenticatedUserError,
        } =
          await ctx.supabase.auth.getUser();

        if (
          authenticatedUserError ||
          !authenticatedUser.user
        ) {
          return jsonResponse(
            {
              error:
                "Session utilisateur invalide.",
            },
            401,
          );
        }

        // ====================================================
        // STAFF CHECK
        // ====================================================

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
                authenticatedUser.user.id,
            },
          );

        if (staffError) {
          console.error(
            "is_staff error:",
            staffError,
          );

          return jsonResponse(
            {
              error:
                "Impossible de vérifier les autorisations de l'utilisateur.",
            },
            500,
          );
        }

        if (
          staffAllowed !== true
        ) {
          return jsonResponse(
            {
              error:
                "Vous n'êtes pas autorisé à envoyer ce relevé.",
            },
            403,
          );
        }

        // ====================================================
        // REQUEST BODY
        // ====================================================

        let body: RequestBody;

        try {
          body =
            (await req.json()) as RequestBody;
        } catch {
          return jsonResponse(
            {
              error:
                "Corps de requête JSON invalide.",
            },
            400,
          );
        }

        const statementId =
          body.statementId?.trim();

        const recipient =
          body.recipient?.trim();

        const pdfBase64 =
          body.pdfBase64?.trim();

        const filename =
          body.filename?.trim();

        const deliveryAttemptId =
          body.deliveryAttemptId?.trim();

        if (!statementId) {
          return jsonResponse(
            {
              error:
                "Identifiant du relevé obligatoire.",
            },
            400,
          );
        }

        if (
          !deliveryAttemptId ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            deliveryAttemptId,
          )
        ) {
          return jsonResponse(
            {
              error:
                "Identifiant de tentative d'envoi invalide.",
            },
            400,
          );
        }

        if (
          !recipient ||
          !recipient.includes(
            "@",
          )
        ) {
          return jsonResponse(
            {
              error:
                "Adresse email invalide.",
            },
            400,
          );
        }

        if (!pdfBase64) {
          return jsonResponse(
            {
              error:
                "Le PDF est obligatoire.",
            },
            400,
          );
        }

        // ====================================================
        // LOAD OFFICIAL STATEMENT
        // ====================================================

        const {
          data:
            statement,
          error:
            statementError,
        } =
          await ctx.supabase
            .from(
              "owner_statements",
            )
            .select(`
              id,
              reference,
              owner_id,
              owner_name,
              owner_email,
              period_start,
              period_end,
              currency,
              closing_balance,
              status
            `)
            .eq(
              "id",
              statementId,
            )
            .single();

        if (
          statementError ||
          !statement
        ) {
          console.error(
            "owner_statements error:",
            statementError,
          );

          return jsonResponse(
            {
              error:
                statementError?.message ??
                "Relevé introuvable.",
            },
            404,
          );
        }

        // ====================================================
        // BUSINESS RULES
        // ====================================================

        if (
          statement.status ===
          "cancelled"
        ) {
          return jsonResponse(
            {
              error:
                "Un relevé annulé ne peut pas être envoyé.",
            },
            400,
          );
        }

        if (
          statement.status !==
            "issued" &&
          statement.status !==
            "sent"
        ) {
          return jsonResponse(
            {
              error:
                "Seul un relevé émis ou déjà envoyé peut être transmis.",
            },
            400,
          );
        }

        // ====================================================
        // EMAIL CONTENT
        // ====================================================

        const subject =
          `Relevé propriétaire ${statement.reference}`;

        const html = `
          <!doctype html>
          <html lang="fr">
            <body style="
              margin:0;
              padding:0;
              background:#f5f5f5;
              font-family:Arial,sans-serif;
              color:#1f2937;
            ">
              <div style="
                max-width:640px;
                margin:30px auto;
                background:#ffffff;
                border-radius:10px;
                padding:32px;
              ">
                <h2 style="
                  margin:0 0 24px;
                  color:#172554;
                ">
                  ImmoPlate
                </h2>

                <p>
                  Bonjour
                  <strong>
                    ${
                      statement.owner_name ??
                      "Madame, Monsieur"
                    }
                  </strong>,
                </p>

                <p>
                  Veuillez trouver en pièce jointe votre relevé propriétaire
                  <strong>
                    ${statement.reference}
                  </strong>.
                </p>

                <p>
                  Période :
                  <strong>
                    ${statement.period_start}
                    au
                    ${statement.period_end}
                  </strong>
                </p>

                <p>
                  Solde de clôture :
                  <strong>
                    ${formatMoney(
                      statement.closing_balance,
                    )}
                    ${
                      statement.currency ??
                      "GNF"
                    }
                  </strong>
                </p>

                <p>
                  Le document PDF joint correspond au relevé officiel
                  enregistré dans ImmoPlate.
                </p>

                <p style="
                  margin-top:30px;
                ">
                  Cordialement,<br />
                  <strong>
                    ImmoPlate
                  </strong>
                </p>

                <hr style="
                  border:none;
                  border-top:1px solid #e5e7eb;
                  margin-top:30px;
                " />

                <p style="
                  font-size:12px;
                  color:#6b7280;
                ">
                  Message généré automatiquement par ImmoPlate.
                </p>
              </div>
            </body>
          </html>
        `;

        // ====================================================
        // SEND THROUGH RESEND
        // ====================================================

        const resendResponse =
          await fetch(
            "https://api.resend.com/emails",
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${resendApiKey}`,

                "Content-Type":
                  "application/json",

                "Idempotency-Key":
                  `owner-statement-${statementId}-${deliveryAttemptId}`,
              },

              body:
                JSON.stringify({
                  from:
                    "ImmoPlate <onboarding@resend.dev>",

                  to: [
                    recipient,
                  ],

                  subject,

                  html,

                  attachments: [
                    {
                      filename:
                        filename ||
                        `${statement.reference}.pdf`,

                      content:
                        pdfBase64,
                    },
                  ],
                }),
            },
          );

        let resendData:
          | Record<string, unknown>
          | null = null;

        try {
          resendData =
            await resendResponse.json();
        } catch {
          resendData = null;
        }

        if (
          !resendResponse.ok
        ) {
          console.error(
            "Resend error:",
            resendData,
          );

          const resendMessage =
            typeof resendData?.message ===
              "string"
              ? resendData.message
              : null;

          return jsonResponse(
            {
              error:
                resendMessage ??
                "L'envoi de l'email a échoué.",
            },
            resendResponse.status,
          );
        }

        // ====================================================
        // SUCCESS
        // ====================================================

        const emailId =
          typeof resendData?.id ===
            "string"
            ? resendData.id
            : null;

        return jsonResponse(
          {
            success: true,

            emailId,

            recipient,

            statementId:
              statement.id,

            reference:
              statement.reference,

            deliveryAttemptId,
          },
        );
      } catch (error) {
        console.error(
          "send-owner-statement-email:",
          error,
        );

        return jsonResponse(
          {
            error:
              error instanceof Error
                ? error.message
                : "Erreur interne lors de l'envoi du relevé.",
          },
          500,
        );
      }
    },
  ),
};
