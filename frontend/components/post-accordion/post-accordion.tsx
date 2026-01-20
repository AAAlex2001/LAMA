'use client';

import type { ReactNode } from 'react';
import styles from './post-accordion.module.scss';
import { ChevronDownIcon } from '@/components/icons';

interface PostAccordionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

export default function PostAccordion({ title, isOpen, onToggle, children }: PostAccordionProps) {
  return (
    <div className={styles.root} data-open={isOpen ? 'true' : 'false'}>
      <button className={styles.header} type="button" onClick={onToggle} aria-expanded={isOpen}>
        <div className={styles.headerInner}>
          <span className={styles.title}>{title}</span>
          <ChevronDownIcon className={styles.chevron} width={16} height={16} color="#383F45" />
        </div>
      </button>

      {isOpen && <div className={styles.content}>{children}</div>}
    </div>
  );
}
