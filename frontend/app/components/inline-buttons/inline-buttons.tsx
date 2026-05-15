'use client';

import { useState } from 'react';
import styles from './inline-buttons.module.scss';
import Input from '@/components/input';
import { Button } from '@/components/new-button';
import { PlusIcon } from '@/components/icons';
import InlineButtonTypePicker, { type ButtonTypeOption } from '@/components/inline-button-type-picker';
import CallbackActionPicker, { type CallbackActionOption } from '@/components/callback-action-picker';

export type ButtonType = 'url' | 'callback' | 'hidden_text';
export type CallbackAction = 'send_dm' | 'reply_in_chat' | 'track_click';

export interface InlineButton {
  id: string;
  text: string;
  type: ButtonType;
  url?: string;
  callback_action?: CallbackAction;
  callback_response?: string;
  hidden_text_subscribed?: string;
  hidden_text_unsubscribed?: string;
  hideButtonType?: boolean;
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
  hideButtonType?: boolean;
}

export default function InlineButtons({
  className,
  isOpen,
  rows,
  onAddRow,
  onAddColumn,
  onUpdateButton,
  onDeleteButton,
  hideButtonType = false,
}: InlineButtonsProps) {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  if (!isOpen) return null;

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

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.tableContainer}>
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
                <button
                  type="button"
                  className={styles.addColumnInRowButton}
                  onClick={() => onAddColumn(row.id)}
                  aria-label="Добавить кнопку в ряд"
                >
                  <PlusIcon width={16} height={16} />
                </button>
                {row.buttons.map(button => {
                  const btnNumber = getButtonNumber(button.id);
                  const isHovered = hoveredButton === button.id;

                  return (
                    <Button
                      key={button.id}
                      variant="outline"
                      intent={isHovered ? 'destructive' : 'neutral'}
                      size="sm"
                      onClick={() => onDeleteButton(row.id, button.id)}
                      onMouseEnter={() => setHoveredButton(button.id)}
                      onMouseLeave={() => setHoveredButton(null)}
                    >
                      {isHovered ? 'Удалить' : `Кнопка ${btnNumber}`}
                    </Button>
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
            hideButtonType={hideButtonType}
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
  hideButtonType?: boolean;
}

function ButtonEditor({ rowId, button, number, onUpdate, hideButtonType }: ButtonEditorProps) {
  const handleTypeChange = (newType: ButtonTypeOption) => {
    onUpdate(rowId, button.id, {
      type: newType as ButtonType,
      url: newType === 'url' ? button.url : undefined,
      hidden_text_subscribed: newType === 'hidden_text' ? button.hidden_text_subscribed : undefined,
      hidden_text_unsubscribed: newType === 'hidden_text' ? button.hidden_text_unsubscribed : undefined,
      callback_action: newType === 'callback' ? (button.callback_action || 'send_dm') : undefined,
      callback_response: newType === 'callback' ? button.callback_response : undefined,
    });
  };

  const handleCallbackActionChange = (action: CallbackActionOption) => {
    onUpdate(rowId, button.id, { callback_action: action as CallbackAction });
  };

  const topRow = (
    <div className={styles.editorTopRow}>
      <div className={styles.buttonLabel}>
        Кнопка {number}
      </div>
      {!hideButtonType && (
        <InlineButtonTypePicker
          label="Тип кнопки"
          buttonTypeValue={button.type as ButtonTypeOption}
          onButtonTypeChange={handleTypeChange}
          className={styles.typeDropdown}
        />
      )}
    </div>
  );

  if (button.type === 'hidden_text') {
    return (
      <div className={styles.editor}>
        {topRow}
        <div className={styles.editorBottomColumn}>
          <Input
            value={button.text}
            onChange={value => onUpdate(rowId, button.id, { text: value })}
            placeholder="Текст кнопки"
            className={styles.fullWidthInput}
          />
          <div className={styles.editorBottomRow}>
            <Input
              value={button.hidden_text_subscribed || ''}
              onChange={value => onUpdate(rowId, button.id, { hidden_text_subscribed: value })}
              placeholder="Текст для подписчиков"
              className={styles.bottomInput}
            />
            <Input
              value={button.hidden_text_unsubscribed || ''}
              onChange={value => onUpdate(rowId, button.id, { hidden_text_unsubscribed: value })}
              placeholder="Текст для не подписчиков"
              className={styles.bottomInput}
            />
          </div>
        </div>
      </div>
    );
  }

  if (button.type === 'callback') {
    return (
      <div className={styles.editor}>
        {topRow}
        <div className={styles.editorBottomColumn}>
          <Input
            value={button.text}
            onChange={value => onUpdate(rowId, button.id, { text: value })}
            placeholder="Текст кнопки"
            className={styles.fullWidthInput}
          />
          <div className={styles.editorBottomRow}>
            <CallbackActionPicker
              label="Действие после клика"
              callbackActionValue={(button.callback_action || 'send_dm') as CallbackActionOption}
              onCallbackActionChange={handleCallbackActionChange}
              className={styles.callbackActionDropdown}
            />
            <Input
              value={button.callback_response || ''}
              onChange={value => onUpdate(rowId, button.id, { callback_response: value })}
              placeholder="Текст ответа"
              className={styles.bottomInput}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      {topRow}
      <div className={styles.editorBottomRow}>
        <Input
          value={button.text}
          onChange={value => onUpdate(rowId, button.id, { text: value })}
          placeholder="Текст кнопки"
          className={styles.bottomInput}
        />
        <Input
          value={button.url || ''}
          onChange={value => onUpdate(rowId, button.id, { url: value })}
          placeholder="Введите URL"
          className={styles.bottomInput}
        />
      </div>
    </div>
  );
}
