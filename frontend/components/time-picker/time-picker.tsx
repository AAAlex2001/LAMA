'use client';

import { TimePickerProvider, useTimePicker } from './store/TimePickerContext';
import styles from './time-picker.module.scss';

interface TimePickerProps {
  hours: number;
  minutes: number;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
  selectedDate?: Date | null;
}

function TimePickerContent() {
  const { state, hoursColRef, minutesColRef, handlers, utils } = useTimePicker();

  const prevHours = utils.getPrevHours();
  const nextHours = utils.getNextHours();
  const prevMinutes = utils.getPrevMinutes();
  const nextMinutes = utils.getNextMinutes();

  return (
    <div className={styles.container}>
      <div className={styles.columnsWrapper}>
        {/* Hours column */}
        <div
          ref={hoursColRef}
          className={styles.column}
          onMouseDown={(e) => handlers.handleMouseDown(e, 'hours')}
          onTouchStart={(e) => handlers.handleTouchStart(e, 'hours')}
          onTouchMove={handlers.handleTouchMove}
          onTouchEnd={handlers.handleTouchEnd}
        >
          <span className={`${styles.inactiveValue} ${prevHours === null ? styles.hidden : ''}`}>
            {prevHours !== null ? utils.formatValue(prevHours) : '00'}
          </span>
          
          <div className={styles.activeValue}>
            {state.isEditingHours ? (
              <input
                type="text"
                value={state.inputHours}
                onChange={handlers.handleHoursInputChange}
                onBlur={handlers.handleHoursInputBlur}
                onKeyDown={handlers.handleHoursInputKeyDown}
                className={styles.input}
                autoFocus
                maxLength={2}
              />
            ) : (
              <span onClick={handlers.handleHoursClick}>{utils.formatValue(state.hours)}</span>
            )}
          </div>
          
          <span className={`${styles.inactiveValue} ${nextHours === null ? styles.hidden : ''}`}>
            {nextHours !== null ? utils.formatValue(nextHours) : '00'}
          </span>
        </div>

        {/* Separator */}
        <div className={styles.separatorColumn}>
          <span className={`${styles.separator} ${prevHours === null ? styles.hidden : ''}`}>:</span>
          <span className={styles.activeSeparator}>:</span>
          <span className={`${styles.separator} ${nextHours === null ? styles.hidden : ''}`}>:</span>
        </div>

        {/* Minutes column */}
        <div
          ref={minutesColRef}
          className={styles.column}
          onMouseDown={(e) => handlers.handleMouseDown(e, 'minutes')}
          onTouchStart={(e) => handlers.handleTouchStart(e, 'minutes')}
          onTouchMove={handlers.handleTouchMove}
          onTouchEnd={handlers.handleTouchEnd}
        >
          <span className={`${styles.inactiveValue} ${prevMinutes === null ? styles.hidden : ''}`}>
            {prevMinutes !== null ? utils.formatValue(prevMinutes) : '00'}
          </span>
          
          <div className={styles.activeValue}>
            {state.isEditingMinutes ? (
              <input
                type="text"
                value={state.inputMinutes}
                onChange={handlers.handleMinutesInputChange}
                onBlur={handlers.handleMinutesInputBlur}
                onKeyDown={handlers.handleMinutesInputKeyDown}
                className={styles.input}
                autoFocus
                maxLength={2}
              />
            ) : (
              <span onClick={handlers.handleMinutesClick}>{utils.formatValue(state.minutes)}</span>
            )}
          </div>
          
          <span className={`${styles.inactiveValue} ${nextMinutes === null ? styles.hidden : ''}`}>
            {nextMinutes !== null ? utils.formatValue(nextMinutes) : '00'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TimePicker({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  selectedDate,
}: TimePickerProps) {
  return (
    <TimePickerProvider
      initialHours={hours}
      initialMinutes={minutes}
      selectedDate={selectedDate}
      onHoursChange={onHoursChange}
      onMinutesChange={onMinutesChange}
    >
      <TimePickerContent />
    </TimePickerProvider>
  );
}
