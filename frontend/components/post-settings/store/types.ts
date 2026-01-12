// Типы для настроек публикации

export interface ChannelOption {
  id: string;
  label: string;
  checked?: boolean;
}

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

export interface PostSettingsData {
  channelIds: number[];
  notifySubscribers: boolean;
  pinPost: boolean;
  tagName: string | null;
  repeatInterval: RepeatOption;
}

export interface PostSettingsState {
  notifySubscribers: boolean;
  pinPost: boolean;
  showCreateChannel: boolean;
  repeatInterval: RepeatOption;
}

export type PostSettingsAction =
  | { type: 'SET_NOTIFY_SUBSCRIBERS'; payload: boolean }
  | { type: 'SET_PIN_POST'; payload: boolean }
  | { type: 'SET_SHOW_CREATE_CHANNEL'; payload: boolean }
  | { type: 'SET_REPEAT_INTERVAL'; payload: RepeatOption }
  | { type: 'RESET' };

export const initialPostSettingsState: PostSettingsState = {
  notifySubscribers: false,
  pinPost: false,
  showCreateChannel: false,
  repeatInterval: 'never',
};

export function postSettingsReducer(
  state: PostSettingsState,
  action: PostSettingsAction
): PostSettingsState {
  switch (action.type) {
    case 'SET_NOTIFY_SUBSCRIBERS':
      return { ...state, notifySubscribers: action.payload };
    case 'SET_PIN_POST':
      return { ...state, pinPost: action.payload };
    case 'SET_SHOW_CREATE_CHANNEL':
      return { ...state, showCreateChannel: action.payload };
    case 'SET_REPEAT_INTERVAL':
      return { ...state, repeatInterval: action.payload };
    case 'RESET':
      return initialPostSettingsState;
    default:
      return state;
  }
}
