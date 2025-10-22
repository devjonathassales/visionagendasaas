// src/pages/app/Insurances.tsx
import { useActiveOrg } from "@/hooks/useMyOrgs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, X, Trash2, Pencil } from "lucide-react";

type Insurance = {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  min_days_between: number;
  max_days_between: number;
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

export default function InsurancesPage() {
  const { activeOrgId } = useActiveOrg();
  const [rows, setRows] = useState<Insurance[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Insurance | null>(null);

  const [name, setName] = useState("");
  const [minDays, setMinDays] = useState("0");
  const [maxDays, setMaxDays] = useState("0");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  async function ensureDefault() {
    if (!activeOrgId) return;
    await supabase.rpc("app_insurance_ensure_default", {
      p_org_id: activeOrgId,
    });
  }
  async function load() {
    if (!activeOrgId) return;
    await ensureDefault();
    const { data, error } = await supabase.rpc("app_insurances_list", {
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
    setMinDays("0");
    setMaxDays("0");
    setIsDefault(false);
    setIsActive(true);
    setOpen(true);
  }
  function openEdit(r: Insurance) {
    setEdit(r);
    setName(r.name);
    setMinDays(String(r.min_days_between));
    setMaxDays(String(r.max_days_between));
    setIsDefault(r.is_default);
    setIsActive(r.is_active);
    setOpen(true);
  }

  async function submit() {
    if (!activeOrgId || !name.trim()) return;
    const { error } = await supabase.rpc("app_insurance_upsert", {
      p_org_id: activeOrgId,
      p_id: edit?.id || null,
      p_name: name.trim(),
      p_min_days: parseInt(minDays || "0", 10),
      p_max_days: parseInt(maxDays || "0", 10),
      p_is_default: isDefault,
      p_is_active: isActive,
    } as any);
    if (error) {
      alert(error.message);
      return;
    }
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Convênios</h1>
        <button
          onClick={openNew}
          className="rounded-md border px-3 py-2 text-sm inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div key={r.id} className="card p-4 flex flex-col gap-2">
            <div className="font-medium">
              {r.name}{" "}
              {r.is_default && <span className="badge bg-muted">Padrão</span>}
            </div>
            <div className="text-xs text-mutedForeground">
              Mín: {r.min_days_between}d • Máx: {r.max_days_between}d
            </div>
            <div className="mt-2 flex gap-2 justify-end">
              <button
                onClick={() => openEdit(r)}
                className="rounded-md border px-3 py-1 text-sm inline-flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" /> Editar
              </button>
              {!r.is_default && (
                <button
                  onClick={() =>
                    alert(
                      "Use 'Editar' para desativar/remover. (Remoção direta opcional)"
                    )
                  }
                  className="rounded-md border px-3 py-1 text-sm inline-flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? "Editar convênio" : "Novo convênio"}
      >
        <label className="label">Nome *</label>
        <input
          className="input w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="label">Mín. dias</label>
            <input
              className="input w-full"
              value={minDays}
              onChange={(e) =>
                /^\d*$/.test(e.target.value) && setMinDays(e.target.value)
              }
            />
          </div>
          <div>
            <label className="label">Máx. dias</label>
            <input
              className="input w-full"
              value={maxDays}
              onChange={(e) =>
                /^\d*$/.test(e.target.value) && setMaxDays(e.target.value)
              }
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span>Definir como padrão (Particular)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>Ativo</span>
          </label>
        </div>
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
    </div>
  );
}
