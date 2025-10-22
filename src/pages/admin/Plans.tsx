import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pencil, Power, Ban, Trash2, Plus, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================================================
   Types
========================================================= */
type PlanStatus = "active" | "inactive" | "blocked";

type Plan = {
  id: string;
  code: string;
  name: string;
  priceCents: number; // centavos
  currency: "BRL";
  limits: {
    clinics: number;
    users: number;
    doctors: number;
  };
  status: PlanStatus;
  createdAt: string;
};

/* =========================================================
   Helpers
========================================================= */
function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

function ActionBtn({
  onClick,
  children,
  title,
  variant = "base",
  disabled,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  variant?: "base" | "primary" | "warn" | "danger" | "muted";
  disabled?: boolean;
}) {
  const map = {
    base: "bg-card text-foreground border-border hover:bg-muted",
    primary:
      "bg-accent text-accent-foreground border-transparent hover:opacity-90",
    warn: "bg-yellow-500/90 text-black border-yellow-600/40 hover:opacity-90",
    danger: "bg-red-600 text-white border-red-700 hover:opacity-90",
    muted: "bg-muted text-foreground border-border hover:bg-muted/80",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
        map[variant]
      )}
    >
      {children}
    </button>
  );
}

function BRL(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n / 100);
}

function formatMoneyInput(s: string): string {
  const digits = (s || "").replace(/\D+/g, "");
  const val = digits.replace(/^0+/, "") || "0";
  const cents = parseInt(val, 10);
  return BRL(cents);
}
function parseMoneyToCents(s: string): number {
  const digits = (s || "").replace(/\D+/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10);
}

function slugify(input: string) {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

/* =========================================================
   Modal (com scroll no conteúdo)
========================================================= */
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
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="
          relative card w-full sm:max-w-2xl 
          max-h-[90vh] overflow-hidden
          flex flex-col
        "
      >
        {/* Header fixo */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-lg font-semibold">{title}</h3>
          <ActionBtn onClick={onClose} title="Fechar" variant="muted">
            <X className="w-4 h-4" />
            Fechar
          </ActionBtn>
        </div>

        {/* Corpo com scroll */}
        <div
          className="p-4 overflow-y-auto"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Campos auxiliares
========================================================= */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-mutedForeground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
function statusLabel(s: PlanStatus) {
  return s === "active" ? "Ativo" : s === "inactive" ? "Inativo" : "Bloqueado";
}

/* =========================================================
   Normalizers (DB <-> UI)
========================================================= */
function normalizePlanRow(r: any): Plan {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    priceCents: r.price_cents ?? r.priceCents ?? 0,
    currency: (r.currency ?? "BRL") as "BRL",
    limits: {
      clinics: r.limits?.clinics ?? r.clinics_limit ?? 0,
      users: r.limits?.users ?? r.users_limit ?? 0,
      doctors: r.limits?.doctors ?? r.doctors_limit ?? 0,
    },
    status: (r.status ?? "inactive") as PlanStatus,
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  };
}

function payloadToDb(p: Plan) {
  // ⚠️ Apenas numéricos no JSON
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    price_cents: p.priceCents,
    currency: p.currency,
    limits: {
      clinics: p.limits.clinics,
      users: p.limits.users,
      doctors: p.limits.doctors,
    },
    status: p.status,
  };
}

/* =========================================================
   Página
========================================================= */
export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  // Modal form
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  // Modal view
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPlan, setViewPlan] = useState<Plan | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [priceInput, setPriceInput] = useState(BRL(9900));
  const [clinics, setClinics] = useState("1");
  const [users, setUsers] = useState("5");
  const [doctors, setDoctors] = useState("3");
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ========== Carregar planos do banco ========== */
  async function loadPlans() {
    setLoading(true);
    setGlobalError(null);
    try {
      const { data, error } = await supabase
        .from("plans")
        .select(
          "id, code, name, price_cents, currency, limits, status, created_at"
        )
        .order("price_cents", { ascending: true });

      if (error) throw new Error(error.message);
      setPlans((data || []).map(normalizePlanRow));
    } catch (e: any) {
      setGlobalError(e?.message || "Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  // Reset ao fechar modal
  useEffect(() => {
    if (!modalOpen) {
      setEditing(null);
      setErrors({});
      setCode("");
      setName("");
      setPriceInput(BRL(9900));
      setClinics("1");
      setUsers("5");
      setDoctors("3");
    }
  }, [modalOpen]);

  // Auto-slug do code quando digitam o nome (somente se não estiver editando manualmente)
  useEffect(() => {
    if (!editing) {
      setCode((prev) => {
        // se o usuário já alterou manualmente e é diferente do slug anterior, respeita
        const s = slugify(name);
        // heurística simples: se prev está vazio ou era o slug anterior, atualiza
        if (!prev || prev === slugify(prev)) return s;
        return prev;
      });
    }
  }, [name, editing]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) =>
      [
        p.name,
        p.code,
        BRL(p.priceCents),
        String(p.limits.clinics),
        String(p.limits.users),
        String(p.limits.doctors),
      ].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [plans, query]);

  function badgeStatus(s: PlanStatus) {
    const map: Record<PlanStatus, string> = {
      active:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      inactive:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return (
      <span className={`badge ${map[s]}`}>
        {s === "active" ? "Ativo" : s === "inactive" ? "Inativo" : "Bloqueado"}
      </span>
    );
  }

  /* ========== Ações ========== */
  function handleView(p: Plan) {
    setViewPlan(p);
    setViewOpen(true);
  }

  function handleEdit(p: Plan) {
    setEditing(p);
    setCode(p.code);
    setName(p.name);
    setPriceInput(BRL(p.priceCents));
    setClinics(String(p.limits.clinics));
    setUsers(String(p.limits.users));
    setDoctors(String(p.limits.doctors));
    setModalOpen(true);
  }

  async function persistStatus(p: Plan, next: PlanStatus) {
    setBusyId(p.id);
    setGlobalError(null);
    try {
      const { data, error } = await supabase
        .from("plans")
        .update({ status: next })
        .eq("id", p.id)
        .select("id,status")
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (!data) {
        await loadPlans();
        setGlobalError(
          "Não foi possível atualizar o status do plano (nenhuma linha afetada). Verifique políticas RLS/permissões."
        );
        return;
      }

      const newStatus = (data.status ?? next) as PlanStatus;
      setPlans((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, status: newStatus } : x))
      );
    } catch (e: any) {
      setGlobalError(e?.message || "Erro ao atualizar status do plano");
      await loadPlans();
    } finally {
      setBusyId(null);
    }
  }

  function toggleActive(p: Plan) {
    const next: PlanStatus = p.status === "active" ? "inactive" : "active";
    void persistStatus(p, next);
  }

  function toggleBlocked(p: Plan) {
    const next: PlanStatus = p.status === "blocked" ? "active" : "blocked";
    void persistStatus(p, next);
  }

  async function handleDelete(p: Plan) {
    if (p.status === "active") {
      alert("Desative o plano antes de excluir.");
      return;
    }
    if (!confirm(`Excluir plano "${p.name}"?`)) return;

    setBusyId(p.id);
    setGlobalError(null);
    try {
      const { error } = await supabase.from("plans").delete().eq("id", p.id);
      if (error) throw new Error(error.message);
      setPlans((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      setGlobalError(e?.message || "Erro ao excluir plano");
      await loadPlans();
    } finally {
      setBusyId(null);
    }
  }

  /* ========== Form helpers ========== */
  function validateForm(): boolean {
    const e: Record<string, string> = {};
    const codeTrim = code.trim();
    if (!codeTrim) e.code = "Informe o código do plano";
    else if (!/^[a-z0-9][a-z0-9-_]{2,63}$/.test(codeTrim))
      e.code =
        "Use letras/números/hífen/underline (mín. 3 caracteres, iniciar com letra/número).";

    if (!name.trim()) e.name = "Informe o nome do plano";

    const cents = parseMoneyToCents(priceInput);
    if (!Number.isFinite(cents) || cents < 0) e.price = "Valor inválido";
    if (!/^\d+$/.test(clinics)) e.clinics = "Quantidade inválida";
    if (!/^\d+$/.test(users)) e.users = "Quantidade inválida";
    if (!/^\d+$/.test(doctors)) e.doctors = "Quantidade inválida";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitForm() {
    if (!validateForm()) return;

    const payload: Plan = {
      id: editing?.id || crypto.randomUUID(),
      code: code.trim(),
      name: name.trim(),
      priceCents: parseMoneyToCents(priceInput),
      currency: "BRL",
      limits: {
        clinics: parseInt(clinics, 10),
        users: parseInt(users, 10),
        doctors: parseInt(doctors, 10),
      },
      status: editing?.status || "active",
      createdAt: editing?.createdAt || new Date().toISOString(),
    };

    setBusyId("form");
    setGlobalError(null);

    try {
      if (editing) {
        const { error, data } = await supabase
          .from("plans")
          .update(payloadToDb(payload))
          .eq("id", editing.id)
          .select(
            "id, code, name, price_cents, currency, limits, status, created_at"
          )
          .maybeSingle();

        if (error) throw new Error(error.message);

        if (!data) {
          await loadPlans();
          setGlobalError(
            "Não foi possível salvar (nenhuma linha afetada). Verifique RLS/permissões."
          );
        } else {
          const updated = normalizePlanRow(data);
          setPlans((prev) =>
            prev.map((p) => (p.id === editing.id ? updated : p))
          );
        }
      } else {
        // 1) INSERT sem select (evita ?columns=... no POST)
        const toInsert = payloadToDb(payload);
        const { error: insErr } = await supabase
          .from("plans")
          .insert([{ ...toInsert, id: payload.id }]);
        if (insErr) throw new Error(insErr.message);

        // 2) SELECT pelo id recém-criado
        const { data, error: selErr } = await supabase
          .from("plans")
          .select(
            "id, code, name, price_cents, currency, limits, status, created_at"
          )
          .eq("id", payload.id)
          .maybeSingle();

        if (selErr) throw new Error(selErr.message);

        if (!data) {
          await loadPlans();
        } else {
          const created = normalizePlanRow(data);
          setPlans((prev) => [created, ...prev]);
        }
      }

      setModalOpen(false);
    } catch (e: any) {
      // Mostra detalhes úteis quando for unique_violation / not-null etc.
      const msg =
        e?.message || e?.error_description || e?.hint || "Erro ao salvar plano";
      setGlobalError(msg);
    } finally {
      setBusyId(null);
    }
  }

  /* =========================================================
     UI
  ========================================================= */
  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1>Planos</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              className="input pl-9"
              placeholder="Pesquisar por código, nome, valor, limites..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ActionBtn
            variant="primary"
            onClick={() => setModalOpen(true)}
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            Adicionar novo plano
          </ActionBtn>
        </div>
      </div>

      {globalError && (
        <div className="card p-3 text-sm text-red-600 border border-red-500/40 bg-red-500/5">
          {globalError}
        </div>
      )}

      {/* Mobile */}
      <div className="grid gap-3 sm:hidden">
        {loading && (
          <div className="card p-4 text-sm text-mutedForeground">
            Carregando…
          </div>
        )}
        {!loading &&
          filtered.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-base break-words">
                    {p.name}
                  </div>
                  <div className="text-mutedForeground text-xs break-all">
                    {p.code}
                  </div>
                  <div className="text-mutedForeground text-sm">
                    {BRL(p.priceCents)}
                  </div>
                  <div className="mt-2 text-sm space-y-0.5">
                    <div>
                      <span className="text-mutedForeground">Clínicas:</span>{" "}
                      {p.limits.clinics}
                    </div>
                    <div>
                      <span className="text-mutedForeground">Usuários:</span>{" "}
                      {p.limits.users}
                    </div>
                    <div>
                      <span className="text-mutedForeground">Médicos:</span>{" "}
                      {p.limits.doctors}
                    </div>
                  </div>
                </div>
                {badgeStatus(p.status)}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <ActionBtn
                  onClick={() => handleView(p)}
                  title="Visualizar"
                  disabled={busyId === p.id}
                >
                  <Eye className="w-4 h-4" /> Ver
                </ActionBtn>
                <ActionBtn
                  onClick={() => handleEdit(p)}
                  title="Editar"
                  disabled={busyId === p.id}
                >
                  <Pencil className="w-4 h-4" /> Editar
                </ActionBtn>
                <ActionBtn
                  onClick={() => toggleActive(p)}
                  title={p.status === "active" ? "Desativar" : "Ativar"}
                  disabled={busyId === p.id}
                >
                  <Power className="w-4 h-4" />
                  {p.status === "active" ? "Desativar" : "Ativar"}
                </ActionBtn>
                <ActionBtn
                  variant="warn"
                  onClick={() => toggleBlocked(p)}
                  title={p.status === "blocked" ? "Desbloquear" : "Bloquear"}
                  disabled={busyId === p.id}
                >
                  <Ban className="w-4 h-4" />
                  {p.status === "blocked" ? "Desbloquear" : "Bloquear"}
                </ActionBtn>
                <ActionBtn
                  variant="danger"
                  onClick={() => handleDelete(p)}
                  title="Excluir"
                  disabled={busyId === p.id}
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </ActionBtn>
              </div>
            </div>
          ))}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-mutedForeground py-6 card">
            Nenhum plano encontrado.
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="card overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/70">
              <tr className="[&>th]:text-left [&>th]:px-4 [&>th]:py-3">
                <th>Código</th>
                <th>Plano</th>
                <th>Valor</th>
                <th>Clínicas</th>
                <th>Usuários</th>
                <th>Médicos</th>
                <th>Status</th>
                <th className="text-right pr-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-mutedForeground"
                  >
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 text-xs break-all">{p.code}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">{BRL(p.priceCents)}</td>
                    <td className="px-4 py-3">{p.limits.clinics}</td>
                    <td className="px-4 py-3">{p.limits.users}</td>
                    <td className="px-4 py-3">{p.limits.doctors}</td>
                    <td className="px-4 py-3">{badgeStatus(p.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <ActionBtn
                          onClick={() => handleView(p)}
                          title="Visualizar"
                          disabled={busyId === p.id}
                        >
                          <Eye className="w-4 h-4" /> Ver
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => handleEdit(p)}
                          title="Editar"
                          disabled={busyId === p.id}
                        >
                          <Pencil className="w-4 h-4" /> Editar
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => toggleActive(p)}
                          title={p.status === "active" ? "Desativar" : "Ativar"}
                          disabled={busyId === p.id}
                        >
                          <Power className="w-4 h-4" />
                          {p.status === "active" ? "Desativar" : "Ativar"}
                        </ActionBtn>
                        <ActionBtn
                          variant="warn"
                          onClick={() => toggleBlocked(p)}
                          title={
                            p.status === "blocked" ? "Desbloquear" : "Bloquear"
                          }
                          disabled={busyId === p.id}
                        >
                          <Ban className="w-4 h-4" />
                          {p.status === "blocked" ? "Desbloquear" : "Bloquear"}
                        </ActionBtn>
                        <ActionBtn
                          variant="danger"
                          onClick={() => handleDelete(p)}
                          title="Excluir"
                          disabled={busyId === p.id}
                        >
                          <Trash2 className="w-4 h-4" /> Excluir
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-mutedForeground"
                  >
                    Nenhum plano encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de criação/edição */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar plano" : "Novo plano"}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Código *</label>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(slugify(e.target.value))}
              placeholder="ex.: plano-basic"
            />
            {errors.code && (
              <small className="text-red-600">{errors.code}</small>
            )}
            <small className="text-mutedForeground block mt-1">
              Único, sem espaços (ex.: <b>basic</b>, <b>pro</b>,{" "}
              <b>clinic-premium</b>).
            </small>
          </div>

          <div>
            <label className="label">Nome *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Plano Basic"
            />
            {errors.name && (
              <small className="text-red-600">{errors.name}</small>
            )}
          </div>

          <div>
            <label className="label">Valor *</label>
            <input
              className="input"
              value={priceInput}
              onChange={(e) => setPriceInput(formatMoneyInput(e.target.value))}
              placeholder="R$ 0,00"
            />
            {errors.price && (
              <small className="text-red-600">{errors.price}</small>
            )}
          </div>

          <div>
            <label className="label">Qtde de clínicas *</label>
            <input
              className="input"
              value={clinics}
              onChange={(e) =>
                /^\d*$/.test(e.target.value) && setClinics(e.target.value)
              }
              placeholder="1"
            />
            {errors.clinics && (
              <small className="text-red-600">{errors.clinics}</small>
            )}
          </div>

          <div>
            <label className="label">Qtde de usuários *</label>
            <input
              className="input"
              value={users}
              onChange={(e) =>
                /^\d*$/.test(e.target.value) && setUsers(e.target.value)
              }
              placeholder="5"
            />
            {errors.users && (
              <small className="text-red-600">{errors.users}</small>
            )}
          </div>

          <div>
            <label className="label">Qtde de médicos *</label>
            <input
              className="input"
              value={doctors}
              onChange={(e) =>
                /^\d*$/.test(e.target.value) && setDoctors(e.target.value)
              }
              placeholder="3"
            />
            {errors.doctors && (
              <small className="text-red-600">{errors.doctors}</small>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <ActionBtn
            variant="muted"
            onClick={() => setModalOpen(false)}
            disabled={busyId === "form"}
          >
            Cancelar
          </ActionBtn>
          <ActionBtn
            variant="primary"
            onClick={submitForm}
            disabled={busyId === "form"}
          >
            {editing ? "Salvar alterações" : "Criar plano"}
          </ActionBtn>
        </div>
      </Modal>

      {/* Modal de visualização */}
      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Detalhes do plano"
      >
        {viewPlan ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Código" value={viewPlan.code} />
              <Field label="Nome" value={viewPlan.name} />
              <Field label="Valor" value={BRL(viewPlan.priceCents)} />
              <Field label="Clínicas" value={String(viewPlan.limits.clinics)} />
              <Field label="Usuários" value={String(viewPlan.limits.users)} />
              <Field label="Médicos" value={String(viewPlan.limits.doctors)} />
              <Field label="Status" value={statusLabel(viewPlan.status)} />
            </div>
          </div>
        ) : (
          <div className="text-mutedForeground">Carregando…</div>
        )}
      </Modal>
    </div>
  );
}
