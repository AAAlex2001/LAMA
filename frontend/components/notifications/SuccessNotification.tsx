"use client";

import { useEffect, useState } from "react";
import styles from "./SuccessNotification.module.scss";

type SuccessNotificationProps = {
  message: string;
  duration?: number;
  onClose: () => void;
};

export function SuccessNotification({
  message,
  duration = 5000,
  onClose,
}: SuccessNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    const hideTimer = setTimeout(() => setIsExiting(true), duration - 300);
    const removeTimer = setTimeout(() => onClose(), duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, onClose]);

  return (
    <div
      className={`${styles.successNotification} ${
        isVisible ? styles.visible : ""
      } ${isExiting ? styles.exiting : ""}`}
      role="status"
    >
      <div className={styles.successContent}>
        <div className={styles.successIcon}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M8.33333 13.3941L5.605 10.6658L4.66666 11.6041L8.33333 15.2708L16.3333 7.27075L15.395 6.33241L8.33333 13.3941Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <span className={styles.successMessage}>{message}</span>
      </div>
      <div
        className={styles.progressBar}
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  );
}



