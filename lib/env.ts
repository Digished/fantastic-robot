function req(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export const env = {
  supabaseUrl: () => req("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    req("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceKey: () =>
    req("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  paystackSecret: () => req("PAYSTACK_SECRET_KEY", process.env.PAYSTACK_SECRET_KEY),
  paystackPublic: () =>
    req("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", process.env.PAYSTACK_PUBLIC_KEY),
  appUrl: () =>
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  adminEmail: () => req("ADMIN_EMAIL", process.env.ADMIN_EMAIL),
  adminPassword: () => req("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD),
  resendApiKey: () => req("RESEND_API_KEY", process.env.RESEND_API_KEY),
  // Verified sender for all outgoing email. Set EMAIL_FROM to override;
  // BLESSINGS_FROM_EMAIL kept for backwards-compatibility.
  fromEmail: () =>
    process.env.EMAIL_FROM ??
    process.env.BLESSINGS_FROM_EMAIL ??
    "Spendbox <notifications@spendbox.site>",
  cronSecret: () => req("CRON_SECRET", process.env.CRON_SECRET),
};
