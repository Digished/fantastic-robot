import { escapeHtml } from "./blessing-template";

// Shared shell so the friend emails match the blessing emails' look. Inline
// styles only — email clients ignore <style>/external CSS.
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

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#c2410c;color:#fff;text-decoration:none;border-radius:999px;padding:12px 26px;font-size:15px;">${escapeHtml(label)}</a>`;
}

/** Invite to (possibly) a non-user: a link that makes them friends on accept. */
export function friendInviteEmailHtml(params: {
  inviterName: string;
  acceptUrl: string;
}): string {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:23px;color:#3a2c1a;">${escapeHtml(params.inviterName)} wants to be friends on Spendbox</h1>
    <p style="font-size:16px;line-height:1.6;color:#423423;margin:0 0 22px;">
      Spendbox makes birthdays easy — see your friends' countdowns and chip in to a
      group gift that lands in their account on the day. Accept the invite to connect.
    </p>
    <div style="text-align:center;margin:6px 0 4px;">${button(params.acceptUrl, "Accept invite")}</div>
  `);
}

/** Someone sent you a friend request (you already have an account). */
export function friendRequestEmailHtml(params: {
  requesterName: string;
  url: string;
}): string {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:23px;color:#3a2c1a;">${escapeHtml(params.requesterName)} sent you a friend request</h1>
    <p style="font-size:16px;line-height:1.6;color:#423423;margin:0 0 22px;">
      Accept to follow each other's birthday countdowns on Spendbox.
    </p>
    <div style="text-align:center;margin:6px 0 4px;">${button(params.url, "View request")}</div>
  `);
}

/** Your friend request was accepted. */
export function requestAcceptedEmailHtml(params: {
  friendName: string;
  url: string;
}): string {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:23px;color:#3a2c1a;">${escapeHtml(params.friendName)} accepted your friend request</h1>
    <p style="font-size:16px;line-height:1.6;color:#423423;margin:0 0 22px;">
      You'll now see their birthday countdown — and they'll see yours.
    </p>
    <div style="text-align:center;margin:6px 0 4px;">${button(params.url, "See friends")}</div>
  `);
}

/** A friend's birthday is coming up. */
export function birthdayReminderEmailHtml(params: {
  friendName: string;
  whenLabel: string; // "in 7 days", "tomorrow", "today"
  url: string;
}): string {
  return shell(`
    <div style="text-align:center;font-size:34px;margin-bottom:6px;">🎂</div>
    <h1 style="margin:0 0 12px;font-size:23px;color:#3a2c1a;text-align:center;">${escapeHtml(params.friendName)}'s birthday is ${escapeHtml(params.whenLabel)}</h1>
    <p style="font-size:16px;line-height:1.6;color:#423423;margin:0 0 22px;text-align:center;">
      Leave a message and chip in to the group gift before the day.
    </p>
    <div style="text-align:center;margin:6px 0 4px;">${button(params.url, "Open their page")}</div>
  `);
}
