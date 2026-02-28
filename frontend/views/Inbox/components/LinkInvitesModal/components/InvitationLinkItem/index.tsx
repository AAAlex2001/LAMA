'use client';

import React from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';
import type { InvitationLink } from '../../index';
import UserIconOutline from '@/components/icons/user-icon-outline';

interface InvitationLinkItemProps {
  link: InvitationLink;
  onEdit?: (link: InvitationLink) => void;
}

const InvitationLinkItem: React.FC<InvitationLinkItemProps> = ({ link, onEdit }) => {
  const displayUrl = link.url;
  const usageText = link.maxUses
    ? `${link.usedCount}/${link.maxUses}`
    : `${link.usedCount}`;

  const isExpired = !link.isActive;

  return (
    <button 
      type="button" 
      className={classNames(styles.linkItem, { 
        [styles.linkItemExpired]: isExpired 
      })} 
      onClick={!isExpired ? () => onEdit?.(link) : undefined}
      style={{ cursor: onEdit && !isExpired ? 'pointer' : 'default' }}
    >
      <div className={styles.linkContent}>
        <div className={styles.urlWrapper}>
          <div className={styles.bullet} />
          <div className={styles.url}>{displayUrl}</div>
        </div>
        <div className={styles.linkDetails}>
          <span className={styles.channelName}>{link.channelName}</span>
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
    </button>
  );
};

export default InvitationLinkItem;
