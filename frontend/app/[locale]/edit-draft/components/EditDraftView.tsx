'use client';

import { useRef, useEffect, useState } from 'react';
import styles from '../edit-draft.module.scss';

import Button from '@/components/button/button';
import { ShareIcon, CopyIcon, TelegramCircleIcon } from '@/components/icons';
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
import Modal from '@/components/modal/modal';
import Input from '@/components/input/input';
import Tooltip from '@/components/tooltip/tooltip';
import SharedDraftModal from '@/components/shared-draft-modal/shared-draft-modal';

import { useAppDispatch, useAppSelector } from '../../create-post/store';
import { selectSelectedChannels } from '../../create-post/store/selectors';
import * as uiSlice from '../../create-post/store/slices/ui';
import {
  saveDraft,
  publishNow,
} from '../../create-post/store/thunks';
import { useTokenFromUrl } from '../../create-post/hooks/useTokenFromUrl';
import { useDraftFromUrl } from '../../create-post/hooks/useDraftFromUrl';
import { usePostEditorChannelEffects } from '../../create-post/hooks/usePostEditorChannelEffects';
import { useSearchParams } from 'next/navigation';
import Loader from '@/components/loader';

import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';

import { useNotifications } from '@/components/notifications/NotificationProvider';

export default function EditDraftView() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const [showShareModal, setShowShareModal] = useState(false);
  const [hoveredShareBtn, setHoveredShareBtn] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const shareLink = shareToken && typeof window !== 'undefined'
    ? `${window.location.origin}/drafts?token=${shareToken}`
    : '';

  const searchParams = useSearchParams();
  const draftId = searchParams?.get('draft');
  const sharedFrom = searchParams?.get('from');
  const shareTokenParam = searchParams?.get('token');
  const skipSharedModal = searchParams?.get('skipSharedModal') === '1';
  const [showSharedDraftModal, setShowSharedDraftModal] = useState(false);
  const [showExpiredLinkModal, setShowExpiredLinkModal] = useState(false);
  const previewingFromSharedRef = useRef(false);

  const generateShareToken = async () => {
    if (!draftId || isGeneratingToken) return;
    setIsGeneratingToken(true);
    try {
      const token = localStorage.getItem('lamaplanner_access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/${draftId}/share`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to generate share token');
      const data = await response.json();
      setShareToken(data.share_token);
    } catch {
      showError('Ошибка генерации ссылки');
      setShowShareModal(false);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const consumeShareToken = async (token: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/shared/${token}/consume`, {
        method: 'POST',
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (showShareModal && !shareToken) {
      generateShareToken();
    }
  }, [showShareModal]);

  useTokenFromUrl();
  usePostEditorChannelEffects();
  const { isDraftLoading, draftLoadError, loadedViaShareToken } = useDraftFromUrl();

  const shareModalShownRef = useRef(false);

  useEffect(() => {
    if (skipSharedModal) return;
    if (sharedFrom && !isDraftLoading) {
      setShowSharedDraftModal(true);
    }
  }, [sharedFrom, isDraftLoading, skipSharedModal]);

  useEffect(() => {
    if (!shareTokenParam) return;
    if (isDraftLoading) return;
    if (shareModalShownRef.current) return;

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
  const inlineButtonsOpen = useAppSelector((state) => state.inlineButtons.isOpen);
  const buttonRows = useAppSelector((state) => state.inlineButtons.rows);
  const mediaFiles = useAppSelector((state) => state.media.files);
  const quizState = useAppSelector((state) => state.quiz);
  const isSavingDraft = useAppSelector((state) => state.ui.isSavingDraft);
  const isPublishing = useAppSelector((state) => state.ui.isPublishing);
  const selectedChannels = useAppSelector(selectSelectedChannels);

  const hasContentForPreview =
    text.replace(/<[^>]*>/g, '').trim().length > 0 ||
    mediaFiles.length > 0 ||
    (quizState.isOpen && quizState.question.trim().length > 0) ||
    (inlineButtonsOpen && buttonRows.length > 0);

  const handleSaveDraft = async (): Promise<boolean> => {
    const result = await dispatch(saveDraft({ channelIds: selectedChannels.map((c) => c.id), draftId }));
    if (saveDraft.fulfilled.match(result)) {
      showSuccess('Черновик сохранён!');
      setTimeout(() => {
        window.location.href = '/drafts';
      }, 3000);
      return true;
    } else if (saveDraft.rejected.match(result)) {
      showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения черновика');
    }
    return false;
  };

  const handlePublishNow = async (): Promise<boolean> => {
    const result = await dispatch(publishNow(selectedChannels.map((c) => c.id)));
    if (publishNow.fulfilled.match(result)) {
      showSuccess('Публикация поставлена в очередь!');
      setTimeout(() => {
        window.location.href = '/drafts';
      }, 3000);
      return true;
    } else if (publishNow.rejected.match(result)) {
      showError(typeof result.payload === 'string' ? result.payload : 'Ошибка публикации');
    }
    return false;
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

      <div className={styles.footerButtons}>
        <Button
          text="Сохранить изменения"
          showArrow={false}
          className={styles.saveBtn}
          onClick={handleSaveDraft}
          loading={isSavingDraft}
          disabled={isSavingDraft}
        />
        <button
          type="button"
          className={styles.shareBtn}
          aria-label="Поделиться"
          onClick={() => setShowShareModal(true)}
          onMouseEnter={() => setHoveredShareBtn(true)}
          onMouseLeave={() => setHoveredShareBtn(false)}
        >
          <ShareIcon width={24} height={24} color="#B0B4B8" />
          {hoveredShareBtn && <Tooltip text="Поделиться" />}
        </button>
        <div className={styles.rightButtons}>
          <button
            type="button"
            className={styles.shareBtnDesktop}
            aria-label="Поделиться"
            onClick={() => setShowShareModal(true)}
            onMouseEnter={() => setHoveredShareBtn(true)}
            onMouseLeave={() => setHoveredShareBtn(false)}
          >
            <ShareIcon width={24} height={24} color="#B0B4B8" />
            {hoveredShareBtn && <Tooltip text="Поделиться" />}
          </button>
          <Button
            text="Опубликовать сейчас"
            showArrow={false}
            className={styles.publishBtn}
            onClick={handlePublishNow}
            loading={isPublishing}
            disabled={isPublishing}
          />
          <Button
            text="Запланировать"
            showArrow={false}
            active
            className={styles.scheduleBtn}
            onClick={() => dispatch(uiSlice.setShowDatePickerModal(true))}
          />
        </div>
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
          text="Список черновиков"
          showArrow={false}
          active
          onClick={() => { window.location.href = '/drafts'; }}
        />
      </div>

      <div
        className={`${styles.mainContent} ${
          isDraftLoading ? styles.contentLoading : styles.contentReady
        }`}
      >
        <div className={styles.editorColumn}>
          {editorBlock}
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

      <SharedDraftModal
        isOpen={showSharedDraftModal}
        onClose={() => setShowSharedDraftModal(false)}
        username={sharedFrom || undefined}
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

      <div className={styles.invalidLinkModal}>
        <Modal
          isOpen={showExpiredLinkModal}
          onClose={() => setShowExpiredLinkModal(false)}
          onConfirm={() => setShowExpiredLinkModal(false)}
          title="Ссылка недействительна"
          hideButtons
        >
          <div className={styles.shareModalContent}>
            <p className={styles.shareDescription}>
              Срок действия ссылки истёк или она уже была использована.
            </p>
            <div className={styles.shareLinkRow}>
              <Button
                text="Список черновиков"
                showArrow={false}
                onClick={() => {
                  window.location.href = '/drafts';
                }}
              />
              <Button
                text="Создать пост"
                showArrow={false}
                active
                className={styles.invalidCreatePostBtn}
                onClick={() => {
                  window.location.href = '/create-post';
                }}
              />
            </div>
          </div>
        </Modal>
      </div>

      <div className={styles.shareModal}>
        <Modal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          onConfirm={() => setShowShareModal(false)}
          title="Поделиться черновиком"
          hideButtons
        >
          <div className={styles.shareModalContent}>
            <p className={styles.shareDescription}>
              Вы можете скопировать ссылку и отправить её удобным способом или нажать на иконку Telegram, после чего выбрать чат и поделиться ссылкой напрямую.<br /><br />
              <strong>Внимание:</strong> ссылка действительна <strong>7 дней</strong> и может быть использована <strong>только один раз</strong>.
            </p>
            <div className={styles.shareLinkRow}>
              <div className={styles.shareLinkInput}>
                <Input
                  value={shareLink}
                  onChange={() => {}}
                  variant="white"
                  icon={<CopyIcon width={24} height={24} color="#383F45" />}
                  iconDisabled={isGeneratingToken || !shareLink}
                  onIconClick={() => {
                    if (!isGeneratingToken && shareLink) {
                      navigator.clipboard.writeText(shareLink);
                      showSuccess('Ссылка скопирована!');
                    }
                  }}
                />
                {isGeneratingToken && (
                  <div className={styles.shareLinkLoader}>
                    <Loader size={16} color="blue" />
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.telegramBtn}
                onClick={() => {
                  if (!isGeneratingToken && shareLink) {
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
                  }
                }}
                disabled={isGeneratingToken || !shareLink}
              >
                <TelegramCircleIcon width={32} height={32} color="#1E1E1E" />
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
