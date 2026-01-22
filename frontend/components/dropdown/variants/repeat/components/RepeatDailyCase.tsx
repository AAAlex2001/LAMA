'use client';

import { useState } from 'react';
import styles from '../repeat.module.scss';
import PublishTimeSelector from './PublishTimeSelector';
import RepeatEndSelector from './RepeatEndSelector';

interface RepeatDailyCaseProps {
  onBack: () => void;
  publishHours: number;
  publishMinutes: number;
  onPublishHoursChange: (hours: number) => void;
  onPublishMinutesChange: (minutes: number) => void;
  repeatEndType: 'never' | 'date';
  onRepeatEndTypeChange: (value: 'never' | 'date') => void;
  repeatEndDate: Date | null;
  onRepeatEndDateChange: (date: Date) => void;
}

export default function RepeatDailyCase({ 
  onBack,
  publishHours,
  publishMinutes,
  onPublishHoursChange,
  onPublishMinutesChange,
  repeatEndType,
  onRepeatEndTypeChange,
  repeatEndDate,
  onRepeatEndDateChange,
}: RepeatDailyCaseProps) {
  const [publishTimeType, setPublishTimeType] = useState<'from_publish' | 'exact_time'>('from_publish');

  return (
    <div className={styles.repeatDaily}>
      <div className={styles.repeatDailyTopRow}>
        <div className={styles.repeatDailySelector}>
          <span className={styles.repeatDailySelectorText}>Каждый день</span>
        </div>
      </div>

      <PublishTimeSelector 
        value={publishTimeType} 
        onChange={setPublishTimeType}
        hours={publishHours}
        minutes={publishMinutes}
        onHoursChange={onPublishHoursChange}
        onMinutesChange={onPublishMinutesChange}
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
