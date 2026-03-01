'use client';

import React, { useState } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import SearchBar from '@/components/search-bar/search-bar';
import FilterTabsWithBadges from './components/FilterTabsWithBadges';
import InvitationLinkItem from './components/InvitationLinkItem';
import styles from './styles.module.scss';

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

const MOCK_LINKS: InvitationLink[] = [
  {
    id: '1',
    url: 'http://FgdJGfofhgFgdJGfofhgFgdJGfofhgFgdJGfofhg',
    channelName: 'Назв канала',
    expirationDate: '12.05.25',
    usedCount: 40,
    maxUses: 100,
    isActive: true,
  },
  {
    id: '2',
    url: 'http://FgdJGfofhgFgdJGfofhgFgdJGfofhgFgdJGfofhg',
    channelName: 'Назв канала',
    usedCount: 40,
    isActive: true,
  },
  {
    id: '3',
    url: 'http://FgdJGfofhgFgdJGfofhgFgdJGfofhgFgdJGfofhg',
    channelName: 'Назв канала',
    expirationDate: '12.05.25',
    usedCount: 40,
    maxUses: 100,
    isActive: true,
  },
  {
    id: '4',
    url: 'http://FgdJGfofhgFgdJGfofhgFgdJGfofhgFgdJGfofhg',
    channelName: 'Назв канала',
    usedCount: 40,
    isActive: true,
  },
  {
    id: '5',
    url: 'http://FgdJGfofhgFgdJGfofhgFgdJGfofhgFgdJGfofhg',
    channelName: 'Назв канала',
    expirationDate: '12.05.25',
    usedCount: 40,
    maxUses: 100,
    isActive: false,
  },
];

interface LinkInvitesModalProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  links?: InvitationLink[];
  onCreateLink?: () => void;
  onEditLink?: (link: InvitationLink) => void;
}

const LinkInvitesModal: React.FC<LinkInvitesModalProps> = ({
  isOpen,
  onOpenChange,
  links = MOCK_LINKS,
  onCreateLink,
  onEditLink,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'expired'>('all');

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      link.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'active' && link.isActive) ||
      (selectedFilter === 'expired' && !link.isActive);

    return matchesSearch && matchesFilter;
  });

  const allCount = links.length;
  const activeCount = links.filter((link) => link.isActive).length;
  const expiredCount = links.filter((link) => !link.isActive).length;

  const handleCreateLink = onCreateLink ? () => {
    onCreateLink?.();
  } : undefined;

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="md" className={styles.modalContent}>
        <ModalBase.Body className={styles.modalBody}>
          {handleCreateLink && (
            <div className={styles.createButtonContainer}>
              <Button
                variant="fill"
                intent="gradient"
                size="lg"
                onClick={handleCreateLink}
                className={styles.createButton}
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
            options={[
              { id: 'all', label: 'Все', count: allCount, style: { flex: 1 } },
              { id: 'active', label: 'Актуальные', count: activeCount, style: { width: '107px' } },
              { id: 'expired', label: 'Истекшие', count: expiredCount, style: { width: '94px' } },
            ]}
            selectedFilter={selectedFilter}
            onFilterChange={(filterId) => setSelectedFilter(filterId as 'all' | 'active' | 'expired')}
          />

          <div className={styles.linksList}>
            {filteredLinks.length === 0 ? (
              <div className={styles.emptyState}>Нет ссылок-приглашений</div>
            ) : (
              filteredLinks.map((link) => (
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
