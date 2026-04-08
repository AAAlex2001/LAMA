'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronIcon } from '../icons';
import styles from './KnowledgeNavDropdown.module.scss';
import type { NestedDropdownConfig, SectionConfig } from './KnowledgeNavDropdown.types';

const expandVariants = {
  open: { height: 'auto', opacity: 1 },
  closed: { height: 0, opacity: 0 },
};

function NestedDropdown({ item }: { item: NestedDropdownConfig }) {
  const [isOpen, setIsOpen] = useState(Boolean(item.isOpenByDefault));

  return (
    <div className={styles.treeItem}>
      <button type="button" className={item.isActive ? styles.itemActive : styles.item} onClick={() => setIsOpen((prev) => !prev)}>
        <span className={item.isActive ? styles.itemTitleActive : styles.itemTitle}>{item.title}</span>
        <ChevronIcon direction={isOpen ? 'down' : 'right'} color={item.isActive ? '#3B82F6' : '#B0B4B8'} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="nested-body"
            initial="closed"
            animate="open"
            exit="closed"
            variants={expandVariants}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className={styles.subList}>
              {item.items.map((subItem) => (
                <div key={subItem.id} className={styles.subItem}>
                  <span className={styles.subItemDot} />
                  {subItem.title}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="section-body"
            initial="closed"
            animate="open"
            exit="closed"
            variants={expandVariants}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
