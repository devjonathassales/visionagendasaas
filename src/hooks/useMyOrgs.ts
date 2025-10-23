// src/hooks/useMyOrgs.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Org no app (created_at opcional p/ simplificar) */
export type Org = {
  id: string;
  name: string;
  created_at?: string | null;
};

// Linha que vem do join no Supabase. 'org' pode vir como objeto OU array.
type Row = {
  org: Org | Org[] | null;
};

const LS_KEY = "va_active_org_id";

export function useMyOrgs() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    // tenta restaurar do localStorage
    try {
      const v = localStorage.getItem(LS_KEY);
      return v || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  async function fetchOrgs() {
    setLoading(true);
    try {
      // 1) user
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) {
        setOrgs([]);
        setActiveOrgId(null);
        return;
      }

      // 2) orgs onde é membro
      const fb = await supabase
        .from("org_members")
        // relacionamento "organizations" exposto como "org"
        .select("org:organizations (id, name, created_at)")
        .eq("user_id", userId);

      let list: Org[] = [];

      if (!fb.error && fb.data) {
        const rows = fb.data as Row[];
        list = rows
          .flatMap((r) =>
            r.org ? (Array.isArray(r.org) ? r.org : [r.org]) : []
          )
          .filter((o): o is Org => Boolean(o?.id && o?.name))
          // dedup por id (evita duplicado em joins)
          .reduce<Org[]>((acc, o) => {
            if (!acc.some((x) => x.id === o.id))
              acc.push({ ...o, created_at: o.created_at ?? null });
            return acc;
          }, []);
      }

      // 3) fallback: se nada veio (ex.: staff com política mais ampla)
      if (list.length === 0) {
        const all = await supabase
          .from("organizations")
          .select("id, name, created_at")
          .order("created_at", { ascending: true });

        if (!all.error && all.data) {
          list = (all.data as any[]).map((o) => ({
            id: o.id as string,
            name: o.name as string,
            created_at: (o.created_at as string) ?? null,
          }));
        }
      }

      // 4) ordena por created_at (nulo por último) e atualiza estado
      list.sort((a, b) => {
        const aa = a.created_at ?? "9999-12-31";
        const bb = b.created_at ?? "9999-12-31";
        return aa.localeCompare(bb);
      });

      setOrgs(list);

      // ativa a org:
      // - se já há uma salva no localStorage e ela ainda existe, mantém
      // - senão, ativa a primeira da lista
      setActiveOrgId((prev) => {
        const exists = prev && list.some((o) => o.id === prev);
        const next = exists ? prev : list[0]?.id ?? null;
        try {
          if (next) localStorage.setItem(LS_KEY, next);
          else localStorage.removeItem(LS_KEY);
        } catch {}
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  // sincroniza localStorage quando trocar manualmente via setActiveOrgId
  function setActiveOrgIdPersist(id: string | null) {
    try {
      if (id) localStorage.setItem(LS_KEY, id);
      else localStorage.removeItem(LS_KEY);
    } catch {}
    setActiveOrgId(id);
  }

  useEffect(() => {
    fetchOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      orgs,
      activeOrgId,
      setActiveOrgId: setActiveOrgIdPersist,
      loading,
      refresh: fetchOrgs,
    }),
    [orgs, activeOrgId, loading]
  );

  return value;
}

/** Alias p/ telas antigas que importavam `useActiveOrg` */
export function useActiveOrg() {
  const { activeOrgId } = useMyOrgs();
  return activeOrgId;
}
