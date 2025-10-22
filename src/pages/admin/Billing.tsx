import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Receipt,
  CheckCircle2,
  CalendarClock,
  Eye,
  Pencil,
  Trash2,
  Undo2,
  FileText,
  X,
} from "lucide-react";

/* ===========================
   Tipos
=========================== */
type BillingStatus = "draft" | "open" | "paid" | "canceled" | "overdue";
type PaymentMethod = "manual" | "cash" | "pix" | "card" | "boleto";

type Invoice = {
  id: string;
  org_id: string;
  number: string | null;
  status: BillingStatus;
  currency: string;
  amount_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  fee_cents: number;
  due_at: string | null;
  issued_at: string;
  paid_at: string | null;
  created_at: string;
};

type ClientOpt = { id: string; name: string; plan_id?: string | null };
type Plan = { id: string; name: string; price_cents: number; status?: string };

function BRL(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((n || 0) / 100);
}
function parseBRLToCents(v: string): number {
  const clean = v
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(clean);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

/* ===========================
   Botão utilitário
=========================== */
function Btn({ children, onClick, variant = "base", disabled, title }: any) {
  const map: Record<string, string> = {
    base: "border border-border hover:bg-muted",
    primary:
      "bg-accent text-accent-foreground hover:opacity-90 border border-transparent",
    danger: "border border-red-700 bg-red-600 text-white hover:opacity-90",
    warn: "border border-yellow-600/40 bg-yellow-500/90 text-black hover:opacity-90",
    muted: "border border-border bg-card hover:bg-muted",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${map[variant]}`}
    >
      {children}
    </button>
  );
}

/* ===========================
   Modal genérico (scroll)
=========================== */
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
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative card w-full sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Btn onClick={onClose} variant="muted" title="Fechar">
            <X className="h-4 w-4" /> Fechar
          </Btn>
        </div>
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

/* ===========================
   Página
=========================== */
export default function AdminBillingPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<BillingStatus | "">("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // modais
  const [openNew, setOpenNew] = useState(false);
  const [openView, setOpenView] = useState<Invoice | null>(null);
  const [openEdit, setOpenEdit] = useState<Invoice | null>(null);
  const [openPay, setOpenPay] = useState<Invoice | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.rpc("admin_invoices_list", {
        p_q: q || null,
        p_status: status || null,
        p_org_id: null,
      });
      if (error) throw error;
      setRows((data || []) as Invoice[]);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erro ao carregar cobranças");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); // eslint-disable-next-line
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    const start = from ? new Date(from + "T00:00:00") : null;
    const end = to ? new Date(to + "T23:59:59") : null;
    if (start || end) {
      list = list.filter((i) => {
        const base = i.due_at ? new Date(i.due_at) : new Date(i.issued_at);
        if (start && base < start) return false;
        if (end && base > end) return false;
        return true;
      });
    }
    return list;
  }, [rows, from, to]);

  function StatusBadge({ s }: { s: BillingStatus }) {
    const map: Record<BillingStatus, string> = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
      open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      canceled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      overdue:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    };
    const label: Record<BillingStatus, string> = {
      draft: "Rascunho",
      open: "Em aberto",
      paid: "Paga",
      canceled: "Cancelada",
      overdue: "Vencida",
    };
    return <span className={`badge ${map[s]}`}>{label[s]}</span>;
  }

  /* ========= Ações ========= */

  async function actionOpen(inv: Invoice) {
    try {
      setErrorMsg(null);
      const { data, error } = await supabase.rpc("admin_invoice_open", {
        p_invoice_id: inv.id,
      });
      if (error) throw error;
      await load();
      setInfoMsg(`Fatura ${data?.number || ""} aberta.`);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erro ao abrir fatura");
    }
  }

  async function actionDelete(inv: Invoice) {
    if (inv.status !== "open" && inv.status !== "draft") return;
    if (!confirm(`Excluir fatura ${inv.number || inv.id}?`)) return;
    try {
      setErrorMsg(null);
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", inv.id);
      if (error) throw error;
      await load();
      setInfoMsg("Fatura excluída.");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erro ao excluir fatura");
    }
  }

  async function actionRefund(inv: Invoice) {
    if (inv.status !== "paid") return;
    if (!confirm(`Estornar pagamento da fatura ${inv.number || inv.id}?`))
      return;
    try {
      setErrorMsg(null);
      const { error } = await supabase.rpc("admin_payment_create", {
        p_invoice_id: inv.id,
        p_amount_cents: -Math.abs(inv.amount_cents),
        p_method: "manual",
        p_reference: "refund-full",
      });
      if (error) throw error;
      await load();
      setInfoMsg("Estorno registrado. Fatura reaberta.");
    } catch (e: any) {
      setErrorMsg(e?.message || "Erro ao estornar");
    }
  }

  /* ========= Modal: NOVA CONTA ========= */

  function NewInvoiceModal() {
    const [clients, setClients] = useState<ClientOpt[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [orgId, setOrgId] = useState<string>("");
    const [planId, setPlanId] = useState<string>("");
    const [dueAt, setDueAt] = useState<string>("");
    const [discount, setDiscount] = useState<string>("0,00");
    const [fee, setFee] = useState<string>("0,00");
    const [busy, setBusy] = useState(false);

    // carrega clientes e planos
    useEffect(() => {
      (async () => {
        // Clientes: tenta RPC admin_clients_list (com poucos campos), senão SELECT direto
        let clis: ClientOpt[] = [];
        try {
          const { data, error } = await supabase.rpc("admin_clients_list", {});
          if (!error && Array.isArray(data)) {
            clis = data.map((r: any) => ({
              id: r.id,
              name: r.name,
              plan_id: r.plan_id ?? null,
            }));
          } else {
            const { data: d2, error: e2 } = await supabase
              .from("orgs")
              .select("id,name,plan_id")
              .order("name");
            if (e2) throw e2;
            clis = (d2 || []).map((r: any) => ({
              id: r.id,
              name: r.name,
              plan_id: r.plan_id ?? null,
            }));
          }
        } catch {
          // silencioso
        }
        setClients(clis);

        // Planos: ativos
        try {
          const { data, error } = await supabase
            .from("plans")
            .select("id,name,price_cents,status")
            .eq("status", "active")
            .order("price_cents", { ascending: true });
          if (!error) setPlans((data || []) as any);
        } catch {
          // silencioso
        }
      })();
    }, []);

    const selectedPlan = plans.find((p) => p.id === planId) || null;
    const subtotal = selectedPlan?.price_cents || 0;
    const total = subtotal - parseBRLToCents(discount) + parseBRLToCents(fee);

    async function createInvoice() {
      if (!orgId) return alert("Selecione um cliente (org).");
      if (!planId) return alert("Selecione um plano.");

      setBusy(true);
      setErrorMsg(null);
      try {
        // 1) Tenta RPC dedicada (mais simples no backend)
        const try1 = await supabase.rpc("admin_invoice_create_from_plan", {
          p_org_id: orgId,
          p_plan_id: planId,
          p_due_at: dueAt ? new Date(dueAt).toISOString() : null,
          p_discount_cents: parseBRLToCents(discount),
          p_fee_cents: parseBRLToCents(fee),
        });

        if (!try1.error && try1.data) {
          setOpenNew(false);
          await load();
          setInfoMsg(`Fatura criada (ID: ${try1.data?.id}).`);
          return;
        }

        // 2) Fallback: usa admin_invoice_create com um item baseado no plano
        const payload = {
          p_org_id: orgId,
          p_due_at: dueAt ? new Date(dueAt).toISOString() : null,
          p_discount_cents: parseBRLToCents(discount),
          p_fee_cents: parseBRLToCents(fee),
          p_items: [
            {
              description: selectedPlan?.name || "Plano",
              quantity: 1,
              unit_cents: selectedPlan?.price_cents || 0,
            },
          ],
        };

        const { data, error } = await supabase.rpc(
          "admin_invoice_create",
          payload as any
        );
        if (error) throw error;

        setOpenNew(false);
        await load();
        setInfoMsg(`Fatura criada (ID: ${data?.id}).`);
      } catch (e: any) {
        setErrorMsg(e?.message || "Erro ao criar fatura");
      } finally {
        setBusy(false);
      }
    }

    return (
      <Modal
        open={openNew}
        onClose={() => setOpenNew(false)}
        title="Nova conta"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Cliente (Org) *</label>
            <select
              className="input"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Plano *</label>
            <select
              className="input"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {BRL(p.price_cents)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Vencimento</label>
            <input
              type="date"
              className="input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Desconto</label>
            <input
              className="input"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="label">Taxa</label>
            <input
              className="input"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="mt-4 text-sm">
          <div>
            Subtotal (Plano): <b>{BRL(subtotal)}</b>
          </div>
          <div>
            Desconto: <b>- {BRL(parseBRLToCents(discount))}</b>
          </div>
          <div>
            Taxa: <b>{BRL(parseBRLToCents(fee))}</b>
          </div>
          <div className="text-base mt-1">
            Total: <b>{BRL(total)}</b>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <Btn
            variant="muted"
            onClick={() => setOpenNew(false)}
            disabled={busy}
          >
            Cancelar
          </Btn>
          <Btn
            variant="primary"
            onClick={createInvoice}
            disabled={busy || !orgId || !planId}
          >
            <Plus className="h-4 w-4" /> Criar
          </Btn>
        </div>
      </Modal>
    );
  }

  /* ========= VISUALIZAR ========= */
  function ViewModal() {
    const inv = openView!;
    return (
      <Modal
        open={!!openView}
        onClose={() => setOpenView(null)}
        title={`Fatura ${inv?.number || inv?.id}`}
      >
        {inv ? (
          <div className="space-y-2 text-sm">
            <div>
              <b>Status:</b> <StatusBadge s={inv.status} />
            </div>
            <div>
              <b>Valor:</b> {BRL(inv.amount_cents)}
            </div>
            <div>
              <b>Subtotal:</b> {BRL(inv.subtotal_cents)}
            </div>
            <div>
              <b>Desconto:</b> {BRL(inv.discount_cents)}
            </div>
            <div>
              <b>Taxa:</b> {BRL(inv.fee_cents)}
            </div>
            <div>
              <b>Vencimento:</b>{" "}
              {inv.due_at ? new Date(inv.due_at).toLocaleString() : "—"}
            </div>
            <div>
              <b>Emitida:</b> {new Date(inv.issued_at).toLocaleString()}
            </div>
            <div>
              <b>Pago em:</b>{" "}
              {inv.paid_at ? new Date(inv.paid_at).toLocaleString() : "—"}
            </div>
          </div>
        ) : (
          <div className="text-mutedForeground">Carregando…</div>
        )}
      </Modal>
    );
  }

  /* ========= EDITAR ========= */
  function EditModal() {
    const inv = openEdit!;
    const [dueAt, setDueAt] = useState<string>(
      inv?.due_at ? inv.due_at.slice(0, 10) : ""
    );
    const [discount, setDiscount] = useState<string>(
      (inv.discount_cents / 100).toFixed(2).replace(".", ",")
    );
    const [fee, setFee] = useState<string>(
      (inv.fee_cents / 100).toFixed(2).replace(".", ",")
    );
    const [busy, setBusy] = useState(false);

    const subtotal = inv?.subtotal_cents || 0;
    const total = subtotal - parseBRLToCents(discount) + parseBRLToCents(fee);

    async function save() {
      if (inv?.status !== "open") return;
      setBusy(true);
      setErrorMsg(null);
      try {
        const { error: e1 } = await supabase
          .from("invoices")
          .update({
            due_at: dueAt ? new Date(dueAt).toISOString() : null,
            discount_cents: parseBRLToCents(discount),
            fee_cents: parseBRLToCents(fee),
          })
          .eq("id", inv.id);
        if (e1) throw e1;

        await supabase.rpc("invoice_recalc", { p_invoice_id: inv.id });
        await load();
        setOpenEdit(null);
        setInfoMsg("Fatura atualizada.");
      } catch (e: any) {
        setErrorMsg(e?.message || "Erro ao salvar edição");
      } finally {
        setBusy(false);
      }
    }

    return (
      <Modal
        open={!!openEdit}
        onClose={() => setOpenEdit(null)}
        title={`Editar fatura ${inv?.number || inv?.id}`}
      >
        {inv?.status !== "open" ? (
          <div className="text-red-600 text-sm">
            Somente faturas em <b>aberto</b> podem ser editadas.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="label">Vencimento</label>
                <input
                  type="date"
                  className="input"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Desconto</label>
                <input
                  className="input"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Taxa</label>
                <input
                  className="input"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 text-sm">
              <div>
                Subtotal: <b>{BRL(subtotal)}</b>
              </div>
              <div>
                Desconto: <b>- {BRL(parseBRLToCents(discount))}</b>
              </div>
              <div>
                Taxa: <b>{BRL(parseBRLToCents(fee))}</b>
              </div>
              <div className="text-base mt-1">
                Total: <b>{BRL(total)}</b>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
              <Btn
                variant="muted"
                onClick={() => setOpenEdit(null)}
                disabled={busy}
              >
                Cancelar
              </Btn>
              <Btn variant="primary" onClick={save} disabled={busy}>
                <Pencil className="h-4 w-4" /> Salvar
              </Btn>
            </div>
          </>
        )}
      </Modal>
    );
  }

  /* ========= REGISTRAR PAGAMENTO ========= */
  function PayModal() {
    const inv = openPay!;
    const [amount, setAmount] = useState<string>(
      ((inv?.amount_cents || 0) / 100).toFixed(2).replace(".", ",")
    );
    const [method, setMethod] = useState<PaymentMethod>("cash");
    const [reference, setReference] = useState<string>("");
    const [busy, setBusy] = useState(false);

    async function submit() {
      setBusy(true);
      setErrorMsg(null);
      try {
        const { error } = await supabase.rpc("admin_payment_create", {
          p_invoice_id: inv.id,
          p_amount_cents: parseBRLToCents(amount),
          p_method: method,
          p_reference: reference || null,
        });
        if (error) throw error;
        await load();
        setOpenPay(null);
        setInfoMsg("Pagamento registrado.");
      } catch (e: any) {
        setErrorMsg(e?.message || "Erro ao registrar pagamento");
      } finally {
        setBusy(false);
      }
    }

    return (
      <Modal
        open={!!openPay}
        onClose={() => setOpenPay(null)}
        title={`Registrar pagamento — ${inv?.number || inv?.id}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Valor</label>
            <input
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Método</label>
            <select
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              <option value="cash">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="card">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className="label">Referência</label>
            <input
              className="input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="txid / nsu / código"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <Btn variant="muted" onClick={() => setOpenPay(null)} disabled={busy}>
            Cancelar
          </Btn>
          <Btn variant="primary" onClick={submit} disabled={busy}>
            <CheckCircle2 className="h-4 w-4" /> Lançar
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="flex items-center gap-2">
          <Receipt className="h-5 w-5" /> Cobranças
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full md:w-auto">
          <input
            className="input w-full sm:w-56"
            placeholder="Buscar nº/cliente..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="">Todos status</option>
            <option value="draft">Rascunho</option>
            <option value="open">Em aberto</option>
            <option value="overdue">Vencida</option>
            <option value="paid">Paga</option>
            <option value="canceled">Cancelada</option>
          </select>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Btn onClick={load} variant="muted">
            Filtrar
          </Btn>
          <Btn onClick={() => setOpenNew(true)} variant="primary">
            <Plus className="h-4 w-4" /> Nova conta
          </Btn>
        </div>
      </div>

      {errorMsg && (
        <div className="card p-3 text-sm text-red-600 border border-red-500/40 bg-red-500/5">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="card p-3 text-sm text-green-600 border border-green-500/40 bg-green-500/5">
          {infoMsg}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/70">
              <tr className="[&>th]:text-left [&>th]:px-4 [&>th]:py-3">
                <th>Nº</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Emitida</th>
                <th>Pagamento</th>
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
                filtered.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{i.number || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge s={i.status} />
                    </td>
                    <td className="px-4 py-3">{BRL(i.amount_cents)}</td>
                    <td className="px-4 py-3">
                      {i.due_at ? new Date(i.due_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(i.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {i.paid_at ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />{" "}
                          {new Date(i.paid_at).toLocaleDateString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Btn onClick={() => setOpenView(i)}>
                          <Eye className="h-4 w-4" /> Ver
                        </Btn>

                        {i.status === "draft" && (
                          <Btn onClick={() => actionOpen(i)}>
                            <FileText className="h-4 w-4" /> Abrir
                          </Btn>
                        )}

                        {i.status === "open" && (
                          <>
                            <Btn onClick={() => setOpenEdit(i)}>
                              <Pencil className="h-4 w-4" /> Editar
                            </Btn>
                            <Btn onClick={() => setOpenPay(i)}>
                              {/* ícone de “receber” → Banknote poderia ser usado também */}
                              <CheckCircle2 className="h-4 w-4" /> Receber
                            </Btn>
                            <Btn
                              variant="danger"
                              onClick={() => actionDelete(i)}
                            >
                              <Trash2 className="h-4 w-4" /> Excluir
                            </Btn>
                          </>
                        )}

                        {i.status === "paid" && (
                          <Btn variant="warn" onClick={() => actionRefund(i)}>
                            <Undo2 className="h-4 w-4" /> Estornar
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && !filtered.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-mutedForeground"
                  >
                    Nenhuma cobrança.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-mutedForeground flex items-center gap-2">
        <CalendarClock className="h-4 w-4" /> Em breve: integração de gateway
        (boletos, PIX, cartão) e webhooks.
      </div>

      {/* Modais */}
      {openNew && <NewInvoiceModal />}
      {openView && <ViewModal />}
      {openEdit && <EditModal />}
      {openPay && <PayModal />}
    </div>
  );
}
