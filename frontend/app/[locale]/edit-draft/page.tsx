'use client';

import { useRef, useEffect, useState, Suspense } from 'react';
import styles from './edit-draft.module.scss';

import { AppLayout } from '@/components/app-layout';
import Button from '@/components/button/button';
import RichTextEditor from '@/components/rich-text-editor/rich-text-editor.container';
import { ShareIcon, CopyIcon, TelegramCircleIcon } from '@/components/icons';
import {
  QuizFormConnected,
  InlineButtonsConnected,
  DraftsModalConnected,
  TemplatesModalConnected,
  ReplyModalConnected,
  DatePickerModalConnected,
  PostSettingsConnected,
  EditorHeaderConnected,
  MediaSectionConnected,
  PostPreviewModalConnected,
  ActionsMenuConnected,
  MobileSettingsModalConnected,
  ReplyToPostInfoConnected,
} from '../create-post/components';
import Toggle from '@/components/toggle/toggle';
import { hasPlainUrlLikeText } from '@/components/rich-text-editor/editor/link-utils';
import Modal from '@/components/modal/modal';
import Input from '@/components/input/input';
import Tooltip from '@/components/tooltip/tooltip';
import SharedDraftModal from '@/components/shared-draft-modal/shared-draft-modal';

import { CreatePostProvider } from '../create-post/store/provider';
import { useAppDispatch, useAppSelector } from '../create-post/store';
import { selectSelectedChannels } from '../create-post/store/selectors';
import * as editorSlice from '../create-post/store/slices/editor';
import * as mediaSlice from '../create-post/store/slices/media';
import * as settingsSlice from '../create-post/store/slices/settings';
import * as uiSlice from '../create-post/store/slices/ui';
import * as channelsSlice from '../create-post/store/slices/channels';
import {
  saveAsTemplate,
  saveDraft,
  publishNow,
  fetchChannelsThunk,
} from '../create-post/store/thunks';
import { useTokenFromUrl } from '../create-post/hooks/useTokenFromUrl';
import { useDraftFromUrl } from '../create-post/hooks/useDraftFromUrl';
import { useSearchParams } from 'next/navigation';
import Loader from '@/components/loader';
import { compressImageForPreview, createVideoThumbnail } from '@/components/media-preview/utils';

import { useNotifications } from '@/components/notifications/NotificationProvider';
import DraftsHeaderDisabled from '../drafts/components/DraftsHeaderDisabled';

function EditDraftPageContent() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const [showShareModal, setShowShareModal] = useState(false);
  const [hoveredShareBtn, setHoveredShareBtn] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const shareLink = shareToken && typeof window !== 'undefined'
    ? `${window.location.origin}/edit-draft?token=${shareToken}`
    : '';

  const searchParams = useSearchParams();
  const draftId = searchParams?.get('draft');
  const sharedFrom = searchParams?.get('from');
  const shareTokenParam = searchParams?.get('token');
  const [showSharedDraftModal, setShowSharedDraftModal] = useState(false);
  const [showExpiredLinkModal, setShowExpiredLinkModal] = useState(false);

  const generateShareToken = async () => {
    if (!draftId || isGeneratingToken) return;
    setIsGeneratingToken(true);
    try {
      const token = localStorage.getItem('lamaplanner_access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/${draftId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to generate share token');
      const data = await response.json();
      setShareToken(data.share_token);
    } catch (error) {
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
  const { isDraftLoading, draftLoadError, loadedViaShareToken } = useDraftFromUrl();

  const shareModalShownRef = useRef(false);

  useEffect(() => {
    if (sharedFrom && !isDraftLoading) {
      setShowSharedDraftModal(true);
    }
  }, [sharedFrom, isDraftLoading]);

  useEffect(() => {
    if (!shareTokenParam) return;
    if (isDraftLoading) return;
    if (shareModalShownRef.current) return;

    if (draftLoadError) {
      setShowExpiredLinkModal(true);
      shareModalShownRef.current = true;
      return;
    }

    if (loadedViaShareToken) {
      setShowSharedDraftModal(true);
      shareModalShownRef.current = true;
    }
  }, [shareTokenParam, isDraftLoading, draftLoadError, loadedViaShareToken]);

  const headerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const text = useAppSelector(state => state.editor.text);
  const showLinkPreview = useAppSelector(state => state.editor.showLinkPreview);
  const inlineButtonsOpen = useAppSelector(state => state.inlineButtons.isOpen);
  const buttonRows = useAppSelector(state => state.inlineButtons.rows);
  const mediaFiles = useAppSelector(state => state.media.files);
  const quizState = useAppSelector(state => state.quiz);
  const replyToPostState = useAppSelector(state => state.replyToPost);
  const isSavingDraft = useAppSelector(state => state.ui.isSavingDraft);
  const isPublishing = useAppSelector(state => state.ui.isPublishing);
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

  const handleSaveDraft = async (): Promise<boolean> => {
    const result = await dispatch(saveDraft(selectedChannels.map(c => c.id)));
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
    const result = await dispatch(publishNow(selectedChannels.map(c => c.id)));
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
        <DraftsHeaderDisabled />
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
      <DatePickerModalConnected redirectToDraftsOnSuccess />

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
          setShowSharedDraftModal(false);
          dispatch(uiSlice.setShowPreviewModal(true));
        }}
      />

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
              onClick={() => { window.location.href = '/drafts'; }}
            />
            <Button
              text="Создать пост"
              showArrow={false}
              active
              onClick={() => { window.location.href = '/create-post'; }}
            />
          </div>
        </div>
      </Modal>

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
              <Input
                value={shareLink}
                onChange={() => {}}
                variant="white"
                className={styles.shareLinkInput}
                icon={<CopyIcon width={24} height={24} color="#383F45" />}
                onIconClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  showSuccess('Ссылка скопирована!');
                }}
              />
              <button
                type="button"
                className={styles.telegramBtn}
                onClick={() => {
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
                }}
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

export default function EditDraftPage() {
  return (
    <AppLayout pageTitle="Редактирование черновика">
      <CreatePostProvider>
        <Suspense fallback={<div>Загрузка...</div>}>
          <EditDraftPageContent />
        </Suspense>
      </CreatePostProvider>
    </AppLayout>
  );
}
