'use client';

import { useState } from 'react';
import type { RepeatContentProps } from '../../types';
import RepeatDefaultCase from './components/RepeatDefaultCase';
import RepeatDailyCase from './components/RepeatDailyCase';

export type RepeatViewMode = 'list' | 'daily';

interface RepeatContentPropsExtended extends RepeatContentProps {
  viewMode: RepeatViewMode;
  onViewModeChange: (mode: RepeatViewMode) => void;
  publishHours?: number;
  publishMinutes?: number;
  onPublishHoursChange?: (hours: number) => void;
  onPublishMinutesChange?: (minutes: number) => void;
}

export default function RepeatContent({
  repeatValue,
  repeatCustomDays,
  repeatCustomHours,
  onRepeatChange,
  onRepeatCustomDaysChange,
  onRepeatCustomHoursChange,
  viewMode,
  onViewModeChange,
  publishHours = 12,
  publishMinutes = 0,
  onPublishHoursChange,
  onPublishMinutesChange,
}: RepeatContentPropsExtended) {
  // Local state for hours/minutes if not controlled externally
  const [localHours, setLocalHours] = useState(publishHours);
  const [localMinutes, setLocalMinutes] = useState(publishMinutes);
  
  // Local state for repeat end
  const [repeatEndType, setRepeatEndType] = useState<'never' | 'date'>('never');
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);
  const [repeatEndHours, setRepeatEndHours] = useState(12);
  const [repeatEndMinutes, setRepeatEndMinutes] = useState(0);

  const handleHoursChange = (hours: number) => {
    setLocalHours(hours);
    onPublishHoursChange?.(hours);
  };

  const handleMinutesChange = (minutes: number) => {
    setLocalMinutes(minutes);
    onPublishMinutesChange?.(minutes);
  };

  const handleBack = () => {
    // Reset to 'never' when going back
    onRepeatChange?.('never');
    onViewModeChange('list');
  };

  if (viewMode === 'daily') {
    return (
      <RepeatDailyCase
        onBack={handleBack}
        publishHours={localHours}
        publishMinutes={localMinutes}
        onPublishHoursChange={handleHoursChange}
        onPublishMinutesChange={handleMinutesChange}
        repeatEndType={repeatEndType}
        onRepeatEndTypeChange={setRepeatEndType}
        repeatEndDate={repeatEndDate}
        onRepeatEndDateChange={setRepeatEndDate}
        repeatEndHours={repeatEndHours}
        repeatEndMinutes={repeatEndMinutes}
        onRepeatEndHoursChange={setRepeatEndHours}
        onRepeatEndMinutesChange={setRepeatEndMinutes}
      />
    );
  }

  return (
    <RepeatDefaultCase
      repeatValue={repeatValue}
      repeatCustomDays={repeatCustomDays}
      repeatCustomHours={repeatCustomHours}
      onRepeatChange={(value) => {
        onRepeatChange?.(value);
        if (value === 'daily') {
          onViewModeChange('daily');
        }
      }}
      onRepeatCustomDaysChange={onRepeatCustomDaysChange}
      onRepeatCustomHoursChange={onRepeatCustomHoursChange}
    />
  );
}
