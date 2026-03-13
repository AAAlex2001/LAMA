'use client';

import React, { useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import styles from './styles.module.scss';
import AutoReplyForm from './components/AutoReplyForm';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useCreateAutoReply } from '../../store/hooks';
import { useAppDispatch } from '../../store';
import { setCreateAutoReplyModalOpen, resetAutoReplyForm, setAutoReplyIsSubmitting } from '../../store';
import { InlineKeyboard } from '@/app/[locale]/create-post/store/types';

interface CreateAutoRepliesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: () => void;
}

export interface AutoReplyFormData {
  botIds: number[];
  keywords: string[];
  response_text: string;
  response_media_url?: string;
  response_media_urls?: string[];
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard;
  scope: 'PRIVATE' | 'GROUPS';
  is_active: boolean;
}

const CreateAutoRepliesModal: React.FC<CreateAutoRepliesModalProps> = ({
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const { createAutoReply } = useCreateAutoReply();

  useEffect(() => {
    dispatch(setCreateAutoReplyModalOpen(isOpen));
    if (!isOpen) {
      dispatch(resetAutoReplyForm());
    }
  }, [isOpen, dispatch]);

  const handleSubmit = async (data: AutoReplyFormData) => {
    try {
      dispatch(setAutoReplyIsSubmitting(true));
      const { botIds, ...autoReplyData } = data;
      
      if (botIds.length === 0) {
        showError('Выберите хотя бы одного бота');
        return;
      }

      const promises = botIds.map(botId =>
        createAutoReply({ botId: botId, data: autoReplyData })
      );

      await Promise.all(promises);
      
      showSuccess(`Автоответ успешно создан для ${botIds.length} ${botIds.length === 1 ? 'бота' : 'ботов'}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать автоответ';
      showError(errorMessage);
    } finally {
      dispatch(setAutoReplyIsSubmitting(false));
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>Создание автоответа</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          <AutoReplyForm onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} />
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateAutoRepliesModal;
