import { escapeHtml } from "./blessing-template";

function shell(body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F4EDE1;font-family:Georgia,'Times New Roman',serif;color:#2b2118;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#FFFDF8;border-radius:20px;padding:34px 30px;box-shadow:0 18px 50px -24px rgba(90,60,20,.4);border:1px solid rgba(160,124,74,.18);">
        ${body}
      </div>
      <p style="text-align:center;font-size:12px;color:#b3a484;margin:22px 0 0;">Spendbox · group birthday gifting</p>
    </div>
  </body>
</html>`;
}

/**
 * End-of-day summary of what landed on the user's sealed birthday page today.
 * Counts only — the page is still sealed, so we never reveal who sent what,
 * the message content, or gift amounts. Those unlock on the birthday.
 */
export function wallDigestEmailHtml(params: {
  firstName: string;
  messageCount: number;
  giftCount: number;
  daysUntil: number;
  pageUrl: string;
}): string {
  const { firstName, messageCount, giftCount, daysUntil, pageUrl } = params;
  const parts: string[] = [];
  if (messageCount > 0) parts.push(`${messageCount} new message${messageCount === 1 ? "" : "s"}`);
  if (giftCount > 0) parts.push(`${giftCount} new gift${giftCount === 1 ? "" : "s"}`);
  const summary = parts.join(" and ");
  const countdown =
    daysUntil <= 0 ? "It all unlocks on your birthday — today! 🎉"
    : daysUntil === 1 ? "Everything unlocks tomorrow on your birthday. 🎂"
    : `Everything stays sealed for ${daysUntil} more day${daysUntil === 1 ? "" : "s"}, until your birthday.`;

  return shell(`
    <div style="text-align:center;font-size:34px;margin-bottom:6px;">🎁</div>
    <h1 style="margin:0 0 12px;font-size:23px;color:#3a2c1a;text-align:center;">Your page is filling up, ${escapeHtml(firstName)}</h1>
    <p style="font-size:17px;line-height:1.6;color:#423423;margin:0 0 8px;text-align:center;">
      Today, <strong>${escapeHtml(summary)}</strong> landed on your page.
    </p>
    <p style="font-size:14px;line-height:1.6;color:#9b8a6f;margin:0 0 22px;text-align:center;">
      ${escapeHtml(countdown)} We're keeping every message and gift a surprise — even from you.
    </p>
    <div style="text-align:center;margin:6px 0 4px;">
      <a href="${pageUrl}" style="display:inline-block;background:#c2410c;color:#fff;text-decoration:none;border-radius:999px;padding:12px 26px;font-size:15px;">See the countdown</a>
    </div>
  `);
}
