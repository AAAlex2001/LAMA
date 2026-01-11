// Типы для работы с каналами

export interface Channel {
  id: number;
  telegram_id: number;
  channel_type: 'CHANNEL' | 'GROUP' | 'SUPERGROUP';
  title: string;
  username?: string;
  description?: string;
  invite_link?: string;
  is_active: boolean;
  selected?: boolean; // для UI
}

export interface ChannelListResponse {
  items: Channel[];
  total: number;
  page: number;
  page_size: number;
}

export interface SyncChannelRequest {
  telegram_id?: number;
  username?: string;
  invite_link?: string;
  bot_id?: number;
  token?: string;
}

export interface SyncChannelResponse {
  success: boolean;
  channel: Channel;
  message: string;
}

export interface ChannelsState {
  channels: Channel[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}

export type ChannelsAction =
  | { type: 'SET_CHANNELS'; payload: Channel[] }
  | { type: 'ADD_CHANNEL'; payload: Channel }
  | { type: 'UPDATE_CHANNEL'; payload: Channel }
  | { type: 'REMOVE_CHANNEL'; payload: number }
  | { type: 'TOGGLE_CHANNEL_SELECTED'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PAGINATION'; payload: { total: number; page: number; pageSize: number } }
  | { type: 'RESET' };

export const initialChannelsState: ChannelsState = {
  channels: [],
  loading: false,
  syncing: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 50,
};

export function channelsReducer(
  state: ChannelsState,
  action: ChannelsAction
): ChannelsState {
  switch (action.type) {
    case 'SET_CHANNELS':
      return { ...state, channels: action.payload };
    case 'ADD_CHANNEL':
      return { 
        ...state, 
        channels: [...state.channels, action.payload],
        total: state.total + 1,
      };
    case 'UPDATE_CHANNEL':
      return {
        ...state,
        channels: state.channels.map((ch) =>
          ch.id === action.payload.id ? action.payload : ch
        ),
      };
    case 'REMOVE_CHANNEL':
      return {
        ...state,
        channels: state.channels.filter((ch) => ch.id !== action.payload),
        total: state.total - 1,
      };
    case 'TOGGLE_CHANNEL_SELECTED':
      return {
        ...state,
        channels: state.channels.map((ch) =>
          ch.id === action.payload ? { ...ch, selected: !ch.selected } : ch
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SYNCING':
      return { ...state, syncing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PAGINATION':
      return { 
        ...state, 
        total: action.payload.total,
        page: action.payload.page,
        pageSize: action.payload.pageSize,
      };
    case 'RESET':
      return initialChannelsState;
    default:
      return state;
  }
}
