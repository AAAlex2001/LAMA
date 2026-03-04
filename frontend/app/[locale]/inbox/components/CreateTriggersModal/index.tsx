'use client';

import React, { useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import Loader from '@/components/loader/loader';
import styles from './styles.module.scss';
import TriggerForm from './components/TriggerForm';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useCreateTrigger } from '../../store/hooks';
import { useAppDispatch } from '../../store';
import { setCreateTriggerModalOpen, resetTriggerForm } from '../../store';
import type { TriggerCreate } from '../../store/slices/triggers';

interface CreateTriggersModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  botId: number;
  onSuccess?: () => void;
}

export interface TriggerFormData extends TriggerCreate {}

const CreateTriggersModal: React.FC<CreateTriggersModalProps> = ({
  isOpen,
  onOpenChange,
  botId,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const createTrigger = useCreateTrigger();

  useEffect(() => {
    dispatch(setCreateTriggerModalOpen(isOpen));
    if (!isOpen) {
      dispatch(resetTriggerForm());
    }
  }, [isOpen, dispatch]);

  const handleSubmit = async (data: TriggerFormData) => {
    try {
      await createTrigger.mutateAsync(
        { botId, data },
        {
          onSuccess: () => {
            showSuccess('Триггер успешно создан');
            onSuccess?.();
            onOpenChange(false);
          },
          onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : 'Не удалось создать триггер';
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
          <ModalBase.Title>Создание триггера</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          {createTrigger.isPending ? (
            <div className={styles.loaderContainer}>
              <Loader size={32} color="blue" />
            </div>
          ) : (
            <TriggerForm onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} />
          )}
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateTriggersModal;
