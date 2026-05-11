'use client';

import { FC, useState } from 'react';
import { Button } from '@/components/new-button';
import buttonStyles from '@/components/new-button/styles.module.scss';
import FilterTabs from '@/components/filter-tabs/filter-tabs';
import { DesktopWrapper, MobileWrapper } from '@/components/responsive-wrappers';
import CreateTriggersModal from '../../../CreateTriggersModal';
import CreateCommandModal from '../../../CreateCommandModal';
import AutomatizationModal from '../../../AutomatizationModal';
import {
  FILTER_OPTIONS_AUTOMATION,
  automationFilterToId,
  automationIdToFilter,
  type AutomationEventType,
} from './constants';
import styles from './styles.module.scss';

interface AutomationHeaderProps {
  automationSubFilter?: AutomationEventType;
  onAutomationSubFilterChange?: (filter: AutomationEventType) => void;
}

const AutomationHeader: FC<AutomationHeaderProps> = ({ automationSubFilter, onAutomationSubFilterChange }) => {
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [isAutomatizationModalOpen, setIsAutomatizationModalOpen] = useState(false);

  const selectedFilter = automationFilterToId(automationSubFilter ?? null);
  const handleFilterChange = (id: string) => onAutomationSubFilterChange?.(automationIdToFilter(id));

  const showCreateTrigger = automationSubFilter === null || automationSubFilter === 'system_trigger';
  const showCreateCommand = automationSubFilter === null || automationSubFilter === 'bot_command';
  const showCreateButtons = automationSubFilter !== 'system_autoreply';

  return (
    <>
      <DesktopWrapper>
        <div className={styles.moderationWrapper}>
          <FilterTabs
            options={FILTER_OPTIONS_AUTOMATION}
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
          />
          {showCreateButtons && (
            <div className={styles.controls}>
              {showCreateTrigger && (
                <Button
                  variant="fill"
                  intent="gradient"
                  size="md"
                  onClick={() => setIsTriggerModalOpen(true)}
                >
                  <span className={buttonStyles.label}>Создать триггер</span>
                </Button>
              )}
              {showCreateCommand && (
                <Button
                  variant="fill"
                  intent="gradient"
                  size="md"
                  onClick={() => setIsCommandModalOpen(true)}
                >
                  <span className={buttonStyles.label}>Создать команду</span>
                </Button>
              )}
            </div>
          )}
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
              onClick={() => setIsAutomatizationModalOpen(true)}
            >
              <span className={buttonStyles.label}>Автоматизация действий</span>
            </Button>
          </div>
          <div className={styles.filterTabsMobileWrapper}>
            <FilterTabs
              options={FILTER_OPTIONS_AUTOMATION}
              selectedFilter={selectedFilter}
              onFilterChange={handleFilterChange}
              className={styles.filterTabsMobile}
            />
          </div>
        </div>
      </MobileWrapper>

      <AutomatizationModal
        isOpen={isAutomatizationModalOpen}
        onOpenChange={setIsAutomatizationModalOpen}
        onOpenAutoReply={() => {}}
        onOpenTrigger={() => setIsTriggerModalOpen(true)}
        onOpenCommand={() => setIsCommandModalOpen(true)}
      />
      <CreateTriggersModal
        isOpen={isTriggerModalOpen}
        onOpenChange={setIsTriggerModalOpen}
      />
      <CreateCommandModal
        isOpen={isCommandModalOpen}
        onOpenChange={setIsCommandModalOpen}
      />
    </>
  );
};

export default AutomationHeader;
