"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/validation/schemas";
import { acceptInviteForUser } from "@/lib/friends";

export async function signup(formData: FormData) {
  const invite = (formData.get("invite") as string | null)?.trim() || null;
  const back = (suffix: string) => (invite ? `/signup?invite=${encodeURIComponent(invite)}&${suffix}` : `/signup?${suffix}`);

  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName") || undefined,
    username: formData.get("username"),
  });
  if (!parsed.success) {
    redirect(back(`error=${encodeURIComponent(parsed.error.issues[0].message)}`));
  }

  const admin = supabaseAdmin();

  // Usernames are unique (case-insensitive).
  const { data: taken } = await admin
    .from("users")
    .select("id")
    .ilike("username", parsed.data.username)
    .maybeSingle();
  if (taken) {
    redirect(back(`error=${encodeURIComponent("That username is taken.")}`));
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    redirect(back(`error=${encodeURIComponent(error?.message ?? "Could not sign up.")}`));
  }

  // Mirror profile (service role bypasses RLS).
  await admin.from("users").upsert({
    id: data.user.id,
    email: parsed.data.email,
    display_name: parsed.data.displayName ?? null,
    username: parsed.data.username,
  });

  // Email confirmation is disabled in Supabase Auth settings; sign user in.
  await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  // Consume an invite token if they arrived from one → instant friendship,
  // and record the referral so it counts toward the inviter's "invite" goal.
  if (invite) {
    const res = await acceptInviteForUser(data.user.id, invite);
    if (res.inviterId) {
      await admin.from("users").update({ referred_by: res.inviterId }).eq("id", data.user.id);
    }
    redirect("/dashboard/friends");
  }
  redirect("/dashboard");
}
