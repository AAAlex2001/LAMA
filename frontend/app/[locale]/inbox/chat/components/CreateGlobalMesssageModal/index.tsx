'use client';

import React, { useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import styles from './styles.module.scss';
import GlobalMessageForm from './components/GlobalMessageForm';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useSendGlobalMessage } from '../../../store/hooks/useGlobalMessages';
import { useAppDispatch, useAppSelector } from '../../../store';
import { setCreateGlobalMessageModalOpen, resetGlobalMessageForm, setGlobalMessageSelectedBotIds, setGlobalMessageIsLoading } from '../../../store';
import type { InlineKeyboard } from '@/types/post';

interface CreateGlobalMessageModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  bots?: Array<{ id: number; username?: string; title?: string }>;
  onSuccess?: () => void;
}

export interface GlobalMessageFormData {
  botIds: number[];
  text_content?: string;
  media_url?: string;
  media_urls?: string[];
  inline_keyboard?: InlineKeyboard;
}

const CreateGlobalMessageModal: React.FC<CreateGlobalMessageModalProps> = ({
  isOpen,
  onOpenChange,
  bots,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const { sendGlobalMessage } = useSendGlobalMessage();
  const isLoading = useAppSelector((state) => state.createGlobalMessageModal.isLoading);

  useEffect(() => {
    dispatch(setCreateGlobalMessageModalOpen(isOpen));
    if (!isOpen) {
      dispatch(resetGlobalMessageForm());
    } else if (bots && bots.length > 0) {
      const botIds = bots.map(bot => bot.id.toString());
      dispatch(setGlobalMessageSelectedBotIds(botIds));
    }
  }, [isOpen, dispatch, bots]);

  const handleSubmit = async (data: GlobalMessageFormData) => {
    const { botIds, ...messageData } = data;

    if (botIds.length === 0) {
      showError('Выберите хотя бы одного бота');
      return;
    }

    try {
      dispatch(setGlobalMessageIsLoading(true));
      await sendGlobalMessage({ botIds, data: messageData });
      showSuccess(`Сообщение успешно отправлено для ${botIds.length} ${botIds.length === 1 ? 'бота' : 'ботов'}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось отправить сообщение';
      showError(errorMessage);
    } finally {
      dispatch(setGlobalMessageIsLoading(false));
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>Отправка массового сообщения</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          <GlobalMessageForm
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            hideSearchBar={!!bots}
            bots={bots}
            isLoading={isLoading}
          />
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateGlobalMessageModal;