'use client';

import DropdownBase from '@/components/dropdown-base';
import ChannelsContent from './ChannelsContent';
import type { ChannelOption } from './types';

interface Props {
  label: string;
  options: ChannelOption[];
  selectedCount?: number;
  totalCount?: number;
  showSearch?: boolean;
  showCheckboxes?: boolean;
  placeholder?: string;
  loading?: boolean;
  addNewLabel?: string;
  onOptionChange?: (id: string, checked: boolean) => void;
  onAddNew?: () => void;
  onOpen?: () => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  closeOnOutsideClick?: boolean;
  className?: string;
}

export default function ChannelPicker({
  label,
  options,
  selectedCount,
  totalCount,
  showSearch = false,
  showCheckboxes = false,
  placeholder = 'Введите название канала',
  loading = false,
  addNewLabel = 'Подключить новый',
  onOptionChange,
  onAddNew,
  onOpen,
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
      onOpen={onOpen}
      closeOnOutsideClick={closeOnOutsideClick}
      className={className}
    >
      <ChannelsContent
        options={options}
        showSearch={showSearch}
        showCheckboxes={showCheckboxes}
        placeholder={placeholder}
        loading={loading}
        selectedCount={selectedCount}
        totalCount={totalCount}
        addNewLabel={addNewLabel}
        onOptionChange={onOptionChange}
        onAddNew={onAddNew}
      />
    </DropdownBase>
  );
}
