'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/new-button';
import AdsListSection from './AdsListSection';
import { Ad } from './AdCard';
import { AdRevenue } from '../store/types';
import styles from './EfficiencyView.module.scss';

interface EfficiencyViewProps {
  ads: AdRevenue[];
  onAddIncome?: () => void;
  onExportClick?: () => void;
}

export default function EfficiencyView({ ads, onAddIncome, onExportClick }: EfficiencyViewProps) {
  const [adsTab, setAdsTab] = useState('income');

  const filtered = useMemo(
    () => ads.filter((a) => a.type === adsTab).map(mapToAd),
    [ads, adsTab],
  );

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
        ads={filtered}
        onAddClick={onAddIncome}
      />
    </div>
  );
}

function mapToAd(r: AdRevenue): Ad {
  return {
    id: String(r.id),
    title: r.note || r.buyer || 'Реклама',
    username: r.buyer ? `@${r.buyer}` : '',
    amount: `${formatAmount(r.amount)} ${currencySymbol(r.currency)}`,
    date: formatDate(r.revenue_date),
    buyer: r.buyer || '',
    metrics: { comments: '0', views: '0', clicks: '0', likes: '0' },
    types: [],
  };
}

function formatAmount(amount: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currencySymbol(code: string): string {
  if (code === 'RUB') return '₽';
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  return code;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y.slice(-2)}`;
}
