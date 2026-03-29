import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InlineKeyboard } from '@/types/post';

interface FormState {
  isOpen: boolean;
  editingId: number | null;
  keywords: string[];
  responseText: string;
  responseMediaType: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  responseMediaUrls: string[];
  responseButtons: InlineKeyboard | null;
  scope: 'PRIVATE' | 'GROUPS';
  isActive: boolean;
  isSubmitting: boolean;
  frequencyLimitEnabled: boolean;
  frequencyLimitType: 'per_user' | 'per_group';
  frequencyLimitMinutes: number;
}

const initialState: FormState = {
  isOpen: false,
  editingId: null,
  keywords: [],
  responseText: '',
  responseMediaType: 'TEXT',
  responseMediaUrls: [],
  responseButtons: null,
  scope: 'GROUPS',
  isActive: true,
  isSubmitting: false,
  frequencyLimitEnabled: false,
  frequencyLimitType: 'per_user',
  frequencyLimitMinutes: 1,
};

const formSlice = createSlice({
  name: 'autoReplyForm',
  initialState,
  reducers: {
    openCreate(state) {
      Object.assign(state, { ...initialState, isOpen: true });
    },
    openEdit(state, action: PayloadAction<{
      id: number;
      keywords: string[];
      responseText: string;
      responseMediaType: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
      responseMediaUrls?: string[];
      responseButtons?: InlineKeyboard | null;
      scope: 'PRIVATE' | 'GROUPS';
      isActive: boolean;
    }>) {
      const p = action.payload;
      state.isOpen = true;
      state.editingId = p.id;
      state.keywords = [...p.keywords];
      state.responseText = p.responseText;
      state.responseMediaType = p.responseMediaType;
      state.responseMediaUrls = p.responseMediaUrls ?? [];
      state.responseButtons = p.responseButtons ?? null;
      state.scope = p.scope;
      state.isActive = p.isActive;
      state.isSubmitting = false;
    },
    close(state) {
      state.isOpen = false;
    },
    resetForm(state) {
      Object.assign(state, initialState);
    },
    setKeyword(state, action: PayloadAction<{ index: number; value: string }>) {
      state.keywords[action.payload.index] = action.payload.value;
    },
    addKeyword(state) {
      state.keywords.push('');
    },
    removeKeyword(state, action: PayloadAction<number>) {
      state.keywords = state.keywords.filter((_, i) => i !== action.payload);
    },
    addKeywords(state, action: PayloadAction<string[]>) {
      state.keywords.push(...action.payload);
    },
    setResponseText(state, action: PayloadAction<string>) {
      state.responseText = action.payload;
    },
    setResponseMediaType(state, action: PayloadAction<'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT'>) {
      state.responseMediaType = action.payload;
    },
    setScope(state, action: PayloadAction<'PRIVATE' | 'GROUPS'>) {
      state.scope = action.payload;
    },
    setIsActive(state, action: PayloadAction<boolean>) {
      state.isActive = action.payload;
    },
    setIsSubmitting(state, action: PayloadAction<boolean>) {
      state.isSubmitting = action.payload;
    },
    setFrequencyLimitEnabled(state, action: PayloadAction<boolean>) {
      state.frequencyLimitEnabled = action.payload;
    },
    setFrequencyLimitType(state, action: PayloadAction<'per_user' | 'per_group'>) {
      state.frequencyLimitType = action.payload;
    },
    setFrequencyLimitMinutes(state, action: PayloadAction<number>) {
      state.frequencyLimitMinutes = action.payload;
    },
  },
});

export const {
  openCreate,
  openEdit,
  close,
  resetForm,
  setKeyword,
  addKeyword,
  removeKeyword,
  addKeywords,
  setResponseText,
  setResponseMediaType,
  setScope,
  setIsActive,
  setIsSubmitting,
  setFrequencyLimitEnabled,
  setFrequencyLimitType,
  setFrequencyLimitMinutes,
} = formSlice.actions;

export default formSlice.reducer;
