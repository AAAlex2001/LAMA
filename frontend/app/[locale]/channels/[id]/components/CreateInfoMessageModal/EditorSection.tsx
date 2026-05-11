'use client';

import { FC, RefObject } from 'react';
import { Button } from '@/components/new-button';
import InlineButtons from '@/components/inline-buttons';
import type { InlineButton, ButtonRow } from '@/components/inline-buttons';
import RichTextEditor from '@/components/rich-text-editor/rich-text-editor.container';
import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';
import {
  InlineButtonIcon,
  TemplatesIcon,
  ShortcodesIcon,
} from '@/components/icons';
import { SHORTCODES } from './constants';
import styles from '../CreateInfoMessageModal.module.scss';

interface EditorSectionProps {
  editorRef: RefObject<RichTextEditorRef | null>;
  text: string;
  onTextChange: (next: string) => void;
  onSaveAsTemplate: (selectedHtml?: string) => void;
  buttonsOpen: boolean;
  onToggleButtons: () => void;
  rows: ButtonRow[];
  onAddRow: () => void;
  onAddColumn: (rowId: string) => void;
  onUpdateButton: (rowId: string, buttonId: string, updates: Partial<InlineButton>) => void;
  onDeleteButton: (rowId: string, buttonId: string) => void;
  templatesOpen: boolean;
  onToggleTemplates: () => void;
  shortcodesOpen: boolean;
  onToggleShortcodes: () => void;
  onCloseShortcodes: () => void;
}

const EditorSection: FC<EditorSectionProps> = ({
  editorRef,
  text,
  onTextChange,
  onSaveAsTemplate,
  buttonsOpen,
  onToggleButtons,
  rows,
  onAddRow,
  onAddColumn,
  onUpdateButton,
  onDeleteButton,
  templatesOpen,
  onToggleTemplates,
  shortcodesOpen,
  onToggleShortcodes,
  onCloseShortcodes,
}) => {
  return (
    <div className={styles.editorSection}>
      <RichTextEditor
        ref={editorRef}
        value={text}
        onChange={onTextChange}
        placeholder="Напишите текст публикации..."
        maxLength={4096}
        onSaveAsTemplate={onSaveAsTemplate}
      />

      <div className={styles.menuRow}>
        <Button
          variant="ghost"
          intent="neutral"
          size="sm"
          className={`${styles.menuBtn} ${buttonsOpen ? styles.active : ''}`}
          onClick={onToggleButtons}
        >
          <InlineButtonIcon width={24} height={24} />
          Кнопки
        </Button>
        <Button
          variant="ghost"
          intent="neutral"
          size="sm"
          className={`${styles.menuBtn} ${templatesOpen ? styles.active : ''}`}
          onClick={onToggleTemplates}
        >
          <TemplatesIcon width={24} height={24} />
          Шаблоны
        </Button>
      </div>
      <Button
        variant="ghost"
        intent="neutral"
        size="sm"
        className={`${styles.menuBtnFull} ${shortcodesOpen ? styles.active : ''}`}
        onClick={onToggleShortcodes}
      >
        <ShortcodesIcon width={24} height={24} />
        Шорткоды
      </Button>

      {shortcodesOpen && (
        <div className={styles.shortcodesSection}>
          <span className={styles.shortcodesLabel}>Доступные шорткоды:</span>
          <div className={styles.shortcodeChips}>
            {SHORTCODES.map((s) => (
              <button
                key={s.code}
                type="button"
                className={styles.shortcodeChip}
                onClick={() => {
                  editorRef.current?.insertHtml(s.code);
                  onCloseShortcodes();
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <InlineButtons
        isOpen={buttonsOpen}
        rows={rows}
        onAddRow={onAddRow}
        onAddColumn={onAddColumn}
        onUpdateButton={onUpdateButton}
        onDeleteButton={onDeleteButton}
      />
    </div>
  );
};

export default EditorSection;
