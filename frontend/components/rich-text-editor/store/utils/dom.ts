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

export function getCaretCharacterOffsetWithin(element: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer)) return null;

  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

export function setCaretCharacterOffsetWithin(element: HTMLElement, offset: number): void {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);

  let remaining = offset;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const len = textNode.nodeValue?.length ?? 0;
    if (remaining <= len) {
      range.setStart(textNode, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= len;
  }

  // Если offset больше длины текста — ставим курсор в конец
  selection.removeAllRanges();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.addRange(range);
}
