import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Building2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================================
// TYPES
// ============================================================

type LocationState = {
  from?: string;
};

type AccessResult = {
  isStaff: boolean;
  isOwner: boolean;
};

// ============================================================
// LOGIN PAGE
// ============================================================

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const state =
    location.state as LocationState | null;

  const requestedDestination =
    state?.from ?? null;

  // ==========================================================
  // CHECK ACCESS
  // ==========================================================

  const checkAccess =
    useCallback(
      async (
        userId: string,
      ): Promise<AccessResult> => {
        // ------------------------------------------------------
        // STAFF
        // ------------------------------------------------------

        const {
          data: staffAllowed,
          error: staffError,
        } = await supabase.rpc(
          "is_staff",
          {
            _user_id: userId,
          },
        );

        if (staffError) {
          console.error(
            "[LoginPage] is_staff error:",
            staffError,
          );
        }

        // ------------------------------------------------------
        // OWNER
        // ------------------------------------------------------

        const {
          data: ownerAllowed,
          error: ownerError,
        } = await supabase.rpc(
          "is_owner_user",
        );

        if (ownerError) {
          console.error(
            "[LoginPage] is_owner_user error:",
            ownerError,
          );
        }

        const result = {
          isStaff:
            staffAllowed === true,
          isOwner:
            ownerAllowed === true,
        };

        console.log(
          "[LoginPage] ACCESS RESULT:",
          {
            userId,
            ...result,
          },
        );

        return result;
      },
      [],
    );

  // ==========================================================
  // RESOLVE DESTINATION
  // ==========================================================

  const resolveDestination =
    useCallback(
      (
        access: AccessResult,
      ) => {
        // ------------------------------------------------------
        // Route initialement demandée
        // ------------------------------------------------------

        if (
          requestedDestination?.startsWith(
            "/owner",
          ) &&
          access.isOwner
        ) {
          return requestedDestination;
        }

        if (
          requestedDestination?.startsWith(
            "/admin",
          ) &&
          access.isStaff
        ) {
          return requestedDestination;
        }

        // ------------------------------------------------------
        // Priorité automatique
        // ------------------------------------------------------

        if (access.isStaff) {
          return "/admin";
        }

        if (access.isOwner) {
          return "/owner";
        }

        return null;
      },
      [requestedDestination],
    );

  // ==========================================================
  // EXISTING SESSION
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const checkExistingSession =
      async () => {
        try {
          const {
            data,
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          if (
            cancelled
          ) {
            return;
          }

          const session =
            data.session;

          if (!session?.user) {
            setCheckingSession(false);
            return;
          }

          console.log(
            "[LoginPage] EXISTING SESSION:",
            {
              id:
                session.user.id,
              email:
                session.user.email,
            },
          );

          const access =
            await checkAccess(
              session.user.id,
            );

          if (cancelled) {
            return;
          }

          const destination =
            resolveDestination(
              access,
            );

          if (destination) {
            navigate(
              destination,
              {
                replace: true,
              },
            );

            return;
          }

          setCheckingSession(false);
        } catch (error) {
          console.error(
            "[LoginPage] Existing session error:",
            error,
          );

          if (!cancelled) {
            setCheckingSession(false);
          }
        }
      };

    void checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [
    checkAccess,
    resolveDestination,
    navigate,
  ]);

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (
    event:
      FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error(
        "Saisissez votre adresse email.",
      );

      return;
    }

    if (!password) {
      toast.error(
        "Saisissez votre mot de passe.",
      );

      return;
    }

    setSubmitting(true);

    try {
      // ======================================================
      // 1. SIGN IN
      // ======================================================

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              email.trim(),
            password,
          },
        );

      if (error) {
        throw error;
      }

      if (
        !data.user ||
        !data.session
      ) {
        throw new Error(
          "La session utilisateur n'a pas pu être créée.",
        );
      }

      console.log(
        "[LoginPage] SIGNED USER:",
        {
          id:
            data.user.id,
          email:
            data.user.email,
        },
      );

      // ======================================================
      // 2. VERIFY ACCESS
      // ======================================================

      const access =
        await checkAccess(
          data.user.id,
        );

      console.log(
        "[LoginPage] FINAL ACCESS:",
        {
          email:
            data.user.email,
          userId:
            data.user.id,
          isStaff:
            access.isStaff,
          isOwner:
            access.isOwner,
        },
      );

      // ======================================================
      // 3. DESTINATION
      // ======================================================

      const destination =
        resolveDestination(
          access,
        );

      // ======================================================
      // 4. NO AUTHORIZED AREA
      // ======================================================

      if (!destination) {
        toast.error(
          "Votre compte est valide, mais aucun espace ImmoPlate ne lui est actuellement associé.",
        );

        return;
      }

      // ======================================================
      // 5. REDIRECT
      // ======================================================

      toast.success(
        access.isOwner &&
          !access.isStaff
          ? "Bienvenue dans votre espace propriétaire."
          : "Connexion réussie.",
      );

      navigate(
        destination,
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(
        "[LoginPage] Login error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Impossible de vous connecter.";

      if (
        message
          .toLowerCase()
          .includes(
            "invalid login credentials",
          )
      ) {
        toast.error(
          "Email ou mot de passe incorrect.",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================
  // SESSION CHECK LOADING
  // ==========================================================

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />

          <p className="text-sm text-muted-foreground">
            Vérification de votre session...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* ====================================================== */}
      {/* BACKGROUND                                             */}
      {/* ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

        <div className="absolute -bottom-48 -right-40 h-[28rem] w-[28rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-border/60 bg-background p-7 shadow-xl shadow-slate-200/60 sm:p-9">
          {/* ================================================== */}
          {/* HEADER                                             */}
          {/* ================================================== */}

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Building2 className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight">
              Bienvenue sur ImmoPlate
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Connectez-vous à votre espace sécurisé.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              ImmoPlate vous dirigera automatiquement
              vers l'espace correspondant à votre profil.
            </p>
          </div>

          {/* ================================================== */}
          {/* FORM                                               */}
          {/* ================================================== */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* ================================================ */}
            {/* EMAIL                                            */}
            {/* ================================================ */}

            <div className="space-y-2">
              <Label htmlFor="email">
                Adresse email
              </Label>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="votre@email.com"
                  value={email}
                  disabled={submitting}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  className="h-11 pl-10"
                />
              </div>
            </div>

            {/* ================================================ */}
            {/* PASSWORD                                         */}
            {/* ================================================ */}

            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe
              </Label>

              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  disabled={submitting}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  className="h-11 px-10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* ================================================ */}
            {/* BUTTON                                           */}
            {/* ================================================ */}

            <Button
              type="submit"
              variant="premium"
              className="h-11 w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          {/* ================================================== */}
          {/* FOOTER                                             */}
          {/* ================================================== */}

          <div className="mt-7 border-t pt-5 text-center">
            <p className="text-xs text-muted-foreground">
              Accès sécurisé ImmoPlate
            </p>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Button
            variant="link"
            className="text-muted-foreground"
            onClick={() =>
              navigate("/")
            }
          >
            ← Retour au site public
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;