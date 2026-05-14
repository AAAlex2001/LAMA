'use client';

import { FC, useState, useEffect } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import Step1DataType, { type ExportDataType } from './Step1DataType';
import Step2RecordsScope, { type ExportRecordsScope } from './Step2RecordsScope';
import Step3Format, { type ExportFormat } from './Step3Format';
import styles from './styles.module.scss';

export interface ExportDataPayload {
  dataType: ExportDataType;
  scope: ExportRecordsScope;
  format: ExportFormat;
}

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (payload: ExportDataPayload) => void;
  periodLabel?: string;
}

const DEFAULT_DATA_TYPE: ExportDataType = {
  generalIncome: true,
  generalExpense: true,
  adsIncome: true,
  adsExpense: true,
};

const ExportDataModal: FC<ExportDataModalProps> = ({ isOpen, onClose, onExport, periodLabel }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dataType, setDataType] = useState<ExportDataType>(DEFAULT_DATA_TYPE);
  const [scope, setScope] = useState<ExportRecordsScope>('filtered');
  const [format, setFormat] = useState<ExportFormat>('xlsx');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDataType(DEFAULT_DATA_TYPE);
      setScope('filtered');
      setFormat('xlsx');
    }
  }, [isOpen]);

  const hasAnyDataType = Object.values(dataType).some(Boolean);

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleExport = () => {
    onExport({ dataType, scope, format });
    onClose();
  };

  const titleByStep = `Экспорт данных. Шаг ${step} из 3`;
  const subtitleByStep =
    step === 1 ? 'Выберите тип данных для экспорта' :
    step === 2 ? 'Определите какие записи включить в файл' :
    'Выберите формат для скачивания';

  return (
    <ModalBase isOpen={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <ModalBase.Content size="md" padding="sm" className={styles.modal}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.title}>{titleByStep}</h3>
            <p className={styles.subtitle}>{subtitleByStep}</p>
          </div>

          {step === 1 && <Step1DataType value={dataType} onChange={setDataType} />}
          {step === 2 && <Step2RecordsScope value={scope} onChange={setScope} periodLabel={periodLabel} />}
          {step === 3 && <Step3Format value={format} onChange={setFormat} />}

          <div className={styles.footer}>
            <Button
              variant="outline"
              intent="gradient"
              size="lg"
              className={styles.cancelBtn}
              onClick={step === 1 ? onClose : handleBack}
            >
              {step === 1 ? 'Отмена' : 'Назад'}
            </Button>
            {step < 3 ? (
              <Button
                variant="fill"
                intent="gradient"
                size="lg"
                className={styles.primaryBtn}
                onClick={handleNext}
                disabled={step === 1 && !hasAnyDataType}
              >
                Продолжить
              </Button>
            ) : (
              <Button
                variant="fill"
                intent="gradient"
                size="lg"
                className={styles.primaryBtn}
                onClick={handleExport}
              >
                Скачать файл
              </Button>
            )}
          </div>
        </div>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default ExportDataModal;
