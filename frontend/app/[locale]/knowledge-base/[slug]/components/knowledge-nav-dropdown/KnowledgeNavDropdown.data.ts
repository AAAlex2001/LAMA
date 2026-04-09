import type { SectionConfig } from './KnowledgeNavDropdown.types';

export const SECTIONS: SectionConfig[] = [
  {
    id: 'start',
    title: 'Старт',
    isOpenByDefault: true,
    entries: [
      { id: 'start-create-post', title: 'Создание публикации', isActive: true },
      { id: 'start-calendar', title: 'Календарь' },
      { id: 'start-drafts', title: 'Черновики' },
      { id: 'start-channels', title: 'Каналы и группы' },
    ],
  },
  { id: 'automation', title: 'Автоматизация' },
  { id: 'monetization', title: 'Монетизация' },
  {
    id: 'dashboard',
    title: 'Дашборд',
    entries: [
      { id: 'dashboard-overview', title: 'Обзор', isActive: true },
      { id: 'dashboard-metrics', title: 'Метрики' },
      { id: 'dashboard-content', title: 'Контент' },
      { id: 'dashboard-activity', title: 'Активность' },
    ],
  },
  { id: 'profile', title: 'Профиль' },
];

export const FLAT_ITEMS = ['Автоудаление поста', 'Автоудаление поста'];
