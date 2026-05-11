'use client';

import { FC, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  AutoReplyProvider,
  AutoReplyListModal,
  CreateAutoReplyModal,
  useAutoReplyDispatch,
  useAutoReplySelector,
  setListModalOpen,
} from '@/components/auto-reply';
import {
  BotCommandProvider,
  BotCommandListModal,
  CreateBotCommandModal,
  useBotCommandDispatch,
  useBotCommandSelector,
  setCommandListModalOpen,
} from '@/components/bot-command';
import type { Channel } from '@/types/channel';
import {
  useInfoMessagesQuery,
  useToggleInfoMessagesMutation,
  useToggleAutoRepliesMutation,
  useQuickCommandsQuery,
  useUpdateQuickCommandsMutation,
  type InfoMessage,
} from '@/store/channels';
import CreateInfoMessageModal from './CreateInfoMessageModal';
import InfoMessagesListModal from './InfoMessagesListModal';
import styles from './AutomationSection.module.scss';

interface AutomationSectionProps {
  channel: Channel;
}

const AutoRepliesSection: FC<{ botId: number; channelId: number; channelTitle?: string }> = ({
  botId,
  channelId,
  channelTitle,
}) => {
  const dispatch = useAutoReplyDispatch();
  const { showSuccess, showError } = useNotifications();
  const items = useAutoReplySelector((s) => s.list.items);
  const activeCount = items.filter((r) => r.is_active).length;
  const infoQuery = useInfoMessagesQuery(channelId);
  const autoReplyEnabled = infoQuery.data?.auto_reply_enabled ?? false;
  const toggleAutoReplies = useToggleAutoRepliesMutation();

  const handleToggleAutoReply = async (enabled: boolean) => {
    try {
      await toggleAutoReplies.mutateAsync({ channelId, enabled });
      showSuccess(enabled ? 'Автоответы включены' : 'Автоответы отключены');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  return (
    <div className={styles.autoRepliesSection}>
      <div className={styles.autoRepliesHeader}>
        <span className={styles.autoRepliesLabel}>Автоответы</span>
        <Toggle checked={autoReplyEnabled} onChange={handleToggleAutoReply} />
      </div>
      {autoReplyEnabled && (
        <>
          <p className={styles.commandsActiveCount}>Активных: {activeCount}</p>
          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            className={styles.libraryBtn}
            onClick={() => dispatch(setListModalOpen(true))}
          >
            Библиотека автоответов
          </Button>
        </>
      )}

      <AutoReplyListModal botId={botId} channelId={channelId} />
      <CreateAutoReplyModal botId={botId} channelId={channelId} channelTitle={channelTitle} />
    </div>
  );
};

const BotCommandsBlock: FC<{ botId: number; channelId: number; channelTitle?: string }> = ({
  botId,
  channelId,
  channelTitle,
}) => {
  const dispatch = useBotCommandDispatch();
  const { showSuccess, showError } = useNotifications();
  const items = useBotCommandSelector((s) => s.list.items);
  const activeCount = items.filter((c) => c.is_active).length;
  const quickCommandsQuery = useQuickCommandsQuery(channelId);
  const commandsEnabled = quickCommandsQuery.data?.commands_enabled ?? false;
  const updateQuickCommands = useUpdateQuickCommandsMutation();

  const handleCommandsToggle = async (enabled: boolean) => {
    try {
      await updateQuickCommands.mutateAsync({
        channelId,
        enabled,
        commands: quickCommandsQuery.data?.enabled_commands ?? [],
      });
      showSuccess(enabled ? 'Команды включены' : 'Команды отключены');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  return (
    <div className={styles.userCommandsSection}>
      <div className={styles.userCommandsHeader}>
        <span className={styles.userCommandsLabel}>Пользовательские команды</span>
        <Toggle checked={commandsEnabled} onChange={handleCommandsToggle} />
      </div>
      {commandsEnabled && (
        <>
          <p className={styles.commandsActiveCount}>Активных: {activeCount}</p>
          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            className={styles.libraryBtn}
            onClick={() => dispatch(setCommandListModalOpen(true))}
          >
            Библиотека команд
          </Button>
          <BotCommandListModal botId={botId} channelId={channelId} />
          <CreateBotCommandModal botId={botId} channelId={channelId} channelTitle={channelTitle} />
        </>
      )}
    </div>
  );
};

const AutomationSection: FC<AutomationSectionProps> = ({ channel }) => {
  const { showSuccess, showError } = useNotifications();
  const [infoFormOpen, setInfoFormOpen] = useState(false);
  const [infoLibraryOpen, setInfoLibraryOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<InfoMessage | null>(null);

  const channelId = channel.id;
  const botId = channel.bot_id;
  const isGroup = channel.channel_type === 'GROUP' || channel.channel_type === 'SUPERGROUP';

  const infoQuery = useInfoMessagesQuery(channelId);
  const toggleInfoMessages = useToggleInfoMessagesMutation();
  const infoMessagesEnabled = infoQuery.data?.enabled ?? false;
  const messages = infoQuery.data?.items ?? [];
  const infoActiveCount = messages.filter((m) => m.is_enabled).length;

  const handleInfoMessagesToggle = async (enabled: boolean) => {
    try {
      await toggleInfoMessages.mutateAsync({ channelId, enabled });
      showSuccess(enabled ? 'Информационные сообщения включены' : 'Информационные сообщения отключены');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const openInfoComposer = (editing: InfoMessage | null) => {
    setEditingMessage(editing);
    setInfoFormOpen(true);
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
                <p className={styles.commandsActiveCount}>Активных: {infoActiveCount}</p>
                <Button
                  variant="fill"
                  intent="gradient"
                  size="lg"
                  className={styles.libraryBtn}
                  onClick={() => setInfoLibraryOpen(true)}
                >
                  Библиотека информационных сообщений
                </Button>
              </div>
            )}
          </div>
        </div>

        {isGroup && botId && (
          <div className={styles.rightColumn}>
            <AutoReplyProvider botId={botId} channelId={channelId}>
              <AutoRepliesSection botId={botId} channelId={channelId} channelTitle={channel.title} />
            </AutoReplyProvider>
          </div>
        )}
      </div>

      {isGroup && botId && (
        <div className={styles.automationExtras}>
          <BotCommandProvider botId={botId} channelId={channelId}>
            <BotCommandsBlock botId={botId} channelId={channelId} channelTitle={channel.title} />
          </BotCommandProvider>
        </div>
      )}

      <InfoMessagesListModal
        channelId={channelId}
        isOpen={infoLibraryOpen}
        onOpenChange={setInfoLibraryOpen}
        onCompose={(editing) => openInfoComposer(editing)}
      />

      <CreateInfoMessageModal
        isOpen={infoFormOpen}
        onClose={() => setInfoFormOpen(false)}
        channelId={channelId}
        channelTitle={channel.title}
        editingMessage={editingMessage}
      />
    </div>
  );
};

export default AutomationSection;
