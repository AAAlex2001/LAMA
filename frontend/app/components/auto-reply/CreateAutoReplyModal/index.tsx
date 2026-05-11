'use client';

import { FC, useRef, useState, useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import PostPreviewModal from '@/components/post-preview-modal/post-preview-modal';
import type { InlineKeyboardPreviewData } from '@/components/post-preview-modal/inline-keyboard-preview/inline-keyboard-preview';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useMessageMedia } from '@/hooks/useMessageMedia';
import { useInlineButtons } from '@/hooks/useInlineButtons';
import { uploadMediaFile, API_BASE_URL } from '@/store/api';
import { buildInlineKeyboard } from '@/store/utils';
import { useAutoReplyDispatch, useAutoReplySelector } from '../store';
import {
  close,
  addKeywords,
  removeKeyword,
  setResponseText,
  setScope,
  setIsActive,
  setIsSubmitting,
  setFrequencyLimitEnabled,
  setFrequencyLimitType,
  setFrequencyLimitMinutes,
} from '../store/slices/form';
import { createAutoReplyThunk, updateAutoReplyThunk } from '../store/thunks';
import { MAX_MEDIA, MAX_RESPONSE_LENGTH } from './constants';
import { mediaFilesFromUrls, buttonRowsFromKeyboard, renderPreview } from './helpers';
import KeywordsSection from './KeywordsSection';
import FrequencyAndScopeSection from './FrequencyAndScopeSection';
import ResponseSection from './ResponseSection';
import MediaSection from './MediaSection';
import styles from '../CreateAutoReplyModal.module.scss';

interface CreateAutoReplyModalProps {
  botId: number;
  channelId?: number;
  channelTitle?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CreateAutoReplyModal: FC<CreateAutoReplyModalProps> = ({
  botId, channelId, channelTitle, isOpen: externalOpen, onOpenChange,
}) => {
  const dispatch = useAutoReplyDispatch();
  const { showSuccess, showError } = useNotifications();
  const form = useAutoReplySelector((s) => s.form);
  const isModalOpen = externalOpen !== undefined ? externalOpen : form.isOpen;

  const [inlineButtonsOpen, setInlineButtonsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    mediaFiles,
    setMediaFiles,
    isUploadingMedia,
    fileInputRef,
    handleFileUpload,
    handleRemoveFile,
    handleToggleBlur,
    handleMoveMedia,
    handleClearMedia,
  } = useMessageMedia();

  const {
    rows: inlineButtonRows,
    addRow: addInlineButtonRow,
    addColumn: addInlineButtonColumn,
    updateButton: updateInlineButton,
    deleteButton: deleteInlineButton,
    reset: resetInlineButtons,
    setRows: setInlineButtonRows,
    setIsOpen: setInlineButtonsIsOpen,
  } = useInlineButtons();

  const limitedMediaFiles = mediaFiles.slice(0, MAX_MEDIA);
  const canAddMedia = limitedMediaFiles.length < MAX_MEDIA;

  const isEditing = form.editingId !== null;

  useEffect(() => {
    if (!form.isOpen || !isEditing) return;

    if (form.responseMediaUrls.length > 0) {
      setMediaFiles(mediaFilesFromUrls(form.responseMediaUrls));
    }

    if (form.responseButtons && form.responseButtons.buttons?.length > 0) {
      const rows = buttonRowsFromKeyboard(form.responseButtons);
      setInlineButtonRows(rows);
      setInlineButtonsOpen(true);
      setInlineButtonsIsOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.editingId]);

  const validKeywords = form.keywords.filter((kw) => kw.trim());

  const handleInsertShortcode = (code: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = form.responseText.substring(0, start) + code + form.responseText.substring(end);
      if (newText.length <= MAX_RESPONSE_LENGTH) {
        dispatch(setResponseText(newText));
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + code.length, start + code.length);
        }, 0);
      }
    } else {
      const newText = form.responseText + code;
      if (newText.length <= MAX_RESPONSE_LENGTH) dispatch(setResponseText(newText));
    }
  };

  const handleClose = () => {
    dispatch(close());
    onOpenChange?.(false);
    handleClearMedia();
    resetInlineButtons();
    setPreviewOpen(false);
    setInlineButtonsOpen(false);
  };

  const handleSubmit = async () => {
    if (validKeywords.length === 0 || !form.responseText.trim()) return;

    dispatch(setIsSubmitting(true));

    const baseUrl = API_BASE_URL.replace('/api', '');
    const mediaUrls: string[] = [];

    try {
      for (const mediaFile of limitedMediaFiles) {
        if (mediaFile.url) {
          mediaUrls.push(mediaFile.url);
        } else if (mediaFile.file) {
          const uploaded = await uploadMediaFile(mediaFile.file);
          const url = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
          mediaUrls.push(url);
        }
      }

      const data = {
        keywords: validKeywords,
        response_text: form.responseText.trim(),
        response_media_url: mediaUrls[0] || undefined,
        response_media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        response_buttons: buildInlineKeyboard(inlineButtonRows),
        scope: form.scope,
        is_active: form.isActive,
        frequency_limit_minutes: form.frequencyLimitEnabled ? form.frequencyLimitMinutes : undefined,
        frequency_limit_type: form.frequencyLimitEnabled ? form.frequencyLimitType : undefined,
      };

      if (isEditing) {
        await dispatch(updateAutoReplyThunk({ botId, replyId: form.editingId!, data })).unwrap();
        showSuccess('Автоответ обновлён');
      } else {
        await dispatch(createAutoReplyThunk({ botId, channelId, data })).unwrap();
        showSuccess('Автоответ создан');
      }
      handleClearMedia();
      resetInlineButtons();
    } catch {
      showError(isEditing ? 'Ошибка обновления' : 'Ошибка создания');
      dispatch(setIsSubmitting(false));
    }
  };

  const handleToggleInlineButtons = () => {
    if (!inlineButtonsOpen && inlineButtonRows.length === 0) {
      addInlineButtonRow();
    }
    setInlineButtonsOpen(!inlineButtonsOpen);
  };

  const isSubmitDisabled = validKeywords.length === 0 || !form.responseText.trim() || form.isSubmitting;

  const previewInlineKeyboard: InlineKeyboardPreviewData | undefined = inlineButtonRows.length > 0
    ? {
        buttons: inlineButtonRows
          .map(row => row.buttons.filter(b => b.text?.trim()).map(b => ({ text: b.text, type: b.type })))
          .filter(row => row.length > 0),
      }
    : undefined;

  return (
    <>
      <ModalBase isOpen={isModalOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <ModalBase.Content size="xl" className={styles.modal}>
          <ModalBase.Header className={styles.header}>
            <ModalBase.Title className={styles.title}>
              {isEditing ? 'Редактировать автоответ' : 'Создание автоответа'}
            </ModalBase.Title>
            <ModalBase.Close />
          </ModalBase.Header>

          <ModalBase.Body className={styles.body}>
            <div className={styles.desktopLayout}>
              <div className={styles.leftColumn}>
                <KeywordsSection
                  keywords={form.keywords}
                  onAdd={(words) => dispatch(addKeywords(words))}
                  onRemove={(i) => dispatch(removeKeyword(i))}
                />
                <FrequencyAndScopeSection
                  frequencyEnabled={form.frequencyLimitEnabled}
                  frequencyMinutes={form.frequencyLimitMinutes}
                  frequencyType={form.frequencyLimitType}
                  scope={form.scope}
                  onFrequencyEnabledChange={(v) => dispatch(setFrequencyLimitEnabled(v))}
                  onFrequencyMinutesChange={(v) => dispatch(setFrequencyLimitMinutes(v))}
                  onFrequencyTypeChange={(v) => dispatch(setFrequencyLimitType(v))}
                  onScopeChange={(v) => dispatch(setScope(v))}
                />
              </div>

              <div className={styles.rightColumn}>
                <ResponseSection
                  textareaRef={textareaRef}
                  responseText={form.responseText}
                  onResponseTextChange={(v) => dispatch(setResponseText(v))}
                  onPreview={() => setPreviewOpen(true)}
                  inlineButtonsOpen={inlineButtonsOpen}
                  onToggleInlineButtons={handleToggleInlineButtons}
                  inlineButtonRows={inlineButtonRows}
                  onAddRow={addInlineButtonRow}
                  onAddColumn={addInlineButtonColumn}
                  onUpdateButton={updateInlineButton}
                  onDeleteButton={deleteInlineButton}
                  onInsertShortcode={handleInsertShortcode}
                />
                <MediaSection
                  fileInputRef={fileInputRef}
                  files={limitedMediaFiles}
                  isUploading={isUploadingMedia}
                  canAddMedia={canAddMedia}
                  onFileUpload={handleFileUpload}
                  onRemove={handleRemoveFile}
                  onToggleBlur={handleToggleBlur}
                  onMove={handleMoveMedia}
                />
              </div>
            </div>

            <div className={styles.activeRow}>
              <span className={styles.toggleLabel}>Активен</span>
              <Toggle checked={form.isActive} onChange={(v) => dispatch(setIsActive(v))} />
            </div>

            <div className={styles.footer}>
              <Button variant="outline" intent="gradient" size="lg" className={styles.cancelBtn} onClick={handleClose}>
                Отменить
              </Button>
              <Button
                variant="fill"
                intent="gradient"
                size="lg"
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                loading={form.isSubmitting}
              >
                Сохранить
              </Button>
            </div>
          </ModalBase.Body>
        </ModalBase.Content>
      </ModalBase>

      <PostPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        channelTitle={channelTitle}
        html={renderPreview(form.responseText)}
        mediaFiles={limitedMediaFiles}
        inlineKeyboard={previewInlineKeyboard}
      />
    </>
  );
};

export default CreateAutoReplyModal;
