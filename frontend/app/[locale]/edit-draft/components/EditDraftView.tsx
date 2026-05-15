'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/new-button';
import Loader from '@/components/loader';
import PostAccordion from '@/components/post-accordion/post-accordion';
import {
  PostSettingsConnected,
  EditorHeaderConnected,
  MobileSettingsModalConnected,
} from '../../create-post/components';
import {
  PostEditorMainFields,
  PostEditorSharedModals,
  type PostEditorMainFieldsClassNames,
} from '../../create-post/components/post-editor';
import createPostStyles from '../../create-post/create-post.module.scss';
import { useAppDispatch, useAppSelector } from '../../create-post/store';
import * as uiSlice from '../../create-post/store/slices/ui';
import { useTokenFromUrl } from '../../create-post/hooks/useTokenFromUrl';
import { useDraftFromUrl } from '../../create-post/hooks/useDraftFromUrl';
import { usePostEditorChannelEffects } from '../../create-post/hooks/usePostEditorChannelEffects';
import { useCreatePostHandlers } from '../../create-post/hooks/useCreatePostHandlers';
import { useEditDraftActions } from '../hooks/useEditDraftActions';
import EditDraftFooter from './EditDraftFooter';
import ShareDraftLinkModal from './share-modals/ShareDraftLinkModal';
import ExpiredLinkModal from './share-modals/ExpiredLinkModal';
import SharedDraftReceivedModal, { consumeShareToken } from './share-modals/SharedDraftReceivedModal';
import styles from '../edit-draft.module.scss';
import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';

export default function EditDraftView() {
  const dispatch = useAppDispatch();

  const searchParams = useSearchParams();
  const draftId = searchParams?.get('draft') ?? null;
  const sharedFrom = searchParams?.get('from');
  const shareTokenParam = searchParams?.get('token');
  const skipSharedModal = searchParams?.get('skipSharedModal') === '1';

  useTokenFromUrl();
  usePostEditorChannelEffects();
  const { isDraftLoading, draftLoadError, loadedViaShareToken } = useDraftFromUrl();
  const { handleSaveDraft, handlePublishNow } = useEditDraftActions({ draftId });

  const [showShareModal, setShowShareModal] = useState(false);
  const [showSharedDraftModal, setShowSharedDraftModal] = useState(false);
  const [showExpiredLinkModal, setShowExpiredLinkModal] = useState(false);
  const previewingFromSharedRef = useRef(false);
  const shareModalShownRef = useRef(false);

  useEffect(() => {
    if (skipSharedModal) return;
    if (sharedFrom && !isDraftLoading) setShowSharedDraftModal(true);
  }, [sharedFrom, isDraftLoading, skipSharedModal]);

  useEffect(() => {
    if (!shareTokenParam || isDraftLoading || shareModalShownRef.current) return;
    if (draftLoadError) {
      setShowExpiredLinkModal(true);
      shareModalShownRef.current = true;
      return;
    }
    if (loadedViaShareToken && !skipSharedModal) {
      setShowSharedDraftModal(true);
      shareModalShownRef.current = true;
    }
  }, [shareTokenParam, isDraftLoading, draftLoadError, loadedViaShareToken, skipSharedModal]);

  const showPreviewModal = useAppSelector((state) => state.ui.showPreviewModal);
  const prevShowPreviewRef = useRef(false);

  useEffect(() => {
    if (prevShowPreviewRef.current && !showPreviewModal && previewingFromSharedRef.current) {
      previewingFromSharedRef.current = false;
      setShowSharedDraftModal(true);
    }
    prevShowPreviewRef.current = showPreviewModal;
  }, [showPreviewModal]);

  const headerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichTextEditorRef | null>(null);

  const text = useAppSelector((state) => state.editor.text);
  const showLinkPreview = useAppSelector((state) => state.editor.showLinkPreview);
  const inlineButtonsOpen = useAppSelector((state) => state.inlineButtons.isOpen);
  const buttonRows = useAppSelector((state) => state.inlineButtons.rows);
  const mediaFiles = useAppSelector((state) => state.media.files);
  const quizState = useAppSelector((state) => state.quiz);
  const isSavingDraft = useAppSelector((state) => state.ui.isSavingDraft);
  const isPublishing = useAppSelector((state) => state.ui.isPublishing);
  const snapshots = useAppSelector((state) => state.series.snapshots);
  const activeIndex = useAppSelector((state) => state.series.activeIndex);
  const selectedTags = useAppSelector((state) => state.settings.selectedTags);

  const { handleSelectPostSnapshot } = useCreatePostHandlers({ dispatch, snapshots, activeIndex });

  const hasContentForPreview =
    text.replace(/<[^>]*>/g, '').trim().length > 0
    || mediaFiles.length > 0
    || (quizState.isOpen && quizState.question.trim().length > 0)
    || (inlineButtonsOpen && buttonRows.length > 0);

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
    selectedTags: selectedTags.map((t) => ({ name: t.name, color: t.color })),
    sourcePublicationId: snapshots[activeIndex]?.sourcePublicationId,
    seriesId: snapshots[activeIndex]?.seriesId,
    seriesOrder: snapshots[activeIndex]?.seriesOrder,
  };

  const isLastSeriesPost = snapshots.length <= 1 || activeIndex === snapshots.length - 1;
  const draftIdNumber = draftId ? Number(draftId) : null;

  const editorBlock = (
    <div className={styles.editor}>
      <EditorHeaderConnected className={styles.header} headerRef={headerRef} />
      <PostEditorMainFields
        styles={styles as PostEditorMainFieldsClassNames}
        headerRef={headerRef}
        editorRef={editorRef}
      />
      <EditDraftFooter
        isSavingDraft={isSavingDraft}
        isPublishing={isPublishing}
        isLastSeriesPost={isLastSeriesPost}
        onSave={handleSaveDraft}
        onPublish={handlePublishNow}
        onSchedule={() => dispatch(uiSlice.setShowDatePickerModal(true))}
        onShare={() => setShowShareModal(true)}
      />
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
          size="lg"
          onClick={() => { window.location.href = '/drafts'; }}
        >
          Список черновиков
        </Button>
      </div>

      <div className={`${styles.mainContent} ${isDraftLoading ? styles.contentLoading : styles.contentReady}`}>
        <div className={styles.editorColumn}>
          {snapshots.length > 1 ? (
            <div className={createPostStyles.seriesList}>
              {snapshots.map((_, index) => (
                <PostAccordion
                  key={`edit-series-${index + 1}`}
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

      <PostEditorSharedModals editorRef={editorRef} datePickerRedirectToDrafts />

      <SharedDraftReceivedModal
        isOpen={showSharedDraftModal}
        username={sharedFrom || undefined}
        onClose={() => setShowSharedDraftModal(false)}
        onSave={async () => {
          setShowSharedDraftModal(false);
          const ok = await handleSaveDraft();
          if (ok && shareTokenParam) await consumeShareToken(shareTokenParam);
        }}
        onPublish={async () => {
          setShowSharedDraftModal(false);
          const ok = await handlePublishNow();
          if (ok && shareTokenParam) await consumeShareToken(shareTokenParam);
        }}
        onPreview={() => {
          previewingFromSharedRef.current = true;
          setShowSharedDraftModal(false);
          dispatch(uiSlice.setShowPreviewModal(true));
        }}
      />

      <ExpiredLinkModal
        isOpen={showExpiredLinkModal}
        onClose={() => setShowExpiredLinkModal(false)}
      />

      <ShareDraftLinkModal
        isOpen={showShareModal}
        draftId={draftIdNumber}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
