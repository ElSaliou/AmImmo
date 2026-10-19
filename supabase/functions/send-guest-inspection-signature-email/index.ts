import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type RequestBody = {
  inspectionId: string;
};

type PreparedDelivery = {
  delivery_id: string;
  delivery_status: string;
  inspection_id: string;
  inspection_reference: string | null;
  inspection_kind: "checkin" | "checkout" | string;
  inspection_version: number;
  booking_id: string;
  booking_reference: string | null;
  guest_id: string;
  guest_user_id: string | null;
  guest_name: string | null;
  recipient: string;
  relative_link: string;
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

function isUuid(
  value: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function escapeHtml(
  value: string | null | undefined,
) {
  return String(
    value ?? "",
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePublicUrl(
  value: string,
) {
  return value.trim().replace(
    /\/+$/,
    "",
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
        // ====================================================
        // METHOD
        // ====================================================

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
          return jsonResponse(
            {
              error:
                "RESEND_API_KEY n'est pas configurée.",
            },
            500,
          );
        }

        if (!publicUrl) {
          return jsonResponse(
            {
              error:
                "APP_PUBLIC_URL n'est pas configurée.",
            },
            500,
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
                "Impossible de vérifier les autorisations.",
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
                "Accès réservé au personnel autorisé.",
            },
            403,
          );
        }

        // ====================================================
        // REQUEST BODY
        //
        // IMPORTANT:
        // no email recipient is accepted from the client.
        // ====================================================

        let body:
          RequestBody;

        try {
          body =
            (await req.json()) as RequestBody;
        } catch {
          return jsonResponse(
            {
              error:
                "Corps JSON invalide.",
            },
            400,
          );
        }

        const inspectionId =
          body.inspectionId?.trim();

        if (
          !inspectionId ||
          !isUuid(
            inspectionId,
          )
        ) {
          return jsonResponse(
            {
              error:
                "Identifiant d'état des lieux invalide.",
            },
            400,
          );
        }

        // ====================================================
        // PREPARE CANONICAL DELIVERY
        //
        // Server resolves:
        // inspection
        // -> booking
        // -> booking.guest_email
        // -> guest
        //
        // It also verifies:
        // - staff organization
        // - ready_for_signature
        // - current agency signature
        // ====================================================

        const {
          data:
            preparedRaw,
          error:
            prepareError,
        } =
          await ctx.supabase.rpc(
            "prepare_guest_inspection_signature_delivery",
            {
              p_inspection_id:
                inspectionId,
            },
          );

        if (
          prepareError
        ) {
          console.error(
            "prepare_guest_inspection_signature_delivery error:",
            prepareError,
          );

          return jsonResponse(
            {
              error:
                prepareError.message ??
                "Impossible de préparer l'envoi au voyageur.",
            },
            400,
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
          return jsonResponse(
            {
              error:
                "Réponse de préparation d'envoi invalide.",
            },
            500,
          );
        }

        const prepared =
          preparedRaw as unknown as PreparedDelivery;

        // ====================================================
        // LINKED GUEST REQUIREMENT FOR THIS PHASE
        //
        // No new invitation is created here.
        // Invitation orchestration for an unlinked guest
        // belongs to a later phase.
        // ====================================================

        if (
          !prepared.guest_user_id
        ) {
          return jsonResponse(
            {
              error:
                "Le voyageur n'est pas encore lié à un compte. Aucun email de signature n'a été envoyé.",
              code:
                "guest_not_linked",
              deliveryId:
                prepared.delivery_id,
            },
            409,
          );
        }

        // ====================================================
        // ALREADY SENT
        //
        // Successful delivery is immutable.
        // Do not call Resend again.
        // ====================================================

        if (
          prepared.delivery_status ===
          "sent"
        ) {
          return jsonResponse(
            {
              success: true,
              alreadySent: true,

              deliveryId:
                prepared.delivery_id,

              inspectionId:
                prepared.inspection_id,

              inspectionReference:
                prepared.inspection_reference,

              inspectionVersion:
                prepared.inspection_version,

              recipient:
                prepared.recipient,
            },
          );
        }

        // ====================================================
        // EMAIL CONTENT
        // ====================================================

        const isCheckin =
          prepared.inspection_kind ===
          "checkin";

        const inspectionLabel =
          isCheckin
            ? "état des lieux d'entrée"
            : "état des lieux de sortie";

        const accessUrl =
          new URL(
            "/guest/access",
            `${publicUrl}/`,
          );

        accessUrl.searchParams.set(
          "next",
          prepared.relative_link,
        );

        const actionUrl =
          accessUrl.toString();

        const guestName =
          escapeHtml(
            prepared.guest_name ||
              "Madame, Monsieur",
          );

        const inspectionReference =
          escapeHtml(
            prepared.inspection_reference ||
              prepared.inspection_id,
          );

        const bookingReference =
          escapeHtml(
            prepared.booking_reference ||
              prepared.booking_id,
          );

        const safeActionUrl =
          escapeHtml(
            actionUrl,
          );

        const subject =
          `${
            isCheckin
              ? "État des lieux d'entrée"
              : "État des lieux de sortie"
          } à signer${
            prepared.inspection_reference
              ? ` – ${prepared.inspection_reference}`
              : ""
          }`;

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
                max-width:640px;
                margin:32px auto;
                background:#ffffff;
                border-radius:14px;
                padding:32px;
                border:1px solid #e5e7eb;
              ">
                <div style="
                  margin-bottom:24px;
                ">
                  <div style="
                    display:inline-block;
                    background:#172554;
                    color:#ffffff;
                    border-radius:10px;
                    padding:10px 16px;
                    font-weight:700;
                    font-size:18px;
                  ">
                    AmImmo
                  </div>
                </div>

                <h1 style="
                  margin:0 0 18px;
                  font-size:24px;
                  line-height:1.3;
                  color:#172554;
                ">
                  Votre ${inspectionLabel} est prêt à être signé
                </h1>

                <p style="
                  margin:0 0 16px;
                  line-height:1.7;
                ">
                  Bonjour
                  <strong>${guestName}</strong>,
                </p>

                <p style="
                  margin:0 0 16px;
                  line-height:1.7;
                ">
                  L'agence a signé la version
                  <strong>${prepared.inspection_version}</strong>
                  de votre ${inspectionLabel}.
                </p>

                <p style="
                  margin:0 0 22px;
                  line-height:1.7;
                ">
                  Vous pouvez maintenant consulter le document,
                  vérifier son contenu puis enregistrer votre signature
                  depuis votre espace voyageur sécurisé.
                </p>

                <div style="
                  background:#f8fafc;
                  border:1px solid #e5e7eb;
                  border-radius:10px;
                  padding:16px;
                  margin-bottom:24px;
                ">
                  <div style="
                    margin-bottom:8px;
                  ">
                    <strong>État des lieux :</strong>
                    ${inspectionReference}
                  </div>

                  <div>
                    <strong>Réservation :</strong>
                    ${bookingReference}
                  </div>
                </div>

                <div style="
                  margin:28px 0;
                  text-align:center;
                ">
                  <a
                    href="${safeActionUrl}"
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
                    Consulter et signer
                  </a>
                </div>

                <p style="
                  margin:20px 0 0;
                  font-size:13px;
                  line-height:1.6;
                  color:#6b7280;
                ">
                  Pour votre sécurité, la signature nécessite
                  l'authentification de votre compte voyageur AmImmo.
                </p>

                <hr style="
                  border:none;
                  border-top:1px solid #e5e7eb;
                  margin:28px 0 20px;
                " />

                <p style="
                  margin:0;
                  font-size:12px;
                  line-height:1.6;
                  color:#6b7280;
                ">
                  Message automatique envoyé par AmImmo.
                  Ne transmettez pas votre lien de connexion à un tiers.
                </p>
              </div>
            </body>
          </html>
        `;

        // ====================================================
        // RESEND
        //
        // Stable idempotency key = delivery UUID.
        // If the HTTP response is lost after Resend accepted
        // the request, retrying does not create another email.
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
                  `guest-inspection-signature-${prepared.delivery_id}`,
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
          | Record<string, unknown>
          | null = null;

        try {
          resendData =
            await resendResponse.json();
        } catch {
          resendData =
            null;
        }

        // ====================================================
        // RESEND FAILURE
        // ====================================================

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

          const {
            error:
              markFailureError,
          } =
            await ctx.supabase.rpc(
              "mark_guest_communication_delivery",
              {
                p_delivery_id:
                  prepared.delivery_id,

                p_succeeded:
                  false,

                p_provider_reference:
                  null,

                p_error_message:
                  resendMessage,
              },
            );

          if (
            markFailureError
          ) {
            console.error(
              "mark failed delivery error:",
              markFailureError,
            );
          }

          return jsonResponse(
            {
              error:
                resendMessage,

              deliveryId:
                prepared.delivery_id,
            },
            resendResponse.status >=
              400 &&
            resendResponse.status <
              600
              ? resendResponse.status
              : 502,
          );
        }

        // ====================================================
        // RESEND SUCCESS
        // ====================================================

        const providerReference =
          typeof resendData?.id ===
            "string"
            ? resendData.id
            : null;

        if (
          !providerReference
        ) {
          const errorMessage =
            "Resend n'a retourné aucun identifiant d'email.";

          const {
            error:
              markMissingReferenceError,
          } =
            await ctx.supabase.rpc(
              "mark_guest_communication_delivery",
              {
                p_delivery_id:
                  prepared.delivery_id,

                p_succeeded:
                  false,

                p_provider_reference:
                  null,

                p_error_message:
                  errorMessage,
              },
            );

          if (
            markMissingReferenceError
          ) {
            console.error(
              "mark missing reference error:",
              markMissingReferenceError,
            );
          }

          return jsonResponse(
            {
              error:
                errorMessage,

              deliveryId:
                prepared.delivery_id,
            },
            502,
          );
        }

        // ====================================================
        // MARK SUCCESS
        // ====================================================

        const {
          data:
            markedDelivery,
          error:
            markSuccessError,
        } =
          await ctx.supabase.rpc(
            "mark_guest_communication_delivery",
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
          markSuccessError
        ) {
          console.error(
            "mark successful delivery error:",
            markSuccessError,
          );

          return jsonResponse(
            {
              error:
                "L'email a été accepté par le fournisseur, mais son statut n'a pas pu être finalisé dans AmImmo.",

              deliveryId:
                prepared.delivery_id,

              providerReference,
            },
            500,
          );
        }

        // ====================================================
        // SUCCESS
        // ====================================================

        return jsonResponse(
          {
            success: true,
            alreadySent: false,

            deliveryId:
              prepared.delivery_id,

            providerReference,

            recipient:
              prepared.recipient,

            inspectionId:
              prepared.inspection_id,

            inspectionReference:
              prepared.inspection_reference,

            inspectionVersion:
              prepared.inspection_version,

            bookingId:
              prepared.booking_id,

            bookingReference:
              prepared.booking_reference,

            actionUrl,

            delivery:
              markedDelivery,
          },
        );
      } catch (
        error
      ) {
        console.error(
          "send-guest-inspection-signature-email:",
          error,
        );

        return jsonResponse(
          {
            error:
              error instanceof Error
                ? error.message
                : "Erreur interne lors de l'envoi de l'état des lieux.",
          },
          500,
        );
      }
    },
  ),
};