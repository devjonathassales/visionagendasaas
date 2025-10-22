// supabase/functions/send-invite-email/index.ts
// Runtime: Supabase Edge (Deno-compatible)

type Payload = {
  email?: string;
  token?: string;
  orgName?: string;
  appUrl?: string; // opcional, se quiser sobrepor APP_URL do .env
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "no-reply@seu-dominio.com";
const FROM_NAME = Deno.env.get("FROM_NAME") || "VisionAgenda";
const APP_URL_ENV = Deno.env.get("APP_URL") || ""; // ex: https://minhaapp.com

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function bad(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return bad({ error: "Method not allowed" }, 405);
    }

    const obj = (await req.json()) as Payload;
    const to = (obj.email || "").trim().toLowerCase();
    const token = (obj.token || "").trim();
    const orgName = obj.orgName || "sua organização";
    const baseUrl = (obj.appUrl || APP_URL_ENV || "").replace(/\/+$/, "");
    if (!to || !token)
      return bad({ error: "email e token são obrigatórios" }, 400);

    const acceptUrl = baseUrl
      ? `${baseUrl}/accept-invite/${token}`
      : `/accept-invite/${token}`; // fallback local

    const subject = `Convite para acessar o VisionAgenda`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial;">
        <h2>Você foi convidado(a) para ${orgName}</h2>
        <p>Clique no botão abaixo para aceitar o convite e criar seu acesso:</p>
        <p style="margin: 24px 0;">
          <a href="${acceptUrl}" 
             style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">
            Aceitar convite
          </a>
        </p>
        <p>Ou copie este link: <br><a href="${acceptUrl}">${acceptUrl}</a></p>
        <hr/>
        <p style="color:#64748b;font-size:12px;">Se você não reconhece este convite, ignore este e-mail.</p>
      </div>
    `;
    const text = `Você foi convidado(a) para ${orgName}.\nAbra: ${acceptUrl}`;

    // Se tiver RESEND_API_KEY -> envia; senão, loga (modo dev)
    if (RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      const out = await res.json();
      if (!res.ok) {
        console.error("Resend error:", out);
        return bad({ error: "Falha ao enviar e-mail", details: out }, 500);
      }
      return ok({ sent: true, provider: "resend", id: out?.id || null });
    } else {
      console.log("[DEV] RESEND_API_KEY não setado. Simulando envio:", {
        to,
        subject,
        acceptUrl,
      });
      return ok({ sent: false, simulated: true, acceptUrl });
    }
  } catch (e) {
    console.error("send-invite-email exception:", e);
    return bad(
      { error: "Internal error", details: String(e?.message || e) },
      500
    );
  }
});
