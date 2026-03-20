'use client';

import { FC } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import styles from './styles.module.scss';

interface DisconnectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  channelTitle: string;
  onConfirm: () => void;
  loading?: boolean;
}

const DisconnectModal: FC<DisconnectModalProps> = ({
  isOpen,
  onOpenChange,
  channelTitle,
  onConfirm,
  loading,
}) => {
  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="sm" className={styles.modal}>
        <div className={styles.body}>
          <div className={styles.text}>
            <span className={styles.title}>
              Отключить канал &laquo;{channelTitle}&raquo;?
            </span>
            <span className={styles.subtitle}>
              Все связанные с ним источники, публикации и настройки будут потеряны
            </span>
          </div>
          <div className={styles.buttons}>
            <Button
              variant="outline"
              intent="destructive"
              size="lg"
              className={styles.btn}
              onClick={onConfirm}
              loading={loading}
            >
              Отключить
            </Button>
            <Button
              variant="fill"
              intent="gradient"
              size="lg"
              className={styles.btn}
              onClick={() => onOpenChange(false)}
            >
              Назад
            </Button>
          </div>
        </div>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default DisconnectModal;
