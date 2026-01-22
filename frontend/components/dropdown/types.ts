// Общие типы для dropdown компонентов

export interface DropdownOption {
  id: string;
  label: string;
  checked?: boolean;
}

export interface ApiTag {
  id: number;
  name: string;
  created_at: string;
  color?: string;
}

export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';
export type TagColor = '#FAC7C7' | '#FDE57E' | '#B8F1D2' | '#B8DBF1' | '#B8B9F1';
export type ButtonTypeOption = 'url' | 'hidden_text' | 'callback';

export const TAG_COLORS: TagColor[] = ['#FAC7C7', '#FDE57E', '#B8F1D2', '#B8DBF1', '#B8B9F1'];

// Props для каждого варианта контента
export interface ChannelsContentProps {
  options: DropdownOption[];
  showSearch: boolean;
  showCheckboxes: boolean;
  placeholder: string;
  loading: boolean;
  selectedCount?: number;
  totalCount?: number;
  addNewLabel: string;
  onOptionChange?: (id: string, checked: boolean) => void;
  onAddNew?: () => void;
}

export interface TagsContentProps {
  recentTags: ApiTag[];
  searchResults: ApiTag[];
  tagInputValue: string;
  selectedTagName: string;
  tagsLoading: boolean;
  tagsSearching: boolean;
  selectedTagColor: TagColor;
  onTagInputChange?: (value: string) => void;
  onSelectTag?: (tag: ApiTag) => void;
  onSearchTags?: (query: string) => void;
  onLoadRecentTags?: () => void;
  onDeleteTag?: (tagId: number) => void;
  onTagColorChange?: (color: TagColor) => void;
}

export interface RepeatContentProps {
  repeatValue: RepeatOption;
  repeatCustomDays: number;
  repeatCustomHours: number;
  onRepeatChange?: (value: RepeatOption) => void;
  onRepeatCustomDaysChange?: (value: number) => void;
  onRepeatCustomHoursChange?: (value: number) => void;
}

export interface AutoDeleteContentProps {
  autoDeleteValue: AutoDeleteOption;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
  onAutoDeleteChange?: (value: AutoDeleteOption) => void;
  onAutoDeleteCustomDaysChange?: (value: number) => void;
  onAutoDeleteCustomHoursChange?: (value: number) => void;
}

export interface ButtonTypeContentProps {
  buttonTypeValue: ButtonTypeOption;
  onButtonTypeChange?: (value: ButtonTypeOption) => void;
}
