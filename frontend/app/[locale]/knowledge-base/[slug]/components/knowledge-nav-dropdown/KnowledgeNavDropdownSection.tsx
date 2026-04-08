'use client';

import { useState } from 'react';
import { ChevronIcon } from '../icons';
import styles from './KnowledgeNavDropdown.module.scss';
import type { NestedDropdownConfig, SectionConfig } from './KnowledgeNavDropdown.types';

function NestedDropdown({ item }: { item: NestedDropdownConfig }) {
  const [isOpen, setIsOpen] = useState(Boolean(item.isOpenByDefault));

  return (
    <div className={styles.treeItem}>
      <button type="button" className={item.isActive ? styles.itemActive : styles.item} onClick={() => setIsOpen((prev) => !prev)}>
        <span className={item.isActive ? styles.itemTitleActive : styles.itemTitle}>{item.title}</span>
        <ChevronIcon direction={isOpen ? 'down' : 'right'} color={item.isActive ? '#3B82F6' : '#B0B4B8'} />
      </button>
      {isOpen ? (
        <div className={styles.subList}>
          {item.items.map((subItem) => (
            <div key={subItem.id} className={styles.subItem}>
              <span className={styles.subItemDot} />
              {subItem.title}
            </div>
          ))}
        </div>
      ) : null}
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
        <span className={styles.sectionTitle}>{section.title}</span>
        <ChevronIcon direction={isOpen ? 'up' : 'right'} color={isOpen ? '#000000' : '#B0B4B8'} />
      </button>
      {isOpen ? (
        <div className={styles.sectionBody}>
          {section.entries?.map((entry) =>
            entry.nested ? (
              <NestedDropdown key={entry.id} item={entry.nested} />
            ) : (
              <button key={entry.id} type="button" className={entry.isActive ? styles.itemActive : styles.item}>
                <span className={entry.isActive ? styles.itemTitleActive : styles.itemTitle}>{entry.title}</span>
                <ChevronIcon direction="right" color={entry.isActive ? '#3B82F6' : '#B0B4B8'} />
              </button>
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
