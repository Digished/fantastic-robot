import Link from "next/link";
import { Cake } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";

/** Shown to signed-out contributors after they post a message or send a gift,
 * nudging them to create their own birthday page. */
export async function AccountNudge() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return null;

  return (
    <div className="card text-center space-y-2 mt-6">
      <span className="mx-auto size-10 rounded-full grid place-items-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
        <Cake className="size-5" />
      </span>
      <p className="serif text-lg text-ink">Want your own birthday page?</p>
      <p className="text-sm text-ink/55">Create a free account and let your friends celebrate you too.</p>
      <Link href="/signup" className="btn-accent shadow-soft inline-flex mt-1">Create an account</Link>
    </div>
  );
}
