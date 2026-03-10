'use client';

import { useState } from 'react';
import type { ButtonRow, InlineButton } from '@/app/[locale]/create-post/store/types';

function createButton(): InlineButton {
  return {
    id: `btn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text: '',
    type: 'url',
    url: '',
  };
}

function createRow(): ButtonRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    buttons: [createButton()],
  };
}

export function useInlineButtons() {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<ButtonRow[]>([]);

  const toggle = () => {
    setIsOpen(prev => {
      if (prev) {
        setRows([]);
        return false;
      } else {
        if (rows.length === 0) {
          setRows([createRow()]);
        }
        return true;
      }
    });
  };

  const addRow = () => {
    setRows(prev => [...prev, createRow()]);
  };

  const addColumn = (rowId: string) => {
    setRows(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, buttons: [...row.buttons, createButton()] }
        : row
    ));
  };

  const updateButton = (rowId: string, buttonId: string, updates: Partial<InlineButton>) => {
    setRows(prev => prev.map(row => 
      row.id === rowId
        ? {
            ...row,
            buttons: row.buttons.map(btn =>
              btn.id === buttonId ? { ...btn, ...updates } : btn
            ),
          }
        : row
    ));
  };

  const deleteButton = (rowId: string, buttonId: string) => {
    setRows(prev => {
      const rowIndex = prev.findIndex(r => r.id === rowId);
      if (rowIndex === -1) return prev;
      
      const row = prev[rowIndex];
      const newButtons = row.buttons.filter(b => b.id !== buttonId);
      
      if (newButtons.length === 0) {
        return prev.filter(r => r.id !== rowId);
      }
      
      return prev.map(r => r.id === rowId ? { ...r, buttons: newButtons } : r);
    });
  };

  const reset = () => {
    setIsOpen(false);
    setRows([]);
  };

  return {
    isOpen,
    rows,
    toggle,
    addRow,
    addColumn,
    updateButton,
    deleteButton,
    reset,
  };
}
