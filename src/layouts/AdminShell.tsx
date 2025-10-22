import { Link, NavLink, Outlet } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/authContext";
import { Menu, X, LogOut } from "lucide-react";

/** Nome legível a partir da session (Supabase) */
function getDisplayName(session: unknown): string {
  const s = session as any;
  const email: string | undefined = s?.user?.email ?? undefined;
  const meta: any = s?.user?.user_metadata ?? {};
  return (
    meta?.full_name ||
    meta?.name ||
    (email ? email.split("@")[0] : "") ||
    "Usuário"
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const Item = ({
    to,
    children,
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        "block px-4 py-2 rounded-md hover:bg-muted " +
        (isActive ? "bg-muted font-medium" : "")
      }
    >
      {children}
    </NavLink>
  );

  return (
    <aside className="sidebar p-4 space-y-2 hidden md:block">
      <div className="text-sm uppercase text-mutedForeground mb-2">Admin</div>
      <Item to="/admin/clients">Clientes</Item>
      <Item to="/admin/plans">Planos</Item>
      {/* ✅ novo */}
      <Item to="/admin/billing">Financeiro</Item>
    </aside>
  );
}

export default function AdminShell() {
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string>("Usuário");

  useEffect(() => setName(getDisplayName(session)), [session]);

  return (
    <div className="app-grid">
      {/* Sidebar desktop */}
      <Sidebar />

      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="header sticky top-0 z-40 border-b border-border/60 bg-[var(--bg)]/80 backdrop-blur">
          <div className="container mx-auto flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Hamburguer - mobile (cores do tema) */}
              <button
                className="md:hidden inline-flex items-center rounded-md bg-card text-foreground border border-border p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                aria-label="Abrir menu"
                onClick={() => setOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link to="/" className="font-semibold tracking-tight">
                VISIONAGENDA • Admin
              </Link>

              {/* Navegação (desktop) */}
              <nav className="ml-4 hidden md:flex items-center gap-2">
                <NavLink
                  to="/admin/clients"
                  className={({ isActive }) =>
                    [
                      "rounded-md px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-mutedForeground hover:text-foreground hover:bg-muted",
                    ].join(" ")
                  }
                >
                  Clientes
                </NavLink>
                <NavLink
                  to="/admin/plans"
                  className={({ isActive }) =>
                    [
                      "rounded-md px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-mutedForeground hover:text-foreground hover:bg-muted",
                    ].join(" ")
                  }
                >
                  Planos
                </NavLink>
                {/* ✅ novo */}
                <NavLink
                  to="/admin/billing"
                  className={({ isActive }) =>
                    [
                      "rounded-md px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-mutedForeground hover:text-foreground hover:bg-muted",
                    ].join(" ")
                  }
                >
                  Financeiro
                </NavLink>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 text-sm">
                <span className="text-mutedForeground">Olá,</span>
                <span className="font-medium">{name}</span>
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

        {/* Conteúdo */}
        <main className="content">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-border bg-card">
          <div className="container mx-auto py-4 text-sm text-mutedForeground">
            © {new Date().getFullYear()} VisionWare — VISIONAGENDA SaaS
          </div>
        </footer>
      </div>

      {/* Drawer mobile */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Overlay mais escuro */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        {/* PAINEL: fundo sólido do tema */}
        <aside
          className={`absolute left-0 top-0 h-full w-72 border-r border-border bg-card text-foreground
                      shadow-xl transition-transform ${
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

          <div className="p-3">
            <div className="mb-3 text-sm">
              Olá, <span className="font-medium">{name}</span>
            </div>
            <nav className="space-y-2">
              <NavLink
                to="/admin/clients"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm border border-border
                   ${
                     isActive
                       ? "bg-muted text-foreground"
                       : "bg-card text-mutedForeground hover:text-foreground hover:bg-muted"
                   }`
                }
              >
                Clientes
              </NavLink>
              <NavLink
                to="/admin/plans"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm border border-border
                   ${
                     isActive
                       ? "bg-muted text-foreground"
                       : "bg-card text-mutedForeground hover:text-foreground hover:bg-muted"
                   }`
                }
              >
                Planos
              </NavLink>
              {/* ✅ novo */}
              <NavLink
                to="/admin/billing"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm border border-border
                   ${
                     isActive
                       ? "bg-muted text-foreground"
                       : "bg-card text-mutedForeground hover:text-foreground hover:bg-muted"
                   }`
                }
              >
                Financeiro
              </NavLink>
            </nav>

            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="mt-3 w-full rounded-md bg-card text-foreground border border-border px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              <LogOut className="mr-2 inline h-4 w-4" />
              Sair
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
