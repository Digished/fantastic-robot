import { LoginForm } from "./login-form";
import { getAdminSession } from "@/lib/admin/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getAdminSession();
  const { error, next } = await searchParams;
  if (session) redirect(next || "/admin");

  return (
    <main className="min-h-[100dvh] grid place-items-center bg-[#FAFAF8] px-5">
      <div className="w-full max-w-sm">
        <h1 className="serif text-4xl text-ink text-center">Admin sign in</h1>
        <p className="text-ink/55 text-sm text-center mt-2">
          Use the email and password configured in your environment.
        </p>
        <LoginForm error={error} next={next} />
      </div>
    </main>
  );
}
