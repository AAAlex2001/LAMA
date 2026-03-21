import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { BackupMode } from '@/types/channel';

interface BackupState {
  copyEnabled: boolean;
  saveArchive: boolean;
  selectedTargets: number[];
  postTypes: string[];
  contentTypes: string[];
  aiPrompt: string;
  saving: boolean;
  error: string | null;
}

const initialState: BackupState = {
  copyEnabled: false,
  saveArchive: false,
  selectedTargets: [],
  postTypes: ['with_buttons', 'with_attachments', 'text_posts'],
  contentTypes: [],
  aiPrompt: '',
  saving: false,
  error: null,
};

const backupSlice = createSlice({
  name: 'backup',
  initialState,
  reducers: {
    initFromChannel(state, action: PayloadAction<{
      backupMode: BackupMode;
      backupTargetIds: number[] | null;
      postTypes: string[] | null;
      contentTypes: string[] | null;
      aiPrompt: string | null;
    }>) {
      const { backupMode, backupTargetIds, postTypes, contentTypes, aiPrompt } = action.payload;
      state.copyEnabled = backupMode === 'INSTANT';
      state.selectedTargets = backupTargetIds ?? [];
      state.postTypes = postTypes ?? ['with_buttons', 'with_attachments', 'text_posts'];
      state.contentTypes = contentTypes ?? [];
      state.aiPrompt = aiPrompt ?? '';
    },
    setCopyEnabled(state, action: PayloadAction<boolean>) {
      state.copyEnabled = action.payload;
      if (!action.payload) {
        state.selectedTargets = [];
      }
    },
    setSaveArchive(state, action: PayloadAction<boolean>) {
      state.saveArchive = action.payload;
    },
    setSelectedTargets(state, action: PayloadAction<number[]>) {
      state.selectedTargets = action.payload;
    },
    toggleTarget(state, action: PayloadAction<number>) {
      const id = action.payload;
      const idx = state.selectedTargets.indexOf(id);
      if (idx >= 0) {
        state.selectedTargets.splice(idx, 1);
      } else {
        state.selectedTargets.push(id);
      }
    },
    togglePostType(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.postTypes.indexOf(id);
      if (idx >= 0) {
        state.postTypes.splice(idx, 1);
      } else {
        state.postTypes.push(id);
      }
    },
    toggleContentType(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.contentTypes.indexOf(id);
      if (idx >= 0) {
        state.contentTypes.splice(idx, 1);
      } else {
        state.contentTypes.push(id);
      }
    },
    setAiPrompt(state, action: PayloadAction<string>) {
      state.aiPrompt = action.payload;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.saving = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  initFromChannel,
  setCopyEnabled,
  setSaveArchive,
  setSelectedTargets,
  toggleTarget,
  togglePostType,
  toggleContentType,
  setAiPrompt,
  setSaving,
  setError,
} = backupSlice.actions;

export default backupSlice.reducer;
