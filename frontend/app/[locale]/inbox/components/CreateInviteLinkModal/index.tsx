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
  useCreateInviteLink,
  useAppSelector,
  useAppDispatch,
  setModalOpen,
  setStep,
  setEditingLinkIds,
  populateFormFromInviteLink,
  resetForm,
  patchInviteLinkThunk,
  fetchInviteLinkByIdThunk,
  buildPreviewData,
  inboxStore,
  selectChannels,
} from '../../store';
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
  connectionMethod: 'protection' | 'normal';
  loginMethod: 'direct' | 'bot';
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
  const channelsState = useAppSelector(selectChannels);
  const modalState = useAppSelector((state) => state.createInviteLinkModal);
  const { showSuccess, showError } = useNotifications();
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [isUpdatingLink, setIsUpdatingLink] = useState(false);
  
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
    }
  }, [isOpen, linkId, channelId, dispatch]);
  
  useEffect(() => {
    if (linkId && channelId) {
      if (!isNaN(channelId) && !isNaN(linkId)) {
        setIsFetchingLink(true);
        dispatch(setEditingLinkIds({ linkId, channelId }));
        dispatch(fetchInviteLinkByIdThunk({ channelId, linkId }))
          .unwrap()
          .then((inviteLink) => {
            dispatch(populateFormFromInviteLink(inviteLink));
            dispatch(buildPreviewData());
          })
          .catch((error) => {
            console.error('Failed to fetch invite link:', error);
          })
          .finally(() => {
            setIsFetchingLink(false);
          });
      }
    } else if (!linkId && !channelId) {
      dispatch(setEditingLinkIds(null));
      setIsFetchingLink(false);
    }
  }, [linkId, channelId, dispatch]);
  
  const handleEditingConfirm = async () => {
    if (!linkId || !channelId) return;
    
    dispatch(buildPreviewData());
    const previewData = inboxStore.getState().createInviteLinkModal.previewData;
    
    if (!previewData) return;

    setIsUpdatingLink(true);
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

      const patchData = {
        name: previewData.linkName || '',
        expire_date: expireDate || null,
        member_limit: previewData.hasLimit && previewData.limitCount ? previewData.limitCount : 0,
        creates_join_request: previewData.linkType === 'closed',
      };

      await dispatch(patchInviteLinkThunk({
        channelId,
        inviteLinkId: linkId,
        patchData,
      })).unwrap();

      showSuccess('Ссылка-приглашение успешно обновлена');
      onCreateLink?.(previewData);
      onOpenChange?.(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось обновить ссылку-приглашение';
      showError(errorMessage);
    } finally {
      setIsUpdatingLink(false);
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

  const createInviteLinkMutation = useCreateInviteLink();

  const handleConfirm = async () => {
    if (!modalState.previewData) return;
    
    try {
      await createInviteLinkMutation.mutate(modalState.previewData, {
        onSuccess: () => {
          showSuccess('Ссылка-приглашение успешно создана');
          onCreateLink?.(modalState.previewData!);
          onOpenChange?.(false);
        },
        onError: (error) => {
          const errorMessage = error instanceof Error ? error.message : 'Не удалось создать ссылку-приглашение';
          showError(errorMessage);
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать ссылку-приглашение';
      showError(errorMessage);
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

        {isFetchingLink ? (
          <ModalBase.Body className={styles.modalBody}>
            <div className={styles.loaderContainer}>
              <Loader size={32} color="blue" />
            </div>
          </ModalBase.Body>
        ) : (
          <>
            {modalState.step === 'form' && (
              <ModalBase.Body className={styles.modalBody}>
                <InviteForm
                  channels={channelsOptions}
                  maxChannels={maxChannels}
                  onEditingConfirm={handleEditingConfirm}
                />
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
                isLoading={modalState.editingLinkId ? isUpdatingLink : createInviteLinkMutation.isLoading}
              />
            )}
          </>
        )}
      </ModalBase.Content>
    </ModalBase>
  );
};

export default CreateInviteLinkModal;
