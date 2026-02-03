export type SelectionRange = { from: number; to: number };

export type RichTextEditorHoveredButton =
  | 'ai'
  | 'emoji'
  | 'quote'
  | 'link'
  | 'templates'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'underline'
  | 'monospace'
  | 'code'
  | 'spoiler'
  | null;

export interface RichTextEditorState {
  showAiInput: boolean;
  showEmojiPicker: boolean;
  showLinkInput: boolean;

  hoveredButton: RichTextEditorHoveredButton;

  selectedText: string;
  selectionRange: SelectionRange | null;

  linkUrl: string;
}

export type RichTextEditorAction =
  | { type: 'SET_HOVERED_BUTTON'; payload: RichTextEditorHoveredButton }
  | { type: 'SET_SHOW_AI_INPUT'; payload: boolean }
  | { type: 'SET_SHOW_EMOJI_PICKER'; payload: boolean }
  | { type: 'SET_SHOW_LINK_INPUT'; payload: boolean }
  | { type: 'SET_SELECTED_TEXT'; payload: string }
  | { type: 'SET_SELECTION_RANGE'; payload: SelectionRange | null }
  | { type: 'SET_LINK_URL'; payload: string }
  | { type: 'RESET_AI_CONTEXT' };
