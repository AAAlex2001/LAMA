'use client';

import styles from './styles.module.scss';
import { PaperclipIcon } from '@/components/icons';
import MediaPreview from '@/components/media-preview';
import { Button } from '@/components/new-button';
import InlineButtons from '@/components/inline-buttons/inline-buttons';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import { useMessageMedia } from '@/hooks/useMessageMedia';
import { useInlineButtons } from '@/hooks/useInlineButtons';
import { useTemplates } from './hooks/useTemplates';
import { useDragDrop } from './hooks/useDragDrop';
import { SendIcon } from '@/components/icons';
import type { TextTemplate } from '@/types/post';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import classNames from 'classnames';
import type { MediaFile } from '@/components/media-preview';
import type { ButtonRow } from '@/components/inline-buttons/inline-buttons';
import { useMessageInputMode } from '../../hooks/useMessageInputMode';
import type { BotMessageResponse } from '@/[locale]/inbox/store/thunks/directChat';
import EditReplyBar from './EditReplyBar';
import ActionsRow from './ActionsRow';

export interface MessageFieldRef {
  mediaFiles: MediaFile[];
  inlineButtonRows: ButtonRow[];
  handleClearMedia: () => void;
  handleResetInlineButtons: () => void;
  startEdit: (msg: BotMessageResponse & { date: Date }) => void;
  startReply: (msg: BotMessageResponse & { date: Date }) => void;
  startReplyById: (telegramMessageId: number, messages: BotMessageResponse[]) => void;
  reset: () => void;
  cancelEdit: () => void;
  getMessage: () => string;
  getEditingMessage: () => { id: number; text: string } | null;
  getReplyingTo: () => { id: number; text: string } | null;
}

interface MessageFieldProps {
  activeChatId: string | null;
  onSendMessage: () => Promise<void>;
}

const MessageField = forwardRef<MessageFieldRef, MessageFieldProps>(({
  activeChatId,
  onSendMessage,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputMode = useMessageInputMode(activeChatId);

  const {
    mediaFiles,
    isUploadingMedia,
    fileInputRef,
    canAddMedia,
    handleFileUpload,
    handleFilesAdd,
    handleRemoveFile,
    handleToggleBlur,
    handleMoveMedia,
    handleClearMedia,
  } = useMessageMedia();

  const dragEnabled = !inputMode.editingMessage && canAddMedia;
  const { isDragOver, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handlePaste } =
    useDragDrop({ enabled: dragEnabled, onFiles: handleFilesAdd });

  const {
    isOpen: inlineButtonsOpen,
    rows: inlineButtonRows,
    toggle: toggleInlineButtons,
    addRow: addInlineButtonRow,
    addColumn: addInlineButtonColumn,
    updateButton: updateInlineButton,
    deleteButton: deleteInlineButton,
    reset: resetInlineButtons,
  } = useInlineButtons();

  const {
    templates,
    isLoading: templatesLoading,
    isLoadingMore: templatesLoadingMore,
    hasMore: templatesHasMore,
    searchQuery: templatesSearchQuery,
    selectedTemplateId,
    setSearchQuery: setTemplatesSearchQuery,
    fetchMoreTemplates,
    updateTemplate,
    deleteTemplate,
  } = useTemplates();

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const { showSuccess } = useNotifications();
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    if (inputMode.editingMessage || inputMode.replyingTo) {
      textareaRef.current?.focus();
    }
  }, [inputMode.editingMessage, inputMode.replyingTo]);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 22.4;
    const maxHeight = lineHeight * 13;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  useLayoutEffect(() => {
    autoResize();
  }, [inputMode.message, autoResize]);

  useEffect(() => {
    if (mediaFiles.length > 1 && (inlineButtonsOpen || inlineButtonRows.length > 0)) {
      resetInlineButtons();
    }
  }, [mediaFiles.length, inlineButtonsOpen, inlineButtonRows.length, resetInlineButtons]);

  const canShowInlineButtons = mediaFiles.length <= 1;

  useImperativeHandle(ref, () => ({
    mediaFiles,
    inlineButtonRows,
    handleClearMedia,
    handleResetInlineButtons: resetInlineButtons,
    startEdit: (msg: BotMessageResponse & { date: Date }) => {
      handleClearMedia();
      inputMode.startEdit(msg);
    },
    startReply: inputMode.startReply,
    startReplyById: inputMode.startReplyById,
    reset: inputMode.reset,
    cancelEdit: inputMode.cancelEdit,
    getMessage: () => inputMode.message,
    getEditingMessage: () => inputMode.editingMessage,
    getReplyingTo: () => inputMode.replyingTo,
  }), [mediaFiles, inlineButtonRows, handleClearMedia, resetInlineButtons, inputMode]);

  const handleOpenTemplatesModal = () => {
    setTemplatesSearchQuery('');
    setShowTemplatesModal(true);
  };

  const handleSelectTemplate = (template: TextTemplate) => {
    let text = template.formatted_content?.html || template.formatted_content?.text || '';
    text = text.replace(/^<p>|<\/p>$/g, '');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    inputMode.setMessage(plainText);
    setShowTemplatesModal(false);
  };

  const handleDeleteTemplate = async (id: number) => {
    await deleteTemplate(id);
    showSuccess('Шаблон удалён');
  };

  const handleSendMessage = async () => {
    setIsSendingMessage(true);
    try {
      await onSendMessage();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === 'Escape') {
      if (inputMode.editingMessage) {
        e.preventDefault();
        inputMode.cancelEdit();
      } else if (inputMode.replyingTo) {
        e.preventDefault();
        inputMode.cancelReply();
      }
    }
  };

  return (
    <div
      className={classNames(styles.dropZoneWrapper, { [styles.dragOver]: isDragOver })}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className={styles.dropOverlay}>
          <span className={styles.dropOverlayText}>Перетащите файлы сюда</span>
        </div>
      )}
      {mediaFiles.length > 0 && (
        <div className={styles.mediaPreviewWrapper}>
          <MediaPreview
            files={mediaFiles}
            onRemove={handleRemoveFile}
            onToggleBlur={handleToggleBlur}
            onMove={handleMoveMedia}
          />
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={(e) => {
          if (!inputMode.editingMessage) {
            handleFileUpload(e);
          } else {
            e.target.value = '';
          }
        }}
        style={{ display: 'none' }}
      />
      <div className={styles.messageField}>
        <EditReplyBar
          editingMessage={inputMode.editingMessage}
          replyingTo={inputMode.replyingTo}
          onCancelEdit={inputMode.cancelEdit}
          onCancelReply={inputMode.cancelReply}
        />
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            className={styles.input}
            placeholder="Сообщение..."
            value={inputMode.message}
            onChange={(e) => {
              inputMode.setMessage(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            autoFocus
          />
          <Button
            variant="ghost"
            intent="neutral"
            size="transparent"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canAddMedia || !!inputMode.editingMessage || isUploadingMedia}
          >
            <PaperclipIcon width={22} height={22} color="currentColor" />
          </Button>
          {(!!inputMode.message || mediaFiles.length > 0) && (
            <Button
              variant="ghost"
              intent="primary"
              size="transparent"
              onClick={isSendingMessage || isUploadingMedia ? undefined : handleSendMessage}
              disabled={isSendingMessage || isUploadingMedia}
              loading={isSendingMessage || isUploadingMedia}
            >
              <SendIcon width={22} height={22} />
            </Button>
          )}
        </div>
        <ActionsRow
          inlineButtonsOpen={inlineButtonsOpen}
          canShowInlineButtons={canShowInlineButtons}
          onToggleInlineButtons={toggleInlineButtons}
          onOpenTemplates={handleOpenTemplatesModal}
        />
        <div className={classNames(styles.inlineButtonsContainer, { [styles.inlineOpen]: inlineButtonsOpen })}>
          <InlineButtons
            isOpen={inlineButtonsOpen}
            rows={inlineButtonRows}
            onAddRow={addInlineButtonRow}
            onAddColumn={addInlineButtonColumn}
            onUpdateButton={updateInlineButton}
            onDeleteButton={deleteInlineButton}
            hideButtonType
          />
        </div>
      </div>
      <TextTemplatesModal
        isOpen={showTemplatesModal}
        templates={templates}
        isLoading={templatesLoading}
        isLoadingMore={templatesLoadingMore}
        hasMore={templatesHasMore}
        searchQuery={templatesSearchQuery}
        selectedTemplateId={selectedTemplateId}
        onSearchQueryChange={setTemplatesSearchQuery}
        onLoadMore={fetchMoreTemplates}
        onUpdate={updateTemplate}
        onDelete={handleDeleteTemplate}
        onSelect={handleSelectTemplate}
        onClose={() => setShowTemplatesModal(false)}
      />
    </div>
  );
});

MessageField.displayName = 'MessageField';

export default MessageField;
