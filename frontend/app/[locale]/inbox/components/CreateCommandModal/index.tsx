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

interface CreateCommandModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  botId: number;
  onSuccess?: () => void;
}

export interface CommandFormData {
  command: string;
  description: string;
  response_text: string;
  response_media_url?: string;
  response_media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  response_buttons?: Record<string, unknown>;
  scope: 'PRIVATE' | 'PUBLIC';
  is_active: boolean;
}

const CreateCommandModal: React.FC<CreateCommandModalProps> = ({
  isOpen,
  onOpenChange,
  botId,
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
      await createCommand.mutateAsync(
        { botId, data },
        {
          onSuccess: () => {
            showSuccess('Команда успешно создана');
            onSuccess?.();
            onOpenChange(false);
          },
          onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : 'Не удалось создать команду';
            showError(errorMessage);
          },
        }
      );
    } catch (error) {
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="md" className={styles.modalContent}>
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
