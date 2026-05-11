'use client';

import { FC, useState } from 'react';
import NotificationCategoryAccordion from './NotificationCategoryAccordion';
import {
  BOT_ITEMS,
  MESSAGE_ITEMS,
  ERROR_ITEMS,
  RESULT_ITEMS,
} from './notifications-data';
import styles from '../profile.module.scss';

const NotificationsSection: FC = () => {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const toggle = (key: string) => () =>
    setOpenAccordion(openAccordion === key ? null : key);

  return (
    <section className={`${styles.section} ${styles.notificationsSection}`}>
      <div className={styles.sectionHeaderText}>
        <h2 className={styles.sectionTitle}>Уведомления</h2>
        <p className={styles.sectionDesc}>
          Выберите, какие уведомления вы хотите получать и где именно
        </p>
      </div>
      <div className={styles.notificationHeader}>
        <span />
        <span />
        <div className={styles.notificationColumns}>
          <span>Inbox</span>
          <span className={styles.desktopOnly}>Telegram</span>
          <span className={styles.mobileOnly}>Tg</span>
        </div>
      </div>
      <div className={styles.notificationsList}>
        <NotificationCategoryAccordion
          items={BOT_ITEMS}
          initialAllEnabled
          isOpen={openAccordion === 'bot'}
          onToggle={toggle('bot')}
          summaryItem={BOT_ITEMS[0]}
        />
        <NotificationCategoryAccordion
          items={MESSAGE_ITEMS}
          initialAllEnabled
          isOpen={openAccordion === 'messages'}
          onToggle={toggle('messages')}
          summaryItem={MESSAGE_ITEMS[0]}
        />
        <NotificationCategoryAccordion
          items={ERROR_ITEMS}
          initialAllEnabled={false}
          isOpen={openAccordion === 'errors'}
          onToggle={toggle('errors')}
          summaryItem={ERROR_ITEMS[0]}
        />
        <NotificationCategoryAccordion
          items={RESULT_ITEMS}
          initialAllEnabled={false}
          isOpen={openAccordion === 'results'}
          onToggle={toggle('results')}
          summaryItem={RESULT_ITEMS[0]}
        />
      </div>
    </section>
  );
};

export default NotificationsSection;
