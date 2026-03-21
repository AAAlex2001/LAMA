'use client';

import styles from './styles.module.scss';
import PaperclipIcon from '@/components/icons/paperclip-icon';
import InlineButtonIcon from '@/components/icons/inline-button-icon';
import TemplatesIcon from '@/components/icons/templates-icon';
import MediaPreview from '@/components/media-preview';
import { Button } from '@/components/new-button';
import InlineButtons from '@/components/inline-buttons/inline-buttons';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import { useMessageMedia } from './hooks/useMessageMedia';
import { useInlineButtons } from './hooks/useInlineButtons';
import { useTemplates } from './hooks/useTemplates';
import { SendIcon, CloseIcon, ReplyToIcon } from '@/components/icons';
import EditIcon from '@/components/icons/edit-icon';
import type { TextTemplate } from '@/types/post';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import classNames from 'classnames';
import type { MediaFile } from '@/components/media-preview';
import type { ButtonRow } from '@/components/inline-buttons/inline-buttons';

export interface MessageFieldRef {
  mediaFiles: MediaFile[];
  inlineButtonRows: ButtonRow[];
  handleClearMedia: () => void;
  handleResetInlineButtons: () => void;
}

interface MessageFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSendMessage: () => Promise<void>;
  editingMessage?: { id: number; text: string } | null;
  onCancelEdit?: () => void;
  replyingTo?: { id: number; text: string } | null;
  onCancelReply?: () => void;
}

const MessageField = forwardRef<MessageFieldRef, MessageFieldProps>(({ 
  value, 
  onChange, 
  onSendMessage, 
  editingMessage, 
  onCancelEdit, 
  replyingTo, 
  onCancelReply 
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    mediaFiles,
    fileInputRef,
    canAddMedia,
    handleFileUpload,
    handleFilesAdd,
    handleRemoveFile,
    handleToggleBlur,
    handleMoveMedia,
    handleClearMedia,
  } = useMessageMedia();

  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

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
    if (editingMessage || replyingTo) {
      textareaRef.current?.focus();
    }
  }, [editingMessage, replyingTo]);

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';

    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 22.4;
    const maxHeight = lineHeight * 13;

    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);
  
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
  }), [mediaFiles, inlineButtonRows, handleClearMedia, resetInlineButtons]);

  const handleToggleInlineButtons = () => {
    toggleInlineButtons();
  };

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
    onChange(plainText);
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
    onChange('');

    handleClearMedia();
  };

  const ACCEPTED_TYPES = ['image/', 'video/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  const isAcceptedFile = (file: File) => ACCEPTED_TYPES.some(t => file.type.startsWith(t));

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (editingMessage || !canAddMedia) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && isAcceptedFile(file)) {
          files.push(file);
        }
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      handleFilesAdd(files);
    }
  }, [editingMessage, canAddMedia, handleFilesAdd]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (editingMessage || !canAddMedia) return;

    const droppedFiles = Array.from(e.dataTransfer.files).filter(isAcceptedFile);
    if (droppedFiles.length > 0) {
      handleFilesAdd(droppedFiles);
    }
  }, [editingMessage, canAddMedia, handleFilesAdd]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === 'Escape') {
      if (editingMessage) {
        e.preventDefault();
        onCancelEdit?.();
      } else if (replyingTo) {
        e.preventDefault();
        onCancelReply?.();
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
          if (!editingMessage) {
            handleFileUpload(e);
          } else {
            e.target.value = '';
          }
        }}
        style={{ display: 'none' }}
      />
      <div className={styles.messageField}>
        {editingMessage && (
          <div className={styles.editBar}>
            <EditIcon width={18} height={18} color="var(--color-lama-blue)" />
            <div className={styles.editBarContent}>
              <span className={styles.editBarLabel}>Редактирование</span>
              <span className={styles.editBarText}>{editingMessage.text}</span>
            </div>
            <button className={styles.editBarClose} type="button" onClick={onCancelEdit}>
              <CloseIcon width={18} height={18} />
            </button>
          </div>
        )}
        {!editingMessage && replyingTo && (
          <div className={styles.replyBar}>
            <ReplyToIcon width={20} height={20} color="var(--color-lama-blue)" />
            <div className={styles.editBarContent}>
              <span className={styles.editBarLabel}>Ответ</span>
              <span className={styles.editBarText}>{replyingTo.text}</span>
            </div>
            <button className={styles.editBarClose} type="button" onClick={onCancelReply}>
              <CloseIcon width={18} height={18} />
            </button>
          </div>
        )}
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            className={styles.input}
            placeholder="Сообщение..."
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
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
            disabled={!canAddMedia || !!editingMessage}
          >
            <PaperclipIcon width={22} height={22} color="currentColor" />
          </Button>
          {(!!value || mediaFiles.length > 0) && (
            <Button
              variant="ghost"
              intent="primary"
              size="transparent"
              onClick={handleSendMessage}
              disabled={isSendingMessage}
              loading={isSendingMessage}
            >
              <SendIcon width={22} height={22} />
            </Button>
          )}
        </div>
        <div className={styles.actionsRow}>
          <Button
            variant='tag'
            intent={inlineButtonsOpen ? 'gradient' : 'primary'}
            size="sm"
            onClick={handleToggleInlineButtons}
            disabled={!canShowInlineButtons}
            style={{ flex: 1 }}
          >
            <InlineButtonIcon
              width={24}
              height={24}
              color={inlineButtonsOpen ? '#FFFFFF' : '#383F45'}
            />
            Кнопки
          </Button>
          <Button
            variant="tag"
            intent="primary"
            onClick={handleOpenTemplatesModal}
            style={{ flex: 1 }}
          >
            <TemplatesIcon width={24} height={24} color="#383F45" />
            Шаблоны
          </Button>
        </div>
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
