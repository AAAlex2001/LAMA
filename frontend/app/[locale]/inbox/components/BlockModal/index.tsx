'use client';

import { useState } from 'react';
import ModalBase from '@/components/modal-base';
import Checkbox from '@/components/checkbox/checkbox';
import Toggle from '@/components/toggle/toggle';
import { WheelPicker } from '@/components/wheel-picker';
import styles from './styles.module.scss';
import { Button } from '@/components/new-button';

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
      <ModalBase.Content size="sm">
        <ModalBase.Header className={styles.header}>
          <div className={styles.headerContent}>
            <ModalBase.Title className={styles.title}>Причина блокировки</ModalBase.Title>
            <ModalBase.Close />
          </div>
          <div className={styles.reasonList}>
            <div className={styles.reasonItem}>
              <div className={styles.bulletWrapper}>
                <div className={styles.bullet} />
                <span className={styles.reasonLabel}>Стоп-слово:</span>
              </div>
              <span className={styles.reasonValue}>"{stopWord}"</span>
            </div>
            <div className={styles.reasonItem}>
              <div className={styles.bulletWrapper}>
                <div className={styles.bullet} />
                <span className={styles.reasonLabel}>Сообщение:</span>
              </div>
              <span className={styles.reasonValue}>"{message}"</span>
            </div>
          </div>
        </ModalBase.Header>

        <ModalBase.Body className={styles.body}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Тип блокировки</h3>
            <div className={styles.blockTypeOptions}>
              <div className={styles.radioOptionWrapper}>
                <Checkbox
                  checked={blockType === 'ban'}
                  onChange={() => setBlockType('ban')}
                  variant="radio"
                  className={styles.radioOption}
                />
                <span className={styles.radioLabel}>Заблокировать</span>
                <span className={styles.radioSubLabel}>/ban</span>
              </div>
              <div className={styles.radioOptionWrapper}>
                <Checkbox
                checked={blockType === 'mute'}
                onChange={() => setBlockType('mute')}
                variant="radio"
                className={styles.radioOption}
                />
                <span className={styles.radioLabel}>Тишина</span>
                <span className={styles.radioSubLabel}>/mute</span>
              </div>
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
                    <WheelPicker
                      value={hours}
                      onChange={setHours}
                      min={0}
                      max={23}
                    />
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
            onClick={handleSave}
            variant="fill"
            intent="gradient"
            size="md"
            loading={false}
            disabled={false}
          >
            <span className={styles.buttonLabel}>Сохранить изменения</span>
          </Button>
        </ModalBase.Footer>
      </ModalBase.Content>
    </ModalBase>
  );
}
