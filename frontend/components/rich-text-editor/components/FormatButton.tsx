'use client';

import type { RichTextEditorHoveredButton } from '../store';
import Tooltip from '@/components/tooltip/tooltip';
import styles from '../rich-text-editor.module.scss';

interface FormatButtonProps {
  id: RichTextEditorHoveredButton;
  label: string;
  tooltip: string;
  icon: React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  desktopOnly?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  hoveredButton: RichTextEditorHoveredButton;
}

export default function FormatButton({
  id,
  label,
  tooltip,
  icon,
  isActive = false,
  disabled = false,
  desktopOnly = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  hoveredButton,
}: FormatButtonProps) {
  return (
    <button
      className={`${styles.toolButton} ${desktopOnly ? styles.desktopOnly : ''} ${disabled ? styles.toolButtonDisabled : ''} ${isActive ? styles.active : ''}`}
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onMouseDown={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {icon}
      {hoveredButton === id && <Tooltip text={tooltip} />}
    </button>
  );
}
