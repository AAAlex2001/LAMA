import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { InviteLinkData } from '../../components/CreateInviteLinkModal';

export type ModalStep = 'form' | 'confirm';

export interface CreateInviteLinkModalState {
  isOpen: boolean;
  step: ModalStep;
  
  channelSearch: string;
  selectedChannelId: string;
  linkName: string;
  hasLimit: boolean;
  limitCount: string;
  linkType: 'open' | 'closed';
  validityPeriod: 'indefinite' | 'date';
  expirationDate: string | null;
  expirationHours: number;
  expirationMinutes: number;
  loginMethod: 'direct' | 'bot';
  joiningText: string;
  applicationMethod: 'direct' | 'bot';
  hasCaptcha: boolean;
  
  previewData: InviteLinkData | null;
  
  editingLinkId: number | null;
  editingChannelId: number | null;
}

const initialState: CreateInviteLinkModalState = {
  isOpen: false,
  step: 'form',
  channelSearch: '',
  selectedChannelId: '',
  linkName: '',
  hasLimit: false,
  limitCount: '',
  linkType: 'open',
  validityPeriod: 'indefinite',
  expirationDate: null,
  expirationHours: 0,
  expirationMinutes: 20,
  loginMethod: 'direct',
  joiningText: '',
  applicationMethod: 'direct',
  hasCaptcha: false,
  previewData: null,
  editingLinkId: null,
  editingChannelId: null,
};

const createInviteLinkModalSlice = createSlice({
  name: 'createInviteLinkModal',
  initialState,
  reducers: {
    setModalOpen(state, action: PayloadAction<boolean>) {
      state.isOpen = action.payload;
      if (!action.payload) {
        Object.assign(state, {
          ...initialState,
          isOpen: false,
        });
      }
    },
    
    setStep(state, action: PayloadAction<ModalStep>) {
      state.step = action.payload;
    },
    
    setChannelSearch(state, action: PayloadAction<string>) {
      state.channelSearch = action.payload;
    },
    
    setSelectedChannelId(state, action: PayloadAction<string>) {
      state.selectedChannelId = action.payload;
    },
    
    setLinkName(state, action: PayloadAction<string>) {
      state.linkName = action.payload;
    },
    
    setHasLimit(state, action: PayloadAction<boolean>) {
      state.hasLimit = action.payload;
    },
    
    setLimitCount(state, action: PayloadAction<string>) {
      state.limitCount = action.payload;
    },
    
    setLinkType(state, action: PayloadAction<'open' | 'closed'>) {
      state.linkType = action.payload;
    },
    
    setValidityPeriod(state, action: PayloadAction<'indefinite' | 'date'>) {
      state.validityPeriod = action.payload;
    },
    
    setExpirationDate(state, action: PayloadAction<string | null>) {
      state.expirationDate = action.payload;
    },
    
    setExpirationHours(state, action: PayloadAction<number>) {
      state.expirationHours = action.payload;
    },
    
    setExpirationMinutes(state, action: PayloadAction<number>) {
      state.expirationMinutes = action.payload;
    },
    
    
    setLoginMethod(state, action: PayloadAction<'direct' | 'bot'>) {
      state.loginMethod = action.payload;
    },
    
    setJoiningText(state, action: PayloadAction<string>) {
      state.joiningText = action.payload;
    },
    
    setApplicationMethod(state, action: PayloadAction<'direct' | 'bot'>) {
      state.applicationMethod = action.payload;
    },
    
    setHasCaptcha(state, action: PayloadAction<boolean>) {
      state.hasCaptcha = action.payload;
    },
    
    setPreviewData(state, action: PayloadAction<InviteLinkData | null>) {
      state.previewData = action.payload;
    },
    
    setEditingLinkIds(state, action: PayloadAction<{ linkId: number; channelId: number } | null>) {
      if (action.payload) {
        state.editingLinkId = action.payload.linkId;
        state.editingChannelId = action.payload.channelId;
      } else {
        state.editingLinkId = null;
        state.editingChannelId = null;
      }
    },
    
    populateFormFromInviteLink(state, action: PayloadAction<{
      channel_id?: number;
      name?: string;
      creates_join_request?: boolean;
      member_limit?: number;
      expire_date?: string | null;
      protection_type?: string | null;
      entry_method?: string | null;
    }>) {
      const inviteLink = action.payload;
      
      if (inviteLink.channel_id) {
        state.selectedChannelId = inviteLink.channel_id.toString();
      }
      
      if (inviteLink.name) {
        state.linkName = inviteLink.name;
      }
      
      if (inviteLink.creates_join_request !== undefined) {
        state.linkType = inviteLink.creates_join_request ? 'closed' : 'open';
      }
      
      if (inviteLink.member_limit !== undefined && inviteLink.member_limit > 0) {
        state.hasLimit = true;
        state.limitCount = inviteLink.member_limit.toString();
      } else {
        state.hasLimit = false;
        state.limitCount = '';
      }
      
      if (inviteLink.expire_date) {
        state.validityPeriod = 'date';
        const parsedDate = new Date(inviteLink.expire_date);
        if (!isNaN(parsedDate.getTime())) {
          state.expirationDate = parsedDate.toISOString();
          state.expirationHours = parsedDate.getHours();
          state.expirationMinutes = parsedDate.getMinutes();
        }
      } else {
        state.validityPeriod = 'indefinite';
        state.expirationDate = null;
      }

      if (inviteLink.protection_type === 'captcha') {
        state.hasCaptcha = true;
      } else {
        state.hasCaptcha = false;
      }

      if (inviteLink.entry_method) {
        const method = inviteLink.entry_method as 'direct' | 'bot';
        state.loginMethod = method;
        state.applicationMethod = method;
      }
    },
    
    resetForm(state) {
      Object.assign(state, {
        ...initialState,
        isOpen: state.isOpen,
      });
    },
    
    buildPreviewData(state) {
      const previewData: InviteLinkData = {
        channelId: state.selectedChannelId,
        linkName: state.linkName,
        hasLimit: state.hasLimit,
        limitCount: state.hasLimit ? parseInt(state.limitCount) : undefined,
        linkType: state.linkType,
        validityPeriod: state.validityPeriod,
        expirationDate: state.validityPeriod === 'date' && state.expirationDate ? state.expirationDate : undefined,
        expirationHours: state.validityPeriod === 'date' ? state.expirationHours : undefined,
        expirationMinutes: state.validityPeriod === 'date' ? state.expirationMinutes : undefined,
        loginMethod: state.linkType === 'open' ? state.loginMethod : undefined,
        joiningText: state.linkType === 'closed' ? state.joiningText : undefined,
        applicationMethod: state.linkType === 'closed' ? state.applicationMethod : undefined,
        hasCaptcha: state.linkType === 'closed' ? state.hasCaptcha : undefined,
      };
      state.previewData = previewData;
    },
  },
});

export const {
  setModalOpen,
  setStep,
  setChannelSearch,
  setSelectedChannelId,
  setLinkName,
  setHasLimit,
  setLimitCount,
  setLinkType,
  setValidityPeriod,
  setExpirationDate,
  setExpirationHours,
  setExpirationMinutes,
  setLoginMethod,
  setJoiningText,
  setApplicationMethod,
  setHasCaptcha,
  setPreviewData,
  setEditingLinkIds,
  populateFormFromInviteLink,
  resetForm,
  buildPreviewData,
} = createInviteLinkModalSlice.actions;

export default createInviteLinkModalSlice.reducer;
