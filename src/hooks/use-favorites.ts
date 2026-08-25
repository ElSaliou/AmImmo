import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "favorites:property_ids";

const readLocal = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const writeLocal = (ids: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("favorites:changed"));
};

/**
 * Favoris : stockés en base (table favorites) pour les utilisateurs connectés,
 * en localStorage sinon. Une seule source de vérité exposée par ce hook.
 */
export const useFavorites = () => {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>(() => readLocal());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds(readLocal());
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("favorites").select("property_id").eq("user_id", user.id);
    setIds((data ?? []).map((f) => f.property_id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => {
      if (!user) setIds(readLocal());
    };
    window.addEventListener("favorites:changed", onChange);
    return () => window.removeEventListener("favorites:changed", onChange);
  }, [user]);

  const isFavorite = useCallback((propertyId: string) => ids.includes(propertyId), [ids]);

  const toggle = useCallback(
    async (propertyId: string) => {
      const active = ids.includes(propertyId);
      if (user) {
        if (active) {
          await supabase.from("favorites").delete().eq("user_id", user.id).eq("property_id", propertyId);
        } else {
          await supabase.from("favorites").insert({ user_id: user.id, property_id: propertyId });
        }
        await refresh();
      } else {
        const next = active ? ids.filter((i) => i !== propertyId) : [...ids, propertyId];
        writeLocal(next);
        setIds(next);
      }
      return !active;
    },
    [ids, user, refresh],
  );

  return { ids, isFavorite, toggle, loading, count: ids.length, persisted: !!user };
};
