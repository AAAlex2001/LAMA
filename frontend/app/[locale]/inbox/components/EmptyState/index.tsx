'use client';

import { FC } from "react";

import styles from './styles.module.scss';
import Button from "@/components/button/button";

const EmptyState: FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            Уведомлений пока нет
          </h2>
          <p className={styles.headerSubtitle}>
            Здесь будут отображаться заявки, сообщения и системные уведомления
          </p>
        </div>
        <div
          className={styles.headerTitle}
        >
          Подключите Telegram-бота, чтобы получать уведомления
        </div>
        <Button
          text="Подключить бота"
          variant="default"
          active
          onClick={() => {}}
          showArrow={false}
        />
      </div>
    </div>
  )
}

export default EmptyState;