'use client';

import React, { FC, useState, useMemo, useRef } from "react";
import FilterTabs from "@/components/filter-tabs/filter-tabs";
import { MobileWrapper, DesktopWrapper } from "@/components/responsive-wrappers";
import styles from "./styles.module.scss";
import { ListHeaderType } from "../InboxList/components/ListHeader";
import { FilterSortIcon, ChevronDownIcon, SortClearIcon } from "@/components/icons";
import { Button } from "@/components/new-button";
import SourceContent, { SourceFilterOption } from "./components/SourceComponent";
import PopupFilter from "./components/PopupFilter";
import { useAppSelector } from "../../store";
import { selectChannels, selectBots } from "../../store/selectors";

interface InboxSortingBarProps {
  selectedFilter: ListHeaderType;
  setSelectedFilter: (filter: ListHeaderType) => void;
  onNavigateToOtherView: () => void;
  onTimeSortChange?: (sort: 'new' | 'old') => void;
  onStatusFilterChange?: (status: 'new' | 'processed' | 'ignored' | null) => void;
  onEventTypeFilterChange?: (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => void;
}

type SortOptionType = 'time' | 'source' | 'sourceSystem' | 'status' | 'type';

interface SortOption {
  type: SortOptionType;
  label: string;
  value: string;
  items?: Array<{ value: string; label: string }>;
  width?: string | number;
  content?: React.ReactNode;
}

const toggleSetItem = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (item: string) => {
  setter((prev) => {
    const next = new Set(prev);
    next.has(item) ? next.delete(item) : next.add(item);
    return next;
  });
};

const InboxSortingBar: FC<InboxSortingBarProps> = ({
  selectedFilter,
  setSelectedFilter,
  onNavigateToOtherView,
  onTimeSortChange,
  onStatusFilterChange,
  onEventTypeFilterChange,
}) => {
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<SortOptionType | null>(null);
  const filterButtonRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const channels = useAppSelector(selectChannels);
  const bots = useAppSelector(selectBots);

  const channelNames = useMemo(() => channels.map((c) => c.title), [channels]);
  const botNames = useMemo(() => bots.map((b) => b.title || b.username), [bots]);

  const [sortValues, setSortValues] = useState<Record<SortOptionType, string>>({
    time: "",
    source: "",
    sourceSystem: "",
    status: "",
    type: "",
  });

  const [sourceDefault, setSourceDefault] = useState(false);
  const [sourceSystemDefault, setSourceSystemDefault] = useState(false);

  const [sourceChannels, setSourceChannels] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  const [sourceBots, setSourceBots] = useState(false);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());

  const [sourceSharedSearch, setSourceSharedSearch] = useState("");
  const [sourceSystemSharedSearch, setSourceSystemSharedSearch] = useState("");

  const filteredSourceChannels = useMemo(() => {
    if (!sourceSharedSearch) return channelNames;
    return channelNames.filter(c => c.toLowerCase().includes(sourceSharedSearch.toLowerCase()));
  }, [sourceSharedSearch, channelNames]);

  const filteredSourceBots = useMemo(() => {
    if (!sourceSharedSearch) return botNames;
    return botNames.filter(b => b.toLowerCase().includes(sourceSharedSearch.toLowerCase()));
  }, [sourceSharedSearch, botNames]);

  const filteredSystemChannels = useMemo(() => {
    if (!sourceSystemSharedSearch) return channelNames;
    return channelNames.filter(c => c.toLowerCase().includes(sourceSystemSharedSearch.toLowerCase()));
  }, [sourceSystemSharedSearch, channelNames]);

  const filteredSystemBots = useMemo(() => {
    if (!sourceSystemSharedSearch) return botNames;
    return botNames.filter(b => b.toLowerCase().includes(sourceSystemSharedSearch.toLowerCase()));
  }, [sourceSystemSharedSearch, botNames]);

  const sourceFilterOptions: SourceFilterOption[] = useMemo(() => [
    {
      key: "channels",
      label: "Каналы",
      checked: sourceChannels,
      onChange: setSourceChannels,
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
      onChange: setSourceBots,
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
  ], [sourceChannels, sourceSharedSearch, filteredSourceChannels, selectedChannels, sourceBots, filteredSourceBots, selectedBots]);

  const sourceSystemFilterOptions: SourceFilterOption[] = useMemo(() => [
    {
      key: "channels",
      label: "Каналы",
      checked: sourceChannels,
      onChange: setSourceChannels,
      list: {
        searchPlaceholder: "Введите название канала",
        searchValue: sourceSystemSharedSearch,
        isSharedSearch: true,
        onSearchChange: setSourceSystemSharedSearch,
        items: filteredSystemChannels,
        selectedItems: selectedChannels,
        onItemToggle: toggleSetItem(setSelectedChannels),
      },
    },
    {
      key: "bots",
      label: "Боты",
      checked: sourceBots,
      onChange: setSourceBots,
      list: {
        searchPlaceholder: "Введите название бота",
        searchValue: sourceSystemSharedSearch,
        isSharedSearch: true,
        onSearchChange: setSourceSystemSharedSearch,
        items: filteredSystemBots,
        selectedItems: selectedBots,
        onItemToggle: toggleSetItem(setSelectedBots),
      },
    },
  ], [sourceChannels, sourceSystemSharedSearch, filteredSystemChannels, selectedChannels, sourceBots, filteredSystemBots, selectedBots]);

  const [typeDefault, setTypeDefault] = useState(false);

  const [typeAutoReply, setTypeAutoReply] = useState(false);
  const [selectedAutoReplies, setSelectedAutoReplies] = useState<Set<string>>(new Set());

  const [typeTrigger, setTypeTrigger] = useState(false);
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(new Set());

  const [typeCommand, setTypeCommand] = useState(false);
  const [selectedCommands, setSelectedCommands] = useState<Set<string>>(new Set());

  const [typeSharedSearch, setTypeSharedSearch] = useState("");

  const timeOptions = [
    { value: "newest", label: "Сначала новые" },
    { value: "oldest", label: "Сначала старые" },
  ];

  const statusOptions = [
    { value: "default", label: "По умолчанию" },
    { value: "new", label: "Новые" },
    { value: "processed", label: "Обработанные" },
  ];

  const typeOptions = [
    { value: "all", label: "Все" },
    { value: "system_autoreply", label: "Автоответ" },
    { value: "system_trigger", label: "Триггер" },
    { value: "bot_command", label: "Команды" },
  ];

  const filterSortConfig: Record<ListHeaderType, SortOptionType[]> = {
    all: ['time', 'source', 'status'],
    moderation: ['time', 'source'],
    system: ['time', 'sourceSystem'],
    automation: ['time', 'type'],
  };

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
            content: (
              <SourceContent
                isDefault={sourceDefault}
                onDefaultChange={setSourceDefault}
                options={sourceFilterOptions}
              />
            ),
          };
        case 'sourceSystem':
          return {
            type: 'sourceSystem',
            label: 'По системе',
            value: sortValues.sourceSystem,
            width: "240px",
            content: (
              <SourceContent
                isDefault={sourceSystemDefault}
                onDefaultChange={setSourceSystemDefault}
                options={sourceSystemFilterOptions}
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
            items: typeOptions,
            width: "138px",
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
  }, [selectedFilter, sortValues, sourceDefault, sourceFilterOptions, sourceSystemDefault, sourceSystemFilterOptions]);

  const handleSortChange = (sortType: SortOptionType, value: string) => {
    setSortValues(prev => ({ ...prev, [sortType]: value }));
    if (sortType === 'time') {
      const dir = value === 'oldest' ? 'old' : 'new';
      onTimeSortChange?.(dir);
    }
    if (sortType === 'status') {
      const statusMap: Record<string, 'new' | 'processed' | null> = {
        'new': 'new',
        'processed': 'processed',
        'default': null,
      };
      onStatusFilterChange?.(statusMap[value] ?? null);
    }
    if (sortType === 'type') {
      const typeMap: Record<string, 'system_autoreply' | 'system_trigger' | 'bot_command' | null> = {
        'system_autoreply': 'system_autoreply',
        'system_trigger': 'system_trigger',
        'bot_command': 'bot_command',
        'all': null,
      };
      onEventTypeFilterChange?.(typeMap[value] ?? null);
    }
  };

  const handleSortClear = (sortType: SortOptionType) => {
    setSortValues(prev => ({ ...prev, [sortType]: "" }));
    if (sortType === 'time') {
      onTimeSortChange?.('new');
    }
    if (sortType === 'status') {
      onStatusFilterChange?.(null);
    }
    if (sortType === 'type') {
      onEventTypeFilterChange?.(null);
    }
  };

  function getButtonText(option: SortOption): string {
    if (!option.value) return option.label;
    if (option.items) {
      const selectedItem = option.items.find((item) => item.value === option.value);
      return selectedItem?.label || option.label;
    }
    return option.label;
  }

  function clearFilter(sortType: SortOptionType, e: React.MouseEvent) {
    e.stopPropagation();
    handleSortClear(sortType);
    setOpenFilter(null);
  }

  function toggleOption(option: SortOption, value: string) {
    handleSortChange(option.type, value);
    if (!option.content) {
      setOpenFilter(null);
    }
  }

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!barRef.current?.contains(target)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterOptions = [
    { id: "all", label: "Все" },
    { id: "moderation", label: "Модерация" },
    { id: "system", label: "Системные" },
    { id: "automation", label: "Автоматизация" },
  ];

  return (
    <>
      <DesktopWrapper>
        <div className={styles.sortingBar} ref={barRef}>
          <Button
            onClick={() => onNavigateToOtherView()}
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
                const isActive = !!option.value;
                const isOpen = openFilter === option.type;

                return (
                  <div key={option.type} className={styles.sortDropdown}>
                    <button
                      type="button"
                      className={isActive ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
                      onClick={() => setOpenFilter(isOpen ? null : option.type)}
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
                      <div className={styles.sortMenu}>
                        {option.items ? (
                          option.items.map((item) => {
                            const checked = option.value === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                className={styles.sortOption}
                                onClick={() => toggleOption(option, item.value)}
                              >
                                <span
                                  className={
                                    checked
                                      ? `${styles.sortRadio} ${styles.sortRadioActive}`
                                      : styles.sortRadio
                                  }
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
            onClick={() => onNavigateToOtherView()}
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
              onClose={() => setIsFilterPopupOpen(false)}
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
