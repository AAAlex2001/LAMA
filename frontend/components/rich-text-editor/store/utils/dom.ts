/**
 * Утилиты для работы с DOM
 */

export function getSelection(): Selection | null {
  return window.getSelection();
}

export function getCurrentRange(): Range | null {
  const sel = getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return sel.getRangeAt(0);
}

export function setRange(range: Range): void {
  const sel = getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

export function setCursorAfter(node: Node): void {
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  setRange(range);
}

export function setCursorAtEnd(element: Element): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  setRange(range);
}

export function findParentElement(
  start: Node | null,
  predicate: (el: Element) => boolean,
  root: Element
): Element | null {
  let current = start;
  if (current?.nodeType === Node.TEXT_NODE) {
    current = current.parentNode;
  }

  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      if (predicate(el)) return el;
    }
    current = current.parentNode;
  }

  return null;
}

export function unwrapElement(el: Element): void {
  const fragment = document.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.firstChild);
  }
  el.parentNode?.replaceChild(fragment, el);
}

export function createZeroWidthSpace(): Text {
  return document.createTextNode('\u200B');
}
