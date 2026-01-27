import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface EditorState {
  text: string;
  showLinkPreview: boolean;
}

const initialState: EditorState = {
  text: '',
  showLinkPreview: false,
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setText(state, action: PayloadAction<string>) {
      state.text = action.payload;
    },
    setShowLinkPreview(state, action: PayloadAction<boolean>) {
      state.showLinkPreview = action.payload;
    },
    reset(state) {
      state.text = '';
      state.showLinkPreview = false;
    },
  },
});

export const { setText, setShowLinkPreview, reset: resetEditor } = editorSlice.actions;
export default editorSlice.reducer;
