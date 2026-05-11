'use client';

import { FC, RefObject } from 'react';
import { EyeIcon, InlineButtonIcon } from '@/components/icons';
import InlineButtons from '@/components/inline-buttons/inline-buttons';
import type { InlineButton, ButtonRow } from '@/components/inline-buttons';
import { SHORTCODES, MAX_RESPONSE_LENGTH } from './constants';
import styles from '../CreateAutoReplyModal.module.scss';

interface ResponseSectionProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  responseText: string;
  onResponseTextChange: (next: string) => void;
  onPreview: () => void;
  inlineButtonsOpen: boolean;
  onToggleInlineButtons: () => void;
  inlineButtonRows: ButtonRow[];
  onAddRow: () => void;
  onAddColumn: (rowId: string) => void;
  onUpdateButton: (rowId: string, buttonId: string, updates: Partial<InlineButton>) => void;
  onDeleteButton: (rowId: string, buttonId: string) => void;
  onInsertShortcode: (code: string) => void;
}

const ResponseSection: FC<ResponseSectionProps> = ({
  textareaRef,
  responseText,
  onResponseTextChange,
  onPreview,
  inlineButtonsOpen,
  onToggleInlineButtons,
  inlineButtonRows,
  onAddRow,
  onAddColumn,
  onUpdateButton,
  onDeleteButton,
  onInsertShortcode,
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
              if (e.target.value.length <= MAX_RESPONSE_LENGTH) onResponseTextChange(e.target.value);
            }}
          />
          <div className={styles.charCounter}>{responseText.length}/{MAX_RESPONSE_LENGTH}</div>
        </div>

        <div className={styles.shortcodesRow}>
          <span className={styles.shortcodesLabelInline}>Доступные шорткоды:</span>
          <div className={styles.shortcodeChips}>
            {SHORTCODES.map((sc) => (
              <button key={sc.code} type="button" className={styles.shortcodeChip} onClick={() => onInsertShortcode(sc.code)}>
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
    </>
  );
};

export default ResponseSection;
