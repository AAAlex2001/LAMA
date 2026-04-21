'use client';

import React from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';
import type { InvitationLink } from '../../index';
import UserIconOutline from '@/components/icons/user-icon-outline';
import CopyIcon from '@/components/icons/copy-icon';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { Button } from '@/components/new-button';

interface InvitationLinkItemProps {
  link: InvitationLink;
  onEdit?: (link: InvitationLink) => void;
}

const InvitationLinkItem: React.FC<InvitationLinkItemProps> = ({ link, onEdit }) => {
  const { showSuccess } = useNotifications();
  const displayUrl = link.url;
  const usageText = link.maxUses
    ? `${link.usedCount}/${link.maxUses}`
    : `${link.usedCount}`;

  const isExpired = !link.isActive;

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.url);
    showSuccess('Ссылка скопирована!');
  };

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      role="button"
      tabIndex={0}
      className={classNames(styles.linkItem, { 
        [styles.linkItemExpired]: isExpired 
      })} 
      onClick={!isExpired ? () => onEdit?.(link) : undefined}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isExpired) onEdit?.(link); } }}
      style={{ cursor: onEdit && !isExpired ? 'pointer' : 'default' }}
    >
      <div className={styles.linkContent}>
        <div className={styles.urlWrapper}>
          <div className={styles.bullet} />
          <div className={styles.url}>{displayUrl}</div>
          <div className={styles.actionButtons}>
            <Button
              className={styles.actionButton}
              onClick={handleCopy}
              variant="ghost"
              intent="neutral"
              size="sm"
              title="Копировать ссылку"
              aria-label="Копировать ссылку"
            >
              <CopyIcon width={16} height={16} color="var(--color-gray-input)" />
            </Button>
          </div>
        </div>
        <div className={styles.linkDetails}>
          <div className={styles.linkMeta}>
            <span className={styles.channelName}>{link.channelName}</span>
            <span className={styles.usageCount}>
              {link.creationDate}
            </span>
          </div>
          <div className={styles.linkMeta}>
            {link.expirationDate && (
              <span className={styles.expirationDate}>До {link.expirationDate}</span>
            )}
            <span className={styles.usageCount}>
              {usageText}
              <UserIconOutline width={12} height={12} color={"var(--color-gray-input)"} className={styles.userIcon} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationLinkItem;
