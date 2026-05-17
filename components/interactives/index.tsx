"use client";

import type { InteractiveKind, InteractiveProps } from "./types";
import { GiftInteractive } from "./gift";
import { LetterInteractive } from "./letter";
import { CakeInteractive } from "./cake";
import { HeartInteractive } from "./heart";

export { INTERACTIVE_OPTIONS } from "./types";
export type { InteractiveKind, InteractiveMeta, InteractiveProps } from "./types";

export function Interactive({
  kind, ...rest
}: { kind: InteractiveKind } & InteractiveProps) {
  switch (kind) {
    case "gift":   return <GiftInteractive   {...rest} />;
    case "letter": return <LetterInteractive {...rest} />;
    case "cake":   return <CakeInteractive   {...rest} />;
    case "heart":  return <HeartInteractive  {...rest} />;
    default: return null;
  }
}
