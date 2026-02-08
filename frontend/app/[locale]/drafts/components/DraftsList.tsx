'use client';

import Loader from '@/components/loader';
import DraftCard from './DraftCard';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import styles from '../drafts.module.scss';

interface DraftsListProps {
  drafts: Draft[];
  showInlineLoader: boolean;
  onPreview: (draft: Draft) => void;
  onShare: (draft: Draft) => void;
  onDelete: (draft: Draft) => void;
  onEdit: (draft: Draft) => void;
}

export default function DraftsList({
  drafts,
  showInlineLoader,
  onPreview,
  onShare,
  onDelete,
  onEdit,
}: DraftsListProps) {
  return (
    <div className={styles.list}>
      {drafts.map(draft => (
        <DraftCard
          key={draft.id}
          draft={draft}
          onPreview={() => onPreview(draft)}
          onShare={() => onShare(draft)}
          onDelete={() => onDelete(draft)}
          onEdit={() => onEdit(draft)}
        />
      ))}
      {showInlineLoader && (
        <div className={styles.loaderWrapper}>
          <Loader size={24} color="blue" />
        </div>
      )}
    </div>
  );
}
