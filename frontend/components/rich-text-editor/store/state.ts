import type { RichTextEditorAction, RichTextEditorState } from './types';

export const initialRichTextEditorState: RichTextEditorState = {
  showAiInput: false,
  showEmojiPicker: false,
  showLinkInput: false,
  hoveredButton: null,
  selectedText: '',
  selectionRange: null,
  linkUrl: '',
};

export function richTextEditorReducer(
  state: RichTextEditorState,
  action: RichTextEditorAction,
): RichTextEditorState {
  switch (action.type) {
    case 'SET_HOVERED_BUTTON':
      return { ...state, hoveredButton: action.payload };
    case 'SET_SHOW_AI_INPUT':
      return { ...state, showAiInput: action.payload };
    case 'SET_SHOW_EMOJI_PICKER':
      return { ...state, showEmojiPicker: action.payload };
    case 'SET_SHOW_LINK_INPUT':
      return { ...state, showLinkInput: action.payload };
    case 'SET_SELECTED_TEXT':
      return { ...state, selectedText: action.payload };
    case 'SET_SELECTION_RANGE':
      return { ...state, selectionRange: action.payload };
    case 'SET_LINK_URL':
      return { ...state, linkUrl: action.payload };
    case 'RESET_AI_CONTEXT':
      return { ...state, showAiInput: false, selectedText: '', selectionRange: null };
    default:
      return state;
  }
}
