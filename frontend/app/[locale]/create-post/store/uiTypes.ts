import type { RepeatInterval, AutoDeleteInterval } from './types';

export interface PostSettingsFromUI {
  channelIds: number[];
  notifySubscribers: boolean;
  pinPost: boolean;
  tagName: string | null;
  tagColor: string | null;
  repeatInterval: RepeatInterval;
  repeatCustomDays: number;
  repeatCustomHours: number;
  autoDeleteInterval: AutoDeleteInterval;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
}
