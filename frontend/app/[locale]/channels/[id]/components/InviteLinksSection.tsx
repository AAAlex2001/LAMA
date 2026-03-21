'use client';

import { FC, useState, useEffect } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import { Button } from '@/components/new-button';
import { InboxProvider } from '@/app/[locale]/inbox/store/provider';
import CreateInviteLinkModal from '@/app/[locale]/inbox/components/CreateInviteLinkModal';
import LinkInvitesModal from '@/app/[locale]/inbox/components/LinkInvitesModal';
import { apiRequest } from '@/store/api';
import type { Channel } from '@/types/channel';
import type { InviteLink } from '@/types';
import styles from './InviteLinksSection.module.scss';

interface InviteLinksSectionProps {
  channel: Channel;
}

const InviteLinksSection: FC<InviteLinksSectionProps> = ({ channel }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(min-width: 1440px)').matches) {
      setOpen(true);
    }
  }, []);
  const [linksOpen, setLinksOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);

  const fetchLinks = () => {
    if (!channel.id) return;
    apiRequest<{ items: InviteLink[]; total: number }>(`/channels/${channel.id}/invite-links`, { method: 'GET' })
      .then((result) => {
        const items = result.items || [];
        setLinks(items);
        setLinksLoaded(true);
      })
      .catch(() => {
        setLinks([]);
        setLinksLoaded(true);
      });
  };

  useEffect(() => {
    fetchLinks();
  }, [channel.id]);

  const handleCreateDone = () => {
    fetchLinks();
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
          {linksLoaded && links.length > 0 && (
            <Button
              variant="outline"
              intent="gradient"
              size="lg"
              onClick={() => setLinksOpen(true)}
              className={styles.fullWidth}
            >
              Созданные ссылки
            </Button>
          )}

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
          channelId={channel.id}
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
