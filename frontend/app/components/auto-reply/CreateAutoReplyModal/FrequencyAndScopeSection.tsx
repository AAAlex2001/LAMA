'use client';

import { FC, useState } from 'react';
import Toggle from '@/components/toggle/toggle';
import { Checkbox } from '@/components/checkbox';
import { ChevronDownIcon } from '@/components/icons';
import { FREQUENCY_OPTIONS } from './constants';
import styles from '../CreateAutoReplyModal.module.scss';

interface FrequencyAndScopeSectionProps {
  frequencyEnabled: boolean;
  frequencyMinutes: number;
  frequencyType: 'per_user' | 'per_group';
  scope: 'GROUPS' | 'PRIVATE';
  onFrequencyEnabledChange: (next: boolean) => void;
  onFrequencyMinutesChange: (next: number) => void;
  onFrequencyTypeChange: (next: 'per_user' | 'per_group') => void;
  onScopeChange: (next: 'GROUPS' | 'PRIVATE') => void;
}

const FrequencyAndScopeSection: FC<FrequencyAndScopeSectionProps> = ({
  frequencyEnabled,
  frequencyMinutes,
  frequencyType,
  scope,
  onFrequencyEnabledChange,
  onFrequencyMinutesChange,
  onFrequencyTypeChange,
  onScopeChange,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const frequencyLabel = FREQUENCY_OPTIONS.find((o) => o.value === frequencyMinutes)?.label ?? `${frequencyMinutes} мин`;

  return (
    <>
      <div className={styles.frequencySection}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Ограничить частоту ответа</span>
          <Toggle checked={frequencyEnabled} onChange={onFrequencyEnabledChange} />
        </div>

        {frequencyEnabled && (
          <>
            <div className={styles.pickerRow}>
              <span className={styles.pickerLabel}>Не чаще чем:</span>
              <div className={styles.pickerRight} onClick={() => setPickerOpen(!pickerOpen)}>
                <span className={styles.pickerValueText}>{frequencyLabel}</span>
                <div className={`${styles.pickerChevron} ${pickerOpen ? styles.pickerChevronOpen : ''}`}>
                  <ChevronDownIcon width={14} height={14} color="#858585" />
                </div>
              </div>
              {pickerOpen && (
                <div className={styles.pickerDropdown}>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.pickerOption} ${frequencyMinutes === opt.value ? styles.pickerOptionActive : ''}`}
                      onClick={() => { onFrequencyMinutesChange(opt.value); setPickerOpen(false); }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.radioGroup}>
              <div className={styles.radioRow} onClick={() => onFrequencyTypeChange('per_user')}>
                <Checkbox variant="radio" checked={frequencyType === 'per_user'} onChange={() => onFrequencyTypeChange('per_user')} />
                <span className={styles.radioLabel}>Для одного пользователя</span>
              </div>
              <div className={styles.radioRow} onClick={() => onFrequencyTypeChange('per_group')}>
                <Checkbox variant="radio" checked={frequencyType === 'per_group'} onChange={() => onFrequencyTypeChange('per_group')} />
                <span className={styles.radioLabel}>Для всей группы</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={styles.scopeSection}>
        <span className={styles.sectionLabel}>Область действия</span>
        <div className={styles.radioGroup}>
          <div className={styles.radioRow} onClick={() => onScopeChange('GROUPS')}>
            <Checkbox variant="radio" checked={scope === 'GROUPS'} onChange={() => onScopeChange('GROUPS')} />
            <span className={styles.radioLabel}>Публичные чаты</span>
          </div>
          <div className={styles.radioRow} onClick={() => onScopeChange('PRIVATE')}>
            <Checkbox variant="radio" checked={scope === 'PRIVATE'} onChange={() => onScopeChange('PRIVATE')} />
            <span className={styles.radioLabel}>Приватные чаты</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default FrequencyAndScopeSection;
