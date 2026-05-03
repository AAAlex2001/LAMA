'use client';

import { useState } from 'react';
import StatsRow from './StatsRow';
import CommunitiesPanel from './CommunitiesPanel';
import AdsPanel from './AdsPanel';
import ChartPlaceholderCard from './ChartPlaceholderCard';
import styles from './MainView.module.scss';

export default function MainView() {
  const [communityTab, setCommunityTab] = useState('all');
  const [adsTab, setAdsTab] = useState('income');

  return (
    <div className={styles.view}>
      <StatsRow income={0} expenses={0} published={0} scheduled={0} />
      <div className={styles.contentRow}>
        <div className={styles.column}>
          <CommunitiesPanel activeTab={communityTab} onTabChange={setCommunityTab} />
          <ChartPlaceholderCard title="Статистика появится после первых рекламных размещений" />
        </div>
        <div className={styles.column}>
          <AdsPanel activeTab={adsTab} onTabChange={setAdsTab} />
        </div>
      </div>
    </div>
  );
}
