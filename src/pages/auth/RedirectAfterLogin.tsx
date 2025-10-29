// src/pages/auth/RedirectAfterLogin.tsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function RedirectAfterLogin() {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.email) return setPath("/login");

      // usa a mesma fonte de verdade
      const { data, error } = await supabase
        .from("system_users_me")
        .select("is_admin")
        .maybeSingle();

      if (error) return setPath("/app");
      setPath(data?.is_admin ? "/admin" : "/app");
    })();
  }, []);

  if (!path) return null;
  return <Navigate to={path} replace />;
}
