import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

export type SysUser = {
  user_id: string;
  email: string;
  role: "super_admin" | "admin" | "support" | "viewer";
  is_active: boolean;
};

export function useSysUser() {
  const [me, setMe] = useState<SysUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_users_me")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      setMe((data as SysUser) ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const isSuper = me?.role === "super_admin" && me.is_active;
  const isAdmin = (me?.role === "admin" || isSuper) && me?.is_active;

  return useMemo(
    () => ({ me, loading, refresh, isSuper, isAdmin }),
    [me, loading, isSuper, isAdmin]
  );
}
