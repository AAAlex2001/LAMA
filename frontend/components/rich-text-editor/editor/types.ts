export type TextFormat = 'bold' | 'italic' | 'underline' | 'strike' | 'monospace' | 'code' | 'spoiler';

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  monospace: boolean;
  spoiler: boolean;
}

export interface EditorState {
  html: string;
  text: string;
  charCount: number;
  isEmpty: boolean;
  hasSelection: boolean;
  formats: ActiveFormats;
  isInCodeBlock: boolean;
  codeBlockLanguage: string | null;
}
