'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StatsRow from './StatsRow';
import CommunitiesPanel from './CommunitiesPanel';
import AdsPanel from './AdsPanel';
import EditAdRevenueModal from './EditAdRevenueModal';
import MobileSection from './MobileSection';
import MonthlyChart from './MonthlyChart';
import {
  useCommunityStatsQuery,
  useDeleteAdRevenueMutation,
  useMonthlyAdStatsQuery,
  useUpdateAdRevenueMutation,
} from '../store/queries';
import type { AdRevenue, AdRevenueStats, CommunityFilter } from '../store/types';
import styles from './MainView.module.scss';

interface MainViewProps {
  stats: AdRevenueStats | null;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  dateFrom?: string;
  dateTo?: string;
}

export default function MainView({
  stats,
  currency,
  onCurrencyChange,
  onAddIncome,
  onAddExpense,
  dateFrom,
  dateTo,
}: MainViewProps) {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale ?? 'ru';

  const [communityTab, setCommunityTab] = useState<CommunityFilter>('all');
  const [adsTab, setAdsTab] = useState('income');
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<AdRevenue | null>(null);

  const activeCurrency = stats?.currency;
  const updateMutation = useUpdateAdRevenueMutation();
  const deleteMutation = useDeleteAdRevenueMutation();

  const communitiesQuery = useCommunityStatsQuery(
    {
      date_from: dateFrom,
      date_to: dateTo,
      currency: activeCurrency,
      kind: communityTab,
    },
    { enabled: !!activeCurrency },
  );
  const communities = communitiesQuery.data?.items ?? [];

  const monthlyQuery = useMonthlyAdStatsQuery(
    {
      year: new Date().getFullYear(),
      currency: activeCurrency,
      channel_id: selectedChannelId ?? undefined,
    },
    { enabled: !!activeCurrency },
  );

  const selectedCommunity = selectedChannelId !== null
    ? communities.find((c) => c.kind !== 'bot' && c.id === selectedChannelId)
    : undefined;
  const chartTitle = selectedCommunity?.title ?? 'Все каналы';

  const income = stats ? Number(stats.income_total) : 0;
  const expenses = stats ? Number(stats.expense_total) : 0;
  const publishedAds = stats?.published_ads_count ?? 0;
  const scheduledAds = stats?.scheduled_ads_count ?? 0;
  const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'EUR'];
  const currenciesFromStats = stats?.currencies ?? [];
  const currencies = currenciesFromStats.length > 1
    ? currenciesFromStats
    : Array.from(new Set([currency, ...SUPPORTED_CURRENCIES]));

  const goToCreateAd = () => router.push(`/${locale}/create-post?ad=1`);

  const communitiesPanel = (
    <CommunitiesPanel
      activeTab={communityTab}
      onTabChange={setCommunityTab}
      items={communities}
      loading={communitiesQuery.isLoading}
      currency={currency}
      selectedChannelId={selectedChannelId}
      onChannelSelect={setSelectedChannelId}
      onAddClick={onAddIncome}
    />
  );

  const adsPanel = (
    <AdsPanel
      activeTab={adsTab}
      onTabChange={setAdsTab}
      currency={currency}
      enabled={!!activeCurrency}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onAddClick={adsTab === 'expense' ? onAddExpense : onAddIncome}
      onRowClick={setEditingItem}
    />
  );

  const chart = (
    <MonthlyChart
      title={chartTitle}
      months={monthlyQuery.data?.months ?? []}
      loading={monthlyQuery.isLoading}
    />
  );

  return (
    <div className={styles.view}>
      <StatsRow
        income={income}
        expenses={expenses}
        publishedAds={publishedAds}
        scheduledAds={scheduledAds}
        currency={currency}
        currencies={currencies}
        onCurrencyChange={onCurrencyChange}
        onAddIncome={onAddIncome}
        onAddExpense={onAddExpense}
        onCreateAd={goToCreateAd}
      />

      <div className={styles.desktopLayout}>
        <div className={styles.column}>
          {communitiesPanel}
          {chart}
        </div>
        <div className={styles.column}>{adsPanel}</div>
      </div>

      <div className={styles.mobileLayout}>
        <MobileSection title="Сообщества">{communitiesPanel}</MobileSection>
        <MobileSection title="Рекламные размещения">{adsPanel}</MobileSection>
        {chart}
      </div>

      {editingItem && (
        <EditAdRevenueModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(id, payload) => updateMutation.mutateAsync({ id, payload }).then(() => undefined)}
          onDelete={(id) => deleteMutation.mutateAsync(id).then(() => undefined)}
        />
      )}
    </div>
  );
}
