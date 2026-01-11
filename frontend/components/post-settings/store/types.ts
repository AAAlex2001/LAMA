// Типы для настроек публикации

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface ChannelOption {
  id: string;
  label: string;
  checked?: boolean;
}

export interface PostSettingsData {
  channelIds: number[];
  notifySubscribers: boolean;
  pinPost: boolean;
  tags: Tag[];
}

export interface PostSettingsState {
  tags: Tag[];
  notifySubscribers: boolean;
  pinPost: boolean;
  showCreateChannel: boolean;
}

export type PostSettingsAction =
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'ADD_TAG'; payload: Tag }
  | { type: 'REMOVE_TAG'; payload: string }
  | { type: 'SET_NOTIFY_SUBSCRIBERS'; payload: boolean }
  | { type: 'SET_PIN_POST'; payload: boolean }
  | { type: 'SET_SHOW_CREATE_CHANNEL'; payload: boolean }
  | { type: 'RESET' };

export const initialPostSettingsState: PostSettingsState = {
  tags: [
    { id: '1', label: 'Срочно', color: '#FAC7C7' },
    { id: '2', label: 'Важно', color: '#B8F1D2' },
    { id: '3', label: 'Дата', color: '#FDE57E' },
  ],
  notifySubscribers: false,
  pinPost: false,
  showCreateChannel: false,
};

export function postSettingsReducer(
  state: PostSettingsState,
  action: PostSettingsAction
): PostSettingsState {
  switch (action.type) {
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload] };
    case 'REMOVE_TAG':
      return { ...state, tags: state.tags.filter((t) => t.id !== action.payload) };
    case 'SET_NOTIFY_SUBSCRIBERS':
      return { ...state, notifySubscribers: action.payload };
    case 'SET_PIN_POST':
      return { ...state, pinPost: action.payload };
    case 'SET_SHOW_CREATE_CHANNEL':
      return { ...state, showCreateChannel: action.payload };
    case 'RESET':
      return initialPostSettingsState;
    default:
      return state;
  }
}
