'use client';

import React, { useState } from 'react';
import ModalBase from '@/components/modal-base';
import Input from '@/components/input';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import styles from './styles.module.scss';

interface ConnectBotModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: (data: any) => void;
}

const ConnectBotModal: React.FC<ConnectBotModalProps> = ({
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const { showSuccess, showError } = useNotifications();
  const [botToken, setBotToken] = useState('');
  const [botDescription, setBotDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!botToken.trim()) {
      setError('Введите токен бота');
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiRequest<{ botError?: string }>('/connect-bot', {
        method: 'POST',
        skipApiPrefix: true,
        body: JSON.stringify({ botToken: botToken.trim(), botDescription: botDescription.trim() }),
      });
      
      if (data.botError) {
        showError(`Бот создан, но подключение не удалось: ${data.botError}`);
      } else {
        showSuccess('Бот успешно создан и подключен');
      }
      
      setBotToken('');
      setError(null);
      onSuccess?.(data);
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Не удалось подключить бота';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setBotToken('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={handleClose}>
      <ModalBase.Content size="md" >
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>Подключение Telegram бота</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="Токен бота"
              placeholder="Введите токен бота"
              value={botToken}
              onChange={setBotToken}
              error={error}
              disabled={isLoading}
              autoFocus
            />
            <Input
              label="Описание бота"
              placeholder="Введите описание бота"
              value={botDescription}
              onChange={setBotDescription}
              error={error}
              disabled={isLoading}
            />
            <ModalBase.Footer className={styles.footer}>
              <Button
                type="submit"
                variant="fill"
                intent="gradient"
                loading={isLoading}
                disabled={isLoading || !botToken.trim()}
              >
                Подключить
              </Button>
            </ModalBase.Footer>
          </form>
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default ConnectBotModal;
