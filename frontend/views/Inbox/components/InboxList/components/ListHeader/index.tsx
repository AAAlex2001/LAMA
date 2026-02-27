'use client'

import FilterTabs from "@/components/filter-tabs/filter-tabs";
import { Button } from "@/components/new-button";
import { FC, useEffect, useState } from "react";
import buttonStyles from "@/components/new-button/styles.module.scss";

import styles from "./styles.module.scss";

export type ListHeaderType = 'all' | 'moderation' | 'system' | 'automation';

interface ListHeaderProps {
  type: ListHeaderType;
  setIsChecking: (isChecking: boolean) => void;
  isChecking: boolean;
  onSelectAll?: () => void;
  isSelectedAll?: boolean;
  checkedItems?: number;
}


const ListHeader: FC<ListHeaderProps> = ({ type, setIsChecking, isChecking, onSelectAll, isSelectedAll, checkedItems }: ListHeaderProps) => {
  const [selectedSubFilter, setSelectedSubFilter] = useState<string>("all");
  
  const filterOptionsModeration = [
    { id: "all", label: "Все" },
    { id: "waiting", label: "Ожидают" },
    { id: "processed", label: "Обработанные" },
    { id: "blocked", label: "Заблокированные" },
  ];

  const filterOptionsAutomation = [
    { id: "all", label: "Все" },
    { id: "auto-reply", label: "Автоответ" },
    { id: "trigger", label: "Триггер" },
    { id: "commands", label: "Команды" },
  ];

  useEffect(() => {
    setSelectedSubFilter("all");
  }, [type]);

  switch (type) {
    case 'all':
      return (
        <div className={styles.headerWrapper}>
          {
            isChecking ? (
              <div className={styles.selectedItems}>
                <span>Выбрано {checkedItems} уведомление</span>
              </div>
            ) : <div />
          }
          {
            isChecking && (
              <div className={styles.actions}>
                <Button variant="ghost" intent="neutral" size="transparent">
                  Прочитать
                </Button>
                <Button variant="ghost" intent="neutral" size="transparent">
                  Игнорировать
                </Button>
                <Button variant="ghost" intent="neutral" size="transparent">
                  Удалить
                </Button>
                <Button variant="ghost" intent="neutral" size="transparent">
                  Заблокировать
                </Button>
                <Button variant="ghost" intent="neutral" size="transparent">
                  Разблокировать
                </Button>
              </div>
            )
          }
          <div className={styles.controls}>    
            <Button 
              variant="outline" 
              intent={isSelectedAll ? "primary" : "neutral"}
              size="sm"
              onClick={onSelectAll} 
              className={styles.controlButton}
            >
              <span>Выбрать все</span>
            </Button>
            <Button 
              variant="outline" 
              intent={isChecking ? "primary" : "neutral"}
              size="sm"  
              onClick={() => setIsChecking(!isChecking)} 
              className={styles.controlButton}
            >
              <span>Выбрать</span>
            </Button>
          </div>
        </div>
      )
    case 'moderation':
      return (
        <div className={styles.moderationWrapper}>
          <FilterTabs
            options={filterOptionsModeration}
            selectedFilter={selectedSubFilter}
            onFilterChange={setSelectedSubFilter}
          />
          <div className={styles.controls}>
            <Button 
              variant="outline" 
              intent="gradient"
              size="lg"
            >
              <span className={buttonStyles.label}>Созданные ссылки-приглашения</span>
            </Button>
            <Button 
              variant="fill" 
              intent="gradient"
              size="lg"
            >
              <span>Создать ссылку-приглашение</span>
            </Button>
          </div>
        </div>
      )
    case 'system':
      return (
        null
      )
    case 'automation':
      return (
        <div className={styles.moderationWrapper}>
          <FilterTabs
              options={filterOptionsAutomation}
              selectedFilter={selectedSubFilter}
              onFilterChange={setSelectedSubFilter}
            />
          <div className={styles.controls}>    
            <Button 
              variant="fill" 
              intent="gradient"
              size="lg"
            >
              <span className={buttonStyles.label}>Создать автоответ</span>
            </Button>
            <Button 
              variant="fill" 
              intent="gradient"
              size="lg"
            >
              <span className={buttonStyles.label}>Создать триггер</span>
            </Button>
            <Button 
              variant="fill" 
              intent="gradient"
              size="lg"
            >
              <span className={buttonStyles.label}>Создать компаду</span>
            </Button>
          </div>
        </div>
      )
    default:
      return (
        <div className={styles.controls}>    
          <Button 
            variant="outline" 
            intent="neutral"
            size="sm"
            onClick={onSelectAll} 
            className={styles.controlButton}
          >
            <span>Выбрать все</span>
          </Button>
          <Button 
            variant="outline" 
            intent={isChecking ? "gradient" : "neutral"}
            size="sm"  
            onClick={() => setIsChecking(!isChecking)} 
            className={styles.controlButton}
          >
            <span>Выбрать</span>
          </Button>
        </div>
      )
  }
}

export default ListHeader;