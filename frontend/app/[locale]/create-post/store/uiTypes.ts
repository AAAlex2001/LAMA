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
  autoDeleteInterval: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
}
