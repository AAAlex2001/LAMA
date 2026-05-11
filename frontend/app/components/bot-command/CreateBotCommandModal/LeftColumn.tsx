'use client';

import { FC } from 'react';
import Input from '@/components/input/input';
import Checkbox from '@/components/checkbox/checkbox';
import styles from '../CreateBotCommandModal.module.scss';

type CommandActionType = 'MESSAGE' | 'CLAIM_ADMIN';
type CommandScope = 'GROUPS' | 'PRIVATE' | 'ALL';

interface LeftColumnProps {
  command: string;
  onCommandChange: (next: string) => void;
  scope: CommandScope;
  onScopeChange: (next: CommandScope) => void;
  actionType: CommandActionType;
  onActionTypeChange: (next: CommandActionType) => void;
}

const LeftColumn: FC<LeftColumnProps> = ({
  command,
  onCommandChange,
  scope,
  onScopeChange,
  actionType,
  onActionTypeChange,
}) => {
  const inGroup = scope === 'GROUPS' || scope === 'ALL';
  const inPrivate = scope === 'PRIVATE' || scope === 'ALL';

  const applyScopeCheckboxes = (nextGroup: boolean, nextPrivate: boolean) => {
    if (!nextGroup && !nextPrivate) {
      onScopeChange('GROUPS');
      return;
    }
    if (nextGroup && nextPrivate) onScopeChange('ALL');
    else if (nextGroup) onScopeChange('GROUPS');
    else onScopeChange('PRIVATE');
  };

  return (
    <div className={styles.leftColumn}>
      <div className={styles.fieldBlock}>
        <span className={styles.fieldLabel}>Название команды</span>
        <Input
          placeholder="/rules"
          value={command}
          onChange={onCommandChange}
          className={styles.commandInput}
        />
      </div>

      <div className={styles.fieldBlock}>
        <span className={styles.fieldLabel}>Срабатывать:</span>
        <div className={styles.checkboxStack}>
          <label className={styles.checkboxRow}>
            <Checkbox checked={inGroup} onChange={(v) => applyScopeCheckboxes(v, inPrivate)} />
            <span className={styles.checkboxCaption}>В группе</span>
          </label>
          <label className={styles.checkboxRow}>
            <Checkbox checked={inPrivate} onChange={(v) => applyScopeCheckboxes(inGroup, v)} />
            <span className={styles.checkboxCaption}>В личных сообщениях</span>
          </label>
        </div>
      </div>

      <div className={styles.fieldBlock}>
        <span className={styles.fieldLabel}>Тип команды:</span>
        <div className={styles.typeList}>
          <label className={styles.radioRow}>
            <Checkbox
              variant="radio"
              checked={actionType === 'MESSAGE'}
              onChange={(checked) => { if (checked) onActionTypeChange('MESSAGE'); }}
            />
            <span className={styles.radioCaption}>Отправить сообщение</span>
          </label>

          <label className={styles.radioRow}>
            <Checkbox
              variant="radio"
              checked={actionType === 'CLAIM_ADMIN'}
              onChange={(checked) => { if (checked) onActionTypeChange('CLAIM_ADMIN'); }}
            />
            <span className={styles.radioCaption}>Отправить жалобу администратору</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default LeftColumn;
