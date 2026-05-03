'use client';

import PostIcon from '@/components/icons/post-icon';
import SendIcon from '@/components/icons/send-icon';
import ArrowsSpinIcon from '@/components/icons/arrows-spin-icon';
import TrashIcon from '@/components/icons/trash-icon';
import styles from './AdTypeIcons.module.scss';

export type AdType = 'post' | 'forwarded' | 'recurring' | 'note' | 'autoDelete';

const NOTES_ICON = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 2h6l2 2v9.5a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5z" stroke="#3B82F6" strokeWidth="1" />
    <path d="M11 2v2h2" stroke="#3B82F6" strokeWidth="1" />
    <path d="M7 7h4M7 9.5h4M7 12h2.5" stroke="#3B82F6" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

interface AdTypeIconsProps {
  types: AdType[];
}

export default function AdTypeIcons({ types }: AdTypeIconsProps) {
  return (
    <div className={styles.row}>
      {types.includes('post') && <PostIcon width={16} height={16} color="#3B82F6" />}
      {types.includes('forwarded') && (
        <span className={styles.iconWrap} style={{ color: '#34C759' }}>
          <SendIcon width={16} height={16} />
        </span>
      )}
      {types.includes('recurring') && <ArrowsSpinIcon width={16} height={16} color="#3B82F6" />}
      {types.includes('note') && NOTES_ICON}
      {types.includes('autoDelete') && <TrashIcon width={16} height={16} color="#E33326" />}
    </div>
  );
}
