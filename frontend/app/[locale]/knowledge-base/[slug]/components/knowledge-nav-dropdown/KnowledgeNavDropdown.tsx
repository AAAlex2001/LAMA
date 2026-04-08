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

      <div className={styles.list}>
        {SECTIONS.map((section) => (
          <KnowledgeNavDropdownSection key={section.id} section={section} />
        ))}

        {FLAT_ITEMS.map((title, index) => (
          <div key={`${title}-${index}`} className={styles.flatItem}>{title}</div>
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
