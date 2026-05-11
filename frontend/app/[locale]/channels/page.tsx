import { AppLayout } from '@/components/app-layout';
import ChannelsView from './ChannelsView';

const ChannelsPage = () => {
  return (
    <AppLayout pageTitle="Каналы и группы">
      <ChannelsView />
    </AppLayout>
  );
};

export default ChannelsPage;
