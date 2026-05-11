import type { CaptchaFailAction } from '@/store/channels';

export const TIMEOUT_OPTIONS = [
  { value: 10, label: '10 секунд' },
  { value: 30, label: '30 секунд' },
  { value: 60, label: '1 минута' },
  { value: 120, label: '2 минуты' },
  { value: 300, label: '5 минут' },
];

export const FAIL_ACTION_OPTIONS: { value: CaptchaFailAction; label: string }[] = [
  { value: 'KICK', label: 'Кикнуть' },
  { value: 'MUTE', label: 'Ограничить на время' },
  { value: 'BAN', label: 'Забанить' },
];

export const RESTRICTION_OPTIONS = [
  { value: 'send_messages', label: 'Ограничить отправку сообщений' },
  { value: 'send_media', label: 'Ограничить медиа' },
  { value: 'full', label: 'Полное ограничение' },
];

export const WELCOME_TYPE_OPTIONS = [
  { value: 'group_message', label: 'Сообщение в группу' },
  { value: 'private_message', label: 'Личное сообщение' },
];
