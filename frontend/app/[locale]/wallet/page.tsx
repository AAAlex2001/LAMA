'use client';

import { AppLayout } from '@/components/app-layout';
import WalletPageView from './components/WalletPageView';

export default function WalletPage() {
  return (
    <AppLayout pageTitle="Рекламный кабинет">
      <WalletPageView />
    </AppLayout>
  );
}
