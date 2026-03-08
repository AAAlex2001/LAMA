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

interface SortingBarProps {
  selectedFilter: ListHeaderType;
  setSelectedFilter: (filter: ListHeaderType) => void;
  currentView: "list" | "direct";
  setCurrentView: (view: "list" | "direct") => void;
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

const SortingBar: FC<SortingBarProps> = ({ selectedFilter, setSelectedFilter, currentView, setCurrentView, onTimeSortChange, onStatusFilterChange, onEventTypeFilterChange }) => {
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<SortOptionType | null>(null);
  const filterButtonRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const [sortValues, setSortValues] = useState<Record<SortOptionType, string>>({
    time: "",
    source: "",
    sourceSystem: "",
    status: "",
    type: "",
  });

  const [chatSortValues, setChatSortValues] = useState<Record<SortOptionType, string>>({
    time: "",
    source: "",
    sourceSystem: "",
    status: "",
    type: "",
  });

  const [sourceDefault, setSourceDefault] = useState(false);
  const [sourceSystemDefault, setSourceSystemDefault] = useState(false);
  const [sourceSystems, setSourceSystems] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<Set<string>>(new Set());
  const allSystems = ["System 1", "System 2", "System 3"];

  const [sourceChannels, setSourceChannels] = useState(true);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(["Lama Planner"]));
  const allChannels = ["Lama Planner", "Lama news", "Info guide", "Lama Support", "Llllllama Skii"];

  const [sourceChats, setSourceChats] = useState(true);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const allChats = ["Chat 1", "Chat 2", "Chat 3"];

  const [sourceBots, setSourceBots] = useState(false);

  const [sourceSharedSearch, setSourceSharedSearch] = useState("");

  const [sourceSystemSharedSearch, setSourceSystemSharedSearch] = useState("");

  const filteredSourceChannels = useMemo(() => {
    if (!sourceSharedSearch) return allChannels;
    return allChannels.filter(c => c.toLowerCase().includes(sourceSharedSearch.toLowerCase()));
  }, [sourceSharedSearch]);

  const filteredSourceChats = useMemo(() => {
    if (!sourceSharedSearch) return allChats;
    return allChats.filter(c => c.toLowerCase().includes(sourceSharedSearch.toLowerCase()));
  }, [sourceSharedSearch]);

  const filteredSystems = useMemo(() => {
    if (!sourceSystemSharedSearch) return allSystems;
    return allSystems.filter(s => s.toLowerCase().includes(sourceSystemSharedSearch.toLowerCase()));
  }, [sourceSystemSharedSearch]);

  const filteredSystemChannels = useMemo(() => {
    if (!sourceSystemSharedSearch) return allChannels;
    return allChannels.filter(c => c.toLowerCase().includes(sourceSystemSharedSearch.toLowerCase()));
  }, [sourceSystemSharedSearch]);

  const filteredSystemChats = useMemo(() => {
    if (!sourceSystemSharedSearch) return allChats;
    return allChats.filter(c => c.toLowerCase().includes(sourceSystemSharedSearch.toLowerCase()));
  }, [sourceSystemSharedSearch]);

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
      key: "chats",
      label: "Чаты",
      checked: sourceChats,
      onChange: setSourceChats,
      list: {
        searchPlaceholder: "Введите название чата",
        searchValue: sourceSharedSearch,
        isSharedSearch: true,
        onSearchChange: setSourceSharedSearch,
        items: filteredSourceChats,
        selectedItems: selectedChats,
        onItemToggle: toggleSetItem(setSelectedChats),
      },
    },
    {
      key: "bots",
      label: "Боты",
      checked: sourceBots,
      onChange: setSourceBots,
    },
  ], [sourceChannels, sourceSharedSearch, filteredSourceChannels, selectedChannels, sourceChats, filteredSourceChats, selectedChats, sourceBots]);

  const sourceSystemFilterOptions: SourceFilterOption[] = useMemo(() => [
    {
      key: "systems",
      label: "Системы",
      checked: sourceSystems,
      onChange: setSourceSystems,
      list: {
        searchPlaceholder: "Введите название системы",
        searchValue: sourceSystemSharedSearch,
        isSharedSearch: true,
        onSearchChange: setSourceSystemSharedSearch,
        items: filteredSystems,
        selectedItems: selectedSystems,
        onItemToggle: toggleSetItem(setSelectedSystems),
      },
    },
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
      key: "chats",
      label: "Чаты",
      checked: sourceChats,
      onChange: setSourceChats,
      list: {
        searchPlaceholder: "Введите название чата",
        searchValue: sourceSystemSharedSearch,
        isSharedSearch: true,
        onSearchChange: setSourceSystemSharedSearch,
        items: filteredSystemChats,
        selectedItems: selectedChats,
        onItemToggle: toggleSetItem(setSelectedChats),
      },
    },
    {
      key: "bots",
      label: "Боты",
      checked: sourceBots,
      onChange: setSourceBots,
    },
  ], [sourceSystems, sourceSystemSharedSearch, filteredSystems, selectedSystems, sourceChannels, filteredSystemChannels, selectedChannels, sourceChats, filteredSystemChats, selectedChats, sourceBots]);

  const [typeDefault, setTypeDefault] = useState(false);

  const [typeBot, setTypeBot] = useState(false);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());
  const allBots = ["Bot 1", "Bot 2", "Bot 3"];

  const [typeChannel, setTypeChannel] = useState(false);
  const [selectedTypeChannels, setSelectedTypeChannels] = useState<Set<string>>(new Set());
  const allTypeChannels = ["Type Channel 1", "Type Channel 2", "Type Channel 3"];

  const [typeSystem, setTypeSystem] = useState(false);
  const [selectedTypeSystems, setSelectedTypeSystems] = useState<Set<string>>(new Set());
  const allTypeSystems = ["Type System 1", "Type System 2", "Type System 3"];

  const [typeSharedSearch, setTypeSharedSearch] = useState("");

  const filteredBots = useMemo(() => {
    if (!typeSharedSearch) return allBots;
    return allBots.filter(b => b.toLowerCase().includes(typeSharedSearch.toLowerCase()));
  }, [typeSharedSearch]);

  const filteredTypeChannels = useMemo(() => {
    if (!typeSharedSearch) return allTypeChannels;
    return allTypeChannels.filter(c => c.toLowerCase().includes(typeSharedSearch.toLowerCase()));
  }, [typeSharedSearch]);

  const filteredTypeSystems = useMemo(() => {
    if (!typeSharedSearch) return allTypeSystems;
    return allTypeSystems.filter(s => s.toLowerCase().includes(typeSharedSearch.toLowerCase()));
  }, [typeSharedSearch]);

  const typeFilterOptions: SourceFilterOption[] = useMemo(() => [
    {
      key: "autoresponder",
      label: "Автоответ",
      checked: typeBot,
      onChange: setTypeBot,
      list: {
        searchPlaceholder: "Введите название автоответа",
        searchValue: typeSharedSearch,
        onSearchChange: setTypeSharedSearch,
        items: filteredBots,
        selectedItems: selectedBots,
        onItemToggle: toggleSetItem(setSelectedBots),
        isSharedSearch: true,
      },
    },
    {
      key: "trigger",
      label: "Триггер",
      checked: typeChannel,
      onChange: setTypeChannel,
      list: {
        searchPlaceholder: "Введите название триггера",
        searchValue: typeSharedSearch,
        isSharedSearch: true,
        onSearchChange: setTypeSharedSearch,
        items: filteredTypeChannels,
        selectedItems: selectedTypeChannels,
        onItemToggle: toggleSetItem(setSelectedTypeChannels),
      },
    },
    {
      key: "command",
      label: "Личная команда",
      checked: typeSystem,
      onChange: setTypeSystem,
      list: {
        searchPlaceholder: "Введите название команды",
        searchValue: typeSharedSearch,
        onSearchChange: setTypeSharedSearch,
        items: filteredTypeSystems,
        selectedItems: selectedTypeSystems,
        onItemToggle: toggleSetItem(setSelectedTypeSystems),
        isSharedSearch: true,
      },
    },
  ], [typeBot, typeSharedSearch, filteredBots, selectedBots, typeChannel, filteredTypeChannels, selectedTypeChannels, typeSystem, filteredTypeSystems, selectedTypeSystems]);

  const timeOptions = [
    { value: "newest", label: "Сначала новые" },
    { value: "oldest", label: "Сначала старые" },
  ];

  const statusOptions = [
    { value: "default", label: "По умолчанию" },
    { value: "new", label: "Новые" },
    { value: "processed", label: "Обработанные" },
  ];

  const chatStatusOptions = [
    { value: "all", label: "Все" },
    { value: "unread", label: "Непрочитанные" },
    { value: "read", label: "Прочитанные" },
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
    if (currentView === "direct") {
      return [
        {
          type: 'time' as SortOptionType,
          label: 'По активности',
          value: chatSortValues.time,
          items: timeOptions,
          width: "138px",
        },
        {
          type: 'status' as SortOptionType,
          label: 'По статусу',
          value: chatSortValues.status,
          items: chatStatusOptions,
          width: "138px",
        },
      ];
    }

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
  }, [selectedFilter, sortValues, chatSortValues, currentView, sourceDefault, sourceFilterOptions, typeDefault, typeOptions]);

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

  const handleChatSortChange = (sortType: SortOptionType, value: string) => {
    setChatSortValues(prev => ({ ...prev, [sortType]: value }));
  };

  const handleChatSortClear = (sortType: SortOptionType) => {
    setChatSortValues(prev => ({ ...prev, [sortType]: "" }));
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
    if (currentView === "direct") {
      handleChatSortClear(sortType);
    } else {
      handleSortClear(sortType);
    }
    setOpenFilter(null);
  }

  function toggleOption(option: SortOption, value: string) {
    if (currentView === "direct") {
      handleChatSortChange(option.type, value);
    } else {
      handleSortChange(option.type, value);
    }
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

  if (currentView === "direct") {
    return (
      <>
        <DesktopWrapper>
          <div className={styles.sortingBar} ref={barRef}>
            <Button
              onClick={() => setCurrentView("list")}
              variant="fill"
              intent="gradient"
              size="lg"
              style={{ width: '100px' }}
            >
              Инбокс
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
                        <div className={styles.sortMenu} style={option.width ? { width: typeof option.width === 'number' ? `${option.width}px` : option.width, minWidth: typeof option.width === 'number' ? `${option.width}px` : option.width } : undefined}>
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
          </div>
        </DesktopWrapper>
        <MobileWrapper className={styles.mobileWrapper}>
          <Button
            onClick={() => setCurrentView("list")}
            variant="fill"
            intent="gradient"
            size="lg"
            style={{ width: '100%' }}
          >
            Инбокс
          </Button>
          <div ref={filterButtonRef} style={{ position: 'relative' }}>
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
              onSortChange={handleChatSortChange}
              onSortClear={handleChatSortClear}
            />
          </div>
        </MobileWrapper>
      </>
    );
  }

  return (
    <>
      <DesktopWrapper>
        <div className={styles.sortingBar} ref={barRef}>
          <Button
            onClick={() => setCurrentView("direct")}
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
            onClick={() => setCurrentView("direct")}
            variant="fill"
            intent="gradient"
            style={{ width: '100%' }}
            size="lg"
          >
            Директ
          </Button>
          <div ref={filterButtonRef} style={{ position: 'relative' }}>
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

export default SortingBar;