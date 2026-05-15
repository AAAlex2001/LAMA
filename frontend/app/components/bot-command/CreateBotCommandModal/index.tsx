'use client';

import { FC, useEffect, useRef, useState } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import { ChevronDownIcon } from '@/components/icons';
import PostPreviewModal from '@/components/post-preview-modal/post-preview-modal';
import type { InlineKeyboardPreviewData } from '@/components/post-preview-modal/inline-keyboard-preview/inline-keyboard-preview';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useMessageMedia } from '@/hooks/useMessageMedia';
import { useInlineButtons } from '@/hooks/useInlineButtons';
import { uploadMediaFile, API_BASE_URL } from '@/store/api';
import { buildInlineKeyboard } from '@/store/utils';
import { useBotCommandDispatch, useBotCommandSelector } from '../store';
import { useChannelsQuery, invalidateChannels } from '@/store/channels';
import { useQueryClient } from '@tanstack/react-query';
import ConnectChannelModal from '@/components/connect-channel-modal';
import {
  close,
  setCommand,
  setResponseText,
  setScope,
  setIsSubmitting,
} from '../store/slices/form';
import { createBotCommandThunk, updateBotCommandThunk } from '../store/thunks';
import { MAX_MEDIA, MAX_RESPONSE_LENGTH } from './constants';
import { renderPreview, mediaFilesFromUrls, buttonRowsFromKeyboard, normalizeCommand } from './helpers';
import LeftColumn from './LeftColumn';
import MessageActionSection from './MessageActionSection';
import ClaimAdminSection from './ClaimAdminSection';
import styles from '../CreateBotCommandModal.module.scss';

interface CreateBotCommandModalProps {
  botId: number;
  channelId: number;
  channelTitle?: string;
}

type CommandActionType = 'MESSAGE' | 'CLAIM_ADMIN';
type ClaimRecipientTarget = 'ADMINS' | 'INBOX' | 'SPECIFIC_CHANNEL';

const CreateBotCommandModal: FC<CreateBotCommandModalProps> = ({ botId, channelId, channelTitle }) => {
  const dispatch = useBotCommandDispatch();
  const { showSuccess, showError } = useNotifications();
  const form = useBotCommandSelector((s) => s.form);
  const isEditing = form.editingId !== null;

  const [inlineButtonsOpen, setInlineButtonsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [commandActionType, setCommandActionType] = useState<CommandActionType>('MESSAGE');
  const [claimRecipientTarget, setClaimRecipientTarget] = useState<ClaimRecipientTarget>('ADMINS');
  const [claimSelectedChannelIds, setClaimSelectedChannelIds] = useState<number[]>([]);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: channelsData } = useChannelsQuery({ pageSize: 100 });
  const claimChannels = channelsData?.items ?? [];

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

  const limitedMediaFiles = mediaFiles.slice(0, MAX_MEDIA);
  const canAddMedia = limitedMediaFiles.length < MAX_MEDIA;

  useEffect(() => {
    if (!form.isOpen) return;
    handleClearMedia();
    resetInlineButtons();
    setInlineButtonsOpen(false);
    setPreviewOpen(false);
    setCommandActionType(form.actionType || 'MESSAGE');
    setClaimRecipientTarget(form.claimTarget || 'ADMINS');
    setClaimSelectedChannelIds([]);
    if (form.editingId !== null) {
      if (form.responseMediaUrls.length > 0) {
        setMediaFiles(mediaFilesFromUrls(form.responseMediaUrls));
      }
      if (form.responseButtons?.buttons?.length) {
        setInlineButtonRows(buttonRowsFromKeyboard(form.responseButtons));
        setInlineButtonsOpen(true);
      }

      setClaimSelectedChannelIds(form.claimChannelIds || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.isOpen, form.editingId]);

  useEffect(() => {
    if (!form.isOpen) return;
    if (commandActionType !== 'CLAIM_ADMIN') return;
    if (claimRecipientTarget !== 'SPECIFIC_CHANNEL') return;
    invalidateChannels(queryClient);
  }, [form.isOpen, commandActionType, claimRecipientTarget, queryClient]);

  useEffect(() => {
    if (claimRecipientTarget !== 'SPECIFIC_CHANNEL') setClaimSelectedChannelIds([]);
  }, [claimRecipientTarget]);

  const handleClose = () => {
    dispatch(close());
    handleClearMedia();
    resetInlineButtons();
    setInlineButtonsOpen(false);
    setPreviewOpen(false);
    setCommandActionType('MESSAGE');
    setClaimRecipientTarget('ADMINS');
    setClaimSelectedChannelIds([]);
    setConnectModalOpen(false);
  };

  const handleToggleInlineButtons = () => {
    if (!inlineButtonsOpen && inlineButtonRows.length === 0) {
      addInlineButtonRow();
    }
    setInlineButtonsOpen(!inlineButtonsOpen);
  };

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

  const handleSubmit = async () => {
    const cmd = normalizeCommand(form.command);
    if (!cmd) return;

    try {
      if (commandActionType === 'MESSAGE') {
        if (!form.responseText.trim()) return;

        const baseUrl = API_BASE_URL.replace('/api', '');
        const mediaUrls: string[] = [];

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
          description: null,
          action_type: 'MESSAGE',
          claim_target: undefined,
          claim_channel_ids: undefined,
          response_text: form.responseText.trim(),
          response_media_url: mediaUrls[0] || undefined,
          response_media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
          response_media_type:
            mediaUrls.length > 0
              ? hasVideoFile
                ? 'VIDEO'
                : form.responseMediaType !== 'TEXT'
                  ? form.responseMediaType
                  : 'PHOTO'
              : 'TEXT',
          response_buttons: buildInlineKeyboard(inlineButtonRows),
          scope: form.scope,
          is_active: form.isActive,
        };

        if (!isEditing) data.channel_id = channelId;

        if (isEditing) {
          await dispatch(updateBotCommandThunk({ botId, commandId: form.editingId!, data })).unwrap();
          showSuccess('Команда обновлена');
        } else {
          await dispatch(createBotCommandThunk({ botId, data })).unwrap();
          showSuccess('Команда создана');
        }

        handleClearMedia();
        resetInlineButtons();
        return;
      }

      const isSpecific = claimRecipientTarget === 'SPECIFIC_CHANNEL';
      if (isSpecific && claimSelectedChannelIds.length === 0) return;

      const data: Record<string, unknown> = {
        command: cmd,
        description: null,
        action_type: 'CLAIM_ADMIN',
        claim_target: claimRecipientTarget,
        claim_channel_ids: isSpecific ? claimSelectedChannelIds : undefined,
        response_text: ' ', // Заглушка: для CLAIM_ADMIN текст ответа не используется.
        response_media_url: undefined,
        response_media_urls: undefined,
        response_media_type: undefined,
        response_buttons: undefined,
        scope: form.scope,
        is_active: form.isActive,
      };

      if (!isEditing) data.channel_id = channelId;

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
    form.isSubmitting ||
    !normalizeCommand(form.command) ||
    (commandActionType === 'MESSAGE'
      ? !form.responseText.trim() || isUploadingMedia
      : commandActionType === 'CLAIM_ADMIN'
        ? claimRecipientTarget === 'SPECIFIC_CHANNEL' && claimSelectedChannelIds.length === 0
        : true);

  const previewInlineKeyboard: InlineKeyboardPreviewData | undefined =
    inlineButtonRows.length > 0
      ? {
          buttons: inlineButtonRows
            .map((row) => row.buttons.filter((b) => b.text?.trim()).map((b) => ({ text: b.text, type: b.type })))
            .filter((row) => row.length > 0),
        }
      : undefined;

  return (
    <>
      <ModalBase isOpen={form.isOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <ModalBase.Content size="xl" className={styles.modal}>
          <ModalBase.Header className={styles.header}>
            <div className={styles.headerStart}>
              <button type="button" className={styles.backBtn} onClick={handleClose} aria-label="Назад">
                <ChevronDownIcon width={14} height={14} color="#000000" className={styles.backChevron} />
              </button>
              <span className={styles.titleText}>
                {isEditing ? 'Редактирование команды' : 'Создание команды'}
              </span>
            </div>
            <ModalBase.Close className={styles.headerClose} />
          </ModalBase.Header>

          <ModalBase.Body className={styles.body}>
            <div className={styles.desktopLayout}>
              <LeftColumn
                command={form.command}
                onCommandChange={(v) => dispatch(setCommand(v))}
                scope={form.scope}
                onScopeChange={(v) => dispatch(setScope(v))}
                actionType={commandActionType}
                onActionTypeChange={setCommandActionType}
              />

              <div className={styles.rightColumn}>
                {commandActionType === 'MESSAGE' ? (
                  <MessageActionSection
                    textareaRef={textareaRef}
                    fileInputRef={fileInputRef}
                    responseText={form.responseText}
                    onResponseTextChange={(v) => dispatch(setResponseText(v))}
                    onPreview={() => setPreviewOpen(true)}
                    onInsertShortcode={handleInsertShortcode}
                    inlineButtonsOpen={inlineButtonsOpen}
                    onToggleInlineButtons={handleToggleInlineButtons}
                    inlineButtonRows={inlineButtonRows}
                    onAddRow={addInlineButtonRow}
                    onAddColumn={addInlineButtonColumn}
                    onUpdateButton={updateInlineButton}
                    onDeleteButton={deleteInlineButton}
                    mediaFiles={limitedMediaFiles}
                    isUploadingMedia={isUploadingMedia}
                    canAddMedia={canAddMedia}
                    onFileUpload={handleFileUpload}
                    onRemoveFile={handleRemoveFile}
                    onToggleBlur={handleToggleBlur}
                    onMoveMedia={handleMoveMedia}
                  />
                ) : (
                  <ClaimAdminSection
                    recipientTarget={claimRecipientTarget}
                    onRecipientTargetChange={setClaimRecipientTarget}
                    selectedChannelIds={claimSelectedChannelIds}
                    onSelectedChannelIdsChange={setClaimSelectedChannelIds}
                    channels={claimChannels}
                    onConnectClick={() => setConnectModalOpen(true)}
                  />
                )}
              </div>
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

      <ConnectChannelModal
        isOpen={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        onSuccess={() => invalidateChannels(queryClient)}
      />
    </>
  );
};

export default CreateBotCommandModal;
