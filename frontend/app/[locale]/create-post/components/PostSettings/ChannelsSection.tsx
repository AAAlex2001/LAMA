'use client';

import { FC, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ChannelPicker from '@/components/channel-picker';
import ConnectChannelModal from '@/components/connect-channel-modal';
import { useChannelsQuery, invalidateChannels } from '@/store/channels';
import { useAppDispatch, useAppSelector } from '../../store';
import { setSelectedChannelIds, toggleChannelId } from '../../store/slices/channelsSelection';
import { setShowCreateChannel } from '../../store/slices/settings';

interface ChannelsSectionProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

const ChannelsSection: FC<ChannelsSectionProps> = ({ isOpen, onToggle }) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const selectedIds = useAppSelector((s) => s.channelsSelection.selectedIds);
  const showCreateChannel = useAppSelector((s) => s.settings.showCreateChannel);

  const channelsQuery = useChannelsQuery();
  const channels = channelsQuery.data?.items ?? [];
  const selectedSet = new Set(selectedIds);

  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current) return;
    if (channels.length === 0) return;
    if (selectedIds.length > 0) {
      didAutoSelectRef.current = true;
      return;
    }
    dispatch(setSelectedChannelIds(channels.map((c) => c.id)));
    didAutoSelectRef.current = true;
  }, [channels, selectedIds.length, dispatch]);

  const channelOptions = channels.map((ch) => ({
    id: String(ch.id),
    label: ch.title,
    checked: selectedSet.has(ch.id),
    members_count: ch.members_count,
    photo_url: ch.photo_url,
  }));

  const handleChannelChange = (id: string) => {
    const numericId = parseInt(id, 10);
    if (!Number.isNaN(numericId)) dispatch(toggleChannelId(numericId));
  };

  return (
    <>
      <ChannelPicker
        label="Каналы и чаты для постинга"
        options={channelOptions}
        showSearch
        showCheckboxes
        onOptionChange={handleChannelChange}
        onAddNew={() => dispatch(setShowCreateChannel(true))}
        selectedCount={selectedIds.length}
        totalCount={channels.length}
        onOpen={() => channelsQuery.refetch()}
        loading={channelsQuery.isLoading}
        isOpen={isOpen}
        onToggle={onToggle}
        closeOnOutsideClick={false}
      />

      <ConnectChannelModal
        isOpen={showCreateChannel}
        onOpenChange={(open) => { if (!open) dispatch(setShowCreateChannel(false)); }}
        onSuccess={() => {
          invalidateChannels(queryClient);
          dispatch(setShowCreateChannel(false));
        }}
      />
    </>
  );
};

export default ChannelsSection;
