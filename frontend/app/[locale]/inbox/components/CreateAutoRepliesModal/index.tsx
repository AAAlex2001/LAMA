'use client';

import React, { useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import Loader from '@/components/loader/loader';
import styles from './styles.module.scss';
import AutoReplyForm from './components/AutoReplyForm';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useCreateAutoReply } from '../../store/hooks';
import { useAppDispatch } from '../../store';
import { setCreateAutoReplyModalOpen, resetAutoReplyForm } from '../../store';

interface CreateAutoRepliesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  botId: number;
  onSuccess?: () => void;
}

export interface AutoReplyFormData {
  keywords: string[];
  response_text: string;
  response_media_url?: string;
  response_media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: Record<string, unknown>;
  scope: 'PRIVATE' | 'PUBLIC';
  is_active: boolean;
}

const CreateAutoRepliesModal: React.FC<CreateAutoRepliesModalProps> = ({
  isOpen,
  onOpenChange,
  botId,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const createAutoReply = useCreateAutoReply();

  useEffect(() => {
    dispatch(setCreateAutoReplyModalOpen(isOpen));
    if (!isOpen) {
      dispatch(resetAutoReplyForm());
    }
  }, [isOpen, dispatch]);

  const handleSubmit = async (data: AutoReplyFormData) => {
    try {
      await createAutoReply.mutateAsync(
        { botId, data },
        {
          onSuccess: () => {
            showSuccess('Автоответ успешно создан');
            onSuccess?.();
            onOpenChange(false);
          },
          onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : 'Не удалось создать автоответ';
            showError(errorMessage);
          },
        }
      );
    } catch (error) {
      // Error is handled in onError callback
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="md" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>Создание автоответа</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          {createAutoReply.isPending ? (
            <div className={styles.loaderContainer}>
              <Loader size={32} color="blue" />
            </div>
          ) : (
            <AutoReplyForm onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} />
          )}
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateAutoRepliesModal;
