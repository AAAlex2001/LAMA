'use client';

import { useState } from 'react';
import { EyeIcon, ShareIcon, TrashIcon, EditNameIcon } from '@/components/icons';
import Tooltip from '@/components/tooltip/tooltip';
import styles from './draft-card.module.scss';

interface DraftCardActionsProps {
  onPreview: () => void;
  onShare: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export default function DraftCardActions({
  onPreview,
  onShare,
  onDelete,
  onEdit,
}: DraftCardActionsProps) {
  const [hoveredButton, setHoveredButton] = useState<'preview' | 'share' | 'delete' | 'edit' | null>(null);

  return (
    <div className={styles.actions}>
      <button
        className={styles.actionButton}
        onClick={onPreview}
        onMouseEnter={() => setHoveredButton('preview')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <EyeIcon width={16} height={16} color="#B0B4B8" />
        {hoveredButton === 'preview' && <Tooltip text="Предпросмотр" />}
      </button>
      <button
        className={`${styles.actionButton} ${styles.actionButtonBordered}`}
        onClick={onShare}
        onMouseEnter={() => setHoveredButton('share')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <ShareIcon width={24} height={24} color="#B0B4B8" />
        {hoveredButton === 'share' && <Tooltip text="Поделиться" />}
      </button>
      <button
        className={`${styles.actionButton} ${styles.actionButtonBordered} ${styles.actionButtonDelete}`}
        onClick={onDelete}
        onMouseEnter={() => setHoveredButton('delete')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <TrashIcon width={15} height={16.67} color="#B0B4B8" />
        {hoveredButton === 'delete' && <Tooltip text="Удалить" />}
      </button>
      <button
        className={`${styles.actionButton} ${styles.actionButtonEdit}`}
        onClick={onEdit}
        onMouseEnter={() => setHoveredButton('edit')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <EditNameIcon width={24} height={24} color="#383F45" />
        {hoveredButton === 'edit' && <Tooltip text="Редактировать" />}
      </button>
    </div>
  );
}
