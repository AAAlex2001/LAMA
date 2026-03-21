import { AppLayout } from '@/components/app-layout';
import { ChannelsProvider } from './store/provider';
import ChannelsView from './ChannelsView';

const ChannelsPage = () => {
  return (
    <AppLayout pageTitle="Каналы и группы">
      <ChannelsProvider>
        <ChannelsView />
      </ChannelsProvider>
    </AppLayout>
  );
};

export default ChannelsPage;
