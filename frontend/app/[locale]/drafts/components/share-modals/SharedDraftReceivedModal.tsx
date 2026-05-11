'use client';

import SharedDraftModal from '@/components/shared-draft-modal/shared-draft-modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useSaveSharedDraftMutation } from '@/store/publications/queries';
import type { Draft } from '@/types/post';

interface Props {
  isOpen: boolean;
  draft: Draft | null;
  token: string | null;
  onClose: () => void;
  onPreview: () => void;
}

export default function SharedDraftReceivedModal({ isOpen, draft, token, onClose, onPreview }: Props) {
  const { showSuccess, showError } = useNotifications();
  const saveMutation = useSaveSharedDraftMutation();

  async function save() {
    if (!draft || !token) return;
    if (!localStorage.getItem('lamaplanner_access_token')) {
      showError('Нужно войти в аккаунт, чтобы сохранить черновик');
      return;
    }
    try {
      await saveMutation.mutateAsync({ draft, token });
      showSuccess('Черновик сохранён!');
      window.location.href = '/drafts';
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка сохранения черновика');
    }
  }

  function publish() {
    if (!token) return;
    onClose();
    window.location.href = `/edit-draft?token=${encodeURIComponent(token)}&skipSharedModal=1`;
  }

  return (
    <SharedDraftModal
      isOpen={isOpen}
      onClose={onClose}
      username={undefined}
      onSave={save}
      onPublish={publish}
      onPreview={onPreview}
    />
  );
}
