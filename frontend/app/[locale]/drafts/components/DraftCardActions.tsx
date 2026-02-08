'use client';

import { EyeIcon, ShareIcon, TrashIcon, EditNameIcon } from '@/components/icons';
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
  return (
    <div className={styles.actions}>
      <button className={styles.actionButton} onClick={onPreview}>
        <EyeIcon width={16} height={16} color="#B0B4B8" />
      </button>
      <button className={`${styles.actionButton} ${styles.actionButtonBordered}`} onClick={onShare}>
        <ShareIcon width={24} height={24} color="#B0B4B8" />
      </button>
      <button className={`${styles.actionButton} ${styles.actionButtonBordered} ${styles.actionButtonDelete}`} onClick={onDelete}>
        <TrashIcon width={15} height={16.67} color="#B0B4B8" />
      </button>
      <button className={`${styles.actionButton} ${styles.actionButtonEdit}`} onClick={onEdit}>
        <EditNameIcon width={24} height={24} color="#383F45" />
      </button>
    </div>
  );
}
