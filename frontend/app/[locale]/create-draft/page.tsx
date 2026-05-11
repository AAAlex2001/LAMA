'use client';

import { useRef, Suspense } from 'react';
import styles from './create-draft.module.scss';

import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/new-button';
import RichTextEditor from '@/components/rich-text-editor/rich-text-editor.container';
import {
  QuizFormConnected,
  InlineButtonsConnected,
  DraftsModalConnected,
  TemplatesModalConnected,
  ReplyModalConnected,
  MediaSectionConnected,
  ActionsMenuConnected,
  ReplyToPostInfoConnected,
} from '../create-post/components';
import { EditorHeaderConnected } from './components';
import Toggle from '@/components/toggle/toggle';
import { hasPlainUrlLikeText } from '@/components/rich-text-editor/editor/link-utils';

import { CreatePostProvider } from '../create-post/store/provider';
import { useAppDispatch, useAppSelector } from '../create-post/store';
import { useSelectedChannels } from '../create-post/hooks/useSelectedChannels';
import * as editorSlice from '../create-post/store/slices/editor';
import * as mediaSlice from '../create-post/store/slices/media';
import { saveDraft } from '../create-post/store/thunks';
import { useSaveTextTemplateMutation } from '@/store/text-templates/queries';
import { useTokenFromUrl } from '../create-post/hooks/useTokenFromUrl';
import { useDraftFromUrl } from '../create-post/hooks/useDraftFromUrl';
import Loader from '@/components/loader';
import { compressImageForPreview, createVideoThumbnail } from '@/components/media-preview/utils';

import { useNotifications } from '@/components/notifications/NotificationProvider';

function CreateDraftPageContent() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  useTokenFromUrl();
  const { isDraftLoading } = useDraftFromUrl();

  const headerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const text = useAppSelector(state => state.editor.text);
  const showLinkPreview = useAppSelector(state => state.editor.showLinkPreview);
  const mediaFiles = useAppSelector(state => state.media.files);
  const isSavingDraft = useAppSelector(state => state.ui.isSavingDraft);
  const selectedChannels = useSelectedChannels();
  const editorMaxLength = mediaFiles.length > 0 ? 1024 : 4096;
  const saveTemplate = useSaveTextTemplateMutation();

  const handleSaveDraft = async () => {
    const result = await dispatch(saveDraft({ channelIds: selectedChannels.map(c => c.id) }));
    if (saveDraft.fulfilled.match(result)) {
      const msg = (result.payload as { message?: string })?.message || 'Черновик сохранён!';
      showSuccess(msg);
      setTimeout(() => {
        window.location.href = '/drafts';
      }, 3000);
    } else if (saveDraft.rejected.match(result)) {
      showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения черновика');
    }
  };

  const editorBlock = (
    <div className={styles.editor}>
      <EditorHeaderConnected
        className={styles.header}
        headerRef={headerRef}
        showSettingsButton={false}
      />

      <div className={styles.content}>
        <RichTextEditor
          ref={editorRef}
          value={text}
          onChange={(v) => dispatch(editorSlice.setText(v))}
          placeholder="Напишите текст публикации..."
          maxLength={editorMaxLength}
          onSaveAsTemplate={(html) =>
            saveTemplate.mutateAsync(html ?? text)
              .then(() => showSuccess('Шаблон успешно сохранён'))
              .catch((err) => showError(err instanceof Error ? err.message : 'Ошибка сохранения шаблона'))
          }
          headerRef={headerRef}
        />

        {text && hasPlainUrlLikeText(text) && (
          <div className={styles.linkPreviewToggle}>
            <span className={styles.linkPreviewLabel}>Показать превью ссылки</span>
            <Toggle checked={showLinkPreview} onChange={(v) => dispatch(editorSlice.setShowLinkPreview(v))} />
          </div>
        )}

        <ActionsMenuConnected
          className={styles.actionsMenu}
          actionsRowClassName={styles.actionsRow}
          actionsRowCenterClassName={styles.actionsRowCenter}
          actionButtonClassName={styles.actionButton}
          actionButtonCenterClassName={styles.actionButtonCenter}
        />

        <ReplyToPostInfoConnected />

        <InlineButtonsConnected className={styles.inlineButtonsSection} />

        <QuizFormConnected />

        <MediaSectionConnected
          className={styles.mediaSection}
          titleClassName={styles.mediaSectionTitle}
          mobilClassName={styles.mediaMobile}
          dropzoneClassName={styles.mediaDropzone}
          dropzoneTextClassName={styles.dropzoneText}
          dropzoneContentClassName={styles.mediaDropzoneContent}
          onFileUpload={async (e) => {
            const files = e.target.files;
            if (!files) return;

            const filePromises = Array.from(files).map(async (file) => {
              const type: 'video' | 'image' | 'document' = file.type.startsWith('video/') ? 'video'
                : file.type.startsWith('image/') ? 'image' : 'document';

              let preview_url: string | undefined;
              let thumbnail_url: string | undefined;

              if (type === 'image') {
                preview_url = await compressImageForPreview(file);
              } else if (type === 'video') {
                thumbnail_url = await createVideoThumbnail(file);
              }

              return {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type,
                file,
                preview_url,
                thumbnail_url,
                size: file.size,
                blur: false,
              };
            });

            const newFiles = await Promise.all(filePromises);
            dispatch(mediaSlice.addFiles(newFiles));
            e.target.value = '';
          }}
          onMoveMedia={(fromId, toId) => dispatch(mediaSlice.moveFile({ sourceId: fromId, targetId: toId }))}
        />
      </div>

      <div className={styles.footerButtons}>
        <Button
          intent="gradient"
          className={styles.saveDraftBtn}
          onClick={handleSaveDraft}
          loading={isSavingDraft}
          disabled={isSavingDraft}
        >
          Сохранить в черновики
        </Button>
      </div>
    </div>
  );

  return (
    <div className={styles.pageWrapper}>
      {isDraftLoading && (
        <div className={styles.draftLoadingOverlay}>
          <Loader size={32} color="blue" />
        </div>
      )}

      <div className={styles.draftsHeaderWrapper}>
        <Button
          intent="gradient"
          onClick={() => { window.location.href = '/drafts'; }}
        >
          Список черновиков
        </Button>
      </div>

      <div
        className={`${styles.mainContent} ${
          isDraftLoading ? styles.contentLoading : styles.contentReady
        }`}
      >
        <div className={styles.editorColumn}>
          {editorBlock}
        </div>
      </div>

      <DraftsModalConnected />
      <TemplatesModalConnected editorRef={editorRef} />
      <ReplyModalConnected />
    </div>
  );
}

export default function CreateDraftPage() {
  return (
    <AppLayout pageTitle="Создание черновика">
      <CreatePostProvider>
        <Suspense fallback={<div>Загрузка...</div>}>
          <CreateDraftPageContent />
        </Suspense>
      </CreatePostProvider>
    </AppLayout>
  );
}
