// src/hooks/useRole.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useMyOrgs } from "./useMyOrgs";

type Role = "owner" | "admin" | "staff" | "viewer" | "none";

export function useRole() {
  const { activeOrgId } = useMyOrgs();
  const [role, setRole] = useState<Role>("none");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      const email = u.user?.email ?? null;

      // 1) Admin global (tabela admin_emails)
      if (email) {
        const { data: adminRow, error: adminErr } = await supabase
          .from("admin_emails")
          .select("email")
          .eq("email", email)
          .maybeSingle();
        if (!adminErr && adminRow) setIsAdmin(true);
        else setIsAdmin(false);
      } else {
        setIsAdmin(false);
      }

      // 2) Papel na organização ativa
      if (uid && activeOrgId) {
        const { data: mRow, error: roleErr } = await supabase
          .from("org_members")
          .select("role")
          .eq("org_id", activeOrgId)
          .eq("user_id", uid)
          .maybeSingle();

        if (!roleErr && mRow?.role) setRole(mRow.role as Role);
        else setRole("none");
      } else {
        setRole("none");
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Permissões: admin global tem passe-livre no app do cliente
  const can = {
    manageClients: isAdmin || role === "owner" || role === "admin",
    writeAppointments:
      isAdmin || role === "owner" || role === "admin" || role === "staff",
    readOnly: !isAdmin && role === "viewer",
  };

  return { role, isAdmin, can, loading, refresh };
}
