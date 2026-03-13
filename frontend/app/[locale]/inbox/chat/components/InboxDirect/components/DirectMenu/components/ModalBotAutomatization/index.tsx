'use client';

import ModalBase from '@/components/modal-base';
import ChatItem from '../ChatItem';
import styles from './styles.module.scss';
import { Button } from '@/components/new-button';
import buttonStyles from '@/components/new-button/styles.module.scss';
import { useAppSelector } from '@/app/[locale]/inbox/store';
import { selectBots } from '@/app/[locale]/inbox/store/selectors';
import CreateTriggersModal from '@/app/[locale]/inbox/components/CreateTriggersModal';
import CreateGlobalMessageModal from '@/app/[locale]/inbox/chat/components/CreateGlobalMesssageModal';
import { useDirectChat } from '@/app/[locale]/inbox/store/hooks/useDirectChat';

export interface BotProps {
  id: number;
  name: string;
  time: string;
}

interface ModalBotAutomatizationProps {
  bots?: BotProps[];
  onMassMessage?: (selectedChatIds: number[]) => void;
  onTrigger?: (selectedChatIds: number[]) => void;
}

function formatDateTime(isoDateString: string): string {
  const date = new Date(isoDateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year}, ${hours}:${minutes}`;
}

export default function ModalBotAutomatization({
  onMassMessage,
  onTrigger,
}: ModalBotAutomatizationProps) {

  const bots = useAppSelector(selectBots);
  const {
    isBotAutomatizationModalOpen,
    isTriggerModalOpen,
    isGlobalMessageModalOpen,
    selectedBotIds,
    setBotAutomatizationModalOpen,
    setTriggerModalOpen,
    setGlobalMessageModalOpen,
    toggleBotSelection,
    setSelectedBotIds,
  } = useDirectChat();

  const selectedBotIdsSet = new Set(selectedBotIds);
  const allSelected = bots.length > 0 && selectedBotIdsSet.size === bots.length;

  const handleChatToggle = (chatId: number) => {
    toggleBotSelection(chatId);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedBotIds([]);
    } else {
      setSelectedBotIds(bots.map(bot => bot.id));
    }
  };

  const handleMassMessage = () => {
    if (selectedBotIdsSet.size > 0) {
      setGlobalMessageModalOpen(true);
    }
  };

  const handleTrigger = () => {
    if (selectedBotIdsSet.size > 0) {
      setTriggerModalOpen(true);
    }
  };

  const selectedBots = bots.filter(bot => selectedBotIdsSet.has(bot.id));

  return (
    <ModalBase
      isOpen={isBotAutomatizationModalOpen}
      onOpenChange={setBotAutomatizationModalOpen}
    >
      <ModalBase.Trigger asChild>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          style={{ width: '100%' }}
        >
          Автоматизация ботов
        </Button>
      </ModalBase.Trigger>
      <ModalBase.Content size="lg" padding="sm">
        <ModalBase.Header>
          <ModalBase.Title className={styles.header}>Выберите бота (-ов) для автоматизации</ModalBase.Title>
        </ModalBase.Header>
        <ModalBase.Body className={styles.body}>
          {!bots.length && (
            <div className={styles.emptyState}>
              Добавьте ботов, чтобы использовать автоматизацию
            </div>
          )}
          {!!bots.length && (
            <>
              <div className={styles.selectWrapper}>
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  intent={allSelected ? "primary" : "neutral"}
                  size="sm"
                >
                  <span>{!allSelected ? 'Выбрать все' : 'Снять выбор'}</span>
                </Button>
              </div>
              <div className={styles.chatList}>
                {bots.map((bot) => (
                  <ChatItem
                    key={bot.id}
                    id={bot.id}
                    name={bot.username}
                    time={formatDateTime(bot.created_at)}
                    showCheckbox={true}
                    checked={selectedBotIdsSet.has(bot.id)}
                    onCheckChange={() => handleChatToggle(bot.id)}
                  />
                ))}
              </div>
            </>
          )}
        </ModalBase.Body>
        <ModalBase.Footer>
          <div className={styles.actionButtons}>
            <Button
              onClick={handleMassMessage}
              variant="fill"
              intent="gradient"
              size="lg"
              style={{ width: '100%' }}
              disabled={selectedBotIdsSet.size === 0}
            >
              Создать массовое сообщение
            </Button>
            <Button
              onClick={handleTrigger}
              variant="outline"
              intent="gradient"
              size="lg"
              style={{ width: '100%' }}
              disabled={selectedBotIdsSet.size === 0}
            >
              <span className={buttonStyles.label}>Создать триггер</span>
            </Button>
          </div>
        </ModalBase.Footer>
      </ModalBase.Content>
      <CreateTriggersModal
        isOpen={isTriggerModalOpen}
        onOpenChange={setTriggerModalOpen}
        bots={selectedBots}
        onSuccess={() => {
          setTriggerModalOpen(false);
          onTrigger?.(selectedBotIds);
        }}
      />
      <CreateGlobalMessageModal
        isOpen={isGlobalMessageModalOpen}
        onOpenChange={setGlobalMessageModalOpen}
        bots={selectedBots}
        onSuccess={() => {
          setGlobalMessageModalOpen(false);
          onMassMessage?.(selectedBotIds);
        }}
      />
    </ModalBase>
  );
}
