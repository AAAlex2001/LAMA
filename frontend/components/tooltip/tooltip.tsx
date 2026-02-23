import React from 'react';
import styles from './tooltip.module.scss';

interface TooltipProps {
  text: string;
  placement?: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ text, placement = 'bottom' }) => {
  return (
    <div className={placement === 'top' ? `${styles.tooltip} ${styles.tooltipTop}` : styles.tooltip}>
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
