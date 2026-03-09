'use client';

import React from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import styles from './styles.module.scss';

export interface ConfirmInviteLinkData {
  channel: string;
  linkName: string;
  linkType: 'open' | 'closed';
  term?: string; // e.g., "до 25.06.2020"
  method: string; // e.g., "Через бота"
  captcha?: string; // e.g., "включена"
  creationDate: string; // e.g., "12.12.12"
}

interface ConfirmInviteLinkModalProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  data?: ConfirmInviteLinkData;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const ConfirmInviteLinkModal: React.FC<ConfirmInviteLinkModalProps> = ({
  isOpen,
  onOpenChange,
  data,
  onConfirm,
  onCancel,
}) => {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
  };

  if (!data) return null;

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Header>
          <ModalBase.Title>Подтверждение ссылки-приглашения</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          <div className={styles.detailsList}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Канал:</span>
              <span className={styles.detailValue}>{data.channel}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Название ссылки:</span>
              <span className={styles.detailValue}>{data.linkName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Тип ссылки:</span>
              <span className={styles.detailValue}>
                {data.linkType === 'open' ? 'Открытая' : 'Закрытая'}
              </span>
            </div>
            {data.term && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Срок:</span>
                <span className={styles.detailValue}>{data.term}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Способ:</span>
              <span className={styles.detailValue}>{data.method}</span>
            </div>
            {data.captcha && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Капча:</span>
                <span className={styles.detailValue}>{data.captcha}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Дата создания:</span>
              <span className={styles.detailValue}>{data.creationDate}</span>
            </div>
          </div>
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
            intent="primary"
            size="lg"
            onClick={handleConfirm}
            className={styles.confirmButton}
          >
            Создать
          </Button>
        </ModalBase.Footer>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default ConfirmInviteLinkModal;
