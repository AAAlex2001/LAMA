'use client';

import { useEffect, useState } from 'react';
import DropdownBase from '@/components/dropdown-base';
import RepeatContent, { type RepeatViewMode } from './RepeatContent';
import type { RepeatContentProps } from './types';

interface Props extends RepeatContentProps {
  label: string;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  closeOnOutsideClick?: boolean;
  className?: string;
}

export default function RepeatSettings({
  label,
  isOpen,
  onToggle,
  closeOnOutsideClick = true,
  className,
  ...contentProps
}: Props) {
  const [viewMode, setViewMode] = useState<RepeatViewMode>('list');

  // Если значение сброшено — возвращаемся в list-режим
  useEffect(() => {
    if (contentProps.repeatValue === 'never') setViewMode('list');
  }, [contentProps.repeatValue]);

  return (
    <DropdownBase
      label={label}
      isOpen={isOpen}
      onToggle={onToggle}
      onClose={() => setViewMode('list')}
      closeOnOutsideClick={closeOnOutsideClick}
      className={className}
    >
      <RepeatContent {...contentProps} viewMode={viewMode} onViewModeChange={setViewMode} />
    </DropdownBase>
  );
}
