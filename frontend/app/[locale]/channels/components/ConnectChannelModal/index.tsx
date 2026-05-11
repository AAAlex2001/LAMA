'use client';

import { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ConnectChannelModal from '@/components/connect-channel-modal';

interface ChannelsConnectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChannelsConnectModal: FC<ChannelsConnectModalProps> = ({ isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['channels'] });
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
