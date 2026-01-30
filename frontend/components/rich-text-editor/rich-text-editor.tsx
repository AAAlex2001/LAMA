'use client';

import { type RefObject } from 'react';
import type { Editor } from '@tiptap/react';

import styles from './rich-text-editor.module.scss';
import type { TextFormat } from './editor';
import AiInputBar from '@/components/ai-input-bar';

import type { RichTextEditorState, RichTextEditorHoveredButton } from './store';

import EditorArea from './components/EditorArea';
import FloatingToolbar from './components/FloatingToolbar';
import LinkInput from './components/LinkInput';
import FormatToolbar from './components/FormatToolbar';
import CharCounter from './components/CharCounter';

export interface RichTextEditorViewProps {
  editor: Editor | null;
  placeholder: string;
  maxLength: number;
  wrapperRef: RefObject<HTMLDivElement | null>;
  linkInputRef: RefObject<HTMLInputElement | null>;
  formatButtons: Array<{ id: TextFormat; format: TextFormat; label: string; tooltip: string; isActive: boolean; disabled: boolean }>;
  charCount: number;
  isEmpty: boolean;
  isLink: boolean;
  isQuote: boolean;
  hasSelection: boolean;
  canSaveSelectionAsTemplate: boolean;
  uiState: RichTextEditorState;
  onTextareaMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onAiButtonMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onAiSubmit: (prompt: string) => Promise<void>;
  onToggleFormat: (format: TextFormat) => void;
  onQuoteMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onLinkClick: () => void;
  onLinkSubmit: () => void;
  onRemoveLink: () => void;
  onLinkUrlChange: (next: string) => void;
  onCloseLinkInput: () => void;
  onToggleEmojiPicker: () => void;
  onEmojiClick: (emojiData: { emoji: string }) => void;
  onSaveSelectionAsTemplateMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onHover: (id: RichTextEditorHoveredButton) => void;
  getButtonColor: (id: NonNullable<RichTextEditorHoveredButton>, isActive?: boolean) => string;
}

export default function RichTextEditorView(props: RichTextEditorViewProps) {
  const {
    editor,
    placeholder,
    maxLength,
    wrapperRef,
    linkInputRef,
    formatButtons,
    charCount,
    isEmpty,
    isLink,
    isQuote,
    hasSelection,
    canSaveSelectionAsTemplate,
    uiState,
    onTextareaMouseDown,
    onAiButtonMouseDown,
    onAiSubmit,
    onToggleFormat,
    onQuoteMouseDown,
    onLinkClick,
    onLinkSubmit,
    onRemoveLink,
    onLinkUrlChange,
    onCloseLinkInput,
    onToggleEmojiPicker,
    onEmojiClick,
    onSaveSelectionAsTemplateMouseDown,
    onHover,
    getButtonColor,
  } = props;

  const hoveredButton = uiState.hoveredButton;
  const showAiInput = uiState.showAiInput;
  const showEmojiPicker = uiState.showEmojiPicker;
  const showLinkInput = uiState.showLinkInput;
  const linkUrl = uiState.linkUrl;

  return (
    <div className={styles.textareaWrapper} ref={wrapperRef}>
      <EditorArea
        editor={editor}
        isEmpty={isEmpty}
        placeholder={placeholder}
        onMouseDown={onTextareaMouseDown}
      />

      {editor && hasSelection && (
        <FloatingToolbar
          formatButtons={formatButtons}
          isLink={isLink}
          isQuote={isQuote}
          onToggleFormat={onToggleFormat}
          onLinkClick={onLinkClick}
          onQuoteMouseDown={onQuoteMouseDown}
        />
      )}

      {showLinkInput && (
        <LinkInput
          linkInputRef={linkInputRef}
          linkUrl={linkUrl}
          onLinkUrlChange={onLinkUrlChange}
          onLinkSubmit={onLinkSubmit}
          onCloseLinkInput={onCloseLinkInput}
        />
      )}

      {showAiInput && <AiInputBar onSubmit={onAiSubmit} className={styles.aiInputBar} />}

      <div className={styles.textareaFooter}>
        <FormatToolbar
          formatButtons={formatButtons}
          isLink={isLink}
          isQuote={isQuote}
          hasSelection={hasSelection}
          showAiInput={showAiInput}
          showEmojiPicker={showEmojiPicker}
          hoveredButton={hoveredButton}
          onAiButtonMouseDown={onAiButtonMouseDown}
          onToggleFormat={onToggleFormat}
          onQuoteMouseDown={onQuoteMouseDown}
          onLinkClick={onLinkClick}
          onRemoveLink={onRemoveLink}
          onToggleEmojiPicker={onToggleEmojiPicker}
          onEmojiClick={onEmojiClick}
          onHover={onHover}
          getButtonColor={getButtonColor}
        />

        <CharCounter
          charCount={charCount}
          maxLength={maxLength}
          canSaveSelectionAsTemplate={canSaveSelectionAsTemplate}
          hoveredButton={hoveredButton}
          onSaveSelectionAsTemplateMouseDown={onSaveSelectionAsTemplateMouseDown}
          onHover={onHover}
          getButtonColor={getButtonColor}
        />
      </div>
    </div>
  );
}
