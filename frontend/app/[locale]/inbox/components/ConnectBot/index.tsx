'use client';

import React, { useState } from 'react';
import ModalBase from '@/components/modal-base';
import Input from '@/components/input';
import { Button } from '@/components/new-button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { getAuthToken } from '@/app/[locale]/create-post/store/thunks/api';
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
      const token = getAuthToken();
      const response = await fetch('/connect-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ botToken: botToken.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Не удалось подключить бота');
      }

      const data = await response.json();
      
      if (data.syncError) {
        showError(`Бот подключен, но синхронизация не удалась: ${data.syncError}`);
      } else {
        showSuccess('Бот успешно подключен и синхронизирован');
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
