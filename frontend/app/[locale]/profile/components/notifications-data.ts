export interface NotificationItem {
  title: string;
  hint: string;
}

export const BOT_ITEMS: NotificationItem[] = [
  { title: 'Подключение Telegram-бота', hint: 'Напоминания, если бот не подключён' },
  { title: 'Проблемы авторизации бота', hint: 'Если токен отозван или истёк' },
  { title: 'Недостаточно прав', hint: 'Бот не является администратором канала' },
];

export const MESSAGE_ITEMS: NotificationItem[] = [
  { title: 'Новые сообщения', hint: 'Оповещения о входящих сообщениях' },
  { title: 'Упоминания', hint: 'Когда вас упоминают в чатах' },
  { title: 'Ответы на сообщения', hint: 'Оповещения о ответах на ваши сообщения' },
];

export const ERROR_ITEMS: NotificationItem[] = [
  { title: 'Ошибки и сбои', hint: 'Уведомления о проблемах с публикациями' },
  { title: 'Не удалось отправить пост', hint: 'Если публикация не прошла' },
  { title: 'Ошибка загрузки медиа', hint: 'Файлы не удалось обработать' },
];

export const RESULT_ITEMS: NotificationItem[] = [
  { title: 'О результатах публикаций', hint: 'Уведомления о статусе и результатах постов' },
  { title: 'Пост опубликован', hint: 'Сообщение успешно размещено' },
  { title: 'Пост удалён или снят', hint: 'Публикация больше не отображается' },
];

export type ToggleStatus = 'none' | 'all' | 'mixed';

export function getToggleStatus(values: boolean[]): ToggleStatus {
  const enabled = values.filter(Boolean).length;
  if (enabled === 0) return 'none';
  if (enabled === values.length) return 'all';
  return 'mixed';
}
