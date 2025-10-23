import { NavLink, Outlet, Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/authContext";
import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  LogOut,
  ChevronsUpDown,
  CalendarDays,
  Building2,
  Stethoscope,
  ShieldPlus,
  Users, // 👈 novo ícone para Pacientes
} from "lucide-react";
import { useMyOrgs } from "@/hooks/useMyOrgs";

/** Nome legível a partir da session (Supabase) */
function getDisplayName(session: unknown): string {
  const s = session as any;
  const email: string | undefined = s?.user?.email ?? undefined;
  const meta: any = s?.user?.user_metadata ?? {};
  return (
    meta?.full_name || meta?.name || (email ? email.split("@")[0] : "Usuário")
  );
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-md px-3 py-2 text-sm transition",
    isActive
      ? "bg-muted text-foreground"
      : "text-mutedForeground hover:text-foreground hover:bg-muted",
  ].join(" ");

export default function ClientShell() {
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string>("Usuário");

  const {
    orgs,
    activeOrgId,
    setActiveOrgId,
    loading: loadingOrgs,
  } = useMyOrgs();

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) || null,
    [orgs, activeOrgId]
  );

  useEffect(() => setName(getDisplayName(session)), [session]);

  return (
    // sem "app-grid" para não herdar layout do admin
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-6 flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Menu (mobile) */}
            <button
              className="md:hidden inline-flex items-center rounded-md bg-card text-foreground border border-border p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/app" className="font-semibold tracking-tight">
              VISIONAGENDA • App
            </Link>

            {/* Navegação (desktop) */}
            <nav className="ml-4 hidden md:flex items-center gap-2">
              <NavLink to="/app/agenda" className={linkCls}>
                <CalendarDays className="h-4 w-4 mr-1" />
                Agenda
              </NavLink>
              <NavLink to="/app/clinics" className={linkCls}>
                <Building2 className="h-4 w-4 mr-1" />
                Minhas clínicas
              </NavLink>
              {/* 👇 novo: Pacientes */}
              <NavLink to="/app/patients" className={linkCls}>
                <Users className="h-4 w-4 mr-1" />
                Pacientes
              </NavLink>
              <NavLink to="/app/doctors" className={linkCls}>
                <Stethoscope className="h-4 w-4 mr-1" />
                Médicos
              </NavLink>
              <NavLink to="/app/insurances" className={linkCls}>
                <ShieldPlus className="h-4 w-4 mr-1" />
                Convênios
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de organização (desktop) */}
            <div className="hidden md:flex items-center">
              <div className="input flex items-center justify-between w-64 mr-2">
                <select
                  className="bg-transparent w-full outline-none"
                  value={activeOrgId ?? ""}
                  onChange={(e) => setActiveOrgId(e.target.value || null)}
                  disabled={loadingOrgs || orgs.length === 0}
                  aria-label="Selecionar organização"
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

            <div className="hidden md:flex items-center gap-1 text-sm">
              <span className="text-mutedForeground">Olá,</span>
              <span className="font-medium">{name}</span>
              {activeOrg && (
                <>
                  <span className="mx-1 text-mutedForeground">•</span>
                  <span
                    className="text-mutedForeground truncate max-w-[180px]"
                    title={activeOrg.name}
                  >
                    {activeOrg.name}
                  </span>
                </>
              )}
            </div>

            <ThemeToggle />
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-md bg-card text-foreground border border-border px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="mx-auto w-full max-w-screen-2xl px-4 md:px-6 py-6">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-border bg-card">
        <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-6 py-4 text-sm text-mutedForeground">
          © {new Date().getFullYear()} VisionWare — VISIONAGENDA SaaS
        </div>
      </footer>

      {/* Drawer mobile */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 border-r border-border bg-card text-foreground shadow-xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card">
            <span className="font-semibold">Menu</span>
            <button
              className="rounded-md bg-card text-foreground border border-border p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            <div className="text-sm">
              Olá, <span className="font-medium">{name}</span>
            </div>

            {/* Seletor org (mobile) */}
            <div className="input flex items-center justify-between">
              <select
                className="bg-transparent w-full outline-none"
                value={activeOrgId ?? ""}
                onChange={(e) => setActiveOrgId(e.target.value || null)}
                disabled={loadingOrgs || orgs.length === 0}
                aria-label="Selecionar organização"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronsUpDown className="w-4 h-4 opacity-60" />
            </div>

            <nav className="space-y-2">
              <NavLink
                to="/app/agenda"
                onClick={() => setOpen(false)}
                className={linkCls}
              >
                <CalendarDays className="h-4 w-4 mr-1" /> Agenda
              </NavLink>
              <NavLink
                to="/app/clinics"
                onClick={() => setOpen(false)}
                className={linkCls}
              >
                <Building2 className="h-4 w-4 mr-1" /> Minhas clínicas
              </NavLink>
              {/* 👇 novo: Pacientes (mobile) */}
              <NavLink
                to="/app/patients"
                onClick={() => setOpen(false)}
                className={linkCls}
              >
                <Users className="h-4 w-4 mr-1" /> Pacientes
              </NavLink>
              <NavLink
                to="/app/doctors"
                onClick={() => setOpen(false)}
                className={linkCls}
              >
                <Stethoscope className="h-4 w-4 mr-1" /> Médicos
              </NavLink>
              <NavLink
                to="/app/insurances"
                onClick={() => setOpen(false)}
                className={linkCls}
              >
                <ShieldPlus className="h-4 w-4 mr-1" /> Convênios
              </NavLink>
            </nav>

            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="mt-2 w-full rounded-md bg-card text-foreground border border-border px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              <LogOut className="mr-2 inline h-4 w-4" /> Sair
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
