'use client';

import { FC } from 'react';
import { CloseIcon, EditIcon, ReplyToIcon } from '@/components/icons';
import styles from './styles.module.scss';

interface EditReplyBarProps {
  editingMessage: { id: number; text: string } | null;
  replyingTo: { id: number; text: string } | null;
  onCancelEdit: () => void;
  onCancelReply: () => void;
}

const EditReplyBar: FC<EditReplyBarProps> = ({
  editingMessage,
  replyingTo,
  onCancelEdit,
  onCancelReply,
}) => {
  if (editingMessage) {
    return (
      <div className={styles.editBar}>
        <EditIcon width={18} height={18} color="var(--color-lama-blue)" />
        <div className={styles.editBarContent}>
          <span className={styles.editBarLabel}>Редактирование</span>
          <span className={styles.editBarText}>{editingMessage.text}</span>
        </div>
        <button className={styles.editBarClose} type="button" onClick={onCancelEdit}>
          <CloseIcon width={18} height={18} />
        </button>
      </div>
    );
  }

  if (replyingTo) {
    return (
      <div className={styles.replyBar}>
        <ReplyToIcon width={20} height={20} color="var(--color-lama-blue)" />
        <div className={styles.editBarContent}>
          <span className={styles.editBarLabel}>Ответ</span>
          <span className={styles.editBarText}>{replyingTo.text}</span>
        </div>
        <button className={styles.editBarClose} type="button" onClick={onCancelReply}>
          <CloseIcon width={18} height={18} />
        </button>
      </div>
    );
  }

  return null;
};

export default EditReplyBar;
