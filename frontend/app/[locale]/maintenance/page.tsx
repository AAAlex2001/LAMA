import { Metadata } from 'next';
import MaintenanceClient from './MaintenanceClient';

export async function generateStaticParams(): Promise<Array<{ locale: string }>> {
  return [{ locale: 'ru' }, { locale: 'en' }, { locale: 'sr' }];
}

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles = {
    ru: 'Технические работы | LAMA Planner',
    en: 'Maintenance | LAMA Planner',
    sr: 'Održavanje | LAMA Planner',
  };

  const descriptions = {
    ru: 'Сайт временно недоступен. Следите за новостями в нашем Telegram канале.',
    en: 'Site temporarily unavailable. Follow our Telegram channel for updates.',
    sr: 'Sajt je privremeno nedostupan. Pratite naš Telegram kanal za ažuriranja.',
  };

  const title = titles[locale as keyof typeof titles] || titles.ru;
  const description = descriptions[locale as keyof typeof descriptions] || descriptions.ru;

  return {
    title,
    description,
  };
}

export default async function MaintenancePage({
  params,
}: Props) {
  const { locale } = await params;
  return <MaintenanceClient locale={locale} />;
}
