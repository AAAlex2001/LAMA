'use client';

import { FC } from 'react';
import { Button } from '@/components/new-button';
import buttonStyles from '@/components/new-button/styles.module.scss';
import { DesktopWrapper, MobileWrapper } from '@/components/responsive-wrappers';
import type { CheckedItemsAction } from '../../hooks/useCheckedItems';
import styles from './styles.module.scss';

type BulkAction = 'read' | 'ignore' | 'delete' | 'block' | 'unblock';

interface CheckingRowProps {
  selectionDispatch: React.Dispatch<CheckedItemsAction>;
  isChecking: boolean;
  allIds?: string[];
  isSelectedAll?: boolean;
  checkedItems?: number;
  onBulkAction?: (action: BulkAction) => void;
}

const BulkActionButtons: FC<{ onBulkAction?: (action: BulkAction) => void }> = ({ onBulkAction }) => (
  <>
    <Button variant="ghost" intent="gradient" size="transparent" onClick={() => onBulkAction?.('read')}>
      <span className={buttonStyles.label}>Прочитать</span>
    </Button>
    <Button variant="ghost" intent="gradient" size="transparent" onClick={() => onBulkAction?.('ignore')}>
      <span className={buttonStyles.label}>Игнорировать</span>
    </Button>
    <Button variant="ghost" intent="destructive" size="transparent" onClick={() => onBulkAction?.('delete')}>
      Удалить
    </Button>
    <Button variant="ghost" intent="destructive" size="transparent" onClick={() => onBulkAction?.('block')}>
      Заблокировать
    </Button>
    <Button variant="ghost" intent="gradient" size="transparent" onClick={() => onBulkAction?.('unblock')}>
      <span className={buttonStyles.label}>Разблокировать</span>
    </Button>
  </>
);

const CheckingRow: FC<CheckingRowProps> = ({
  selectionDispatch,
  isChecking,
  allIds,
  isSelectedAll,
  checkedItems,
  onBulkAction,
}) => (
  <>
    <DesktopWrapper>
      <div className={styles.headerWrapper}>
        {isChecking ? (
          <div className={styles.selectedItems}>
            <span>Выбрано {checkedItems} уведомление</span>
          </div>
        ) : <div />}
        {isChecking && (
          <div className={styles.actions}>
            <BulkActionButtons onBulkAction={onBulkAction} />
          </div>
        )}
        <div className={styles.controls}>
          <Button
            variant="outline"
            intent={isSelectedAll ? 'primary' : 'neutral'}
            size="sm"
            onClick={() => selectionDispatch({ type: 'selectAll', allIds: allIds ?? [] })}
            className={styles.controlButton}
          >
            <span>{!isSelectedAll ? 'Выбрать все' : 'Снять выбор'}</span>
          </Button>
          <Button
            variant="outline"
            intent={isChecking ? 'primary' : 'neutral'}
            size="sm"
            onClick={() => selectionDispatch({ type: 'setMode', checking: !isChecking })}
            className={styles.controlButton}
          >
            <span>{!isChecking ? 'Выбрать' : 'Отменить'}</span>
          </Button>
        </div>
      </div>
    </DesktopWrapper>

    {isChecking && (
      <MobileWrapper>
        <div className={styles.selectedItemsMobile}>
          <div className={styles.controls}>
            <Button
              variant="outline"
              intent={isSelectedAll ? 'primary' : 'neutral'}
              size="sm"
              onClick={() => selectionDispatch({ type: 'selectAll', allIds: allIds ?? [] })}
              className={styles.controlButton}
            >
              <span>{!isSelectedAll ? 'Выбрать все' : 'Снять выбор'}</span>
            </Button>
            <Button
              variant="outline"
              intent={isChecking ? 'primary' : 'neutral'}
              size="sm"
              onClick={() => selectionDispatch({ type: 'setMode', checking: false })}
              className={styles.controlButton}
            >
              <span>Отменить</span>
            </Button>
          </div>
          <div className={styles.selectedItems}>
            <span>Выбрано {checkedItems} уведомление</span>
          </div>
        </div>
        <div className={styles.mobileActions}>
          <BulkActionButtons onBulkAction={onBulkAction} />
        </div>
      </MobileWrapper>
    )}
  </>
);

export default CheckingRow;
