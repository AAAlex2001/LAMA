'use client';

import { useState } from 'react';
import { ChevronIcon } from '../icons';
import styles from './KnowledgeNavDropdown.module.scss';
import type { SectionConfig, SectionEntry } from './KnowledgeNavDropdown.types';

function EntryRow({ entry }: { entry: SectionEntry }) {
  const hasNested = Boolean(entry.nested?.items?.length);
  const [open, setOpen] = useState(Boolean(entry.nested?.isOpenByDefault));

  if (!hasNested) {
    return (
      <div className={entry.isActive ? styles.itemActive : styles.item}>
        <span className={entry.isActive ? styles.itemTitleActive : styles.itemTitle}>{entry.title}</span>
        <ChevronIcon direction="right" color={entry.isActive ? '#3B82F6' : '#B0B4B8'} />
      </div>
    );
  }

  const isActive = entry.isActive || open;

  return (
    <div>
      <button
        type="button"
        className={isActive ? styles.itemActive : styles.item}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={isActive ? styles.itemTitleActive : styles.itemTitle}>{entry.title}</span>
        <ChevronIcon direction={open ? 'up' : 'right'} color={isActive ? '#3B82F6' : '#B0B4B8'} />
      </button>
      {open && (
        <div className={styles.subList}>
          {entry.nested!.items.map((leaf) => (
            <div key={leaf.id} className={styles.subItem}>
              <span className={styles.subItemDot} />
              {leaf.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeNavDropdownSection({ section }: { section: SectionConfig }) {
  const hasEntries = Boolean(section.entries?.length);
  const [isOpen, setIsOpen] = useState(Boolean(section.isOpenByDefault));

  if (!hasEntries) {
    return (
      <div className={styles.sectionCollapsed}>
        <span className={styles.sectionTitle}>{section.title}</span>
      </div>
    );
  }

  return (
    <section className={isOpen ? `${styles.section} ${styles.sectionActive}` : styles.sectionCollapsed}>
      <button type="button" className={styles.sectionHeader} onClick={() => setIsOpen((prev) => !prev)}>
        <span className={isOpen ? styles.sectionTitleActive : styles.sectionTitle}>{section.title}</span>
        <ChevronIcon direction={isOpen ? 'up' : 'right'} color={isOpen ? '#3B82F6' : '#B0B4B8'} />
      </button>
      {isOpen && (
        <div className={styles.sectionBody}>
          {section.entries?.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
