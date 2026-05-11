'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import ModalBase from '@/components/modal-base';
import SearchBar from '@/components/search-bar/search-bar';
import { Button } from '@/components/new-button';
import { EditIcon, TrashIcon, InlineButtonIcon, PhotoIcon, VideoIcon } from '@/components/icons';
import Tooltip from '@/components/tooltip/tooltip';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useBotCommandDispatch, useBotCommandSelector } from './store';
import { setListModalOpen } from './store/slices/list';
import { openCreate, openEdit } from './store/slices/form';
import { deleteBotCommandThunk, toggleBotCommandThunk, fetchBotCommandsThunk } from './store/thunks';
import type { BotCommand } from './store/slices/list';
import draftCardStyles from '@/components/card-action-button';
import styles from './BotCommandListModal.module.scss';

interface BotCommandListModalProps {
  botId: number;
  channelId: number;
}

const BotCommandListModal: FC<BotCommandListModalProps> = ({ botId, channelId }) => {
  const dispatch = useBotCommandDispatch();
  const { showSuccess, showError } = useNotifications();
  const { items, listModalOpen } = useBotCommandSelector((s) => s.list);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<{ id: number; type: 'delete' | 'edit' } | null>(null);

  useEffect(() => {
    if (!listModalOpen) return;
    dispatch(fetchBotCommandsThunk({ botId, channelId }));
  }, [listModalOpen, botId, channelId, dispatch]);

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.command.toLowerCase().includes(q) || stripHtml(i.response_text).toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(null);
    try {
      await dispatch(deleteBotCommandThunk({ botId, commandId: id })).unwrap();
      showSuccess('Команда удалена');
    } catch {
      showError('Ошибка удаления');
    }
  };

  const handleEdit = (item: BotCommand) => {
    dispatch(
      openEdit({
        id: item.id,
        command: item.command,
        description: item.description,
        responseText: item.response_text,
        responseMediaType: item.response_media_type ?? 'TEXT',
        responseMediaUrls: item.response_media_urls ?? (item.response_media_url ? [item.response_media_url] : []),
        responseButtons: item.response_buttons ?? null,
        scope: item.scope ?? 'GROUPS',
        isActive: item.is_active,
        actionType: (item.action_type as any) || 'MESSAGE',
        claimTarget: (item.claim_target as any) || 'ADMINS',
        claimChannelIds: item.claim_channel_ids ?? [],
      }),
    );
  };

  const handleSelect = async (item: BotCommand) => {
    const newActive = !item.is_active;
    try {
      await dispatch(toggleBotCommandThunk({ botId, entryId: item.id, isActive: newActive })).unwrap();
      showSuccess(newActive ? 'Команда активирована' : 'Команда отключена');
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
            <span className={styles.title}>Библиотека команд</span>
            <div className={styles.headerControls}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Поиск по командам"
                className={styles.searchBar}
              />
              <Button variant="fill" intent="gradient" size="md" className={styles.addBtn} onClick={handleCreate}>
                Добавить команду
              </Button>
            </div>
            <ModalBase.Close className={styles.headerClose} />
          </ModalBase.Header>

          <ModalBase.Body className={styles.body}>
            {items.length === 0 ? (
              <div className={styles.empty}>Нет команд. Создайте первую!</div>
            ) : filteredItems.length === 0 ? (
              <div className={styles.empty}>Ничего не найдено</div>
            ) : (
              <div className={styles.grid}>
                {filteredItems.map((item) => {
                  const isSelected = item.is_active;
                  const isVideo = item.response_media_type === 'VIDEO';
                  const hasMedia = !!(item.response_media_url || (item.response_media_urls && item.response_media_urls.length > 0));
                  const hasButtons = !!(item.response_buttons && Object.keys(item.response_buttons).length > 0);
                  const hasIcons = hasMedia || hasButtons;

                  return (
                    <div key={item.id} className={styles.card}>
                      <div className={styles.cardBody}>
                        <div className={styles.cardRow}>
                          <span className={styles.cardLabel}>Команда:</span>
                          <span className={styles.cardTrigger}>{item.command}</span>
                        </div>
                        <div className={styles.cardResponseBlock}>
                          <span className={styles.cardLabel}>Ответ:</span>
                          <span className={styles.cardResponse}>
                            {item.action_type === 'CLAIM_ADMIN' ? 'Жалоба администратору' : stripHtml(item.response_text) || '—'}
                          </span>
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

      <ModalBase isOpen={confirmDeleteId !== null} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}>
        <ModalBase.Content size="sm" className={styles.confirmModal}>
          <ModalBase.Header className={styles.confirmHeader}>
            <ModalBase.Title className={styles.confirmTitle}>Удалить команду?</ModalBase.Title>
            <ModalBase.Close />
          </ModalBase.Header>
          <ModalBase.Body className={styles.confirmBody}>
            {confirmingItem && (
              <p className={styles.confirmText}>
                Команда «{confirmingItem.command}» будет удалена без возможности восстановления.
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

export default BotCommandListModal;
