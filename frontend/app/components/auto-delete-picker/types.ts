export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';

export interface AutoDeleteContentProps {
  autoDeleteValue: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
  onAutoDeleteChange?: (value: AutoDeleteOption) => void;
  onAutoDeleteCustomDaysChange?: (value: number) => void;
  onAutoDeleteCustomHoursChange?: (value: number) => void;
}
