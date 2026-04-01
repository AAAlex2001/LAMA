import { AppLayout } from '@/components/app-layout';
import { BotsProvider } from './provider';
import BotsView from './BotsView';

const BotsPage = () => (
  <AppLayout pageTitle="Боты">
    <BotsProvider>
      <BotsView />
    </BotsProvider>
  </AppLayout>
);

export default BotsPage;
