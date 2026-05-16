"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/validation/schemas";

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName") || undefined,
  });
  if (!parsed.success) {
    redirect(`/signup?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    redirect(`/signup?error=${encodeURIComponent(error?.message ?? "Could not sign up.")}`);
  }

  // Mirror profile (service role bypasses RLS).
  await supabaseAdmin().from("users").upsert({
    id: data.user.id,
    email: parsed.data.email,
    display_name: parsed.data.displayName ?? null,
  });

  // Email confirmation is disabled in Supabase Auth settings; sign user in.
  await supabase.auth.signInWithPassword(parsed.data);
  redirect("/dashboard");
}
