import {
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/integrations/supabase/client";
import { useGuest } from "@/hooks/use-guests";

type Props = {
  guestId: string | null | undefined;
  guestName: string | null | undefined;
  guestEmail: string | null | undefined;
};

type InvitationResult = {
  invitation_id: string;
  guest_id: string;
  email: string;
  expires_at: string;
  token: string;
};

const getErrorMessage = (
  error: unknown,
): string => {
  if (
    typeof error === "object" &&
    error !== null
  ) {
    const candidate =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
      };

    if (
      typeof candidate.message === "string" &&
      candidate.message.trim()
    ) {
      return candidate.message;
    }

    if (
      typeof candidate.details === "string" &&
      candidate.details.trim()
    ) {
      return candidate.details;
    }

    if (
      typeof candidate.hint === "string" &&
      candidate.hint.trim()
    ) {
      return candidate.hint;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Impossible de créer l'invitation voyageur.";
};

export default function BookingGuestPortalCard({
  guestId,
  guestName,
  guestEmail,
}: Props) {
  const guestQuery =
    useGuest(
      guestId ?? null,
    );

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    invitationUrl,
    setInvitationUrl,
  ] =
    useState<string | null>(
      null,
    );

  const [
    expiresAt,
    setExpiresAt,
  ] =
    useState<string | null>(
      null,
    );

  const guest =
    guestQuery.data;

  const accessActivated =
    Boolean(
      guest?.user_id,
    );

  const emailIsPlaceholder =
    useMemo(
      () =>
        Boolean(
          guestEmail
            ?.trim()
            .toLowerCase()
            .endsWith(
              ".invalid",
            ),
        ),
      [
        guestEmail,
      ],
    );

  const handleCreateInvitation =
    async () => {
      if (
        !guestId ||
        creating
      ) {
        return;
      }

      setCreating(true);

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "create_guest_portal_invitation",
            {
              p_guest_id:
                guestId,

              p_expires_in_minutes:
                1440,
            },
          );

        if (error) {
          throw error;
        }

        if (
          !data ||
          typeof data !==
            "object"
        ) {
          throw new Error(
            "La RPC n'a retourné aucune invitation.",
          );
        }

        const invitation =
          data as unknown as InvitationResult;

        if (
          !invitation.token ||
          !/^[a-f0-9]{64}$/i.test(
            invitation.token,
          )
        ) {
          throw new Error(
            "Le token d'invitation retourné est invalide.",
          );
        }

        const url =
          new URL(
            "/guest/access",
            window.location.origin,
          );

        url.searchParams.set(
          "token",
          invitation.token,
        );

        setInvitationUrl(
          url.toString(),
        );

        setExpiresAt(
          invitation.expires_at,
        );

        toast.success(
          "Invitation voyageur créée.",
        );
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
          ),
        );
      } finally {
        setCreating(false);
      }
    };

  const handleCopy =
    async () => {
      if (!invitationUrl) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          invitationUrl,
        );

        toast.success(
          "Lien d'invitation copié.",
        );
      } catch {
        toast.error(
          "Impossible de copier le lien.",
        );
      }
    };

  if (!guestId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Espace voyageur
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun profil voyageur n'est rattaché à cette réservation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Espace voyageur
          </CardTitle>

          {accessActivated ? (
            <Badge>
              Accès activé
            </Badge>
          ) : (
            <Badge variant="outline">
              Non activé
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <p className="font-medium">
            {guestName ||
              guest?.full_name ||
              "Voyageur"}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {guestEmail ||
              guest?.email ||
              "Aucun email"}
          </p>
        </div>

        {guestQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Vérification de l'accès voyageur...
          </div>
        ) : null}

        {accessActivated ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Compte voyageur raccordé
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Ce profil est associé à un compte authentifié et peut utiliser
              l'espace voyageur.
            </p>
          </div>
        ) : (
          <>
            {emailIsPlaceholder ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <Mail className="mr-2 inline h-4 w-4" />
                L'adresse actuelle se termine par
                <strong> .invalid</strong>. Elle ne peut pas recevoir le
                Magic Link Supabase.
              </div>
            ) : null}

            <Button
              type="button"
              onClick={() => {
                void handleCreateInvitation();
              }}
              disabled={
                creating ||
                guestQuery.isLoading
              }
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Créer l'invitation voyageur
                </>
              )}
            </Button>
          </>
        )}

        {invitationUrl ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">
              Lien d'activation
            </p>

            <p className="break-all font-mono text-xs">
              {invitationUrl}
            </p>

            {expiresAt ? (
              <p className="text-xs text-muted-foreground">
                Expiration :{" "}
                {new Date(
                  expiresAt,
                ).toLocaleString(
                  "fr-FR",
                )}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleCopy();
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copier le lien
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(
                    invitationUrl,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ouvrir
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}