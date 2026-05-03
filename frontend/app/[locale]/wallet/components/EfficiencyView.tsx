'use client';

import { useState } from 'react';
import { Button } from '@/components/new-button';
import AdsListSection from './AdsListSection';
import { Ad } from './AdCard';
import styles from './EfficiencyView.module.scss';

interface EfficiencyViewProps {
  ads?: Ad[];
  onAddClick?: () => void;
  onExportClick?: () => void;
}

export default function EfficiencyView({ ads = [], onAddClick, onExportClick }: EfficiencyViewProps) {
  const [adsTab, setAdsTab] = useState('income');

  return (
    <div className={styles.view}>
      <div className={styles.exportSlot}>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          className={styles.exportBtn}
          onClick={onExportClick}
        >
          Экспорт данных
        </Button>
      </div>
      <AdsListSection
        activeTab={adsTab}
        onTabChange={setAdsTab}
        ads={ads}
        onAddClick={onAddClick}
      />
    </div>
  );
}
