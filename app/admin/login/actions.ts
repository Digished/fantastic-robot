"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { signAdminToken, setAdminSessionCookie } from "@/lib/admin/session";

function safeEqual(a: string, b: string): boolean {
  const buf1 = Buffer.from(a);
  const buf2 = Buffer.from(b);
  if (buf1.length !== buf2.length) return false;
  return timingSafeEqual(buf1, buf2);
}

export async function adminLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = (formData.get("next") as string) || "/admin";

  const expectedEmail = env.adminEmail().trim().toLowerCase();
  const expectedPassword = env.adminPassword();

  if (!safeEqual(email, expectedEmail) || !safeEqual(password, expectedPassword)) {
    redirect(
      `/admin/login?error=${encodeURIComponent("Incorrect email or password.")}`,
    );
  }

  const token = await signAdminToken(expectedEmail);
  await setAdminSessionCookie(token);
  redirect(next);
}
