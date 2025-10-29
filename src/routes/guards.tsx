// src/routes/guards.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/authContext";
import { supabase } from "@/lib/supabase";

/** Exige estar autenticado */
export function RequireAuth() {
  const { session } = useAuth();
  if (!session?.user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Exige admin baseado na view pública system_users_me */
export function RequireAdmin() {
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!session?.user?.email) {
        alive && setAllowed(false);
        return;
      }
      // Lê da view que já normaliza email e não depende de permissões na tabela
      const { data, error } = await supabase
        .from("system_users_me")
        .select("is_admin")
        .maybeSingle();

      if (!alive) return;
      if (error) {
        // Por segurança, não deixa entrar se a view falhar
        setAllowed(false);
      } else {
        setAllowed(!!data?.is_admin);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session?.user?.email]);

  if (!session?.user) return <Navigate to="/login" replace />;
  if (allowed === null) return null; // pode exibir skeleton

  return allowed ? <Outlet /> : <Navigate to="/app" replace />;
}
