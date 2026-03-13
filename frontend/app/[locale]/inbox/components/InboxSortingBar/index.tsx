'use client';

import { FC, useState, useRef, useEffect } from "react";
import clsx from "clsx";
import FilterTabs from "@/components/filter-tabs/filter-tabs";
import { MobileWrapper, DesktopWrapper } from "@/components/responsive-wrappers";
import styles from "./styles.module.scss";
import { ListHeaderType } from "../InboxList/components/ListHeader";
import { FilterSortIcon, ChevronDownIcon, SortClearIcon } from "@/components/icons";
import { Button } from "@/components/new-button";
import SourceContent, { SourceFilterOption } from "./components/SourceComponent";
import PopupFilter from "./components/PopupFilter";
import { useAppSelector, useAppDispatch } from "../../store";
import { selectChannels, selectBots } from "../../store/selectors";
import { setBotIds, setChannelIds, setSystem, setTypeAutoReplies, setTypeTriggers, setTypeCommands, setSearch } from "../../store";
import type { SortOptionType, SortOption } from "../sortTypes";

const DEFAULT_VALUES: Record<SortOptionType, string> = {
  time: "",
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

const filterOptions = [
  { id: "all", label: "Все" },
  { id: "moderation", label: "Модерация" },
  { id: "system", label: "Системные" },
  { id: "automation", label: "Автоматизация" },
];

const toggleSetItem = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (item: string) => {
  setter((prev) => {
    const next = new Set(prev);
    next.has(item) ? next.delete(item) : next.add(item);
    return next;
  });
};

const isDefaultValue = (sortType: SortOptionType, value: string): boolean => {
  return value === DEFAULT_VALUES[sortType];
};

const getButtonText = (option: SortOption): string => {
  if (!option.value || isDefaultValue(option.type, option.value)) return option.label;
  if (option.items) {
    const selectedItem = option.items.find((item) => item.value === option.value);
    return selectedItem?.label || option.label;
  }
  return option.label;
};

interface InboxSortingBarProps {
  selectedFilter: ListHeaderType;
  setSelectedFilter: (filter: ListHeaderType) => void;
  onNavigateToOtherView: () => void;
  onTimeSortChange?: (sort: 'new' | 'old') => void;
  onStatusFilterChange?: (status: 'new' | 'processed' | 'banned' | null) => void;
  onEventTypeFilterChange?: (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => void;
}

const InboxSortingBar: FC<InboxSortingBarProps> = ({
  selectedFilter,
  setSelectedFilter,
  onNavigateToOtherView,
  onTimeSortChange,
  onStatusFilterChange,
  onEventTypeFilterChange,
}) => {
  const dispatch = useAppDispatch();
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<SortOptionType | null>(null);
  const filterButtonRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const channels = useAppSelector(selectChannels);
  const bots = useAppSelector(selectBots);

  const channelNames = channels.map((c) => c.title);
  const botNames = bots.map((b) => b.title || b.username);

  const [sortValues, setSortValues] = useState<Record<SortOptionType, string>>({ ...DEFAULT_VALUES });

  const [systemChecked, setSystemChecked] = useState<boolean | null>(null);

  const [sourceDefault, setSourceDefault] = useState(true);

  const [sourceChannels, setSourceChannels] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  const [sourceBots, setSourceBots] = useState(false);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());

  const handleSourceChannelsChange = (checked: boolean) => {
    setSourceChannels(checked);
    if (checked) {
      setSourceDefault(false);
    } else {
      setSelectedChannels(new Set());
      if (!sourceBots) {
        setSourceDefault(true);
      }
    }
  };

  const handleSourceBotsChange = (checked: boolean) => {
    setSourceBots(checked);
    if (checked) {
      setSourceDefault(false);
    } else {
      setSelectedBots(new Set());
      if (!sourceChannels) {
        setSourceDefault(true);
      }
    }
  };

  const [sourceSharedSearch, setSourceSharedSearch] = useState("");

  const filteredSourceChannels = !sourceSharedSearch ? channelNames : channelNames.filter(c => c.toLowerCase().includes(sourceSharedSearch.toLowerCase()));
  const filteredSourceBots = !sourceSharedSearch ? botNames : botNames.filter(b => b.toLowerCase().includes(sourceSharedSearch.toLowerCase()));

  const [typeDefault, setTypeDefault] = useState(true);
  const [typeAutoReply, setTypeAutoReply] = useState(false);
  const [typeTrigger, setTypeTrigger] = useState(false);
  const [typeCommand, setTypeCommand] = useState(false);
  const [selectedTypeBots, setSelectedTypeBots] = useState<Set<string>>(new Set());
  const [typeSharedSearch, setTypeSharedSearch] = useState("");

  const handleTypeAutoReplyChange = (checked: boolean) => {
    setTypeAutoReply(checked);
    if (checked) {
      setTypeDefault(false);
    } else {
      if (!typeTrigger && !typeCommand) {
        setTypeDefault(true);
        setSelectedTypeBots(new Set());
      }
    }
  };

  const handleTypeTriggerChange = (checked: boolean) => {
    setTypeTrigger(checked);
    if (checked) {
      setTypeDefault(false);
    } else {
      if (!typeAutoReply && !typeCommand) {
        setTypeDefault(true);
        setSelectedTypeBots(new Set());
      }
    }
  };

  const handleTypeCommandChange = (checked: boolean) => {
    setTypeCommand(checked);
    if (checked) {
      setTypeDefault(false);
    } else {
      if (!typeAutoReply && !typeTrigger) {
        setTypeDefault(true);
        setSelectedTypeBots(new Set());
      }
    }
  };

  const filteredTypeBots = !typeSharedSearch ? botNames : botNames.filter(b => b.toLowerCase().includes(typeSharedSearch.toLowerCase()));

  const typeFilterOptions: SourceFilterOption[] = [
    {
      key: "autoreply",
      label: "Автоответы",
      checked: typeAutoReply,
      onChange: handleTypeAutoReplyChange,
      list: {
        searchPlaceholder: "Введите название бота",
        searchValue: typeSharedSearch,
        isSharedSearch: true,
        onSearchChange: setTypeSharedSearch,
        items: filteredTypeBots,
        selectedItems: selectedTypeBots,
        onItemToggle: toggleSetItem(setSelectedTypeBots),
      },
    },
    {
      key: "trigger",
      label: "Триггер",
      checked: typeTrigger,
      onChange: handleTypeTriggerChange,
      list: {
        searchPlaceholder: "Введите название бота",
        searchValue: typeSharedSearch,
        isSharedSearch: true,
        onSearchChange: setTypeSharedSearch,
        items: filteredTypeBots,
        selectedItems: selectedTypeBots,
        onItemToggle: toggleSetItem(setSelectedTypeBots),
      },
    },
    {
      key: "command",
      label: "Команды",
      checked: typeCommand,
      onChange: handleTypeCommandChange,
      list: {
        searchPlaceholder: "Введите название бота",
        searchValue: typeSharedSearch,
        isSharedSearch: true,
        onSearchChange: setTypeSharedSearch,
        items: filteredTypeBots,
        selectedItems: selectedTypeBots,
        onItemToggle: toggleSetItem(setSelectedTypeBots),
      },
    },
  ];

  const sourceFilterOptions: SourceFilterOption[] = [
    {
      key: "channels",
      label: "Каналы",
      checked: sourceChannels,
      onChange: handleSourceChannelsChange,
      list: {
        searchPlaceholder: "Введите название канала",
        searchValue: sourceSharedSearch,
        isSharedSearch: true,
        onSearchChange: setSourceSharedSearch,
        items: filteredSourceChannels,
        selectedItems: selectedChannels,
        onItemToggle: toggleSetItem(setSelectedChannels),
      },
    },
    {
      key: "bots",
      label: "Боты",
      checked: sourceBots,
      onChange: handleSourceBotsChange,
      list: {
        searchPlaceholder: "Введите название бота",
        searchValue: sourceSharedSearch,
        isSharedSearch: true,
        onSearchChange: setSourceSharedSearch,
        items: filteredSourceBots,
        selectedItems: selectedBots,
        onItemToggle: toggleSetItem(setSelectedBots),
      },
    },
    {
      key: "systems",
      label: "Системные",
      checked: !!systemChecked,
      onChange: setSystemChecked,
    }
  ];

  const availableSortOptions = (() => {
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
            content: (
              <SourceContent
                isDefault={sourceDefault}
                onDefaultChange={setSourceDefault}
                options={sourceFilterOptions}
              />
            ),
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
  })();

  const handleSortChange = (sortType: SortOptionType, value: string) => {
    setSortValues(prev => ({ ...prev, [sortType]: value }));
    if (sortType === 'time') {
      onTimeSortChange?.(value === 'oldest' ? 'old' : 'new');
    }
    if (sortType === 'status') {
      const statusMap: Record<string, 'new' | 'processed' | null> = {
        new: 'new',
        processed: 'processed',
        default: null,
      };
      onStatusFilterChange?.(statusMap[value] ?? null);
    }
  };

  const handleSortClear = (sortType: SortOptionType) => {
    setSortValues(prev => ({ ...prev, [sortType]: DEFAULT_VALUES[sortType] }));

    if (sortType === 'time') {
      onTimeSortChange?.('new');
    }
    if (sortType === 'status') {
      onStatusFilterChange?.(null);
    }
    if (sortType === 'type') {
      onEventTypeFilterChange?.(null);
      dispatch(setBotIds(null));
      dispatch(setTypeAutoReplies(null));
      dispatch(setTypeTriggers(null));
      dispatch(setTypeCommands(null));
    }
  };

  const clearFilter = (sortType: SortOptionType, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSortClear(sortType);

    if (sortType === 'source') {
      setSourceChannels(false);
      setSourceBots(false);
      setSelectedChannels(new Set());
      setSelectedBots(new Set());
      setSourceSharedSearch("");
      setSourceDefault(true);
      dispatch(setBotIds(null));
      dispatch(setChannelIds(null));
      dispatch(setSystem(null));
      dispatch(setSearch(null));
    }

    if (sortType === 'type') {
      setTypeAutoReply(false);
      setTypeTrigger(false);
      setTypeCommand(false);
      setSelectedTypeBots(new Set());
      setTypeSharedSearch("");
      setTypeDefault(true);
      dispatch(setBotIds(null));
      dispatch(setTypeAutoReplies(null));
      dispatch(setTypeTriggers(null));
      dispatch(setTypeCommands(null));
    }
    setOpenFilter(null);
  };

  const toggleOption = (option: SortOption, value: string) => {
    handleSortChange(option.type, value);
    if (!option.content) {
      setOpenFilter(null);
    }
  };

  const applyTypeFilters = () => {
    if (!typeDefault) {
      dispatch(setTypeAutoReplies(typeAutoReply ? true : null));
      dispatch(setTypeTriggers(typeTrigger ? true : null));
      dispatch(setTypeCommands(typeCommand ? true : null));

      if (selectedTypeBots.size > 0) {
        const filteredBotIds = bots
          .filter(b => selectedTypeBots.has(b.title || b.username))
          .map(b => b.id);
        dispatch(setBotIds(filteredBotIds.length > 0 ? filteredBotIds : null));
      } else {
        dispatch(setBotIds(null));
      }
    } else {
      dispatch(setTypeAutoReplies(null));
      dispatch(setTypeTriggers(null));
      dispatch(setTypeCommands(null));
      dispatch(setBotIds(null));
    }

    dispatch(setSearch(typeSharedSearch.trim() || null));
  };

  const applySourceFilters = () => {
    if (!sourceDefault) {
      dispatch(setSystem(systemChecked ? true : null));

      if (selectedChannels.size > 0) {
        const filteredChannelIds = channels
          .filter(c => selectedChannels.has(c.title))
          .map(c => c.id);
        dispatch(setChannelIds(filteredChannelIds.length > 0 ? filteredChannelIds : null));
      } else {
        dispatch(setChannelIds(null));
      }

      if (selectedBots.size > 0) {
        const filteredBotIds = bots
          .filter(b => selectedBots.has(b.title || b.username))
          .map(b => b.id);
        dispatch(setBotIds(filteredBotIds.length > 0 ? filteredBotIds : null));
      } else {
        dispatch(setBotIds(null));
      }

    } else {
      dispatch(setBotIds(null));
      dispatch(setChannelIds(null));
      dispatch(setSystem(null));
    }

    const searchValue: string | null = sourceSharedSearch.trim() || null;
    dispatch(setSearch(searchValue));
  };

  useEffect(() => {
    setSortValues({ ...DEFAULT_VALUES });
    setSourceDefault(true);
    setSourceChannels(false);
    setSourceBots(false);
    setSelectedChannels(new Set());
    setSelectedBots(new Set());
    setSourceSharedSearch("");
    setTypeDefault(true);
    setTypeAutoReply(false);
    setTypeTrigger(false);
    setTypeCommand(false);
    setSelectedTypeBots(new Set());
    setTypeSharedSearch("");
    setSystemChecked(false);
    setOpenFilter(null);
    dispatch(setBotIds(null));
    dispatch(setChannelIds(null));
    dispatch(setSystem(null));
    dispatch(setTypeAutoReplies(null));
    dispatch(setTypeTriggers(null));
    dispatch(setTypeCommands(null));
    dispatch(setSearch(null));
    onTimeSortChange?.('new');
    onStatusFilterChange?.(null);
    onEventTypeFilterChange?.(null);
  }, [selectedFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!barRef.current?.contains(target)) {
        if (openFilter === 'source') {
          applySourceFilters();
        }
        if (openFilter === 'type') {
          applyTypeFilters();
        }
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilter, applySourceFilters, applyTypeFilters]);

  return (
    <>
      <DesktopWrapper>
        <div className={styles.sortingBar} ref={barRef}>
          <Button
            onClick={onNavigateToOtherView}
            variant="fill"
            size="lg"
            intent="gradient"
            style={{ width: '100px', minWidth: '100px' }}
          >
            Директ
          </Button>
          <div className={styles.sortBarDesktop}>
            <span className={styles.sortLabel}>Сортировка:</span>
            <div className={styles.sortGroup}>
              {availableSortOptions.map((option) => {
                let isActive = false;
                if (option.type === 'source') {
                  isActive = !sourceDefault;
                } else if (option.type === 'type') {
                  isActive = !typeDefault;
                } else {
                  isActive = !!option.value && !isDefaultValue(option.type, option.value);
                }
                const isOpen = openFilter === option.type;

                return (
                  <div key={option.type} className={styles.sortDropdown}>
                    <button
                      type="button"
                      className={clsx(styles.sortButton, isActive && styles.sortButtonActive)}
                      onClick={() => {
                        if (openFilter === 'source') {
                          applySourceFilters();
                        }
                        if (openFilter === 'type') {
                          applyTypeFilters();
                        }
                        setOpenFilter(isOpen ? null : option.type);
                      }}
                      aria-expanded={isOpen}
                      aria-haspopup="listbox"
                    >
                      <span className={styles.sortButtonText}>{getButtonText(option)}</span>
                      <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
                      {isActive && (
                        <span className={styles.sortClear} onClick={(event) => clearFilter(option.type, event)}>
                          <SortClearIcon />
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className={styles.sortMenu} role="listbox">
                        {option.items ? (
                          option.items.map((item) => {
                            const checked = option.value === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                className={styles.sortOption}
                                role="option"
                                aria-selected={checked}
                                onClick={() => toggleOption(option, item.value)}
                              >
                                <span
                                  className={clsx(styles.sortRadio, checked && styles.sortRadioActive)}
                                >
                                  <span className={styles.sortRadioDot} />
                                </span>
                                <span className={styles.sortOptionText}>{item.label}</span>
                              </button>
                            );
                          })
                        ) : option.content ? (
                          <div className={styles.sortMenuContent}>
                            {option.content}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <FilterTabs
            options={filterOptions}
            selectedFilter={selectedFilter}
            onFilterChange={(filterId) => setSelectedFilter(filterId as ListHeaderType)}
            className={styles.filterControls}
          />
        </div>
      </DesktopWrapper>
      <MobileWrapper className={styles.mobileWrapperTabs}>
        <FilterTabs
          options={filterOptions}
          selectedFilter={selectedFilter}
          onFilterChange={(filterId) => setSelectedFilter(filterId as ListHeaderType)}
          className={styles.filterControls}
        />
        <div className={styles.mobileWrapper}>
          <Button
            onClick={onNavigateToOtherView}
            variant="fill"
            intent="gradient"
            style={{ width: '100%' }}
            size="lg"
          >
            Директ
          </Button>
          <div ref={filterButtonRef} className={styles.filterButton}>
            <Button
              onClick={() => setIsFilterPopupOpen(!isFilterPopupOpen)}
              variant="ghost"
              intent="neutral"
              size="transparent"
            >
              <FilterSortIcon width={24} height={24} />
            </Button>
            <PopupFilter
              isOpen={isFilterPopupOpen}
              onClose={() => {
                const sortTypes = filterSortConfig[selectedFilter];
                if (sortTypes.includes('source')) {
                  applySourceFilters();
                }
                if (sortTypes.includes('type')) {
                  applyTypeFilters();
                }
                setIsFilterPopupOpen(false);
              }}
              triggerRef={filterButtonRef}
              availableSortOptions={availableSortOptions}
              onSortChange={handleSortChange}
              onSortClear={handleSortClear}
            />
          </div>
        </div>
      </MobileWrapper>
    </>
  );
};

export default InboxSortingBar;
