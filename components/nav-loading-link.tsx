"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function NavLoadingLink({
  href,
  className,
  loadingText,
  children,
}: {
  href: string;
  className?: string;
  loadingText?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <Link
      href={href}
      className={className}
      onClick={() => setLoading(true)}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin shrink-0" />
          {loadingText ?? "Loading…"}
        </>
      ) : (
        children
      )}
    </Link>
  );
}
