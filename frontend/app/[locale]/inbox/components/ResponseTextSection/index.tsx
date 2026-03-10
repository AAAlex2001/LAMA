'use client';

import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/new-button';
import MediaPreview, { type MediaFile } from '@/components/media-preview';
import InlineButtons, { type ButtonRow, type InlineButton } from '@/components/inline-buttons/inline-buttons';
import PaperclipIcon from '@/components/icons/paperclip-icon';
import InlineButtonIcon from '@/components/icons/inline-button-icon';
import classNames from 'classnames';
import styles from './styles.module.scss';
import Input from '@/components/input';
import buttonStyles from '@/components/new-button/styles.module.scss';
import { useMessageMedia } from '../InboxDirect/components/DirectChat/components/MessageField/hooks/useMessageMedia';
import { useInlineButtons } from '../InboxDirect/components/DirectChat/components/MessageField/hooks/useInlineButtons';

export interface ResponseTextSectionRef {
  limitedMediaFiles: MediaFile[];
  inlineButtonRows: ButtonRow[];
  handleClearMedia: () => void;
}

interface ResponseTextSectionProps {
  responseText: string;
  onResponseTextChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onMediaTypeChange?: (mediaType: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT') => void;
  onMediaUrlChange?: (mediaUrl: string) => void;
  onMediaFilesChange?: (hasMedia: boolean) => void;
  onCleanup?: () => void;
  placeholder?: string;
}

const ResponseTextSection = forwardRef<ResponseTextSectionRef, ResponseTextSectionProps>(({
  responseText,
  onResponseTextChange,
  onKeyDown,
  onMediaTypeChange,
  onMediaUrlChange,
  onMediaFilesChange,
  onCleanup,
  placeholder = 'Текст ответа на ключевое слово',
}, ref) => {
  const {
    mediaFiles,
    fileInputRef,
    canAddMedia: _canAddMedia,
    handleFileUpload: _handleFileUpload,
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

  const MAX_MEDIA = 10;
  const limitedMediaFiles = mediaFiles.slice(0, MAX_MEDIA);
  const canAddMedia = limitedMediaFiles.length < MAX_MEDIA;
  const canShowInlineButtons = true;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    _handleFileUpload(e);
  };

  useImperativeHandle(ref, () => ({
    limitedMediaFiles,
    inlineButtonRows,
    handleClearMedia,
  }), [limitedMediaFiles, inlineButtonRows, handleClearMedia]);

  useEffect(() => {
    if (limitedMediaFiles.length > 0) {
      const firstFile = limitedMediaFiles[0];
      const mediaType = firstFile.type === 'image' ? 'PHOTO' 
        : firstFile.type === 'video' ? 'VIDEO' 
        : 'DOCUMENT';
      onMediaTypeChange?.(mediaType);
      
      if (firstFile.url) {
        onMediaUrlChange?.(firstFile.url);
      }
      onMediaFilesChange?.(true);
    } else {
      onMediaTypeChange?.('TEXT');
      onMediaUrlChange?.('');
      onMediaFilesChange?.(false);
    }
  }, [limitedMediaFiles, onMediaTypeChange, onMediaUrlChange, onMediaFilesChange]);

  useEffect(() => {
    return () => {
      handleClearMedia();
      onCleanup?.();
    };
  }, [handleClearMedia, onCleanup]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Текст ответа</div>
      <MediaPreview
        files={limitedMediaFiles}
        onRemove={handleRemoveFile}
        onToggleBlur={handleToggleBlur}
        onMove={handleMoveMedia}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        multiple
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      <div className={styles.messageField}>
        <div className={styles.inputRow}>
          <Input
            className={styles.input}
            type="text"
            placeholder={placeholder}
            value={responseText}
            onChange={onResponseTextChange}
            onKeyDown={onKeyDown}
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
            onClick={toggleInlineButtons}
            disabled={!canShowInlineButtons}
            style={{ flex: 1 }}
          >
            <InlineButtonIcon
              width={24}
              height={24}
              color={inlineButtonsOpen ? '#FFFFFF' : '#383F45'}
            />
            <span className={buttonStyles.label}>Кнопки</span>
          </Button>
        </div>
      </div>
    </div>
  );
});

ResponseTextSection.displayName = 'ResponseTextSection';

export default ResponseTextSection;
