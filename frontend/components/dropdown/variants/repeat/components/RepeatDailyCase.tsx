'use client';
import { useState, useRef, useEffect } from 'react';
import styles from '../repeat.module.scss';
import { ChevronDownIcon } from '@/components/icons';
import Checkbox from '@/components/checkbox/checkbox';
import PublishTimeSelector from './PublishTimeSelector';
import RepeatEndSelector from './RepeatEndSelector';
import type { RepeatOption } from '../../../types';

type FrequencyOption = { id: RepeatOption; label: string };

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { id: 'never', label: 'Никогда' },
  { id: 'daily', label: 'Каждый день' },
  { id: 'weekly', label: 'Каждую неделю' },
  { id: 'monthly', label: 'Каждый месяц' },
  { id: 'yearly', label: 'Каждый год' },
];

interface RepeatDailyCaseProps {
  repeatValue: RepeatOption;
  onRepeatChange?: (value: RepeatOption) => void;
  publishTimeType: 'from_publish' | 'exact_time';
  onPublishTimeTypeChange?: (value: 'from_publish' | 'exact_time') => void;
  publishHours: number;
  publishMinutes: number;
  onPublishHoursChange?: (hours: number) => void;
  onPublishMinutesChange?: (minutes: number) => void;
  repeatEndType: 'never' | 'date';
  onRepeatEndTypeChange: (value: 'never' | 'date') => void;
  repeatEndDate: Date | null;
  onRepeatEndDateChange: (date: Date) => void;
  onCustomClick?: () => void;
}

export default function RepeatDailyCase({ 
  repeatValue,
  onRepeatChange,
  publishTimeType,
  onPublishTimeTypeChange,
  publishHours,
  publishMinutes,
  onPublishHoursChange,
  onPublishMinutesChange,
  repeatEndType,
  onRepeatEndTypeChange,
  repeatEndDate,
  scheduledMinDate,
  onRepeatEndDateChange,
  onCustomClick,
}: RepeatDailyCaseProps) {
  const [showFrequencyPopup, setShowFrequencyPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        selectorRef.current && !selectorRef.current.contains(e.target as Node)
      ) {
        setShowFrequencyPopup(false);
      }
    };
    if (showFrequencyPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFrequencyPopup]);

  const currentLabel = FREQUENCY_OPTIONS.find(o => o.id === repeatValue)?.label ?? 'Каждый день';

  const getDescriptionText = () => {
    if (repeatValue === 'never') {
      return 'Пост не будет повторяться';
    }

    const timeStr = `${String(publishHours).padStart(2, '0')}:${String(publishMinutes).padStart(2, '0')}`;
    const dateStr = repeatEndDate ? repeatEndDate.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }) : '';

    if (publishTimeType === 'from_publish') {
      if (repeatEndType === 'never') {
        return `${currentLabel} с момента публикации`;
      }
      if (repeatEndType === 'date') {
        if (repeatEndDate) {
          return `${currentLabel} с момента публикации. Конец повтора: ${dateStr}`;
        }
        return `${currentLabel} с момента публикации. Конец повтора: выберите дату`;
      }
    }
    
    if (publishTimeType === 'exact_time') {
      if (repeatEndType === 'never') {
        return `${currentLabel} в ${timeStr}`;
      }
      if (repeatEndType === 'date') {
        if (repeatEndDate) {
          return `${currentLabel} в ${timeStr}. Конец повтора: ${dateStr}`;
        }
        return `${currentLabel} в ${timeStr}. Конец повтора: выберите дату`;
      }
    }
    
    return `${currentLabel} с момента публикации`;
  };

  return (
    <div className={styles.repeatDaily}>
      <div className={styles.repeatDailyTopRow}>
        <div
          ref={selectorRef}
          className={styles.frequencySelector}
          onClick={() => setShowFrequencyPopup(!showFrequencyPopup)}
        >
          <span className={styles.frequencySelectorText}>{currentLabel}</span>
          <ChevronDownIcon
            width={14}
            height={14}
            color="#858585"
            className={`${styles.frequencyChevron} ${showFrequencyPopup ? styles.frequencyChevronRotated : ''}`}
          />
        </div>
      </div>

      {showFrequencyPopup && (
        <div ref={popupRef} className={styles.frequencyPopup}>
          {FREQUENCY_OPTIONS.map((option) => (
            <div key={option.id} className={styles.frequencyPopupRow}>
              <Checkbox
                variant="radio"
                checked={repeatValue === option.id}
                onChange={() => {
                  onRepeatChange?.(option.id);
                  setShowFrequencyPopup(false);
                }}
              />
              <span className={styles.optionLabel}>{option.label}</span>
            </div>
          ))}
          <button
            type="button"
            className={styles.customButton}
            onClick={() => {
              onCustomClick?.();
              setShowFrequencyPopup(false);
            }}
          >
            <span className={styles.optionLabel}>Настроить</span>
          </button>
        </div>
      )}
      
      <div className={styles.repeatDescription}>
        {getDescriptionText()}
      </div>

      {repeatValue !== 'never' && (
        <>
          <PublishTimeSelector 
            value={publishTimeType} 
            onChange={(value) => onPublishTimeTypeChange?.(value)}
            hours={publishHours}
            minutes={publishMinutes}
            onHoursChange={(value) => onPublishHoursChange?.(value)}
            onMinutesChange={(value) => onPublishMinutesChange?.(value)}
          />

          <RepeatEndSelector
            value={repeatEndType}
            onChange={onRepeatEndTypeChange}
            endDate={repeatEndDate}
            scheduledMinDate={scheduledMinDate}
            onEndDateChange={onRepeatEndDateChange}
          />
        </>
      )}
    </div>
  );
}
