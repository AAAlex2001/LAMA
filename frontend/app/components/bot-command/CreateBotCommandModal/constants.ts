export const MAX_RESPONSE_LENGTH = 1024;
export const MAX_MEDIA = 10;

export const SHORTCODES = [
  { code: '{user.username}', label: '{username}' },
  { code: '{user.first_name}', label: '{firstname}' },
  { code: '{date}', label: '{date}' },
];

export const PREVIEW_REPLACEMENTS: Record<string, string> = {
  '{user.username}': '@username',
  '{user.first_name}': 'Иван',
  '{date}': '29.03.2026',
};
