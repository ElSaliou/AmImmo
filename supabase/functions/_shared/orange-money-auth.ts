/**
 * Orange Money / Orange Developer OAuth client.
 *
 * Cette couche gère uniquement l'authentification OAuth 2.0
 * client_credentials.
 *
 * Elle ne déclenche AUCUN paiement Orange Money.
 * Elle ne connaît volontairement aucun endpoint de paiement métier.
 */

const DEFAULT_ORANGE_OAUTH_TOKEN_URL =
  "https://api.orange.com/oauth/v3/token";

const ORANGE_OAUTH_TIMEOUT_MS =
  10_000;


type OrangeOAuthResponse = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  scope?: unknown;
};


export type OrangeAccessToken = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
};


let cachedToken:
  | OrangeAccessToken
  | null = null;


/**
 * Ne jamais logger :
 *
 * - client_id
 * - client_secret
 * - access_token
 */
function getRequiredEnv(
  name: string,
): string {
  const value =
    Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(
      `Missing required Orange Money configuration: ${name}`,
    );
  }

  return value;
}


function getOrangeOAuthTokenUrl(): string {
  const configured =
    Deno.env
      .get("ORANGE_MONEY_OAUTH_TOKEN_URL")
      ?.trim();

  const rawUrl =
    configured ||
    DEFAULT_ORANGE_OAUTH_TOKEN_URL;

  let parsedUrl: URL;

  try {
    parsedUrl =
      new URL(rawUrl);
  } catch {
    throw new Error(
      "Invalid Orange Money OAuth token URL",
    );
  }

  if (
    parsedUrl.protocol !==
    "https:"
  ) {
    throw new Error(
      "Orange Money OAuth token URL must use HTTPS",
    );
  }

  return parsedUrl.toString();
}


function normalizeExpiresIn(
  value: unknown,
): number {
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
    /*
     * Valeur prudente si Orange ne retourne pas expires_in.
     * Ce fallback n'étend jamais artificiellement la durée
     * du token au-delà d'une heure.
     */
    return 3600;
  }

  return Math.floor(parsed);
}


function encodeBasicCredentials(
  clientId: string,
  clientSecret: string,
): string {
  /*
   * Les identifiants Orange Developer sont des credentials
   * techniques destinés à HTTP Basic Authentication.
   */
  return btoa(
    `${clientId}:${clientSecret}`,
  );
}


function isCachedTokenUsable(
  token: OrangeAccessToken | null,
): token is OrangeAccessToken {
  if (!token) {
    return false;
  }

  /*
   * Marge de sécurité de 60 secondes.
   *
   * On ne réutilise pas un token proche de son expiration.
   */
  return (
    token.expiresAt -
      Date.now()
  ) > 60_000;
}


export function clearOrangeAccessTokenCache(): void {
  cachedToken = null;
}


export async function getOrangeAccessToken(
  forceRefresh = false,
): Promise<OrangeAccessToken> {
  if (
    !forceRefresh &&
    isCachedTokenUsable(
      cachedToken,
    )
  ) {
    return cachedToken;
  }


  const clientId =
    getRequiredEnv(
      "ORANGE_MONEY_CLIENT_ID",
    );

  const clientSecret =
    getRequiredEnv(
      "ORANGE_MONEY_CLIENT_SECRET",
    );

  const tokenUrl =
    getOrangeOAuthTokenUrl();


  const credentials =
    encodeBasicCredentials(
      clientId,
      clientSecret,
    );


  const requestBody =
    new URLSearchParams({
      grant_type:
        "client_credentials",
    });


  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => {
        controller.abort();
      },
      ORANGE_OAUTH_TIMEOUT_MS,
    );

  let response: Response;

  try {
    response =
      await fetch(
        tokenUrl,
        {
          method:
            "POST",

          headers: {
            "Authorization":
              `Basic ${credentials}`,

            "Content-Type":
              "application/x-www-form-urlencoded",

            "Accept":
              "application/json",
          },

          body:
            requestBody.toString(),

          signal:
            controller.signal,
        },
      );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Orange OAuth request timed out",
      );
    }

    throw new Error(
      "Orange OAuth request failed",
    );
  } finally {
    clearTimeout(
      timeoutId,
    );
  }


  let payload:
    OrangeOAuthResponse | null = null;


  try {
    payload =
      await response.json() as
        OrangeOAuthResponse;
  } catch {
    payload = null;
  }


  if (!response.ok) {
    /*
     * Ne jamais exposer la réponse Orange complète :
     * certaines API peuvent inclure des informations
     * techniques qu'il est inutile de propager.
     */
    throw new Error(
      `Orange OAuth request failed with HTTP ${response.status}`,
    );
  }


  const accessToken =
    typeof payload?.access_token ===
        "string"
      ? payload.access_token.trim()
      : "";


  if (!accessToken) {
    throw new Error(
      "Orange OAuth response does not contain an access_token",
    );
  }


  const tokenType =
    typeof payload?.token_type ===
        "string" &&
      payload.token_type.trim()
      ? payload.token_type.trim()
      : "Bearer";


  const expiresIn =
    normalizeExpiresIn(
      payload?.expires_in,
    );


  const token: OrangeAccessToken = {
    accessToken,
    tokenType,
    expiresIn,

    expiresAt:
      Date.now() +
      (
        expiresIn *
        1000
      ),
  };


  cachedToken =
    token;


  return token;
}