'use client';

import React, { useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import styles from './styles.module.scss';
import TriggerForm from './components/TriggerForm';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useCreateTrigger } from '../../store/hooks';
import { useAppDispatch } from '../../store';
import { setCreateTriggerModalOpen, resetTriggerForm, setTriggerSelectedBotIds, setTriggerIsSubmitting } from '../../store';
import type { TriggerCreate } from '../../store/slices/triggers';

interface CreateTriggersModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  botId?: number;
  bots?: Array<{ id: number; username?: string; title?: string }>;
  onSuccess?: () => void;
}

export interface TriggerFormData extends TriggerCreate {
  botIds: number[];
}

const CreateTriggersModal: React.FC<CreateTriggersModalProps> = ({
  isOpen,
  onOpenChange,
  botId = 1,
  bots,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const createTrigger = useCreateTrigger();

  useEffect(() => {
    dispatch(setCreateTriggerModalOpen(isOpen));
    if (!isOpen) {
      dispatch(resetTriggerForm());
    } else if (bots && bots.length > 0) {
      const botIds = bots.map(bot => bot.id.toString());
      dispatch(setTriggerSelectedBotIds(botIds));
    }
  }, [isOpen, dispatch, bots]);

  const handleSubmit = async (data: TriggerFormData) => {
    try {
      dispatch(setTriggerIsSubmitting(true));
      const { botIds, ...triggerData } = data;
      const botIdsToUse = botIds.length > 0 ? botIds : (botId ? [botId] : []);
      
      if (botIdsToUse.length === 0) {
        showError('Выберите хотя бы одного бота');
        return;
      }

      const promises = botIdsToUse.map(botId =>
        createTrigger.mutateAsync({ botId, data: triggerData })
      );

      await Promise.all(promises);
      
      showSuccess(`Триггер успешно создан для ${botIdsToUse.length} ${botIdsToUse.length === 1 ? 'бота' : 'ботов'}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать триггер';
      showError(errorMessage);
    } finally {
      dispatch(setTriggerIsSubmitting(false));
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>Создание триггера</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          <TriggerForm 
            onSubmit={handleSubmit} 
            onCancel={() => onOpenChange(false)}
            bots={bots}
            hideSearchBar={!!bots}
          />
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateTriggersModal;
