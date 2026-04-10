'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronIcon } from '../icons';
import styles from './KnowledgeNavDropdown.module.scss';
import type { SectionConfig, SectionEntry } from './KnowledgeNavDropdown.types';

function EntryRow({ entry }: { entry: SectionEntry }) {
  const hasNested = Boolean(entry.nested?.items?.length);
  const [open, setOpen] = useState(Boolean(entry.nested?.isOpenByDefault));
  const [hovered, setHovered] = useState(false);

  if (!hasNested) {
    if (entry.href) {
      return (
        <Link
          href={entry.href}
          className={entry.isActive ? styles.itemActive : styles.item}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span className={entry.isActive ? styles.itemTitleActive : styles.itemTitle}>{entry.title}</span>
          <ChevronIcon direction="right" color={entry.isActive || hovered ? '#3B82F6' : '#B0B4B8'} />
        </Link>
      );
    }

    return (
      <div
        className={entry.isActive ? styles.itemActive : styles.item}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className={entry.isActive ? styles.itemTitleActive : styles.itemTitle}>{entry.title}</span>
        <ChevronIcon direction="right" color={entry.isActive || hovered ? '#3B82F6' : '#B0B4B8'} />
      </div>
    );
  }

  const isActive = open;

  return (
    <div>
      <button
        type="button"
        className={isActive ? styles.itemActive : styles.item}
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className={isActive ? styles.itemTitleActive : styles.itemTitle}>{entry.title}</span>
        <ChevronIcon direction={open ? 'up' : 'right'} color={isActive || hovered ? '#3B82F6' : '#B0B4B8'} />
      </button>
      {open && (
        <div className={styles.subList}>
          {entry.nested!.items.map((leaf) => (
            <a key={leaf.id} href={leaf.href || `#${leaf.id}`} className={styles.subItemLink}>
              <span className={styles.subItemDot} />
              <span className={styles.subItem}>{leaf.title}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KnowledgeNavDropdownSection({ section }: { section: SectionConfig }) {
  const hasEntries = Boolean(section.entries?.length);
  const [isOpen, setIsOpen] = useState(Boolean(section.isOpenByDefault));
  const [hovered, setHovered] = useState(false);

  if (!hasEntries) {
    return (
      <div
        className={styles.sectionCollapsed}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className={styles.sectionTitle}>{section.title}</span>
        <ChevronIcon direction="right" color={hovered ? '#3B82F6' : '#B0B4B8'} />
      </div>
    );
  }

  return (
    <section className={isOpen ? `${styles.section} ${styles.sectionActive}` : styles.sectionCollapsed}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className={isOpen ? styles.sectionTitleActive : styles.sectionTitle}>{section.title}</span>
        <ChevronIcon direction={isOpen ? 'up' : 'right'} color={isOpen || hovered ? '#3B82F6' : '#B0B4B8'} />
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
