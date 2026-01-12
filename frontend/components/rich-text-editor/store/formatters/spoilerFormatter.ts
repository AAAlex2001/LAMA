/**
 * Форматирование spoiler (скрытого текста)
 */

import { getCurrentRange, setRange, createZeroWidthSpace, findParentElement, unwrapElement } from '../utils/dom';

export function applySpoilerFormat(
  editorElement: HTMLElement,
  className?: string,
  onFormatsChange?: (hasActiveFormat: boolean) => void
): void {
  const range = getCurrentRange();
  if (!range) return;

  const findSpoiler = (node: Node | null): HTMLElement | null => {
    return findParentElement(
      node,
      (el) => el.getAttribute('data-spoiler') === 'true',
      editorElement
    ) as HTMLElement | null;
  };

  const spoilerAtCaret = findSpoiler(range.commonAncestorContainer);

  // Курсор без выделения
  if (range.collapsed) {
    if (spoilerAtCaret) {
      // Выходим из spoiler
      const zwsp = createZeroWidthSpace();
      if (spoilerAtCaret.nextSibling) {
        spoilerAtCaret.parentNode?.insertBefore(zwsp, spoilerAtCaret.nextSibling);
      } else {
        spoilerAtCaret.parentNode?.appendChild(zwsp);
      }

      const r = document.createRange();
      r.setStartAfter(zwsp);
      r.collapse(true);
      setRange(r);

      onFormatsChange?.(false);
      return;
    }

    // Создаём новый spoiler
    const wrapper = document.createElement('span');
    if (className) wrapper.className = className;
    wrapper.setAttribute('data-spoiler', 'true');

    const zwsp = createZeroWidthSpace();
    wrapper.appendChild(zwsp);
    range.insertNode(wrapper);

    const r = document.createRange();
    r.setStart(zwsp, 1);
    r.collapse(true);
    setRange(r);

    onFormatsChange?.(true);
    return;
  }

  // Есть выделение
  const spoilers = Array.from(editorElement.querySelectorAll('span[data-spoiler="true"]'));
  const intersecting = spoilers.filter((el) => {
    try {
      return range.intersectsNode(el);
    } catch {
      return false;
    }
  });

  if (intersecting.length > 0) {
    // Убираем spoiler с выделенного текста
    intersecting.forEach(unwrapElement);
    onFormatsChange?.(false);
    return;
  }

  // Оборачиваем выделенный текст в spoiler
  const wrapper = document.createElement('span');
  if (className) wrapper.className = className;
  wrapper.setAttribute('data-spoiler', 'true');

  const contents = range.extractContents();
  wrapper.appendChild(contents);
  range.insertNode(wrapper);

  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  setRange(newRange);

  onFormatsChange?.(true);
}
