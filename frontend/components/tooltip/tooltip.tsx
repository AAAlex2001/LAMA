import React from 'react';
import styles from './tooltip.module.scss';

interface TooltipProps {
  text: string;
  placement?: 'top' | 'bottom';
  visible?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({ text, placement = 'bottom', visible }) => {
  const visibilityClass = visible === true ? styles.tooltipVisible : visible === false ? styles.tooltipHidden : '';
  return (
    <div className={`${placement === 'top' ? `${styles.tooltip} ${styles.tooltipTop}` : styles.tooltip} ${visibilityClass}`}>
      <div className={styles.content}>
        <span className={styles.text}>{text}</span>
      </div>
      <div className={placement === 'top' ? `${styles.arrowTip} ${styles.arrowTipTop}` : styles.arrowTip}>
        <div className={styles.arrow} />
      </div>
    </div>
  );
};

export default Tooltip;
