import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSysUser } from "@/hooks/useSysUser";

type Row = {
  user_id: string;
  email: string;
  role: "super_admin" | "admin" | "support" | "viewer";
  is_active: boolean;
};

export default function SystemUsersPage() {
  const { isSuper } = useSysUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Row["role"]>("admin");
  const [active, setActive] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_users")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setRows((data || []) as Row[]);
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    if (!isSuper) return;
    if (!email.trim()) return alert("Informe um e-mail existente no Auth.");
    const { error } = await supabase.rpc("admin_add_system_user", {
      p_email: email.trim(),
      p_role: role,
      p_active: active,
    });
    if (error) return alert(error.message);
    setEmail("");
    setRole("admin");
    setActive(true);
    load();
  }

  async function remove(user_id: string) {
    if (!isSuper) return;
    if (!confirm("Remover acesso deste usuário ao painel?")) return;
    const { error } = await supabase.rpc("admin_remove_system_user", {
      p_user_id: user_id,
    });
    if (error) return alert(error.message);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1>Usuários do Sistema</h1>

      {isSuper && (
        <div className="card p-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="label">E-mail (já existente no Auth)</label>
            <input
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex.: admin@admin.com"
            />
          </div>
          <div>
            <label className="label">Função</label>
            <select
              className="input w-full"
              value={role}
              onChange={(e) => setRole(e.target.value as Row["role"])}
            >
              <option value="admin">admin</option>
              <option value="support">support</option>
              <option value="viewer">viewer</option>
              <option value="super_admin">super_admin</option>
            </select>
          </div>
          <div>
            <label className="label">Ativo</label>
            <br />
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />{" "}
              Ativo
            </label>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button className="btn" onClick={add}>
              Adicionar/Atualizar
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/70">
              <tr className="[&>th]:text-left [&>th]:px-4 [&>th]:py-3">
                <th>E-mail</th>
                <th>Função</th>
                <th>Status</th>
                {isSuper && <th className="text-right pr-4">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={isSuper ? 4 : 3}
                    className="px-4 py-6 text-center text-mutedForeground"
                  >
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => (
                  <tr key={r.user_id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{r.email}</td>
                    <td className="px-4 py-3">{r.role}</td>
                    <td className="px-4 py-3">
                      {r.is_active ? "Ativo" : "Inativo"}
                    </td>
                    {isSuper && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            className="btn danger"
                            onClick={() => remove(r.user_id)}
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={isSuper ? 4 : 3}
                    className="px-4 py-6 text-center text-mutedForeground"
                  >
                    Nenhum usuário de sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
