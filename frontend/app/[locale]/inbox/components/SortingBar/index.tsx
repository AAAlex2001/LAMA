'use client';

import React, { FC, useState, useMemo, useRef, useEffect } from "react";
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
  const dispatch = useAppDispatch();
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<SortOptionType | null>(null);
  const filterButtonRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const channels = useAppSelector(selectChannels);
  const bots = useAppSelector(selectBots);

  const channelNames = channels.map((c) => c.title)
  const botNames = bots.map((b) => b.title || b.username);

  const defaultValues: Record<SortOptionType, string> = {
    time: "",
    source: "",
    sourceSystem: "",
    status: "default",
    type: "",
  };

  const [sortValues, setSortValues] = useState<Record<SortOptionType, string>>({
    time: defaultValues.time,
    source: defaultValues.source,
    sourceSystem: defaultValues.sourceSystem,
    status: defaultValues.status,
    type: defaultValues.type,
  });

  const [sourceDefault, setSourceDefault] = useState(true);
  const [sourceSystemDefault, setSourceSystemDefault] = useState(true);

  const [sourceChannels, setSourceChannels] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  const [sourceBots, setSourceBots] = useState(false);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());

  const handleSourceChannelsChange = (checked: boolean) => {
    setSourceChannels(checked);
    if (checked) {
      setSourceDefault(false);
      setSourceSystemDefault(false);
    } else {
      setSelectedChannels(new Set());
      if (!sourceBots) {
        setSourceDefault(true);
        setSourceSystemDefault(true);
      }
    }
  };

  const handleSourceBotsChange = (checked: boolean) => {
    setSourceBots(checked);
    if (checked) {
      setSourceDefault(false);
      setSourceSystemDefault(false);
    } else {
      setSelectedBots(new Set());
      if (!sourceChannels) {
        setSourceDefault(true);
        setSourceSystemDefault(true);
      }
    }
  };

  const [sourceSharedSearch, setSourceSharedSearch] = useState("");
  const [sourceSystemSharedSearch, setSourceSystemSharedSearch] = useState("");

  const filteredSourceChannels = !sourceSharedSearch ? channelNames : channelNames.filter(c => c.toLowerCase().includes(sourceSharedSearch.toLowerCase()));

  const filteredSourceBots = !sourceSharedSearch ? botNames : botNames.filter(b => b.toLowerCase().includes(sourceSharedSearch.toLowerCase()));

  const filteredSystemChannels = !sourceSystemSharedSearch ? channelNames : channelNames.filter(c => c.toLowerCase().includes(sourceSystemSharedSearch.toLowerCase()));

  const filteredSystemBots = !sourceSystemSharedSearch ? botNames : botNames.filter(b => b.toLowerCase().includes(sourceSystemSharedSearch.toLowerCase()));

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
  ];

  const sourceSystemFilterOptions: SourceFilterOption[] = [
    {
      key: "channels",
      label: "Каналы",
      checked: sourceChannels,
      onChange: handleSourceChannelsChange,
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
      onChange: handleSourceBotsChange,
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
  ];


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
  }, [selectedFilter, sortValues, sourceDefault, sourceFilterOptions, sourceSystemDefault, sourceSystemFilterOptions, typeDefault, typeFilterOptions]);

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
  };

  const handleSortClear = (sortType: SortOptionType) => {
    const defaultValue = defaultValues[sortType];
    setSortValues(prev => ({ ...prev, [sortType]: defaultValue }));
    
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

  const isDefaultValue = (sortType: SortOptionType, value: string): boolean => {
    return value === defaultValues[sortType];
  };

  function getButtonText(option: SortOption): string {
    if (!option.value) return option.label;
    if (isDefaultValue(option.type, option.value)) {
      return option.label;
    }
    if (option.items) {
      const selectedItem = option.items.find((item) => item.value === option.value);
      return selectedItem?.label || option.label;
    }
    return option.label;
  }

  function clearFilter(sortType: SortOptionType, e: React.MouseEvent) {
    e.stopPropagation();
    handleSortClear(sortType);
    
    if (sortType === 'source' || sortType === 'sourceSystem') {
      setSourceChannels(false);
      setSourceBots(false);
      setSelectedChannels(new Set());
      setSelectedBots(new Set());
      setSourceSharedSearch("");
      setSourceSystemSharedSearch("");
      setSourceDefault(true);
      setSourceSystemDefault(true);
      dispatch(setBotIds(null));
      dispatch(setChannelIds(null));
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
  }

  function toggleOption(option: SortOption, value: string) {
    handleSortChange(option.type, value);
    if (!option.content) {
      setOpenFilter(null);
    }
  }

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
    const isDefault = selectedFilter === 'system' ? sourceSystemDefault : sourceDefault;

    if (!isDefault) {
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
    }

    let searchValue: string | null = null;
    if (selectedFilter === 'system') {
      if (sourceSystemSharedSearch.trim()) {
        searchValue = sourceSystemSharedSearch.trim();
      }
    } else {
      if (sourceSharedSearch.trim()) {
        searchValue = sourceSharedSearch.trim();
      }
    }

    dispatch(setSearch(searchValue || null));
  };

  useEffect(() => {
    setSortValues({
      time: defaultValues.time,
      source: defaultValues.source,
      sourceSystem: defaultValues.sourceSystem,
      status: defaultValues.status,
      type: defaultValues.type,
    });
    setSourceDefault(true);
    setSourceSystemDefault(true);
    setSourceChannels(false);
    setSourceBots(false);
    setSelectedChannels(new Set());
    setSelectedBots(new Set());
    setSourceSharedSearch("");
    setSourceSystemSharedSearch("");
    setTypeDefault(true);
    setTypeAutoReply(false);
    setTypeTrigger(false);
    setTypeCommand(false);
    setSelectedTypeBots(new Set());
    setTypeSharedSearch("");
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

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!barRef.current?.contains(target)) {
        if (openFilter === 'source' || openFilter === 'sourceSystem') {
          applySourceFilters();
        }
        if (openFilter === 'type') {
          applyTypeFilters();
        }
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilter, applySourceFilters, applyTypeFilters]);

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
                let isActive = false;
                if (option.type === 'source') {
                  isActive = !sourceDefault && (selectedChannels.size > 0 || selectedBots.size > 0 || !!sourceSharedSearch);
                } else if (option.type === 'sourceSystem') {
                  isActive = !sourceSystemDefault && (selectedChannels.size > 0 || selectedBots.size > 0 || !!sourceSystemSharedSearch);
                } else if (option.type === 'type') {
                  isActive = !typeDefault && (selectedTypeBots.size > 0 || !!typeSharedSearch);
                } else {
                  isActive = !!option.value && !isDefaultValue(option.type, option.value);
                }
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
              onClose={() => {
                applySourceFilters();
                applyTypeFilters();
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
