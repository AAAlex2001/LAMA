'use client';

import { FC } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/new-button';
import { ChatChevronIcon } from '@/components/icons';
import styles from './SettingsHeader.module.scss';

interface SettingsHeaderProps {
  connectedCount: number;
  total: number;
  onConnect: () => void;
}

const SettingsHeader: FC<SettingsHeaderProps> = ({ connectedCount, total, onConnect }) => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';

  return (
    <div className={styles.header}>
      <div className={styles.row}>
        <button className={styles.backBtn} onClick={() => router.push(`/${locale}/channels`)} type="button">
          <ChatChevronIcon width={37} height={37} />
        </button>
        <div className={styles.connectBlock}>
          <Button variant="fill" intent="gradient" size="lg" className={styles.connectBtn} onClick={onConnect}>
            Подключить канал или группу
          </Button>
          <span className={styles.info}>
            Подключено каналов и групп: {connectedCount}/{total}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SettingsHeader;
