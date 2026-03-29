import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InlineKeyboard } from '@/types/post';
import type { BotCommandScope } from './list';

interface FormState {
  isOpen: boolean;
  editingId: number | null;
  command: string;
  description: string;
  responseText: string;
  responseMediaType: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  responseMediaUrls: string[];
  responseButtons: InlineKeyboard | null;
  scope: Exclude<BotCommandScope, null>;
  isActive: boolean;
  isSubmitting: boolean;
}

const initialState: FormState = {
  isOpen: false,
  editingId: null,
  command: '',
  description: '',
  responseText: '',
  responseMediaType: 'TEXT',
  responseMediaUrls: [],
  responseButtons: null,
  scope: 'GROUPS',
  isActive: true,
  isSubmitting: false,
};

const formSlice = createSlice({
  name: 'botCommandForm',
  initialState,
  reducers: {
    openCreate(state) {
      Object.assign(state, { ...initialState, isOpen: true });
    },
    openEdit(
      state,
      action: PayloadAction<{
        id: number;
        command: string;
        description?: string | null;
        responseText: string;
        responseMediaType: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
        responseMediaUrls?: string[];
        responseMediaUrl?: string | null;
        responseButtons?: InlineKeyboard | null;
        scope: BotCommandScope;
        isActive: boolean;
      }>,
    ) {
      const p = action.payload;
      const urls = p.responseMediaUrls?.length
        ? [...p.responseMediaUrls]
        : p.responseMediaUrl
          ? [p.responseMediaUrl]
          : [];
      state.isOpen = true;
      state.editingId = p.id;
      state.command = p.command;
      state.description = p.description ?? '';
      state.responseText = p.responseText;
      state.responseMediaType = p.responseMediaType;
      state.responseMediaUrls = urls;
      state.responseButtons = p.responseButtons ?? null;
      state.scope = (p.scope === 'PRIVATE' || p.scope === 'GROUPS' || p.scope === 'ALL' ? p.scope : 'GROUPS') as Exclude<
        BotCommandScope,
        null
      >;
      state.isActive = p.isActive;
      state.isSubmitting = false;
    },
    close(state) {
      state.isOpen = false;
    },
    resetForm(state) {
      Object.assign(state, initialState);
    },
    setCommand(state, action: PayloadAction<string>) {
      state.command = action.payload;
    },
    setDescription(state, action: PayloadAction<string>) {
      state.description = action.payload;
    },
    setResponseText(state, action: PayloadAction<string>) {
      state.responseText = action.payload;
    },
    setResponseMediaType(state, action: PayloadAction<'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT'>) {
      state.responseMediaType = action.payload;
    },
    setScope(state, action: PayloadAction<Exclude<BotCommandScope, null>>) {
      state.scope = action.payload;
    },
    setIsActive(state, action: PayloadAction<boolean>) {
      state.isActive = action.payload;
    },
    setIsSubmitting(state, action: PayloadAction<boolean>) {
      state.isSubmitting = action.payload;
    },
  },
});

export const {
  openCreate,
  openEdit,
  close,
  resetForm,
  setCommand,
  setDescription,
  setResponseText,
  setResponseMediaType,
  setScope,
  setIsActive,
  setIsSubmitting,
} = formSlice.actions;

export default formSlice.reducer;
