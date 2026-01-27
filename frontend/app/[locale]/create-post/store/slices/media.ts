import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { MediaFile } from '../types';

interface MediaState {
  files: MediaFile[];
}

const initialState: MediaState = {
  files: [],
};

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    addFiles(state, action: PayloadAction<MediaFile[]>) {
      const maxFiles = 10;
      const remaining = maxFiles - state.files.length;
      const toAdd = action.payload.slice(0, remaining);
      state.files.push(...toAdd);
    },
    removeFile(state, action: PayloadAction<string>) {
      state.files = state.files.filter(f => f.id !== action.payload);
    },
    setFiles(state, action: PayloadAction<MediaFile[]>) {
      state.files = action.payload;
    },
    moveFile(state, action: PayloadAction<{ sourceId: string; targetId: string }>) {
      const { sourceId, targetId } = action.payload;
      if (sourceId === targetId) return;
      const sourceIndex = state.files.findIndex(f => f.id === sourceId);
      const targetIndex = state.files.findIndex(f => f.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return;
      const [moved] = state.files.splice(sourceIndex, 1);
      state.files.splice(targetIndex, 0, moved);
    },
    toggleBlur(state, action: PayloadAction<string>) {
      const file = state.files.find(f => f.id === action.payload);
      if (file) {
        file.blur = !file.blur;
      }
    },
    clearFiles(state) {
      state.files = [];
    },
  },
});

export const { addFiles, removeFile, setFiles, moveFile, toggleBlur, clearFiles } = mediaSlice.actions;
export default mediaSlice.reducer;
