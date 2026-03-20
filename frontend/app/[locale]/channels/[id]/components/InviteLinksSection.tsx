'use client';

import { FC, useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import { Button } from '@/components/new-button';
import { InboxProvider } from '@/app/[locale]/inbox/store/provider';
import CreateInviteLinkModal from '@/app/[locale]/inbox/components/CreateInviteLinkModal';
import LinkInvitesModal from '@/app/[locale]/inbox/components/LinkInvitesModal';
import type { Channel } from '@/types/channel';
import styles from './InviteLinksSection.module.scss';

interface InviteLinksSectionProps {
  channel: Channel;
}

const InviteLinksSection: FC<InviteLinksSectionProps> = ({ channel }) => {
  const [open, setOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreateDone = () => {
    setLinksOpen(true);
  };

  return (
    <div className={styles.section}>
      <button
        className={`${styles.row} ${styles.rowActive}`}
        type="button"
        onClick={() => setOpen(!open)}
      >
        <span className={styles.label}>Ссылки-приглашения</span>
        <ChevronDownIcon
          width={16}
          height={16}
          color="#383F45"
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </button>

      {open && (
        <div className={styles.content}>
          <Button
            variant="outline"
            intent="gradient"
            size="lg"
            onClick={() => setLinksOpen(true)}
            className={styles.fullWidth}
          >
            Созданные ссылки
          </Button>

          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            onClick={() => setCreateOpen(true)}
            className={styles.fullWidth}
          >
            Создать ссылку-приглашение
          </Button>
        </div>
      )}

      <InboxProvider>
        <LinkInvitesModal
          isOpen={linksOpen}
          onOpenChange={setLinksOpen}
          onCreateLink={() => {
            setLinksOpen(false);
            setCreateOpen(true);
          }}
        />
        <CreateInviteLinkModal
          isOpen={createOpen}
          onOpenChange={setCreateOpen}
          onCreateLink={handleCreateDone}
          channelId={channel.id}
        />
      </InboxProvider>
    </div>
  );
};

export default InviteLinksSection;
