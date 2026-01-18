export type TextFormat = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'spoiler';

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  spoiler: boolean;
}

export interface EditorState {
  html: string;
  text: string;
  charCount: number;
  isEmpty: boolean;
  hasSelection: boolean;
  formats: ActiveFormats;
}
