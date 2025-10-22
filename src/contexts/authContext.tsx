import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Session = { user: { id: string; email?: string | null } | null } | null;

type AuthContextType = {
  session: Session;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ? { user: data.session.user } : null);
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s ? { user: s.user } : null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { ok: false, error: error.message };

        // 🔒 Garante que o estado local já tenha a sessão
        const { data: s, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) return { ok: false, error: sessErr.message };
        setSession(s.session ? { user: s.session.user } : null);

        // (Opcional) Se exigir confirmação de e-mail, você pode checar aqui:
        // const { data: user } = await supabase.auth.getUser()
        // if (!user.user?.email_confirmed_at) return { ok: false, error: 'E-mail não confirmado.' }

        return { ok: true };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
