'use client';

import React, { useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import Loader from '@/components/loader/loader';
import styles from './styles.module.scss';
import GlobalMessageForm from './components/GlobalMessageForm';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useSendGlobalMessage } from '../../store/hooks/useGlobalMessages';
import { useAppDispatch } from '../../store';
import { setCreateGlobalMessageModalOpen, resetGlobalMessageForm, setGlobalMessageSelectedBotIds } from '../../store';
import { InlineKeyboard } from '@/app/[locale]/create-post/store/types';

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
  inline_keyboard?: InlineKeyboard;
  chat_id?: number;
}

const CreateGlobalMessageModal: React.FC<CreateGlobalMessageModalProps> = ({
  isOpen,
  onOpenChange,
  bots,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const sendMessage = useSendGlobalMessage();

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
    try {
      const { botIds, ...messageData } = data;
      
      if (botIds.length === 0) {
        showError('Выберите хотя бы одного бота');
        return;
      }

      const promises = botIds.map(botId =>
        sendMessage.mutateAsync({ botId, data: messageData })
      );

      await Promise.all(promises);
      
      showSuccess(`Сообщение успешно отправлено для ${botIds.length} ${botIds.length === 1 ? 'бота' : 'ботов'}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось отправить сообщение';
      showError(errorMessage);
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>Отправка сообщения</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          {sendMessage.isPending ? (
            <div className={styles.loaderContainer}>
              <Loader size={32} color="blue" />
            </div>
          ) : (
            <GlobalMessageForm 
              onSubmit={handleSubmit} 
              onCancel={() => onOpenChange(false)} 
              hideSearchBar={!!bots}
            />
          )}
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateGlobalMessageModal;
