import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";

/**
 * Server-side guard for admin pages and route handlers. Verifies the signed
 * admin session cookie and redirects to /admin/login if missing/invalid.
 * Middleware already enforces this, but this is the belt-and-braces check
 * server actions and route handlers use.
 */
export async function requireAdmin(): Promise<{ email: string }> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
