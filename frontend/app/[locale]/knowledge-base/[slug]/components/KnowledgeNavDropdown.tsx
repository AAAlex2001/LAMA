'use client';

import SearchBar from '@/components/search-bar/search-bar';
import { Button } from '@/components/new-button';
import { ChevronIcon } from './icons';
import styles from './KnowledgeNavDropdown.module.scss';

const ACTIVE_SUB_ITEMS = [
  'Основы',
  'Планирование',
  'Отложенная публикация',
  'Серии постов',
  'Кнопки',
  'Шаблоны',
  'Черновики',
  'ИИ-редактор',
  'Файлы',
  'Лимиты',
];

const START_ITEMS = ['Календарь', 'Черновики', 'Каналы и группы'];
const COLLAPSED_SECTIONS = ['Автоматизация', 'Монетизация', 'Дашборд', 'Профиль'];
const FLAT_ITEMS = ['Автоудаление поста', 'Автоудаление поста'];

type Props = { variant?: 'dropdown' | 'sidebar' };

export default function KnowledgeNavDropdown({ variant = 'dropdown' }: Props) {
  return (
    <div className={variant === 'sidebar' ? styles.sidebar : styles.dropdown}>
      <SearchBar placeholder="Поиск по базе знаний" className={styles.search} />

      <div className={styles.list}>
        <section className={`${styles.section} ${styles.sectionActive}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Старт</span>
            <ChevronIcon direction="up" />
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.itemActive}>
              <span className={styles.itemTitleActive}>Создание публикации</span>
              <ChevronIcon direction="down" color="#3B82F6" />
            </div>
            <div className={styles.subList}>
              {ACTIVE_SUB_ITEMS.map((t) => (
                <div key={t} className={styles.subItem}>{t}</div>
              ))}
            </div>
            {START_ITEMS.map((t) => (
              <div key={t} className={styles.item}>
                <span className={styles.itemTitle}>{t}</span>
                <ChevronIcon direction="down" color="#B0B4B8" />
              </div>
            ))}
          </div>
        </section>

        {COLLAPSED_SECTIONS.map((t) => (
          <div key={t} className={styles.sectionCollapsed}>
            <span className={styles.sectionTitle}>{t}</span>
            <ChevronIcon direction="right" color="#B0B4B8" />
          </div>
        ))}

        {FLAT_ITEMS.map((t, i) => (
          <div key={i} className={styles.flatItem}>{t}</div>
        ))}

        <Button variant="outline" intent="gradient" size="md" className={styles.fullBtn}>
          Открыть оглавление
        </Button>
        <Button variant="fill" intent="gradient" size="md" className={styles.fullBtn}>
          Войти
        </Button>
      </div>
    </div>
  );
}
