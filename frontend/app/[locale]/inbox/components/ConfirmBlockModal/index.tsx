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
        <ModalBase.Header>
          <ModalBase.Title>Подтверждение блокировки</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          <p className={styles.message}>
            Вы действительно хотите заблокировать пользователя
            {username && <span className={styles.username}> {username}</span>}?
          </p>
        </ModalBase.Body>

        <ModalBase.Footer className={styles.footer}>
          <Button
            variant="outline"
            intent="primary"
            size="lg"
            onClick={handleCancel}
            className={styles.cancelButton}
          >
            Отмена
          </Button>
          <Button
            variant="fill"
            intent="destructive"
            size="lg"
            onClick={handleConfirm}
            className={styles.confirmButton}
          >
            Заблокировать
          </Button>
        </ModalBase.Footer>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default ConfirmBlockModal;
