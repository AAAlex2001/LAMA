'use client';

import SharedDraftModal from '@/components/shared-draft-modal/shared-draft-modal';
import { API_BASE_URL } from '@/store/api';

interface Props {
  isOpen: boolean;
  username?: string;
  onClose: () => void;
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  onPreview: () => void;
}

/** Заглушка для consume share-token (fire-and-forget). */
export async function consumeShareToken(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/publications/shared/${token}/consume`, { method: 'POST' });
  } catch {
    // ignore
  }
}

export default function SharedDraftReceivedModal({ isOpen, username, onClose, onSave, onPublish, onPreview }: Props) {
  return (
    <SharedDraftModal
      isOpen={isOpen}
      onClose={onClose}
      username={username}
      onSave={onSave}
      onPublish={onPublish}
      onPreview={onPreview}
    />
  );
}
