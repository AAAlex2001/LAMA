import { AppLayout } from '@/components/app-layout';
import { BotsProvider } from '../provider';
import BotSettingsView from './BotSettingsView';

interface BotSettingsPageProps {
  params: Promise<{ id: string }>;
}

const BotSettingsPage = async ({ params }: BotSettingsPageProps) => {
  const { id } = await params;

  return (
    <AppLayout pageTitle="Настройки бота">
      <BotsProvider>
        <BotSettingsView botId={Number(id)} />
      </BotsProvider>
    </AppLayout>
  );
};

export default BotSettingsPage;
