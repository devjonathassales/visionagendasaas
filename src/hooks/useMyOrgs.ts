// src/hooks/useMyOrgs.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MyOrg = { id: string; name: string };

export function useMyOrgs() {
  const [orgs, setOrgs] = useState<MyOrg[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          if (isMounted) {
            setOrgs([]);
            setActiveOrgId(null);
          }
          return;
        }

        // Busca as orgs onde o usuário é membro
        const { data, error } = await supabase
          .from("organizations")
          .select("id,name")
          .order("created_at", { ascending: true });

        if (error) throw error;
        const list = (data || []) as MyOrg[];
        if (!isMounted) return;

        setOrgs(list);
        setActiveOrgId((prev) => prev ?? list[0]?.id ?? null);
      } catch (e: any) {
        if (isMounted)
          setErr(e?.message || "Não foi possível carregar suas organizações.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return { orgs, activeOrgId, setActiveOrgId, loading, err };
}

// Back-compat: alguns componentes esperam só activeOrgId
export function useActiveOrg() {
  const { activeOrgId, setActiveOrgId } = useMyOrgs();
  return { activeOrgId, setActiveOrgId };
}
