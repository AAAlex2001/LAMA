'use client';

import React, { useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import Loader from '@/components/loader/loader';
import styles from './styles.module.scss';
import CommandForm from './components/CommandForm';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useCreateCommand } from '../../store/hooks';
import { useAppDispatch } from '../../store';
import { setCreateCommandModalOpen, resetCommandForm } from '../../store';
import { InlineKeyboard } from '@/app/[locale]/create-post/store/types';

interface CreateCommandModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  botId?: number;
  onSuccess?: () => void;
}

export interface CommandFormData {
  command: string;
  description: string;
  response_text: string;
  response_media_url?: string;
  response_media_urls?: string[];
  response_media_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: InlineKeyboard;
  scope: 'PRIVATE' | 'GROUPS';
  is_active: boolean;
  botIds: number[];
}

const CreateCommandModal: React.FC<CreateCommandModalProps> = ({
  isOpen,
  onOpenChange,
  botId = 1,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const createCommand = useCreateCommand();

  useEffect(() => {
    dispatch(setCreateCommandModalOpen(isOpen));
    if (!isOpen) {
      dispatch(resetCommandForm());
    }
  }, [isOpen, dispatch]);

  const handleSubmit = async (data: CommandFormData) => {
    try {
      const { botIds, ...commandData } = data;
      const botIdsToUse = botIds.length > 0 ? botIds : (botId ? [botId] : []);
      
      if (botIdsToUse.length === 0) {
        showError('Выберите хотя бы одного бота');
        return;
      }

      const promises = botIdsToUse.map(botId =>
        createCommand.mutateAsync({ botId, data: commandData })
      );

      await Promise.all(promises);
      
      showSuccess(`Команда успешно создана для ${botIdsToUse.length} ${botIdsToUse.length === 1 ? 'бота' : 'ботов'}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать команду';
      showError(errorMessage);
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>Создание команды</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          {createCommand.isPending ? (
            <div className={styles.loaderContainer}>
              <Loader size={32} color="blue" />
            </div>
          ) : (
            <CommandForm onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} />
          )}
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateCommandModal;
