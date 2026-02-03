'use client';

import { useState } from 'react';
import styles from './drafts-modal.module.scss';
import SearchBar from '@/components/search-bar/search-bar';
import TrashIcon from '@/components/icons/trash-icon';
import EyeIcon from '@/components/icons/eye-icon';
import Loader from '@/components/loader';
import Checkbox from '@/components/checkbox/checkbox';
import DeleteConfirmationModal from '@/components/modal';
import type { DraftsModalProps, Draft } from '@/app/[locale]/create-post/store/types';

function getDraftPreview(draft: Draft): string {
  const text = draft.formatted_content?.text || draft.text_content || '';
  const plainText = text.replace(/<[^>]*>/g, '');
  return plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText;
}

export default function DraftsModal({
  isOpen,
  drafts,
  isLoading,
  isLoadingMore,
  hasMore,
  searchQuery,
  selectedDraftId,
  onSearchQueryChange,
  onLoadMore,
  onDelete,
  onSelect,
  onPreview,
  onClose,
}: DraftsModalProps) {
  const [hoveredDeleteId, setHoveredDeleteId] = useState<number | null>(null);
  const [hoveredPreviewId, setHoveredPreviewId] = useState<number | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<number | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    if (scrolledToBottom && hasMore && !isLoadingMore && !searchQuery) {
      onLoadMore();
    }
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmationId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmationId !== null) {
      onDelete(deleteConfirmationId);
      setDeleteConfirmationId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.draftsModal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchWrapper}>
          <SearchBar
            placeholder="Поиск по черновикам"
            value={searchQuery}
            onChange={onSearchQueryChange}
          />
        </div>

        <h2 className={styles.modalTitle}>Черновики</h2>

        <div className={styles.draftsList}>
          <div className={styles.listScroll} onScroll={handleScroll}>
            {isLoading || (drafts.length === 0 && !searchQuery) ? (
              <div className={styles.emptyState}>
                <Loader size={24} color="blue" />
              </div>
            ) : drafts.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery ? 'Черновики не найдены' : 'У вас пока нет черновиков'}
              </div>
            ) : (
              <>
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={styles.draftItem}
                    onClick={() => onSelect(draft)}
                  >
                  <Checkbox
                    variant="radio"
                    checked={selectedDraftId === draft.id}
                    onChange={() => onSelect(draft)}
                  />
                  <div className={styles.draftContent}>
                    <span className={styles.draftText}>{getDraftPreview(draft)}</span>
                    {draft.media_urls && draft.media_urls.length > 0 && (
                      <span className={styles.mediaIndicator}>
                        📎 {draft.media_urls.length} {draft.media_urls.length === 1 ? 'файл' : 'файла'}
                      </span>
                    )}
                  </div>
                  <div className={styles.actionsWrapper}>
                    <div className={styles.actionButtonWrapper}>
                      <button
                        className={styles.actionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(draft);
                        }}
                        onMouseEnter={() => setHoveredPreviewId(draft.id)}
                        onMouseLeave={() => setHoveredPreviewId(null)}
                      >
                        <EyeIcon
                          width={16}
                          height={16}
                          color={hoveredPreviewId === draft.id ? '#3B82F6' : '#B0B4B8'}
                        />
                      </button>
                      {hoveredPreviewId === draft.id && (
                        <div className={styles.actionTooltip}>предпросмотр</div>
                      )}
                    </div>
                    <div className={styles.actionButtonWrapper}>
                      <button
                        className={styles.actionButton}
                        onClick={(e) => handleDelete(draft.id, e)}
                        onMouseEnter={() => setHoveredDeleteId(draft.id)}
                        onMouseLeave={() => setHoveredDeleteId(null)}
                      >
                        <TrashIcon
                          width={16}
                          height={16}
                          color={hoveredDeleteId === draft.id ? '#EF4444' : '#B0B4B8'}
                        />
                      </button>
                      {hoveredDeleteId === draft.id && (
                        <div className={styles.actionTooltip}>удалить?</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
                {isLoadingMore && (
                  <div className={styles.loadingMore}>
                    <Loader size={20} color="blue" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteConfirmationId !== null}
        onClose={() => setDeleteConfirmationId(null)}
        onConfirm={confirmDelete}
        title="Удаление черновика"
      />
    </div>
  );
}
