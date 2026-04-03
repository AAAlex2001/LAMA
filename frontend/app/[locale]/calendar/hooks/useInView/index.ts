"use client";

import type * as React from "react";

export { defaultFallbackInView, observe } from "./observe";
export { useInView } from "./useInView";
export { useOnInView } from "./useOnInView";

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type ObserverInstanceCallback = (
  inView: boolean,
  entry: IntersectionObserverEntry,
) => void;

export type IntersectionChangeEffect<TElement extends Element = Element> = (
  inView: boolean,
  entry: IntersectionObserverEntry & { target: TElement },
) => void;

interface RenderProps {
  inView: boolean;
  entry: IntersectionObserverEntry | undefined;
  ref: React.RefObject<any> | ((node?: Element | null) => void);
}

export interface IntersectionOptions extends IntersectionObserverInit {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
  skip?: boolean;
  initialInView?: boolean;
  fallbackInView?: boolean;
  trackVisibility?: boolean;
  delay?: number;
  onChange?: (inView: boolean, entry: IntersectionObserverEntry) => void;
}

export interface IntersectionObserverProps extends IntersectionOptions {
  children: (fields: RenderProps) => React.ReactNode;
}

export type PlainChildrenProps = IntersectionOptions & {
  children?: React.ReactNode;

  as?: React.ElementType;
  onChange?: (inView: boolean, entry: IntersectionObserverEntry) => void;
} & Omit<React.HTMLProps<HTMLElement>, "onChange">;

export type InViewHookResponse = [
  (node?: Element | null) => void,
  boolean,
  IntersectionObserverEntry | undefined,
] & {
  ref: (node?: Element | null) => void;
  inView: boolean;
  entry?: IntersectionObserverEntry;
};

export type IntersectionEffectOptions = Omit<
  IntersectionOptions,
  "onChange" | "fallbackInView" | "initialInView"
>;