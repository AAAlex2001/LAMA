'use client';

import styles from './styles.module.scss';
import PaperclipIcon from '@/components/icons/paperclip-icon';
import InlineButtonIcon from '@/components/icons/inline-button-icon';
import TemplatesIcon from '@/components/icons/templates-icon';
import MediaPreview from '@/components/media-preview';
import { Button } from '@/components/new-button';
import InlineButtons from '@/components/inline-buttons/inline-buttons';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useMessageMedia } from './hooks/useMessageMedia';
import { useInlineButtons } from './hooks/useInlineButtons';
import { useTemplates } from './hooks/useTemplates';
import { SendIcon, CloseIcon } from '@/components/icons';
import EditIcon from '@/components/icons/edit-icon';
import type { TextTemplate } from '@/app/[locale]/create-post/store/types';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import classNames from 'classnames';
import type { MediaFile } from '@/components/media-preview';
import type { ButtonRow } from '@/components/inline-buttons/inline-buttons';

export interface MessageFieldRef {
  mediaFiles: MediaFile[];
  inlineButtonRows: ButtonRow[];
  handleClearMedia: () => void;
}

interface MessageFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSendMessage: () => Promise<void>;
  editingMessage?: { id: number; text: string } | null;
  onCancelEdit?: () => void;
}

const MessageField = forwardRef<MessageFieldRef, MessageFieldProps>(({ value, onChange, onSendMessage, editingMessage, onCancelEdit }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    mediaFiles,
    fileInputRef,
    canAddMedia,
    handleFileUpload,
    handleRemoveFile,
    handleToggleBlur,
    handleMoveMedia,
    handleClearMedia,
  } = useMessageMedia();

  const {
    isOpen: inlineButtonsOpen,
    rows: inlineButtonRows,
    toggle: toggleInlineButtons,
    addRow: addInlineButtonRow,
    addColumn: addInlineButtonColumn,
    updateButton: updateInlineButton,
    deleteButton: deleteInlineButton,
  } = useInlineButtons();

  const {
    templates,
    isLoading: templatesLoading,
    isLoadingMore: templatesLoadingMore,
    hasMore: templatesHasMore,
    searchQuery: templatesSearchQuery,
    selectedTemplateId,
    setSearchQuery: setTemplatesSearchQuery,
    setSelectedTemplateId,
    fetchMoreTemplates,
    updateTemplate,
    deleteTemplate,
  } = useTemplates();

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const { showSuccess } = useNotifications();

  useEffect(() => {
    if (editingMessage) {
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const canShowInlineButtons = mediaFiles.length <= 1;

  useImperativeHandle(ref, () => ({
    mediaFiles,
    inlineButtonRows,
    handleClearMedia,
  }), [mediaFiles, inlineButtonRows, handleClearMedia]);

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
    await onSendMessage();
    onChange('');

    handleClearMedia();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === 'Escape' && editingMessage) {
      e.preventDefault();
      onCancelEdit?.();
    }
  };

  return (
    <>
      <MediaPreview
        files={mediaFiles}
        onRemove={handleRemoveFile}
        onToggleBlur={handleToggleBlur}
        onMove={handleMoveMedia}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
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
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Сообщение..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            variant="ghost"
            intent="neutral"
            size="transparent"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canAddMedia}
          >
            <PaperclipIcon width={22} height={22} color="currentColor" />
          </Button>
          {(!!value || mediaFiles.length > 0) && (
            <Button
              variant="ghost"
              intent="primary"
              size="transparent"
              onClick={handleSendMessage}
            >
              <SendIcon width={22} height={22} />
            </Button>
          )}
        </div>
        <div className={classNames(styles.inlineButtonsContainer, { [styles.inlineOpen]: inlineButtonsOpen })}>
          <InlineButtons
            isOpen={inlineButtonsOpen}
            rows={inlineButtonRows}
            onAddRow={addInlineButtonRow}
            onAddColumn={addInlineButtonColumn}
            onUpdateButton={updateInlineButton}
            onDeleteButton={deleteInlineButton}
          />
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
    </>
  );
});

MessageField.displayName = 'MessageField';

export default MessageField;
