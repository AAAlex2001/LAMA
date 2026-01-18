'use client';

import { type RefObject } from 'react';
import dynamic from 'next/dynamic';
import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';

import styles from './rich-text-editor.module.scss';
import type { TextFormat } from './editor';
import AiInputBar from '@/components/ai-input-bar';
import Tooltip from '@/components/tooltip/tooltip';
import Input from '@/components/input';

import type { RichTextEditorState, RichTextEditorHoveredButton } from './store';

import {
  AiEditIcon,
  EmojiIcon,
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  QuoteIcon,
  CodeIcon,
  BlurIcon,
  StrikethroughIcon,
  UnderlineIcon,
  TemplatesIcon,
  CloseIcon,
  CheckIcon,
} from '@/components/icons';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

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
        <div className={styles.textareaInner} onMouseDown={onTextareaMouseDown}>
          {editor && <EditorContent editor={editor} className={styles.editor} />}
          {isEmpty && <div className={styles.placeholder}>{placeholder}</div>}
        </div>

        {editor && hasSelection && (
          <div className={styles.floatingToolbarPinned}>
            {formatButtons.map(({ id, format, label, isActive: active }) => {
              const Icon =
                id === 'bold'
                  ? BoldIcon
                  : id === 'italic'
                    ? ItalicIcon
                    : id === 'strike'
                      ? StrikethroughIcon
                      : id === 'underline'
                        ? UnderlineIcon
                        : id === 'code'
                          ? CodeIcon
                          : BlurIcon;

              return (
                <button
                  key={id}
                  className={styles.floatingButton}
                  type="button"
                  aria-label={label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onToggleFormat(format);
                  }}
                >
                  <Icon width={18} height={18} color={active ? '#3B82F6' : '#383F45'} />
                </button>
              );
            })}
            <button
              className={styles.floatingButton}
              type="button"
              aria-label="Ссылка"
              onMouseDown={(e) => {
                e.preventDefault();
                onLinkClick();
              }}
            >
              <LinkIcon width={18} height={18} color={isLink ? '#3B82F6' : '#383F45'} />
            </button>

            <button
              className={styles.floatingButton}
              type="button"
              aria-label="Цитата"
              onMouseDown={onQuoteMouseDown}
            >
              <QuoteIcon width={18} height={18} color={isQuote ? '#3B82F6' : '#383F45'} />
            </button>
          </div>
        )}

        {showLinkInput && (
          <div className={styles.linkInputWrapper}>
            <Input
              inputRef={linkInputRef}
              value={linkUrl}
              onChange={onLinkUrlChange}
              placeholder="Вставьте ссылку..."
              className={styles.linkInputField}
              variant="white"
              icons={[
                {
                  icon: <CheckIcon width={16} height={16} color="#8C8C8C" />,
                  onClick: onLinkSubmit,
                  disabled: !linkUrl.trim(),
                  className: styles.linkApplyIcon,
                },
                {
                  icon: <CloseIcon width={16} height={16} color="#8C8C8C" />,
                  onClick: onCloseLinkInput,
                  className: styles.linkCancelIcon,
                },
              ]}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onLinkSubmit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onCloseLinkInput();
                }
              }}
            />
          </div>
        )}

        {showAiInput && (
          <AiInputBar onSubmit={onAiSubmit} className={styles.aiInputBar} />
        )}

        <div className={styles.textareaFooter}>
          <div className={styles.textareaTools}>
            <button
              type="button"
              aria-label="AI редактирование"
              aria-disabled={!showAiInput && !hasSelection}
              className={`${styles.toolButton} ${showAiInput ? styles.active : ''} ${!showAiInput && !hasSelection ? styles.toolButtonDisabled : ''}`}
              onMouseDown={onAiButtonMouseDown}
              onMouseEnter={() => onHover('ai')}
              onMouseLeave={() => onHover(null)}
            >
              <AiEditIcon
                width={21}
                height={21}
                color={showAiInput ? '#3B82F6' : getButtonColor('ai')}
              />
              {hoveredButton === 'ai' && <Tooltip text="ии редактор" />}
            </button>

            {formatButtons.map(({ id, format, label, tooltip, isActive: active, disabled }) => {
              const Icon =
                id === 'bold'
                  ? BoldIcon
                  : id === 'italic'
                    ? ItalicIcon
                    : id === 'strike'
                      ? StrikethroughIcon
                      : id === 'underline'
                        ? UnderlineIcon
                        : id === 'code'
                          ? CodeIcon
                          : BlurIcon;

              return (
              <button
                key={id}
                  className={`${styles.toolButton} ${styles.desktopOnly} ${disabled ? styles.toolButtonDisabled : ''}`}
                type="button"
                aria-label={label}
                  aria-disabled={disabled}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onToggleFormat(format);
                }}
                onMouseEnter={() => onHover(id)}
                onMouseLeave={() => onHover(null)}
              >
                <Icon
                  width={21}
                  height={21}
                  color={getButtonColor(id, active)}
                />
                {hoveredButton === id && <Tooltip text={tooltip} />}
              </button>
              );
            })}

            <button
              className={`${styles.toolButton} ${styles.desktopOnly} ${!hasSelection ? styles.toolButtonDisabled : ''}`}
              type="button"
              aria-label="Цитата"
              aria-disabled={!hasSelection}
              onMouseDown={onQuoteMouseDown}
              onMouseEnter={() => onHover('quote')}
              onMouseLeave={() => onHover(null)}
            >
              <QuoteIcon
                width={21}
                height={21}
                color={getButtonColor('quote', isQuote)}
              />
              {hoveredButton === 'quote' && <Tooltip text="цитата" />}
            </button>

            <button
              className={`${styles.toolButton} ${styles.desktopOnly} ${!hasSelection && !isLink ? styles.toolButtonDisabled : ''}`}
              type="button"
              aria-label="Гиперссылка"
              aria-disabled={!hasSelection && !isLink}
              onMouseDown={(e) => {
                e.preventDefault();
                isLink ? onRemoveLink() : onLinkClick();
              }}
              onMouseEnter={() => onHover('link')}
              onMouseLeave={() => onHover(null)}
            >
              <LinkIcon
                width={21}
                height={21}
                color={getButtonColor('link', isLink)}
              />
              {hoveredButton === 'link' && <Tooltip text={isLink ? 'убрать ссылку' : 'ссылка'} />}
            </button>

            <button
              className={styles.toolButton}
              type="button"
              aria-label="Эмодзи"
              onClick={onToggleEmojiPicker}
              onMouseEnter={() => onHover('emoji')}
              onMouseLeave={() => onHover(null)}
            >
              <EmojiIcon
                width={21}
                height={21}
                color={showEmojiPicker ? '#3B82F6' : getButtonColor('emoji')}
              />
              {hoveredButton === 'emoji' && <Tooltip text="эмодзи" />}
            </button>

            {showEmojiPicker && (
              <div className={styles.emojiPickerWrapper}>
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  width={300}
                  height={300}
                  searchDisabled
                  skinTonesDisabled
                />
              </div>
            )}
          </div>

          <div className={styles.charCountWrapper}>
            <button
              type="button"
              aria-label="Сохранить в шаблоны"
              aria-disabled={!canSaveSelectionAsTemplate}
              className={`${styles.toolButton} ${!canSaveSelectionAsTemplate ? styles.toolButtonDisabled : ''}`}
              onMouseDown={onSaveSelectionAsTemplateMouseDown}
              onMouseEnter={() => onHover('templates')}
              onMouseLeave={() => onHover(null)}
            >
              <TemplatesIcon width={21} height={21} color={getButtonColor('templates')} />
              {hoveredButton === 'templates' && <Tooltip text="сохранить в шаблоны" />}
            </button>
            <span className={styles.charCount}>{charCount}/{maxLength}</span>
          </div>
        </div>
      </div>
    );
}
