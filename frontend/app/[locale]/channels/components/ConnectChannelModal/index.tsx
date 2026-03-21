'use client';

import { FC } from 'react';
import ConnectChannelModal from '@/components/connect-channel-modal';
import { useAppDispatch } from '../../store';
import { fetchChannelsThunk } from '@/store/channels';

interface ChannelsConnectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChannelsConnectModal: FC<ChannelsConnectModalProps> = ({ isOpen, onOpenChange }) => {
  const dispatch = useAppDispatch();

  const handleSuccess = () => {
    dispatch(fetchChannelsThunk({ force: true }));
  };

  return (
    <ConnectChannelModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSuccess={handleSuccess}
    />
  );
};

export default ChannelsConnectModal;
