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
};
