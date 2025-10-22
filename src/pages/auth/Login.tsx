// src/pages/auth/Login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const nav = useNavigate();

  // login
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // esqueci a senha
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pwd,
      });
      if (error) throw error;
      nav("/app", { replace: true }); // pós-login vai para o app
    } catch (e: any) {
      setErr(e?.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function onSendReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const target = (forgotEmail || email).trim();
      if (!target) throw new Error("Informe seu e-mail.");
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      alert("Enviamos um e-mail com o link para redefinir sua senha.");
      setForgotOpen(false);
    } catch (e: any) {
      setErr(e?.message || "Falha ao enviar e-mail de redefinição.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-6 py-8 md:py-14">
      <div className="grid items-stretch gap-8 md:grid-cols-2">
        {/* Lado esquerdo (mensagem/branding) — esconde no mobile */}
        <div className="hidden md:flex flex-col justify-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Bem-vindo ao VISIONAGENDA
          </h1>
          <p className="mt-2 text-mutedForeground">
            Acesse o sistema para gerenciar sua agenda, clínicas, médicos e
            convênios em um só lugar.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="card p-3">
              <div className="font-medium">Agenda inteligente</div>
              <div className="text-mutedForeground">
                Visualize e confirme atendimentos rapidamente.
              </div>
            </div>
            <div className="card p-3">
              <div className="font-medium">Multi-clínica</div>
              <div className="text-mutedForeground">
                Troque de organização sem sair do app.
              </div>
            </div>
          </div>
        </div>

        {/* Formulário (lado direito) */}
        <div className="card p-6 md:p-8 max-w-[480px] md:max-w-none md:ml-auto">
          <div className="mb-4">
            <div className="text-2xl font-semibold tracking-tight">Entrar</div>
            <div className="text-sm text-mutedForeground">
              Use seu e-mail e senha cadastrados.
            </div>
          </div>

          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                className="input"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {err && (
              <div className="text-sm text-red-600 border border-red-500/40 bg-red-500/5 rounded-md px-3 py-2">
                {err}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button className="btn" disabled={loading}>
                {loading ? "Entrando…" : "Entrar"}
              </button>

              <button
                type="button"
                className="text-sm text-mutedForeground hover:underline"
                onClick={() => setForgotOpen((v) => !v)}
              >
                Esqueci minha senha
              </button>
            </div>
          </form>

          {/* bloco "esqueci a senha" */}
          {forgotOpen && (
            <form onSubmit={onSendReset} className="mt-6 space-y-3">
              <div className="text-sm">
                Informe seu e-mail para receber o link de redefinição.
              </div>
              <input
                type="email"
                className="input"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <div className="flex gap-2">
                <button className="btn" disabled={loading}>
                  Enviar link
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setForgotOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Link para reset (caso venha direto do e-mail e tenha fechado a aba) */}
          <div className="mt-6 text-xs text-mutedForeground">
            Recebeu um link de redefinição e voltou aqui? Abra-o novamente ou
            acesse{" "}
            <Link to="/reset-password" className="underline">
              /reset-password
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
