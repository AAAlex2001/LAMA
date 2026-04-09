'use client';

import { useState } from 'react';
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
    })),
  }));
}

function buildSections(): SectionConfig[] {
  return SECTIONS;
}

function filterSections(sections: SectionConfig[], query: string): SectionConfig[] {
  const q = query.toLowerCase().trim();
  if (!q) return sections;

  return sections
    .map((section) => {
      const sectionTitleMatch = section.title.toLowerCase().includes(q);
      const filteredEntries = section.entries?.filter((entry) =>
        entry.title.toLowerCase().includes(q),
      );

      if (sectionTitleMatch) return section;
      if (filteredEntries && filteredEntries.length > 0) {
        return { ...section, entries: filteredEntries, isOpenByDefault: true };
      }
      return null;
    })
    .filter((s): s is SectionConfig => s !== null);
}

export default function KnowledgeNavDropdown({ variant = 'dropdown', headings = [], navigation }: Props) {
  const [search, setSearch] = useState('');

  const base = navigation && navigation.length > 0
    ? buildSectionsFromApi(navigation, headings)
    : buildSections();
  const sections = filterSections(base, search);

  return (
    <div className={variant === 'sidebar' ? styles.sidebar : styles.dropdown}>
      <SearchBar
        placeholder="Поиск по базе знаний"
        className={styles.search}
        value={search}
        onChange={setSearch}
      />

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
          showArrow={false}
        />
        <NewButton variant="fill" intent="gradient" size="md" className={styles.fullBtn}>
          Войти
        </NewButton>
      </div>
    </div>
  );
}
