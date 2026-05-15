'use client';

import { useMemo } from 'react';
import Loader from '@/components/loader';
import type { MonthlyAdStatItem } from '@/store/wallet';
import styles from './MonthlyChart.module.scss';

const MONTH_LABELS = ['Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сент', 'Окт', 'Нояб', 'Дек'];
const WIDTH = 620;
const HEIGHT = 180;
const Y_STEPS = 5;

const AXIS_MAX_CAP = 1_000_000;

interface MonthlyChartProps {
  title: string;
  months: MonthlyAdStatItem[];
  loading: boolean;
}

interface Series {
  values: number[];
  max: number;
}

export default function MonthlyChart({ title, months, loading }: MonthlyChartProps) {
  const series = useMemo(() => buildSeries(months), [months]);
  const niceMax = useMemo(
    () => Math.min(niceCeil(Math.max(series.income.max, series.expense.max)), AXIS_MAX_CAP),
    [series.income.max, series.expense.max],
  );
  const yLabels = useMemo(
    () => Array.from({ length: Y_STEPS + 1 }, (_, i) => (niceMax / Y_STEPS) * (Y_STEPS - i)),
    [niceMax],
  );

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
      </header>

      <div className={styles.body}>
        <div className={styles.yAxis}>
          {yLabels.map((v) => (
            <span key={v} className={styles.yLabel}>{formatAxis(v)}</span>
          ))}
        </div>

        <div className={styles.plot}>
          {loading ? (
            <div className={styles.loaderRow}>
              <Loader size={24} color="blue" />
            </div>
          ) : (
            <ChartSvg series={series} niceMax={niceMax} />
          )}

          <div className={styles.timeline}>
            {MONTH_LABELS.map((label) => (
              <span key={label} className={styles.monthLabel}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      <footer className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.dotIncome} />
          <span className={styles.legendText}>Доходы</span>
        </span>
        <span className={styles.legendItem}>
          <span className={styles.dotExpense} />
          <span className={styles.legendText}>Расходы</span>
        </span>
      </footer>
    </section>
  );
}

interface ChartSvgProps {
  series: { income: Series; expense: Series };
  niceMax: number;
}

function ChartSvg({ series, niceMax }: ChartSvgProps) {
  const incomePts = projectPoints(series.income.values, niceMax);
  const expensePts = projectPoints(series.expense.values, niceMax);

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <Grid />
      <SmoothLine points={expensePts} color="#B1CDFB" />
      <SmoothLine points={incomePts} color="#3B82F6" />
      <Dots points={expensePts} color="#B1CDFB" />
      <Dots points={incomePts} color="#3B82F6" />
    </svg>
  );
}

function Grid() {
  const cellWidth = WIDTH / MONTH_LABELS.length;
  const rowHeight = HEIGHT / Y_STEPS;
  return (
    <g stroke="#F0F4FA" strokeWidth={1}>
      {Array.from({ length: MONTH_LABELS.length + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i * cellWidth} y1={0} x2={i * cellWidth} y2={HEIGHT} />
      ))}
      {Array.from({ length: Y_STEPS + 1 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * rowHeight} x2={WIDTH} y2={i * rowHeight} />
      ))}
    </g>
  );
}

interface Point {
  x: number;
  y: number;
}

function SmoothLine({ points, color }: { points: Point[]; color: string }) {
  if (points.length === 0) return null;
  const d = catmullRomPath(points);
  return <path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}

function Dots({ points, color }: { points: Point[]; color: string }) {
  return (
    <g>
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke={color} />
      ))}
    </g>
  );
}

function buildSeries(months: MonthlyAdStatItem[]): { income: Series; expense: Series } {
  const incomeValues = Array(12).fill(0);
  const expenseValues = Array(12).fill(0);
  for (const m of months) {
    const idx = m.month - 1;
    if (idx < 0 || idx > 11) continue;
    incomeValues[idx] = Number(m.income) || 0;
    expenseValues[idx] = Number(m.expense) || 0;
  }
  return {
    income: { values: incomeValues, max: Math.max(...incomeValues, 0) },
    expense: { values: expenseValues, max: Math.max(...expenseValues, 0) },
  };
}

function projectPoints(values: number[], max: number): Point[] {
  const cellWidth = WIDTH / values.length;
  const safeMax = max > 0 ? max : 1;
  return values.map((v, i) => ({
    x: cellWidth * (i + 0.5),
    y: HEIGHT - (v / safeMax) * HEIGHT,
  }));
}

function catmullRomPath(pts: Point[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function niceCeil(value: number): number {
  if (value <= 0) return 100;
  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  const mantissa = value / base;
  if (mantissa <= 1) return 1 * base;
  if (mantissa <= 2) return 2 * base;
  if (mantissa <= 5) return 5 * base;
  return 10 * base;
}

function formatAxis(value: number): string {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return trim(value / 1_000_000) + 'M';
  if (abs >= 1_000) return trim(value / 1_000) + 'K';
  return trim(value);
}

function trim(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(/\.0$/, '');
}
