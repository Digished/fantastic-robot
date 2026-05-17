"use client";

import type { InteractiveKind, InteractiveProps } from "./types";
import { GiftInteractive } from "./gift";
import { LetterInteractive } from "./letter";
import { CakeInteractive } from "./cake";
import { HeartInteractive } from "./heart";
import { ScratchInteractive } from "./scratch";
import { PolaroidInteractive } from "./polaroid";
import { BalloonsInteractive } from "./balloons";
import { JarInteractive } from "./jar";
import { SparklerInteractive } from "./sparkler";
import { ToastInteractive } from "./toast";

export { INTERACTIVE_OPTIONS } from "./types";
export type { InteractiveKind, InteractiveMeta, InteractiveProps, MediaKind } from "./types";

export function Interactive({
  kind, ...rest
}: { kind: InteractiveKind } & InteractiveProps) {
  switch (kind) {
    case "gift":     return <GiftInteractive     {...rest} />;
    case "letter":   return <LetterInteractive   {...rest} />;
    case "cake":     return <CakeInteractive     {...rest} />;
    case "heart":    return <HeartInteractive    {...rest} />;
    case "scratch":  return <ScratchInteractive  {...rest} />;
    case "polaroid": return <PolaroidInteractive {...rest} />;
    case "balloons": return <BalloonsInteractive {...rest} />;
    case "jar":      return <JarInteractive      {...rest} />;
    case "sparkler": return <SparklerInteractive {...rest} />;
    case "toast":    return <ToastInteractive    {...rest} />;
    default:         return null;
  }
}
