'use client';

import { useMemo, useState } from 'react';
import { DateRange } from '@/components/date-range-picker';
import WalletHeader, { WalletTopTab } from './WalletHeader';
import MainView from './MainView';
import EfficiencyView from './EfficiencyView';
import AddAdRevenueModal from './AddAdRevenueModal';
import ExportDataModal, { type ExportDataPayload } from './ExportDataModal';
import { useAdRevenues } from '../store/useAdRevenues';
import { AdRevenueType } from '../store/types';
import styles from './WalletPageView.module.scss';

const RU_MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function formatRangeLabel(range: DateRange | null): string | undefined {
  if (!range) return undefined;
  const startMonth = RU_MONTHS_SHORT[range.start.getMonth()];
  const endMonth = RU_MONTHS_SHORT[range.end.getMonth()];
  const year = range.end.getFullYear();
  if (range.start.getFullYear() !== year) {
    return `${startMonth} ${range.start.getFullYear()} — ${endMonth} ${year}`;
  }
  return startMonth === endMonth ? `${startMonth} ${year}` : `${startMonth} — ${endMonth} ${year}`;
}

export default function WalletPageView() {
  const [topTab, setTopTab] = useState<WalletTopTab>('main');
  const [range, setRange] = useState<DateRange | null>(null);
  const [modalType, setModalType] = useState<AdRevenueType | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const filters = useMemo(() => ({
    date_from: range ? toIso(range.start) : undefined,
    date_to: range ? toIso(range.end) : undefined,
  }), [range]);

  const { items, stats, add } = useAdRevenues(filters);

  const handleSubmit = async (payload: Parameters<typeof add>[0]) => {
    await add(payload);
  };

  const handleExport = (payload: ExportDataPayload) => {
    // TODO: подключить реальный API экспорта когда появится endpoint.
    console.log('export wallet data', { ...payload, range });
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
        <EfficiencyView
          ads={items}
          onAddIncome={() => setModalType('income')}
          onExportClick={() => setExportOpen(true)}
        />
      )}

      {modalType && (
        <AddAdRevenueModal
          isOpen
          type={modalType}
          onClose={() => setModalType(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ExportDataModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        periodLabel={formatRangeLabel(range)}
      />
    </div>
  );
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
