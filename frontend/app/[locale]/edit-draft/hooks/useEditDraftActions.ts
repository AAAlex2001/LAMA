'use client';

import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch } from '../../create-post/store';
import { saveDraft, publishNow } from '../../create-post/store/thunks';
import { useSelectedChannels } from '../../create-post/hooks/useSelectedChannels';

interface Params {
  draftId: string | null;
}

export function useEditDraftActions({ draftId }: Params) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const selectedChannels = useSelectedChannels();

  async function handleSaveDraft(): Promise<boolean> {
    const channelIds = selectedChannels.map((c) => c.id);
    const result = await dispatch(saveDraft({ channelIds, draftId }));
    if (saveDraft.fulfilled.match(result)) {
      showSuccess('Черновик сохранён!');
      setTimeout(() => { window.location.href = '/drafts'; }, 3000);
      return true;
    }
    if (saveDraft.rejected.match(result)) {
      showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения черновика');
    }
    return false;
  }

  async function handlePublishNow(): Promise<boolean> {
    const channelIds = selectedChannels.map((c) => c.id);
    const result = await dispatch(publishNow(channelIds));
    if (publishNow.fulfilled.match(result)) {
      showSuccess('Публикация поставлена в очередь!');
      setTimeout(() => { window.location.href = '/drafts'; }, 3000);
      return true;
    }
    if (publishNow.rejected.match(result)) {
      showError(typeof result.payload === 'string' ? result.payload : 'Ошибка публикации');
    }
    return false;
  }

  return { handleSaveDraft, handlePublishNow };
}
