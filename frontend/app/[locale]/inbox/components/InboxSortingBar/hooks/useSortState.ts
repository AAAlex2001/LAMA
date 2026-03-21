import { useState } from "react";
import type { SortOptionType } from "../../sortTypes";
import { useAppSelector } from "../../../store";
import { selectSortDir, selectStatusFilter } from "../../../store/selectors";

const DEFAULT_VALUES: Record<SortOptionType, string> = {
  time: "",
  source: "",
  status: "default",
  type: "",
};

const isDefaultValue = (sortType: SortOptionType, value: string): boolean => {
  return value === DEFAULT_VALUES[sortType];
};

const getButtonText = (option: { value?: string; type: SortOptionType; label: string; items?: Array<{ value: string; label: string }> }): string => {
  if (!option.value || isDefaultValue(option.type, option.value)) return option.label;
  if (option.items) {
    const selectedItem = option.items.find((item) => item.value === option.value);
    return selectedItem?.label || option.label;
  }
  return option.label;
};

export const useSortState = () => {
  const reduxSortDir = useAppSelector(selectSortDir);
  const reduxStatusFilter = useAppSelector(selectStatusFilter);

  const [localValues, setLocalValues] = useState<Pick<Record<SortOptionType, string>, 'source' | 'type'>>({
    source: DEFAULT_VALUES.source,
    type: DEFAULT_VALUES.type,
  });
  const [openFilter, setOpenFilter] = useState<SortOptionType | null>(null);

  const sortValues: Record<SortOptionType, string> = {
    time: reduxSortDir === 'old' ? 'oldest' : '',
    status: reduxStatusFilter || 'default',
    source: localValues.source,
    type: localValues.type,
  };

  const setSortValues = (updater: Record<SortOptionType, string> | ((prev: Record<SortOptionType, string>) => Record<SortOptionType, string>)) => {
    const next = typeof updater === 'function' ? updater(sortValues) : updater;
    setLocalValues({ source: next.source, type: next.type });
  };

  const resetSortValues = () => {
    setLocalValues({ source: DEFAULT_VALUES.source, type: DEFAULT_VALUES.type });
    setOpenFilter(null);
  };

  const handleSortChange = (sortType: SortOptionType, value: string) => {
    if (sortType === 'source' || sortType === 'type') {
      setLocalValues(prev => ({ ...prev, [sortType]: value }));
    }
  };

  const handleSortClear = (sortType: SortOptionType) => {
    if (sortType === 'source' || sortType === 'type') {
      setLocalValues(prev => ({ ...prev, [sortType]: DEFAULT_VALUES[sortType] }));
    }
  };

  return {
    sortValues,
    setSortValues,
    openFilter,
    setOpenFilter,
    resetSortValues,
    handleSortChange,
    handleSortClear,
    DEFAULT_VALUES,
    isDefaultValue,
    getButtonText,
  };
};
