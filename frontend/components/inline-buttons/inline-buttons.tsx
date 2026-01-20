'use client';

import { useState } from 'react';
import styles from './inline-buttons.module.scss';
import Input from '@/components/input';
import Button from '@/components/button/button';
import { PlusIcon } from '@/components/icons';
import Dropdown, { ButtonTypeOption } from '@/components/dropdown/dropdown';
import { useInlineButtons } from './InlineButtonsContext';

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
}

export default function InlineButtons({ className }: InlineButtonsProps) {
  const { rows, isOpen, addColumn, addRow, updateButton, deleteButton } = useInlineButtons();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  if (!isOpen) return null;

  const allButtons: { rowIndex: number; btnIndex: number; button: InlineButton; number: number }[] = [];
  let buttonCounter = 1;
  rows.forEach((row, rowIndex) => {
    row.buttons.forEach((button, btnIndex) => {
      allButtons.push({ rowIndex, btnIndex, button, number: buttonCounter });
      buttonCounter++;
    });
  });

  const getButtonNumber = (rowIndex: number, btnIndex: number) => {
    const found = allButtons.find(b => b.rowIndex === rowIndex && b.btnIndex === btnIndex);
    return found?.number || 1;
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.tableContainer}>
        <div className={styles.tableTop}>
          <button type="button" className={styles.addColumnButton} onClick={addColumn}>
            <PlusIcon width={16} height={16} />
            <span>Столбец</span>
          </button>
        </div>
        
        <div className={styles.tableBody}>
          <div className={styles.tableLeft}>
            <button type="button" className={styles.addRowButton} onClick={addRow}>
              <PlusIcon width={16} height={16} />
              <span>Ряд</span>
            </button>
          </div>
          
          <div className={styles.buttonsGrid}>
            {rows.map((row, rowIndex) => (
              <div key={row.id} className={styles.buttonRow}>
                {row.buttons.map((button, btnIndex) => {
                  const btnNumber = getButtonNumber(rowIndex, btnIndex);
                  const isHovered = hoveredButton === button.id;
                  return (
                    <Button
                      key={button.id}
                      text={isHovered ? 'Удалить' : `Кнопка ${btnNumber}`}
                      variant="inlineButton"
                      showArrow={false}
                      onClick={() => deleteButton(rowIndex, btnIndex)}
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

      <div className={styles.editors}>
        {allButtons.map(({ rowIndex, btnIndex, button }) => {
          const btnNumber = getButtonNumber(rowIndex, btnIndex);
          
          const getPlaceholder = () => {
            switch (button.type) {
              case 'url': return 'Введите URL';
              case 'hidden_text': return 'Введите скрытый текст';
              case 'callback': return 'Введите callback data';
            }
          };

          const getSecondFieldValue = () => {
            switch (button.type) {
              case 'url': return button.url || '';
              case 'hidden_text': return button.hidden_text || '';
              case 'callback': return button.callback_data || '';
            }
          };

          const handleSecondFieldChange = (value: string) => {
            switch (button.type) {
              case 'url':
                updateButton(rowIndex, btnIndex, { url: value });
                break;
              case 'hidden_text':
                updateButton(rowIndex, btnIndex, { hidden_text: value });
                break;
              case 'callback':
                updateButton(rowIndex, btnIndex, { callback_data: value });
                break;
            }
          };
          
          return (
            <div key={button.id} className={styles.editor}>
              <div className={styles.editorHeader}>
                <span className={styles.buttonLabel}>Кнопка {btnNumber}</span>
                <Dropdown
                  variant="button-type"
                  label="Тип кнопки"
                  buttonTypeValue={button.type as ButtonTypeOption}
                  onButtonTypeChange={(value: ButtonTypeOption) => {
                    updateButton(rowIndex, btnIndex, { 
                      type: value as ButtonType,
                      url: value === 'url' ? button.url : undefined,
                      hidden_text: value === 'hidden_text' ? button.hidden_text : undefined,
                      callback_data: value === 'callback' ? button.callback_data : undefined,
                    });
                  }}
                  className={styles.typeDropdown}
                />
              </div>
              
              <div className={styles.editorFields}>
                <Input
                  value={button.text}
                  onChange={(value) => updateButton(rowIndex, btnIndex, { text: value })}
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
        })}
      </div>
    </div>
  );
}
