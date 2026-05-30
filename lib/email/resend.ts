import { env } from "@/lib/env";

// Thin wrapper over Resend's REST API — no SDK dependency, same shape as our
// Paystack client. Returns the provider message id on success.
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ id: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.fromEmail(),
      to: [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!res.ok || !json?.id) {
    throw new Error(json?.message || `Resend ${res.status}`);
  }
  return { id: json.id };
}
