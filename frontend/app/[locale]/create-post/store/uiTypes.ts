// UI типы для настроек постов
import type { RepeatOption, AutoDeleteOption } from '@/components/post-settings/store/types';

export interface PostSettingsFromUI {
  channelIds: number[];
  notifySubscribers: boolean;
  pinPost: boolean;
  tagName: string | null;
  tagColor: string | null;
  repeatInterval: RepeatOption;
  repeatCustomDays: number;
  repeatCustomHours: number;
  repeatCustomUnit: 'days' | 'weeks' | 'months' | 'years';
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
