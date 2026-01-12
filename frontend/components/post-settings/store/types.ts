// Типы для настроек публикации

export interface ChannelOption {
  id: string;
  label: string;
  checked?: boolean;
}

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';
export type TagColor = '#FAC7C7' | '#FDE57E' | '#B8F1D2' | '#B8DBF1' | '#B8B9F1';

export interface PostSettingsData {
  channelIds: number[];
  notifySubscribers: boolean;
  pinPost: boolean;
  tagName: string | null;
  tagColor: string | null;
  repeatInterval: RepeatOption;
  autoDeleteInterval: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
}

export interface PostSettingsState {
  notifySubscribers: boolean;
  pinPost: boolean;
  showCreateChannel: boolean;
  repeatInterval: RepeatOption;
  autoDeleteInterval: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
  selectedTagColor: TagColor;
}

export type PostSettingsAction =
  | { type: 'SET_NOTIFY_SUBSCRIBERS'; payload: boolean }
  | { type: 'SET_PIN_POST'; payload: boolean }
  | { type: 'SET_SHOW_CREATE_CHANNEL'; payload: boolean }
  | { type: 'SET_REPEAT_INTERVAL'; payload: RepeatOption }
  | { type: 'SET_AUTO_DELETE_INTERVAL'; payload: AutoDeleteOption }
  | { type: 'SET_AUTO_DELETE_CUSTOM_DAYS'; payload: number }
  | { type: 'SET_AUTO_DELETE_CUSTOM_HOURS'; payload: number }
  | { type: 'SET_SELECTED_TAG_COLOR'; payload: TagColor }
  | { type: 'RESET' };

export const initialPostSettingsState: PostSettingsState = {
  notifySubscribers: false,
  pinPost: false,
  showCreateChannel: false,
  repeatInterval: 'never',
  autoDeleteInterval: 'never',
  autoDeleteCustomDays: 0,
  autoDeleteCustomHours: 0,
  selectedTagColor: '#FAC7C7',
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
    case 'SET_AUTO_DELETE_INTERVAL':
      return { ...state, autoDeleteInterval: action.payload };
    case 'SET_AUTO_DELETE_CUSTOM_DAYS':
      return { ...state, autoDeleteCustomDays: action.payload };
    case 'SET_AUTO_DELETE_CUSTOM_HOURS':
      return { ...state, autoDeleteCustomHours: action.payload };
    case 'SET_SELECTED_TAG_COLOR':
      return { ...state, selectedTagColor: action.payload };
    case 'RESET':
      return initialPostSettingsState;
    default:
      return state;
  }
}
