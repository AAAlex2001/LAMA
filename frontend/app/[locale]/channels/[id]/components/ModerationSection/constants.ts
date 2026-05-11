export const QUICK_COMMANDS = [
  { id: 'admin', label: '/admin — связь с администратором' },
  { id: 'ban', label: '/ban — заблокировать участника' },
  { id: 'unban', label: '/unban — разблокировать участника' },
  { id: 'mute', label: '/mute — ограничить отправку сообщений' },
  { id: 'unmute', label: '/unmute — снять ограничение' },
  { id: 'kick', label: '/kick — удалить участника' },
];

export const MEDIA_TYPES = [
  { id: 'photo', label: 'Фотографии' },
  { id: 'video', label: 'Видеозаписи' },
  { id: 'gif', label: 'Гифки' },
  { id: 'files', label: 'Файлы' },
  { id: 'voice', label: 'Голосовые' },
];

export const ANTISPAM_MODES = [
  { id: 'BLOCK_ALL', label: 'Запретить все ссылки' },
  { id: 'ALLOW_TME_ONLY', label: 'Все кроме t.me' },
  { id: 'WHITELIST', label: 'Белый список' },
  { id: 'BLACKLIST', label: 'Чёрный список' },
] as const;

export const ANTISPAM_ACTIONS = [
  { id: 'BAN', label: 'Забанить' },
  { id: 'MUTE', label: 'Ограничить' },
  { id: 'KICK', label: 'Кикнуть' },
] as const;

export const FLOOD_ACTIONS = [
  { id: 'MUTE', label: 'Ограничить' },
  { id: 'KICK', label: 'Кикнуть' },
  { id: 'DELETE', label: 'Удалить сообщение' },
] as const;

export const BANNED_ACTIONS = [
  { id: 'BAN', label: 'Забанить' },
  { id: 'MUTE', label: 'Ограничить' },
  { id: 'KICK', label: 'Кикнуть' },
] as const;

export const NIGHT_BLOCK_OPTIONS = [
  { id: 'text', label: 'Текстовые сообщения' },
  { id: 'media', label: 'Медиа' },
  { id: 'all', label: 'Все сообщения' },
] as const;

export const AUTO_DELETE_TYPES = [
  { id: 'system', label: 'Все системные сообщения' },
  { id: 'commands', label: 'Команды' },
  { id: 'join', label: 'Сообщения о вступлении' },
  { id: 'all', label: 'Все сообщения' },
  { id: 'textOnly', label: 'Только текст' },
  { id: 'mediaOnly', label: 'Только медиа' },
] as const;

export const AUTO_DELETE_DELAYS = [
  { value: 0, label: 'Сразу' },
  { value: 5, label: '5 сек' },
  { value: 10, label: '10 сек' },
  { value: 30, label: '30 сек' },
  { value: 60, label: '1 мин' },
  { value: 300, label: '5 мин' },
] as const;
