'use client';

import styles from './documents-preview.module.scss';
import type { DocumentPreviewItem } from '../store';
import DocumentIcon from '@/components/icons/document-icon';

export interface DocumentsPreviewProps {
  items: DocumentPreviewItem[];
}

export default function DocumentsPreview({ items }: DocumentsPreviewProps) {
  if (items.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.title}>Прикрепленные файлы ({items.length})</div>
      <div className={styles.list}>
        {items.map((doc) => (
          <div key={doc.id} className={styles.row}>
            <div className={styles.icon}>
              <DocumentIcon width={20} height={20} color="#CED2D6" />
            </div>
            <div className={styles.meta}>
              <div className={styles.name}>{doc.name}</div>
              {doc.size && <div className={styles.size}>{doc.size}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
