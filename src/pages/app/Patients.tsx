import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useMyOrgs } from "@/hooks/useMyOrgs";
import { X, Pencil, Eye, Trash2, Search } from "lucide-react";

type Patient = {
  id: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
};

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
      <div className="relative card w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md border px-3 py-1 text-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const { activeOrgId } = useMyOrgs();

  const [list, setList] = useState<Patient[]>([]);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // BUSCA (novidade)
  const [q, setQ] = useState("");
  const showSearch = q.trim().length >= 3;

  // modal/edição
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [current, setCurrent] = useState<Patient | null>(null);
  const [editName, setEditName] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const count = useMemo(() => list.length, [list]);

  async function load() {
    if (!activeOrgId) return;
    const { data, error } = await supabase
      .from("patients")
      .select("id,name,cpf,phone")
      .eq("org_id", activeOrgId)
      .order("name", { ascending: true });

    if (!error) setList((data || []) as Patient[]);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    const nm = name.trim();
    if (!nm) return;

    setLoading(true);
    try {
      const payload = {
        org_id: activeOrgId,
        name: nm,
        cpf: cpf.trim() || null,
        phone: phone.trim() || null,
      };

      const { error } = await supabase.from("patients").insert(payload);
      if (error) throw error;

      setName("");
      setCpf("");
      setPhone("");
      await load();
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar paciente");
    } finally {
      setLoading(false);
    }
  }

  // abrir visualizar
  function openView(p: Patient) {
    setCurrent(p);
    setMode("view");
    setOpenModal(true);
  }

  // abrir editar
  function openEdit(p: Patient) {
    setCurrent(p);
    setEditName(p.name);
    setEditCpf(p.cpf || "");
    setEditPhone(p.phone || "");
    setMode("edit");
    setOpenModal(true);
  }

  // salvar edição
  async function saveEdit() {
    if (!activeOrgId || !current) return;
    const nm = editName.trim();
    if (!nm) return;

    const { error } = await supabase
      .from("patients")
      .update({
        name: nm,
        cpf: editCpf.trim() || null,
        phone: editPhone.trim() || null,
      })
      .eq("org_id", activeOrgId)
      .eq("id", current.id);

    if (error) {
      alert(error.message);
      return;
    }
    setOpenModal(false);
    await load();
  }

  // excluir
  async function removePatient(p: Patient) {
    if (!activeOrgId) return;
    const ok = confirm(`Excluir paciente "${p.name}"?`);
    if (!ok) return;

    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("org_id", activeOrgId)
      .eq("id", p.id);

    if (error) {
      alert(error.message);
      return;
    }
    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  // Lista filtrada com base na busca (3+ caracteres)
  const filtered = useMemo(() => {
    if (!showSearch) return list;
    const term = q.trim().toLowerCase();
    return list.filter((p) => {
      const n = p.name?.toLowerCase() || "";
      const c = p.cpf?.toLowerCase() || "";
      const ph = p.phone?.toLowerCase() || "";
      return n.includes(term) || c.includes(term) || ph.includes(term);
    });
  }, [list, q, showSearch]);

  return (
    <div className="space-y-6">
      <h1>Pacientes</h1>

      {/* BUSCA (nova) */}
      <div className="card p-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 opacity-70" />
          <input
            className="input w-full"
            placeholder="Buscar por nome, CPF ou telefone (mín. 3 caracteres)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              className="rounded-md border px-2 py-1 text-sm"
              onClick={() => setQ("")}
              title="Limpar"
            >
              Limpar
            </button>
          )}
        </div>
        {q.trim().length > 0 && q.trim().length < 3 && (
          <div className="mt-2 text-xs text-mutedForeground">
            Digite pelo menos 3 caracteres para pesquisar.
          </div>
        )}
      </div>

      {/* Form adicionar */}
      <form onSubmit={add} className="card p-4 grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <label className="label">Nome *</label>
          <input
            className="input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">CPF</label>
          <input
            className="input w-full"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input
            className="input w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 90000-0000"
          />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button className="btn" disabled={loading}>
            {loading ? "Salvando…" : "Adicionar"}
          </button>
        </div>
      </form>

      {/* Lista */}
      <div className="card p-4">
        <div className="text-sm text-mutedForeground mb-2">
          {filtered.length} de {count} paciente(s)
        </div>

        <div className="grid gap-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="border rounded-md px-3 py-2 text-sm flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-mutedForeground">
                  {p.cpf || "—"} • {p.phone || "—"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-md border px-3 py-1 text-sm"
                  onClick={() => openView(p)}
                  title="Visualizar"
                >
                  <Eye className="inline h-4 w-4 mr-1" />
                  Ver
                </button>
                <button
                  className="rounded-md border px-3 py-1 text-sm"
                  onClick={() => openEdit(p)}
                  title="Editar"
                >
                  <Pencil className="inline h-4 w-4 mr-1" />
                  Editar
                </button>
                <button
                  className="rounded-md border px-3 py-1 text-sm"
                  onClick={() => removePatient(p)}
                  title="Excluir"
                >
                  <Trash2 className="inline h-4 w-4 mr-1" />
                  Excluir
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-sm text-mutedForeground">
              Nenhum paciente encontrado.
            </div>
          )}
        </div>
      </div>

      {/* Modal Ver/Editar */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={mode === "view" ? "Detalhes do paciente" : "Editar paciente"}
      >
        {mode === "view" && current && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="label">Nome</div>
              <div className="font-medium">{current.name}</div>
            </div>
            <div>
              <div className="label">CPF</div>
              <div className="font-medium">{current.cpf || "—"}</div>
            </div>
            <div>
              <div className="label">Telefone</div>
              <div className="font-medium">{current.phone || "—"}</div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => {
                  if (!current) return;
                  setOpenModal(false);
                  openEdit(current);
                }}
              >
                Editar
              </button>
            </div>
          </div>
        )}

        {mode === "edit" && current && (
          <div className="space-y-3">
            <div>
              <label className="label">Nome *</label>
              <input
                className="input w-full"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">CPF</label>
              <input
                className="input w-full"
                value={editCpf}
                onChange={(e) => setEditCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                className="input w-full"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(00) 90000-0000"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-2 text-sm"
                onClick={() => setOpenModal(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded-md border px-3 py-2 text-sm"
                onClick={saveEdit}
              >
                Salvar alterações
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
