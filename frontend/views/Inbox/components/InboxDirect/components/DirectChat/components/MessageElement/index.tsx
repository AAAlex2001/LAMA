'use client';

import { useState } from 'react';
import styles from './styles.module.scss';
import EditIcon from '@/components/icons/edit-icon';
import TrashIcon from '@/components/icons/trash-icon';
import PlayIcon from '@/components/icons/play-icon';
import DocIcon from '@/components/icons/doc-icon';
import UserIcon from '@/components/icons/user-icon';
import DeleteConfirmationModal from '@/components/modal';

export interface MediaItem {
  type: 'video' | 'file';
  src?: string;
}

export interface MessageProps {
  type: 'incoming' | 'outgoing' | 'system';
  text?: string;
  mediaItems?: MediaItem[];
  time?: string;
}

const MessageElement = ({ type, text, mediaItems, time }: MessageProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    console.log('Delete message');
    setIsDeleteModalOpen(false);
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
  };

  if (type === 'incoming') {
    return (
      <div className={styles.incomingWrapper}>
        <div className={styles.avatar}>
          <UserIcon width={22} height={22} color="#B0B4B8" />
        </div>
        <div className={styles.incomingBubble}>
          {text && <p className={styles.messageText}>{text}</p>}
          {time && <span className={styles.incomingTime}>{time}</span>}
        </div>
      </div>
    );
  }

  if (type === 'system') {
    return (
      <div className={styles.systemMessage}>
        <span className={styles.systemMessageText}>{text}</span>
      </div>
    );
  }

  if (mediaItems && mediaItems.length > 0) {
    return (
      <div className={styles.outgoingWrapper}>
        <div className={styles.mediaGrid}>
          {mediaItems.map((item, i) => (
            <div key={i} className={styles.mediaCell}>
              {item.type === 'video' ? (
                <div className={styles.videoThumb}>
                  <div className={styles.playOverlay}>
                    <PlayIcon width={28} height={28} color="#FFFFFF" />
                  </div>
                </div>
              ) : (
                <div className={styles.fileThumb}>
                  <DocIcon width={28} height={28} color="#B0B4B8" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.outgoingWrapper}>
        <div className={styles.outgoingBubble}>
          {text && <p className={styles.messageText}>{text}</p>}
          <div className={styles.outgoingMeta}>
            <div className={styles.msgActions}>
              <button className={styles.msgAction}>
                <EditIcon width={24} height={24} color="#F1F5FB" />
              </button>
              <button className={styles.msgAction} onClick={handleDeleteClick}>
                <TrashIcon width={24} height={24} color="#F1F5FB" />
              </button>
            </div>
            {time && <span className={styles.outgoingTime}>{time}</span>}
          </div>
        </div>
      </div>
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Удаление сообщения"
        description="Сообщение удалится у обоих участников"
        confirmVariant="outlined-red"
      />
    </>
  );
};

export default MessageElement;
