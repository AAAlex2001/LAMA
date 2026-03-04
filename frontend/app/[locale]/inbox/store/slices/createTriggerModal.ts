import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TriggerType, ActionType, ChatType } from './triggers';

export type TriggerTypeEnum = 
  | 'JOIN_REQUEST_CREATED'
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_REJECTED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'CAPTCHA_PASSED'
  | 'CAPTCHA_FAILED'
  | 'USER_MESSAGE'
  | 'COMMAND_CALLED';

export type ActionTypeEnum = 
  | 'SEND_MESSAGE'
  | 'SEND_MEDIA'
  | 'ADD_TO_GROUP'
  | 'REMOVE_FROM_GROUP'
  | 'MUTE_USER'
  | 'BAN_USER';

export interface CreateTriggerModalState {
  isOpen: boolean;
  name: string;
  trigger_type: TriggerTypeEnum;
  action_type: ActionTypeEnum;
  // Action data fields
  action_text: string;
  action_media_url: string;
  action_media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  action_buttons: string; // JSON string for buttons
  action_duration_minutes: number;
  delay_minutes: number;
  chat_type: ChatType;
  is_active: boolean;
}

const initialState: CreateTriggerModalState = {
  isOpen: false,
  name: '',
  trigger_type: 'JOIN_REQUEST_CREATED',
  action_type: 'SEND_MESSAGE',
  action_text: '',
  action_media_url: '',
  action_media_type: 'TEXT',
  action_buttons: '',
  action_duration_minutes: 0,
  delay_minutes: 0,
  chat_type: 'BOTH',
  is_active: true,
};

const createTriggerModalSlice = createSlice({
  name: 'createTriggerModal',
  initialState,
  reducers: {
    setModalOpen(state, action: PayloadAction<boolean>) {
      state.isOpen = action.payload;
      if (!action.payload) {
        Object.assign(state, initialState);
      }
    },
    setName(state, action: PayloadAction<string>) {
      state.name = action.payload;
    },
    setTriggerType(state, action: PayloadAction<TriggerTypeEnum>) {
      state.trigger_type = action.payload;
    },
    setActionType(state, action: PayloadAction<ActionTypeEnum>) {
      state.action_type = action.payload;
      // Reset action data fields when action type changes
      state.action_text = '';
      state.action_media_url = '';
      state.action_media_type = 'TEXT';
      state.action_buttons = '';
      state.action_duration_minutes = 0;
    },
    setActionText(state, action: PayloadAction<string>) {
      state.action_text = action.payload;
    },
    setActionMediaUrl(state, action: PayloadAction<string>) {
      state.action_media_url = action.payload;
    },
    setActionMediaType(state, action: PayloadAction<'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>) {
      state.action_media_type = action.payload;
    },
    setActionButtons(state, action: PayloadAction<string>) {
      state.action_buttons = action.payload;
    },
    setActionDurationMinutes(state, action: PayloadAction<number>) {
      state.action_duration_minutes = action.payload;
    },
    setDelayMinutes(state, action: PayloadAction<number>) {
      state.delay_minutes = action.payload;
    },
    setChatType(state, action: PayloadAction<ChatType>) {
      state.chat_type = action.payload;
    },
    setIsActive(state, action: PayloadAction<boolean>) {
      state.is_active = action.payload;
    },
    resetForm(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setModalOpen,
  setName,
  setTriggerType,
  setActionType,
  setActionText,
  setActionMediaUrl,
  setActionMediaType,
  setActionButtons,
  setActionDurationMinutes,
  setDelayMinutes,
  setChatType,
  setIsActive,
  resetForm,
} = createTriggerModalSlice.actions;

export default createTriggerModalSlice.reducer;
