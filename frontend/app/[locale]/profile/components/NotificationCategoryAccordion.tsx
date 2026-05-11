'use client';

import { FC, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import NotificationAccordion from '@/components/notification-accordion';
import { type NotificationItem, getToggleStatus } from './notifications-data';
import styles from '../profile.module.scss';

interface NotificationCategoryAccordionProps {
  items: NotificationItem[];
  initialAllEnabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  summaryItem: NotificationItem;
}

const NotificationCategoryAccordion: FC<NotificationCategoryAccordionProps> = ({
  items,
  initialAllEnabled,
  isOpen,
  onToggle,
  summaryItem,
}) => {
  const [inboxStates, setInboxStates] = useState<boolean[]>(() => items.map(() => initialAllEnabled));
  const [telegramStates, setTelegramStates] = useState<boolean[]>(() => items.map(() => initialAllEnabled));

  const inboxStatus = getToggleStatus(inboxStates);
  const telegramStatus = getToggleStatus(telegramStates);

  const toggleAll = (setter: typeof setInboxStates) => {
    setter((prev) => {
      const next = getToggleStatus(prev) !== 'all';
      return prev.map(() => next);
    });
  };

  const updateAt = (setter: typeof setInboxStates, index: number, value: boolean) => {
    setter((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  return (
    <NotificationAccordion
      isOpen={isOpen}
      onToggle={onToggle}
      dropdown={
        <>
          {items.map((item, index) => (
            <div key={index} className={styles.notificationDropdownRow}>
              <span />
              <div className={`${styles.notificationInfo} ${styles.notificationDropdownInfo}`}>
                <span className={styles.notificationTitle}>{item.title}</span>
                <span className={styles.notificationHint}>{item.hint}</span>
              </div>
              <div className={styles.notificationToggles}>
                <Toggle
                  checked={inboxStates[index]}
                  onChange={(checked) => updateAt(setInboxStates, index, checked)}
                />
                <Toggle
                  checked={telegramStates[index]}
                  onChange={(checked) => updateAt(setTelegramStates, index, checked)}
                />
              </div>
            </div>
          ))}
        </>
      }
    >
      <>
        <div className={styles.notificationInfo}>
          <span className={styles.notificationTitle}>{summaryItem.title}</span>
          <span className={styles.notificationHint}>{summaryItem.hint}</span>
        </div>
        <div className={styles.notificationToggles}>
          <Toggle
            checked={inboxStatus === 'all'}
            mixed={inboxStatus === 'mixed'}
            onChange={() => toggleAll(setInboxStates)}
          />
          <Toggle
            checked={telegramStatus === 'all'}
            mixed={telegramStatus === 'mixed'}
            onChange={() => toggleAll(setTelegramStates)}
          />
        </div>
      </>
    </NotificationAccordion>
  );
};

export default NotificationCategoryAccordion;
