// src/hooks/useIsAdmin.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useIsAdmin() {
  const [state, setState] = useState<{ loading: boolean; isAdmin: boolean }>({
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    let done = false;

    async function run() {
      setState({ loading: true, isAdmin: false });

      // precisa estar logado
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.email) {
        if (!done) setState({ loading: false, isAdmin: false });
        return;
      }

      // consulta a view 1x
      const { data, error } = await supabase
        .from("system_users_me")
        .select("is_admin")
        .maybeSingle();

      if (!done) {
        if (error) setState({ loading: false, isAdmin: false });
        else setState({ loading: false, isAdmin: !!data?.is_admin });
      }
    }

    run();

    // revalidar quando o auth mudar (ex.: logout/login)
    const { data: sub } = supabase.auth.onAuthStateChange(() => run());
    return () => {
      done = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state; // {loading, isAdmin}
}
