'use client';

import { ReactNode, useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import styles from './MobileSection.module.scss';

interface MobileSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function MobileSection({ title, children, defaultOpen = false }: MobileSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.title}>{title}</span>
        <span className={open ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}>
          <ChevronDownIcon width={16} height={16} color="#383F45" />
        </span>
      </button>
      {open && <div className={styles.content}>{children}</div>}
    </div>
  );
}
