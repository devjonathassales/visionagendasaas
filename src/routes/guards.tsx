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

/** Exige e-mail de admin; se não for, leva para /app sem travar login */
export function RequireAdmin() {
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!session?.user?.email) {
        mounted && setAllowed(false);
        return;
      }
      // tenta checar na tabela admin_emails (RLS deve permitir leitura por e-mail igual ao próprio)
      const { data, error } = await supabase
        .from("admin_emails")
        .select("email")
        .ilike("email", session.user.email)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        // Se der erro de RLS/perm, por segurança NÃO permite admin
        setAllowed(false);
      } else {
        setAllowed(!!data);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, [session?.user?.email]);

  if (!session?.user) return <Navigate to="/login" replace />;

  if (allowed === null) return null; // loading pequeno; pode trocar por skeleton

  return allowed ? <Outlet /> : <Navigate to="/app" replace />;
}
