"use client";

import { useEffect, useState } from "react";
import styles from "./ErrorNotification.module.scss";
import { CloseIcon } from "@/components/icons";

type ErrorNotificationProps = {
  message: string;
  duration?: number;
  onClose: () => void;
};

export function ErrorNotification({
  message,
  duration = 5000,
  onClose,
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    return () => {
      clearTimeout(showTimer);
    };
  }, [duration]);

  return (
    <div
      className={`${styles.errorNotification} ${
        isVisible ? styles.visible : ""
      }`}
      role="alert"
    >
      <button
        onClick={onClose}
        className={styles.closeButton}
        aria-label="Закрыть уведомление"
      >
        <CloseIcon width={16} height={16} color="#721c24" />
      </button>
      <div className={styles.errorContent}>
        <div className={styles.errorIcon}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M15.8334 5.34168L14.6584 4.16668L10.0001 8.82501L5.34175 4.16668L4.16675 5.34168L8.82508 10L4.16675 14.6583L5.34175 15.8333L10.0001 11.175L14.6584 15.8333L15.8334 14.6583L11.1751 10L15.8334 5.34168Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <span className={styles.errorMessage}>{message}</span>
      </div>
      <div
        className={styles.progressBar}
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  );
}

