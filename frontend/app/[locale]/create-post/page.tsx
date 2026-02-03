'use client';

import { useRef, useEffect, Suspense } from 'react';
import styles from './create-post.module.scss';

import Button from '@/components/button/button';
import RichTextEditor from '@/components/rich-text-editor/rich-text-editor.container';
import {
  QuizFormConnected,
  InlineButtonsConnected,
  DraftsModalConnected,
  TemplatesModalConnected,
  ReplyModalConnected,
  DatePickerModalConnected,
  PostSettingsConnected,
  EditorHeaderConnected,
  FooterButtonsConnected,
  MediaSectionConnected,
  PostPreviewModalConnected,
  ActionsMenuConnected,
  MobileSettingsModalConnected,
  ReplyToPostInfoConnected,
} from './components';
import Toggle from '@/components/toggle/toggle';
import PostAccordion from '@/components/post-accordion/post-accordion';
import { hasPlainUrlLikeText } from '@/components/rich-text-editor/editor/link-utils';

import { CreatePostProvider } from './store/provider';
import { useAppDispatch, useAppSelector } from './store';
import { selectSelectedChannels } from './store/selectors';
import * as editorSlice from './store/slices/editor';
import * as mediaSlice from './store/slices/media';
import * as settingsSlice from './store/slices/settings';
import * as uiSlice from './store/slices/ui';
import * as channelsSlice from './store/slices/channels';
import {
  saveAsTemplate,
  fetchChannelsThunk,
} from './store/thunks';
import { selectPollData } from './store/slices/quiz';
import { usePublishHandlers } from './hooks/usePublishHandlers';
import { useCreatePostHandlers } from './hooks/useCreatePostHandlers';
import { useTokenFromUrl } from './hooks/useTokenFromUrl';
import { compressImageForPreview, createVideoThumbnail } from '@/components/media-preview/utils';

import { useNotifications } from '@/components/notifications/NotificationProvider';

function CreatePostPageContent() {
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
  const pollData = selectPollData(quizState);
  const replyToPostState = useAppSelector(state => state.replyToPost);
  const selectedChannels = useAppSelector(selectSelectedChannels);
  const channelsError = useAppSelector(state => state.channels.error);
  const editorMaxLength = mediaFiles.length > 0 ? 1024 : 4096;
  
  const hasContentForPreview = 
    text.replace(/<[^>]*>/g, '').trim().length > 0 ||
    mediaFiles.length > 0 ||
    (quizState.isOpen && quizState.question.trim().length > 0) ||
    (inlineButtonsOpen && buttonRows.length > 0);

  useEffect(() => {
    dispatch(settingsSlice.setReplyToPostId(replyToPostState.selectedPost?.id ?? null));
  }, [dispatch, replyToPostState.selectedPost]);

  useEffect(() => {
    dispatch(fetchChannelsThunk({}));
  }, [dispatch]);

  useEffect(() => {
    if (!channelsError) return;
    showError(channelsError);
    dispatch(channelsSlice.clearError());
  }, [channelsError, dispatch, showError]);

  const {
    handleSelectPostSnapshot,
    handleAddSeries,
  } = useCreatePostHandlers({
    dispatch,
    snapshots,
  });

  const { handlePublishNow, handlePublishSeries } = usePublishHandlers({
    dispatch,
    selectedChannels,
    text,
    mediaFiles,
    pollData,
    snapshots,
    activeIndex,
    inlineButtonsOpen,
    buttonRows,
    quizOpen: quizState.isOpen,
    quizMode: quizState.mode,
    quizQuestion: quizState.question,
    quizAnswers: quizState.answers,
    quizCorrectAnswerId: quizState.correctAnswerId,
    showLinkPreview,
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

  const editorBlock = (
    <div className={styles.editor}>
      <EditorHeaderConnected
        className={styles.header}
        headerRef={headerRef}
        tagClassName={styles.headerTag}
        tagButtonClassName={styles.headerTagButton}
        tagTextClassName={styles.headerTagText}
        tagCloseClassName={styles.headerTagClose}
        settingsButtonClassName={styles.settingsButton}
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

      <FooterButtonsConnected
        className={styles.footerButtons}
        saveDraftBtnClassName={styles.saveDraftBtn}
        publishRowClassName={styles.publishRow}
        publishNowBtnClassName={styles.publishNowBtn}
        scheduleBtnClassName={styles.scheduleBtn}
        onPublishNow={handlePublishNow}
        onPublishSeries={handlePublishSeries}
        hasMultiplePosts={snapshots.length > 1}
      />
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
        <div className={styles.settingsPanelDesktop}>
          <PostSettingsConnected onPreview={() => dispatch(uiSlice.setShowPreviewModal(true))} previewDisabled={!hasContentForPreview} />
        </div>
      </div>

      <MobileSettingsModalConnected
        overlayClassName={styles.settingsModalOverlay}
        modalClassName={styles.settingsModal}
        onPreview={() => dispatch(uiSlice.setShowPreviewModal(true))}
        previewDisabled={!hasContentForPreview}
      />

      <PostPreviewModalConnected />
      
      <DraftsModalConnected />
      <TemplatesModalConnected editorRef={editorRef} />
      <ReplyModalConnected />
      <DatePickerModalConnected />
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <CreatePostProvider>
      <Suspense fallback={<div>Загрузка...</div>}>
        <CreatePostPageContent />
      </Suspense>
    </CreatePostProvider>
  );
}
