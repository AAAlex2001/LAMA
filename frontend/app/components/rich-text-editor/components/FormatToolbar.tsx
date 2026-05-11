'use client';

import dynamic from 'next/dynamic';
import type { TextFormat } from '../editor';
import type { RichTextEditorHoveredButton } from '../store';
import FormatButton from './FormatButton';
import styles from '../rich-text-editor.module.scss';
import {
  AiEditIcon,
  EmojiIcon,
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  QuoteIcon,
  CodeIcon,
  MonospaceIcon,
  BlurIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from '@/components/icons';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface FormatToolbarProps {
  formatButtons: Array<{
    id: TextFormat;
    format: TextFormat;
    label: string;
    tooltip: string;
    isActive: boolean;
    disabled: boolean;
  }>;
  isLink: boolean;
  isQuote: boolean;
  hasSelection: boolean;
  showAiInput: boolean;
  showEmojiPicker: boolean;
  hoveredButton: RichTextEditorHoveredButton;
  onAiButtonMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onToggleFormat: (format: TextFormat) => void;
  onQuoteMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onLinkClick: () => void;
  onRemoveLink: () => void;
  onToggleEmojiPicker: () => void;
  onEmojiClick: (emojiData: { emoji: string }) => void;
  onHover: (id: RichTextEditorHoveredButton) => void;
  getButtonColor: (id: NonNullable<RichTextEditorHoveredButton>, isActive?: boolean) => string;
}

export default function FormatToolbar({
  formatButtons,
  isLink,
  isQuote,
  hasSelection,
  showAiInput,
  showEmojiPicker,
  hoveredButton,
  onAiButtonMouseDown,
  onToggleFormat,
  onQuoteMouseDown,
  onLinkClick,
  onRemoveLink,
  onToggleEmojiPicker,
  onEmojiClick,
  onHover,
  getButtonColor,
}: FormatToolbarProps) {
  const getIcon = (id: TextFormat) => {
    switch (id) {
      case 'bold':
        return BoldIcon;
      case 'italic':
        return ItalicIcon;
      case 'strike':
        return StrikethroughIcon;
      case 'underline':
        return UnderlineIcon;
      case 'monospace':
        return MonospaceIcon;
      case 'code':
        return CodeIcon;
      case 'spoiler':
        return BlurIcon;
      default:
        return BlurIcon;
    }
  };

  return (
    <div className={styles.textareaTools}>
      <FormatButton
        id="ai"
        label="AI редактирование"
        tooltip="ии редактор"
        icon={<AiEditIcon width={21} height={21} color={showAiInput ? '#3B82F6' : getButtonColor('ai')} />}
        isActive={showAiInput}
        onClick={onAiButtonMouseDown}
        onMouseEnter={() => onHover('ai')}
        onMouseLeave={() => onHover(null)}
        hoveredButton={hoveredButton}
      />

      {formatButtons.map(({ id, format, label, tooltip, isActive, disabled }) => {
        const Icon = getIcon(id);
        return (
          <FormatButton
            key={id}
            id={id}
            label={label}
            tooltip={tooltip}
            icon={<Icon width={21} height={21} color={getButtonColor(id, isActive)} />}
            isActive={isActive}
            disabled={disabled}
            desktopOnly
            onClick={(e) => {
              e.preventDefault();
              onToggleFormat(format);
            }}
            onMouseEnter={() => onHover(id)}
            onMouseLeave={() => onHover(null)}
            hoveredButton={hoveredButton}
          />
        );
      })}

      <FormatButton
        id="quote"
        label="Цитата"
        tooltip="цитата"
        icon={<QuoteIcon width={21} height={21} color={getButtonColor('quote', isQuote)} />}
        isActive={isQuote}
        disabled={!hasSelection}
        desktopOnly
        onClick={onQuoteMouseDown}
        onMouseEnter={() => onHover('quote')}
        onMouseLeave={() => onHover(null)}
        hoveredButton={hoveredButton}
      />

      <FormatButton
        id="link"
        label="Гиперссылка"
        tooltip={isLink ? 'убрать ссылку' : 'ссылка'}
        icon={<LinkIcon width={21} height={21} color={getButtonColor('link', isLink)} />}
        isActive={isLink}
        disabled={!hasSelection && !isLink}
        desktopOnly
        onClick={(e) => {
          e.preventDefault();
          isLink ? onRemoveLink() : onLinkClick();
        }}
        onMouseEnter={() => onHover('link')}
        onMouseLeave={() => onHover(null)}
        hoveredButton={hoveredButton}
      />

      <FormatButton
        id="emoji"
        label="Эмодзи"
        tooltip="эмодзи"
        icon={<EmojiIcon width={21} height={21} color={showEmojiPicker ? '#3B82F6' : getButtonColor('emoji')} />}
        isActive={showEmojiPicker}
        onClick={onToggleEmojiPicker}
        onMouseEnter={() => onHover('emoji')}
        onMouseLeave={() => onHover(null)}
        hoveredButton={hoveredButton}
      />

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
  );
}
