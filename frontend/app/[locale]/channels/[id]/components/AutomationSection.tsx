'use client';

import { FC, useEffect, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import { PlusIcon, TrashIcon, EditIcon } from '@/components/icons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  AutoReplyProvider,
  AutoReplyListModal,
  CreateAutoReplyModal,
  useAutoReplyDispatch,
  useAutoReplySelector,
  setListModalOpen,
} from '@/components/auto-reply';
import type { Channel } from '@/types/channel';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  setInfoMessagesEnabled,
  setEditingMessage,
} from '../../store/slices/automation';
import {
  fetchInfoMessagesThunk,
  toggleInfoMessagesThunk,
  deleteInfoMessageThunk,
} from '../../store/thunks/automation';
import CreateInfoMessageModal from './CreateInfoMessageModal';
import styles from './AutomationSection.module.scss';

interface AutomationSectionProps {
  channel: Channel;
}

const AutoRepliesSection: FC<{ botId: number }> = ({ botId }) => {
  const dispatch = useAutoReplyDispatch();
  const items = useAutoReplySelector((s) => s.list.items);
  const activeCount = items.filter((r) => r.is_active).length;

  return (
    <div className={styles.autoRepliesSection}>
      <div className={styles.autoRepliesHeader}>
        <div className={styles.autoRepliesLabelRow}>
          <span className={styles.autoRepliesLabel}>Автоответы</span>
          {activeCount > 0 && (
            <span className={styles.autoRepliesCount}>{activeCount}</span>
          )}
        </div>
      </div>

      <Button
        variant="fill"
        intent="gradient"
        size="lg"
        className={styles.libraryBtn}
        onClick={() => dispatch(setListModalOpen(true))}
      >
        Библиотека автоответов
      </Button>

      <AutoReplyListModal botId={botId} />
      <CreateAutoReplyModal botId={botId} />
    </div>
  );
};

const AutomationSection: FC<AutomationSectionProps> = ({ channel }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    enabled: infoMessagesEnabled,
    messages,
  } = useAppSelector((s) => s.automation);

  const channelId = channel.id;
  const botId = channel.bot_id;

  useEffect(() => {
    dispatch(fetchInfoMessagesThunk(channelId));
  }, [channelId, dispatch]);

  const handleInfoMessagesToggle = async (enabled: boolean) => {
    dispatch(setInfoMessagesEnabled(enabled));
    try {
      await dispatch(toggleInfoMessagesThunk({ channelId, enabled })).unwrap();
      showSuccess(enabled ? 'Информационные сообщения включены' : 'Информационные сообщения отключены');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await dispatch(deleteInfoMessageThunk({ channelId, messageId })).unwrap();
      showSuccess('Сообщение удалено');
    } catch {
      showError('Ошибка удаления');
    }
  };

  const handleEditMessage = (messageId: number) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      dispatch(setEditingMessage(msg));
      setModalOpen(true);
    }
  };

  const handleCreateNew = () => {
    dispatch(setEditingMessage(null));
    setModalOpen(true);
  };

  return (
    <div className={styles.section}>
      <div className={styles.desktopLayout}>
        <div className={styles.leftColumn}>
          <div className={styles.infoMessagesSection}>
            <div className={styles.infoMessagesHeader}>
              <span className={styles.infoMessagesLabel}>Информационные сообщения</span>
              <Toggle checked={infoMessagesEnabled} onChange={handleInfoMessagesToggle} />
            </div>

            {infoMessagesEnabled && (
              <div className={styles.infoMessagesContent}>
                {messages.map((msg) => (
                  <div key={msg.id} className={styles.messageCard}>
                    <span className={styles.messageText}>
                      {msg.text || 'Сообщение без текста'}
                    </span>
                    <div className={styles.messageActions}>
                      <button
                        type="button"
                        className={styles.messageActionBtn}
                        onClick={() => handleEditMessage(msg.id)}
                      >
                        <EditIcon width={16} height={16} />
                      </button>
                      <button
                        type="button"
                        className={styles.messageDeleteBtn}
                        onClick={() => handleDeleteMessage(msg.id)}
                      >
                        <TrashIcon width={14} height={16} color="currentColor" />
                      </button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  intent="primary"
                  size="lg"
                  className={styles.addMessageBtn}
                  onClick={handleCreateNew}
                >
                  Сообщение
                  <PlusIcon width={16} height={16} color="#3B82F6" />
                </Button>

                <Button
                  variant="fill"
                  intent="gradient"
                  size="lg"
                  className={styles.createBtn}
                  onClick={handleCreateNew}
                >
                  Создать сообщение
                </Button>
              </div>
            )}
          </div>
        </div>

        {botId && (
          <div className={styles.rightColumn}>
            <AutoReplyProvider botId={botId}>
              <AutoRepliesSection botId={botId} />
            </AutoReplyProvider>
          </div>
        )}
      </div>

      <CreateInfoMessageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        channelId={channelId}
        channelTitle={channel.title}
      />
    </div>
  );
};

export default AutomationSection;
