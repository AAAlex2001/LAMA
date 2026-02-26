'use client'

import Button from "@/components/button/button";
import FilterTabs from "@/components/filter-tabs/filter-tabs";
import { FC, useEffect, useState } from "react";

import styles from "./styles.module.scss";

export type ListHeaderType = 'all' | 'moderation' | 'system' | 'automation';

interface ListHeaderProps {
  type: ListHeaderType;
  setIsChecking: (isChecking: boolean) => void;
  isChecking: boolean;
  onSelectAll?: () => void;
}


const ListHeader: FC<ListHeaderProps> = ({ type, setIsChecking, isChecking, onSelectAll }: ListHeaderProps) => {
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
        <div>
          <div className={styles.controls}>    
            <Button 
              text="Выбрать все" 
              variant="inlineButton" 
              showArrow={false} 
              onClick={onSelectAll} 
              className={styles.controlButton}
            />
            <Button 
              text="Выбрать" 
              variant="inlineButton" 
              showArrow={false} 
              active={isChecking} 
              onClick={() => setIsChecking(!isChecking)} 
              className={styles.controlButton}
            />
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
            <Button text="Созданные ссылки-приглашения" variant="default" showArrow={false} className={styles.controlButton}/>
            <Button text="Создать ссылку-приглашение" variant="default" active showArrow={false} className={styles.controlButton}/>
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
            <Button text="Создать автоответ" variant="default" active showArrow={false} className={styles.controlButton} />
            <Button text="Создать триггер" variant="default" active showArrow={false} className={styles.controlButton} />
            <Button text="Создать компаду" variant="default" active showArrow={false} className={styles.controlButton} />
          </div>
        </div>
      )
    default:
      return (
        <div className={styles.controls}>    
          <Button 
            text="Выбрать все" 
            variant="inlineButton" 
            showArrow={false} 
            onClick={onSelectAll} 
            className={styles.controlButton}
          />
          <Button 
            text="Выбрать" 
            variant="inlineButton" 
            showArrow={false} 
            active={isChecking}
            onClick={() => setIsChecking(!isChecking)} 
            className={styles.controlButton}
          />
        </div>
      )
  }
}

export default ListHeader;