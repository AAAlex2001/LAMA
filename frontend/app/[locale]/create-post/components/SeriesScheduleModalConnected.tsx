'use client';

import { useState } from 'react';
import DatePicker from '@/components/date-picker/date-picker';
import { TimePicker, useRecentTimes } from '@/components/time-picker';
import { Button } from '@/components/new-button';
import { useAppDispatch, useAppSelector } from '../store';
import * as uiSlice from '../store/slices/ui';
import { scheduleSeries } from '../store/thunks';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import styles from './series-schedule-modal.module.scss';

interface PostSchedule {
  date: Date | null;
  hours: number;
  minutes: number;
}

export default function SeriesScheduleModalConnected() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const isOpen = useAppSelector(state => state.ui.showSeriesScheduleModal);
  const isScheduling = useAppSelector(state => state.ui.isScheduling);
  const snapshots = useAppSelector(state => state.series.snapshots);
  const recentTimes = useRecentTimes();

  const [schedules, setSchedules] = useState<PostSchedule[]>([]);
  const [expandedIndex, setExpandedIndex] = useState(0);

  const ensureSchedules = () => {
    if (schedules.length !== snapshots.length) {
      const now = new Date();
      return snapshots.map((_, i) => schedules[i] || { date: now, hours: now.getHours(), minutes: now.getMinutes() });
    }
    return schedules;
  };

  if (!isOpen) return null;

  const currentSchedules = ensureSchedules();
  if (currentSchedules.length !== schedules.length) {
    setSchedules(currentSchedules);
    return null;
  }

  function updateSchedule(index: number, update: Partial<PostSchedule>) {
    setSchedules((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)));
  }

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return 'Выберите дату';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTimeDisplay = (hours: number, minutes: number) => {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const allDatesSet = currentSchedules.every(s => s.date !== null);

  async function handleSchedule() {
    if (!allDatesSet) return;
    const scheduledDates = currentSchedules.map(s => {
      const d = new Date(s.date!);
      d.setHours(s.hours, s.minutes, 0, 0);
      return d;
    });

    try {
      const result = await dispatch(scheduleSeries({ scheduledDates })).unwrap();
      showSuccess(result?.message || 'Серия запланирована');
      dispatch(uiSlice.setShowSeriesScheduleModal(false));
      setSchedules([]);
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка планирования');
    }
  }

  return (
    <div className={styles.overlay} onClick={() => dispatch(uiSlice.setShowSeriesScheduleModal(false))}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>Расписание серии постов</div>

        <div className={styles.postsList}>
          {currentSchedules.map((schedule, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={index}
                className={`${styles.postTab} ${isExpanded ? styles.postTabExpanded : ''}`}
                onClick={!isExpanded ? () => setExpandedIndex(index) : undefined}
              >
                <div className={styles.postHeader}>
                  <span className={styles.postName}>Пост {index + 1}</span>
                  {!isExpanded && (
                    <div className={styles.postMeta}>
                      <span className={styles.postDate}>{formatDateDisplay(schedule.date)}</span>
                      <span className={styles.postTime}>{formatTimeDisplay(schedule.hours, schedule.minutes)}</span>
                    </div>
                  )}
                  <svg
                    className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="#000000"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {isExpanded && (
                  <div className={styles.postContent}>
                    <div className={styles.pickersWrapper}>
                      <DatePicker
                        value={schedule.date ?? undefined}
                        onChange={(date) => updateSchedule(index, { date })}
                        locale="ru"
                        selectedDates={schedule.date ? [schedule.date.getDate()] : []}
                      />
                      <TimePicker
                        hours={schedule.hours}
                        minutes={schedule.minutes}
                        onHoursChange={(h) => updateSchedule(index, { hours: h })}
                        onMinutesChange={(m) => updateSchedule(index, { minutes: m })}
                        selectedDate={schedule.date}
                        quickTimes={recentTimes}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.buttonWrapper}>
          <Button
            onClick={handleSchedule}
            disabled={!allDatesSet || isScheduling}
            loading={isScheduling}
            style={{ width: '100%' }}
            intent="gradient"
          >
            Запланировать серию
          </Button>
        </div>
      </div>
    </div>
  );
}
