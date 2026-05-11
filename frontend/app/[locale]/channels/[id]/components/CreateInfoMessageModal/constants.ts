export const SHORTCODES = [
  { code: '{user.first_name}', label: '{firstname}' },
  { code: '{user.username}', label: '{username}' },
  { code: '{user.last_name}', label: '{lastname}' },
  { code: '{chat.title}', label: '{chat}' },
  { code: '{date}', label: '{date}' },
];

export const MEDIA_TYPE_MAP: Record<string, string> = {
  image: 'PHOTO',
  video: 'VIDEO',
  document: 'DOCUMENT',
};

export const MAX_MEDIA = 10;
