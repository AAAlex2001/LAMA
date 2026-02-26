'use client';

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmptyState from "./components/EmptyState";
import InboxList from "./components/InboxList";
import SortingBar from "./components/SortingBar";
import styles from "./styles.module.scss";
import { IInboxItem } from "./components/InboxList/components/ListElement";
import { ListHeaderType } from "./components/InboxList/components/ListHeader";
import InboxDirect from "./components/InboxDirect";

type SortInput = {
  field: string;
  direction: 'asc' | 'desc';
};

const InboxView = () => {
  const searchParams = useSearchParams();
  const { push } = useRouter();

  const [selectedFilter, setSelectedFilter] = useState<ListHeaderType>("all");
  const [currentView, setCurrentView] = useState<"list" | "direct">("list");

  const sort: SortInput | null = useMemo( () => {
    if ( !searchParams ) {
      return null;
    }

    const field = searchParams.get( 'sortField' );
    const direction = searchParams.get( 'sortDirection' );

    if ( !field || !direction ) {
      return null;
    }

    return {
      field,
      direction: direction as 'asc' | 'desc',
    };
  }, [ searchParams ] );

  const handleSortingChange = ( sorting: SortInput | undefined ) => {
    const currentSearchParams = new URLSearchParams( window.location.search );
    currentSearchParams.delete( 'sortField' );
    currentSearchParams.delete( 'sortDirection' );
    if ( sorting ) {
      currentSearchParams.set( 'sortField', sorting.field );
      currentSearchParams.set( 'sortDirection', sorting.direction );
    }
    push( `?${currentSearchParams.toString()}` );
  };

  const data: IInboxItem[] = [
    // Bot Commands
    {
      id: 1,
      type: 'bot',
      eventType: 'command',
      date: '26.12.25 14:00',
      title: 'Команда',
      username: 'Имя пользователя',
      description: '/admin',
    },
    {
      id: 2,
      type: 'bot',
      eventType: 'command',
      date: '26.12.25 14:00',
      title: 'Команда',
      username: 'Имя пользователя',
      description: '/admin',
    },
    {
      id: 3,
      type: 'bot',
      eventType: 'command',
      date: '26.12.25 14:00',
      title: 'Команда',
      username: 'Имя пользователя',
      description: '/admin',
      status: 'completed',
    },
    // Bot Messages
    {
      id: 4,
      type: 'bot',
      eventType: 'message',
      date: '26.12.25 14:00',
      title: 'Сообщение',
      username: 'Имя пользователя',
      description: 'Здравствуйте, у меня не получается воспользоваться функцией...',
    },
    {
      id: 5,
      type: 'bot',
      eventType: 'message',
      date: '26.12.25 14:00',
      title: 'Сообщение',
      username: 'Имя пользователя',
      description: 'Здравствуйте, у меня не получается воспользоваться функцией...',
      status: 'replied',
    },
    // Channel Comments
    {
      id: 6,
      type: 'channel',
      eventType: 'comment',
      date: '26.12.25 14:00',
      title: 'Комментарий',
      username: 'Имя пользователя',
      description: 'Не получается воспользоваться функцией, что делать...',
    },
    {
      id: 7,
      type: 'channel',
      eventType: 'comment',
      date: '26.12.25 14:00',
      title: 'Комментарий',
      username: 'Имя пользователя',
      description: 'Не получается воспользоваться функцией, что делать...',
      status: 'replied',
    },
    // Channel Applications
    {
      id: 8,
      type: 'channel',
      eventType: 'application',
      date: '26.12.25 14:00',
      title: 'Заявка',
      username: 'Имя пользователя',
    },
    {
      id: 9,
      type: 'channel',
      eventType: 'application',
      date: '26.12.25 14:00',
      title: 'Заявка',
      username: 'Имя пользователя',
      status: 'accepted',
    },
    {
      id: 10,
      type: 'channel',
      eventType: 'application',
      date: '26.12.25 14:00',
      title: 'Заявка',
      username: 'Имя пользователя',
      status: 'declined',
    },
    // Channel Links
    {
      id: 11,
      type: 'channel',
      eventType: 'link',
      date: '26.12.25 14:00',
      title: 'Ссылка',
      username: 'Имя пользователя',
      inviteCode: 'Invite_2025',
    },
    {
      id: 12,
      type: 'channel',
      eventType: 'application',
      date: '26.12.25 14:00',
      title: 'Заявка',
      username: 'Имя пользователя',
      inviteCode: 'Invite_2025',
    },
    {
      id: 13,
      type: 'channel',
      eventType: 'application',
      date: '26.12.25 14:00',
      title: 'Заявка',
      username: 'Имя пользователя',
      inviteCode: 'Invite_2025',
    },
    {
      id: 14,
      type: 'channel',
      eventType: 'application',
      date: '26.12.25 14:00',
      title: 'Заявка',
      username: 'Имя пользователя',
      inviteCode: 'Invite_2025',
      status: 'accepted',
    },
    {
      id: 15,
      type: 'channel',
      eventType: 'application',
      date: '26.12.25 14:00',
      title: 'Заявка',
      username: 'Имя пользователя',
      inviteCode: 'Invite_2025',
      status: 'declined',
    },
    {
      id: 16,
      type: 'channel',
      eventType: 'application',
      date: '26.12.25 14:00',
      title: 'Заявка',
      username: 'Имя пользователя',
      inviteCode: 'Invite_2025',
      status: 'declined',
    },
    // Channel Blocks
    {
      id: 17,
      type: 'channel',
      eventType: 'block',
      date: '26.12.25 14:00',
      title: 'Блокировка',
      username: 'Имя пользователя',
      blockReason: 'Стоп-слово',
      hasDot: true,
    },
    {
      id: 18,
      type: 'channel',
      eventType: 'block',
      date: '26.12.25 14:00',
      title: 'Блокировка',
      username: 'Имя пользователя',
      blockReason: 'Стоп-слово',
      status: 'unblocked',
      hasDot: true,
    },
    {
      id: 19,
      type: 'channel',
      eventType: 'block',
      date: '26.12.25 14:00',
      title: 'Блокировка',
      username: 'Имя пользователя',
      blockReason: 'Правило Х',
      hasDot: true,
    },
    {
      id: 20,
      type: 'channel',
      eventType: 'block',
      date: '26.12.25 14:00',
      title: 'Блокировка',
      username: 'Имя пользователя',
      blockReason: 'Правило Х',
      status: 'unblocked',
      hasDot: true,
    },
    // System Notifications
    {
      id: 21,
      type: 'system',
      eventType: 'notification',
      date: '26.12.25 14:00',
      title: 'Уведомление',
      description: 'Вышла новая функция на платформе. Попробовать...',
      hasDot: true,
    },
    // System Triggers
    {
      id: 22,
      type: 'system',
      eventType: 'trigger',
      date: '26.12.25 14:00',
      title: 'Триггер',
      username: 'Имя пользователя',
      description: 'Вступление в канал',
      hasDot: true,
    },
    // System Auto-replies
    {
      id: 23,
      type: 'system',
      eventType: 'auto-reply',
      date: '26.12.25 14:00',
      title: 'Автоответ',
      username: 'Имя пользователя',
      description: 'Сработал триггер "слово"',
    },
    {
      id: 24,
      type: 'system',
      eventType: 'auto-reply',
      date: '26.12.25 14:00',
      title: 'Автоответ',
      username: 'Имя пользователя',
      description: 'Сработал триггер "слово"',
      status: 'replied',
    },
    // Bot Errors
    {
      id: 25,
      type: 'bot',
      eventType: 'error',
      date: '26.12.25 14:00',
      title: 'Ошибка',
      description: 'Добавьте бота в канал и выдайте ему права админ...',
    },
  ];
  
  const isEmpty = data.length === 0;

  if (isEmpty) {
    return (
      <EmptyState />
    )
  }
  return (
    <div className={styles.container}>
      <SortingBar selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} currentView={currentView} setCurrentView={setCurrentView} />
      {currentView === "list" && <InboxList data={data} type={selectedFilter} />}
      {currentView === "direct" && <InboxDirect />}
    </div>
  )
}

export default InboxView;