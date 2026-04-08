import type { LeafItem, SectionConfig } from './KnowledgeNavDropdown.types';

const START_CREATE_ITEMS: LeafItem[] = [
  { id: 'start-basics', title: 'Основы' },
  { id: 'start-planning', title: 'Планирование' },
  { id: 'start-delayed', title: 'Отложенная публикация' },
  { id: 'start-series', title: 'Серии постов' },
  { id: 'start-buttons', title: 'Кнопки' },
  { id: 'start-templates', title: 'Шаблоны' },
  { id: 'start-drafts', title: 'Черновики' },
  { id: 'start-ai-editor', title: 'ИИ-редактор' },
  { id: 'start-files', title: 'Файлы' },
  { id: 'start-limits', title: 'Лимиты' },
];

const DASHBOARD_OVERVIEW_ITEMS: LeafItem[] = [
  { id: 'overview-subscribers', title: 'Подписчики' },
  { id: 'overview-reach', title: 'Охват' },
  { id: 'overview-er', title: 'ER' },
  { id: 'overview-posts', title: 'Публикации' },
];

export const SECTIONS: SectionConfig[] = [
  {
    id: 'start',
    title: 'Старт',
    isOpenByDefault: true,
    entries: [
      {
        id: 'start-create-post',
        title: 'Создание публикации',
        isActive: true,
        nested: {
          id: 'start-create-post-nested',
          title: 'Создание публикации',
          isActive: true,
          isOpenByDefault: true,
          items: START_CREATE_ITEMS,
        },
      },
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
      {
        id: 'dashboard-overview',
        title: 'Обзор',
        isActive: true,
        nested: {
          id: 'dashboard-overview-nested',
          title: 'Обзор',
          isActive: true,
          items: DASHBOARD_OVERVIEW_ITEMS,
        },
      },
      { id: 'dashboard-metrics', title: 'Метрики' },
      { id: 'dashboard-content', title: 'Контент' },
      { id: 'dashboard-activity', title: 'Активность' },
    ],
  },
  { id: 'profile', title: 'Профиль' },
];

export const FLAT_ITEMS = ['Автоудаление поста', 'Автоудаление поста'];
