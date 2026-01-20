'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { ButtonRow, InlineButton, ButtonType } from './inline-buttons';

interface InlineButtonsContextValue {
  // State
  rows: ButtonRow[];
  isOpen: boolean;
  
  // Actions
  setRows: (rows: ButtonRow[]) => void;
  addColumn: () => void;
  addRow: () => void;
  updateButton: (rowIndex: number, btnIndex: number, updates: Partial<InlineButton>) => void;
  deleteButton: (rowIndex: number, btnIndex: number) => void;
  reset: () => void;
  
  // Toggle visibility
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const InlineButtonsContext = createContext<InlineButtonsContextValue | null>(null);

interface InlineButtonsProviderProps {
  children: ReactNode;
  initialOpen?: boolean;
}

export function InlineButtonsProvider({ children, initialOpen = false }: InlineButtonsProviderProps) {
  const [rows, setRows] = useState<ButtonRow[]>([]);
  const [isOpen, setIsOpen] = useState(initialOpen);

  const addColumn = () => {
    if (rows.length === 0) {
      setRows([{
        id: `row-${Date.now()}`,
        buttons: [{
          id: `btn-${Date.now()}`,
          text: '',
          type: 'url',
          url: '',
        }],
      }]);
    } else {
      const maxButtons = Math.max(...rows.map(r => r.buttons.length));
      const rowToAddIndex = rows.findIndex(r => r.buttons.length < maxButtons);
      
      if (rowToAddIndex !== -1) {
        const newRows = rows.map((row, idx) => {
          if (idx === rowToAddIndex) {
            return {
              ...row,
              buttons: [...row.buttons, {
                id: `btn-${Date.now()}`,
                text: '',
                type: 'url' as ButtonType,
                url: '',
              }],
            };
          }
          return row;
        });
        setRows(newRows);
      } else {
        const newRows = rows.map((row, idx) => {
          if (idx === 0) {
            return {
              ...row,
              buttons: [...row.buttons, {
                id: `btn-${Date.now()}`,
                text: '',
                type: 'url' as ButtonType,
                url: '',
              }],
            };
          }
          return row;
        });
        setRows(newRows);
      }
    }
  };

  const addRow = () => {
    setRows([...rows, {
      id: `row-${Date.now()}`,
      buttons: [{
        id: `btn-${Date.now()}`,
        text: '',
        type: 'url' as ButtonType,
        url: '',
      }],
    }]);
  };

  const updateButton = (rowIndex: number, btnIndex: number, updates: Partial<InlineButton>) => {
    const newRows = rows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        return {
          ...row,
          buttons: row.buttons.map((btn, bIdx) => {
            if (bIdx === btnIndex) {
              return { ...btn, ...updates };
            }
            return btn;
          }),
        };
      }
      return row;
    });
    setRows(newRows);
  };

  const deleteButton = (rowIndex: number, btnIndex: number) => {
    const newRows = rows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        const newButtons = row.buttons.filter((_, bIdx) => bIdx !== btnIndex);
        return {
          ...row,
          buttons: newButtons,
        };
      }
      return row;
    }).filter(row => row.buttons.length > 0);
    setRows(newRows);
  };

  const reset = () => {
    setRows([]);
  };

  // Toggle visibility
  const open = () => {
    setIsOpen(true);
    if (rows.length === 0) {
      setRows([{
        id: `row-${Date.now()}`,
        buttons: [{
          id: `btn-${Date.now()}`,
          text: '',
          type: 'url',
          url: '',
        }],
      }]);
    }
  };

  const close = () => {
    setIsOpen(false);
    setRows([]);
  };

  const toggle = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  const value: InlineButtonsContextValue = {
    rows,
    isOpen,
    setRows,
    addColumn,
    addRow,
    updateButton,
    deleteButton,
    reset,
    open,
    close,
    toggle,
  };

  return <InlineButtonsContext.Provider value={value}>{children}</InlineButtonsContext.Provider>;
}

export function useInlineButtons() {
  const context = useContext(InlineButtonsContext);
  if (!context) {
    throw new Error('useInlineButtons must be used within InlineButtonsProvider');
  }
  return context;
}
