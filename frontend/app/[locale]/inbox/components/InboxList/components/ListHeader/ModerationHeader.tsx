'use client';

import { FC, useState } from 'react';
import { Button } from '@/components/new-button';
import buttonStyles from '@/components/new-button/styles.module.scss';
import FilterTabs from '@/components/filter-tabs/filter-tabs';
import { DesktopWrapper, MobileWrapper } from '@/components/responsive-wrappers';
import LinkInvitesModal, { type InvitationLink } from '../../../LinkInvitesModal';
import CreateInviteLinkModal from '../../../CreateInviteLinkModal';
import {
  FILTER_OPTIONS_MODERATION,
  moderationFilterToId,
  moderationIdToFilter,
  type ModerationStatusType,
} from './constants';
import styles from './styles.module.scss';

interface ModerationHeaderProps {
  moderationSubFilter?: ModerationStatusType;
  onModerationSubFilterChange?: (filter: ModerationStatusType) => void;
}

const ModerationHeader: FC<ModerationHeaderProps> = ({ moderationSubFilter, onModerationSubFilterChange }) => {
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [isCreateInviteModalOpen, setIsCreateInviteModalOpen] = useState(false);
  const [editingInvite, setEditingInvite] = useState<InvitationLink | null>(null);

  const selectedFilter = moderationFilterToId(moderationSubFilter ?? null);
  const handleFilterChange = (id: string) => onModerationSubFilterChange?.(moderationIdToFilter(id));

  const openCreate = () => {
    setEditingInvite(null);
    setIsCreateInviteModalOpen(true);
  };

  const openEdit = (link: InvitationLink) => {
    setEditingInvite(link);
    setIsCreateInviteModalOpen(true);
  };

  return (
    <>
      <DesktopWrapper>
        <LinkInvitesModal
          isOpen={isLinksModalOpen}
          onOpenChange={setIsLinksModalOpen}
          onEditLink={openEdit}
        />
        <div className={styles.moderationWrapper}>
          <FilterTabs
            options={FILTER_OPTIONS_MODERATION}
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
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
            <Button variant="fill" intent="gradient" size="md" onClick={openCreate}>
              <span>Создать ссылку-приглашение</span>
            </Button>
          </div>
        </div>
      </DesktopWrapper>

      <MobileWrapper>
        <LinkInvitesModal
          isOpen={isLinksModalOpen}
          onOpenChange={setIsLinksModalOpen}
          onCreateLink={openCreate}
          onEditLink={openEdit}
        />
        <div className={`${styles.moderationWrapperMobile} ${styles.mobileFlex}`}>
          <FilterTabs
            options={FILTER_OPTIONS_MODERATION}
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
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
        isOpen={isCreateInviteModalOpen}
        onCreateLink={() => {}}
        onOpenChange={(open) => {
          setIsCreateInviteModalOpen(open);
          if (!open) setEditingInvite(null);
        }}
        linkId={parseInt(editingInvite?.id ?? '0', 10)}
        channelId={parseInt(editingInvite?.channelId ?? '0', 10)}
      />
    </>
  );
};

export default ModerationHeader;
