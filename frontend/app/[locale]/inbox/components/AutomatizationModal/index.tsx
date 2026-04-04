'use client';

import React from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import buttonStyles from '@/components/new-button/styles.module.scss';
import styles from './styles.module.scss';

interface AutomatizationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onOpenAutoReply: () => void;
  onOpenTrigger: () => void;
  onOpenCommand: () => void;
}

const AutomatizationModal: React.FC<AutomatizationModalProps> = ({
  isOpen,
  onOpenChange,
  onOpenAutoReply,
  onOpenTrigger,
  onOpenCommand,
}) => {
  const handleAutoReplyClick = () => {
    onOpenAutoReply();
    onOpenChange(false);
  };

  const handleTriggerClick = () => {
    onOpenTrigger();
    onOpenChange(false);
  };

  const handleCommandClick = () => {
    onOpenCommand();
    onOpenChange(false);
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>Автоматизация действий</ModalBase.Title>
          <ModalBase.Close />
        </ModalBase.Header>

        <ModalBase.Body className={styles.modalBody}>
          <div className={styles.buttonsContainer}>
            {/* <Button 
              variant="fill" 
              intent="gradient"
              size="md"
              onClick={handleAutoReplyClick}
              className={styles.button}
              style={{ width: '100%' }}
            >
              <span className={buttonStyles.label}>Создать автоответ</span>
            </Button> */}
            <Button
              variant="fill" 
              intent="gradient"
              size="md"
              onClick={handleTriggerClick}
              className={styles.button}
              style={{ width: '100%' }}
            >
              <span className={buttonStyles.label}>Создать триггер</span>
            </Button>
            <Button 
              variant="fill" 
              intent="gradient"
              size="md"
              onClick={handleCommandClick}
              className={styles.button}
              style={{ width: '100%' }}
            >
              <span className={buttonStyles.label}>Создать команду</span>
            </Button>
          </div>
        </ModalBase.Body>
      </ModalBase.Content>
    </ModalBase>
  );
};

export default AutomatizationModal;
