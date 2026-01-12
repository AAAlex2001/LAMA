import React from 'react';
import styles from './tooltip.module.scss';

interface TooltipProps {
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  return (
    <div className={styles.tooltip}>
      <div className={styles.content}>
        <span className={styles.text}>{text}</span>
      </div>
      <div className={styles.arrowTip}>
        <div className={styles.arrow} />
      </div>
    </div>
  );
};

export default Tooltip;
