'use client';

import { useState, useMemo } from 'react';
import ModalBase from '@/components/modal-base';
import ChatItem, { ChatProps } from '../ChatItem';
import styles from './style.module.scss';
import { Button } from '@/components/new-button';
import buttonStyles from '@/components/new-button/styles.module.scss';

interface ModalBotAutomatizationProps {
  chats?: ChatProps[];
  onMassMessage?: (selectedChatIds: number[]) => void;
  onTrigger?: (selectedChatIds: number[]) => void;
}

const defaultChats: ChatProps[] = [
  { id: 1, name: 'Назв бота', username: 'Username', time: '8:38' },
  { id: 2, name: 'Назв бота', username: 'Username', time: '8:38' },
  { id: 3, name: 'Назв бота', username: 'Username', time: '8:38' },
  { id: 4, name: 'Назв бота', username: 'Username', time: '8:38' },
];

export default function ModalBotAutomatization({
  chats = defaultChats,
  onMassMessage,
  onTrigger,
}: ModalBotAutomatizationProps) {
  const [selectedChatIds, setSelectedChatIds] = useState<Set<number>>(new Set());

  const allSelected = useMemo(() => {
    return chats.length > 0 && selectedChatIds.size === chats.length;
  }, [chats.length, selectedChatIds.size]);

  const handleChatToggle = (chatId: number) => {
    const newSelected = new Set(selectedChatIds);
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId);
    } else {
      newSelected.add(chatId);
    }
    setSelectedChatIds(newSelected);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedChatIds(new Set());
    } else {
      setSelectedChatIds(new Set(chats.map(chat => chat.id)));
    }
  };

  const handleMassMessage = () => {
    onMassMessage?.(Array.from(selectedChatIds));
  };

  const handleTrigger = () => {
    onTrigger?.(Array.from(selectedChatIds));
  };

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
      <ModalBase.Content size="md">
        <ModalBase.Header>
          <ModalBase.Title>Выберите бота (-ов) для автоматизации</ModalBase.Title>
        </ModalBase.Header>
        <ModalBase.Body className={styles.body}>
          <div className={styles.selectWrapper}>
            <Button
              onClick={handleSelectAll}
              variant="outline"
              intent="neutral"
              size="sm"
            >
              Выбрать все
            </Button>
          </div>
          <div className={styles.chatList}>
            {chats.map((chat) => (
              <ChatItem
                key={chat.id}
                {...chat}
                showCheckbox={true}
                checked={selectedChatIds.has(chat.id)}
                onCheckChange={() => handleChatToggle(chat.id)}
              />
            ))}
          </div>
        </ModalBase.Body>
        <ModalBase.Footer>
          <div className={styles.actionButtons}>
            <Button
              onClick={handleMassMessage}
              variant="fill"
              intent="gradient"
              size="lg"
              style={{ width: '100%' }}
              disabled={selectedChatIds.size === 0}
            >
              Создать массовое сообщение
            </Button>
            <Button
              onClick={handleTrigger}
              variant="outline"
              intent="gradient"
              size="lg"
              style={{ width: '100%' }}
              disabled={selectedChatIds.size === 0}
            >
              <span className={buttonStyles.label}>Создать триггер</span>
            </Button>
          </div>
        </ModalBase.Footer>
      </ModalBase.Content>
    </ModalBase>
  );
}
