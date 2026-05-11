import { AppLayout } from '@/components/app-layout';
import BotSettingsView from './BotSettingsView';

interface BotSettingsPageProps {
  params: Promise<{ id: string }>;
}

const BotSettingsPage = async ({ params }: BotSettingsPageProps) => {
  const { id } = await params;

  return (
    <AppLayout pageTitle="Настройки бота">
      <BotSettingsView botId={Number(id)} />
    </AppLayout>
  );
};

export default BotSettingsPage;
