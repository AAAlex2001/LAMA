'use client';

import { useRef, Suspense } from 'react';
import styles from './create-draft.module.scss';

import Button from '@/components/button/button';
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
import PostAccordion from '@/components/post-accordion/post-accordion';
import { hasPlainUrlLikeText } from '@/components/rich-text-editor/editor/link-utils';

import { CreatePostProvider } from '../create-post/store/provider';
import { useAppDispatch, useAppSelector } from '../create-post/store';
import { selectSelectedChannels } from '../create-post/store/selectors';
import * as editorSlice from '../create-post/store/slices/editor';
import * as mediaSlice from '../create-post/store/slices/media';
import {
  saveAsTemplate,
  saveDraft,
} from '../create-post/store/thunks';
import { selectPollData } from '../create-post/store/slices/quiz';
import { useCreatePostHandlers } from '../create-post/hooks/useCreatePostHandlers';
import Loader from '@/components/loader';
import { useTokenFromUrl } from '../create-post/hooks/useTokenFromUrl';
import { compressImageForPreview, createVideoThumbnail } from '@/components/media-preview/utils';

import { useNotifications } from '@/components/notifications/NotificationProvider';

function CreateDraftPageContent() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  useTokenFromUrl();

  const headerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const text = useAppSelector(state => state.editor.text);
  const showLinkPreview = useAppSelector(state => state.editor.showLinkPreview);
  const inlineButtonsOpen = useAppSelector(state => state.inlineButtons.isOpen);
  const buttonRows = useAppSelector(state => state.inlineButtons.rows);
  const mediaFiles = useAppSelector(state => state.media.files);
  const quizState = useAppSelector(state => state.quiz);
  const snapshots = useAppSelector(state => state.series.snapshots);
  const activeIndex = useAppSelector(state => state.series.activeIndex);
  const isSavingDraft = useAppSelector(state => state.ui.isSavingDraft);
  const selectedChannels = useAppSelector(selectSelectedChannels);
  const editorMaxLength = mediaFiles.length > 0 ? 1024 : 4096;

  const {
    handleSelectPostSnapshot,
    handleAddSeries,
    handleRemovePost,
  } = useCreatePostHandlers({
    dispatch,
    snapshots,
  });

  const currentSnapshot = {
    text,
    mediaFiles,
    inlineButtonsOpen,
    buttonRows,
    quizOpen: quizState.isOpen,
    quizMode: quizState.mode,
    quizQuestion: quizState.question,
    quizAnswers: quizState.answers,
    quizCorrectAnswerId: quizState.correctAnswerId,
    showLinkPreview,
  };

  const handleSaveDraft = async () => {
    const result = await dispatch(saveDraft(selectedChannels.map(c => c.id)));
    if (saveDraft.fulfilled.match(result)) {
      showSuccess('Черновик сохранён!');
    } else if (saveDraft.rejected.match(result)) {
      showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения черновика');
    }
  };

  const editorBlock = (
    <div className={styles.editor}>
      <EditorHeaderConnected
        className={styles.header}
        headerRef={headerRef}
      />

      <div className={styles.content}>
        <RichTextEditor ref={editorRef} value={text} onChange={(v) => dispatch(editorSlice.setText(v))} placeholder="Напишите текст публикации..." maxLength={editorMaxLength} onSaveAsTemplate={(html) => {
          dispatch(saveAsTemplate(html)).then((result) => {
            if (result.meta.requestStatus === 'fulfilled') {
              showSuccess('Шаблон успешно сохранён');
            } else if (result.meta.requestStatus === 'rejected') {
              showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения шаблона');
            }
          });
        }} headerRef={headerRef} />

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
          text="Сохранить в черновики"
          showArrow={false}
          active
          className={styles.saveDraftBtn}
          onClick={handleSaveDraft}
          loading={isSavingDraft}
          disabled={isSavingDraft}
        />
      </div>
    </div>
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.mainContent}>
        <div className={styles.editorColumn}>
          {snapshots.length > 1 ? (
            <div className={styles.seriesList}>
              {snapshots.map((_, index) => (
                <PostAccordion key={`post-${index + 1}`} title={`Пост ${index + 1}`} isOpen={index === activeIndex} onToggle={() => handleSelectPostSnapshot(index, currentSnapshot)}>
                  {index === activeIndex ? editorBlock : null}
                </PostAccordion>
              ))}
            </div>
          ) : editorBlock}
          <Button text="Добавить серию постов" showArrow={false} className={styles.addSeriesBtn} onClick={() => handleAddSeries(currentSnapshot)} />
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
    <CreatePostProvider>
      <Suspense fallback={<div>Загрузка...</div>}>
        <CreateDraftPageContent />
      </Suspense>
    </CreatePostProvider>
  );
}
