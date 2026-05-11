'use client';

import { FC, useEffect, useRef, useState } from 'react';
import ModalBase from '@/components/modal-base';
import SearchBar from '@/components/search-bar/search-bar';
import { Button } from '@/components/new-button';
import { EditIcon, TrashIcon, InlineButtonIcon, PhotoIcon, VideoIcon } from '@/components/icons';
import Tooltip from '@/components/tooltip/tooltip';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAutoReplyDispatch, useAutoReplySelector } from './store';
import { setListModalOpen } from './store/slices/list';
import { openCreate, openEdit } from './store/slices/form';
import { deleteAutoReplyThunk, toggleAutoReplyThunk, fetchAutoRepliesThunk } from './store/thunks';
import draftCardStyles from '@/components/card-action-button';
import styles from './AutoReplyListModal.module.scss';

interface AutoReplyListModalProps {
  botId: number;
  channelId?: number;
}

const AutoReplyListModal: FC<AutoReplyListModalProps> = ({ botId, channelId }) => {
  const dispatch = useAutoReplyDispatch();
  const { showSuccess, showError } = useNotifications();
  const { items, listModalOpen } = useAutoReplySelector((s) => s.list);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<{ id: number; type: 'delete' | 'edit' } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!listModalOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(fetchAutoRepliesThunk({ botId, channelId, search: search.trim() || undefined }));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, listModalOpen, botId, channelId, dispatch]);

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(null);
    try {
      await dispatch(deleteAutoReplyThunk({ botId, replyId: id })).unwrap();
      showSuccess('Автоответ удалён');
    } catch {
      showError('Ошибка удаления');
    }
  };

  const handleEdit = (item: typeof items[0]) => {
    dispatch(openEdit({
      id: item.id,
      keywords: item.keywords,
      responseText: item.response_text,
      responseMediaType: item.response_media_type ?? 'TEXT',
      responseMediaUrls: item.response_media_urls ?? (item.response_media_url ? [item.response_media_url] : []),
      responseButtons: item.response_buttons ?? null,
      scope: item.scope ?? 'GROUPS',
      isActive: item.is_active,
    }));
  };

  const handleSelect = async (item: typeof items[0]) => {
    const newActive = !item.is_active;
    try {
      await dispatch(toggleAutoReplyThunk({ botId, replyId: item.id, isActive: newActive })).unwrap();
      showSuccess(newActive ? 'Автоответ активирован' : 'Автоответ деактивирован');
    } catch {
      showError('Ошибка изменения статуса');
    }
  };

  const handleCreate = () => dispatch(openCreate());

  const handleClose = (v: boolean) => {
    dispatch(setListModalOpen(v));
    if (!v) setSearch('');
  };

  const confirmingItem = confirmDeleteId !== null ? items.find((i) => i.id === confirmDeleteId) : null;

  return (
    <>
      <ModalBase isOpen={listModalOpen} onOpenChange={handleClose}>
        <ModalBase.Content size="xl" className={styles.modal}>
          <ModalBase.Header className={styles.header}>
            <span className={styles.title}>Библиотека автоответов</span>
            <div className={styles.headerControls}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Поиск по автоответам"
                className={styles.searchBar}
              />
              <Button variant="fill" intent="gradient" size="md" className={styles.addBtn} onClick={handleCreate}>
                Добавить автоответ
              </Button>
            </div>
            <ModalBase.Close className={styles.headerClose} />
          </ModalBase.Header>

          <ModalBase.Body className={styles.body}>
            {items.length === 0 ? (
              <div className={styles.empty}>
                {search.trim() ? 'Ничего не найдено' : 'Нет автоответов. Создайте первый!'}
              </div>
            ) : (
              <div className={styles.grid}>
                {items.map((item) => {
                  const isSelected = item.is_active;
                  const isVideo = item.response_media_type === 'VIDEO';
                  const hasMedia = !!(item.response_media_url || (item.response_media_urls && item.response_media_urls.length > 0));
                  const hasButtons = !!(item.response_buttons && Object.keys(item.response_buttons).length > 0);
                  const hasIcons = hasMedia || hasButtons;

                  return (
                    <div key={item.id} className={styles.card}>
                      <div className={styles.cardBody}>
                        <div className={styles.cardRow}>
                          <span className={styles.cardLabel}>Триггер:</span>
                          <span className={styles.cardTrigger}>{item.keywords.join(', ')}</span>
                        </div>
                        <div className={styles.cardResponseBlock}>
                          <span className={styles.cardLabel}>Ответ:</span>
                          <span className={styles.cardResponse}>{stripHtml(item.response_text)}</span>
                        </div>
                      </div>

                      <div className={`${styles.cardActions} ${hasIcons ? styles.cardActionsSpread : ''}`}>
                        {hasIcons && (
                          <div className={styles.cardIcons}>
                            {hasMedia && !isVideo && <PhotoIcon width={18} height={18} color="#B0B4B8" />}
                            {isVideo && <VideoIcon width={18} height={18} color="#B0B4B8" />}
                            {hasButtons && <InlineButtonIcon width={18} height={18} color="#B0B4B8" />}
                          </div>
                        )}
                        <div className={styles.cardButtons}>
                          <button
                            type="button"
                            className={`${draftCardStyles.actionButton} ${draftCardStyles.actionButtonBordered} ${draftCardStyles.actionButtonDelete}`}
                            onClick={() => setConfirmDeleteId(item.id)}
                            onMouseEnter={() => setHoveredBtn({ id: item.id, type: 'delete' })}
                            onMouseLeave={() => setHoveredBtn(null)}
                          >
                            <TrashIcon width={14} height={15} color="currentColor" />
                            {hoveredBtn?.id === item.id && hoveredBtn?.type === 'delete' && (
                              <Tooltip text="Удалить" placement="top" />
                            )}
                          </button>

                          <button
                            type="button"
                            className={`${draftCardStyles.actionButton} ${draftCardStyles.actionButtonEdit}`}
                            onClick={() => handleEdit(item)}
                            onMouseEnter={() => setHoveredBtn({ id: item.id, type: 'edit' })}
                            onMouseLeave={() => setHoveredBtn(null)}
                          >
                            <EditIcon width={16} height={15} color="currentColor" />
                            {hoveredBtn?.id === item.id && hoveredBtn?.type === 'edit' && (
                              <Tooltip text="Редактировать" placement="top" />
                            )}
                          </button>

                          <Button
                            variant={isSelected ? 'outline' : 'fill'}
                            intent="gradient"
                            size="sm"
                            className={styles.selectBtn}
                            onClick={() => handleSelect(item)}
                          >
                            {isSelected ? 'Выбран' : 'Выбрать'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ModalBase.Body>
        </ModalBase.Content>
      </ModalBase>

      {/* Delete confirmation modal */}
      <ModalBase isOpen={confirmDeleteId !== null} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}>
        <ModalBase.Content size="sm" className={styles.confirmModal}>
          <ModalBase.Header className={styles.confirmHeader}>
            <ModalBase.Title className={styles.confirmTitle}>Удалить автоответ?</ModalBase.Title>
            <ModalBase.Close />
          </ModalBase.Header>
          <ModalBase.Body className={styles.confirmBody}>
            {confirmingItem && (
              <p className={styles.confirmText}>
                Автоответ на «{confirmingItem.keywords.slice(0, 2).join(', ')}{confirmingItem.keywords.length > 2 ? '...' : ''}» будет удалён без возможности восстановления.
              </p>
            )}
            <div className={styles.confirmFooter}>
              <Button variant="outline" intent="gradient" size="lg" onClick={() => setConfirmDeleteId(null)}>
                Отменить
              </Button>
              <Button
                variant="fill"
                intent="destructive"
                size="lg"
                onClick={() => confirmDeleteId !== null && handleDelete(confirmDeleteId)}
              >
                Удалить
              </Button>
            </div>
          </ModalBase.Body>
        </ModalBase.Content>
      </ModalBase>
    </>
  );
};

export default AutoReplyListModal;
