'use client';

import Modal from '@/components/modal';
import type { Draft } from '@/types/post';

interface Props {
  post: Draft | null;
  onClose: () => void;
  onConfirm: () => void;
}

function getDeleteMessage(post: Draft | null): string {
  if (!post) return '';
  if (post.series_id) {
    return 'Все посты серии будут удалены. Опубликованные посты будут также удалены из каналов в Telegram. Это действие нельзя отменить.';
  }
  if (post.status === 'published' || post.status === 'partial_success') {
    return 'Публикация будет удалена из календаря и из канала в Telegram. Это действие нельзя отменить.';
  }
  return 'Публикация будет удалена. Это действие нельзя отменить.';
}

export default function DeletePostModal({ post, onClose, onConfirm }: Props) {
  return (
    <Modal
      isOpen={!!post}
      onClose={onClose}
      onConfirm={onConfirm}
      title={post?.series_id ? 'Удалить серию?' : 'Удалить публикацию?'}
      confirmText="Удалить"
      cancelText="Отмена"
    >
      <p style={{ margin: 0, fontSize: 14, lineHeight: '20px', color: '#0D0D0D' }}>
        {getDeleteMessage(post)}
      </p>
    </Modal>
  );
}
