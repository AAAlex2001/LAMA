import React from 'react';
import styles from './tooltip.module.scss';

interface TooltipProps {
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  visible?: boolean;
}

const placementClass: Record<NonNullable<TooltipProps['placement']>, string> = {
  top: styles.tooltipTop,
  bottom: '',
  left: styles.tooltipLeft,
  right: styles.tooltipRight,
};

const arrowPlacementClass: Record<NonNullable<TooltipProps['placement']>, string> = {
  top: styles.arrowTipTop,
  bottom: '',
  left: styles.arrowTipLeft,
  right: styles.arrowTipRight,
};

const Tooltip: React.FC<TooltipProps> = ({ text, placement = 'bottom', visible }) => {
  const visibilityClass = visible === true ? styles.tooltipVisible : visible === false ? styles.tooltipHidden : '';
  return (
    <div className={`${styles.tooltip} ${placementClass[placement]} ${visibilityClass}`}>
      <div className={styles.content}>
        <span className={styles.text}>{text}</span>
      </div>
      <div className={`${styles.arrowTip} ${arrowPlacementClass[placement]}`}>
        <div className={styles.arrow} />
      </div>
    </div>
  );
};

export default Tooltip;
