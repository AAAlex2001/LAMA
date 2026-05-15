'use client';

import { useMemo, useState } from 'react';
import { DateRange } from '@/components/date-range-picker';
import WalletHeader, { WalletTopTab } from './WalletHeader';
import MainView from './MainView';
import EfficiencyView from './EfficiencyView';
import AddAdRevenueModal from './AddAdRevenueModal';
import AddAdExpenseModal from './AddAdExpenseModal';
import ExportDataModal, { type ExportDataPayload } from './ExportDataModal';
import {
  useAddAdRevenueMutation,
  useAdRevenueStatsQuery,
  useAdRevenuesQuery,
  exportAdRevenues,
} from '@/store/wallet';
import type {
  AdRevenueListFilters,
  AdRevenueSortKey,
  AdRevenueType,
  ExportDataKey,
} from '@/store/wallet';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import styles from './WalletPageView.module.scss';

type DataTypeFlag = keyof ExportDataPayload['dataType'];

const EXPORT_KEY_BY_FLAG: Record<DataTypeFlag, ExportDataKey> = {
  generalIncome: 'general_income',
  generalExpense: 'general_expense',
  adsIncome: 'ads_income',
  adsExpense: 'ads_expense',
};

function selectedDataTypes(flags: ExportDataPayload['dataType']): ExportDataKey[] {
  const keys: ExportDataKey[] = [];
  for (const flag of Object.keys(EXPORT_KEY_BY_FLAG) as DataTypeFlag[]) {
    if (flags[flag]) keys.push(EXPORT_KEY_BY_FLAG[flag]);
  }
  return keys;
}

const RU_MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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
  const [sortBy, setSortBy] = useState<AdRevenueSortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'scheduled' | 'published' | undefined>(undefined);
  const [currency, setCurrency] = useState<string | undefined>(undefined);

  const baseFilters = useMemo<AdRevenueListFilters>(
    () => ({
      date_from: range ? toIso(range.start) : undefined,
      date_to: range ? toIso(range.end) : undefined,
    }),
    [range],
  );

  const statsFilters = useMemo<AdRevenueListFilters>(
    () => ({ ...baseFilters, currency }),
    [baseFilters, currency],
  );

  const statsQuery = useAdRevenueStatsQuery(statsFilters);
  const stats = statsQuery.data ?? null;
  const activeCurrency = stats?.currency;

  const listFilters = useMemo<AdRevenueListFilters>(
    () => ({
      ...baseFilters,
      sort_by: sortBy,
      sort_dir: sortDir,
      status: statusFilter,
      currency: activeCurrency,
    }),
    [baseFilters, sortBy, sortDir, statusFilter, activeCurrency],
  );

  const revenuesQuery = useAdRevenuesQuery(listFilters);
  const addMutation = useAddAdRevenueMutation();

  const items = revenuesQuery.data?.items ?? [];
  const periodLabel = formatRangeLabel(range) || 'За весь период';
  const { showError, showSuccess } = useNotifications();

  const handleExport = async (payload: ExportDataPayload) => {
    const dataTypes = selectedDataTypes(payload.dataType);
    if (dataTypes.length === 0) return;

    try {
      const blob = await exportAdRevenues({
        dataTypes,
        scope: payload.scope,
        format: payload.format,
        dateFrom: range ? toIso(range.start) : undefined,
        dateTo: range ? toIso(range.end) : undefined,
        currency: activeCurrency,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad-revenues-${new Date().toISOString().slice(0, 10)}.${payload.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Файл загружен');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка экспорта');
    }
  };

  return (
    <div className={styles.page}>
      <WalletHeader
        activeTab={topTab}
        onTabChange={setTopTab}
        range={range}
        onRangeChange={setRange}
        onExportClick={() => setExportOpen(true)}
      />
      {topTab === 'main' ? (
        <MainView
          stats={stats}
          onAddIncome={() => setModalType('income')}
          onAddExpense={() => setModalType('expense')}
          currency={stats?.currency ?? currency ?? 'RUB'}
          onCurrencyChange={setCurrency}
          dateFrom={range ? toIso(range.start) : undefined}
          dateTo={range ? toIso(range.end) : undefined}
        />
      ) : (
        <EfficiencyView
          ads={items}
          onAddIncome={() => setModalType('income')}
          onAddExpense={() => setModalType('expense')}
          periodLabel={periodLabel}
          sortBy={sortBy}
          sortDir={sortDir}
          statusFilter={statusFilter}
          onSortChange={(by, dir) => {
            setSortBy(by);
            setSortDir(dir);
          }}
          onStatusFilterChange={setStatusFilter}
        />
      )}

      {modalType === 'income' && (
        <AddAdRevenueModal
          isOpen
          type="income"
          onClose={() => setModalType(null)}
          onSubmit={(payload) => addMutation.mutateAsync(payload).then(() => undefined)}
        />
      )}

      {modalType === 'expense' && (
        <AddAdExpenseModal
          isOpen
          onClose={() => setModalType(null)}
          onSubmit={(payload) => addMutation.mutateAsync(payload).then(() => undefined)}
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
