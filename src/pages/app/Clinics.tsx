import { useMyOrgs } from "@/hooks/useMyOrgs";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  X,
  Trash2,
  Pencil,
  Building2,
  Power,
  ChevronsUpDown,
} from "lucide-react";

/* Types */
type Clinic = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

/* UI helpers */
function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
function Btn({
  children,
  onClick,
  variant = "base",
  disabled,
  title,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "base" | "primary" | "muted" | "danger";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const map = {
    base: "border border-border bg-card hover:bg-muted",
    primary:
      "bg-accent text-accent-foreground border border-transparent hover:opacity-90",
    muted: "border border-border bg-muted/60 hover:bg-muted",
    danger: "border border-red-700 bg-red-600 text-white hover:opacity-90",
  } as const;
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
        map[variant]
      )}
    >
      {children}
    </button>
  );
}
function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={cx(
        "px-2 py-0.5 rounded-full text-xs",
        active
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      )}
    >
      {active ? "Ativa" : "Inativa"}
    </span>
  );
}
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Btn onClick={onClose} variant="muted" title="Fechar">
            <X className="h-4 w-4" />
            Fechar
          </Btn>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* Page */
export default function ClinicsPage() {
  const {
    orgs,
    activeOrgId,
    setActiveOrgId,
    loading: loadingOrgs,
  } = useMyOrgs();

  const [rows, setRows] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Clinic | null>(null);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  async function loadClinics() {
    if (!activeOrgId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("clinics")
        .select("id,name,is_active,created_at")
        .eq("org_id", activeOrgId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setRows((data || []) as Clinic[]);
    } catch (e: any) {
      setErr(e?.message || "Erro ao carregar clínicas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadClinics();
  }, [activeOrgId]);

  function openNew() {
    setEdit(null);
    setName("");
    setIsActive(true);
    setOpen(true);
  }
  function openEdit(c: Clinic) {
    setEdit(c);
    setName(c.name);
    setIsActive(!!c.is_active);
    setOpen(true);
  }

  async function submit() {
    if (!activeOrgId || !name.trim()) return;
    try {
      const payload: any = {
        org_id: activeOrgId,
        name: name.trim(),
        is_active: isActive,
      };
      if (edit?.id) payload.id = edit.id;
      const { error } = await supabase
        .from("clinics")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setOpen(false);
      await loadClinics();
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar clínica");
    }
  }
  async function toggleActive(c: Clinic) {
    if (!activeOrgId) return;
    try {
      const { error } = await supabase
        .from("clinics")
        .update({ is_active: !c.is_active })
        .eq("org_id", activeOrgId)
        .eq("id", c.id);
      if (error) throw error;
      setRows((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, is_active: !x.is_active } : x))
      );
    } catch (e: any) {
      alert(e?.message || "Erro ao alterar status");
    }
  }
  async function remove(id: string) {
    if (!activeOrgId) return;
    if (!confirm("Excluir clínica? Esta ação não pode ser desfeita.")) return;
    try {
      const { count, error: countErr } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", activeOrgId)
        .eq("clinic_id", id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        alert("Esta clínica possui agendamentos e não pode ser excluída.");
        return;
      }
      const { error: delErr } = await supabase
        .from("clinics")
        .delete()
        .eq("org_id", activeOrgId)
        .eq("id", id);
      if (delErr) throw delErr;
      await loadClinics();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir clínica");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) =>
      [c.name, c.is_active ? "ativa" : "inativa"].some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [rows, query]);

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) || null,
    [orgs, activeOrgId]
  );

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {activeOrg
            ? `Minhas clínicas — ${activeOrg.name}`
            : "Minhas clínicas"}
        </h1>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full md:w-auto">
          {/* seletor de organização */}
          <div className="relative w-full sm:w-72">
            <div className="input flex items-center justify-between">
              <select
                className="bg-transparent w-full outline-none"
                value={activeOrgId ?? ""}
                onChange={(e) => setActiveOrgId(e.target.value || null)}
                disabled={loadingOrgs || orgs.length === 0}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronsUpDown className="w-4 h-4 opacity-60" />
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <input
              className="input w-full"
              placeholder="Pesquisar por nome ou status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <Btn onClick={openNew} variant="primary" disabled={!activeOrgId}>
            <Plus className="h-4 w-4" /> Nova clínica
          </Btn>
        </div>
      </div>

      {err && (
        <div className="card p-3 text-sm text-red-600 border border-red-500/40 bg-red-500/5">
          {err}
        </div>
      )}

      {/* Tabela única responsiva */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/70">
              <tr className="[&>th]:text-left [&>th]:px-4 [&>th]:py-3">
                <th>Nome</th>
                <th>Status</th>
                <th>Criada em</th>
                <th className="text-right pr-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-mutedForeground"
                  >
                    Carregando…
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <Badge active={c.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Btn onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Btn>
                        <Btn
                          onClick={() => toggleActive(c)}
                          title={c.is_active ? "Desativar" : "Ativar"}
                        >
                          <Power className="h-4 w-4" />
                          {c.is_active ? "Desativar" : "Ativar"}
                        </Btn>
                        <Btn
                          variant="danger"
                          onClick={() => remove(c.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-mutedForeground"
                  >
                    {activeOrgId
                      ? "Sem clínicas nesta organização."
                      : "Vincule-se a uma organização para começar."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal criação/edição */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Editar clínica" : "Nova clínica"}
      >
        {!activeOrgId ? (
          <div className="text-sm text-mutedForeground">
            Selecione/associe uma organização antes de criar clínicas.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Nome *</label>
              <input
                className="input w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Clínica Centro"
              />
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Ativa</span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Btn onClick={() => setOpen(false)} variant="muted">
                Cancelar
              </Btn>
              <Btn onClick={submit} variant="primary">
                {edit ? "Salvar alterações" : "Criar clínica"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
