'use client';

import { useRef } from 'react';
import styles from '../create-post.module.scss';

import Button from '@/components/button/button';
import {
  PostSettingsConnected,
  EditorHeaderConnected,
  FooterButtonsConnected,
  MobileSettingsModalConnected,
} from '../components';
import {
  PostEditorMainFields,
  PostEditorSharedModals,
  type PostEditorMainFieldsClassNames,
} from '../components/post-editor';
import PostAccordion from '@/components/post-accordion/post-accordion';

import { useAppDispatch, useAppSelector } from '../store';
import { selectSelectedChannels } from '../store/selectors';
import * as uiSlice from '../store/slices/ui';
import { selectPollData } from '../store/slices/quiz';
import { usePublishHandlers } from '../hooks/usePublishHandlers';
import { useCreatePostHandlers } from '../hooks/useCreatePostHandlers';
import { useTokenFromUrl } from '../hooks/useTokenFromUrl';
import { useDateFromUrl } from '../hooks/useDateFromUrl';
import { usePostEditorChannelEffects } from '../hooks/usePostEditorChannelEffects';

import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';

export default function CreatePostView() {
  const dispatch = useAppDispatch();

  useTokenFromUrl();
  useDateFromUrl();
  usePostEditorChannelEffects();

  const headerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichTextEditorRef | null>(null);
  const text = useAppSelector((state) => state.editor.text);
  const showLinkPreview = useAppSelector((state) => state.editor.showLinkPreview);
  const inlineButtonsOpen = useAppSelector((state) => state.inlineButtons.isOpen);
  const buttonRows = useAppSelector((state) => state.inlineButtons.rows);
  const mediaFiles = useAppSelector((state) => state.media.files);
  const quizState = useAppSelector((state) => state.quiz);
  const snapshots = useAppSelector((state) => state.series.snapshots);
  const activeIndex = useAppSelector((state) => state.series.activeIndex);
  const pollData = selectPollData(quizState);
  const selectedChannels = useAppSelector(selectSelectedChannels);

  const hasContentForPreview =
    text.replace(/<[^>]*>/g, '').trim().length > 0 ||
    mediaFiles.length > 0 ||
    (quizState.isOpen && quizState.question.trim().length > 0) ||
    (inlineButtonsOpen && buttonRows.length > 0);

  const {
    handleSelectPostSnapshot,
    handleAddSeries,
    handleRemovePost,
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
      />

      <PostEditorMainFields
        styles={styles as PostEditorMainFieldsClassNames}
        headerRef={headerRef}
        editorRef={editorRef}
      />

      <FooterButtonsConnected
        className={styles.footerButtons}
        saveDraftBtnClassName={styles.saveDraftBtn}
        deleteFromSeriesBtnClassName={styles.deleteFromSeriesBtn}
        leftGroupClassName={styles.leftGroup}
        publishRowClassName={styles.publishRow}
        publishNowBtnClassName={styles.publishNowBtn}
        scheduleBtnClassName={styles.scheduleBtn}
        onPublishNow={handlePublishNow}
        onPublishSeries={handlePublishSeries}
        hasMultiplePosts={snapshots.length > 1}
        isLastPost={activeIndex === snapshots.length - 1}
        onRemovePost={(index) => handleRemovePost(index, currentSnapshot)}
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
                <PostAccordion
                  key={`post-${index + 1}`}
                  title={`Пост ${index + 1}`}
                  isOpen={index === activeIndex}
                  onToggle={() => handleSelectPostSnapshot(index, currentSnapshot)}
                >
                  {index === activeIndex ? editorBlock : null}
                </PostAccordion>
              ))}
            </div>
          ) : (
            editorBlock
          )}
          <Button
            text="Добавить серию постов"
            showArrow={false}
            className={styles.addSeriesBtn}
            onClick={() => handleAddSeries(currentSnapshot)}
          />
        </div>
        <div className={styles.settingsPanelDesktop}>
          <PostSettingsConnected
            onPreview={() => dispatch(uiSlice.setShowPreviewModal(true))}
            previewDisabled={!hasContentForPreview}
          />
        </div>
      </div>

      <MobileSettingsModalConnected
        overlayClassName={styles.settingsModalOverlay}
        modalClassName={styles.settingsModal}
        onPreview={() => dispatch(uiSlice.setShowPreviewModal(true))}
        previewDisabled={!hasContentForPreview}
      />

      <PostEditorSharedModals editorRef={editorRef} />
    </div>
  );
}
