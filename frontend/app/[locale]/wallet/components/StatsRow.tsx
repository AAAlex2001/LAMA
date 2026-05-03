'use client';

import StatCard from './StatCard';
import styles from './StatsRow.module.scss';

interface StatsRowProps {
  income: number;
  expenses: number;
  published: number;
  scheduled: number;
  currency?: string;
}

export default function StatsRow({
  income,
  expenses,
  published,
  scheduled,
  currency = '₽',
}: StatsRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.moneyPair}>
        <StatCard title="Доходы" value={income} currency={currency} />
        <StatCard title="Расходы" value={expenses} currency={currency} />
      </div>
      <StatCard title="Опубликованная реклама" value={published} />
      <StatCard title="Запланированная реклама" value={scheduled} />
    </div>
  );
}
