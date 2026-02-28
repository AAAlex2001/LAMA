'use client';

import { FC, useState, useMemo } from "react";
import SimpleDropdown from "@/components/simple-dropdown/simple-dropdown";
import FilterTabs from "@/components/filter-tabs/filter-tabs";
import { MobileWrapper, DesktopWrapper } from "@/components/responsive-wrappers";
import styles from "./styles.module.scss";
import { ListHeaderType } from "../InboxList/components/ListHeader";
import { FilterSortIcon } from "@/components/icons";
import { Button } from "@/components/new-button";

interface SortingBarProps {
  selectedFilter: ListHeaderType;
  setSelectedFilter: (filter: ListHeaderType) => void;
  currentView: "list" | "direct";
  setCurrentView: (view: "list" | "direct") => void;
}

type SortOptionType = 'time' | 'source' | 'status' | 'type';

interface SortOption {
  type: SortOptionType;
  label: string;
  value: string;
  items: Array<{ value: string; label: string }>;
}

const SortingBar: FC<SortingBarProps> = ( {selectedFilter, setSelectedFilter, currentView, setCurrentView}: SortingBarProps ) => {
  const [sortValues, setSortValues] = useState<Record<SortOptionType, string>>({
    time: "",
    source: "",
    status: "",
    type: "",
  });

  const [chatSortValues, setChatSortValues] = useState<Record<SortOptionType, string>>({
    time: "",
    source: "",
    status: "",
    type: "",
  });

  const timeOptions = [
    { value: "newest", label: "Сначала новые" },
    { value: "oldest", label: "Сначала старые" },
  ];

  const sourceOptions = [
    { value: "all", label: "Все" },
    { value: "moderation", label: "Модерация" },
    { value: "system", label: "Системные" },
    { value: "automation", label: "Автоматизация" },
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
    { value: "bot", label: "Бот" },
    { value: "channel", label: "Канал" },
    { value: "system", label: "Система" },
  ];

  const filterSortConfig: Record<ListHeaderType, SortOptionType[]> = {
    all: ['time', 'source', 'status'],
    moderation: ['time', 'source'],
    system: ['time', 'source'],
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
        },
        {
          type: 'status' as SortOptionType,
          label: 'По статусу',
          value: chatSortValues.status,
          items: chatStatusOptions,
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
          };
        case 'source':
          return {
            type: 'source',
            label: 'По источнику',
            value: sortValues.source,
            items: sourceOptions,
          };
        case 'status':
          return {
            type: 'status',
            label: 'По статусу',
            value: sortValues.status,
            items: statusOptions,
          };
        case 'type':
          return {
            type: 'type',
            label: 'По типу',
            value: sortValues.type,
            items: typeOptions,
          };
        default:
          return {
            type: 'time',
            label: 'По времени',
            value: sortValues.time,
            items: timeOptions,
          };
      }
    });
  }, [selectedFilter, sortValues, chatSortValues, currentView]);

  const handleSortChange = (sortType: SortOptionType, value: string) => {
    setSortValues(prev => ({
      ...prev,
      [sortType]: value,
    }));
  };

  const handleSortClear = (sortType: SortOptionType) => {
    setSortValues(prev => ({
      ...prev,
      [sortType]: "",
    }));
  };

  const handleChatSortChange = (sortType: SortOptionType, value: string) => {
    setChatSortValues(prev => ({
      ...prev,
      [sortType]: value,
    }));
  };

  const handleChatSortClear = (sortType: SortOptionType) => {
    setChatSortValues(prev => ({
      ...prev,
      [sortType]: "",
    }));
  };

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
          <div className={styles.sortingBar}>
            <Button
              onClick={() => setCurrentView("list")}
              variant="fill"
              intent="gradient"
              size="lg"
              style={{ width: '100px' }}
            >
              Директ
            </Button>
            <div className={styles.sortingControls}>
              <span className={styles.sortingLabel}>Сортировка:</span>
              
              {availableSortOptions.map((option) => (
                <SimpleDropdown
                  key={option.type}
                  value={option.label}
                  items={option.items}
                  selectedValue={option.value}
                  onSelect={(value) => handleChatSortChange(option.type, value)}
                  onClear={() => handleChatSortClear(option.type)}
                  variant="sortBar"
                  className={styles.dropdown}
                />
              ))}
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
          <Button variant="ghost" intent="neutral" size="transparent">
            <FilterSortIcon width={24} height={24} />
          </Button>
        </MobileWrapper>
      </>
    );
  }

  return (
    <>
      <DesktopWrapper>
        <div className={styles.sortingBar}>
          <Button
            onClick={() => setCurrentView("direct")}
            variant="fill"
            size="lg"
            intent="gradient"
            style={{ width: '100px', minWidth: '100px' }}
          >
            Inbox
          </Button>
          <div className={styles.sortingControls}>
            <span className={styles.sortingLabel}>Сортировка:</span>
            
            {availableSortOptions.map((option) => (
              <SimpleDropdown
                key={option.type}
                value={option.label}
                items={option.items}
                selectedValue={option.value}
                onSelect={(value) => handleSortChange(option.type, value)}
                onClear={() => handleSortClear(option.type)}
                variant="sortBar"
                className={styles.dropdown}
              />
            ))}
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
          <Button variant="ghost" intent="neutral" size="transparent">
            <FilterSortIcon width={24} height={24} />
          </Button>
        </div>
      </MobileWrapper>
    </>
  );
};

export default SortingBar;