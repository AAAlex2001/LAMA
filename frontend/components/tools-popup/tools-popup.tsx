'use client';

import { useEffect, useRef } from 'react';
import styles from './tools-popup.module.scss';

interface ToolsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
  variant?: 'header' | 'mobile';
}

const toolsItems = [
  {
    title: 'Новая публикация',
    description: 'Быстрый переход к созданию поста',
    href: '/publications/new'
  },
  {
    title: 'Календарь',
    description: 'Визуальный контент-план с запланированными публикациями',
    href: '/calendar'
  },
  {
    title: 'Заметки',
    description: 'Хранение идей, черновиков и материалов для постов',
    href: '/notes'
  },
  {
    title: 'Каналы/группы',
    description: 'Список подключённых Telegram-каналов и чатов',
    href: '/channels'
  },
  {
    title: 'Боты',
    description: 'Управление приветственными ботами и автоматизацией',
    href: '/bots'
  },
  {
    title: 'Inbox',
    description: 'Входящие сообщения и обратная связь от пользователей',
    href: '/inbox'
  },
  {
    title: 'Парсер',
    description: 'Сбор контента и аналитики из внешних источников',
    href: '/parser'
  }
];

export default function ToolsPopup({ isOpen, onClose, anchorElement, variant = 'header' }: ToolsPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Don't close if clicking inside popup or on the anchor element
      if (
        popupRef.current && 
        !popupRef.current.contains(target) &&
        anchorElement &&
        !anchorElement.contains(target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorElement]);

  if (!isOpen) return null;

  return (
    <div className={`${styles.popup} ${styles[variant]}`} ref={popupRef}>
      <div className={styles.content}>
        {toolsItems.map((item, index) => (
          <a 
            key={index} 
            href={item.href} 
            className={styles.item}
            onClick={onClose}
          >
            <div className={styles.title}>{item.title}</div>
            <div className={styles.description}>{item.description}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

