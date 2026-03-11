'use client';

import React from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import styles from './styles.module.scss';

interface ConfirmBlockModalProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  username?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const ConfirmBlockModal: React.FC<ConfirmBlockModalProps> = ({
  isOpen,
  onOpenChange,
  username,
  onConfirm,
  onCancel,
}) => {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange?.(false);
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="md" className={styles.modalContent}>
        <ModalBase.Header className={styles.header}>
          <ModalBase.Title className={styles.title}>Подтверждение блокировки</ModalBase.Title>
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalContent}>
            <span className={styles.message}>Вы действительно хотите заблокировать пользователя {username}? </span>
        </ModalBase.Body>

        <ModalBase.Footer className={styles.footer}>
          <Button
            variant="outline"
            intent="gradient"
            size="lg"
            onClick={handleCancel}
          >
            Отмена
          </Button>
          <Button
            variant="fill"
            intent="destructive"
            size="lg"
            onClick={handleConfirm}
          >
            Заблокировать
          </Button>
        </ModalBase.Footer>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default ConfirmBlockModal;
