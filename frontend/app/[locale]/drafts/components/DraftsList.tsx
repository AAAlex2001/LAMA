'use client';

import Button from '@/components/button/button';
import Loader from '@/components/loader';
import DraftCard from './DraftCard';
import type { Draft } from '@/app/[locale]/create-post/store/types';
import styles from '../drafts.module.scss';

interface DraftsListProps {
  drafts: Draft[];
  isLoading: boolean;
  isInitialDraftsLoaded: boolean;
  showInlineLoader: boolean;
  onPreview: (draft: Draft) => void;
  onShare: (draft: Draft) => void;
  onDelete: (draft: Draft) => void;
  onEdit: (draft: Draft) => void;
}

export default function DraftsList({
  drafts,
  isLoading,
  isInitialDraftsLoaded,
  showInlineLoader,
  onPreview,
  onShare,
  onDelete,
  onEdit,
}: DraftsListProps) {
  if (isInitialDraftsLoaded && !isLoading && drafts.length === 0) {
    return (
      <div className={styles.emptyDraftsState}>
        <div className={styles.emptyDraftsTextWrap}>
          <h3 className={styles.emptyDraftsTitle}>Нет черновиков</h3>
          <p className={styles.emptyDraftsSubtitle}>Сохраняйте идеи и заготовки — позже их можно превратить в публикации</p>
        </div>
        <Button
          text="Создать черновик"
          showArrow={false}
          active
          className={styles.emptyDraftsCreateBtn}
          onClick={() => { window.location.href = '/create-draft'; }}
        />
      </div>
    );
  }

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
