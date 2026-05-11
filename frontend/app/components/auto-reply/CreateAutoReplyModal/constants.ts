export const FREQUENCY_OPTIONS = [
  { value: 1, label: '1 мин' },
  { value: 5, label: '5 мин' },
  { value: 15, label: '15 мин' },
  { value: 30, label: '30 мин' },
  { value: 60, label: '1 час' },
];

export const MAX_RESPONSE_LENGTH = 1024;
export const MAX_MEDIA = 10;

export const SHORTCODES = [
  { code: '{user.username}', label: '{username}' },
  { code: '{user.first_name}', label: '{firstname}' },
  { code: '{user.last_name}', label: '{lastname}' },
  { code: '{user.id}', label: '{user_id}' },
  { code: '{bot.first_name}', label: '{bot_name}' },
  { code: '{chat.title}', label: '{chat_title}' },
  { code: '{date}', label: '{date}' },
  { code: '{time}', label: '{time}' },
];

export const PREVIEW_REPLACEMENTS: Record<string, string> = {
  '{user.username}': '@username',
  '{user.first_name}': 'Иван',
  '{user.last_name}': 'Иванов',
  '{user.id}': '123456',
  '{bot.first_name}': 'MyBot',
  '{chat.title}': 'Название чата',
  '{date}': '29.03.2026',
  '{time}': '12:00',
};
