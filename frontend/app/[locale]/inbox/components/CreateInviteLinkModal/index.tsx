'use client';

import React, { useEffect, useState } from 'react';
import ModalBase from '@/components/modal-base';
import Loader from '@/components/loader/loader';
import styles from './styles.module.scss';
import InviteForm from './components/InviteForm';
import ConfirmInviteStep from './components/ConfirmInviteStep';
import { InvitationLink } from '../LinkInvitesModal';
import { ChannelBasic } from '@/types';
import {
  useAppSelector,
  useAppDispatch,
  setModalOpen,
  setStep,
  setSelectedChannelId,
  setEditingLinkIds,
  populateFormFromInviteLink,
  resetForm,
  buildPreviewData,
  inboxStore,
} from '../../store';
import { useInviteLinkByIdQuery, usePatchInviteLinkMutation } from '@/store/inbox';
import { useChannelsQuery } from '@/store/channels';
import { useCreateInviteLink } from '../../store/hooks/useCreateInviteLink';
import { useNotifications } from '@/components/notifications/NotificationProvider';

export interface ChannelSimple {
  id: string;
  name: string;
}

interface CreateInviteLinkModalProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  channels?: ChannelSimple[];
  onCreateLink?: (data: InviteLinkData) => void;
  editingInvite?: InvitationLink | null;
}

export interface InviteLinkData {
  channelId: string;
  linkName: string;
  hasLimit: boolean;
  limitCount?: number;
  linkType: 'open' | 'closed';
  validityPeriod: 'indefinite' | 'date';
  expirationDate?: string;
  expirationHours?: number;
  expirationMinutes?: number;
  connectionMethod?: 'hasCaptcha' | 'noCaptcha';
  loginMethod?: 'direct' | 'bot';
  joiningText?: string;
  applicationMethod?: 'direct' | 'bot';
  hasCaptcha?: boolean;
}

const CreateInviteLinkModal: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateLink: (data: InviteLinkData) => void;
  linkId?: number;
  channelId?: number;
}> = ({
  isOpen,
  onOpenChange,
  onCreateLink,
  linkId = undefined,
  channelId = undefined,
}) => {
  const dispatch = useAppDispatch();
  const channelsQuery = useChannelsQuery();
  const channelsState = channelsQuery.data?.items ?? [];
  const modalState = useAppSelector((state) => state.createInviteLinkModal);
  const { showSuccess, showError } = useNotifications();
  const patchMutation = usePatchInviteLinkMutation();
  const inviteLinkQuery = useInviteLinkByIdQuery(channelId ?? null, linkId ?? null);
  const isFetchingLink = inviteLinkQuery.isLoading && !!linkId && !!channelId;
  const isUpdatingLink = patchMutation.isPending;
  
  const channelsOptions = channelsState.map(ch => ({
    id: ch.id,
    title: ch.title,
    members_count: ch.members_count,
    photo_url: ch.photo_url,
    selected: ch.selected,
  })) satisfies ChannelBasic[];
  
  const maxChannels = 10;
  
  useEffect(() => {
    dispatch(setModalOpen(isOpen));

    if (isOpen) {
      if (linkId && channelId) {
        dispatch(setStep('confirm'));
      } else {
        dispatch(setStep('form'));
      }
      if (channelId && !linkId) {
        dispatch(setSelectedChannelId(channelId.toString()));
      }
    }
  }, [isOpen, linkId, channelId, dispatch]);
  
  useEffect(() => {
    if (linkId && channelId && !isNaN(channelId) && !isNaN(linkId)) {
      dispatch(setEditingLinkIds({ linkId, channelId }));
    } else if (!linkId && !channelId) {
      dispatch(setEditingLinkIds(null));
    }
  }, [linkId, channelId, dispatch]);

  // Подхватываем загруженную через TQ ссылку и заполняем форму
  useEffect(() => {
    if (inviteLinkQuery.data) {
      dispatch(populateFormFromInviteLink(inviteLinkQuery.data));
      dispatch(buildPreviewData());
    }
  }, [inviteLinkQuery.data, dispatch]);
  
  const handleEditingConfirm = async () => {
    if (!linkId || !channelId) return;
    
    dispatch(buildPreviewData());
    const previewData = inboxStore.getState().createInviteLinkModal.previewData;
    
    if (!previewData) return;

    try {
      let expireDate: string | undefined;
      if (previewData.validityPeriod === 'date' && previewData.expirationDate) {
        const expirationDateTime = new Date(previewData.expirationDate);
        expirationDateTime.setHours(previewData.expirationHours || 0);
        expirationDateTime.setMinutes(previewData.expirationMinutes || 0);
        expirationDateTime.setSeconds(0);
        expirationDateTime.setMilliseconds(0);
        expireDate = expirationDateTime.toISOString();
      }

      const protectionType = previewData.linkType === 'closed'
        ? (previewData.hasCaptcha ? 'captcha' as const : 'none' as const)
        : (previewData.connectionMethod === 'hasCaptcha' ? 'captcha' as const : 'none' as const);
      const entryMethod = previewData.linkType === 'closed'
        ? (previewData.applicationMethod || 'direct') as 'direct' | 'bot'
        : (previewData.loginMethod || 'direct') as 'direct' | 'bot';

      const patchData = {
        name: previewData.linkName || '',
        expire_date: expireDate || null,
        member_limit: previewData.hasLimit && previewData.limitCount ? previewData.limitCount : 0,
        creates_join_request: previewData.linkType === 'closed',
        protection_type: protectionType,
        entry_method: entryMethod,
      };

      const updatedInviteLink = await patchMutation.mutateAsync({
        channelId,
        linkId,
        data: patchData,
      });

      try {
        await navigator.clipboard.writeText(updatedInviteLink.invite_link);
        showSuccess('Ссылка-приглашение успешно обновлена. Ссылка скопирована в буфер обмена.');
      } catch {
        showSuccess('Ссылка-приглашение успешно обновлена');
      }
      onCreateLink?.(previewData);
      onOpenChange?.(false);
    } catch (error) {
      const message = (() => {
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        return 'Не удалось обновить ссылку-приглашение';
      })();
      showError(message);
    }
  };

  const handleReset = () => {
    dispatch(resetForm());
  };

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const selectedChannel = channelsOptions.find((channel) => 
    channel.id.toString() === modalState.selectedChannelId
  ) as ChannelBasic | undefined;

  const handleEdit = () => {
    dispatch(setStep('form'));
  };

  const { createInviteLink, isLoading: isCreatingLink } = useCreateInviteLink();

  const handleConfirm = async () => {
    if (!modalState.previewData) return;
    
    try {
      const inviteLink = await createInviteLink(modalState.previewData);
      try {
        await navigator.clipboard.writeText(inviteLink.invite_link);
        showSuccess('Ссылка-приглашение успешно создана. Ссылка скопирована в буфер обмена.');
      } catch {
        showSuccess('Ссылка-приглашение успешно создана');
      }
      onCreateLink?.(modalState.previewData!);
      onOpenChange?.(false);
    } catch (error) {
      const message = (() => {
        if (typeof error === 'string') return error;
        if (error instanceof Error) return error.message;
        return 'Не удалось создать ссылку-приглашение';
      })();
      showError(message);
    }
  };

  const handleBack = () => {
    dispatch(setStep('form'));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleReset();
    }
    onOpenChange?.(open);
  };

  return (
    <ModalBase isOpen={isOpen} onOpenChange={handleOpenChange}>
      <ModalBase.Content size="lg" className={styles.modalContent}>
        <ModalBase.Header className={styles.modalHeader}>
          <ModalBase.Title>
            {modalState.step === 'form'
              ? (modalState.editingLinkId ? 'Редактирование ссылки-приглашения' : 'Создание ссылки-приглашения')
              : (modalState.editingLinkId ? 'Подтверждение редактирования ссылки-приглашения' : 'Подтверждение ссылки-приглашения')}
          </ModalBase.Title>
          {modalState.step === 'form' && <ModalBase.Close/>}
        </ModalBase.Header>
        {modalState.step === 'form' && (
          <ModalBase.Body className={styles.modalBody}>
            <InviteForm
              channels={channelsOptions}
              maxChannels={maxChannels}
              onEditingConfirm={handleEditingConfirm}
              fixedChannelId={channelId}
            />
          </ModalBase.Body>
        )}
        {modalState.step === 'confirm' && !modalState.previewData && isFetchingLink && (
          <ModalBase.Body className={styles.modalBody}>
            <div className={styles.loaderContainer}>
              <Loader size={32} color="blue" />
            </div>
          </ModalBase.Body>
        )}
        {modalState.step === 'confirm' && modalState.previewData && (
          <ConfirmInviteStep
            previewData={modalState.previewData}
            selectedChannel={selectedChannel}
            onBack={handleBack}
            onConfirm={modalState.editingLinkId ? handleEditingConfirm : handleConfirm}
            onEdit={handleEdit}
            onClose={() => onOpenChange(false)}
            isEditing={!!modalState.editingLinkId}
            isLoading={modalState.editingLinkId ? isUpdatingLink : isCreatingLink}
          />
        )}
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateInviteLinkModal;
