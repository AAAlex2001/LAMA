import { FC, ReactNode } from "react";
import styles from "../styles.module.scss";

interface StatusTextProps {
  children: ReactNode;
  variant?: 'default' | 'declined' | 'ignored';
}

export const StatusText: FC<StatusTextProps> = ({ children, variant = 'default' }) => {
  const variantClass = variant === 'declined'
    ? styles.declined
    : variant === 'ignored'
    ? styles.ignored
    : '';
  return <div className={`${styles.statusText} ${variantClass}`}>{children}</div>;
};
