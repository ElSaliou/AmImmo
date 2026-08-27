import { FormEvent, useEffect, useState } from "react";
import {
  Navigate,
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

import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocationState = {
  from?: string;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    session,
    loading,
    rolesLoading,
    isStaff,
    signIn,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const state =
    location.state as LocationState | null;

  const destination =
    state?.from &&
    state.from.startsWith("/admin")
      ? state.from
      : "/admin";

  /**
   * Si l'utilisateur est déjà connecté et staff,
   * il n'a rien à faire sur /login.
   */
  useEffect(() => {
    if (
      !loading &&
      !rolesLoading &&
      session &&
      isStaff
    ) {
      navigate(destination, {
        replace: true,
      });
    }
  }, [
    loading,
    rolesLoading,
    session,
    isStaff,
    navigate,
    destination,
  ]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Saisissez votre adresse email.");
      return;
    }

    if (!password) {
      toast.error("Saisissez votre mot de passe.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await signIn({
        email,
        password,
      });

      if (!data.user) {
        toast.error(
          "La connexion n'a pas pu être établie.",
        );

        return;
      }

      toast.success("Connexion réussie.");

      /**
       * Le RequireStaff validera ensuite le rôle
       * avant de laisser entrer l'utilisateur.
       */
      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      console.error(
        "[LoginPage] Erreur connexion :",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Impossible de vous connecter.";

      if (
        message
          .toLowerCase()
          .includes("invalid login credentials")
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (
    session &&
    isStaff &&
    !rolesLoading
  ) {
    return (
      <Navigate
        to={destination}
        replace
      />
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* Décoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

        <div className="absolute -bottom-48 -right-40 h-[28rem] w-[28rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-border/60 bg-background p-7 shadow-xl shadow-slate-200/60 sm:p-9">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Building2 className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight">
              Administration immobilière
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Connectez-vous pour accéder au
              back-office.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email */}
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
                  placeholder="admin@exemple.com"
                  value={email}
                  disabled={submitting}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  className="h-11 pl-10"
                />
              </div>
            </div>

            {/* Mot de passe */}
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
                      (current) => !current,
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

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

          <div className="mt-7 border-t pt-5 text-center">
            <p className="text-xs text-muted-foreground">
              Accès réservé aux utilisateurs
              autorisés.
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
