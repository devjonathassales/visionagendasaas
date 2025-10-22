// src/layouts/PublicShell.tsx
import { Outlet, Link, NavLink } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

export default function PublicShell() {
  return (
    // 🔧 nada de "app-grid" aqui
    <div className="min-h-screen flex flex-col">
      {/* Header full-width com container amplo */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-6 flex h-14 items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">
            VISIONAGENDA
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <NavLink
              to="/precos"
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-mutedForeground hover:text-foreground hover:bg-muted",
                ].join(" ")
              }
            >
              Preços
            </NavLink>
            <NavLink
              to="/contato"
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-mutedForeground hover:text-foreground hover:bg-muted",
                ].join(" ")
              }
            >
              Contato
            </NavLink>
          </nav>

          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo com o mesmo container do header */}
      <main className="mx-auto w-full max-w-screen-2xl px-4 md:px-6 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card">
        <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-6 py-4 text-sm text-mutedForeground">
          © {new Date().getFullYear()} VisionWare — VISIONAGENDA SaaS
        </div>
      </footer>
    </div>
  );
}
