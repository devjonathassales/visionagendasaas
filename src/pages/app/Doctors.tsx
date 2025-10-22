// src/pages/app/Doctors.tsx
import { useActiveOrg } from "@/hooks/useMyOrgs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, X, Trash2, Pencil, Eye } from "lucide-react";

type Doctor = {
  id: string;
  name: string;
  specialty?: string | null;
  color?: string | null;
  is_active: boolean;
};

function Modal({ open, onClose, title, children }: any) {
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

export default function DoctorsPage() {
  const { activeOrgId } = useActiveOrg();
  const [rows, setRows] = useState<Doctor[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Doctor | null>(null);
  const [edit, setEdit] = useState<Doctor | null>(null);
  const [name, setName] = useState("");
  const [spec, setSpec] = useState("");
  const [color, setColor] = useState("#0ea5e9");

  async function load() {
    if (!activeOrgId) return;
    const { data, error } = await supabase.rpc("app_doctors_list", {
      p_org_id: activeOrgId,
    });
    if (!error) setRows(data || []);
  }
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [activeOrgId]);

  function openNew() {
    setEdit(null);
    setName("");
    setSpec("");
    setColor("#0ea5e9");
    setOpen(true);
  }
  function openEdit(d: Doctor) {
    setEdit(d);
    setName(d.name);
    setSpec(d.specialty || "");
    setColor(d.color || "#0ea5e9");
    setOpen(true);
  }

  async function submit() {
    if (!activeOrgId || !name.trim()) return;
    const { error } = await supabase.rpc("app_doctor_upsert", {
      p_org_id: activeOrgId,
      p_id: edit?.id || null,
      p_name: name.trim(),
      p_specialty: spec || null,
      p_color: color || "#0ea5e9",
      p_is_active: true,
    } as any);
    if (error) {
      alert(error.message);
      return;
    }
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!activeOrgId) return;
    if (!confirm("Excluir médico?")) return;
    const { error } = await supabase.rpc("app_doctor_delete", {
      p_org_id: activeOrgId,
      p_id: id,
    });
    if (error) {
      alert(error.message);
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Médicos</h1>
        <button
          onClick={openNew}
          className="rounded-md border px-3 py-2 text-sm inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((d) => (
          <div key={d.id} className="card p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ background: d.color || "#0ea5e9" }}
              />
              <div className="font-medium">{d.name}</div>
            </div>
            <div className="text-sm text-mutedForeground">
              {d.specialty || "—"}
            </div>
            <div className="mt-2 flex gap-2 justify-end">
              <button
                onClick={() => setView(d)}
                className="rounded-md border px-3 py-1 text-sm inline-flex items-center gap-2"
              >
                <Eye className="h-4 w-4" /> Ver
              </button>
              <button
                onClick={() => openEdit(d)}
                className="rounded-md border px-3 py-1 text-sm inline-flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button
                onClick={() => remove(d.id)}
                className="rounded-md border px-3 py-1 text-sm inline-flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Editar médico" : "Novo médico"}
      >
        <label className="label">Nome *</label>
        <input
          className="input w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="label mt-3">Especialidade</label>
        <input
          className="input w-full"
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
        />
        <label className="label mt-3">Cor</label>
        <input
          type="color"
          className="input w-28 p-1"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Salvar
          </button>
        </div>
      </Modal>

      <Modal
        open={!!view}
        onClose={() => setView(null)}
        title="Detalhes do médico"
      >
        {view && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ background: view.color || "#0ea5e9" }}
              />
              <b>{view.name}</b>
            </div>
            <div>Especialidade: {view.specialty || "—"}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
