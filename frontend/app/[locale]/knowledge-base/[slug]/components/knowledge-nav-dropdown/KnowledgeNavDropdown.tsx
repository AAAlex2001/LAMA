'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BrainIcon from '@/components/icons/brain-icon';
import SearchBar from '@/components/search-bar/search-bar';
import { Button as NewButton } from '@/components/new-button';
import OldButton from '@/components/button/button';
import styles from './KnowledgeNavDropdown.module.scss';
import KnowledgeNavDropdownSection from './KnowledgeNavDropdownSection';
import { SECTIONS } from './KnowledgeNavDropdown.data';
import type { Variant, SectionConfig } from './KnowledgeNavDropdown.types';
import type { NavigationCategory } from '../../types';

type Heading = { id: string; title: string };

type Props = {
  variant?: Variant;
  headings?: Heading[];
  navigation?: NavigationCategory[];
  locale?: string;
  currentSlug?: string;
  isLoggedIn?: boolean;
};

function buildSectionsFromApi(
  navigation: NavigationCategory[],
  headings: Heading[],
  locale: string,
  currentSlug?: string,
): SectionConfig[] {
  return navigation.map((cat) => ({
    id: cat.slug,
    title: cat.title,
    isOpenByDefault: cat.entries.some((entry) => entry.slug === currentSlug),
    entries: cat.entries.map((entry) => ({
      id: entry.slug,
      title: entry.title,
      href: `/${locale}/knowledge-base/${entry.slug}`,
      isActive: entry.slug === currentSlug,
      nested:
        entry.slug === currentSlug && headings.length > 0
          ? {
              id: `${entry.slug}-headings`,
              title: entry.title,
              isOpenByDefault: true,
              items: headings.map((heading) => ({
                id: heading.id,
                title: heading.title,
                href: `#${heading.id}`,
              })),
            }
          : undefined,
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

export default function KnowledgeNavDropdown({ variant = 'dropdown', headings = [], navigation, locale = 'ru', currentSlug, isLoggedIn = false }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const footerLinks = [
    { href: `/${locale}/privacy`, label: 'Политика конфиденциальности' },
    { href: `/${locale}/terms`, label: 'Условия предоставления услуг' },
  ];

  const base = navigation && navigation.length > 0
    ? buildSectionsFromApi(navigation, headings, locale, currentSlug)
    : buildSections();
  const sections = filterSections(base, search);

  return (
    <div className={variant === 'sidebar' ? styles.sidebar : styles.dropdown}>
      {variant === 'sidebar' && (
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarHeaderTitle}>Блоки знаний</span>
          <BrainIcon width={20} height={20} color="#3B82F6" />
        </div>
      )}

      <SearchBar
        placeholder="Поиск по базе знаний"
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
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className={styles.footerLink}>{item.label}</Link>
          ))}
        </div>
        <OldButton
          text="Написать в LamaPlannerBot"
          variant="templateCard"
          fullWidth
          showArrow={false}
          className={styles.botBtn}
        />
        {!isLoggedIn && (
          <NewButton
            variant="fill"
            intent="gradient"
            size="md"
            className={styles.fullBtn}
            onClick={() => router.push(`/${locale}/login`)}
          >
            Войти
          </NewButton>
        )}
      </div>
    </div>
  );
}
