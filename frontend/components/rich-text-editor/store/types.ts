'use client';

export type FormatType = 'b' | 'i' | 's' | 'u' | 'tg-spoiler' | 'code';

export type RichTextEditorState = {
  content: string;
  activeFormats: Set<string>;
  hoveredButton: string | null;
  isEmpty: boolean;
  charCount: number;
};

export type RichTextEditorData = {
  content: string;
  htmlContent: string;
  textContent: string;
  hasFormatting: boolean;
};

export type RichTextEditorAction =
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_ACTIVE_FORMATS'; payload: Set<string> }
  | { type: 'SET_HOVERED_BUTTON'; payload: string | null }
  | { type: 'SET_IS_EMPTY'; payload: boolean }
  | { type: 'SET_CHAR_COUNT'; payload: number }
  | { type: 'RESET' };

export const initialState: RichTextEditorState = {
  content: '',
  activeFormats: new Set<string>(),
  hoveredButton: null,
  isEmpty: true,
  charCount: 0,
};
