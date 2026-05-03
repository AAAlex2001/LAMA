'use client';

import { useState } from 'react';
import { DateRange } from '@/components/date-range-picker';
import WalletHeader, { WalletTopTab } from './WalletHeader';
import MainView from './MainView';
import EfficiencyView from './EfficiencyView';
import styles from './WalletPageView.module.scss';

export default function WalletPageView() {
  const [topTab, setTopTab] = useState<WalletTopTab>('main');
  const [range, setRange] = useState<DateRange | null>(null);

  return (
    <div className={styles.page}>
      <WalletHeader
        activeTab={topTab}
        onTabChange={setTopTab}
        range={range}
        onRangeChange={setRange}
      />
      {topTab === 'main' ? <MainView /> : <EfficiencyView />}
    </div>
  );
}
