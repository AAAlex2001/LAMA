'use client';

import { FC, RefObject } from 'react';
import { EyeIcon, InlineButtonIcon, PaperclipIcon } from '@/components/icons';
import MediaPreview, { type MediaFile } from '@/components/media-preview';
import InlineButtons from '@/components/inline-buttons/inline-buttons';
import type { InlineButton, ButtonRow } from '@/components/inline-buttons';
import OldButton from '@/components/button/button';
import { SHORTCODES, MAX_RESPONSE_LENGTH } from './constants';
import styles from '../CreateBotCommandModal.module.scss';

interface MessageActionSectionProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  responseText: string;
  onResponseTextChange: (next: string) => void;
  onPreview: () => void;
  onInsertShortcode: (code: string) => void;
  inlineButtonsOpen: boolean;
  onToggleInlineButtons: () => void;
  inlineButtonRows: ButtonRow[];
  onAddRow: () => void;
  onAddColumn: (rowId: string) => void;
  onUpdateButton: (rowId: string, buttonId: string, updates: Partial<InlineButton>) => void;
  onDeleteButton: (rowId: string, buttonId: string) => void;
  mediaFiles: MediaFile[];
  isUploadingMedia: boolean;
  canAddMedia: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (id: string) => void;
  onToggleBlur: (id: string) => void;
  onMoveMedia: (fromId: string, toId: string) => void;
}

const MessageActionSection: FC<MessageActionSectionProps> = ({
  textareaRef,
  fileInputRef,
  responseText,
  onResponseTextChange,
  onPreview,
  onInsertShortcode,
  inlineButtonsOpen,
  onToggleInlineButtons,
  inlineButtonRows,
  onAddRow,
  onAddColumn,
  onUpdateButton,
  onDeleteButton,
  mediaFiles,
  isUploadingMedia,
  canAddMedia,
  onFileUpload,
  onRemoveFile,
  onToggleBlur,
  onMoveMedia,
}) => {
  return (
    <>
      <div className={styles.responseSection}>
        <div className={styles.responseLabelRow}>
          <span className={styles.responseLabel}>Текст ответа</span>
          <button
            type="button"
            className={styles.previewBtn}
            title="Предпросмотр"
            onClick={onPreview}
          >
            <EyeIcon width={16} height={16} color="currentColor" />
          </button>
        </div>

        <div className={styles.textareaWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="Введите текст ответа"
            value={responseText}
            onChange={(e) => {
              if (e.target.value.length <= MAX_RESPONSE_LENGTH) {
                onResponseTextChange(e.target.value);
              }
            }}
          />
          <div className={styles.charCounter}>
            {responseText.length}/{MAX_RESPONSE_LENGTH}
          </div>
        </div>

        <div className={styles.shortcodesRow}>
          <span className={styles.shortcodesLabelInline}>Доступные шорткоды:</span>
          <div className={styles.shortcodeChips}>
            {SHORTCODES.map((sc) => (
              <button
                key={sc.code}
                type="button"
                className={styles.shortcodeChip}
                onClick={() => onInsertShortcode(sc.code)}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <button
          type="button"
          className={`${styles.inlineButtonsRow} ${inlineButtonsOpen ? styles.inlineButtonsRowActive : ''}`}
          onClick={onToggleInlineButtons}
        >
          <InlineButtonIcon width={24} height={24} color="#000000" />
          <span className={styles.inlineButtonsLabel}>Кнопки</span>
        </button>
        {inlineButtonsOpen && (
          <div className={styles.inlineButtonsContent}>
            <InlineButtons
              isOpen={inlineButtonsOpen}
              rows={inlineButtonRows}
              onAddRow={onAddRow}
              onAddColumn={onAddColumn}
              onUpdateButton={onUpdateButton}
              onDeleteButton={onDeleteButton}
            />
          </div>
        )}
      </div>

      <div className={styles.mediaSection}>
        <span className={styles.mediaLabel}>Медиа и файлы</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          multiple
          onChange={onFileUpload}
          style={{ display: 'none' }}
        />
        <div className={styles.mediaDropzone}>
          {mediaFiles.length === 0 ? (
            <>
              <span className={styles.mediaDropzoneText}>
                Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
              </span>
              <OldButton
                text={isUploadingMedia ? 'Загрузка...' : 'Прикрепить файл'}
                variant="templateCardInternal"
                showArrow={false}
                icon={<PaperclipIcon width={24} height={24} />}
                disabled={!canAddMedia || isUploadingMedia}
                onClick={() => fileInputRef.current?.click()}
              />
            </>
          ) : (
            <div className={styles.mediaDropzoneContent}>
              <MediaPreview
                files={mediaFiles}
                onRemove={onRemoveFile}
                onToggleBlur={onToggleBlur}
                onMove={onMoveMedia}
              />
              <OldButton
                text={isUploadingMedia ? 'Загрузка...' : 'Прикрепить ещё'}
                variant="templateCardInternal"
                showArrow={false}
                icon={<PaperclipIcon width={24} height={24} />}
                disabled={!canAddMedia || isUploadingMedia}
                onClick={() => fileInputRef.current?.click()}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageActionSection;
