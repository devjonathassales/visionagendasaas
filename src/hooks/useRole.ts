// src/hooks/useRole.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMyOrgs } from "./useMyOrgs";

export function useRole() {
  const { activeOrgId } = useMyOrgs();
  const [role, setRole] = useState<
    "owner" | "admin" | "staff" | "viewer" | "none"
  >("none");

  useEffect(() => {
    (async () => {
      if (!activeOrgId) {
        setRole("none");
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        setRole("none");
        return;
      }
      const { data } = await supabase
        .from("org_members")
        .select("role")
        .eq("org_id", activeOrgId)
        .eq("user_id", uid)
        .maybeSingle();
      setRole((data?.role as any) ?? "none");
    })();
  }, [activeOrgId]);

  const can = {
    manageClients: role === "owner" || role === "admin",
    writeAppointments: role === "owner" || role === "admin" || role === "staff",
    readOnly: role === "viewer",
  };

  return { role, can };
}
