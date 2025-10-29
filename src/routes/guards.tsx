// src/routes/guards.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/** Exige estar autenticado */
export function RequireAuth() {
  const { session } = useAuth();
  if (!session?.user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Exige admin (via system_users_me). Se não for, leva para /app. */
export function RequireAdmin() {
  const { session } = useAuth();
  const { loading, isAdmin } = useIsAdmin();

  if (!session?.user) return <Navigate to="/login" replace />;
  if (loading) return null; // pode trocar por skeleton/spinner
  return isAdmin ? <Outlet /> : <Navigate to="/app" replace />;
}
