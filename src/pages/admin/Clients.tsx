/* === AdminClientsPage.tsx (com seed de 12 mensalidades no frontend) === */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Pencil,
  Power,
  Ban,
  Trash2,
  Plus,
  Search,
  X,
  Clipboard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================================================
   Types
========================================================= */
type ClientStatus = "active" | "inactive" | "blocked";

type Client = {
  id: string;
  name: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string;
  cep?: string;
  address_line1?: string;
  address_line2?: string;
  district?: string;
  city?: string;
  state?: string;
  planId?: string;
  planName?: string;
  typeId?: string;
  typeKey?: string;
  typeName?: string;
  status: ClientStatus;
  hasAppointments?: boolean;
  createdAt: string;
};

type Plan = { id: string; name: string };
type OrgType = { id: string; key: string; name: string };

/* =========================================================
   Utils (mask & validation)
========================================================= */
const onlyDigits = (v: string) => (v || "").replace(/\D+/g, "");

function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}
function formatCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}
function formatCpfCnpj(v: string) {
  const d = onlyDigits(v);
  if (d.length <= 11) return formatCPF(d);
  return formatCNPJ(d);
}
function validateCPF(cpf: string) {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  rev = rev >= 10 ? 0 : rev;
  if (rev !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  rev = 11 - (sum % 11);
  rev = rev >= 10 ? 0 : rev;
  return rev === parseInt(d[10]);
}
function validateCNPJ(cnpj: string) {
  const d = onlyDigits(cnpj);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  let length = d.length - 2;
  let numbers = d.substring(0, length);
  const digits = d.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers[length - i]) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits[0])) return false;
  length = length + 1;
  numbers = d.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers[length - i]) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits[1]);
}
function isValidCpfCnpj(v: string) {
  const d = onlyDigits(v);
  if (d.length <= 11) return validateCPF(d);
  return validateCNPJ(d);
}
function formatPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function formatCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d{1,3})/, "$1-$2");
}
async function fetchViaCEP(cepRaw: string) {
  const d = onlyDigits(cepRaw);
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.erro) return null;
    return {
      address_line1: data.logradouro || "",
      district: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    return null;
  }
}

/* =========================================================
   UI Helpers
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

/* =========================================================
   Modal (com scroll no conteúdo – mobile e desktop)
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
   Página
========================================================= */
export default function AdminClientsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [types, setTypes] = useState<OrgType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalInfo, setGlobalInfo] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  // como criaremos/vincularemos o usuário admin
  const [inviteMode, setInviteMode] = useState<"invite" | "direct">("invite");
  const [memberRole, setMemberRole] = useState<"owner" | "admin">("owner");

  // Modal de visualização
  const [viewOpen, setViewOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  // Form state local
  const [form, setForm] = useState<Partial<Client>>({
    name: "",
    cpfCnpj: "",
    phone: "",
    email: "",
    cep: "",
    address_line1: "",
    address_line2: "",
    district: "",
    city: "",
    state: "",
    planId: "",
    planName: "",
    typeId: "",
    typeName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carrega planos
  async function loadPlans() {
    const { data, error } = await supabase
      .from("plans")
      .select("id,name,status")
      .eq("status", "active")
      .order("price_cents", { ascending: true });
    if (error) throw new Error(error.message);
    const arr = (data || []).map(
      (p: any) => ({ id: p.id, name: p.name } as Plan)
    );
    setPlans(arr);
  }

  // Carrega tipos
  async function loadTypes() {
    const { data, error } = await supabase
      .from("org_types")
      .select("id,key,name,status")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    const arr = (data || [])
      .filter((t: any) => t.status === "active" || true)
      .map((t: any) => ({ id: t.id, key: t.key, name: t.name } as OrgType));
    setTypes(arr);
  }

  // Carrega clientes (RPC admin)
  async function loadClients(q?: string) {
    setLoading(true);
    setGlobalError(null);
    setGlobalInfo(null);

    const trimmed = q?.trim();
    const argAttempts: Array<Record<string, any>> = [];

    if (trimmed) {
      argAttempts.push({ q: trimmed });
      argAttempts.push({ p_q: trimmed });
      argAttempts.push({ search: trimmed });
    } else {
      argAttempts.push({});
    }

    try {
      let lastError: any = null;
      let rows: any[] | null = null;

      for (const args of argAttempts) {
        const { data, error } = await supabase.rpc(
          "admin_clients_list",
          args as any
        );
        if (!error) {
          rows = Array.isArray(data) ? data : data ? [data] : [];
          break;
        }
        lastError = error;
      }

      if (!rows) {
        const msg =
          (lastError?.message as string) ||
          "Erro ao carregar clientes. Verifique a função SQL.";
        const isShapeErr =
          /structure of query does not match function result type/i.test(msg);
        setGlobalError(
          isShapeErr
            ? "A função SQL 'admin_clients_list' está retornando colunas diferentes do que declara. Ajuste o RETURNS/SELECT no banco."
            : msg
        );
        setClients([]);
        return;
      }

      const arr = rows.map(normalizeClientRow);
      setClients(arr);
    } catch (e: any) {
      setGlobalError(e?.message || "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }

  // Inicial
  useEffect(() => {
    Promise.all([loadPlans(), loadTypes(), loadClients()]).catch((e) =>
      setGlobalError(e.message)
    );
  }, []);

  // Reset ao fechar modal
  useEffect(() => {
    if (!modalOpen) {
      setForm((f) => ({
        name: "",
        cpfCnpj: "",
        phone: "",
        email: "",
        cep: "",
        address_line1: "",
        address_line2: "",
        district: "",
        city: "",
        state: "",
        planId: plans[0]?.id || "",
        planName: plans[0]?.name || "",
        typeId: types[0]?.id || "",
        typeName: types[0]?.name || "",
      }));
      setErrors({});
      setEditing(null);
      setInviteMode("invite");
      setMemberRole("owner");
    } else {
      setForm((f) => ({
        ...f,
        planId: f.planId || plans[0]?.id || "",
        planName: f.planName || plans[0]?.name || "",
        typeId: f.typeId || types[0]?.id || "",
        typeName: f.typeName || types[0]?.name || "",
      }));
    }
  }, [modalOpen, plans, types]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.cpfCnpj, c.email, c.phone, c.city, c.state, c.typeName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [clients, query]);

  function badgeStatus(s: ClientStatus) {
    const map: Record<ClientStatus, string> = {
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

  /* ========== Ações ========= */
  function handleView(c: Client) {
    setViewClient(c);
    setViewOpen(true);
  }

  function handleEdit(c: Client) {
    setEditing(c);
    setForm({
      ...c,
      planId: c.planId,
      planName: c.planName,
      typeId: c.typeId,
      typeName: c.typeName,
    });
    setInviteMode("direct");
    setMemberRole("owner");
    setModalOpen(true);
  }

  async function toggleActive(c: Client) {
    setBusyId(c.id);
    setGlobalError(null);
    try {
      const { data, error } = await supabase.rpc("admin_clients_toggle", {
        p_org_id: c.id,
      });
      if (error) throw new Error(error.message);
      const next = data as string as ClientStatus;
      setClients((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, status: next } : x))
      );
    } catch (e: any) {
      setGlobalError(e?.message || "Erro ao atualizar status");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBlocked(c: Client) {
    setBusyId(c.id);
    setGlobalError(null);
    try {
      const rpc =
        c.status === "blocked"
          ? "admin_clients_unblock"
          : "admin_clients_block";
      const { data, error } = await supabase.rpc(rpc, { p_org_id: c.id });
      if (error) throw new Error(error.message);
      const next = data as string as ClientStatus;
      setClients((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, status: next } : x))
      );
    } catch (e: any) {
      setGlobalError(e?.message || "Erro ao atualizar bloqueio");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(c: Client) {
    if (!confirm(`Excluir cliente "${c.name}"?`)) return;
    setBusyId(c.id);
    setGlobalError(null);
    try {
      const { data, error } = await supabase.rpc("admin_clients_delete", {
        p_org_id: c.id,
      });
      if (error) throw new Error(error.message);
      if (data) setClients((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e: any) {
      setGlobalError(e?.message || "Erro ao excluir cliente");
    } finally {
      setBusyId(null);
    }
  }

  /* ========== Modal form ========= */
  function setField<K extends keyof Client>(key: K, value: Client[K] | string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onBlurCEP() {
    if (!form.cep) return;
    const cepInfo = await fetchViaCEP(form.cep);
    if (cepInfo) setForm((f) => ({ ...f, ...cepInfo }));
  }

  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = "Informe o nome do cliente";

    const doc = form.cpfCnpj?.trim() || "";
    if (!doc) e.cpfCnpj = "Informe CPF ou CNPJ";
    else if (!isValidCpfCnpj(doc)) e.cpfCnpj = "CPF/CNPJ inválido";

    // e-mail obrigatório na criação (para criar/vincular admin)
    if (!editing) {
      if (!form.email?.trim()) e.email = "Informe o e-mail do administrador";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = "E-mail inválido";
    } else {
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = "E-mail inválido";
    }

    if (form.cep && onlyDigits(form.cep).length !== 8) e.cep = "CEP inválido";
    if (!form.planId) e.planId = "Selecione um plano";
    if (!form.typeId) e.typeId = "Selecione um tipo de cliente";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Helper: extrai orgId/token do retorno da RPC
  function unwrapCreateResponse(raw: any) {
    const orgId: string =
      (typeof raw === "string" && raw) || raw?.org_id || raw?.id || "";
    const inviteToken: string | null = raw?.invite_token ?? raw?.token ?? null;
    return { orgId, inviteToken };
  }

  // Mantemos a geração das 12 mensalidades NO APP (frontend),
  // pois removemos do backend para evitar duplicidade.
  async function seed12MonthsInvoices(orgId: string, planId?: string | null) {
    if (!orgId || !planId) return;
    try {
      const startDate = new Date();
      const p_start_date = startDate.toISOString();

      const { error } = await supabase.rpc("admin_invoices_seed_plan_12", {
        p_org_id: orgId,
        p_plan_id: planId,
        p_start_date,
      } as any);
      if (error) {
        console.warn("Seed 12 invoices falhou:", error.message);
        setGlobalInfo(
          "Cliente criado. Obs: não foi possível gerar as 12 mensalidades automaticamente (verifique a função SQL)."
        );
      } else {
        setGlobalInfo(
          "Cliente criado + 12 mensalidades geradas no Financeiro."
        );
      }
    } catch (e: any) {
      console.warn("Seed 12 invoices exception:", e?.message);
    }
  }

  async function submitForm() {
    if (!validateForm()) return;

    try {
      setBusyId("form");
      setGlobalError(null);
      setGlobalInfo(null);

      if (editing) {
        // Atualiza dados do cliente (não mexe em membros aqui)
        const { error } = await supabase.rpc("admin_clients_update", {
          p_org_id: editing.id,
          p_name: form.name?.trim() || null,
          p_status: editing.status,
          p_cpf_cnpj: form.cpfCnpj || null,
          p_phone: form.phone || null,
          p_email: form.email || null,
          p_cep: form.cep || null,
          p_address_line1: form.address_line1 || null,
          p_address_line2: form.address_line2 || null,
          p_district: form.district || null,
          p_city: form.city || null,
          p_state: form.state || null,
          p_plan_id: form.planId || null,
          p_type_id: form.typeId || null,
        });
        if (error) throw new Error(error.message);
        await loadClients();
      } else {
        // Criação do tenant + (opcional) convite do admin
        const safeRole: "owner" | "admin" =
          memberRole === "admin" ? "admin" : "owner";

        const { data, error } = await supabase.rpc("admin_clients_create", {
          p_name: form.name?.trim(),
          p_plan_id: form.planId, // <- obrigatório e agora vem cedo na assinatura
          p_cpf_cnpj: form.cpfCnpj || null,
          p_phone: form.phone || null,
          p_email: form.email || null, // contato
          p_cep: form.cep || null,
          p_address_line1: form.address_line1 || null,
          p_address_line2: form.address_line2 || null,
          p_district: form.district || null,
          p_city: form.city || null,
          p_state: form.state || null,
          // membro admin do tenant
          p_member_email: form.email || null,
          p_member_role: safeRole, // "owner" | "admin"
          p_invite: inviteMode === "invite", // se true → cria convite
          p_type_id: form.typeId || null,
        });
        if (error) throw new Error(error.message);

        const { orgId, inviteToken } = unwrapCreateResponse(data);

        // Gera 12 mensalidades (frontend)
        await seed12MonthsInvoices(orgId, form.planId || null);

        if (inviteMode === "invite") {
          if (inviteToken) {
            const inviteUrl = `${window.location.origin}/accept-invite/${inviteToken}`;
            try {
              await navigator.clipboard.writeText(inviteUrl);
              setGlobalInfo(
                `Cliente criado. Convite gerado e link copiado: ${inviteUrl}`
              );
            } catch {
              setGlobalInfo(
                `Cliente criado. Convite gerado. Copie e envie o link: ${inviteUrl}`
              );
            }
          } else {
            setGlobalInfo(
              `Cliente criado (ID: ${orgId}). Um convite deve ser enviado pela Edge Function.`
            );
          }
        } else {
          setGlobalInfo(
            `Cliente criado (ID: ${orgId}). Usuário ${
              form.email || "(sem e-mail)"
            } foi ${form.email ? "vinculado (se já existia)." : "ignorado."}`
          );
        }

        await loadClients();
      }

      setModalOpen(false);
    } catch (e: any) {
      setGlobalError(e?.message || "Erro ao salvar");
    } finally {
      setBusyId(null);
    }
  }

  // Normaliza o shape vindo do RPC (snake_case -> camelCase esperado)
  function normalizeClientRow(r: any): Client {
    return {
      id: r.id,
      name: r.name,
      cpfCnpj: r.cpf_cnpj ?? r.cpfCnpj ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      cep: r.cep ?? r.zip ?? r.postal_code ?? "",
      address_line1: r.address_line1 ?? r.address1 ?? r.address ?? "",
      address_line2: r.address_line2 ?? r.address2 ?? "",
      district: r.district ?? r.bairro ?? "",
      city: r.city ?? "",
      state: r.state ?? r.uf ?? "",
      planId: r.plan_id ?? r.planId ?? "",
      planName: r.plan_name ?? r.planName ?? "",
      typeId: r.type_id ?? r.typeId ?? "",
      typeKey: r.type_key ?? r.typeKey ?? "",
      typeName: r.type_name ?? r.typeName ?? "",
      status: (r.status ?? "inactive") as ClientStatus,
      hasAppointments: r.has_appointments ?? r.hasAppointments ?? false,
      createdAt: r.created_at ?? r.createdAt ?? "",
    };
  }

  /* =========================================================
     UI
  ========================================================= */
  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1>Clientes</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              className="input pl-9"
              placeholder="Pesquisar por nome, documento, e-mail ou tipo..."
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
            Adicionar novo cliente
          </ActionBtn>
        </div>
      </div>

      {globalError && (
        <div className="card p-3 text-sm text-red-600 border border-red-500/40 bg-red-500/5">
          {globalError}
        </div>
      )}
      {globalInfo && (
        <div className="card p-3 text-sm text-green-600 border border-green-500/40 bg-green-500/5">
          {globalInfo}
        </div>
      )}

      {/* Mobile: Cards */}
      <div className="grid gap-3 sm:hidden">
        {loading && (
          <div className="card p-4 text-sm text-mutedForeground">
            Carregando…
          </div>
        )}
        {!loading &&
          filtered.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-base break-words">
                    {c.name}
                  </div>
                  <div className="text-mutedForeground text-sm break-all">
                    {c.email || "-"}
                  </div>
                  <div className="mt-2 text-sm space-y-0.5">
                    <div>
                      <span className="text-mutedForeground">Tipo:</span>{" "}
                      {c.typeName || "-"}
                    </div>
                    <div>
                      <span className="text-mutedForeground">Doc:</span>{" "}
                      {c.cpfCnpj || "-"}
                    </div>
                    <div>
                      <span className="text-mutedForeground">Tel:</span>{" "}
                      {c.phone || "-"}
                    </div>
                    <div>
                      <span className="text-mutedForeground">Plano:</span>{" "}
                      {c.planName || "-"}
                    </div>
                  </div>
                </div>
                {badgeStatus(c.status)}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <ActionBtn
                  onClick={() => handleView(c)}
                  title="Visualizar"
                  disabled={busyId === c.id}
                >
                  <Eye className="w-4 h-4" /> Ver
                </ActionBtn>
                <ActionBtn
                  onClick={() => handleEdit(c)}
                  title="Editar"
                  disabled={busyId === c.id}
                >
                  <Pencil className="w-4 h-4" /> Editar
                </ActionBtn>
                <ActionBtn
                  onClick={() => toggleActive(c)}
                  title={c.status === "active" ? "Desativar" : "Ativar"}
                  disabled={busyId === c.id}
                >
                  <Power className="w-4 h-4" />
                  {c.status === "active" ? "Desativar" : "Ativar"}
                </ActionBtn>
                <ActionBtn
                  variant="warn"
                  onClick={() => toggleBlocked(c)}
                  title={c.status === "blocked" ? "Desbloquear" : "Bloquear"}
                  disabled={busyId === c.id}
                >
                  <Ban className="w-4 h-4" />
                  {c.status === "blocked" ? "Desbloquear" : "Bloquear"}
                </ActionBtn>
                <ActionBtn
                  variant="danger"
                  onClick={() => handleDelete(c)}
                  disabled={busyId === c.id}
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </ActionBtn>
              </div>
            </div>
          ))}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-mutedForeground py-6 card">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      {/* Desktop: Tabela */}
      <div className="card overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/70">
              <tr className="[&>th]:text-left [&>th]:px-4 [&>th]:py-3">
                <th>Cliente</th>
                <th>Tipo</th>
                <th>CPF/CNPJ</th>
                <th>Telefone</th>
                <th>Plano</th>
                <th>Status</th>
                <th className="text-right pr-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-mutedForeground"
                  >
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-mutedForeground">
                        {c.email || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.typeName || "-"}</td>
                    <td className="px-4 py-3">{c.cpfCnpj || "-"}</td>
                    <td className="px-4 py-3">{c.phone || "-"}</td>
                    <td className="px-4 py-3">{c.planName || "-"}</td>
                    <td className="px-4 py-3">{badgeStatus(c.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <ActionBtn
                          onClick={() => handleView(c)}
                          title="Visualizar"
                          disabled={busyId === c.id}
                        >
                          <Eye className="w-4 h-4" /> Ver
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => handleEdit(c)}
                          title="Editar"
                          disabled={busyId === c.id}
                        >
                          <Pencil className="w-4 h-4" /> Editar
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => toggleActive(c)}
                          title={c.status === "active" ? "Desativar" : "Ativar"}
                          disabled={busyId === c.id}
                        >
                          <Power className="w-4 h-4" />
                          {c.status === "active" ? "Desativar" : "Ativar"}
                        </ActionBtn>
                        <ActionBtn
                          variant="warn"
                          onClick={() => toggleBlocked(c)}
                          title={
                            c.status === "blocked" ? "Desbloquear" : "Bloquear"
                          }
                          disabled={busyId === c.id}
                        >
                          <Ban className="w-4 h-4" />
                          {c.status === "blocked" ? "Desbloquear" : "Bloquear"}
                        </ActionBtn>
                        <ActionBtn
                          variant="danger"
                          onClick={() => handleDelete(c)}
                          disabled={busyId === c.id}
                          title="Excluir"
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
                    colSpan={7}
                    className="px-4 py-6 text-center text-mutedForeground"
                  >
                    Nenhum cliente encontrado.
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
        title={editing ? "Editar cliente" : "Novo cliente"}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nome *</label>
            <input
              className="input"
              value={form.name || ""}
              onChange={(e) => setField("name", e.target.value)}
            />
            {errors.name && (
              <small className="text-red-600">{errors.name}</small>
            )}
          </div>

          <div>
            <label className="label">E-mail (contato / admin)</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={form.email || ""}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="contato@cliente.com"
              />
              {/* Copia rápida (útil quando gerar convite) */}
              <button
                type="button"
                className="rounded-md border border-border px-3 text-sm hover:bg-muted"
                onClick={() =>
                  form.email && navigator.clipboard.writeText(form.email)
                }
              >
                <Clipboard className="h-4 w-4" />
              </button>
            </div>
            {errors.email && (
              <small className="text-red-600">{errors.email}</small>
            )}
            <small className="text-mutedForeground block mt-1">
              Este e-mail será usado para o <b>usuário administrador</b>.
            </small>
          </div>

          <div>
            <label className="label">CPF/CNPJ *</label>
            <input
              className="input"
              value={form.cpfCnpj || ""}
              onChange={(e) =>
                setField("cpfCnpj", formatCpfCnpj(e.target.value))
              }
            />
            {errors.cpfCnpj && (
              <small className="text-red-600">{errors.cpfCnpj}</small>
            )}
          </div>

          <div>
            <label className="label">Telefone</label>
            <input
              className="input"
              value={form.phone || ""}
              onChange={(e) => setField("phone", formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="label">CEP</label>
            <input
              className="input"
              value={form.cep || ""}
              onChange={(e) => setField("cep", formatCEP(e.target.value))}
              onBlur={onBlurCEP}
              placeholder="00000-000"
            />
            {errors.cep && <small className="text-red-600">{errors.cep}</small>}
          </div>

          <div>
            <label className="label">Endereço</label>
            <input
              className="input"
              value={form.address_line1 || ""}
              onChange={(e) => setField("address_line1", e.target.value)}
              placeholder="Rua/Av, número"
            />
          </div>

          <div>
            <label className="label">Complemento</label>
            <input
              className="input"
              value={form.address_line2 || ""}
              onChange={(e) => setField("address_line2", e.target.value)}
              placeholder="Apto, sala, etc."
            />
          </div>

          <div>
            <label className="label">Bairro</label>
            <input
              className="input"
              value={form.district || ""}
              onChange={(e) => setField("district", e.target.value)}
            />
          </div>

          <div>
            <label className="label">Cidade</label>
            <input
              className="input"
              value={form.city || ""}
              onChange={(e) => setField("city", e.target.value)}
            />
          </div>

          <div>
            <label className="label">UF</label>
            <input
              className="input"
              value={form.state || ""}
              onChange={(e) =>
                setField("state", e.target.value.toUpperCase().slice(0, 2))
              }
              placeholder="CE"
            />
          </div>

          <div>
            <label className="label">Plano *</label>
            <select
              className="input"
              value={form.planId || ""}
              onChange={(e) => {
                const p = plans.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, planId: p?.id, planName: p?.name }));
              }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.planId && (
              <small className="text-red-600">{errors.planId}</small>
            )}
          </div>

          <div>
            <label className="label">Tipo de cliente *</label>
            <select
              className="input"
              value={form.typeId || ""}
              onChange={(e) => {
                const t = types.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, typeId: t?.id, typeName: t?.name }));
              }}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.typeId && (
              <small className="text-red-600">{errors.typeId}</small>
            )}
          </div>

          {/* Bloco: Usuário admin */}
          {!editing && (
            <div className="md:col-span-2 space-y-2">
              <div className="label">Usuário administrador do tenant</div>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inviteMode"
                    checked={inviteMode === "invite"}
                    onChange={() => setInviteMode("invite")}
                  />
                  <span>Enviar convite</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inviteMode"
                    checked={inviteMode === "direct"}
                    onChange={() => setInviteMode("direct")}
                  />
                  <span>Vincular usuário existente</span>
                </label>

                <div className="inline-flex items-center gap-2">
                  <span className="text-sm text-mutedForeground">Papel:</span>
                  <select
                    className="input"
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as any)}
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <small className="text-mutedForeground block">
                • <b>Convite</b>: cria um token; o envio do e-mail é tarefa da
                Edge Function. <br />• <b>Vincular</b>: associa um usuário que{" "}
                <i>já exista</i> com este e-mail no Auth.
              </small>
            </div>
          )}
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
            {editing ? "Salvar alterações" : "Criar cliente"}
          </ActionBtn>
        </div>
      </Modal>

      {/* Modal de visualização */}
      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Detalhes do cliente"
      >
        {viewClient ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome" value={viewClient.name} />
              <Field label="E-mail" value={viewClient.email || "-"} />
              <Field label="Tipo" value={viewClient.typeName || "-"} />
              <Field label="Documento" value={viewClient.cpfCnpj || "-"} />
              <Field label="Telefone" value={viewClient.phone || "-"} />
              <Field label="Plano" value={viewClient.planName || "-"} />
              <Field label="Status" value={statusLabel(viewClient.status)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="CEP" value={viewClient.cep || "-"} />
              <Field label="UF" value={viewClient.state || "-"} />
              <Field
                label="Endereço"
                value={
                  [viewClient.address_line1, viewClient.address_line2]
                    .filter(Boolean)
                    .join(", ") || "-"
                }
              />
              <Field
                label="Bairro/Cidade"
                value={
                  [viewClient.district, viewClient.city]
                    .filter(Boolean)
                    .join(" / ") || "-"
                }
              />
            </div>
          </div>
        ) : (
          <div className="text-mutedForeground">Carregando…</div>
        )}
      </Modal>
    </div>
  );
}

/* =========================================================
   Pequenos componentes
========================================================= */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-mutedForeground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
function statusLabel(s: ClientStatus) {
  return s === "active" ? "Ativo" : s === "inactive" ? "Inativo" : "Bloqueado";
}
