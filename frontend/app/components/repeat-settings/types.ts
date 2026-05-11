export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type RepeatCustomUnit = 'days' | 'weeks' | 'months' | 'years';

export interface RepeatContentProps {
  repeatValue: RepeatOption;
  repeatPublishTimeType?: 'from_publish' | 'exact_time';
  repeatPublishHours?: number;
  repeatPublishMinutes?: number;
  repeatCustomDays: number;
  repeatCustomHours: number;
  repeatCustomUnit: RepeatCustomUnit;
  repeatCustomValue: number;
  repeatWeekdays: number[];
  repeatMonthDays: number[];
  repeatYearMonth: number;
  repeatYearDays: number[];
  repeatEndType: 'never' | 'date';
  repeatEndDate: Date | null;
  scheduledMinDate?: Date | null;
  onRepeatChange?: (value: RepeatOption) => void;
  onRepeatPublishTimeTypeChange?: (value: 'from_publish' | 'exact_time') => void;
  onRepeatPublishHoursChange?: (value: number) => void;
  onRepeatPublishMinutesChange?: (value: number) => void;
  onRepeatCustomDaysChange?: (value: number) => void;
  onRepeatCustomHoursChange?: (value: number) => void;
  onRepeatCustomUnitChange?: (value: RepeatCustomUnit) => void;
  onRepeatCustomValueChange?: (value: number) => void;
  onRepeatWeekdaysChange?: (value: number[]) => void;
  onRepeatMonthDaysChange?: (value: number[]) => void;
  onRepeatYearMonthChange?: (value: number) => void;
  onRepeatYearDaysChange?: (value: number[]) => void;
  onRepeatEndTypeChange?: (value: 'never' | 'date') => void;
  onRepeatEndDateChange?: (value: Date | null) => void;
}
