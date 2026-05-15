'use client';

import Modal from '@/components/modal';
import PostPreviewModal from '@/components/post-preview-modal';
import type { MediaFile } from '@/components/media-preview';
import type { InlineKeyboardPreviewData } from '@/components/post-preview-modal/inline-keyboard-preview/inline-keyboard-preview';

interface DraftsDialogsProps {
  deleteConfirmId: number | null;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  previewData: {
    channelTitle?: string;
    channelPhotoUrl?: string | null;
    channelMembersCount?: number | null;
    channelExtraCount?: string;
    html: string;
    mediaFiles: MediaFile[];
    inlineKeyboard?: InlineKeyboardPreviewData;
    quizData?: {
      mode: 'quiz' | 'poll';
      question: string;
      options: string[];
      isAnonymous: boolean;
      allowsMultipleAnswers: boolean;
      correctAnswerIndex?: number;
    };
  } | null;
  isPreviewOpen: boolean;
  onClosePreview: () => void;
  token?: string;
}

export default function DraftsDialogs({
  deleteConfirmId,
  onCloseDelete,
  onConfirmDelete,
  previewData,
  isPreviewOpen,
  onClosePreview,
  token,
}: DraftsDialogsProps) {
  return (
    <>
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title="Удаление черновика"
        confirmVariant="outlined-red"
      />

      {previewData && (
        <PostPreviewModal
          isOpen={isPreviewOpen}
          onClose={onClosePreview}
          channelTitle={previewData.channelTitle}
          channelExtraCount={previewData.channelExtraCount}
          channelPhotoUrl={previewData.channelPhotoUrl ?? undefined}
          channelMembersCount={previewData.channelMembersCount ?? undefined}
          html={previewData.html}
          mediaFiles={previewData.mediaFiles}
          quizData={previewData.quizData}
          inlineKeyboard={previewData.inlineKeyboard}
          token={token}
        />
      )}
    </>
  );
}
