import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/authContext";

export default function AdminGuard() {
  const { session, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session?.user) {
      setAllowed(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setChecking(true);
      const { data, error } = await supabase.rpc("is_staff");
      if (cancelled) return;

      if (error) {
        console.error("is_staff error", error);
        setAllowed(false);
      } else {
        setAllowed(Boolean(data));
      }
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session, loading]);

  // Enquanto verifica sessão ou RPC
  if (loading || allowed === null || checking) {
    return <div className="container py-8">Verificando acesso…</div>;
  }

  // Sem sessão → volta pro login
  if (!session?.user) {
    return <Navigate to="/login" replace state={{ reason: "no-session" }} />;
  }

  // Com sessão mas sem permissão de admin → mostra feedback (evita loop mudo)
  if (!allowed) {
    return (
      <div className="container py-10 max-w-xl">
        <h1 className="text-2xl font-semibold mb-2">Acesso restrito</h1>
        <p className="text-mutedForeground">
          Seu usuário não possui permissão de administrador.
        </p>
        <div className="mt-6">
          <a href="/login" className="btn">
            Voltar ao login
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
