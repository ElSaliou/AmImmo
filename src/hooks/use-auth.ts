import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AuthError,
  Session,
  User,
} from "@supabase/supabase-js";
import type { AppRole } from "@/types/real-estate";

const STAFF_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "manager",
  "agent",
  "accountant",
  "maintenance",
];

type SignInInput = {
  email: string;
  password: string;
};

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);

  /**
   * Charge les rôles applicatifs du compte actuellement connecté.
   */
  const loadRoles = useCallback(async (userId: string) => {
    setRolesLoading(true);
    setRolesError(null);

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        console.error(
          "[useAuth] Impossible de récupérer les rôles :",
          error,
        );

        setRoles([]);
        setRolesError(error.message);

        return;
      }

      const userRoles = (data ?? [])
        .map((row) => row.role)
        .filter(Boolean) as AppRole[];

      setRoles(userRoles);
    } catch (error) {
      console.error(
        "[useAuth] Erreur inattendue pendant le chargement des rôles :",
        error,
      );

      setRoles([]);

      setRolesError(
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les rôles utilisateur.",
      );
    } finally {
      setRolesLoading(false);
    }
  }, []);

  /**
   * Chargement initial de la session.
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "[useAuth] Erreur getSession :",
            error,
          );
        }

        setSession(currentSession);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) {
          return;
        }

        setSession(newSession);
        setLoading(false);

        if (!newSession?.user) {
          setRoles([]);
          setRolesError(null);
          setRolesLoading(false);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Rechargement des rôles lorsque l'utilisateur change.
   */
  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      setRoles([]);
      setRolesError(null);
      setRolesLoading(false);

      return;
    }

    void loadRoles(userId);
  }, [session?.user?.id, loadRoles]);

  /**
   * Connexion.
   */
  const signIn = useCallback(
    async ({ email, password }: SignInInput) => {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        throw error;
      }

      return data;
    },
    [],
  );

  /**
   * Déconnexion.
   */
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setRoles([]);
    setRolesError(null);
  }, []);

  const user: User | null = session?.user ?? null;

  const isAuthenticated = Boolean(session?.user);

  /**
   * IMPORTANT :
   * owner et tenant ne sont PAS considérés comme staff.
   */
  const isStaff = useMemo(
    () =>
      roles.some((role) =>
        STAFF_ROLES.includes(role),
      ),
    [roles],
  );

  const isSuperAdmin = roles.includes("super_admin");

  const isAdmin =
    isSuperAdmin || roles.includes("admin");

  const isManager =
    isAdmin || roles.includes("manager");

  const isAgent = roles.includes("agent");

  const isAccountant =
    isAdmin || roles.includes("accountant");

  const isMaintenance =
    isAdmin || roles.includes("maintenance");

  const isOwner = roles.includes("owner");

  const isTenant = roles.includes("tenant");

  return {
    session,
    user,

    loading,
    rolesLoading,

    roles,
    rolesError,

    isAuthenticated,
    isStaff,

    isSuperAdmin,
    isAdmin,
    isManager,
    isAgent,
    isAccountant,
    isMaintenance,
    isOwner,
    isTenant,

    signIn,
    signOut,
    refreshRoles: async () => {
      if (user?.id) {
        await loadRoles(user.id);
      }
    },
  };
};

export type UseAuthReturn = ReturnType<
  typeof useAuth
>;

export type AuthSignInError = AuthError;
