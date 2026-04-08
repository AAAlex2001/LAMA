import SearchBar from '@/components/search-bar/search-bar';
import { Button as NewButton } from '@/components/new-button';
import OldButton from '@/components/button/button';
import styles from './KnowledgeNavDropdown.module.scss';
import KnowledgeNavDropdownSection from './KnowledgeNavDropdownSection';
import { FLAT_ITEMS, SECTIONS } from './KnowledgeNavDropdown.data';
import type { Variant } from './KnowledgeNavDropdown.types';
import type { SectionConfig } from './KnowledgeNavDropdown.types';

type Heading = { id: string; title: string };

type Props = { variant?: Variant; headings?: Heading[] };

function buildSections(headings: Heading[]): SectionConfig[] {
  if (!headings.length) return SECTIONS;
  return SECTIONS.map((s) => ({
    ...s,
    entries: s.entries?.map((e) => {
      if (e.isActive && e.nested) {
        return {
          ...e,
          nested: {
            ...e.nested,
            items: headings.map((h) => ({ id: h.id, title: h.title })),
          },
        };
      }
      return e;
    }),
  }));
}

export default function KnowledgeNavDropdown({ variant = 'dropdown', headings = [] }: Props) {
  const sections = buildSections(headings);

  return (
    <div className={variant === 'sidebar' ? styles.sidebar : styles.dropdown}>
      <SearchBar placeholder="Поиск по базе знаний" className={styles.search} />

      <div className={styles.sectionsGroup}>
        {sections.map((section) => (
          <KnowledgeNavDropdownSection key={section.id} section={section} />
        ))}
      </div>

      <div className={styles.bottomGroup}>
        <div className={styles.flatItems}>
          {FLAT_ITEMS.map((title, index) => (
            <div key={`${title}-${index}`} className={styles.flatItem}>{title}</div>
          ))}
        </div>
        <OldButton
          text="Написать в LamaPlannerBot"
          variant="templateCard"
          fullWidth
        />
        <NewButton variant="fill" intent="gradient" size="md" className={styles.fullBtn}>
          Войти
        </NewButton>
      </div>
    </div>
  );
}

