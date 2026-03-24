import { useMemo } from "react";
import SourceContent from "../components/SourceComponent";
import type { SortOptionType, SortOption } from "../../sortTypes";
import { ListHeaderType } from "../../InboxList/components/ListHeader";

const DEFAULT_VALUES: Record<SortOptionType, string> = {
  time: "newest",
  source: "",
  status: "default",
  type: "",
};

const timeOptions = [
  { value: "newest", label: "Сначала новые" },
  { value: "oldest", label: "Сначала старые" },
];

const statusOptions = [
  { value: "default", label: "По умолчанию" },
  { value: "new", label: "Новые" },
  { value: "processed", label: "Обработанные" },
];

const filterSortConfig: Record<ListHeaderType, SortOptionType[]> = {
  all: ['time', 'source', 'status'],
  moderation: ['time', 'source'],
  system: ['time', 'source'],
  automation: ['time', 'type'],
};

interface UseSortOptionsProps {
  selectedFilter: ListHeaderType;
  sortValues: Record<SortOptionType, string>;
  sourceDefault: boolean;
  setSourceDefault: (value: boolean) => void;
  sourceFilterOptions: any[];
  typeDefault: boolean;
  setTypeDefault: (value: boolean) => void;
  typeFilterOptions: any[];
}

export const useSortOptions = ({
  selectedFilter,
  sortValues,
  sourceDefault,
  setSourceDefault,
  sourceFilterOptions,
  typeDefault,
  setTypeDefault,
  typeFilterOptions,
}: UseSortOptionsProps): { availableSortOptions: SortOption[]; DEFAULT_VALUES: Record<SortOptionType, string> } => {
  const availableSortOptions = useMemo(() => {
    const sortTypes = filterSortConfig[selectedFilter];

    return sortTypes.map((sortType): SortOption => {
      switch (sortType) {
        case 'time':
          return {
            type: 'time',
            label: 'По времени',
            value: sortValues.time,
            items: timeOptions,
            width: "138px",
          };
        case 'source':
          return {
            type: 'source',
            label: 'По источнику',
            value: sortValues.source,
            width: "240px",
            content: <SourceContent
                isDefault={sourceDefault}
                onDefaultChange={setSourceDefault}
                options={sourceFilterOptions}
              />
          };
        case 'status':
          return {
            type: 'status',
            label: 'По статусу',
            value: sortValues.status,
            items: statusOptions,
            width: "138px",
          };
        case 'type':
          return {
            type: 'type',
            label: 'По типу',
            value: sortValues.type,
            width: "240px",
            content: (
              <SourceContent
                isDefault={typeDefault}
                onDefaultChange={setTypeDefault}
                options={typeFilterOptions}
              />
            ),
          };
        default:
          return {
            type: 'time',
            label: 'По времени',
            value: sortValues.time,
            items: timeOptions,
            width: "138px",
          };
      }
    });
  }, [selectedFilter, sortValues, sourceDefault, setSourceDefault, sourceFilterOptions, typeDefault, setTypeDefault, typeFilterOptions]);

  return {
    availableSortOptions,
    DEFAULT_VALUES,
  };
};
