import { ApiTag, TagColor } from '@/types';

export { TAG_COLORS } from '@/types';
export interface DropdownOption {
  id: string;
  label: string;
  checked?: boolean;
}


export type RepeatOption = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
export type AutoDeleteOption = 'never' | '24h' | '48h' | '72h' | 'custom';
export type ButtonTypeOption = 'url' | 'hidden_text' | 'callback';
export type CallbackActionOption = 'send_dm' | 'reply_in_chat' | 'track_click';
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
  onLoadRecentTags?: (force?: boolean) => void;
  onDeleteTag?: (tagId: number) => void;
  onTagColorChange?: (color: TagColor) => void;
}

export interface RepeatContentProps {
  repeatValue: RepeatOption;
  repeatPublishTimeType?: 'from_publish' | 'exact_time';
  repeatPublishHours?: number;
  repeatPublishMinutes?: number;
  repeatCustomDays: number;
  repeatCustomHours: number;
  repeatCustomUnit: 'days' | 'weeks' | 'months' | 'years';
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
  onRepeatCustomUnitChange?: (value: 'days' | 'weeks' | 'months' | 'years') => void;
  onRepeatCustomValueChange?: (value: number) => void;
  onRepeatWeekdaysChange?: (value: number[]) => void;
  onRepeatMonthDaysChange?: (value: number[]) => void;
  onRepeatYearMonthChange?: (value: number) => void;
  onRepeatYearDaysChange?: (value: number[]) => void;
   onRepeatEndTypeChange?: (value: 'never' | 'date') => void;
   onRepeatEndDateChange?: (value: Date | null) => void;
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

export interface CallbackActionContentProps {
  callbackActionValue: CallbackActionOption;
  onCallbackActionChange?: (value: CallbackActionOption) => void;
}

export interface DropdownProps {
  label: string;
  placeholder?: string;
  options?: DropdownOption[];
  selectedCount?: number;
  totalCount?: number;
  showSearch?: boolean;
  showCheckboxes?: boolean;
  onOptionChange?: (id: string, checked: boolean) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  className?: string;
  variant?: 'channels' | 'tags' | 'repeat' | 'auto-delete' | 'button-type' | 'callback-action';
  recentTags?: ApiTag[];
  searchResults?: ApiTag[];
  tagInputValue?: string;
  selectedTagName?: string;
  onTagInputChange?: (value: string) => void;
  onSelectTag?: (tag: ApiTag) => void;
  onSearchTags?: (query: string) => void;
  onLoadRecentTags?: () => void;
  onDeleteTag?: (tagId: number) => void;
  tagsLoading?: boolean;
  tagsSearching?: boolean;
  selectedTagColor?: TagColor;
  onTagColorChange?: (color: TagColor) => void;
  repeatValue?: RepeatOption;
  repeatPublishTimeType?: 'from_publish' | 'exact_time';
  repeatPublishHours?: number;
  repeatPublishMinutes?: number;
  onRepeatChange?: (value: RepeatOption) => void;
  onRepeatPublishTimeTypeChange?: (value: 'from_publish' | 'exact_time') => void;
  onRepeatPublishHoursChange?: (value: number) => void;
  onRepeatPublishMinutesChange?: (value: number) => void;
  repeatCustomDays?: number;
  repeatCustomHours?: number;
  repeatCustomUnit?: 'days' | 'weeks' | 'months' | 'years';
  repeatCustomValue?: number;
  repeatWeekdays?: number[];
  repeatMonthDays?: number[];
  repeatYearMonth?: number;
  repeatYearDays?: number[];
  onRepeatCustomDaysChange?: (value: number) => void;
  onRepeatCustomHoursChange?: (value: number) => void;
  onRepeatCustomUnitChange?: (value: 'days' | 'weeks' | 'months' | 'years') => void;
  onRepeatCustomValueChange?: (value: number) => void;
  onRepeatWeekdaysChange?: (value: number[]) => void;
  onRepeatMonthDaysChange?: (value: number[]) => void;
  onRepeatYearMonthChange?: (value: number) => void;
  onRepeatYearDaysChange?: (value: number[]) => void;
  repeatEndType?: 'never' | 'date';
  repeatEndDate?: Date | null;
  scheduledMinDate?: Date | null;
  onRepeatEndTypeChange?: (value: 'never' | 'date') => void;
  onRepeatEndDateChange?: (value: Date | null) => void;
  autoDeleteValue?: AutoDeleteOption;
  onAutoDeleteChange?: (value: AutoDeleteOption) => void;
  autoDeleteCustomDays?: number;
  autoDeleteCustomHours?: number;
  onAutoDeleteCustomDaysChange?: (value: number) => void;
  onAutoDeleteCustomHoursChange?: (value: number) => void;
  onOpen?: () => void;
  loading?: boolean;
  buttonTypeValue?: ButtonTypeOption;
  onButtonTypeChange?: (value: ButtonTypeOption) => void;
  callbackActionValue?: CallbackActionOption;
  onCallbackActionChange?: (value: CallbackActionOption) => void;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}
