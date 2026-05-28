"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { generateOtp, signOtp, verifyOtp } from "@/lib/otp";

export async function sendResetCode(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=Enter+your+email+address.");

  // Only send a code if the account exists; always show the success screen to
  // prevent account enumeration.
  const admin = supabaseAdmin();
  const { data: userRow } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (userRow) {
    const { code, expires } = generateOtp();
    const token = signOtp(email, code, expires);

    try {
      await sendEmail({
        to: email,
        subject: "Your Spendbox password reset code",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="font-size:24px;margin-bottom:8px">Reset your password</h2>
            <p style="color:#555;margin-bottom:24px">
              Use the code below to reset your Spendbox password.
              It expires in <strong>10 minutes</strong>.
            </p>
            <div style="font-size:40px;font-weight:bold;letter-spacing:0.3em;text-align:center;
                        padding:24px;background:#f5f5f5;border-radius:12px;margin-bottom:24px">
              ${code}
            </div>
            <p style="color:#888;font-size:13px">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      // Pass the signed token (no code inside) so the verify page can check it.
      redirect(
        `/forgot-password/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
      );
    } catch {
      redirect(`/forgot-password?error=${encodeURIComponent("Could not send the code. Try again.")}`);
    }
  }

  // Redirect even for non-existent emails — don't reveal whether an account exists.
  redirect(`/forgot-password/verify?email=${encodeURIComponent(email)}&token=`);
}

export async function verifyCodeAndReset(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const code = ((formData.get("code") as string | null) ?? "").replace(/\s/g, "");
  const token = (formData.get("token") as string | null) ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  const base = `/forgot-password/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  if (!code || code.length < 6) {
    redirect(`${base}&error=${encodeURIComponent("Enter the 6-digit code from your email.")}`);
  }
  if (password.length < 8) {
    redirect(`${base}&error=${encodeURIComponent("New password must be at least 8 characters.")}`);
  }
  if (!verifyOtp(email, code, token)) {
    redirect(`${base}&error=${encodeURIComponent("That code is incorrect or has expired — request a new one.")}`);
  }

  // Look up the user by their email mirror in the public users table.
  const admin = supabaseAdmin();
  const { data: userRow } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!userRow) {
    redirect(`/forgot-password?error=${encodeURIComponent("No account found for that email.")}`);
  }

  const { error } = await admin.auth.admin.updateUserById(userRow.id, { password });
  if (error) {
    redirect(`${base}&error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Password+updated.+Sign+in+with+your+new+password.");
}
