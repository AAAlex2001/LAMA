'use client';

import { useState } from 'react';
import type { RepeatContentProps } from '../../types';
import RepeatDefaultCase from './components/RepeatDefaultCase';
import RepeatDailyCase from './components/RepeatDailyCase';
import RepeatCustomCase from './components/RepeatCustomCase';

export type RepeatViewMode = 'list' | 'daily' | 'custom';

interface RepeatContentPropsExtended extends RepeatContentProps {
  viewMode: RepeatViewMode;
  onViewModeChange: (mode: RepeatViewMode) => void;
  publishHours?: number;
  publishMinutes?: number;
  onPublishHoursChange?: (hours: number) => void;
  onPublishMinutesChange?: (minutes: number) => void;
  repeatEndType: 'never' | 'date';
  repeatEndDate: Date | null;
  onRepeatEndTypeChange?: (value: 'never' | 'date') => void;
  onRepeatEndDateChange?: (value: Date | null) => void;
}

export default function RepeatContent({
  repeatValue,
  repeatCustomDays,
  repeatCustomHours,
  repeatCustomUnit,
  repeatCustomValue,
  repeatWeekdays,
  repeatMonthDays,
  repeatYearMonth,
  repeatYearDays,
  onRepeatChange,
  onRepeatCustomDaysChange,
  onRepeatCustomHoursChange,
  onRepeatCustomUnitChange,
  onRepeatCustomValueChange,
  onRepeatWeekdaysChange,
  onRepeatMonthDaysChange,
  onRepeatYearMonthChange,
  onRepeatYearDaysChange,
  viewMode,
  onViewModeChange,
  publishHours = 12,
  publishMinutes = 0,
  onPublishHoursChange,
  onPublishMinutesChange,
  repeatEndType,
  repeatEndDate,
  onRepeatEndTypeChange,
  onRepeatEndDateChange,
}: RepeatContentPropsExtended) {
  // Local state for hours/minutes if not controlled externally
  const [localHours, setLocalHours] = useState(publishHours);
  const [localMinutes, setLocalMinutes] = useState(publishMinutes);

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
        onRepeatEndTypeChange={(value) => {
          onRepeatEndTypeChange?.(value);
        }}
        repeatEndDate={repeatEndDate}
        onRepeatEndDateChange={(date) => {
          onRepeatEndDateChange?.(date);
        }}
      />
    );
  }

  if (viewMode === 'custom') {
    return (
      <RepeatCustomCase
        onBack={handleBack}
        repeatCustomDays={repeatCustomDays}
        repeatCustomHours={repeatCustomHours}
        repeatCustomUnit={repeatCustomUnit}
        repeatCustomValue={repeatCustomValue}
        repeatWeekdays={repeatWeekdays}
        repeatMonthDays={repeatMonthDays}
        repeatYearMonth={repeatYearMonth}
        repeatYearDays={repeatYearDays}
        onRepeatChange={onRepeatChange}
        onRepeatCustomDaysChange={onRepeatCustomDaysChange}
        onRepeatCustomHoursChange={onRepeatCustomHoursChange}
        onRepeatCustomUnitChange={onRepeatCustomUnitChange}
        onRepeatCustomValueChange={onRepeatCustomValueChange}
        onRepeatWeekdaysChange={onRepeatWeekdaysChange}
        onRepeatMonthDaysChange={onRepeatMonthDaysChange}
        onRepeatYearMonthChange={onRepeatYearMonthChange}
        onRepeatYearDaysChange={onRepeatYearDaysChange}
        repeatEndType={repeatEndType}
        repeatEndDate={repeatEndDate}
        onRepeatEndTypeChange={onRepeatEndTypeChange}
        onRepeatEndDateChange={onRepeatEndDateChange}
      />
    );
  }

  return (
    <RepeatDefaultCase
      repeatValue={repeatValue}
      onRepeatChange={(value) => {
        onRepeatChange?.(value);
        if (value === 'daily') {
          onViewModeChange('daily');
        }
      }}
      onCustomClick={() => {
        onRepeatChange?.('custom');
        onViewModeChange('custom');
      }}
    />
  );
}
