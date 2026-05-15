'use client';

import { ReactNode, useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import styles from './MobileSection.module.scss';

interface MobileSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Аккордеон для мобильного варианта главной кошелька.
 *
 * На мобилке (<1440px) — кликабельный заголовок 36px высотой + контент при
 * раскрытии. На десктопе компонент **не используется** — там панели рисуются
 * напрямую внутри двух колонок.
 */
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
