import * as React from "react";
import type { IntersectionOptions, InViewHookResponse } from "./index.ts";
import { observe } from "./observe";

type State = {
  inView: boolean;
  entry?: IntersectionObserverEntry;
};

export function useInView({
  threshold,
  delay,
  trackVisibility,
  rootMargin,
  root,
  triggerOnce,
  skip,
  initialInView,
  fallbackInView,
  onChange,
}: IntersectionOptions = {}): InViewHookResponse {
  const [ref, setRef] = React.useState<Element | null>(null);
  const callback = React.useRef<IntersectionOptions["onChange"]>(onChange);
  const lastInViewRef = React.useRef<boolean | undefined>(initialInView);
  const [state, setState] = React.useState<State>({
    inView: !!initialInView,
    entry: undefined,
  });

  callback.current = onChange;

  React.useEffect(
    () => {
      if (lastInViewRef.current === undefined) {
        lastInViewRef.current = initialInView;
      }
      if (skip || !ref) return;

      let unobserve: (() => void) | undefined;
      unobserve = observe(
        ref,
        (inView, entry) => {
          const previousInView = lastInViewRef.current;
          lastInViewRef.current = inView;

          if (previousInView === undefined && !inView) {
            return;
          }

          setState({
            inView,
            entry,
          });
          if (callback.current) callback.current(inView, entry);

          if (entry.isIntersecting && triggerOnce && unobserve) {
            unobserve();
            unobserve = undefined;
          }
        },
        {
          root,
          rootMargin,
          threshold,
          // @ts-expect-error
          trackVisibility,
          delay,
        },
        fallbackInView,
      );

      return () => {
        if (unobserve) {
          unobserve();
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      Array.isArray(threshold) ? threshold.toString() : threshold,
      ref,
      root,
      rootMargin,
      triggerOnce,
      skip,
      trackVisibility,
      fallbackInView,
      delay,
    ],
  );

  const entryTarget = state.entry?.target;
  const previousEntryTarget = React.useRef<Element | undefined>(undefined);
  if (
    !ref &&
    entryTarget &&
    !triggerOnce &&
    !skip &&
    previousEntryTarget.current !== entryTarget
  ) {
    previousEntryTarget.current = entryTarget;
    setState({
      inView: !!initialInView,
      entry: undefined,
    });
    lastInViewRef.current = initialInView;
  }

  const result = [setRef, state.inView, state.entry] as InViewHookResponse;

  result.ref = result[0];
  result.inView = result[1];
  result.entry = result[2];

  return result;
}