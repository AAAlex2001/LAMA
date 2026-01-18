'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { ErrorNotification } from './ErrorNotification';
import { SuccessNotification } from './SuccessNotification';

interface Notification {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showSuccess = (message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications([{ id, type: 'success', message }]);
  };

  const showError = (message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications([{ id, type: 'error', message }]);
  };

  const handleClose = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {notifications.map(notification => (
          notification.type === 'success' ? (
            <SuccessNotification
              key={notification.id}
              message={notification.message}
              onClose={() => handleClose(notification.id)}
            />
          ) : (
            <ErrorNotification
              key={notification.id}
              message={notification.message}
              onClose={() => handleClose(notification.id)}
            />
          )
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
