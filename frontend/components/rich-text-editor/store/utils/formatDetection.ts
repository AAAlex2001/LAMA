/**
 * Утилиты для определения активных форматов
 */

export function isFormatActive(format: 'bold' | 'italic' | 'strikeThrough' | 'underline'): boolean {
  return document.queryCommandState(format);
}

export function isSpoilerActive(root: Element): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const range = sel.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  while (node && node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.getAttribute('data-spoiler') === 'true') {
        return true;
      }
    }
    node = node.parentNode;
  }

  return false;
}

export function isCodeActive(root: Element): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const range = sel.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  while (node && node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.tagName.toLowerCase() === 'code') {
        return true;
      }
    }
    node = node.parentNode;
  }

  return false;
}
