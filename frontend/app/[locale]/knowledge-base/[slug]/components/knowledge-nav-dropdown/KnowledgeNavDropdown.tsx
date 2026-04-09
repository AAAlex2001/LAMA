import SearchBar from '@/components/search-bar/search-bar';
import { Button as NewButton } from '@/components/new-button';
import OldButton from '@/components/button/button';
import styles from './KnowledgeNavDropdown.module.scss';
import KnowledgeNavDropdownSection from './KnowledgeNavDropdownSection';
import { FLAT_ITEMS, SECTIONS } from './KnowledgeNavDropdown.data';
import type { Variant, SectionConfig } from './KnowledgeNavDropdown.types';
import type { NavigationCategory } from '../../types';

type Heading = { id: string; title: string };

type Props = {
  variant?: Variant;
  headings?: Heading[];
  navigation?: NavigationCategory[];
};

function buildSectionsFromApi(navigation: NavigationCategory[], headings: Heading[]): SectionConfig[] {
  return navigation.map((cat) => ({
    id: cat.slug,
    title: cat.title,
    isOpenByDefault: false,
    entries: cat.entries.map((entry) => ({
      id: entry.slug,
      title: entry.title,
      isActive: false,
      nested: {
        id: `${entry.slug}-nested`,
        title: entry.title,
        isActive: false,
        isOpenByDefault: false,
        items: headings.map((h) => ({ id: h.id, title: h.title })),
      },
    })),
  }));
}

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

export default function KnowledgeNavDropdown({ variant = 'dropdown', headings = [], navigation }: Props) {
  const sections = navigation && navigation.length > 0
    ? buildSectionsFromApi(navigation, headings)
    : buildSections(headings);

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
