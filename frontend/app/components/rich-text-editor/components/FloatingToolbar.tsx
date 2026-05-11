'use client';

import type { TextFormat } from '../editor';
import styles from '../rich-text-editor.module.scss';
import {
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

interface FloatingToolbarProps {
  formatButtons: Array<{
    id: TextFormat;
    format: TextFormat;
    label: string;
    isActive: boolean;
  }>;
  isLink: boolean;
  isQuote: boolean;
  onToggleFormat: (format: TextFormat) => void;
  onLinkClick: () => void;
  onQuoteMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function FloatingToolbar({
  formatButtons,
  isLink,
  isQuote,
  onToggleFormat,
  onLinkClick,
  onQuoteMouseDown,
}: FloatingToolbarProps) {
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
    <div className={styles.floatingToolbarPinned}>
      {formatButtons.map(({ id, format, label, isActive }) => {
        const Icon = getIcon(id);
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
            <Icon width={18} height={18} color={isActive ? '#3B82F6' : '#000000'} />
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
        <LinkIcon width={18} height={18} color={isLink ? '#3B82F6' : '#000000'} />
      </button>

      <button
        className={styles.floatingButton}
        type="button"
        aria-label="Цитата"
        onMouseDown={onQuoteMouseDown}
      >
        <QuoteIcon width={18} height={18} color={isQuote ? '#3B82F6' : '#000000'} />
      </button>
    </div>
  );
}
