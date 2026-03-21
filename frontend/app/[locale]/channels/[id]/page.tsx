import { AppLayout } from '@/components/app-layout';
import { ChannelsProvider } from '../store/provider';
import ChannelSettingsView from './ChannelSettingsView';

interface ChannelSettingsPageProps {
  params: Promise<{ id: string }>;
}

const ChannelSettingsPage = async ({ params }: ChannelSettingsPageProps) => {
  const { id } = await params;

  return (
    <AppLayout pageTitle="Настройки канала">
      <ChannelsProvider>
        <ChannelSettingsView channelId={Number(id)} />
      </ChannelsProvider>
    </AppLayout>
  );
};

export default ChannelSettingsPage;
