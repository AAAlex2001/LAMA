'use client';

import { FC, useState } from "react";

import styles from './styles.module.scss';
import { Button } from "@/components/new-button";
import ConnectBotModal from "../ConnectBot";

const EmptyState: FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
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
            variant="fill"
            intent="gradient"
            onClick={() => setIsModalOpen(true)}
            size="lg"
          >
            Подключить бота
          </Button>
        </div>
      </div>
      <ConnectBotModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  )
}

export default EmptyState;