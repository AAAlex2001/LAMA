'use client';

import { useState } from 'react';
import type { Draft } from '@/types/post';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useAppDispatch } from '../store';
import { deletePublication, deleteSeries, deleteRepeatPublication } from '../store/thunks';

/**
 * Управляет всеми действиями над постом из календаря: открытие/закрытие preview,
 * подтверждение удаления (обычное + repeat), share-link, edit-навигация.
 */
export function useCalendarPostActions() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const [previewPost, setPreviewPost] = useState<Draft | null>(null);
  const [selectedPost, setSelectedPost] = useState<Draft | null>(null);
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<Draft | null>(null);
  const [repeatDeletePost, setRepeatDeletePost] = useState<Draft | null>(null);
  const [sharingPostId, setSharingPostId] = useState<number | null>(null);

  function openPost(post: Draft) {
    if (post.is_bot_message) return;
    setSelectedPost(post);
  }

  function previewSelected() {
    if (!selectedPost) return;
    setPreviewPost(selectedPost);
    setSelectedPost(null);
  }

  function editSelected() {
    if (!selectedPost) return;
    if (selectedPost.status === 'draft') {
      window.location.href = `/edit-draft?draft=${selectedPost.id}`;
      return;
    }
    if (selectedPost.status === 'scheduled') {
      const params = new URLSearchParams({ post: String(selectedPost.id) });
      if (selectedPost.scheduled_time) params.set('date', selectedPost.scheduled_time);
      window.location.href = `/edit-post?${params}`;
    }
  }

  function startDeleteSelected() {
    if (!selectedPost) return;
    const hasRepeat = selectedPost.repeat_interval && selectedPost.repeat_interval !== 'never';
    if (hasRepeat) {
      setRepeatDeletePost(selectedPost);
    } else {
      setDeleteConfirmPost(selectedPost);
    }
    setSelectedPost(null);
  }

  function startShareSelected() {
    if (!selectedPost) return;
    setSharingPostId(selectedPost.id);
    setSelectedPost(null);
  }

  async function confirmDelete() {
    if (!deleteConfirmPost) return;
    try {
      if (deleteConfirmPost.series_id) {
        await dispatch(deleteSeries({ seriesId: deleteConfirmPost.series_id })).unwrap();
      } else {
        const isPublished = deleteConfirmPost.status === 'published'
          || deleteConfirmPost.status === 'partial_success';
        await dispatch(deletePublication({ id: deleteConfirmPost.id, deleteFromChannel: isPublished })).unwrap();
      }
      showSuccess('Публикация удалена');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Ошибка удаления публикации');
    } finally {
      setDeleteConfirmPost(null);
    }
  }

  async function confirmRepeatDelete(mode: 'this' | 'this_and_following') {
    if (!repeatDeletePost) return;
    try {
      await dispatch(deleteRepeatPublication({
        id: repeatDeletePost.id,
        mode,
        repeatDate: repeatDeletePost.scheduled_time,
      })).unwrap();
      showSuccess(mode === 'this' ? 'Повтор удалён' : 'Повторы удалены');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Ошибка удаления');
    } finally {
      setRepeatDeletePost(null);
    }
  }

  return {
    previewPost,
    setPreviewPost,
    selectedPost,
    setSelectedPost,
    deleteConfirmPost,
    setDeleteConfirmPost,
    repeatDeletePost,
    setRepeatDeletePost,
    sharingPostId,
    setSharingPostId,
    openPost,
    previewSelected,
    editSelected,
    startDeleteSelected,
    startShareSelected,
    confirmDelete,
    confirmRepeatDelete,
  };
}
