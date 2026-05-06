'use client';

import { useMemo, useState } from 'react';
import { DateRange } from '@/components/date-range-picker';
import WalletHeader, { WalletTopTab } from './WalletHeader';
import MainView from './MainView';
import EfficiencyView from './EfficiencyView';
import AddAdRevenueModal from './AddAdRevenueModal';
import { useAdRevenues } from '../store/useAdRevenues';
import { AdRevenueType } from '../store/types';
import styles from './WalletPageView.module.scss';

export default function WalletPageView() {
  const [topTab, setTopTab] = useState<WalletTopTab>('main');
  const [range, setRange] = useState<DateRange | null>(null);
  const [modalType, setModalType] = useState<AdRevenueType | null>(null);

  const filters = useMemo(() => ({
    date_from: range ? toIso(range.start) : undefined,
    date_to: range ? toIso(range.end) : undefined,
  }), [range]);

  const { items, stats, add } = useAdRevenues(filters);

  const handleSubmit = async (payload: Parameters<typeof add>[0]) => {
    await add(payload);
  };

  return (
    <div className={styles.page}>
      <WalletHeader
        activeTab={topTab}
        onTabChange={setTopTab}
        range={range}
        onRangeChange={setRange}
      />
      {topTab === 'main' ? (
        <MainView stats={stats} onAddIncome={() => setModalType('income')} />
      ) : (
        <EfficiencyView ads={items} onAddIncome={() => setModalType('income')} />
      )}

      {modalType && (
        <AddAdRevenueModal
          isOpen
          type={modalType}
          onClose={() => setModalType(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
