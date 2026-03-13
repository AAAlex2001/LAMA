import type { ReactNode } from 'react';

export type SortOptionType = 'time' | 'source' | 'status' | 'type';

export interface SortOption {
  type: SortOptionType;
  label: string;
  value: string;
  items?: Array<{ value: string; label: string }>;
  width?: string | number;
  content?: ReactNode;
}
