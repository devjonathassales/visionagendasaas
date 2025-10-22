import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const nav = useNavigate();

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!pwd || pwd.length < 6) {
      setErr("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (pwd !== pwd2) {
      setErr("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      // Supabase já valida que você veio do link de reset
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setOk(true);
      // opcional: após alguns segundos, mandar para login
      setTimeout(() => nav("/login", { replace: true }), 1200);
    } catch (e: any) {
      setErr(e?.message || "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  }

  if (ok) {
    return (
      <div className="max-w-md mx-auto card p-4">
        <div className="text-green-600 font-medium">Senha alterada!</div>
        <div className="text-sm text-mutedForeground">
          Você já pode entrar com sua nova senha.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1>Definir nova senha</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="label">Nova senha</label>
          <input
            type="password"
            className="input"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="••••••••"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Confirmar senha</label>
          <input
            type="password"
            className="input"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {err && (
          <div className="text-sm text-red-600 border border-red-500/40 bg-red-500/5 rounded-md px-3 py-2">
            {err}
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn" disabled={loading}>
            {loading ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
