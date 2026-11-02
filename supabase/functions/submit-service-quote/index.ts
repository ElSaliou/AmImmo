import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2";

import {
  corsHeaders,
} from "../_shared/cors.ts";


type QuoteRequestBody = {
  service_id?: unknown;
  customer_name?: unknown;
  customer_email?: unknown;
  customer_phone?: unknown;
  subject?: unknown;
  message?: unknown;
  property_id?: unknown;

  // Honeypot.
  website?: unknown;
};


type PublicErrorCode =
  | "METHOD_NOT_ALLOWED"
  | "INVALID_REQUEST"
  | "INVALID_SERVICE"
  | "INVALID_CUSTOMER_NAME"
  | "INVALID_MESSAGE"
  | "CONTACT_REQUIRED"
  | "INVALID_EMAIL"
  | "INVALID_PHONE"
  | "INVALID_SUBJECT"
  | "INVALID_PROPERTY"
  | "SERVICE_NOT_AVAILABLE"
  | "SPAM_REJECTED"
  | "INTERNAL_ERROR";


function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}


function errorResponse(
  status: number,
  code: PublicErrorCode,
  message: string,
): Response {
  return jsonResponse(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    status,
  );
}


function successResponse(): Response {
  return jsonResponse(
    {
      success: true,
      message:
        "Votre demande de devis a bien été transmise.",
    },
    201,
  );
}


function normalizeOptionalString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}


function normalizeEmail(
  value: unknown,
): string | null {
  const normalized =
    normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase();
}


function isValidUuid(
  value: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}


function isReasonableEmail(
  value: string,
): boolean {
  if (value.length > 254) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(value);
}


function mapRpcError(
  message: string,
): Response {
  const knownErrors:
    Record<
      string,
      {
        status: number;
        code: PublicErrorCode;
        message: string;
      }
    > = {
      INVALID_SERVICE: {
        status: 400,
        code: "INVALID_SERVICE",
        message:
          "La prestation sélectionnée est invalide.",
      },

      INVALID_CUSTOMER_NAME: {
        status: 400,
        code: "INVALID_CUSTOMER_NAME",
        message:
          "Le nom renseigné est invalide.",
      },

      INVALID_MESSAGE: {
        status: 400,
        code: "INVALID_MESSAGE",
        message:
          "Le message renseigné est invalide.",
      },

      CONTACT_REQUIRED: {
        status: 400,
        code: "CONTACT_REQUIRED",
        message:
          "Un email ou un numéro de téléphone est requis.",
      },

      INVALID_EMAIL: {
        status: 400,
        code: "INVALID_EMAIL",
        message:
          "L'adresse email est invalide.",
      },

      INVALID_PHONE: {
        status: 400,
        code: "INVALID_PHONE",
        message:
          "Le numéro de téléphone est invalide.",
      },

      INVALID_SUBJECT: {
        status: 400,
        code: "INVALID_SUBJECT",
        message:
          "L'objet de la demande est invalide.",
      },

      INVALID_PROPERTY: {
        status: 400,
        code: "INVALID_PROPERTY",
        message:
          "Le bien sélectionné est invalide.",
      },

      SERVICE_NOT_AVAILABLE: {
        status: 404,
        code: "SERVICE_NOT_AVAILABLE",
        message:
          "Cette prestation n'est pas disponible.",
      },
    };


  for (
    const [
      rpcCode,
      mapped,
    ] of Object.entries(knownErrors)
  ) {
    if (message.includes(rpcCode)) {
      return errorResponse(
        mapped.status,
        mapped.code,
        mapped.message,
      );
    }
  }


  console.error(
    "submit-service-quote RPC error:",
    message,
  );

  return errorResponse(
    500,
    "INTERNAL_ERROR",
    "Impossible de transmettre la demande de devis.",
  );
}


Deno.serve(
  async (
    req: Request,
  ): Promise<Response> => {
    // ----------------------------------------------------------
    // 1. CORS
    // ----------------------------------------------------------

    if (req.method === "OPTIONS") {
      return new Response(
        "ok",
        {
          headers: corsHeaders,
        },
      );
    }


    // ----------------------------------------------------------
    // 2. HTTP METHOD
    // ----------------------------------------------------------

    if (req.method !== "POST") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "Méthode HTTP non autorisée.",
      );
    }


    // ----------------------------------------------------------
    // 3. SERVER CONFIG
    // ----------------------------------------------------------

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );


    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "submit-service-quote: missing Supabase server configuration",
      );

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Configuration serveur indisponible.",
      );
    }


    // ----------------------------------------------------------
    // 4. JSON BODY
    // ----------------------------------------------------------

    let body:
      QuoteRequestBody;

    try {
      body =
        await req.json();
    } catch {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Le corps de la requête est invalide.",
      );
    }


    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Le corps de la requête est invalide.",
      );
    }


    // ----------------------------------------------------------
    // 5. MINIMAL ANTI-SPAM HONEYPOT
    // ----------------------------------------------------------

    const website =
      normalizeOptionalString(
        body.website,
      );

    if (website) {
      return errorResponse(
        400,
        "SPAM_REJECTED",
        "Requête invalide.",
      );
    }


    // ----------------------------------------------------------
    // 6. NORMALIZATION
    // ----------------------------------------------------------

    const serviceId =
      normalizeOptionalString(
        body.service_id,
      );

    const customerName =
      normalizeOptionalString(
        body.customer_name,
      );

    const customerEmail =
      normalizeEmail(
        body.customer_email,
      );

    const customerPhone =
      normalizeOptionalString(
        body.customer_phone,
      );

    const subject =
      normalizeOptionalString(
        body.subject,
      );

    const message =
      normalizeOptionalString(
        body.message,
      );

    const propertyId =
      normalizeOptionalString(
        body.property_id,
      );


    // ----------------------------------------------------------
    // 7. INPUT VALIDATION
    // ----------------------------------------------------------

    if (
      !serviceId ||
      !isValidUuid(serviceId)
    ) {
      return errorResponse(
        400,
        "INVALID_SERVICE",
        "La prestation sélectionnée est invalide.",
      );
    }


    if (
      !customerName ||
      customerName.length < 2 ||
      customerName.length > 120
    ) {
      return errorResponse(
        400,
        "INVALID_CUSTOMER_NAME",
        "Le nom doit contenir entre 2 et 120 caractères.",
      );
    }


    if (
      !message ||
      message.length < 10 ||
      message.length > 5000
    ) {
      return errorResponse(
        400,
        "INVALID_MESSAGE",
        "Le message doit contenir entre 10 et 5000 caractères.",
      );
    }


    if (
      !customerEmail &&
      !customerPhone
    ) {
      return errorResponse(
        400,
        "CONTACT_REQUIRED",
        "Un email ou un numéro de téléphone est requis.",
      );
    }


    if (
      customerEmail &&
      !isReasonableEmail(customerEmail)
    ) {
      return errorResponse(
        400,
        "INVALID_EMAIL",
        "L'adresse email est invalide.",
      );
    }


    if (
      customerPhone &&
      customerPhone.length > 40
    ) {
      return errorResponse(
        400,
        "INVALID_PHONE",
        "Le numéro de téléphone est invalide.",
      );
    }


    if (
      subject &&
      subject.length > 180
    ) {
      return errorResponse(
        400,
        "INVALID_SUBJECT",
        "L'objet de la demande est trop long.",
      );
    }


    if (
      propertyId &&
      !isValidUuid(propertyId)
    ) {
      return errorResponse(
        400,
        "INVALID_PROPERTY",
        "Le bien sélectionné est invalide.",
      );
    }


    // ----------------------------------------------------------
    // 8. SERVICE ROLE CLIENT
    // ----------------------------------------------------------

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );


    // ----------------------------------------------------------
    // 9. RESTRICTED RPC
    // ----------------------------------------------------------

    const {
      data: quoteId,
      error,
    } =
      await supabase.rpc(
        "create_public_quote_request",
        {
          p_service_id:
            serviceId,

          p_customer_name:
            customerName,

          p_message:
            message,

          p_customer_email:
            customerEmail,

          p_customer_phone:
            customerPhone,

          p_subject:
            subject,

          p_property_id:
            propertyId,
        },
      );


    if (error) {
      return mapRpcError(
        error.message,
      );
    }


    // ----------------------------------------------------------
    // 10. AGENCY EMAIL NOTIFICATION
    //
    // Quote creation is authoritative. Email delivery is only a
    // non-blocking side effect and must never change the public
    // success response.
    // ----------------------------------------------------------

    try {
      const resendApiKey =
        Deno.env.get(
          "RESEND_API_KEY",
        )?.trim();

      const agencyEmail =
        Deno.env.get(
          "AGENCY_QUOTE_NOTIFICATION_EMAIL",
        )?.trim();

      const agencyEmailFrom =
        Deno.env.get(
          "AGENCY_QUOTE_EMAIL_FROM",
        )?.trim() ||
        "AmImmo <onboarding@resend.dev>";


      if (
        !resendApiKey ||
        !agencyEmail
      ) {
        console.error(
          "[service-quote] Agency email configuration is incomplete.",
        );
      } else {
        let serviceTitle =
          "Prestation";


        const {
          data: serviceRecord,
          error: serviceLookupError,
        } =
          await supabase
            .from(
              "services",
            )
            .select(
              "title",
            )
            .eq(
              "id",
              serviceId,
            )
            .maybeSingle();


        if (
          serviceLookupError
        ) {
          console.error(
            "[service-quote] Service title lookup failed.",
            serviceLookupError,
          );
        } else if (
          typeof serviceRecord?.title ===
            "string" &&
          serviceRecord.title.trim()
        ) {
          serviceTitle =
            serviceRecord.title.trim();
        }


        const escapeHtml =
          (
            value:
              string,
          ): string =>
            value
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


        const displayEmail =
          customerEmail ||
          "Non renseigné";

        const displayPhone =
          customerPhone ||
          "Non renseigné";

        const displaySubject =
          subject ||
          `Demande de devis — ${serviceTitle}`;

        const emailSubject =
          `Nouvelle demande de devis — ${serviceTitle}`;


        const text =
          [
            "Nouvelle demande de devis AmImmo",
            "",
            `Prestation : ${serviceTitle}`,
            `Client : ${customerName}`,
            `Email : ${displayEmail}`,
            `Téléphone : ${displayPhone}`,
            `Objet : ${displaySubject}`,
            "",
            "Message :",
            message,
          ].join(
            "\n",
          );


        const html =
          `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;">
        <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;">
          Nouvelle demande de devis
        </h1>

        <p style="margin:0 0 20px;color:#475569;">
          Une nouvelle demande a été envoyée depuis le site AmImmo.
        </p>

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;font-weight:700;vertical-align:top;">Prestation</td>
            <td style="padding:8px 0;">${escapeHtml(serviceTitle)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:700;vertical-align:top;">Client</td>
            <td style="padding:8px 0;">${escapeHtml(customerName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:700;vertical-align:top;">Email</td>
            <td style="padding:8px 0;">${escapeHtml(displayEmail)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:700;vertical-align:top;">Téléphone</td>
            <td style="padding:8px 0;">${escapeHtml(displayPhone)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-weight:700;vertical-align:top;">Objet</td>
            <td style="padding:8px 0;">${escapeHtml(displaySubject)}</td>
          </tr>
        </table>

        <div style="margin-top:22px;padding:18px;background:#f8fafc;border-radius:12px;">
          <div style="font-size:13px;font-weight:700;margin-bottom:8px;">
            Message
          </div>
          <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
        </div>

        <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
          Notification automatique AmImmo.
        </p>
      </div>
    </div>
  </body>
</html>`;


        const resendPayload:
          Record<
            string,
            unknown
          > =
          {
            from:
              agencyEmailFrom,

            to:
              [
                agencyEmail,
              ],

            subject:
              emailSubject,

            text,

            html,
          };


        if (
          customerEmail
        ) {
          resendPayload.reply_to =
            customerEmail;
        }


        const quoteIdText =
          typeof quoteId ===
            "string" &&
          quoteId
            ? quoteId
            : crypto.randomUUID();


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
                  `service-quote-agency-${quoteIdText}`,
              },

              body:
                JSON.stringify(
                  resendPayload,
                ),
            },
          );


        if (
          !resendResponse.ok
        ) {
          let resendData:
            unknown =
            null;

          try {
            resendData =
              await resendResponse.json();
          } catch {
            resendData =
              null;
          }

          console.error(
            "[service-quote] Agency email delivery failed.",
            {
              status:
                resendResponse.status,

              data:
                resendData,
            },
          );
        }
      }
    } catch (
      notificationError
    ) {
      console.error(
        "[service-quote] Agency email notification failed.",
        notificationError,
      );
    }


    // ----------------------------------------------------------
    // 11. MINIMAL PUBLIC SUCCESS RESPONSE
    //
    // The internal quote UUID is deliberately not returned.
    // ----------------------------------------------------------

    return successResponse();
  },
);