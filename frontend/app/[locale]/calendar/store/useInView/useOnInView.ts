import * as React from "react";
import type {
  IntersectionChangeEffect,
  IntersectionEffectOptions,
} from "./index.ts";
import { observe } from "./observe";

const useSyncEffect = (("useInsertionEffect" in React
  ? (React as typeof React & { useInsertionEffect: typeof React.useEffect })
      .useInsertionEffect
  : undefined) ??
  React.useLayoutEffect ??
  React.useEffect) as typeof React.useEffect;

export const useOnInView = <TElement extends Element>(
  onIntersectionChange: IntersectionChangeEffect<TElement>,
  {
    threshold,
    root,
    rootMargin,
    trackVisibility,
    delay,
    triggerOnce,
    skip,
  }: IntersectionEffectOptions = {},
) => {
  const onIntersectionChangeRef = React.useRef(onIntersectionChange);
  const observedElementRef = React.useRef<TElement | null>(null);
  const observerCleanupRef = React.useRef<(() => void) | undefined>(undefined);
  const lastInViewRef = React.useRef<boolean | undefined>(undefined);

  useSyncEffect(() => {
    onIntersectionChangeRef.current = onIntersectionChange;
  }, [onIntersectionChange]);

  return React.useCallback(
    (element: TElement | undefined | null) => {
      const cleanupExisting = () => {
        if (observerCleanupRef.current) {
          const cleanup = observerCleanupRef.current;
          observerCleanupRef.current = undefined;
          cleanup();
        }
      };

      if (element === observedElementRef.current) {
        return observerCleanupRef.current;
      }

      if (!element || skip) {
        cleanupExisting();
        observedElementRef.current = null;
        lastInViewRef.current = undefined;
        return;
      }

      cleanupExisting();

      observedElementRef.current = element;
      let destroyed = false;

      const destroyObserver = observe(
        element,
        (inView: boolean, entry: IntersectionObserverEntry) => {
          const previousInView = lastInViewRef.current;
          lastInViewRef.current = inView;

          if (previousInView === undefined && !inView) {
            return;
          }

          onIntersectionChangeRef.current(
            inView,
            entry as IntersectionObserverEntry & { target: TElement },
          );
          if (triggerOnce && inView) {
            stopObserving();
          }
        },
        {
          threshold,
          root,
          rootMargin,
          trackVisibility,
          delay,
        } as IntersectionObserverInit,
      );

      function stopObserving() {
        if (destroyed) return;
        destroyed = true;
        destroyObserver();
        observedElementRef.current = null;
        observerCleanupRef.current = undefined;
        lastInViewRef.current = undefined;
      }

      observerCleanupRef.current = stopObserving;

      return observerCleanupRef.current;
    },
    [
      Array.isArray(threshold) ? threshold.toString() : threshold,
      root,
      rootMargin,
      trackVisibility,
      delay,
      triggerOnce,
      skip,
    ],
  );
};