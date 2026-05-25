export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A single weekly blessing email. Inline styles only — email clients ignore
// <style> and external CSS. Warm, calm, and unmistakably a gift.
export function blessingEmailHtml(params: {
  recipientName: string;
  senderName: string | null;
  weekNo: number;
  weeksTotal: number;
  title: string;
  body: string;
  unsubscribeUrl: string;
}): string {
  const firstName = params.recipientName.split(" ")[0] || params.recipientName;
  const from = params.senderName ? `from ${escapeHtml(params.senderName)}` : "";
  const bodyHtml = escapeHtml(params.body).replace(/\n+/g, "<br/><br/>");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F4EDE1;font-family:Georgia,'Times New Roman',serif;color:#2b2118;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="text-align:center;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#a07c4a;margin-bottom:6px;">
        Week ${params.weekNo} of ${params.weeksTotal}
      </div>
      <div style="background:#FFFDF8;border-radius:20px;padding:34px 30px;box-shadow:0 18px 50px -24px rgba(90,60,20,.4);border:1px solid rgba(160,124,74,.18);">
        <h1 style="margin:0 0 6px;font-size:24px;line-height:1.25;color:#3a2c1a;">${escapeHtml(params.title)}</h1>
        <p style="margin:0 0 22px;font-size:14px;color:#9b8a6f;">For ${escapeHtml(firstName)} ${from}</p>
        <div style="font-size:17px;line-height:1.7;color:#423423;">${bodyHtml}</div>
      </div>
      <p style="text-align:center;font-size:13px;color:#9b8a6f;margin:26px 0 4px;">
        A new blessing reaches you every week for a year.
      </p>
      <p style="text-align:center;font-size:12px;color:#b3a484;margin:0;">
        <a href="${params.unsubscribeUrl}" style="color:#b3a484;">Stop these emails</a>
      </p>
    </div>
  </body>
</html>`;
}

// Sent to the creator the moment the recipient claims the gift — the point at
// which the year of blessings actually starts being delivered.
export function creatorClaimedEmailHtml(params: {
  recipientName: string;
  senderName: string | null;
  weeksTotal: number;
  pageUrl: string;
}): string {
  const firstName = params.recipientName.split(" ")[0] || params.recipientName;
  const signoff = params.senderName ? `, ${escapeHtml(params.senderName)}` : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F4EDE1;font-family:Georgia,'Times New Roman',serif;color:#2b2118;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="text-align:center;font-size:34px;margin-bottom:6px;">🕊️</div>
      <div style="background:#FFFDF8;border-radius:20px;padding:34px 30px;box-shadow:0 18px 50px -24px rgba(90,60,20,.4);border:1px solid rgba(160,124,74,.18);text-align:center;">
        <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#3a2c1a;">${escapeHtml(firstName)} opened your gift</h1>
        <div style="font-size:17px;line-height:1.7;color:#423423;">
          Their first of ${params.weeksTotal} weekly blessings is on its way right now, and a new one will
          reach ${escapeHtml(firstName)} every week for the year ahead. Nothing more to do — your gift is
          unfolding${signoff}.
        </div>
        <a href="${params.pageUrl}" style="display:inline-block;margin-top:24px;padding:12px 22px;border-radius:999px;background:#D9613C;color:#fff;text-decoration:none;font-size:15px;">View the celebration</a>
      </div>
      <p style="text-align:center;font-size:13px;color:#9b8a6f;margin:26px 0 0;">
        Sent by Spendbox because you gifted 52 Weeks of Blessings.
      </p>
    </div>
  </body>
</html>`;
}
