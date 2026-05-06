'use client';

import { useState } from 'react';
import StatsRow from './StatsRow';
import CommunitiesPanel from './CommunitiesPanel';
import AdsPanel from './AdsPanel';
import ChartPlaceholderCard from './ChartPlaceholderCard';
import { AdRevenueStats } from '../store/types';
import styles from './MainView.module.scss';

interface MainViewProps {
  stats: AdRevenueStats | null;
  onAddIncome?: () => void;
}

export default function MainView({ stats, onAddIncome }: MainViewProps) {
  const [communityTab, setCommunityTab] = useState('all');
  const [adsTab, setAdsTab] = useState('income');

  const income = stats ? Number(stats.income_total) : 0;
  const expenses = stats ? Number(stats.expense_total) : 0;
  const published = stats ? stats.income_count + stats.expense_count : 0;

  return (
    <div className={styles.view}>
      <StatsRow income={income} expenses={expenses} published={published} scheduled={0} />
      <div className={styles.contentRow}>
        <div className={styles.column}>
          <CommunitiesPanel
            activeTab={communityTab}
            onTabChange={setCommunityTab}
            onAddClick={onAddIncome}
          />
          <ChartPlaceholderCard title="Статистика появится после первых рекламных размещений" />
        </div>
        <div className={styles.column}>
          <AdsPanel
            activeTab={adsTab}
            onTabChange={setAdsTab}
            onAddClick={onAddIncome}
          />
        </div>
      </div>
    </div>
  );
}
