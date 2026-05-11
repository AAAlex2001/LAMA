'use client';

import DropdownBase from '@/components/dropdown-base';
import ButtonTypeContent from './ButtonTypeContent';
import type { ButtonTypeOption } from './types';

interface Props {
  label: string;
  buttonTypeValue: ButtonTypeOption;
  onButtonTypeChange?: (value: ButtonTypeOption) => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  closeOnOutsideClick?: boolean;
  className?: string;
}

export default function InlineButtonTypePicker({
  label,
  buttonTypeValue,
  onButtonTypeChange,
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
      <ButtonTypeContent buttonTypeValue={buttonTypeValue} onButtonTypeChange={onButtonTypeChange} />
    </DropdownBase>
  );
}
