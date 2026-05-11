export type AutomationEventType = 'system_autoreply' | 'system_trigger' | 'bot_command' | null;
export type ModerationStatusType = 'new' | 'processed' | 'banned' | null;

export const FILTER_OPTIONS_MODERATION = [
  { id: 'all', label: 'Все' },
  { id: 'new', label: 'Ожидают' },
  { id: 'processed', label: 'Обработанные' },
  { id: 'banned', label: 'Заблокированные' },
];

export const FILTER_OPTIONS_AUTOMATION = [
  { id: 'all', label: 'Все' },
  { id: 'auto-reply', label: 'Автоответ' },
  { id: 'trigger', label: 'Триггер' },
  { id: 'commands', label: 'Команды' },
];

export function automationFilterToId(filter: AutomationEventType): string {
  switch (filter) {
    case 'system_autoreply': return 'auto-reply';
    case 'system_trigger': return 'trigger';
    case 'bot_command': return 'commands';
    default: return 'all';
  }
}

export function automationIdToFilter(id: string): AutomationEventType {
  switch (id) {
    case 'auto-reply': return 'system_autoreply';
    case 'trigger': return 'system_trigger';
    case 'commands': return 'bot_command';
    default: return null;
  }
}

export function moderationFilterToId(filter: ModerationStatusType): string {
  return filter ?? 'all';
}

export function moderationIdToFilter(id: string): ModerationStatusType {
  if (id === 'new' || id === 'processed' || id === 'banned') return id;
  return null;
}
