'use client';

import React, { useState, useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import SearchBar from '@/components/search-bar/search-bar';
import FilterTabsWithBadges from './components/FilterTabsWithBadges';
import InvitationLinkItem from './components/InvitationLinkItem';
import Loader from '@/components/loader/loader';
import styles from './styles.module.scss';
import { useChannelsQuery } from '@/store/channels';
import { useInviteLinksBatchQuery } from '@/store/inbox';
import type { InviteLink } from '@/types';

export interface InvitationLink {
  id: string;
  url: string;
  channelName: string;
  expirationDate?: string;
  usedCount: number;
  maxUses?: number;
  isActive: boolean;
  verifiedCount?: number;
  creationDate?: string;
  linkName?: string;
  linkType?: 'open' | 'closed';
  loginMethod?: 'direct' | 'bot';
  hasCaptcha?: boolean;
  channelId?: string;
}

interface LinkInvitesModalProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  links?: InvitationLink[];
  onCreateLink?: () => void;
  onEditLink?: (link: InvitationLink) => void;
  channelId?: number;
}

const getFilterOptions = (
  allCount: number,
  activeCount: number,
  expiredCount: number
) => [
  { id: 'all', label: 'Все', count: allCount, style: { flex: 1 } },
  { id: 'active', label: 'Актуальные', count: activeCount, style: { flex: 1 } },
  { id: 'expired', label: 'Истекшие', count: expiredCount, style: { flex: 1 } },
];

const mapInviteLinkToInvitationLink = (link: InviteLink, channelName?: string): InvitationLink => {
  const expireDate = link.expire_date 
    ? new Date(link.expire_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : undefined;
  
  const creationDate = link.created_at
    ? new Date(link.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : undefined;

  return {
    id: link.id.toString(),
    url: link.invite_link,
    channelName: channelName || `Channel ${link.channel_id}`,
    expirationDate: expireDate,
    usedCount: link.member_count,
    maxUses: link.member_limit > 0 ? link.member_limit : undefined,
    isActive: !(link.is_revoked || (link.expire_date ? new Date(link.expire_date) < new Date() : false)),
    verifiedCount: link.pending_join_request_count,
    creationDate,
    linkName: link.name,
    linkType: link.creates_join_request ? 'closed' : 'open',
    loginMethod: (link.entry_method as 'direct' | 'bot') || 'direct',
    hasCaptcha: link.protection_type === 'captcha',
    channelId: link.channel_id.toString(),
  };
};

const LinkInvitesModal: React.FC<LinkInvitesModalProps> = ({
  isOpen,
  onOpenChange,
  links: propLinks,
  onCreateLink,
  onEditLink,
  channelId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'expired'>('all');

  const channelsQuery = useChannelsQuery();
  const channels = channelsQuery.data?.items ?? [];
  const channelNameMap = new Map(channels.map((ch) => [ch.id, ch.title]));

  // Грузим invite-links для всех каналов параллельно через TQ
  const targetChannelIds = isOpen
    ? (channelId !== undefined ? [channelId] : channels.map((ch) => ch.id))
    : [];
  const queries = useInviteLinksBatchQuery(targetChannelIds);

  const allInviteLinks: InviteLink[] = queries.flatMap((q) => q.data?.items ?? []);
  const isLoading = queries.some((q) => q.isLoading);

  const mappedLinks = allInviteLinks && !!allInviteLinks.length ? 
    allInviteLinks.map((link) => {
      const channelName = channelNameMap.get(link.channel_id) || '';
      return mapInviteLinkToInvitationLink(link, channelName);
    }) 
    : propLinks;

  const filteredLinks = mappedLinks?.filter((link) => {
    const matchesSearch =
      link.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'active' && link.isActive) ||
      (selectedFilter === 'expired' && !link.isActive);

    return matchesSearch && matchesFilter;
  });

  const allCount = mappedLinks?.length || 0;
  const activeCount = mappedLinks?.filter((link) => link.isActive).length || 0;
  const expiredCount = mappedLinks?.filter((link) => !link.isActive).length || 0;

  const handleCreateLink = onCreateLink ? () => {
    onCreateLink?.();
  } : undefined;

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Body className={styles.modalBody}>
          {handleCreateLink && (
            <div className={styles.createButtonContainer}>
              <Button
                variant="fill"
                intent="gradient"
                size="lg"
                onClick={handleCreateLink}
                className={styles.createButton}
                style={{ width: '100%' }}
              >
                <span>Создать ссылку-приглашение</span>
              </Button>
            </div>
          )}

          <ModalBase.Title className={styles.heading}>Созданные ссылки-приглашения</ModalBase.Title>

          <div className={styles.searchContainer}>
            <SearchBar
              placeholder="Введите название канала / ссылки"
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <FilterTabsWithBadges
            options={getFilterOptions(allCount, activeCount, expiredCount)}
            selectedFilter={selectedFilter}
            onFilterChange={(filterId) => setSelectedFilter(filterId as 'all' | 'active' | 'expired')}
          />

          <div className={styles.linksList}>
            {isLoading && (
              <div className={styles.emptyState}>
                <Loader size={32} color="blue" />
              </div>
            )} 
            
            {!filteredLinks?.length && !isLoading && (
              <div className={styles.emptyState}>Нет ссылок-приглашений</div>
            )}
            
            {!!filteredLinks?.length && !isLoading && (
              filteredLinks?.map((link) => (
                <InvitationLinkItem
                  key={link.id}
                  link={link}
                  onEdit={onEditLink}
                />
              ))
            )}
          </div>
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default LinkInvitesModal;
