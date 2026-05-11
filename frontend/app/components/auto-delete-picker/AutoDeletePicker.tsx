'use client';

import DropdownBase from '@/components/dropdown-base';
import AutoDeleteContent from './AutoDeleteContent';
import type { AutoDeleteOption } from './types';

interface Props {
  label: string;
  autoDeleteValue: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
  onAutoDeleteChange?: (value: AutoDeleteOption) => void;
  onAutoDeleteCustomDaysChange?: (value: number) => void;
  onAutoDeleteCustomHoursChange?: (value: number) => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  closeOnOutsideClick?: boolean;
  className?: string;
}

export default function AutoDeletePicker({
  label,
  autoDeleteValue,
  autoDeleteCustomDays,
  autoDeleteCustomHours,
  onAutoDeleteChange,
  onAutoDeleteCustomDaysChange,
  onAutoDeleteCustomHoursChange,
  isOpen,
  onToggle,
  closeOnOutsideClick = true,
  className,
}: Props) {
  return (
    <DropdownBase
      label={label}
      isOpen={isOpen}
      onToggle={onToggle}
      closeOnOutsideClick={closeOnOutsideClick}
      className={className}
    >
      <AutoDeleteContent
        autoDeleteValue={autoDeleteValue}
        autoDeleteCustomDays={autoDeleteCustomDays}
        autoDeleteCustomHours={autoDeleteCustomHours}
        onAutoDeleteChange={onAutoDeleteChange}
        onAutoDeleteCustomDaysChange={onAutoDeleteCustomDaysChange}
        onAutoDeleteCustomHoursChange={onAutoDeleteCustomHoursChange}
      />
    </DropdownBase>
  );
}
