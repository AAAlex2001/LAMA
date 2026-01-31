'use client';
import styles from '../repeat.module.scss';
import PublishTimeSelector from './PublishTimeSelector';
import RepeatEndSelector from './RepeatEndSelector';

interface RepeatDailyCaseProps {
  onBack: () => void;
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
}

export default function RepeatDailyCase({ 
  onBack,
  publishTimeType,
  onPublishTimeTypeChange,
  publishHours,
  publishMinutes,
  onPublishHoursChange,
  onPublishMinutesChange,
  repeatEndType,
  onRepeatEndTypeChange,
  repeatEndDate,
  onRepeatEndDateChange,
}: RepeatDailyCaseProps) {
  const getDescriptionText = () => {
    const timeStr = `${String(publishHours).padStart(2, '0')}:${String(publishMinutes).padStart(2, '0')}`;
    const dateStr = repeatEndDate ? repeatEndDate.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }) : '';

    if (publishTimeType === 'from_publish') {
      if (repeatEndType === 'never') {
        return 'Каждый день с момента публикации';
      }
      if (repeatEndType === 'date') {
        if (repeatEndDate) {
          return `Каждый день с момента публикации. Конец повтора: ${dateStr}`;
        }
        return 'Каждый день с момента публикации. Конец повтора: выберите дату';
      }
    }
    
    if (publishTimeType === 'exact_time') {
      if (repeatEndType === 'never') {
        return `Каждый день в ${timeStr}`;
      }
      if (repeatEndType === 'date') {
        if (repeatEndDate) {
          return `Каждый день в ${timeStr}. Конец повтора: ${dateStr}`;
        }
        return `Каждый день в ${timeStr}. Конец повтора: выберите дату`;
      }
    }
    
    return 'Каждый день с момента публикации';
  };

  return (
    <div className={styles.repeatDaily}>
      <div className={styles.repeatDailyTopRow}>
        <div className={styles.repeatDailySelector}>
          <span className={styles.repeatDailySelectorText}>Каждый день</span>
        </div>
      </div>
      
      <div className={styles.repeatDescription}>
        {getDescriptionText()}
      </div>

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
        onEndDateChange={onRepeatEndDateChange}
      />
    </div>
  );
}
