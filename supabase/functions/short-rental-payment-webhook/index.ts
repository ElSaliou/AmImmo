import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2";


type WebhookBody = {
  event?: unknown;
  reference?: unknown;
  provider_reference?: unknown;
  amount?: unknown;
  currency?: unknown;
  paid_at?: unknown;
};


type StoredProviderTransaction = {
  id: string;
  provider_transaction_id: string;
  provider_reference: string | null;
  provider: string;
  payment_method: string | null;
  amount: number | string;
  currency: string;
  status: string;
  payment_id: string | null;
};


type FinalizeResult = {
  provider_transaction_id: string;
  payment_id: string;
  invoice_id: string;
  booking_id: string;
  payment_reference: string;
  amount: number | string;
  currency: string;
  payment_method: string;
  provider_status: string;
  reused: boolean;
  completed_at: string | null;
};


function jsonResponse(
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store",
      },
    },
  );
}


function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return jsonResponse(
    status,
    {
      success: false,
      error: {
        code,
        message,
      },
    },
  );
}


function successResponse(
  data: unknown,
): Response {
  return jsonResponse(
    200,
    {
      success: true,
      ...(
        typeof data === "object" &&
          data !== null
          ? data
          : {}
      ),
    },
  );
}


function normalizeString(
  value: unknown,
  maxLength = 200,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > maxLength
  ) {
    return null;
  }

  return normalized;
}


function normalizeAmount(
  value: unknown,
): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}


function normalizeCurrency(
  value: unknown,
): string | null {
  const normalized =
    normalizeString(
      value,
      12,
    );

  if (!normalized) {
    return null;
  }

  return normalized.toUpperCase();
}


function normalizePaidAt(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return new Date().toISOString();
  }

  const parsed =
    new Date(
      value.trim(),
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}


function firstRow<T>(
  data: T | T[] | null,
): T | null {
  if (data === null) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.length > 0
      ? data[0]
      : null;
  }

  return data;
}


async function sha256(
  value: string,
): Promise<Uint8Array> {
  const bytes =
    new TextEncoder()
      .encode(value);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes,
    );

  return new Uint8Array(
    digest,
  );
}


async function secureEqual(
  left: string,
  right: string,
): Promise<boolean> {
  const [
    leftHash,
    rightHash,
  ] =
    await Promise.all([
      sha256(left),
      sha256(right),
    ]);

  let difference = 0;

  for (
    let index = 0;
    index < leftHash.length;
    index++
  ) {
    difference |=
      leftHash[index] ^
      rightHash[index];
  }

  return difference === 0;
}


Deno.serve(
  async (
    req: Request,
  ): Promise<Response> => {

    /*
     * =========================================================
     * 1. HTTP
     * =========================================================
     */

    if (req.method !== "POST") {
      return errorResponse(
        405,
        "METHOD_NOT_ALLOWED",
        "Méthode HTTP non autorisée.",
      );
    }


    /*
     * =========================================================
     * 2. CONFIGURATION SERVEUR
     * =========================================================
     */

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const webhookSecret =
      Deno.env.get(
        "SIMULATED_PAYMENT_WEBHOOK_SECRET",
      );


    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !webhookSecret
    ) {
      console.error(
        "[payment-webhook] Missing server configuration",
      );

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Le webhook de paiement n'est pas configuré.",
      );
    }


    /*
     * =========================================================
     * 3. AUTHENTIFICATION DU WEBHOOK
     * =========================================================
     */

    const suppliedSecret =
      req.headers.get(
        "x-amimmo-webhook-secret",
      ) ?? "";


    if (
      suppliedSecret === "" ||
      !await secureEqual(
        suppliedSecret,
        webhookSecret,
      )
    ) {
      console.warn(
        "[payment-webhook] Invalid webhook secret",
      );

      return errorResponse(
        401,
        "INVALID_WEBHOOK_SIGNATURE",
        "Webhook non authentifié.",
      );
    }


    /*
     * =========================================================
     * 4. BODY
     * =========================================================
     */

    let body: WebhookBody;

    try {
      body =
        await req.json();
    } catch {
      return errorResponse(
        400,
        "INVALID_WEBHOOK_PAYLOAD",
        "Payload webhook invalide.",
      );
    }


    /*
     * =========================================================
     * 5. EVENEMENT
     * =========================================================
     */

    const event =
      normalizeString(
        body.event,
        80,
      );


    if (
      event !==
      "payment.completed"
    ) {
      return errorResponse(
        400,
        "UNSUPPORTED_EVENT",
        "Événement PSP non supporté.",
      );
    }


    /*
     * =========================================================
     * 6. IDENTIFIANTS PSP
     * =========================================================
     */

    const reference =
      normalizeString(
        body.reference,
        120,
      );

    const providerReference =
      normalizeString(
        body.provider_reference,
        200,
      );


    if (
      !reference ||
      !providerReference
    ) {
      return errorResponse(
        400,
        "INVALID_WEBHOOK_PAYLOAD",
        "Références PSP manquantes.",
      );
    }


    /*
     * Pour le PSP simulé, la référence provider est
     * déterministe.
     */

    const expectedProviderReference =
      `SIM-${reference}`;


    if (
      providerReference !==
      expectedProviderReference
    ) {
      return errorResponse(
        400,
        "INVALID_PROVIDER_REFERENCE",
        "Référence prestataire invalide.",
      );
    }


    /*
     * =========================================================
     * 7. MONTANT / DEVISE
     * =========================================================
     */

    const amount =
      normalizeAmount(
        body.amount,
      );

    const currency =
      normalizeCurrency(
        body.currency,
      );


    if (
      !amount ||
      !currency
    ) {
      return errorResponse(
        400,
        "INVALID_WEBHOOK_PAYLOAD",
        "Montant ou devise invalide.",
      );
    }


    /*
     * =========================================================
     * 8. CLIENT SERVEUR
     * =========================================================
     */

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        },
      );


    /*
     * =========================================================
     * 9. TRANSACTION PSP CANONIQUE
     * =========================================================
     */

    const {
      data: transactionData,
      error: transactionError,
    } =
      await supabase
        .from(
          "payment_provider_transactions",
        )
        .select(
          [
            "id",
            "provider_transaction_id",
            "provider_reference",
            "provider",
            "payment_method",
            "amount",
            "currency",
            "status",
            "payment_id",
          ].join(","),
        )
        .eq(
          "provider",
          "simulated",
        )
        .eq(
          "provider_transaction_id",
          reference,
        )
        .maybeSingle();


    if (transactionError) {
      console.error(
        "[payment-webhook] Transaction lookup failed",
        {
          code:
            transactionError.code,
          message:
            transactionError.message,
        },
      );

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Impossible de contrôler la transaction PSP.",
      );
    }


    if (!transactionData) {
      return errorResponse(
        404,
        "TRANSACTION_NOT_FOUND",
        "Transaction PSP introuvable.",
      );
    }


    const transaction =
      transactionData as
        StoredProviderTransaction;


    /*
     * =========================================================
     * 10. CONTROLES D'INTEGRITE PSP
     * =========================================================
     */

    if (
      transaction.provider_reference &&
      transaction.provider_reference !==
        providerReference
    ) {
      return errorResponse(
        409,
        "PROVIDER_REFERENCE_MISMATCH",
        "La référence PSP ne correspond pas à la transaction.",
      );
    }


    const storedAmount =
      normalizeAmount(
        transaction.amount,
      );

    const storedCurrency =
      normalizeCurrency(
        transaction.currency,
      );


    if (
      !storedAmount ||
      Math.abs(
        storedAmount - amount,
      ) > 0.000001
    ) {
      return errorResponse(
        409,
        "AMOUNT_MISMATCH",
        "Le montant PSP ne correspond pas à la transaction.",
      );
    }


    if (
      !storedCurrency ||
      storedCurrency !== currency
    ) {
      return errorResponse(
        409,
        "CURRENCY_MISMATCH",
        "La devise PSP ne correspond pas à la transaction.",
      );
    }


    /*
     * completed reste accepté ici :
     * finalize_short_rental_provider_payment()
     * retournera le paiement existant grâce à payment_id.
     */

    if (
      transaction.status !== "pending" &&
      transaction.status !== "processing" &&
      transaction.status !== "completed"
    ) {
      return errorResponse(
        409,
        "TRANSACTION_NOT_FINALIZABLE",
        "La transaction PSP ne peut pas être finalisée.",
      );
    }


    /*
     * =========================================================
     * 11. FINALISATION FINANCIERE ATOMIQUE
     * =========================================================
     */

    const {
      data: finalizeData,
      error: finalizeError,
    } =
      await supabase.rpc(
        "finalize_short_rental_provider_payment",
        {
          p_provider_transaction_id:
            transaction.id,

          p_provider_reference:
            providerReference,

          p_paid_at:
            normalizePaidAt(
              body.paid_at,
            ),
        },
      );


    if (finalizeError) {
      console.error(
        "[payment-webhook] Finalization failed",
        {
          code:
            finalizeError.code,
          message:
            finalizeError.message,
        },
      );

      return errorResponse(
        409,
        "PAYMENT_FINALIZATION_FAILED",
        "Le paiement n'a pas pu être finalisé.",
      );
    }


    const finalized =
      firstRow<FinalizeResult>(
        finalizeData as
          | FinalizeResult
          | FinalizeResult[]
          | null,
      );


    if (!finalized) {
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "La finalisation PSP n'a retourné aucun résultat.",
      );
    }


    /*
     * =========================================================
     * 12. REPONSE SANITISEE
     * =========================================================
     */

    return successResponse({
      transaction: {
        reference:
          reference,

        provider_reference:
          providerReference,

        payment_reference:
          finalized.payment_reference,

        amount:
          Number(
            finalized.amount,
          ),

        currency:
          finalized.currency,

        payment_method:
          finalized.payment_method,

        status:
          finalized.provider_status,

        reused:
          finalized.reused === true,

        completed_at:
          finalized.completed_at,
      },
    });
  },
);