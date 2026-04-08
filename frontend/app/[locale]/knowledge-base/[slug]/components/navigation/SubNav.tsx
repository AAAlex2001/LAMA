'use client';

import { useState } from 'react';
import BrainIcon from '@/components/icons/brain-icon';
import { MenuIcon } from '../icons';
import KnowledgeNavDropdown from '../knowledge-nav-dropdown/KnowledgeNavDropdown';
import ArticleToc from './ArticleToc';
import styles from './SubNav.module.scss';

export default function SubNav() {
  const [open, setOpen] = useState<'nav' | 'toc' | null>(null);

  return (
    <nav className={styles.subnav}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.pill}
          onClick={() => setOpen((v) => (v === 'nav' ? null : 'nav'))}
        >
          <span className={styles.label}>Блоки знаний</span>
          <BrainIcon width={20} height={20} color="#3B82F6" />
        </button>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label="Меню"
          onClick={() => setOpen((v) => (v === 'toc' ? null : 'toc'))}
        >
          <MenuIcon />
        </button>
      </div>
      {open === 'nav' && <KnowledgeNavDropdown />}
      {open === 'toc' && <ArticleToc />}
    </nav>
  );
}
