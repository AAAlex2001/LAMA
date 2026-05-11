'use client';

import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { Button } from '@/components/new-button';
import MediaPreview, { type MediaFile } from '@/components/media-preview';
import InlineButtons, { type ButtonRow, type InlineButton } from '@/components/inline-buttons/inline-buttons';
import PaperclipIcon from '@/components/icons/paperclip-icon';
import InlineButtonIcon from '@/components/icons/inline-button-icon';
import classNames from 'classnames';
import styles from './styles.module.scss';
import Input from '@/components/input';
import buttonStyles from '@/components/new-button/styles.module.scss';
import { useMessageMedia } from '@/hooks/useMessageMedia';
import { useInlineButtons } from '@/hooks/useInlineButtons';

export interface ResponseTextSectionRef {
  limitedMediaFiles: MediaFile[];
  inlineButtonRows: ButtonRow[];
  handleClearMedia: () => void;
  isMediaUploading: boolean;
}

interface ResponseTextSectionProps {
  responseText: string;
  title?: string;
  onResponseTextChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onMediaTypeChange?: (mediaType: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT') => void;
  onMediaUrlChange?: (mediaUrl: string) => void;
  onMediaFilesChange?: (hasMedia: boolean) => void;
  onMediaUploadLoadingChange?: (isLoading: boolean) => void;
  onCleanup?: () => void;
  placeholder?: string;
}

const ResponseTextSection = forwardRef<ResponseTextSectionRef, ResponseTextSectionProps>(({
  responseText,
  title = 'Текст ответа',
  onResponseTextChange,
  onKeyDown,
  onMediaTypeChange,
  onMediaUrlChange,
  onMediaFilesChange,
  onMediaUploadLoadingChange,
  onCleanup,
  placeholder = 'Текст ответа на ключевое слово',
}, ref) => {
  const {
    mediaFiles,
    isUploadingMedia,
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
    reset: resetInlineButtons,
  } = useInlineButtons();

  const MAX_MEDIA = 10;
  const limitedMediaFiles = mediaFiles.slice(0, MAX_MEDIA);
  const canAddMedia = limitedMediaFiles.length < MAX_MEDIA;
  const canShowInlineButtons = limitedMediaFiles.length < 2;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    _handleFileUpload(e);
  };

  const prevMediaFilesLengthRef = useRef(limitedMediaFiles.length);
  const prevFirstFileIdRef = useRef(limitedMediaFiles[0]?.id);
  const prevFirstFileUrlRef = useRef(limitedMediaFiles[0]?.url);
  
  const callbacksRef = useRef({ onMediaTypeChange, onMediaUrlChange, onMediaFilesChange, onMediaUploadLoadingChange });
  useEffect(() => {
    callbacksRef.current = { onMediaTypeChange, onMediaUrlChange, onMediaFilesChange, onMediaUploadLoadingChange };
  }, [onMediaTypeChange, onMediaUrlChange, onMediaFilesChange, onMediaUploadLoadingChange]);

  useImperativeHandle(ref, () => ({
    limitedMediaFiles,
    inlineButtonRows,
    handleClearMedia,
    isMediaUploading: isUploadingMedia,
  }), [limitedMediaFiles, inlineButtonRows, handleClearMedia, isUploadingMedia]);

  useEffect(() => {
    callbacksRef.current.onMediaUploadLoadingChange?.(isUploadingMedia);
  }, [isUploadingMedia]);

  useEffect(() => {
    const currentLength = limitedMediaFiles.length;
    const currentFirstFileId = limitedMediaFiles[0]?.id;
    const currentFirstFileUrl = limitedMediaFiles[0]?.url;

    const lengthChanged = prevMediaFilesLengthRef.current !== currentLength;
    const fileChanged = prevFirstFileIdRef.current !== currentFirstFileId;
    const urlChanged = prevFirstFileUrlRef.current !== currentFirstFileUrl;

    if (!lengthChanged && !fileChanged && !urlChanged) {
      return;
    }

    prevMediaFilesLengthRef.current = currentLength;
    prevFirstFileIdRef.current = currentFirstFileId;
    prevFirstFileUrlRef.current = currentFirstFileUrl;

    const { onMediaTypeChange, onMediaUrlChange, onMediaFilesChange } = callbacksRef.current;

    if (currentLength > 0) {
      const firstFile = limitedMediaFiles[0];
      const mediaType = firstFile.type === 'image' ? 'PHOTO' 
        : firstFile.type === 'video' ? 'VIDEO' 
        : 'DOCUMENT';
      
      if (fileChanged || lengthChanged) {
        onMediaTypeChange?.(mediaType);
        onMediaFilesChange?.(true);
      }
      
      if (firstFile.url && urlChanged) {
        onMediaUrlChange?.(firstFile.url);
      }
    } else {
      if (lengthChanged) {
        onMediaTypeChange?.('TEXT');
        onMediaUrlChange?.('');
        onMediaFilesChange?.(false);
      }
    }
  }, [limitedMediaFiles]);

  useEffect(() => {
    if (limitedMediaFiles.length > 1 && inlineButtonRows.length > 0) {
      resetInlineButtons();
    }
  }, [limitedMediaFiles.length, inlineButtonRows.length, resetInlineButtons]);

  useEffect(() => {
    return () => {
      handleClearMedia();
      onCleanup?.();
    };
  }, [onCleanup]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
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
            disabled={!canAddMedia || isUploadingMedia}
            loading={isUploadingMedia}
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
              color={inlineButtonsOpen ? '#FFFFFF' : '#000000'}
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