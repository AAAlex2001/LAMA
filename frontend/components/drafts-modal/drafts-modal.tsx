'use client';

import { useState, useEffect } from 'react';
import styles from './drafts-modal.module.scss';
import SearchBar from '@/components/search-bar/search-bar';
import TrashIcon from '@/components/icons/trash-icon';
import Loader from '@/components/loader';
import Checkbox from '@/components/checkbox/checkbox';
import { draftsApi, type Draft } from '@/stores/drafts';

interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDraft: (draft: Draft) => void;
}

export default function DraftsModal({
  isOpen,
  onClose,
  onSelectDraft,
}: DraftsModalProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [hoveredDeleteId, setHoveredDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    }
  }, [isOpen]);

  // Фильтрация черновиков по поиску
  const filteredDrafts = drafts.filter(draft => {
    if (!searchQuery) return true;
    const text = draft.text_content || '';
    const formattedText = draft.formatted_content?.text || '';
    return text.toLowerCase().includes(searchQuery.toLowerCase()) ||
           formattedText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const loadDrafts = async () => {
    setIsLoading(true);
    try {
      const response = await draftsApi.getDrafts();
      setDrafts(response.items);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    // Сразу удаляем из UI
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (selectedDraftId === id) {
      setSelectedDraftId(null);
    }

    // Затем отправляем запрос на сервер
    try {
      await draftsApi.deleteDraft(id);
    } catch (error) {
      console.error('Failed to delete draft:', error);
      // В случае ошибки перезагружаем список
      loadDrafts();
    }
  };

  const handleDraftClick = async (draft: Draft) => {
    setSelectedDraftId(draft.id);
    try {
      // В списке черновиков могут приходить усечённые данные.
      // Всегда подтягиваем полный объект, чтобы media_urls/keyboard не терялись.
      const fullDraft = await draftsApi.getDraft(draft.id);
      onSelectDraft(fullDraft);
      onClose();
    } catch (error) {
      console.error('Failed to load full draft:', error);
      // Fallback: хотя бы загрузим то, что есть.
      onSelectDraft(draft);
      onClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  // Функция для получения превью текста черновика
  const getDraftPreview = (draft: Draft): string => {
    const text = draft.formatted_content?.text || draft.text_content || '';
    // Убираем HTML теги для превью
    const plainText = text.replace(/<[^>]*>/g, '');
    // Обрезаем до 80 символов
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
