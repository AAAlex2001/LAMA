/**
 * Форматирование базовых стилей (bold, italic, strikethrough, underline)
 */

export type BasicFormat = 'bold' | 'italic' | 'strikeThrough' | 'underline';

export function applyBasicFormat(format: BasicFormat): void {
  document.execCommand(format, false);
}

export function toggleBasicFormat(format: BasicFormat): void {
  applyBasicFormat(format);
}
