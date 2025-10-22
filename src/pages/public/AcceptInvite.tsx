import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type VerifyResp = {
  org_id: string | null;
  org_name: string | null;
  email: string | null;
  role: "owner" | "admin" | "member" | null;
  is_valid: boolean | null;
  is_expired: boolean | null;
};

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [verify, setVerify] = useState<VerifyResp | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) {
        setError("Token inválido.");
        setLoading(false);
        return;
      }

      try {
        // sessão atual
        const { data: sess } = await supabase.auth.getSession();
        setSessionEmail(sess.session?.user?.email ?? null);

        // verifica convite
        const { data, error } = await supabase.rpc("invite_verify", {
          p_token: token,
        });
        if (error) throw error;
        setVerify(data as VerifyResp);
      } catch (e: any) {
        setError(e?.message || "Erro ao validar convite");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function sendMagicLink() {
    if (!verify?.email) return;
    setInfo("Enviando link de login para o e-mail do convite…");
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/accept-invite/${token}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: verify.email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setInfo(
        "Enviamos um link de login para seu e-mail. Abra-o e volte para cá."
      );
    } catch (e: any) {
      setError(e?.message || "Não foi possível enviar o link de login.");
    }
  }

  async function acceptNow() {
    if (!token) return;
    setInfo("Aceitando convite…");
    setError(null);
    try {
      const { data, error } = await supabase.rpc("accept_invite", {
        p_token: token,
      });
      if (error) throw error;

      // redireciona pós-aceite (ajuste como quiser)
      navigate("/admin/clients", { replace: true });
    } catch (e: any) {
      const code = String(e?.message || "");
      if (code.includes("email_mismatch")) {
        setError("Você está logado com um e-mail diferente do convite.");
      } else if (code.includes("expired_token")) {
        setError("Este convite expirou.");
      } else if (code.includes("already_accepted")) {
        setError("Este convite já foi aceito.");
      } else if (code.includes("invalid_token")) {
        setError("Convite inválido.");
      } else if (code.includes("not_authenticated")) {
        setError("Você precisa estar logado para aceitar o convite.");
      } else {
        setError("Não foi possível aceitar o convite.");
      }
    } finally {
      setInfo(null);
    }
  }

  if (loading) {
    return (
      <div className="vf-container py-10">
        <div className="card p-6">Validando convite…</div>
      </div>
    );
  }

  if (!verify) {
    return (
      <div className="vf-container py-10">
        <div className="card p-6 text-red-600">Convite não encontrado.</div>
      </div>
    );
  }

  if (verify.is_expired) {
    return (
      <div className="vf-container py-10">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-2">Convite expirado</h2>
          <p>Peça um novo convite ao administrador.</p>
        </div>
      </div>
    );
  }

  if (!verify.is_valid) {
    return (
      <div className="vf-container py-10">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-2">Convite inválido</h2>
          <p>Este convite não está mais disponível.</p>
        </div>
      </div>
    );
  }

  const mustLoginAsInviteEmail =
    !sessionEmail ||
    sessionEmail.toLowerCase() !== (verify.email || "").toLowerCase();

  return (
    <div className="vf-container py-10">
      <div className="card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Aceitar convite</h1>

        <div className="text-sm">
          <div>
            <b>Empresa:</b> {verify.org_name}
          </div>
          <div>
            <b>E-mail do convite:</b> {verify.email}
          </div>
          <div>
            <b>Papel:</b> {verify.role}
          </div>
        </div>

        {mustLoginAsInviteEmail ? (
          <>
            <div className="rounded-md border border-border p-3 text-sm">
              {sessionEmail ? (
                <>
                  Você está logado como <b>{sessionEmail}</b>, mas o convite é
                  para <b>{verify.email}</b>.
                  <div className="mt-3 flex gap-2">
                    <button
                      className="rounded-md border border-border px-3 py-2 hover:bg-muted"
                      onClick={() => supabase.auth.signOut()}
                    >
                      Sair
                    </button>
                    <button
                      className="rounded-md border border-border px-3 py-2 hover:bg-muted"
                      onClick={sendMagicLink}
                    >
                      Entrar como {verify.email}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  Você precisa entrar como <b>{verify.email}</b> para aceitar.
                  <div className="mt-3">
                    <button
                      className="rounded-md border border-border px-3 py-2 hover:bg-muted"
                      onClick={sendMagicLink}
                    >
                      Receber link de login
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              className="rounded-md border border-border px-3 py-2 hover:bg-muted"
              onClick={acceptNow}
            >
              Aceitar convite
            </button>
            <Link
              to="/"
              className="rounded-md border border-border px-3 py-2 hover:bg-muted"
            >
              Cancelar
            </Link>
          </div>
        )}

        {info && (
          <div className="text-sm text-blue-600 bg-blue-500/10 border border-blue-500/40 rounded p-2">
            {info}
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/40 rounded p-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
