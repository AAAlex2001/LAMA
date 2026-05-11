'use client';

import { FC, useMemo, useState } from 'react';
import ModalBase from '@/components/modal-base';
import SearchBar from '@/components/search-bar/search-bar';
import { Button } from '@/components/new-button';
import { EditIcon, TrashIcon } from '@/components/icons';
import Tooltip from '@/components/tooltip/tooltip';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useInfoMessagesQuery,
  useUpdateInfoMessageMutation,
  useDeleteInfoMessageMutation,
  type InfoMessage,
} from '@/store/channels';
import draftCardStyles from '@/components/card-action-button';
import styles from '@/components/auto-reply/AutoReplyListModal.module.scss';

interface InfoMessagesListModalProps {
  channelId: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCompose: (editing: InfoMessage | null) => void;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim();
}

const InfoMessagesListModal: FC<InfoMessagesListModalProps> = ({
  channelId,
  isOpen,
  onOpenChange,
  onCompose,
}) => {
  const { showSuccess, showError } = useNotifications();
  const infoQuery = useInfoMessagesQuery(isOpen ? channelId : null);
  const messages = infoQuery.data?.items ?? [];
  const updateMessage = useUpdateInfoMessageMutation();
  const deleteMessage = useDeleteInfoMessageMutation();
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<{ id: number; type: 'delete' | 'edit' } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => stripHtml(m.text || '').toLowerCase().includes(q));
  }, [messages, search]);

  const handleToggle = async (item: InfoMessage) => {
    const next = !item.is_enabled;
    try {
      await updateMessage.mutateAsync({
        channelId,
        messageId: item.id,
        data: { is_enabled: next },
      });
      showSuccess(next ? 'Сообщение активировано' : 'Сообщение отключено');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmDeleteId(null);
    try {
      await deleteMessage.mutateAsync({ channelId, messageId: id });
      showSuccess('Сообщение удалено');
    } catch {
      showError('Ошибка удаления');
    }
  };

  const confirming = confirmDeleteId !== null ? messages.find((m) => m.id === confirmDeleteId) : null;

  return (
    <>
      <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalBase.Content size="xl" className={styles.modal}>
          <ModalBase.Header className={styles.header}>
            <span className={styles.title}>Библиотека информационных сообщений</span>
            <div className={styles.headerControls}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Поиск по сообщениям"
                className={styles.searchBar}
              />
              <Button variant="fill" intent="gradient" size="md" className={styles.addBtn} onClick={() => onCompose(null)}>
                Добавить сообщение
              </Button>
            </div>
            <ModalBase.Close className={styles.headerClose} />
          </ModalBase.Header>

          <ModalBase.Body className={styles.body}>
            {messages.length === 0 ? (
              <div className={styles.empty}>Нет сообщений. Создайте первое!</div>
            ) : filtered.length === 0 ? (
              <div className={styles.empty}>Ничего не найдено</div>
            ) : (
              <div className={styles.grid}>
                {filtered.map((item) => {
                  const selected = item.is_enabled;
                  return (
                    <div key={item.id} className={styles.card}>
                      <div className={styles.cardBody}>
                        <div className={styles.cardResponseBlock}>
                          <span className={styles.cardLabel}>Текст:</span>
                          <span className={styles.cardResponse}>{stripHtml(item.text) || '—'}</span>
                        </div>
                      </div>

                      <div className={styles.cardActions}>
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
                            onClick={() => {
                              onCompose(item);
                              onOpenChange(false);
                            }}
                            onMouseEnter={() => setHoveredBtn({ id: item.id, type: 'edit' })}
                            onMouseLeave={() => setHoveredBtn(null)}
                          >
                            <EditIcon width={16} height={15} color="currentColor" />
                            {hoveredBtn?.id === item.id && hoveredBtn?.type === 'edit' && (
                              <Tooltip text="Редактировать" placement="top" />
                            )}
                          </button>

                          <Button
                            variant={selected ? 'outline' : 'fill'}
                            intent="gradient"
                            size="sm"
                            className={styles.selectBtn}
                            onClick={() => handleToggle(item)}
                          >
                            {selected ? 'Выбран' : 'Выбрать'}
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
            <ModalBase.Title className={styles.confirmTitle}>Удалить сообщение?</ModalBase.Title>
            <ModalBase.Close />
          </ModalBase.Header>
          <ModalBase.Body className={styles.confirmBody}>
            {confirming && (
              <p className={styles.confirmText}>
                Сообщение будет удалено без возможности восстановления.
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

export default InfoMessagesListModal;
