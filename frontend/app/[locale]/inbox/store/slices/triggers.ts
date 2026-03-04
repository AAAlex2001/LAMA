import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TriggerType = 
  | 'JOIN_REQUEST_CREATED'
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_REJECTED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'CAPTCHA_PASSED'
  | 'CAPTCHA_FAILED'
  | 'USER_MESSAGE'
  | 'COMMAND_CALLED';

export type ActionType = 
  | 'SEND_MESSAGE'
  | 'SEND_MEDIA'
  | 'ADD_TO_GROUP'
  | 'REMOVE_FROM_GROUP'
  | 'MUTE_USER'
  | 'BAN_USER';

export type ChatType = 'PRIVATE' | 'GROUP' | 'BOTH';

export interface Trigger {
  id: number;
  bot_id: number;
  name: string;
  trigger_type: TriggerType;
  action_type: ActionType;
  action_data: Record<string, unknown>;
  delay_minutes: number;
  delivery_window?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  chat_type: ChatType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TriggerCreate {
  name: string;
  trigger_type: TriggerType;
  action_type: ActionType;
  action_data: Record<string, unknown>;
  delay_minutes: number;
  delivery_window?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  chat_type: ChatType;
  is_active: boolean;
}

interface TriggersState {
  triggers: Trigger[];
  loading: boolean;
  error: string | null;
}

const initialState: TriggersState = {
  triggers: [],
  loading: false,
  error: null,
};

const triggersSlice = createSlice({
  name: 'triggers',
  initialState,
  reducers: {
    setTriggers(state, action: PayloadAction<Trigger[]>) {
      state.triggers = action.payload;
      state.error = null;
    },
    addTrigger(state, action: PayloadAction<Trigger>) {
      state.triggers.push(action.payload);
    },
    updateTrigger(state, action: PayloadAction<Trigger>) {
      const index = state.triggers.findIndex(tr => tr.id === action.payload.id);
      if (index !== -1) {
        state.triggers[index] = action.payload;
      }
    },
    removeTrigger(state, action: PayloadAction<number>) {
      state.triggers = state.triggers.filter(tr => tr.id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    reset(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setTriggers,
  addTrigger,
  updateTrigger,
  removeTrigger,
  setLoading,
  setError,
  clearError,
  reset: resetTriggers,
} = triggersSlice.actions;

export default triggersSlice.reducer;
