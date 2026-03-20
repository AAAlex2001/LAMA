'use client';

import { FC, useState } from 'react';
import CreateChannel from '@/components/create-channel/create-channel';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch } from '../../store';
import { addChannelThunk } from '@/app/[locale]/create-post/store/thunks/channels';
import styles from './styles.module.scss';

interface ConnectChannelModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ConnectChannelModal: FC<ConnectChannelModalProps> = ({ isOpen, onOpenChange }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (channelLink: string) => {
    setLoading(true);
    try {
      await dispatch(addChannelThunk(channelLink)).unwrap();
      showSuccess('Канал успешно подключён');
      onOpenChange(false);
    } catch (err) {
      const msg = typeof err === 'string' ? err : 'Не удалось подключить канал';
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <CreateChannel
          onSubmit={handleSubmit}
          onCancel={handleClose}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ConnectChannelModal;
