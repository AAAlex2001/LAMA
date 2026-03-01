'use client';

import React, { useState } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import styles from './styles.module.scss';
import InviteForm from './InviteForm';
import ConfirmInviteStep from './ConfirmInviteStep';
import { InvitationLink } from '../LinkInvitesModal';

export interface Channel {
  id: string;
  name: string;
}

interface CreateInviteLinkModalProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  channels?: Channel[];
  onCreateLink?: (data: InviteLinkData) => void;
  editingIvite?: InvitationLink | null;
}

export interface InviteLinkData {
  channelId: string;
  linkName: string;
  hasLimit: boolean;
  limitCount?: number;
  linkType: 'open' | 'closed';
  validityPeriod: 'indefinite' | 'date';
  expirationDate?: Date;
  expirationHours?: number;
  expirationMinutes?: number;
  connectionMethod: 'protection' | 'normal';
  loginMethod: 'direct' | 'bot';
  // For closed links
  joiningText?: string;
  applicationMethod?: 'direct' | 'bot';
  hasCaptcha?: boolean;
}

// Mock data for testing
const MOCK_CHANNELS: Channel[] = [
  { id: '1', name: 'Общий канал' },
  { id: '2', name: 'Разработка' },
  { id: '3', name: 'Дизайн' },
  { id: '4', name: 'Маркетинг' },
  { id: '5', name: 'Поддержка клиентов' },
  { id: '6', name: 'Аналитика' },
  { id: '7', name: 'Новости' },
  { id: '8', name: 'Обсуждения' },
];

const CreateInviteLinkModal: React.FC<CreateInviteLinkModalProps> = ({
  isOpen,
  onOpenChange,
  channels = [],
  onCreateLink,
  editingIvite,
}) => {
  const channelsToUse = channels.length > 0 ? channels : MOCK_CHANNELS;
  const maxChannels = 10;
  const [channelSearch, setChannelSearch] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [linkName, setLinkName] = useState('');
  const [hasLimit, setHasLimit] = useState(false);
  const [limitCount, setLimitCount] = useState<string>('');
  const [linkType, setLinkType] = useState<'open' | 'closed'>('open');
  const [validityPeriod, setValidityPeriod] = useState<'indefinite' | 'date'>('indefinite');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [expirationHours, setExpirationHours] = useState(0);
  const [expirationMinutes, setExpirationMinutes] = useState(20);
  const [connectionMethod, setConnectionMethod] = useState<'protection' | 'normal'>('protection');
  const [loginMethod, setLoginMethod] = useState<'direct' | 'bot'>('direct');
  const [joiningText, setJoiningText] = useState('');
  const [applicationMethod, setApplicationMethod] = useState<'direct' | 'bot'>('direct');
  const [hasCaptcha, setHasCaptcha] = useState(false);

  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [previewData, setPreviewData] = useState<InviteLinkData | null>(null);

  React.useEffect(() => {
    if (editingIvite) {
      setStep('confirm');
      if (editingIvite.channelId) {
        setSelectedChannelId(editingIvite.channelId);
      }
      
      if (editingIvite.linkName) {
        setLinkName(editingIvite.linkName);
      }
      
      if (editingIvite.linkType) {
        setLinkType(editingIvite.linkType);
      }
      
      if (editingIvite.loginMethod) {
        setLoginMethod(editingIvite.loginMethod);
      }
      
      if (editingIvite.hasCaptcha !== undefined) {
        setHasCaptcha(editingIvite.hasCaptcha);
      }
      
      if (editingIvite.maxUses !== undefined) {
        setHasLimit(true);
        setLimitCount(editingIvite.maxUses.toString());
      }
      
      if (editingIvite.expirationDate) {
        setValidityPeriod('date');
        const dateParts = editingIvite.expirationDate.split('.');
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
          const year = 2000 + parseInt(dateParts[2], 10); // Assuming YY format
          const parsedDate = new Date(year, month, day);
          if (!isNaN(parsedDate.getTime())) {
            setExpirationDate(parsedDate);
          }
        }
      }
      
      const initialData: InviteLinkData = {
        channelId: editingIvite.channelId || '',
        linkName: editingIvite.linkName || '',
        hasLimit: editingIvite.maxUses !== undefined,
        limitCount: editingIvite.maxUses,
        linkType: editingIvite.linkType || 'open',
        validityPeriod: editingIvite.expirationDate ? 'date' : 'indefinite',
        expirationDate: editingIvite.expirationDate ? (() => {
          const dateParts = editingIvite.expirationDate!.split('.');
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = 2000 + parseInt(dateParts[2], 10);
            const parsedDate = new Date(year, month, day);
            return !isNaN(parsedDate.getTime()) ? parsedDate : undefined;
          }
          return undefined;
        })() : undefined,
        expirationHours: editingIvite.expirationDate ? 0 : undefined,
        expirationMinutes: editingIvite.expirationDate ? 0 : undefined,
        connectionMethod: 'protection',
        loginMethod: editingIvite.loginMethod || 'direct',
        joiningText: editingIvite.linkType === 'closed' ? '' : undefined,
        applicationMethod: editingIvite.linkType === 'closed' ? 'direct' : undefined,
        hasCaptcha: editingIvite.linkType === 'closed' ? (editingIvite.hasCaptcha || false) : undefined,
      };
      
      setPreviewData(initialData);
    }
  }, [editingIvite]);

  React.useEffect(() => {
    if (channelsToUse.length > 0 && !selectedChannelId && !editingIvite) {
      setSelectedChannelId(channelsToUse[0].id);
    }
  }, [channelsToUse, selectedChannelId, editingIvite]);

  const buildInviteData = (): InviteLinkData => ({
    channelId: selectedChannelId,
    linkName,
    hasLimit,
    limitCount: hasLimit ? parseInt(limitCount) : undefined,
    linkType,
    validityPeriod,
    expirationDate: validityPeriod === 'date' && expirationDate ? expirationDate : undefined,
    expirationHours: validityPeriod === 'date' ? expirationHours : undefined,
    expirationMinutes: validityPeriod === 'date' ? expirationMinutes : undefined,
    connectionMethod,
    loginMethod,
    joiningText: linkType === 'closed' ? joiningText : undefined,
    applicationMethod: linkType === 'closed' ? applicationMethod : undefined,
    hasCaptcha: linkType === 'closed' ? hasCaptcha : undefined,
  });

  const handleSubmit = () => {
    const data = buildInviteData();
    setPreviewData(data);
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (!previewData) return;
    onCreateLink?.(previewData);
    onOpenChange?.(false);
  };

  const handleBack = () => {
    setStep('form');
  };

  const handleReset = () => {
    setChannelSearch('');
    setLinkName('');
    setHasLimit(false);
    setLimitCount('');
    setLinkType('open');
    setValidityPeriod('indefinite');
    setExpirationDate(null);
    setExpirationHours(0);
    setExpirationMinutes(20);
    setConnectionMethod('protection');
    setLoginMethod('direct');
    setJoiningText('');
    setApplicationMethod('direct');
    setHasCaptcha(false);
    setStep('form');
    setPreviewData(null);
  };

  React.useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const selectedChannel = channelsToUse.find((channel) => channel.id === selectedChannelId);

  const handleEdit = () => {
    setStep('form');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleReset();
    }
    onOpenChange?.(open);
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={handleOpenChange}>
      <ModalBase.Content size="md" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>
            {step === 'form'
              ? (editingIvite ? 'Редактирование ссылки-приглашения' : 'Создание ссылки-приглашения')
              : (editingIvite ? 'Подтверждение редактирования ссылки-приглашения' : 'Подтверждение ссылки-приглашения')}
          </ModalBase.Title>
          {step === 'form' && <ModalBase.Close/>}
        </ModalBase.Header>

        {step === 'form' && (
          <ModalBase.Body className={styles.modalBody}>
            <InviteForm
              channels={channelsToUse}
              maxChannels={maxChannels}
              channelSearch={channelSearch}
              onChannelSearchChange={setChannelSearch}
              selectedChannelId={selectedChannelId}
              onChannelSelect={setSelectedChannelId}
              linkName={linkName}
              onLinkNameChange={setLinkName}
              hasLimit={hasLimit}
              onHasLimitChange={setHasLimit}
              limitCount={limitCount}
              onLimitCountChange={setLimitCount}
              linkType={linkType}
              onLinkTypeChange={setLinkType}
              validityPeriod={validityPeriod}
              onValidityPeriodChange={setValidityPeriod}
              expirationDate={expirationDate}
              onExpirationDateChange={setExpirationDate}
              expirationHours={expirationHours}
              onExpirationHoursChange={setExpirationHours}
              expirationMinutes={expirationMinutes}
              onExpirationMinutesChange={setExpirationMinutes}
              connectionMethod={connectionMethod}
              onConnectionMethodChange={setConnectionMethod}
              loginMethod={loginMethod}
              onLoginMethodChange={setLoginMethod}
              joiningText={joiningText}
              onJoiningTextChange={setJoiningText}
              applicationMethod={applicationMethod}
              onApplicationMethodChange={setApplicationMethod}
              hasCaptcha={hasCaptcha}
              onHasCaptchaChange={setHasCaptcha}
            />

            <div className={styles.submitButtonContainer}>
              <Button
                variant="fill"
                intent="gradient"
                size="lg"
                onClick={handleSubmit}
                className={styles.submitButton}
              >
                Продолжить
              </Button>
            </div>
          </ModalBase.Body>
        )}

        {step === 'confirm' && previewData && (
          <ConfirmInviteStep
            previewData={previewData}
            selectedChannel={selectedChannel}
            onBack={handleBack}
            onConfirm={handleConfirm}
            onEdit={handleEdit}
            editingIvite={editingIvite}
          />
        )}
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateInviteLinkModal;
