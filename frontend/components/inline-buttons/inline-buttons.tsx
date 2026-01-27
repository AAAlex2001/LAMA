'use client';

import { useState } from 'react';
import styles from './inline-buttons.module.scss';
import Input from '@/components/input';
import Button from '@/components/button/button';
import { PlusIcon } from '@/components/icons';
import Dropdown, { ButtonTypeOption } from '@/components/dropdown/dropdown';

export type ButtonType = 'url' | 'callback' | 'hidden_text';

export interface InlineButton {
  id: string;
  text: string;
  type: ButtonType;
  url?: string;
  callback_data?: string;
  hidden_text?: string;
}

export interface ButtonRow {
  id: string;
  buttons: InlineButton[];
}

interface InlineButtonsProps {
  className?: string;
  isOpen: boolean;
  rows: ButtonRow[];
  onAddRow: () => void;
  onAddColumn: (rowId: string) => void;
  onUpdateButton: (rowId: string, buttonId: string, updates: Partial<InlineButton>) => void;
  onDeleteButton: (rowId: string, buttonId: string) => void;
}

export default function InlineButtons({
  className,
  isOpen,
  rows,
  onAddRow,
  onAddColumn,
  onUpdateButton,
  onDeleteButton,
}: InlineButtonsProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  if (!isOpen) return null;

  // Собираем все кнопки с их номерами
  const allButtons: Array<{
    rowId: string;
    button: InlineButton;
    number: number;
  }> = [];

  let counter = 1;
  for (const row of rows) {
    for (const button of row.buttons) {
      allButtons.push({ rowId: row.id, button, number: counter });
      counter++;
    }
  }

  const getButtonNumber = (buttonId: string): number => {
    const found = allButtons.find(b => b.button.id === buttonId);
    return found?.number ?? 1;
  };

  const handleAddColumn = () => {
    if (rows.length > 0) {
      onAddColumn(rows[rows.length - 1].id);
    }
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Сетка кнопок */}
      <div className={styles.tableContainer}>
        <div className={styles.tableTop}>
          <button type="button" className={styles.addColumnButton} onClick={handleAddColumn}>
            <PlusIcon width={16} height={16} />
            <span>Столбец</span>
          </button>
        </div>

        <div className={styles.tableBody}>
          <div className={styles.tableLeft}>
            <button type="button" className={styles.addRowButton} onClick={onAddRow}>
              <PlusIcon width={16} height={16} />
              <span>Ряд</span>
            </button>
          </div>

          <div className={styles.buttonsGrid}>
            {rows.map(row => (
              <div key={row.id} className={styles.buttonRow}>
                {row.buttons.map(button => {
                  const btnNumber = getButtonNumber(button.id);
                  const isHovered = hoveredButton === button.id;

                  return (
                    <Button
                      key={button.id}
                      text={isHovered ? 'Удалить' : `Кнопка ${btnNumber}`}
                      variant="inlineButton"
                      showArrow={false}
                      onClick={() => onDeleteButton(row.id, button.id)}
                      hovered={isHovered}
                      onMouseEnter={() => setHoveredButton(button.id)}
                      onMouseLeave={() => setHoveredButton(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Редакторы кнопок */}
      <div className={styles.editors}>
        {allButtons.map(({ rowId, button, number }) => (
          <ButtonEditor
            key={button.id}
            rowId={rowId}
            button={button}
            number={number}
            onUpdate={onUpdateButton}
          />
        ))}
      </div>
    </div>
  );
}

interface ButtonEditorProps {
  rowId: string;
  button: InlineButton;
  number: number;
  onUpdate: (rowId: string, buttonId: string, updates: Partial<InlineButton>) => void;
}

function ButtonEditor({ rowId, button, number, onUpdate }: ButtonEditorProps) {
  const getPlaceholder = (): string => {
    switch (button.type) {
      case 'url':
        return 'Введите URL';
      case 'hidden_text':
        return 'Введите скрытый текст';
      case 'callback':
        return 'Введите callback data';
    }
  };

  const getSecondFieldValue = (): string => {
    switch (button.type) {
      case 'url':
        return button.url || '';
      case 'hidden_text':
        return button.hidden_text || '';
      case 'callback':
        return button.callback_data || '';
    }
  };

  const handleSecondFieldChange = (value: string) => {
    switch (button.type) {
      case 'url':
        onUpdate(rowId, button.id, { url: value });
        break;
      case 'hidden_text':
        onUpdate(rowId, button.id, { hidden_text: value });
        break;
      case 'callback':
        onUpdate(rowId, button.id, { callback_data: value });
        break;
    }
  };

  const handleTypeChange = (newType: ButtonTypeOption) => {
    onUpdate(rowId, button.id, {
      type: newType as ButtonType,
      url: newType === 'url' ? button.url : undefined,
      hidden_text: newType === 'hidden_text' ? button.hidden_text : undefined,
      callback_data: newType === 'callback' ? button.callback_data : undefined,
    });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <span className={styles.buttonLabel}>Кнопка {number}</span>
        <Dropdown
          variant="button-type"
          label="Тип кнопки"
          buttonTypeValue={button.type as ButtonTypeOption}
          onButtonTypeChange={handleTypeChange}
          className={styles.typeDropdown}
        />
      </div>

      <div className={styles.editorFields}>
        <Input
          value={button.text}
          onChange={value => onUpdate(rowId, button.id, { text: value })}
          placeholder="Текст кнопки"
          className={styles.fieldInput}
        />
        <Input
          value={getSecondFieldValue()}
          onChange={handleSecondFieldChange}
          placeholder={getPlaceholder()}
          className={styles.fieldInput}
        />
      </div>
    </div>
  );
}
