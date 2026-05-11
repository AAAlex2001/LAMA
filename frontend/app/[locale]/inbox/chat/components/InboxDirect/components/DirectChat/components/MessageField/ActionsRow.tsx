'use client';

import { FC } from 'react';
import { Button } from '@/components/new-button';
import InlineButtonIcon from '@/components/icons/inline-button-icon';
import TemplatesIcon from '@/components/icons/templates-icon';
import styles from './styles.module.scss';

interface ActionsRowProps {
  inlineButtonsOpen: boolean;
  canShowInlineButtons: boolean;
  onToggleInlineButtons: () => void;
  onOpenTemplates: () => void;
}

const ActionsRow: FC<ActionsRowProps> = ({
  inlineButtonsOpen,
  canShowInlineButtons,
  onToggleInlineButtons,
  onOpenTemplates,
}) => (
  <div className={styles.actionsRow}>
    <Button
      variant="tag"
      intent={inlineButtonsOpen ? 'gradient' : 'primary'}
      size="sm"
      onClick={onToggleInlineButtons}
      disabled={!canShowInlineButtons}
      style={{ flex: 1 }}
    >
      <InlineButtonIcon
        width={24}
        height={24}
        color={inlineButtonsOpen ? '#FFFFFF' : '#000000'}
      />
      Кнопки
    </Button>
    <Button
      variant="tag"
      intent="primary"
      onClick={onOpenTemplates}
      style={{ flex: 1, display: 'flex' }}
    >
      <TemplatesIcon width={24} height={24} color="#000000" />
      Шаблоны
    </Button>
  </div>
);

export default ActionsRow;
