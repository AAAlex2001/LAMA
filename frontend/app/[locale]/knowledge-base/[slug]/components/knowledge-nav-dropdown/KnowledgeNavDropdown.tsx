import SearchBar from '@/components/search-bar/search-bar';
import { Button } from '@/components/new-button';
import styles from './KnowledgeNavDropdown.module.scss';
import KnowledgeNavDropdownSection from './KnowledgeNavDropdownSection';
import { FLAT_ITEMS, SECTIONS } from './KnowledgeNavDropdown.data';
import type { Variant } from './KnowledgeNavDropdown.types';

type Props = { variant?: Variant };

export default function KnowledgeNavDropdown({ variant = 'dropdown' }: Props) {
  return (
    <div className={variant === 'sidebar' ? styles.sidebar : styles.dropdown}>
      <SearchBar placeholder="Поиск по базе знаний" className={styles.search} />

      <div className={styles.sectionsGroup}>
        {SECTIONS.map((section) => (
          <KnowledgeNavDropdownSection key={section.id} section={section} />
        ))}
      </div>

      <div className={styles.bottomGroup}>
        <div className={styles.flatItems}>
          {FLAT_ITEMS.map((title, index) => (
            <div key={`${title}-${index}`} className={styles.flatItem}>{title}</div>
          ))}
        </div>
        <button type="button" className={styles.tocBtn}>
          <span>Написать в LamaPlannerBot</span>
        </button>
        <Button variant="fill" intent="gradient" size="md" className={styles.fullBtn}>
          Войти
        </Button>
      </div>
    </div>
  );
}
