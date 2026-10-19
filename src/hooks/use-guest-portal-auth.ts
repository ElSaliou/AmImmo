import { supabase } from "@/integrations/supabase/client";

// ============================================================
// TYPES
// ============================================================

type RpcError = {
  message?: string;
};

type RpcResponse<T> = {
  data: T | null;
  error: RpcError | null;
};

type RpcClient = {
  rpc: <T>(
    functionName: string,
    args?: Record<string, unknown>,
  ) => Promise<RpcResponse<T>>;
};

export type GuestInvitationRedeemResult = {
  guest_id: string;
  user_id?: string;
  linked?: boolean;
  already_linked?: boolean;
  already_redeemed?: boolean;
};

type RequestMagicLinkInput = {
  email: string;
  invitationToken?: string | null;
  nextPath?: string | null;
};

// ============================================================
// RPC BRIDGE
//
// Les nouvelles RPC guest ne sont pas encore présentes dans
// les types Supabase générés du frontend.
// Ce bridge reste local et typé jusqu'à la prochaine
// régénération officielle des types.
// ============================================================

const rpcClient =
  supabase as unknown as RpcClient;

// ============================================================
// HELPERS
// ============================================================

const normalizeEmail = (
  value: string,
) =>
  value.trim().toLowerCase();

const normalizeToken = (
  value?: string | null,
) =>
  value?.trim() ?? "";

const isInvitationTokenFormatValid = (
  token: string,
) =>
  /^[a-f0-9]{64}$/i.test(token);

const normalizeGuestNextPath = (
  value?: string | null,
) => {
  const nextPath =
    value?.trim() ?? "";

  if (
    !nextPath ||
    nextPath.startsWith("//") ||
    !/^\/guest(?:\/|$)/.test(nextPath)
  ) {
    return "";
  }

  return nextPath;
};

const errorMessage = (
  error: RpcError | null,
  fallback: string,
) =>
  error?.message?.trim() ||
  fallback;

// ============================================================
// REQUEST MAGIC LINK
// ============================================================

export const requestGuestMagicLink =
  async ({
    email,
    invitationToken,
    nextPath,
  }: RequestMagicLinkInput) => {
    const normalizedEmail =
      normalizeEmail(email);

    const normalizedToken =
      normalizeToken(
        invitationToken,
      );

    const normalizedNextPath =
      normalizeGuestNextPath(
        nextPath,
      );

    if (!normalizedEmail) {
      throw new Error(
        "Saisissez votre adresse email.",
      );
    }

    if (
      normalizedToken &&
      !isInvitationTokenFormatValid(
        normalizedToken,
      )
    ) {
      throw new Error(
        "Le lien d'invitation est invalide.",
      );
    }

    const redirectUrl =
      new URL(
        "/guest/access",
        window.location.origin,
      );

    if (normalizedToken) {
      redirectUrl.searchParams.set(
        "token",
        normalizedToken,
      );
    }

    if (normalizedNextPath) {
      redirectUrl.searchParams.set(
        "next",
        normalizedNextPath,
      );
    }

    const {
      error,
    } =
      await supabase.auth.signInWithOtp({
        email:
          normalizedEmail,

        options: {
          emailRedirectTo:
            redirectUrl.toString(),

          // Première activation :
          // l'invitation permet de créer le compte Auth.
          //
          // Connexion ultérieure sans invitation :
          // aucun nouveau compte n'est créé.
          shouldCreateUser:
            Boolean(
              normalizedToken,
            ),
        },
      });

    if (error) {
      throw new Error(
        error.message,
      );
    }
  };

// ============================================================
// REDEEM INVITATION
// ============================================================

export const redeemGuestPortalInvitation =
  async (
    invitationToken: string,
  ): Promise<GuestInvitationRedeemResult> => {
    const token =
      normalizeToken(
        invitationToken,
      );

    if (
      !isInvitationTokenFormatValid(
        token,
      )
    ) {
      throw new Error(
        "Le lien d'invitation est invalide.",
      );
    }

    const {
      data,
      error,
    } =
      await rpcClient.rpc<GuestInvitationRedeemResult>(
        "redeem_guest_portal_invitation",
        {
          p_token:
            token,
        },
      );

    if (error) {
      throw new Error(
        errorMessage(
          error,
          "Impossible d'activer l'accès voyageur.",
        ),
      );
    }

    if (
      !data ||
      typeof data.guest_id !==
        "string" ||
      !data.guest_id
    ) {
      throw new Error(
        "La réponse d'activation du portail voyageur est invalide.",
      );
    }

    return data;
  };

// ============================================================
// CURRENT GUEST
// ============================================================

export const getCurrentGuestId =
  async (): Promise<
    string | null
  > => {
    const {
      data,
      error,
    } =
      await rpcClient.rpc<string>(
        "my_guest_id",
      );

    if (error) {
      throw new Error(
        errorMessage(
          error,
          "Impossible de vérifier votre accès voyageur.",
        ),
      );
    }

    return (
      typeof data === "string" &&
      data.length > 0
        ? data
        : null
    );
  };