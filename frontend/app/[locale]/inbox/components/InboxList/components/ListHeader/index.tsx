'use client';

import { FC } from 'react';
import { Button } from '@/components/new-button';
import type { CheckedItemsAction } from '../../hooks/useCheckedItems';
import CheckingRow from './CheckingRow';
import ModerationHeader from './ModerationHeader';
import AutomationHeader from './AutomationHeader';
import type { AutomationEventType, ModerationStatusType } from './constants';
import styles from './styles.module.scss';

export type ListHeaderType = 'all' | 'moderation' | 'system' | 'automation';

interface ListHeaderProps {
  type: ListHeaderType;
  selectionDispatch: React.Dispatch<CheckedItemsAction>;
  isChecking: boolean;
  allIds?: string[];
  isSelectedAll?: boolean;
  checkedItems?: number;
  botId?: number;
  onBulkAction?: (action: 'read' | 'ignore' | 'delete' | 'block' | 'unblock') => void;
  automationSubFilter?: AutomationEventType;
  onAutomationSubFilterChange?: (filter: AutomationEventType) => void;
  moderationSubFilter?: ModerationStatusType;
  onModerationSubFilterChange?: (filter: ModerationStatusType) => void;
}

const ListHeader: FC<ListHeaderProps> = ({
  type,
  selectionDispatch,
  isChecking,
  allIds,
  isSelectedAll,
  checkedItems,
  onBulkAction,
  automationSubFilter,
  onAutomationSubFilterChange,
  moderationSubFilter,
  onModerationSubFilterChange,
}) => {
  const checkingRow = (
    <CheckingRow
      selectionDispatch={selectionDispatch}
      isChecking={isChecking}
      allIds={allIds}
      isSelectedAll={isSelectedAll}
      checkedItems={checkedItems}
      onBulkAction={onBulkAction}
    />
  );

  switch (type) {
    case 'all':
    case 'system':
      return checkingRow;

    case 'moderation':
      return (
        <>
          <ModerationHeader
            moderationSubFilter={moderationSubFilter}
            onModerationSubFilterChange={onModerationSubFilterChange}
          />
          {checkingRow}
        </>
      );

    case 'automation':
      return (
        <>
          <AutomationHeader
            automationSubFilter={automationSubFilter}
            onAutomationSubFilterChange={onAutomationSubFilterChange}
          />
          {checkingRow}
        </>
      );

    default:
      return (
        <div className={styles.controls}>
          <Button
            variant="outline"
            intent="neutral"
            size="sm"
            onClick={() => selectionDispatch({ type: 'selectAll', allIds: allIds ?? [] })}
            className={styles.controlButton}
          >
            <span>Выбрать все</span>
          </Button>
          <Button
            variant="outline"
            intent={isChecking ? 'gradient' : 'neutral'}
            size="sm"
            onClick={() => selectionDispatch({ type: 'setMode', checking: !isChecking })}
            className={styles.controlButton}
          >
            <span>Выбрать</span>
          </Button>
        </div>
      );
  }
};

export default ListHeader;
