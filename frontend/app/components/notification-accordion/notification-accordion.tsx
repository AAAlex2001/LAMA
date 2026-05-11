'use client';

import type { ReactNode } from 'react';
import styles from './notification-accordion.module.scss';
import { ChevronDownIcon } from '@/components/icons';

interface NotificationAccordionProps {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  dropdown?: ReactNode;
}

export default function NotificationAccordion({
  isOpen,
  onToggle,
  children,
  dropdown,
}: NotificationAccordionProps) {
  return (
    <div className={styles.accordion} data-open={isOpen ? 'true' : 'false'}>
      <div className={styles.row}>
        <button className={styles.chevronButton} onClick={onToggle} type="button">
          <ChevronDownIcon width={16} height={16} className={styles.chevron} />
        </button>
        <div className={styles.content}>{children}</div>
      </div>
      {isOpen && dropdown && <div className={styles.dropdown}>{dropdown}</div>}
    </div>
  );
}
