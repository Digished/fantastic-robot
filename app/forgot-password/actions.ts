"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function sendResetCode(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=Enter+your+email+address.");

  const supabase = await supabaseServer();
  // signInWithOtp with shouldCreateUser:false sends a 6-digit OTP to existing
  // accounts. No-op / generic response if the email doesn't exist, so we don't
  // reveal whether an account is registered.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyCodeAndReset(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const token = ((formData.get("token") as string | null) ?? "").replace(/\s/g, "");
  const password = (formData.get("password") as string | null) ?? "";

  const base = `/forgot-password/verify?email=${encodeURIComponent(email)}`;

  if (!token || token.length < 6) {
    redirect(`${base}&error=${encodeURIComponent("Enter the 6-digit code from your email.")}`);
  }
  if (password.length < 8) {
    redirect(`${base}&error=${encodeURIComponent("Password must be at least 8 characters.")}`);
  }

  const supabase = await supabaseServer();

  // Exchange OTP for a session
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (verifyError) {
    redirect(`${base}&error=${encodeURIComponent("That code is incorrect or has expired. Request a new one.")}`);
  }

  // Session is now active — update the password
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    redirect(`${base}&error=${encodeURIComponent(updateError.message)}`);
  }

  redirect("/dashboard");
}
