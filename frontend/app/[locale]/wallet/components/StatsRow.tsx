'use client';

import StatCard from './StatCard';
import styles from './StatsRow.module.scss';

function formatMoney(value: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface StatsRowProps {
  income: number;
  expenses: number;
  publishedAds: number;
  scheduledAds: number;
  currency: string;
  currencies: string[];
  onCurrencyChange: (currency: string) => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onCreateAd?: () => void;
}

export default function StatsRow({
  income,
  expenses,
  publishedAds,
  scheduledAds,
  currency,
  currencies,
  onCurrencyChange,
  onAddIncome,
  onAddExpense,
  onCreateAd,
}: StatsRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.moneyPair}>
        <StatCard
          title="Доходы"
          value={formatMoney(income)}
          currency={currency}
          currencies={currencies}
          onCurrencyChange={onCurrencyChange}
          onAddClick={onAddIncome}
        />
        <StatCard
          title="Расходы"
          value={formatMoney(expenses)}
          currency={currency}
          currencies={currencies}
          onCurrencyChange={onCurrencyChange}
          onAddClick={onAddExpense}
        />
      </div>
      <StatCard
        title="Опубликованная реклама"
        value={publishedAds}
        onAddClick={onCreateAd}
      />
      <StatCard
        title="Запланированная реклама"
        value={scheduledAds}
        onAddClick={onCreateAd}
      />
    </div>
  );
}
