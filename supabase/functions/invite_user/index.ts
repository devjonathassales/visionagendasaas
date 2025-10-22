// supabase/functions/invite_user/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req) => {
  const { email, org_id, role } = await req.json();
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SERVICE_ROLE_KEY")!
  );

  // 1) Convida o usuário
  const { data: invited, error: invErr } =
    await supa.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${new URL(req.url).origin}/accept-invite`,
    });
  if (invErr) return new Response(invErr.message, { status: 400 });

  // 2) Cria registro de convite (opcional com token próprio)
  const { error: dbErr } = await supa.from("org_invites").insert({
    org_id,
    email,
    role,
    invited_user_id: invited.user?.id ?? null,
  });
  if (dbErr) return new Response(dbErr.message, { status: 400 });

  return new Response("OK");
});
