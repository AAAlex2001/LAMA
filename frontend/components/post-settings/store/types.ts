// Типы для настроек публикации

export interface ChannelOption {
  id: string;
  label: string;
  checked?: boolean;
  members_count?: number;
  photo_url?: string;
}

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type RepeatCustomUnit = 'days' | 'weeks' | 'months' | 'years';
export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';
export type TagColor = '#FAC7C7' | '#FDE57E' | '#B8F1D2' | '#B8DBF1' | '#B8B9F1';

export interface PostSettingsData {
  channelIds: number[];
  notifySubscribers: boolean;
  pinPost: boolean;
  tagName: string | null;
  tagColor: TagColor | null;
  repeatInterval: RepeatOption;
  repeatCustomDays: number;
  repeatCustomHours: number;
  repeatCustomUnit: RepeatCustomUnit;
  repeatCustomValue: number;
  repeatWeekdays: number[];
  repeatMonthDays: number[];
  repeatYearMonth: number;
  repeatYearDays: number[];
   repeatEndType: 'never' | 'date';
   repeatEndDate: Date | null;
  autoDeleteInterval: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
}

export interface PostSettingsState {
  notifySubscribers: boolean;
  pinPost: boolean;
  showCreateChannel: boolean;
  repeatInterval: RepeatOption;
  repeatCustomDays: number;
  repeatCustomHours: number;
  repeatCustomUnit: RepeatCustomUnit;
  repeatCustomValue: number;
  repeatWeekdays: number[];
  repeatMonthDays: number[];
  repeatYearMonth: number;
  repeatYearDays: number[];
   repeatEndType: 'never' | 'date';
   repeatEndDate: Date | null;
  autoDeleteInterval: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
}

export type PostSettingsAction =
  | { type: 'SET_NOTIFY_SUBSCRIBERS'; payload: boolean }
  | { type: 'SET_PIN_POST'; payload: boolean }
  | { type: 'SET_SHOW_CREATE_CHANNEL'; payload: boolean }
  | { type: 'SET_REPEAT_INTERVAL'; payload: RepeatOption }
  | { type: 'SET_REPEAT_CUSTOM_DAYS'; payload: number }
  | { type: 'SET_REPEAT_CUSTOM_HOURS'; payload: number }
  | { type: 'SET_REPEAT_CUSTOM_UNIT'; payload: RepeatCustomUnit }
  | { type: 'SET_REPEAT_CUSTOM_VALUE'; payload: number }
  | { type: 'SET_REPEAT_WEEKDAYS'; payload: number[] }
  | { type: 'SET_REPEAT_MONTH_DAYS'; payload: number[] }
  | { type: 'SET_REPEAT_YEAR_MONTH'; payload: number }
  | { type: 'SET_REPEAT_YEAR_DAYS'; payload: number[] }
  | { type: 'SET_REPEAT_END_TYPE'; payload: 'never' | 'date' }
  | { type: 'SET_REPEAT_END_DATE'; payload: Date | null }
  | { type: 'SET_AUTO_DELETE_INTERVAL'; payload: AutoDeleteOption }
  | { type: 'SET_AUTO_DELETE_CUSTOM_DAYS'; payload: number }
  | { type: 'SET_AUTO_DELETE_CUSTOM_HOURS'; payload: number }
  | { type: 'RESET' };

export const initialPostSettingsState: PostSettingsState = {
  notifySubscribers: true,
  pinPost: false,
  showCreateChannel: false,
  repeatInterval: 'never',
  repeatCustomDays: 0,
  repeatCustomHours: 0,
  repeatCustomUnit: 'days',
  repeatCustomValue: 1,
  repeatWeekdays: [],
  repeatMonthDays: [new Date().getDate()],
  repeatYearMonth: new Date().getMonth(),
  repeatYearDays: [new Date().getDate()],
  repeatEndType: 'never',
  repeatEndDate: null,
  autoDeleteInterval: 'never',
  autoDeleteCustomDays: 0,
  autoDeleteCustomHours: 0,
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
    case 'SET_REPEAT_CUSTOM_DAYS':
      return { ...state, repeatCustomDays: action.payload };
    case 'SET_REPEAT_CUSTOM_HOURS':
      return { ...state, repeatCustomHours: action.payload };
    case 'SET_REPEAT_CUSTOM_UNIT':
      return { ...state, repeatCustomUnit: action.payload };
    case 'SET_REPEAT_CUSTOM_VALUE':
      return { ...state, repeatCustomValue: action.payload };
    case 'SET_REPEAT_WEEKDAYS':
      return { ...state, repeatWeekdays: action.payload };
    case 'SET_REPEAT_MONTH_DAYS':
      return { ...state, repeatMonthDays: action.payload };
    case 'SET_REPEAT_YEAR_MONTH':
      return { ...state, repeatYearMonth: action.payload };
    case 'SET_REPEAT_YEAR_DAYS':
      return { ...state, repeatYearDays: action.payload };
    case 'SET_REPEAT_END_TYPE':
      return { ...state, repeatEndType: action.payload };
    case 'SET_REPEAT_END_DATE':
      return { ...state, repeatEndDate: action.payload };
    case 'SET_AUTO_DELETE_INTERVAL':
      return { ...state, autoDeleteInterval: action.payload };
    case 'SET_AUTO_DELETE_CUSTOM_DAYS':
      return { ...state, autoDeleteCustomDays: action.payload };
    case 'SET_AUTO_DELETE_CUSTOM_HOURS':
      return { ...state, autoDeleteCustomHours: action.payload };
    case 'RESET':
      return initialPostSettingsState;
    default:
      return state;
  }
}
