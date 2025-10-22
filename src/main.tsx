// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import "@/index.css";

import { AuthProvider } from "@/contexts/authContext";
import { ThemeProvider } from "@/components/ThemeProvider";

// Layouts
import PublicShell from "@/layouts/PublicShell";
import AdminShell from "@/layouts/AdminShell";
import ClientShell from "@/layouts/ClientShell";

// Guards
import { RequireAuth, RequireAdmin } from "@/routes/guards";

// Páginas públicas
import LoginPage from "@/pages/auth/Login";
import ResetPasswordPage from "@/pages/auth/ResetPassword"; // 👈 nova
import AcceptInvitePage from "@/pages/public/AcceptInvite";

// Painel Admin
import AdminClientsPage from "@/pages/admin/Clients";
import AdminPlansPage from "@/pages/admin/Plans";

// App do Cliente
import ClinicsPage from "@/pages/app/Clinics";
import DoctorsPage from "@/pages/app/Doctors";
import InsurancesPage from "@/pages/app/Insurances";
import AgendaPage from "@/pages/app/Agenda";

const router = createBrowserRouter([
  // Público
  {
    path: "/",
    element: <PublicShell />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: "login", element: <LoginPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> }, // 👈 público (via link do e-mail)
      { path: "accept-invite/:token", element: <AcceptInvitePage /> },
    ],
  },

  // App do Cliente (qualquer usuário autenticado)
  {
    path: "/app",
    element: <RequireAuth />, // exige sessão; se não tiver, vai para /login
    children: [
      {
        path: "",
        element: <ClientShell />,
        children: [
          { index: true, element: <Navigate to="/app/agenda" replace /> },
          { path: "agenda", element: <AgendaPage /> },
          { path: "clinics", element: <ClinicsPage /> },
          { path: "doctors", element: <DoctorsPage /> },
          { path: "insurances", element: <InsurancesPage /> },
        ],
      },
    ],
  },

  // Painel Admin (apenas admins; não-admin é redirecionado pelo guard para /app)
  {
    path: "/admin",
    element: <RequireAdmin />,
    children: [
      {
        path: "",
        element: <AdminShell />,
        children: [
          { index: true, element: <Navigate to="/admin/clients" replace /> },
          { path: "clients", element: <AdminClientsPage /> },
          { path: "plans", element: <AdminPlansPage /> },
        ],
      },
    ],
  },

  // 404 -> manda para o app
  { path: "*", element: <Navigate to="/app" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
