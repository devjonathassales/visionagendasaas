import { Link, NavLink } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/authContext";

/** Helper seguro para extrair o nome do usuário */
function getDisplayName(session: unknown): string | undefined {
  const s = session as any;
  const email: string | undefined = s?.user?.email ?? undefined;
  const meta: any = s?.user?.user_metadata ?? {};
  return (
    meta?.full_name || meta?.name || (email ? email.split("@")[0] : undefined)
  );
}

export default function Header() {
  const { session, signOut } = useAuth();
  const name = getDisplayName(session);

  return (
    <header className="border-b">
      <div className="vf-container flex items-center justify-between h-14">
        <Link to="/" className="font-semibold">
          VISIONAGENDA
        </Link>
        <nav className="flex gap-4 items-center">
          <NavLink
            to="/admin/clients"
            className={({ isActive }) => (isActive ? "underline" : "")}
          >
            Admin
          </NavLink>
          <ThemeToggle />
          {session?.user ? (
            <>
              <span className="hidden sm:inline text-sm text-mutedForeground">
                Olá{", "}
                <b className="text-foreground">{name ?? "Usuário"}</b>
              </span>
              <button
                onClick={signOut}
                className="px-3 py-1 rounded border hover:bg-muted"
              >
                Sair
              </button>
            </>
          ) : (
            <NavLink to="/login" className="px-3 py-1 rounded border">
              Entrar
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
