'use client';

import DropdownBase from '@/components/dropdown-base';
import CallbackActionContent from './CallbackActionContent';
import type { CallbackActionOption } from './types';

interface Props {
  label: string;
  callbackActionValue: CallbackActionOption;
  onCallbackActionChange?: (value: CallbackActionOption) => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  closeOnOutsideClick?: boolean;
  className?: string;
}

export default function CallbackActionPicker({
  label,
  callbackActionValue,
  onCallbackActionChange,
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
      compact
    >
      <CallbackActionContent
        callbackActionValue={callbackActionValue}
        onCallbackActionChange={onCallbackActionChange}
      />
    </DropdownBase>
  );
}
