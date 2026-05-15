'use client';

import {
  AutoDeleteIcon,
  CalendarDraftIcon,
  CalendarRepeatIcon,
  PinIcon,
  WalletAdIcon,
} from '@/components/icons';
import styles from './AdTypeIcons.module.scss';

export type AdType = 'ad' | 'recurring' | 'autoDelete' | 'pinned' | 'draft';

interface AdTypeIconsProps {
  types: AdType[];
}

export default function AdTypeIcons({ types }: AdTypeIconsProps) {
  return (
    <div className={styles.row}>
      {types.includes('ad') && <WalletAdIcon width={16} height={16} />}
      {types.includes('recurring') && <CalendarRepeatIcon width={16} height={16} color="#3B82F6" />}
      {types.includes('autoDelete') && <AutoDeleteIcon width={16} height={16} />}
      {types.includes('pinned') && (
        <span className={styles.pinnedIcon}>
          <PinIcon width={16} height={16} />
        </span>
      )}
      {types.includes('draft') && <CalendarDraftIcon width={14} height={14} />}
    </div>
  );
}
