'use client'

import FilterTabs from "@/components/filter-tabs/filter-tabs";
import { Button } from "@/components/new-button";
import { FC, useEffect, useState } from "react";
import buttonStyles from "@/components/new-button/styles.module.scss";

import styles from "./styles.module.scss";
import { DesktopWrapper, MobileWrapper } from "@/components/responsive-wrappers";
import LinkInvitesModal, { InvitationLink } from "../../../LinkInvitesModal";
import CreateInviteLinkModal from "../../../CreateInviteLinkModal";

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
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [isCreateIviteModalOpen, setIsCreateIviteModalOpen] = useState(false);
  const [editingIvite, setEditingIvite] = useState<InvitationLink | null>(null);

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
        <>
          <DesktopWrapper>
            <div className={`${styles.headerWrapper}`}>
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
                    <Button variant="ghost" intent="gradient" size="transparent">
                      <span className={buttonStyles.label}>Прочитать</span>
                    </Button>
                    <Button variant="ghost" intent="gradient" size="transparent">
                      <span className={buttonStyles.label}>Игнорировать</span>
                    </Button>
                    <Button variant="ghost" intent="destructive" size="transparent">
                      Удалить
                    </Button>
                    <Button variant="ghost" intent="destructive" size="transparent">
                      Заблокировать
                    </Button>
                    <Button variant="ghost" intent="gradient" size="transparent">
                      <span className={buttonStyles.label}>Разблокировать</span>
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
                  <span>{!isSelectedAll ? 'Выбрать все' : 'Снять выбор'}</span>
                </Button>
                <Button 
                  variant="outline" 
                  intent={isChecking ? "primary" : "neutral"}
                  size="sm"  
                  onClick={() => setIsChecking(!isChecking)} 
                  className={styles.controlButton}
                >
                  <span>{!isChecking ? 'Выбрать' : 'Отменить'}</span>
                </Button>
              </div>
            </div>
          </DesktopWrapper>
          {isChecking && (
            <MobileWrapper>
              <div className={styles.selectedItemsMobile}>
                <div className={styles.controls}>    
                  <Button 
                    variant="outline" 
                    intent={isSelectedAll ? "primary" : "neutral"}
                    size="sm"
                    onClick={onSelectAll} 
                    className={styles.controlButton}
                  >
                    <span>{!isSelectedAll ? 'Выбрать все' : 'Снять выбор'}</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    intent={isChecking ? "primary" : "neutral"}
                    size="sm"  
                    onClick={() => setIsChecking(!isChecking)} 
                    className={styles.controlButton}
                  >
                    <span>Отменить</span>
                  </Button>
                </div>
                <div className={styles.selectedItems}>
                  <span>Выбрано {checkedItems} уведомление</span>
                </div>
              </div>
              <div className={styles.mobileActions}>
                <Button variant="ghost" intent="gradient" size="transparent">
                  <span className={buttonStyles.label}>Прочитать</span>
                </Button>
                <Button variant="ghost" intent="gradient" size="transparent">
                  <span className={buttonStyles.label}>Игнорировать</span>
                </Button>
                <Button variant="ghost" intent="destructive" size="transparent">
                  Удалить
                </Button>
                <Button variant="ghost" intent="destructive" size="transparent">
                  Заблокировать
                </Button>
                <Button variant="ghost" intent="gradient" size="transparent">
                  <span className={buttonStyles.label}>Разблокировать</span>
                </Button>
              </div>
            </MobileWrapper>
          )}
        </>
      )
    case 'moderation':
      return (
        <>
          <div className={`${styles.headerWrapper} ${!isChecking ? styles.mobileHide : styles.mobileFlex}`}></div>
          <DesktopWrapper>
            <LinkInvitesModal 
              isOpen={isLinksModalOpen} 
              onOpenChange={setIsLinksModalOpen}
              onEditLink={(link) => {
                setEditingIvite(link);
                setIsCreateIviteModalOpen(true);
              }}
            />
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
                  size="md"
                  onClick={() => setIsLinksModalOpen(true)}
                >
                  <span className={buttonStyles.label}>Созданные ссылки-приглашения</span>
                </Button>
                <Button 
                  variant="fill" 
                  intent="gradient"
                  size="md"
                  onClick={() => {
                    setEditingIvite(null);
                    setIsCreateIviteModalOpen(true);
                  }}
                >
                  <span>Создать ссылку-приглашение</span>
                </Button>
              </div>
            </div>
          </DesktopWrapper>
          <MobileWrapper>
            <LinkInvitesModal 
              isOpen={isLinksModalOpen} 
              onOpenChange={setIsLinksModalOpen}
              onCreateLink={() => {
                setEditingIvite(null);
                setIsCreateIviteModalOpen(true);
              }}
              onEditLink={(link) => {
                setEditingIvite(link);
                setIsCreateIviteModalOpen(true);
              }}
            />
            <div className={`${styles.moderationWrapperMobile} ${styles.mobileFlex}`}>
              <FilterTabs
                options={filterOptionsModeration}
                selectedFilter={selectedSubFilter}
                onFilterChange={setSelectedSubFilter} 
                className={styles.filterTabsMobile}
              />
              <div className={styles.controlsMobile}>
                <Button 
                  variant="fill" 
                  intent="gradient"
                  size="lg"
                  style={{ width: '100%' }}
                  onClick={() => setIsLinksModalOpen(true)}
                >
                  <span>Ссылки-приглашения</span>
                </Button>
              </div>
            </div>
          </MobileWrapper>
          <CreateInviteLinkModal 
            isOpen={isCreateIviteModalOpen} 
            onOpenChange={(open) => {
              setIsCreateIviteModalOpen(open);
              if (!open) {
                setEditingIvite(null);
              }
            }}
            editingIvite={editingIvite}
          />
        </>
      )
    case 'system':
      return (
        null
      )
    case 'automation':
      return (
        <>
          <DesktopWrapper>
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
                  size="md"
                >
                  <span className={buttonStyles.label}>Создать автоответ</span>
                </Button>
                <Button
                  variant="fill" 
                  intent="gradient"
                  size="md"
                >
                  <span className={buttonStyles.label}>Создать триггер</span>
                </Button>
                <Button 
                  variant="fill" 
                  intent="gradient"
                  size="md"
                >
                  <span className={buttonStyles.label}>Создать компаду</span>
                </Button>
              </div>
            </div>
          </DesktopWrapper>
          <MobileWrapper>
            <div className={`${styles.moderationWrapperMobile} ${styles.mobileFlex}`}>
              <div className={styles.controlsMobile}>    
                <Button 
                  variant="fill" 
                  intent="gradient"
                  size="lg"
                  style={{ width: '100%' }}
                >
                  <span className={buttonStyles.label}>Автоматизация действий</span>
                </Button>
              </div>
              <div className={styles.filterTabsMobileWrapper}>
                <FilterTabs
                  options={filterOptionsAutomation}
                  selectedFilter={selectedSubFilter}
                  onFilterChange={setSelectedSubFilter}
                  className={styles.filterTabsMobile}
                />
              </div>
            </div>
          </MobileWrapper>
        </>
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