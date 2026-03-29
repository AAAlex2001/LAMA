'use client';

import { FC, useEffect, useState } from 'react';
import ModalBase from '@/components/modal-base';
import Input from '@/components/input';
import Toggle from '@/components/toggle/toggle';
import { Checkbox } from '@/components/checkbox';
import { Button } from '@/components/new-button';
import { InlineButtonIcon, PaperclipIcon } from '@/components/icons';
import MediaPreview, { type MediaFile } from '@/components/media-preview';
import InlineButtons from '@/components/inline-buttons/inline-buttons';
import OldButton from '@/components/button/button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useMessageMedia } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useMessageMedia';
import { useInlineButtons } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useInlineButtons';
import { uploadMediaFile, API_BASE_URL } from '@/store/api';
import { buildInlineKeyboard } from '@/store/utils';
import type { InlineKeyboard, ButtonRow } from '@/types/post';
import { useBotCommandDispatch, useBotCommandSelector } from './store';
import {
  close,
  setCommand,
  setDescription,
  setResponseText,
  setResponseMediaType,
  setScope,
  setIsActive,
  setIsSubmitting,
} from './store/slices/form';
import { createBotCommandThunk, updateBotCommandThunk } from './store/thunks';
import styles from './CreateBotCommandModal.module.scss';

interface CreateBotCommandModalProps {
  botId: number;
  channelId: number;
}

const MAX_RESPONSE_LENGTH = 4096;

function mediaFilesFromUrls(urls: string[]): MediaFile[] {
  return urls.map((url, i) => {
    const isVideo = /\.(mp4|mov|avi|webm)/i.test(url);
    return {
      id: `edit-${i}-${Date.now()}`,
      type: isVideo ? 'video' : 'image',
      url,
      preview_url: url,
    } as MediaFile;
  });
}

function buttonRowsFromKeyboard(kb: InlineKeyboard): ButtonRow[] {
  return kb.buttons.map((row) => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    buttons: row.map((btn) => ({
      id: `btn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: btn.text,
      type: btn.type ?? 'url',
      url: btn.url,
      callback_action: btn.callback_action,
      callback_response: btn.callback_response,
      hidden_text_subscribed: btn.hidden_text_subscribed,
      hidden_text_unsubscribed: btn.hidden_text_unsubscribed,
    })),
  }));
}

const CreateBotCommandModal: FC<CreateBotCommandModalProps> = ({ botId, channelId }) => {
  const dispatch = useBotCommandDispatch();
  const { showSuccess, showError } = useNotifications();
  const form = useBotCommandSelector((s) => s.form);
  const isEditing = form.editingId !== null;

  const [inlineButtonsOpen, setInlineButtonsOpen] = useState(false);

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
  } = useInlineButtons();

  const MAX_MEDIA = 10;
  const limitedMediaFiles = mediaFiles.slice(0, MAX_MEDIA);
  const canAddMedia = limitedMediaFiles.length < MAX_MEDIA;

  useEffect(() => {
    if (!form.isOpen) return;
    handleClearMedia();
    resetInlineButtons();
    setInlineButtonsOpen(false);
    if (form.editingId !== null) {
      if (form.responseMediaUrls.length > 0) {
        setMediaFiles(mediaFilesFromUrls(form.responseMediaUrls));
      }
      if (form.responseButtons?.buttons?.length) {
        setInlineButtonRows(buttonRowsFromKeyboard(form.responseButtons));
        setInlineButtonsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.isOpen, form.editingId]);

  const handleClose = () => {
    dispatch(close());
    handleClearMedia();
    resetInlineButtons();
    setInlineButtonsOpen(false);
  };

  const handleToggleInlineButtons = () => {
    if (!inlineButtonsOpen && inlineButtonRows.length === 0) {
      addInlineButtonRow();
    }
    setInlineButtonsOpen(!inlineButtonsOpen);
  };

  const normalizeCommand = (raw: string): string => {
    const t = raw.trim();
    if (!t) return t;
    return t.startsWith('/') ? t : `/${t}`;
  };

  const handleSubmit = async () => {
    const cmd = normalizeCommand(form.command);
    if (!cmd || !form.responseText.trim()) return;

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

      const hasVideoFile = limitedMediaFiles.some((f) => f.type === 'video');
      const data: Record<string, unknown> = {
        command: cmd,
        description: form.description.trim() || null,
        response_text: form.responseText.trim(),
        response_media_url: mediaUrls[0] || undefined,
        response_media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
        response_media_type:
          mediaUrls.length > 0 ? (hasVideoFile ? 'VIDEO' : (form.responseMediaType !== 'TEXT' ? form.responseMediaType : 'PHOTO')) : 'TEXT',
        response_buttons: buildInlineKeyboard(inlineButtonRows),
        scope: form.scope,
        is_active: form.isActive,
      };

      if (!isEditing) {
        data.channel_id = channelId;
      }

      if (isEditing) {
        await dispatch(updateBotCommandThunk({ botId, commandId: form.editingId!, data })).unwrap();
        showSuccess('Команда обновлена');
      } else {
        await dispatch(createBotCommandThunk({ botId, data })).unwrap();
        showSuccess('Команда создана');
      }
      handleClearMedia();
      resetInlineButtons();
    } catch {
      showError(isEditing ? 'Ошибка обновления' : 'Ошибка создания');
      dispatch(setIsSubmitting(false));
    }
  };

  const isSubmitDisabled =
    !normalizeCommand(form.command) || !form.responseText.trim() || form.isSubmitting || isUploadingMedia;

  return (
    <ModalBase isOpen={form.isOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>{isEditing ? 'Редактирование команды' : 'Создание команды'}</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Команда</div>
            <Input placeholder="/start" value={form.command} onChange={(v) => dispatch(setCommand(v))} />
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Описание</div>
            <Input placeholder="Описание (необязательно)" value={form.description} onChange={(v) => dispatch(setDescription(v))} />
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Текст ответа</div>
            <textarea
              className={styles.textarea}
              placeholder="Текст ответа"
              value={form.responseText}
              onChange={(e) => {
                if (e.target.value.length <= MAX_RESPONSE_LENGTH) dispatch(setResponseText(e.target.value));
              }}
            />
            <div className={styles.counter}>
              {form.responseText.length}/{MAX_RESPONSE_LENGTH}
            </div>
          </div>

          <div className={styles.section}>
            <button type="button" className={`${styles.inlineButtonsRow} ${inlineButtonsOpen ? styles.inlineButtonsRowActive : ''}`} onClick={handleToggleInlineButtons}>
              <InlineButtonIcon width={24} height={24} color="#383F45" />
              <span className={styles.inlineButtonsLabel}>Кнопки</span>
            </button>
            {inlineButtonsOpen && (
              <div className={styles.inlineButtonsContent}>
                <InlineButtons
                  isOpen={inlineButtonsOpen}
                  rows={inlineButtonRows}
                  onAddRow={addInlineButtonRow}
                  onAddColumn={addInlineButtonColumn}
                  onUpdateButton={updateInlineButton}
                  onDeleteButton={deleteInlineButton}
                />
              </div>
            )}
          </div>

          <div className={styles.section}>
            <span className={styles.mediaLabel}>Медиа и файлы</span>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
            <div className={styles.mediaDropzone}>
              {limitedMediaFiles.length === 0 ? (
                <>
                  <span className={styles.mediaDropzoneText}>
                    Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
                  </span>
                  <OldButton
                    text={isUploadingMedia ? 'Загрузка...' : 'Прикрепить файл'}
                    variant="templateCard"
                    showArrow={false}
                    icon={<PaperclipIcon width={24} height={24} />}
                    disabled={!canAddMedia || isUploadingMedia}
                    onClick={() => fileInputRef.current?.click()}
                  />
                </>
              ) : (
                <div className={styles.mediaDropzoneContent}>
                  <MediaPreview files={limitedMediaFiles} onRemove={handleRemoveFile} onToggleBlur={handleToggleBlur} onMove={handleMoveMedia} />
                  <OldButton
                    text={isUploadingMedia ? 'Загрузка...' : 'Прикрепить ещё'}
                    variant="templateCard"
                    showArrow={false}
                    icon={<PaperclipIcon width={24} height={24} />}
                    disabled={!canAddMedia || isUploadingMedia}
                    onClick={() => fileInputRef.current?.click()}
                  />
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Область действия</div>
            <div className={styles.radioGroup}>
              <div className={styles.radioGroupItem}>
                <Checkbox variant="radio" checked={form.scope === 'PRIVATE'} onChange={() => dispatch(setScope('PRIVATE'))} />
                <span className={styles.channelItemName}>Приватные чаты</span>
              </div>
              <div className={styles.radioGroupItem}>
                <Checkbox variant="radio" checked={form.scope === 'GROUPS'} onChange={() => dispatch(setScope('GROUPS'))} />
                <span className={styles.channelItemName}>Группы и супергруппы</span>
              </div>
              <div className={styles.radioGroupItem}>
                <Checkbox variant="radio" checked={form.scope === 'ALL'} onChange={() => dispatch(setScope('ALL'))} />
                <span className={styles.channelItemName}>Везде</span>
              </div>
            </div>
          </div>

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Активна</span>
            <Toggle checked={form.isActive} onChange={(v) => dispatch(setIsActive(v))} />
          </div>

          <div className={styles.footer}>
            <Button variant="outline" intent="gradient" size="lg" className={styles.cancelBtn} onClick={handleClose}>
              Отменить
            </Button>
            <Button variant="fill" intent="gradient" size="lg" className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitDisabled} loading={form.isSubmitting}>
              {isEditing ? 'Сохранить' : 'Создать команду'}
            </Button>
          </div>
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateBotCommandModal;
