import { useMyOrgs } from "@/hooks/useMyOrgs";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  X,
  Trash2,
  CalendarDays,
  Plus,
} from "lucide-react";

type Appt = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  insurance_id: string;
  patient_name: string;
  when_at: string; // ISO (UTC) no banco
  attended: boolean | null;
  status: string;
};
type Clinic = { id: string; name: string };
type Doctor = { id: string; name: string; color?: string | null };
type Insurance = { id: string; name: string };
type Patient = { id: string; name: string };
type Holiday = { id: string; date: string; name: string };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function weekdayPt(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "short" });
}

// datetime-local helpers (sem “pular” horário)
function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}
function fromLocalInputValue(val: string) {
  return new Date(val).toISOString();
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

export default function AgendaPage() {
  const { activeOrgId } = useMyOrgs();

  const [isAdmin, setIsAdmin] = useState(false);

  const [month, setMonth] = useState(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // "view" | "edit" | "create"
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [openForm, setOpenForm] = useState(false);
  const [edit, setEdit] = useState<Appt | null>(null);

  // form (edit/create)
  const [patient, setPatient] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [insuranceId, setInsuranceId] = useState("");
  const [whenAt, setWhenAt] = useState<string>("");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");

  // modal dia
  const [openDayModal, setOpenDayModal] = useState(false);
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);

  // histórico sob demanda
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Appt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // modal feriados
  const [openHolidays, setOpenHolidays] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");

  const mStart = startOfMonth(month);
  const mEnd = endOfMonth(month);

  // papel do usuário
  useEffect(() => {
    (async () => {
      try {
        if (!activeOrgId) return setIsAdmin(false);
        const { data: u } = await supabase.auth.getUser();
        const userId = u.user?.id;
        if (!userId) return setIsAdmin(false);

        const { data, error } = await supabase
          .from("org_members")
          .select("role")
          .eq("org_id", activeOrgId)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        setIsAdmin(data?.role === "owner" || data?.role === "admin");
      } catch {
        setIsAdmin(false);
      }
    })();
  }, [activeOrgId]);

  // carrega estáticos (inclui pacientes da org)
  async function loadStatic() {
    if (!activeOrgId) return;
    const [c, d, i, p] = await Promise.all([
      supabase
        .from("clinics")
        .select("id,name")
        .eq("org_id", activeOrgId)
        .order("name"),
      supabase
        .from("doctors")
        .select("id,name,color")
        .eq("org_id", activeOrgId)
        .order("name"),
      supabase
        .from("insurances")
        .select("id,name")
        .eq("org_id", activeOrgId)
        .order("name"),
      supabase
        .from("patients")
        .select("id,name")
        .eq("org_id", activeOrgId)
        .order("name"),
    ]);
    if (!c.error) setClinics((c.data || []) as Clinic[]);
    if (!d.error) setDoctors((d.data || []) as Doctor[]);
    if (!i.error) setInsurances((i.data || []) as Insurance[]);
    if (!p.error) setPatients((p.data || []) as Patient[]);
  }

  // feriados do mês atual
  async function loadHolidays() {
    if (!activeOrgId) return;
    const { data, error } = await supabase
      .from("holidays")
      .select("id,date,name")
      .eq("org_id", activeOrgId)
      .gte("date", fmtDate(mStart))
      .lte("date", fmtDate(mEnd))
      .order("date");
    if (!error) setHolidays((data || []) as Holiday[]);
  }

  async function addHoliday() {
    if (!activeOrgId || !newHolidayDate || !newHolidayName.trim()) return;
    const { error } = await supabase.from("holidays").insert({
      org_id: activeOrgId,
      date: newHolidayDate,
      name: newHolidayName.trim(),
    });
    if (error) {
      alert(error.message);
      return;
    }
    setNewHolidayDate("");
    setNewHolidayName("");
    await loadHolidays();
  }

  async function deleteHoliday(h: Holiday) {
    if (!activeOrgId) return;
    const ok = confirm(`Remover feriado "${h.name}" de ${h.date}?`);
    if (!ok) return;
    const { error } = await supabase
      .from("holidays")
      .delete()
      .eq("org_id", activeOrgId)
      .eq("id", h.id);
    if (error) {
      alert(error.message);
      return;
    }
    await loadHolidays();
  }

  async function loadAppts() {
    if (!activeOrgId) return;
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, clinic_id, doctor_id, insurance_id, patient_name, when_at, attended, status"
      )
      .eq("org_id", activeOrgId)
      .gte("when_at", fmtDate(mStart))
      .lt("when_at", fmtDate(new Date(mEnd.getTime() + 86400000)))
      .order("when_at", { ascending: true });
    if (!error) setAppts((data || []) as Appt[]);
  }

  useEffect(() => {
    loadStatic();
  }, [activeOrgId]);

  useEffect(() => {
    loadAppts();
    loadHolidays();
  }, [activeOrgId, month]);

  const clinicName = useMemo(() => {
    const m: Record<string, string> = {};
    clinics.forEach((c) => (m[c.id] = c.name));
    return m;
  }, [clinics]);

  const doctorById = useMemo(() => {
    const m: Record<string, Doctor> = {};
    doctors.forEach((d) => (m[d.id] = d));
    return m;
  }, [doctors]);

  // set de feriados para lookup O(1)
  const holidaySet = useMemo(() => {
    const s = new Set<string>();
    holidays.forEach((h) => s.add(h.date));
    return s;
  }, [holidays]);
  const holidayNameByDate = useMemo(() => {
    const m: Record<string, string> = {};
    holidays.forEach((h) => (m[h.date] = h.name));
    return m;
  }, [holidays]);

  const byDay = useMemo(() => {
    const m: Record<string, Appt[]> = {};
    for (const a of appts) {
      const k = a.when_at.slice(0, 10);
      (m[k] ||= []).push(a);
    }
    return m;
  }, [appts]);

  function prevMonth() {
    const d = new Date(month);
    d.setMonth(d.getMonth() - 1);
    setMonth(d);
  }
  function nextMonth() {
    const d = new Date(month);
    d.setMonth(d.getMonth() + 1);
    setMonth(d);
  }

  // create
  function openNew(dayISO?: string) {
    // bloqueio imediato se o dia clicado for feriado
    if (dayISO && holidaySet.has(dayISO)) {
      alert(
        `${
          holidayNameByDate[dayISO] || "Feriado"
        } — agendamentos bloqueados para este dia.`
      );
      return;
    }
    setMode("create");
    setEdit(null);
    setPatient("");
    setClinicId(clinics[0]?.id || "");
    setDoctorId(doctors[0]?.id || "");
    setInsuranceId(
      insurances.find((x) => x.name === "Particular")?.id ||
        insurances[0]?.id ||
        ""
    );
    setWhenAt(
      dayISO ? `${dayISO}T09:00` : toLocalInputValue(new Date().toISOString())
    );
    setOverride(false);
    setReason("");
    setShowHistory(false);
    setOpenForm(true);
  }

  // view
  function openView(a: Appt) {
    setMode("view");
    setEdit(a);
    setShowHistory(false);
    setOpenForm(true);
  }

  // edit
  function openEdit(a: Appt) {
    setMode("edit");
    setEdit(a);
    setPatient(a.patient_name);
    setClinicId(a.clinic_id);
    setDoctorId(a.doctor_id);
    setInsuranceId(a.insurance_id);
    setWhenAt(toLocalInputValue(a.when_at));
    setOverride(false);
    setReason("");
    setShowHistory(false);
    setOpenForm(true);
  }

  async function loadHistoryForPatient(name: string) {
    if (!activeOrgId || !name) return setHistory([]);
    try {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, clinic_id, doctor_id, insurance_id, patient_name, when_at, attended, status"
        )
        .eq("org_id", activeOrgId)
        .eq("patient_name", name)
        .order("when_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setHistory((data || []) as Appt[]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function save() {
    if (mode === "view") return;
    if (
      !activeOrgId ||
      !patient.trim() ||
      !clinicId ||
      !doctorId ||
      !insuranceId ||
      !whenAt
    )
      return;

    const whenIso = fromLocalInputValue(whenAt);
    const dIso = whenIso.slice(0, 10);

    // BLOQUEIO DURO: se é feriado, só permite se override (admin) estiver marcado
    if (holidaySet.has(dIso) && !override) {
      alert(
        `${holidayNameByDate[dIso] || "Feriado"} — agendamentos bloqueados. ` +
          `Se necessário, marque a opção de override (admin) e informe o motivo.`
      );
      return;
    }

    const payload: any = {
      org_id: activeOrgId,
      clinic_id: clinicId,
      doctor_id: doctorId,
      insurance_id: insuranceId,
      patient_name: patient.trim(),
      when_at: whenIso,
      status: edit?.status || "scheduled",
      attended: edit?.attended ?? null,
    };
    if (edit?.id) payload.id = edit.id;
    if (override && isAdmin)
      payload.override_reason = reason || "override admin";

    const { error } = await supabase
      .from("appointments")
      .upsert(payload, { onConflict: "id" });
    if (error) {
      alert(error.message);
      return;
    }
    setOpenForm(false);
    loadAppts();
  }

  async function setAttendance(a: Appt, attended: boolean) {
    if (!activeOrgId) return;
    const { error } = await supabase
      .from("appointments")
      .update({ attended })
      .eq("org_id", activeOrgId)
      .eq("id", a.id);
    if (!error) loadAppts();
  }

  async function deleteAppt(a: Appt) {
    if (!activeOrgId) return;
    const ok = confirm(
      `Excluir agendamento de "${a.patient_name}" em ${new Date(
        a.when_at
      ).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}?`
    );
    if (!ok) return;
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("org_id", activeOrgId)
      .eq("id", a.id);
    if (error) {
      alert(error.message);
      return;
    }
    setOpenForm(false);
    setOpenDayModal(false);
    await loadAppts();
  }

  // grid de dias
  const days: Date[] = [];
  const f = startOfMonth(month);
  const l = endOfMonth(month);
  const offset = (f.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++)
    days.push(new Date(f.getTime() - (offset - i) * 86400000));
  for (let d = 1; d <= l.getDate(); d++)
    days.push(new Date(f.getFullYear(), f.getMonth(), d));
  while (days.length % 7 !== 0)
    days.push(new Date(days[days.length - 1].getTime() + 86400000));

  function openDay(iso: string) {
    setSelectedDayISO(iso);
    setOpenDayModal(true);
  }

  return (
    <div className="space-y-4">
      {/* barra do mês */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2">
          <button className="rounded-md border p-2" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="font-semibold text-center">
          {month.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
        </div>
        <div className="inline-flex items-center gap-2 justify-end">
          {/* Botão feriados */}
          <button
            onClick={() => setOpenHolidays(true)}
            className="rounded-md border px-3 py-2 text-sm inline-flex items-center gap-2"
            title="Gerenciar feriados"
          >
            <CalendarDays className="h-4 w-4" /> Feriados
          </button>
          <button className="rounded-md border p-2" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => openNew()}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Novo agendamento
          </button>
        </div>
      </div>

      {/* header dias (desktop) */}
      <div className="hidden md:grid md:grid-cols-7 md:gap-2">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((w) => (
          <div key={w} className="text-xs text-mutedForeground">
            {w}
          </div>
        ))}
      </div>

      {/* grid dias */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {days.map((d, idx) => {
          const iso = fmtDate(d);
          const items = byDay[iso] || [];
          const inMonth = d.getMonth() === month.getMonth();
          const title = `${d.getDate()} • ${weekdayPt(d)}`;
          const isHoliday = holidaySet.has(iso);
          const holidayLabel = isHoliday
            ? holidayNameByDate[iso] || "Feriado"
            : "";

          return (
            <div
              key={idx}
              className={`card p-2 min-h-[120px] ${
                inMonth ? "" : "opacity-50"
              } ${isHoliday ? "ring-1 ring-red-400/70" : ""}`}
              onClick={() => inMonth && openDay(iso)}
              role="button"
              title={isHoliday ? holidayLabel : undefined}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium md:font-semibold">
                  <span className="md:hidden">{title}</span>
                  <span className="hidden md:inline">{d.getDate()}</span>
                  {isHoliday && (
                    <span className="ml-2 rounded px-1 py-[1px] text-[10px] border border-red-300">
                      {holidayLabel}
                    </span>
                  )}
                </span>
                {inMonth && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isHoliday) {
                        alert(
                          `${holidayLabel} — agendamentos bloqueados para este dia.`
                        );
                        return;
                      }
                      openNew(iso);
                    }}
                    className={`rounded-md border px-2 py-[2px] text-[11px] inline-flex items-center gap-1 ${
                      isHoliday ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title={
                      isHoliday ? "Bloqueado por feriado" : "Novo agendamento"
                    }
                  >
                    <Plus className="h-3 w-3" /> agendar
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {items.map((a) => {
                  const doc = doctorById[a.doctor_id];
                  const color = doc?.color || "#0ea5e9";
                  return (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openView(a);
                      }}
                      className="w-full text-left rounded-md px-2 py-1 border"
                      style={{ borderColor: color }}
                      title={`${a.patient_name} • ${doc?.name || "Médico"}`}
                    >
                      <div className="text-xs font-medium">
                        {a.patient_name}
                      </div>
                      <div className="text-[11px] text-mutedForeground">
                        {new Date(a.when_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" • "}
                        {doc?.name || "Médico"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: lista do dia */}
      <Modal
        open={openDayModal}
        onClose={() => setOpenDayModal(false)}
        title={
          selectedDayISO
            ? `Agendamentos de ${new Date(selectedDayISO).toLocaleDateString(
                "pt-BR"
              )}`
            : "Agendamentos do dia"
        }
      >
        {selectedDayISO && (
          <div className="space-y-2">
            {(byDay[selectedDayISO] || [])
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.when_at).getTime() - new Date(b.when_at).getTime()
              )
              .map((a) => {
                const doc = doctorById[a.doctor_id];
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 border rounded-md px-3 py-2"
                  >
                    <div className="text-sm">
                      <div className="font-medium">{a.patient_name}</div>
                      <div className="text-xs text-mutedForeground">
                        {new Date(a.when_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" • "}
                        {doc?.name || "Médico"}
                        {" • "}
                        {clinicName[a.clinic_id] || "Clínica"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border px-3 py-1 text-sm"
                        onClick={() => {
                          setOpenDayModal(false);
                          openView(a);
                        }}
                      >
                        Abrir
                      </button>
                      <button
                        className="rounded-md border px-3 py-1 text-sm"
                        onClick={() => {
                          setOpenDayModal(false);
                          openEdit(a);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-md border px-3 py-1 text-sm"
                        onClick={() => deleteAppt(a)}
                        title="Excluir agendamento"
                      >
                        <Trash2 className="inline h-4 w-4 mr-1" />
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}

            {(byDay[selectedDayISO] || []).length === 0 && (
              <div className="text-sm text-mutedForeground">
                Sem agendamentos neste dia.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal principal: VIEW / EDIT / CREATE */}
      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={
          mode === "view"
            ? "Ver agendamento"
            : mode === "edit"
            ? "Editar agendamento"
            : "Novo agendamento"
        }
      >
        {mode === "view" && edit && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="label">Paciente</div>
                <div className="font-medium">{edit.patient_name}</div>
              </div>
              <div>
                <div className="label">Data/Hora</div>
                <div className="font-medium">
                  {new Date(edit.when_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div>
                <div className="label">Clínica</div>
                <div className="font-medium">
                  {clinicName[edit.clinic_id] || "—"}
                </div>
              </div>
              <div>
                <div className="label">Médico</div>
                <div className="font-medium">
                  {doctorById[edit.doctor_id]?.name || "—"}
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="label">Convênio</div>
                <div className="font-medium">
                  {insurances.find((i) => i.id === edit.insurance_id)?.name ||
                    "—"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => setAttendance(edit, true)}
                className="rounded-md border px-3 py-2 text-sm inline-flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Compareceu
              </button>
              <button
                onClick={() => setAttendance(edit, false)}
                className="rounded-md border px-3 py-2 text-sm inline-flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" /> Não compareceu
              </button>

              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => edit && openEdit(edit)}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={async () => {
                    setShowHistory((h) => !h);
                    if (!showHistory)
                      await loadHistoryForPatient(edit.patient_name);
                  }}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  {showHistory ? "Ocultar histórico" : "Ver histórico"}
                </button>
                <button
                  onClick={() => deleteAppt(edit)}
                  className="rounded-md border px-3 py-2 text-sm"
                  title="Excluir agendamento"
                >
                  <Trash2 className="inline h-4 w-4 mr-1" />
                  Excluir
                </button>
              </div>
            </div>

            {showHistory && (
              <div className="mt-3">
                {historyLoading && (
                  <div className="text-sm text-mutedForeground">
                    Carregando…
                  </div>
                )}
                {!historyLoading && history.length === 0 && (
                  <div className="text-sm text-mutedForeground">
                    Nenhum histórico encontrado.
                  </div>
                )}
                {!historyLoading && history.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {history.map((h) => {
                      const doc = doctorById[h.doctor_id];
                      const clin = clinicName[h.clinic_id] || "Clínica";
                      return (
                        <div
                          key={h.id}
                          className="border rounded-md px-3 py-2 text-sm"
                        >
                          <div className="font-medium">
                            {new Date(h.when_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-xs text-mutedForeground">
                            {doc?.name || "Médico"} • {clin}
                          </div>
                          <div className="text-xs mt-1">
                            {h.attended === true && (
                              <span className="text-green-600">compareceu</span>
                            )}
                            {h.attended === false && (
                              <span className="text-red-600">
                                não compareceu
                              </span>
                            )}
                            {h.attended === null && (
                              <span className="text-mutedForeground">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(mode === "edit" || mode === "create") && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Paciente *</label>
                <div className="flex gap-2">
                  <input
                    className="input w-full"
                    list="patientsList"
                    value={patient}
                    onChange={(e) => setPatient(e.target.value)}
                    placeholder="Digite ou selecione…"
                  />
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm"
                    onClick={() => patient && loadHistoryForPatient(patient)}
                    title="Ver histórico desse paciente"
                  >
                    Histórico
                  </button>
                </div>
                <datalist id="patientsList">
                  {patients.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="label">Data/Hora *</label>
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={whenAt}
                  onChange={(e) => setWhenAt(e.target.value)}
                />
                {whenAt && holidaySet.has(whenAt.slice(0, 10)) && (
                  <div className="mt-1 text-xs text-red-600">
                    {holidayNameByDate[whenAt.slice(0, 10)] || "Feriado"} —
                    agendamentos bloqueados. (Use override admin se necessário.)
                  </div>
                )}
              </div>

              <div>
                <label className="label">Clínica *</label>
                <select
                  className="input w-full"
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value)}
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Médico *</label>
                <select
                  className="input w-full"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Convênio *</label>
                <select
                  className="input w-full"
                  value={insuranceId}
                  onChange={(e) => setInsuranceId(e.target.value)}
                >
                  {insurances.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                      {i.name === "Particular" ? " (padrão)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={override}
                      onChange={(e) => setOverride(e.target.checked)}
                    />
                    <span>
                      Override (admin): permitir fora de regras/feriado
                    </span>
                  </label>
                  {override && (
                    <input
                      className="input w-full mt-2"
                      placeholder="Motivo do override"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setOpenForm(false)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Salvar
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal FERIADOS */}
      <Modal
        open={openHolidays}
        onClose={() => setOpenHolidays(false)}
        title="Feriados do mês"
      >
        <div className="space-y-4">
          <div className="text-sm text-mutedForeground">
            Gerencie os feriados deste mês (
            {month.toLocaleString("pt-BR", { month: "long", year: "numeric" })}
            ). Dias marcados aqui ficam bloqueados para novos agendamentos.
          </div>

          {isAdmin ? (
            <form
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                addHoliday();
              }}
            >
              <div>
                <label className="label">Data *</label>
                <input
                  type="date"
                  className="input w-full"
                  value={newHolidayDate}
                  min={fmtDate(mStart)}
                  max={fmtDate(mEnd)}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Nome *</label>
                <input
                  className="input w-full"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="Ex.: Proclamação da República"
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button className="rounded-md border px-3 py-2 text-sm">
                  Adicionar
                </button>
              </div>
            </form>
          ) : (
            <div className="text-sm text-mutedForeground">
              Somente administradores podem editar.
            </div>
          )}

          <div className="space-y-2">
            {holidays.length === 0 && (
              <div className="text-sm text-mutedForeground">
                Nenhum feriado neste mês.
              </div>
            )}
            {holidays.map((h) => (
              <div
                key={h.id}
                className="border rounded-md px-3 py-2 text-sm flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">
                    {new Date(h.date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                  <div className="text-xs text-mutedForeground">{h.name}</div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteHoliday(h)}
                    className="rounded-md border px-3 py-1 text-sm"
                    title="Remover feriado"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
