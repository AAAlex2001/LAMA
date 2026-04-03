"use client";

// Re-export from canonical location: hooks/useInView
export { defaultFallbackInView, observe } from "../../hooks/useInView/observe";
export { useInView } from "../../hooks/useInView/useInView";
export { useOnInView } from "../../hooks/useInView/useOnInView";

export type {
  ObserverInstanceCallback,
  IntersectionChangeEffect,
  IntersectionOptions,
  IntersectionObserverProps,
  PlainChildrenProps,
  InViewHookResponse,
  IntersectionEffectOptions,
} from "../../hooks/useInView/index";
