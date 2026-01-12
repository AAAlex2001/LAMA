/**
 * Форматирование code (моноширинного текста)
 */

import { getCurrentRange, setRange, findParentElement } from '../utils/dom';

export function applyCodeFormat(editorElement: HTMLElement): void {
  const range = getCurrentRange();
  if (!range || range.collapsed) return;

  const findCode = (node: Node | null): Element | null => {
    return findParentElement(
      node,
      (el) => el.tagName.toLowerCase() === 'code',
      editorElement
    );
  };

  const existingCode = findCode(range.commonAncestorContainer);

  if (existingCode) {
    // Убираем code форматирование
    const text = existingCode.textContent || '';
    const textNode = document.createTextNode(text);
    existingCode.parentNode?.replaceChild(textNode, existingCode);
  } else {
    // Добавляем code форматирование
    const wrapper = document.createElement('code');
    const contents = range.extractContents();
    wrapper.appendChild(contents);
    range.insertNode(wrapper);

    // Добавляем <br> после code для возможности продолжить печатать
    const br = document.createElement('br');
    if (wrapper.nextSibling) {
      wrapper.parentNode?.insertBefore(br, wrapper.nextSibling);
    } else {
      wrapper.parentNode?.appendChild(br);
    }

    range.setStartAfter(br);
    range.setEndAfter(br);
    setRange(range);
  }
}
