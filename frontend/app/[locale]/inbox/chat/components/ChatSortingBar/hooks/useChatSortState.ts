import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../store";
import { setChatSort, setChatUnreadFilter } from "../../../../store";
import { selectChatSort, selectChatUnreadFilter } from "../../../../store/selectors";
import type { SortOptionType, SortOption } from "../../../../components/sortTypes";

const timeOptions = [
  { value: "newest", label: "Сначала новые" },
  { value: "oldest", label: "Сначала старые" },
];

const statusOptions = [
  { value: "all", label: "Все" },
  { value: "unread", label: "Непрочитанные" },
  { value: "read", label: "Прочитанные" },
];

const UNREAD_MAP: Record<string, 'unread' | 'read' | null> = {
  unread: 'unread',
  read: 'read',
  all: null,
};

const DEFAULT_VALUES: Record<'time' | 'status', string> = {
  time: 'newest',
  status: 'all',
};

const isDefaultValue = (type: SortOptionType, value: string): boolean => {
  if (type === 'time') return value === '' || value === 'newest';
  if (type === 'status') return value === '' || value === 'all';
  return value === '';
};

const getButtonText = (option: SortOption): string => {
  if (!option.value || isDefaultValue(option.type, option.value)) return option.label;
  if (option.items) {
    const selectedItem = option.items.find((item) => item.value === option.value);
    return selectedItem?.label || option.label;
  }
  return option.label;
};

export const useChatSortState = () => {
  const dispatch = useAppDispatch();
  const [openFilter, setOpenFilter] = useState<SortOptionType | null>(null);

  const chatSort = useAppSelector(selectChatSort);
  const chatUnreadFilter = useAppSelector(selectChatUnreadFilter);

  const sortTimeValue = chatSort === 'old' ? 'oldest' : 'newest';
  const sortStatusValue = chatUnreadFilter ?? 'all';

  const availableSortOptions: SortOption[] = [
    {
      type: 'time' as SortOptionType,
      label: 'По активности',
      value: sortTimeValue,
      items: timeOptions,
      width: "138px",
    },
    {
      type: 'status' as SortOptionType,
      label: 'По статусу',
      value: sortStatusValue,
      items: statusOptions,
      width: "138px",
    },
  ];

  const handleSortChange = (sortType: SortOptionType, value: string) => {
    if (sortType === 'time') {
      dispatch(setChatSort(value === 'oldest' ? 'old' : 'new'));
    }
    if (sortType === 'status') {
      dispatch(setChatUnreadFilter(UNREAD_MAP[value] ?? null));
    }
  };

  const handleSortClear = (sortType: SortOptionType) => {
    if (sortType === 'time') {
      dispatch(setChatSort('new'));
    }
    if (sortType === 'status') {
      dispatch(setChatUnreadFilter(null));
    }
  };

  const clearFilter = (sortType: SortOptionType, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSortClear(sortType);
    setOpenFilter(null);
  };

  const toggleOption = (option: SortOption, value: string) => {
    handleSortChange(option.type, value);
    setOpenFilter(null);
  };

  const resetSorting = () => {
    dispatch(setChatSort('new'));
    dispatch(setChatUnreadFilter(null));
    setOpenFilter(null);
  };

  return {
    openFilter,
    setOpenFilter,
    availableSortOptions,
    handleSortChange,
    handleSortClear,
    clearFilter,
    toggleOption,
    resetSorting,
    isDefaultValue,
    getButtonText,
  };
};
