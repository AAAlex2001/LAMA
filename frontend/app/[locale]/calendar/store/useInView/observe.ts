import type { ObserverInstanceCallback } from "./index.ts";

const observerMap = new Map<
  string,
  {
    id: string;
    observer: IntersectionObserver;
    elements: Map<Element, Array<ObserverInstanceCallback>>;
  }
>();

const RootIds: WeakMap<Element | Document, string> = new WeakMap();
let rootId = 0;

let unsupportedValue: boolean | undefined;

export function defaultFallbackInView(inView: boolean | undefined) {
  unsupportedValue = inView;
}

function getRootId(root: IntersectionObserverInit["root"]) {
  if (!root) return "0";
  if (RootIds.has(root)) return RootIds.get(root);
  rootId += 1;
  RootIds.set(root, rootId.toString());
  return RootIds.get(root);
}

export function optionsToId(options: IntersectionObserverInit) {
  return Object.keys(options)
    .sort()
    .filter(
      (key) => options[key as keyof IntersectionObserverInit] !== undefined,
    )
    .map((key) => {
      return `${key}_${
        key === "root"
          ? getRootId(options.root)
          : options[key as keyof IntersectionObserverInit]
      }`;
    })
    .toString();
}

function createObserver(options: IntersectionObserverInit) {
  const id = optionsToId(options);
  let instance = observerMap.get(id);

  if (!instance) {
    const elements = new Map<Element, Array<ObserverInstanceCallback>>();
    let thresholds: number[] | readonly number[];

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const inView =
          entry.isIntersecting &&
          thresholds.some((threshold) => entry.intersectionRatio >= threshold);

        // @ts-expect-error support IntersectionObserver v2
        if (options.trackVisibility && typeof entry.isVisible === "undefined") {
          // @ts-expect-error
          entry.isVisible = inView;
        }

        [...(elements.get(entry.target) ?? [])].forEach((callback) => {
          callback(inView, entry);
        });
      });
    }, options);

    thresholds =
      observer.thresholds ||
      (Array.isArray(options.threshold)
        ? options.threshold
        : [options.threshold || 0]);

    instance = {
      id,
      observer,
      elements,
    };

    observerMap.set(id, instance);
  }

  return instance;
}

export function observe(
  element: Element,
  callback: ObserverInstanceCallback,
  options: IntersectionObserverInit = {},
  fallbackInView = unsupportedValue,
) {
  if (
    typeof window.IntersectionObserver === "undefined" &&
    fallbackInView !== undefined
  ) {
    const bounds = element.getBoundingClientRect();
    callback(fallbackInView, {
      isIntersecting: fallbackInView,
      target: element,
      intersectionRatio:
        typeof options.threshold === "number" ? options.threshold : 0,
      time: 0,
      boundingClientRect: bounds,
      intersectionRect: bounds,
      rootBounds: bounds,
    });
    return () => {};
  }
  const { id, observer, elements } = createObserver(options);

  const callbacks = elements.get(element) || [];
  if (!elements.has(element)) {
    elements.set(element, callbacks);
  }

  callbacks.push(callback);
  observer.observe(element);

  return function unobserve() {
    callbacks.splice(callbacks.indexOf(callback), 1);

    if (callbacks.length === 0) {
      elements.delete(element);
      observer.unobserve(element);
    }

    if (elements.size === 0) {
      observer.disconnect();
      observerMap.delete(id);
    }
  };
}