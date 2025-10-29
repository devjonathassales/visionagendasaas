// src/pages/auth/RedirectAfterLogin.tsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function RedirectAfterLogin() {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email ?? null;
      if (!email) {
        setPath("/login");
        return;
      }

      const { data } = await supabase
        .from("system_users_me")
        .select("is_admin")
        .maybeSingle();

      setPath(data?.is_admin ? "/admin" : "/app");
    })();
  }, []);

  if (!path) return null; // loading
  return <Navigate to={path} replace />;
}
