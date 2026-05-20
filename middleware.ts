import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { jwtVerify } from "jose";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const ADMIN_COOKIE_NAME = "admin_session";

async function isAdminAuthenticated(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  const expected = process.env.ADMIN_EMAIL;
  if (!secret || !expected) return false;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] },
    );
    return payload.sub === expected;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Admin auth — separate from Supabase user auth. The /admin/login page is
  // public; everything else under /admin requires the signed admin cookie.
  if (url.pathname.startsWith("/admin") && url.pathname !== "/admin/login") {
    const ok = await isAdminAuthenticated(
      request.cookies.get(ADMIN_COOKIE_NAME)?.value,
    );
    if (!ok) {
      const redirect = new URL("/admin/login", url);
      if (url.pathname !== "/admin") {
        redirect.searchParams.set("next", url.pathname + url.search);
      }
      return NextResponse.redirect(redirect);
    }
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  const isProtected =
    url.pathname.startsWith("/create") ||
    url.pathname.startsWith("/dashboard") ||
    (url.pathname.startsWith("/c/") && url.pathname.endsWith("/edit"));
  if (isProtected) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const redirect = new URL("/login", url);
      redirect.searchParams.set("next", url.pathname);
      return NextResponse.redirect(redirect);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
