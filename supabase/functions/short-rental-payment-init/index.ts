import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

import {
  errorResponse,
  successResponse,
} from "../_shared/response.ts";

import {
  getPaymentProvider,
  type SupportedPaymentMethod,
} from "../_shared/payment-provider.ts";


type InitRequestBody = {
  token?: unknown;
  payment_method?: unknown;
};


type PublicPaymentContext = {
  can_pay?: boolean;
  payment_block_reason?: string | null;
  amount_due_now?: number | string | null;
  remaining_amount?: number | string | null;
  currency?: string | null;
};


type ProviderTransactionRpcRow = {
  transaction_id: string;
  provider_transaction_id: string;

  booking_id: string;
  booking_reference: string;

  invoice_id: string;
  invoice_number: string;

  provider: string;
  payment_method: string;

  amount: number | string;
  currency: string;

  status: string;
  reused: boolean;

  created_at: string;
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
  checkout_url: string | null;
};


const SUPPORTED_PAYMENT_METHODS =
  new Set<SupportedPaymentMethod>([
    "orange_money",
    "mtn_momo",
  ]);


function normalizeToken(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim();

  /*
   * 3D.3C.1 exige au minimum 32 caractères.
   * Nous appliquons la même frontière.
   */
  if (
    token.length < 32 ||
    token.length > 2048
  ) {
    return null;
  }

  return token;
}


function normalizePaymentMethod(
  value: unknown,
): SupportedPaymentMethod | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim().toLowerCase();

  if (
    !SUPPORTED_PAYMENT_METHODS.has(
      normalized as SupportedPaymentMethod,
    )
  ) {
    return null;
  }

  return normalized as SupportedPaymentMethod;
}


function toPositiveNumber(
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
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toUpperCase();
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


function mapPaymentBlockToResponse(
  reason: string | null | undefined,
): Response {
  const normalized =
    (reason ?? "")
      .trim()
      .toLowerCase();

  if (
    normalized === "already_paid" ||
    normalized === "invoice_paid" ||
    normalized === "paid"
  ) {
    return errorResponse(
      409,
      "PAYMENT_ALREADY_COMPLETED",
      "Cette facture est déjà réglée.",
    );
  }

  if (
    normalized === "invalid_token" ||
    normalized === "token_expired" ||
    normalized === "token_revoked" ||
    normalized === "expired_token" ||
    normalized === "revoked"
  ) {
    return errorResponse(
      401,
      "INVALID_PAYMENT_TOKEN",
      "Ce lien de paiement est invalide ou n'est plus disponible.",
    );
  }

  return errorResponse(
    409,
    "PAYMENT_NOT_ALLOWED",
    "Ce paiement n'est pas disponible actuellement.",
  );
}


/**
 * Convertit les erreurs métier de 3D.3C.1
 * vers le contrat HTTP public de l'Edge Function.
 */
function mapProviderTransactionRpcError(
  message: string,
): Response {
  const value =
    message.toLowerCase();


  if (
    value.includes(
      "lien de paiement invalide",
    ) ||
    value.includes(
      "lien de paiement invalide ou expiré",
    )
  ) {
    return errorResponse(
      401,
      "INVALID_PAYMENT_TOKEN",
      "Ce lien de paiement est invalide ou n'est plus disponible.",
    );
  }


  if (
    value.includes(
      "déjà entièrement payée",
    ) ||
    value.includes(
      "déjà entièrement payé",
    )
  ) {
    return errorResponse(
      409,
      "PAYMENT_ALREADY_COMPLETED",
      "Cette facture est déjà réglée.",
    );
  }


  if (
    value.includes(
      "tentative de paiement est déjà en cours",
    )
  ) {
    return errorResponse(
      409,
      "PAYMENT_ATTEMPT_CONFLICT",
      "Une autre tentative de paiement est déjà en cours.",
    );
  }


  if (
    value.includes(
      "ne peut pas recevoir de paiement",
    ) ||
    value.includes(
      "aucun montant à payer",
    ) ||
    value.includes(
      "délai de paiement",
    ) ||
    value.includes(
      "aucune facture active",
    )
  ) {
    return errorResponse(
      409,
      "PAYMENT_NOT_ALLOWED",
      "Ce paiement n'est pas disponible actuellement.",
    );
  }


  return errorResponse(
    500,
    "INTERNAL_ERROR",
    "Impossible de préparer le paiement.",
  );
}


/**
 * Lecture de la transaction technique depuis la table PSP.
 *
 * 3D.3C.1 retourne transaction_id, mais ne retourne PAS :
 *
 * - checkout_url
 * - provider_reference
 *
 * Ces données doivent donc être récupérées ici.
 */
async function getStoredProviderTransaction(
  supabase: SupabaseClient,
  transactionId: string,
): Promise<StoredProviderTransaction | null> {
  const {
    data,
    error,
  } = await supabase
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
        "checkout_url",
      ].join(","),
    )
    .eq(
      "id",
      transactionId,
    )
    .maybeSingle();


  if (error) {
    console.error(
      "[payment-init] Cannot read stored PSP transaction",
      {
        transactionId,
        code: error.code,
        message: error.message,
      },
    );

    return null;
  }


  if (!data) {
    return null;
  }


  return data as StoredProviderTransaction;
}


Deno.serve(
  async (
    req: Request,
  ): Promise<Response> => {
    /*
     * =========================================================
     * 1. CORS
     * =========================================================
     */

    if (req.method === "OPTIONS") {
      return new Response(
        "ok",
        {
          headers: corsHeaders,
        },
      );
    }


    /*
     * =========================================================
     * 2. HTTP METHOD
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
     * 3. ENVIRONNEMENT SERVEUR
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


    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "[payment-init] Missing Supabase server configuration",
      );

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Le service de paiement est momentanément indisponible.",
      );
    }


    /*
     * =========================================================
     * 4. BODY
     * =========================================================
     */

    let body: InitRequestBody;

    try {
      body =
        await req.json();
    } catch {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "La requête de paiement est invalide.",
      );
    }


    /*
     * =========================================================
     * 5. TOKEN
     * =========================================================
     */

    const token =
      normalizeToken(
        body.token,
      );


    if (!token) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "Le token de paiement est manquant ou invalide.",
      );
    }


    /*
     * =========================================================
     * 6. PAYMENT METHOD
     * =========================================================
     */

    const paymentMethod =
      normalizePaymentMethod(
        body.payment_method,
      );


    if (!paymentMethod) {
      return errorResponse(
        400,
        "INVALID_PAYMENT_METHOD",
        "Le moyen de paiement sélectionné n'est pas disponible.",
      );
    }


    /*
     * =========================================================
     * 7. CLIENT SUPABASE SERVEUR
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
     * 8. CONTEXTE PUBLIC
     *
     * Défense en profondeur.
     *
     * 3D.3C.1 recalculera ensuite elle-même :
     *
     * - token
     * - réservation
     * - facture
     * - net payé
     * - remaining
     * - due_now
     * - deadline
     *
     * =========================================================
     */

    const {
      data: contextData,
      error: contextError,
    } = await supabase.rpc(
      "get_public_short_rental_payment_context",
      {
        p_token: token,
      },
    );


    if (contextError) {
      console.error(
        "[payment-init] Context RPC failed",
        {
          code:
            contextError.code,

          message:
            contextError.message,
        },
      );

      return errorResponse(
        401,
        "INVALID_PAYMENT_TOKEN",
        "Ce lien de paiement est invalide ou n'est plus disponible.",
      );
    }


    const context =
      firstRow<PublicPaymentContext>(
        contextData as
          | PublicPaymentContext
          | PublicPaymentContext[]
          | null,
      );


    if (!context) {
      return errorResponse(
        401,
        "INVALID_PAYMENT_TOKEN",
        "Ce lien de paiement est invalide ou n'est plus disponible.",
      );
    }


    if (
      context.can_pay !== true
    ) {
      return mapPaymentBlockToResponse(
        context.payment_block_reason,
      );
    }


    /*
     * =========================================================
     * 9. CONTEXTE FINANCIER AUTORITAIRE
     * =========================================================
     */

    const contextDueNow =
      toPositiveNumber(
        context.amount_due_now,
      );


    if (!contextDueNow) {
      console.error(
        "[payment-init] Invalid amount_due_now in public payment context",
        {
          can_pay:
            context.can_pay,

          due_now:
            context.amount_due_now,

          remaining_amount:
            context.remaining_amount,
        },
      );

      return errorResponse(
        409,
        "PAYMENT_NOT_ALLOWED",
        "Aucun montant n'est actuellement exigible.",
      );
    }


    const contextCurrency =
      normalizeCurrency(
        context.currency,
      );


    if (!contextCurrency) {
      console.error(
        "[payment-init] Currency missing from payment context",
      );

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "La devise du paiement est indisponible.",
      );
    }


    /*
     * =========================================================
     * 10. PSP ADAPTER
     * =========================================================
     */

    let provider;

    try {
      provider =
        getPaymentProvider();
    } catch (error) {
      console.error(
        "[payment-init] Invalid PSP configuration",
        error,
      );

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Le prestataire de paiement n'est pas configuré.",
      );
    }


    /*
     * =========================================================
     * 11. RPC 3D.3C.1
     *
     * Contrat SQL réellement installé :
     *
     * create_short_rental_provider_transaction(
     *   p_token text,
     *   p_provider text,
     *   p_payment_method text
     * )
     *
     * =========================================================
     */

    const {
      data:
        providerTransactionData,

      error:
        providerTransactionError,
    } = await supabase.rpc(
      "create_short_rental_provider_transaction",
      {
        p_token:
          token,

        p_provider:
          provider.name,

        p_payment_method:
          paymentMethod,
      },
    );


    if (
      providerTransactionError
    ) {
      console.error(
        "[payment-init] 3D.3C.1 failed",
        {
          code:
            providerTransactionError.code,

          message:
            providerTransactionError.message,
        },
      );

      return mapProviderTransactionRpcError(
        providerTransactionError
          .message ?? "",
      );
    }


    const transaction =
      firstRow<ProviderTransactionRpcRow>(
        providerTransactionData as
          | ProviderTransactionRpcRow
          | ProviderTransactionRpcRow[]
          | null,
      );


    if (!transaction) {
      console.error(
        "[payment-init] 3D.3C.1 returned no row",
      );

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Impossible de préparer le paiement.",
      );
    }


    /*
     * =========================================================
     * 12. VALIDATION DU RETOUR 3D.3C.1
     * =========================================================
     */

    const transactionId =
      typeof transaction
        .transaction_id === "string"
        ? transaction
          .transaction_id
          .trim()
        : "";


    const merchantReference =
      typeof transaction
        .provider_transaction_id ===
        "string"
        ? transaction
          .provider_transaction_id
          .trim()
        : "";


    const transactionAmount =
      toPositiveNumber(
        transaction.amount,
      );


    const transactionCurrency =
      normalizeCurrency(
        transaction.currency,
      );


    if (
      !transactionId ||
      !merchantReference ||
      !transactionAmount ||
      !transactionCurrency
    ) {
      console.error(
        "[payment-init] Invalid 3D.3C.1 response",
        transaction,
      );

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "La transaction de paiement est invalide.",
      );
    }


    /*
     * =========================================================
     * 13. DEFENSE CONTRE CHANGEMENT CONCURRENT
     *
     * Le contexte public et 3D.3C.1 doivent être cohérents.
     * =========================================================
     */

    if (
      transactionAmount !==
      contextDueNow
    ) {
      console.error(
        "[payment-init] Amount changed between context and 3D.3C.1",
        {
          contextDueNow,
          transactionAmount,
        },
      );

      return errorResponse(
        409,
        "PAYMENT_ATTEMPT_CONFLICT",
        "Le montant à payer a changé. Veuillez actualiser la page.",
      );
    }


    if (
      transactionCurrency !==
      contextCurrency
    ) {
      console.error(
        "[payment-init] Currency changed between context and 3D.3C.1",
        {
          contextCurrency,
          transactionCurrency,
        },
      );

      return errorResponse(
        409,
        "PAYMENT_ATTEMPT_CONFLICT",
        "Les informations du paiement ont changé. Veuillez actualiser la page.",
      );
    }


    /*
     * =========================================================
     * 14. LECTURE TRANSACTION PSP STOCKEE
     *
     * Nécessaire parce que 3D.3C.1 ne retourne pas checkout_url.
     * =========================================================
     */

    const storedTransaction =
      await getStoredProviderTransaction(
        supabase,
        transactionId,
      );


    if (!storedTransaction) {
      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "La transaction de paiement est introuvable.",
      );
    }


    /*
     * =========================================================
     * 15. IDEMPOTENCE PSP
     *
     * Transaction SQL réutilisée +
     * checkout_url déjà présent :
     *
     * => NE PAS réinitialiser le PSP.
     * =========================================================
     */

    const existingCheckoutUrl =
      typeof storedTransaction
        .checkout_url === "string"
        ? storedTransaction
          .checkout_url
          .trim()
        : "";


    if (
      transaction.reused === true &&
      existingCheckoutUrl
    ) {
      return successResponse({
        reference:
          merchantReference,

        amount:
          transactionAmount,

        currency:
          transactionCurrency,

        payment_method:
          paymentMethod,

        status:
          storedTransaction.status,

        checkout_url:
          existingCheckoutUrl,

        reused:
          true,
      });
    }


    /*
     * =========================================================
     * 16. INITIALISATION PSP SIMULEE
     * =========================================================
     */

    let providerResult;

    try {
      providerResult =
        await provider
          .initializePayment({
            providerTransactionId:
              merchantReference,

            amount:
              transactionAmount,

            currency:
              transactionCurrency,

            paymentMethod,
          });
    } catch (error) {
      console.error(
        "[payment-init] Simulated PSP initialization failed",
        error,
      );

      return errorResponse(
        502,
        "PROVIDER_INIT_FAILED",
        "Le prestataire de paiement est momentanément indisponible.",
      );
    }


    /*
     * =========================================================
     * 17. PERSISTANCE RESULTAT PSP
     *
     * Toujours aucune écriture financière.
     *
     * Nous mettons uniquement :
     *
     * provider_reference
     * checkout_url
     * status=processing
     *
     * =========================================================
     */

    const {
      data:
        updatedTransaction,

      error:
        updateError,
    } = await supabase
      .from(
        "payment_provider_transactions",
      )
      .update({
        provider_reference:
          providerResult
            .providerReference,

        checkout_url:
          providerResult
            .checkoutUrl,

        status:
          providerResult.status,
      })
      .eq(
        "id",
        transactionId,
      )
      .is(
        "payment_id",
        null,
      )
      .in(
        "status",
        [
          "pending",
          "processing",
        ],
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
          "checkout_url",
        ].join(","),
      )
      .maybeSingle();


    if (
      updateError ||
      !updatedTransaction
    ) {
      console.error(
        "[payment-init] Unable to persist PSP initialization",
        {
          transactionId,

          code:
            updateError?.code,

          message:
            updateError?.message,
        },
      );

      return errorResponse(
        500,
        "INTERNAL_ERROR",
        "Impossible d'enregistrer l'initialisation du paiement.",
      );
    }


    /*
     * =========================================================
     * 18. REPONSE PUBLIQUE
     *
     * Aucun UUID interne.
     * Aucun booking_id.
     * Aucun invoice_id.
     * Aucun secret.
     * =========================================================
     */

    return successResponse({
      reference:
        updatedTransaction
          .provider_transaction_id,

      amount:
        Number(
          updatedTransaction.amount,
        ),

      currency:
        normalizeCurrency(
          updatedTransaction.currency,
        ),

      payment_method:
        paymentMethod,

      status:
        updatedTransaction.status,

      checkout_url:
        updatedTransaction
          .checkout_url,

      reused:
        transaction.reused === true,
    });
  },
);