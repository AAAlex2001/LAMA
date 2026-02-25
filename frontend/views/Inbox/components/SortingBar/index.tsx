'use client';

import { FC, useState } from "react";
import Button from "@/components/button/button";
import SimpleDropdown from "@/components/simple-dropdown/simple-dropdown";
import styles from "./styles.module.scss";
import classNames from "classnames";

const SortingBar: FC = () => {
  const [sortByTime, setSortByTime] = useState<string>("");
  const [sortByStatus, setSortByStatus] = useState<string>("");
  const [sortBySource, setSortBySource] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const timeOptions = [
    { value: "newest", label: "Сначала новые" },
    { value: "oldest", label: "Сначала старые" },
  ];

  const statusOptions = [
    { value: "default", label: "По умолчанию" },
    { value: "new", label: "Новые" },
    { value: "processed", label: "Обработанные" },
  ];

  const sourceOptions = [
    { value: "all", label: "Все" },
    { value: "moderation", label: "Модерация" },
    { value: "system", label: "Системные" },
    { value: "automation", label: "Автоматизация" },
  ];

  const filterOptions = [
    { id: "all", label: "Все" },
    { id: "moderation", label: "Модерация" },
    { id: "system", label: "Системные" },
    { id: "automation", label: "Автоматизация" },
  ];

  return (
    <div className={styles.sortingBar}>
      <Button
        text="Директ"
        onClick={() => {}}
        showArrow={false}
        variant="default"
        active
      />
      
      <div className={styles.sortingControls}>
        <span className={styles.sortingLabel}>Сортировка:</span>
        
        <SimpleDropdown
          value="По времени"
          items={timeOptions}
          selectedValue={sortByTime}
          onSelect={(value) => setSortByTime(value)}
          onClear={() => setSortByTime("")}
          variant="sortBar"
          className={styles.dropdown}
        />
        
        <SimpleDropdown
          value="По статусу"
          items={statusOptions}
          selectedValue={sortByStatus}
          onSelect={(value) => setSortByStatus(value)}
          onClear={() => setSortByStatus("")}
          variant="sortBar"
          className={styles.dropdown}
        />
        
        <SimpleDropdown
          value="По источнику"
          items={sourceOptions}
          selectedValue={sortBySource}
          onSelect={(value) => setSortBySource(value)}
          onClear={() => setSortBySource("")}
          variant="sortBar"
          className={styles.dropdown}
        />
      </div>

      <div className={styles.filterControls}>
        {filterOptions.map((option) => (
          <span
            key={option.id}
            className={classNames(styles.filterLabel, { [styles.filterLabelActive]: selectedFilter === option.id })}
            onClick={() => setSelectedFilter(option.id)}
          >
            {option.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SortingBar;