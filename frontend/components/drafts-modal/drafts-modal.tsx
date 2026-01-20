'use client';

import { useState } from 'react';
import styles from './drafts-modal.module.scss';
import SearchBar from '@/components/search-bar/search-bar';
import TrashIcon from '@/components/icons/trash-icon';
import Loader from '@/components/loader';
import Checkbox from '@/components/checkbox/checkbox';
import { useDrafts } from './DraftsContext';
import type { Draft } from '@/stores/drafts';

interface DraftsModalProps {
  onSelectDraft: (draft: Draft) => void;
}

export default function DraftsModal({ onSelectDraft }: DraftsModalProps) {
  const {
    isOpen,
    isLoading,
    searchQuery,
    selectedDraftId,
    filteredDrafts,
    setSearchQuery,
    deleteDraft,
    selectDraft,
    getDraft,
    close,
  } = useDrafts();

  const [hoveredDeleteId, setHoveredDeleteId] = useState<number | null>(null);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDraft(id);
  };

  const handleDraftClick = async (draft: Draft) => {
    selectDraft(draft.id);
    try {
      const fullDraft = await getDraft(draft.id);
      onSelectDraft(fullDraft);
      close();
    } catch (error) {
      console.error('Failed to load full draft:', error);
      onSelectDraft(draft);
      close();
    }
  };

  const handleClose = () => {
    close();
  };

  const getDraftPreview = (draft: Draft): string => {
    const text = draft.formatted_content?.text || draft.text_content || '';
    const plainText = text.replace(/<[^>]*>/g, '');
    return plainText.length > 80 ? plainText.substring(0, 80) + '...' : plainText;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.draftsModal} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchWrapper}>
          <SearchBar
            placeholder="Поиск по черновикам"
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <h2 className={styles.modalTitle}>Черновики</h2>

        <div className={styles.draftsList}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <Loader size={24} color="blue" />
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? 'Черновики не найдены' : 'У вас пока нет черновиков'}
            </div>
          ) : (
            filteredDrafts.map((draft) => (
              <div
                key={draft.id}
                className={styles.draftItem}
                onClick={() => handleDraftClick(draft)}
              >
                <Checkbox
                  variant="radio"
                  checked={selectedDraftId === draft.id}
                  onChange={() => handleDraftClick(draft)}
                />
                <div className={styles.draftContent}>
                  <span className={styles.draftText}>{getDraftPreview(draft)}</span>
                  {draft.media_urls && draft.media_urls.length > 0 && (
                    <span className={styles.mediaIndicator}>
                      📎 {draft.media_urls.length} {draft.media_urls.length === 1 ? 'файл' : 'файла'}
                    </span>
                  )}
                </div>
                <div className={styles.deleteButtonWrapper}>
                  <button
                    className={styles.deleteButton}
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
                    <div className={styles.deleteTooltip}>удалить черновик?</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
