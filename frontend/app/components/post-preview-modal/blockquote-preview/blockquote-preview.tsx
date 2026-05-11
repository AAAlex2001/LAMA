'use client';

import styles from './blockquote-preview.module.scss';
import { QuotePreviewIcon } from '@/components/icons';

interface BlockquotePreviewProps {
  html: string;
}

export default function BlockquotePreview({ html }: BlockquotePreviewProps) {
  if (!html) return null;

  return (
    <div className={styles.blockquoteWrapper}>
      <div className={styles.blockquoteInner}>
        <div className={styles.scrollBar} />
        <div className={styles.contentWrapper}>
          <div className={styles.quoteIconWrapper}>
            <QuotePreviewIcon className={styles.quoteIcon} />
          </div>
          <div
            className={styles.quoteText}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
