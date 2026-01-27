import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  showPreviewModal: boolean;
  showMobileSettings: boolean;
  showDraftsModal: boolean;
  showTemplatesModal: boolean;
  showReplyModal: boolean;
  showDatePickerModal: boolean;
  replyChannelId: number | null;
  
  isPublishing: boolean;
  isSavingDraft: boolean;
  isScheduling: boolean;
  isSavingTemplate: boolean;
  isLoadingAi: boolean;
}

const initialState: UiState = {
  showPreviewModal: false,
  showMobileSettings: false,
  showDraftsModal: false,
  showTemplatesModal: false,
  showReplyModal: false,
  showDatePickerModal: false,
  replyChannelId: null,
  
  isPublishing: false,
  isSavingDraft: false,
  isScheduling: false,
  isSavingTemplate: false,
  isLoadingAi: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setShowPreviewModal(state, action: PayloadAction<boolean>) {
      state.showPreviewModal = action.payload;
    },
    setShowMobileSettings(state, action: PayloadAction<boolean>) {
      state.showMobileSettings = action.payload;
    },
    setShowDraftsModal(state, action: PayloadAction<boolean>) {
      state.showDraftsModal = action.payload;
    },
    setShowTemplatesModal(state, action: PayloadAction<boolean>) {
      state.showTemplatesModal = action.payload;
    },
    setShowReplyModal(state, action: PayloadAction<boolean>) {
      state.showReplyModal = action.payload;
    },
    setShowDatePickerModal(state, action: PayloadAction<boolean>) {
      state.showDatePickerModal = action.payload;
    },
    setReplyChannelId(state, action: PayloadAction<number | null>) {
      state.replyChannelId = action.payload;
    },
    
    setIsPublishing(state, action: PayloadAction<boolean>) {
      state.isPublishing = action.payload;
    },
    setIsSavingDraft(state, action: PayloadAction<boolean>) {
      state.isSavingDraft = action.payload;
    },
    setIsScheduling(state, action: PayloadAction<boolean>) {
      state.isScheduling = action.payload;
    },
    setIsSavingTemplate(state, action: PayloadAction<boolean>) {
      state.isSavingTemplate = action.payload;
    },
    setIsLoadingAi(state, action: PayloadAction<boolean>) {
      state.isLoadingAi = action.payload;
    },
    
    reset(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setShowPreviewModal,
  setShowMobileSettings,
  setShowDraftsModal,
  setShowTemplatesModal,
  setShowReplyModal,
  setShowDatePickerModal,
  setReplyChannelId,
  setIsPublishing,
  setIsSavingDraft,
  setIsScheduling,
  setIsSavingTemplate,
  setIsLoadingAi,
  reset: resetUi,
} = uiSlice.actions;

export default uiSlice.reducer;
