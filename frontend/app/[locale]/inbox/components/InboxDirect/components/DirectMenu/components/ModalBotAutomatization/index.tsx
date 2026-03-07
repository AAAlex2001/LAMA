'use client';

import { useState, useMemo } from 'react';
import ModalBase from '@/components/modal-base';
import ChatItem, { ChatProps } from '../ChatItem';
import styles from './style.module.scss';
import { Button } from '@/components/new-button';
import buttonStyles from '@/components/new-button/styles.module.scss';
import { useAppSelector } from '@/app/[locale]/inbox/store';
import { selectBots } from '@/app/[locale]/inbox/store/selectors';
import CreateTriggersModal from '@/app/[locale]/inbox/components/CreateTriggersModal';
import CreateGlobalMessageModal from '@/app/[locale]/inbox/components/CreateGlobalMesssageModal';

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

  const bots = useAppSelector(selectBots)
  const [selectedBotIds, setSelectedBotIds] = useState<Set<number>>(new Set());
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [isGlobalMessageModalOpen, setIsGlobalMessageModalOpen] = useState(false);

  const allSelected = useMemo(() => {
    return bots.length > 0 && selectedBotIds.size === bots.length;
  }, [bots.length, selectedBotIds.size]);

  const handleChatToggle = (chatId: number) => {
    const newSelected = new Set(selectedBotIds);
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId);
    } else {
      newSelected.add(chatId);
    }
    setSelectedBotIds(newSelected);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedBotIds(new Set());
    } else {
      setSelectedBotIds(new Set(bots.map(bot => bot.id)));
    }
  };

  const handleMassMessage = () => {
    if (selectedBotIds.size > 0) {
      setIsGlobalMessageModalOpen(true);
    }
  };

  const handleTrigger = () => {
    if (selectedBotIds.size > 0) {
      setIsTriggerModalOpen(true);
    }
  };

  const selectedBots = useMemo(() => {
    return bots.filter(bot => selectedBotIds.has(bot.id));
  }, [bots, selectedBotIds]);

  return (
    <ModalBase>
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
      <ModalBase.Content size="md" padding="sm">
        <ModalBase.Header>
          <ModalBase.Title>Выберите бота (-ов) для автоматизации</ModalBase.Title>
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
                    checked={selectedBotIds.has(bot.id)}
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
              disabled={selectedBotIds.size === 0}
            >
              Создать массовое сообщение
            </Button>
            <Button
              onClick={handleTrigger}
              variant="outline"
              intent="gradient"
              size="lg"
              style={{ width: '100%' }}
              disabled={selectedBotIds.size === 0}
            >
              <span className={buttonStyles.label}>Создать триггер</span>
            </Button>
          </div>
        </ModalBase.Footer>
      </ModalBase.Content>
      <CreateTriggersModal
        isOpen={isTriggerModalOpen}
        onOpenChange={setIsTriggerModalOpen}
        bots={selectedBots}
        onSuccess={() => {
          setIsTriggerModalOpen(false);
          onTrigger?.(Array.from(selectedBotIds));
        }}
      />
      <CreateGlobalMessageModal
        isOpen={isGlobalMessageModalOpen}
        onOpenChange={setIsGlobalMessageModalOpen}
        bots={selectedBots}
        onSuccess={() => {
          setIsGlobalMessageModalOpen(false);
          onMassMessage?.(Array.from(selectedBotIds));
        }}
      />
    </ModalBase>
  );
}
