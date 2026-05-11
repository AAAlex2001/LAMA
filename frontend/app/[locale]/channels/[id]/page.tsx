import { AppLayout } from '@/components/app-layout';
import ChannelSettingsView from './ChannelSettingsView';

interface ChannelSettingsPageProps {
  params: Promise<{ id: string }>;
}

const ChannelSettingsPage = async ({ params }: ChannelSettingsPageProps) => {
  const { id } = await params;

  return (
    <AppLayout pageTitle="Настройки канала">
      <ChannelSettingsView channelId={Number(id)} />
    </AppLayout>
  );
};

export default ChannelSettingsPage;
