import { useState, useEffect } from "react";
import type { SortOptionType } from "../../sortTypes";

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
  const [sortValues, setSortValues] = useState<Record<SortOptionType, string>>({ ...DEFAULT_VALUES });
  const [openFilter, setOpenFilter] = useState<SortOptionType | null>(null);

  const resetSortValues = () => {
    setSortValues({ ...DEFAULT_VALUES });
    setOpenFilter(null);
  };

  const handleSortChange = (sortType: SortOptionType, value: string) => {
    setSortValues(prev => ({ ...prev, [sortType]: value }));
  };

  const handleSortClear = (sortType: SortOptionType) => {
    setSortValues(prev => ({ ...prev, [sortType]: DEFAULT_VALUES[sortType] }));
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
