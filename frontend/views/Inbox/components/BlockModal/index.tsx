'use client';

import { useState } from 'react';
import ModalBase from '@/components/modal-base';
import Checkbox from '@/components/checkbox/checkbox';
import Toggle from '@/components/toggle/toggle';
import Button from '@/components/button/button';
import { WheelPicker } from '@/components/wheel-picker';
import styles from './styles.module.scss';

interface BlockModalProps {
  isOpen: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  stopWord?: string;
  message?: string;
  onSave?: (data: BlockModalData) => void;
}

export interface BlockModalData {
  blockType: 'ban' | 'mute';
  days: number;
  hours: number;
  minutes: number;
  forever: boolean;
  blockEverywhere: boolean;
}

export default function BlockModal({
  isOpen,
  onOpenChange,
  stopWord = 'spam',
  message = 'Купи сейчас...',
  onSave,
}: BlockModalProps) {
  const [blockType, setBlockType] = useState<'ban' | 'mute'>('ban');
  const [days, setDays] = useState(6);
  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(7);
  const [forever, setForever] = useState(false);
  const [blockEverywhere, setBlockEverywhere] = useState(false);

  const handleSave = () => {
    onSave?.({
      blockType,
      days,
      hours,
      minutes,
      forever,
      blockEverywhere,
    });
    onOpenChange?.(false);
  };

  const handlePreset = (presetHours: number) => {
    const totalHours = presetHours;
    const newDays = Math.floor(totalHours / 24);
    const newHours = totalHours % 24;
    setDays(newDays);
    setHours(newHours);
    setMinutes(0);
    setForever(false);
  };

  const handlePresetDays = (presetDays: number) => {
    setDays(presetDays);
    setHours(0);
    setMinutes(0);
    setForever(false);
  };

  const handlePresetHour = () => {
    setDays(0);
    setHours(1);
    setMinutes(0);
    setForever(false);
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content className={styles.modalContent} size="sm">
        <div className={styles.headerWrapper}>
          <ModalBase.Close className={styles.closeButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </ModalBase.Close>
        </div>
        <ModalBase.Header>
          <ModalBase.Title className={styles.title}>Причина блокировки</ModalBase.Title>
        </ModalBase.Header>

        <ModalBase.Body className={styles.body}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Причина блокировки</h3>
            <div className={styles.reasonList}>
              <div className={styles.reasonItem}>
                <span className={styles.reasonLabel}>Стоп-слово:</span>
                <span className={styles.reasonValue}>"{stopWord}"</span>
              </div>
              <div className={styles.reasonItem}>
                <span className={styles.reasonLabel}>Сообщение:</span>
                <span className={styles.reasonValue}>"{message}"</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Тип блокировки</h3>
            <div className={styles.blockTypeOptions}>
              <Checkbox
                checked={blockType === 'ban'}
                onChange={() => setBlockType('ban')}
                variant="radio"
                label="Заблокировать /ban"
                className={styles.radioOption}
              />
              <Checkbox
                checked={blockType === 'mute'}
                onChange={() => setBlockType('mute')}
                variant="radio"
                label="Тишина /mute"
                className={styles.radioOption}
              />
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Срок блокировки</h3>
            
            {!forever && (
              <>
                <div className={styles.durationPicker}>
                  <div className={styles.labelsRow}>
                    <span className={styles.label}>дней</span>
                    <span className={styles.labelSpacer} />
                    <span className={styles.label}>часов</span>
                    <span className={styles.labelSpacer} />
                    <span className={styles.label}>минут</span>
                  </div>

                  <div className={styles.columnsWrapper}>
                    <WheelPicker
                      value={days}
                      onChange={setDays}
                      min={0}
                      max={365}
                    />
                    <div className={styles.separatorColumn}>
                      <span className={styles.separator}>&nbsp;</span>
                      <span className={styles.activeSeparator}>:</span>
                      <span className={styles.separator}>:</span>
                    </div>
                    <WheelPicker
                      value={hours}
                      onChange={setHours}
                      min={0}
                      max={23}
                    />
                    <div className={styles.separatorColumn}>
                      <span className={styles.separator}>&nbsp;</span>
                      <span className={styles.activeSeparator}>:</span>
                      <span className={styles.separator}>:</span>
                    </div>
                    <WheelPicker
                      value={minutes}
                      onChange={setMinutes}
                      min={0}
                      max={59}
                    />
                  </div>
                </div>
              </>
            )}

            <div className={styles.toggleOptions}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Навсегда</span>
                <Toggle
                  checked={forever}
                  onChange={(checked) => {
                    setForever(checked);
                    if (checked) {
                      setDays(0);
                      setHours(0);
                      setMinutes(0);
                    }
                  }}
                />
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Заблокировать везде</span>
                <Toggle
                  checked={blockEverywhere}
                  onChange={setBlockEverywhere}
                />
              </div>
            </div>
          </div>
        </ModalBase.Body>

        <ModalBase.Footer className={styles.footer}>
          <Button
            text="Сохранить изменения"
            onClick={handleSave}
            variant="default"
            fullWidth
          />
        </ModalBase.Footer>
      </ModalBase.Content>
    </ModalBase>
  );
}
