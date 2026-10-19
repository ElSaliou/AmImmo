import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LoaderCircle,
  LogOut,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import {
  getCurrentGuestId,
  redeemGuestPortalInvitation,
  requestGuestMagicLink,
} from "@/hooks/use-guest-portal-auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================================
// TYPES
// ============================================================

type AccessStatus =
  | "checking"
  | "signed-out"
  | "sending"
  | "sent"
  | "linking"
  | "authorized"
  | "unauthorized"
  | "error";

// ============================================================
// GUEST ACCESS PAGE
// ============================================================

const GuestAccessPage = () => {
  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState<AccessStatus>(
      "checking",
    );

  const [
    guestId,
    setGuestId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const resolvingRef =
    useRef(false);

  // ==========================================================
  // INVITATION TOKEN
  // ==========================================================

  const invitationToken =
    useMemo(() => {
      const params =
        new URLSearchParams(
          location.search,
        );

      return (
        params
          .get("token")
          ?.trim() ?? ""
      );
    }, [
      location.search,
    ]);

  const invalidInvitationToken =
    Boolean(
      invitationToken,
    ) &&
    !/^[a-f0-9]{64}$/i.test(
      invitationToken,
    );

  const requestedNextPath =
    useMemo(() => {
      const params =
        new URLSearchParams(
          location.search,
        );

      const queryNext =
        params
          .get("next")
          ?.trim() ?? "";

      const stateFrom =
        typeof location.state === "object" &&
        location.state !== null &&
        "from" in location.state &&
        typeof (
          location.state as {
            from?: unknown;
          }
        ).from === "string"
          ? (
              location.state as {
                from: string;
              }
            ).from.trim()
          : "";

      const candidate =
        queryNext ||
        stateFrom;

      if (
        !candidate ||
        candidate.startsWith("//") ||
        !/^\/guest(?:\/|$)/.test(
          candidate,
        )
      ) {
        return "/guest";
      }

      return candidate;
    }, [
      location.search,
      location.state,
    ]);

  // ==========================================================
  // RESOLVE AUTHENTICATED ACCESS
  // ==========================================================

  const resolveAuthenticatedAccess =
    useCallback(
      async () => {
        if (
          resolvingRef.current
        ) {
          return;
        }

        resolvingRef.current =
          true;

        setMessage(null);

        try {
          // --------------------------------------------------
          // FIRST ACTIVATION
          // --------------------------------------------------

          if (
            invitationToken
          ) {
            if (
              invalidInvitationToken
            ) {
              throw new Error(
                "Le lien d'invitation est invalide.",
              );
            }

            setStatus(
              "linking",
            );

            await redeemGuestPortalInvitation(
              invitationToken,
            );
          } else {
            setStatus(
              "checking",
            );
          }

          // --------------------------------------------------
          // RESOLVE CANONICAL GUEST
          // --------------------------------------------------

          const resolvedGuestId =
            await getCurrentGuestId();

          if (
            !resolvedGuestId
          ) {
            setGuestId(
              null,
            );

            setStatus(
              "unauthorized",
            );

            return;
          }

          setGuestId(
            resolvedGuestId,
          );

          setStatus(
            "authorized",
          );
        } catch (error) {
          const errorText =
            error instanceof Error
              ? error.message
              : "Impossible de vérifier votre accès voyageur.";

          setMessage(
            errorText,
          );

          setStatus(
            "error",
          );
        } finally {
          resolvingRef.current =
            false;
        }
      },
      [
        invitationToken,
        invalidInvitationToken,
      ],
    );

  // ==========================================================
  // SESSION
  // ==========================================================

  useEffect(() => {
    let cancelled =
      false;

    const checkSession =
      async () => {
        try {
          if (
            invalidInvitationToken
          ) {
            if (
              !cancelled
            ) {
              setMessage(
                "Le lien d'invitation est invalide.",
              );

              setStatus(
                "error",
              );
            }

            return;
          }

          const {
            data,
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          if (cancelled) {
            return;
          }

          if (
            data.session?.user
          ) {
            await resolveAuthenticatedAccess();

            return;
          }

          setStatus(
            "signed-out",
          );
        } catch (error) {
          if (cancelled) {
            return;
          }

          setMessage(
            error instanceof Error
              ? error.message
              : "Impossible de vérifier votre session.",
          );

          setStatus(
            "error",
          );
        }
      };

    void checkSession();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session,
        ) => {
          if (cancelled) {
            return;
          }

          if (
            session?.user
          ) {
            // Evite d'exécuter un autre appel Supabase
            // directement dans le callback auth.
            window.setTimeout(
              () => {
                if (
                  !cancelled
                ) {
                  void resolveAuthenticatedAccess();
                }
              },
              0,
            );

            return;
          }

          setGuestId(
            null,
          );

          setStatus(
            "signed-out",
          );
        },
      );

    return () => {
      cancelled =
        true;

      authListener.subscription.unsubscribe();
    };
  }, [
    invalidInvitationToken,
    resolveAuthenticatedAccess,
  ]);

  // ==========================================================
  // REQUEST MAGIC LINK
  // ==========================================================

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (
        invalidInvitationToken
      ) {
        toast.error(
          "Le lien d'invitation est invalide.",
        );

        return;
      }

      setStatus(
        "sending",
      );

      setMessage(
        null,
      );

      try {
        await requestGuestMagicLink({
          email,

          invitationToken:
            invitationToken ||
            null,

          nextPath:
            requestedNextPath,
        });

        setStatus(
          "sent",
        );

        toast.success(
          "Lien de connexion envoyé.",
        );
      } catch (error) {
        const errorText =
          error instanceof Error
            ? error.message
            : "Impossible d'envoyer le lien de connexion.";

        setMessage(
          errorText,
        );

        setStatus(
          "signed-out",
        );

        toast.error(
          errorText,
        );
      }
    };

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  const handleSignOut =
    async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        setGuestId(
          null,
        );

        setMessage(
          null,
        );

        setStatus(
          "signed-out",
        );
      }
    };

  useEffect(() => {
    if (
      status === "authorized" &&
      requestedNextPath !== "/guest"
    ) {
      navigate(
        requestedNextPath,
        {
          replace: true,
        },
      );
    }
  }, [
    navigate,
    requestedNextPath,
    status,
  ]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    status === "checking" ||
    status === "linking"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <LoaderCircle className="h-9 w-9 animate-spin text-primary" />

          <h1 className="text-xl font-semibold">
            {status ===
            "linking"
              ? "Activation de votre espace voyageur"
              : "Vérification de votre accès"}
          </h1>

          <p className="text-sm leading-6 text-muted-foreground">
            Un instant, nous vérifions votre compte
            et votre accès sécurisé.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // AUTHORIZED
  // ==========================================================

  if (
    status === "authorized"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-background p-7 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            Accès voyageur activé
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Votre compte est correctement associé à
            votre profil voyageur AmImmo.
          </p>

          <div className="mt-5 rounded-lg border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">
              Identifiant voyageur
            </p>

            <p className="mt-1 break-all font-mono text-xs">
              {guestId}
            </p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            L'accès à votre espace voyageur sera
            raccordé à cette authentification dans
            l'étape suivante.
          </p>

          <div className="mt-6 grid gap-3">
            <Button
              type="button"
              onClick={() => {
                navigate(
                  requestedNextPath,
                  {
                    replace: true,
                  },
                );
              }}
            >
              Accéder à mon espace voyageur
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleSignOut();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // AUTHENTICATED BUT NOT GUEST
  // ==========================================================

  if (
    status === "unauthorized"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-background p-7 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-semibold">
            Aucun accès voyageur associé
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Votre compte est authentifié, mais il
            n'est associé à aucun profil voyageur.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={() => {
              void handleSignOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Utiliser un autre compte
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    status === "error"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-background p-7 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-semibold">
            Impossible d'activer l'accès
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {message ??
              "Une erreur est survenue pendant la vérification de votre accès."}
          </p>

          <div className="mt-6 grid gap-3">
            <Button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Réessayer
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleSignOut();
              }}
            >
              Se déconnecter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // SIGNED OUT / MAGIC LINK SENT
  // ==========================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-background p-7 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold">
          Espace voyageur
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {invitationToken
            ? "Saisissez l'adresse email associée à votre réservation pour activer votre accès."
            : "Saisissez l'adresse email de votre compte voyageur pour recevoir un lien de connexion sécurisé."}
        </p>

        {status ===
        "sent" ? (
          <div className="mt-6 rounded-xl border bg-muted/40 p-5">
            <h2 className="font-medium">
              Vérifiez votre boîte email
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Un lien sécurisé vient d'être envoyé à
              votre adresse email. Cliquez dessus pour
              poursuivre.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full"
              onClick={() => {
                setStatus(
                  "signed-out",
                );
              }}
            >
              Renvoyer un lien
            </Button>
          </div>
        ) : (
          <form
            className="mt-6 space-y-5"
            onSubmit={
              handleSubmit
            }
          >
            <div className="space-y-2">
              <Label htmlFor="guest-email">
                Adresse email
              </Label>

              <Input
                id="guest-email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(
                  event,
                ) => {
                  setEmail(
                    event.target.value,
                  );
                }}
                disabled={
                  status ===
                  "sending"
                }
              />
            </div>

            {message ? (
              <p className="text-sm text-destructive">
                {message}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={
                status ===
                "sending"
              }
            >
              {status ===
              "sending" ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                "Recevoir mon lien de connexion"
              )}
            </Button>
          </form>
        )}

        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          Aucun mot de passe n'est nécessaire. Le lien
          envoyé par email permet uniquement
          d'authentifier votre compte. L'accès voyageur
          reste contrôlé côté serveur.
        </p>
      </div>
    </div>
  );
};

export default GuestAccessPage;