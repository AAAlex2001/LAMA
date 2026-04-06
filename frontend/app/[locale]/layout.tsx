import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
};

const localeData = {
  ru: {
    title: 'LAMAplanner - Планировщик постов для Telegram',
    description: 'Автоматизация постинга в Telegram. Планирование публикаций, управление ботами и каналами. Попробуйте бесплатно!',
  },
  sr: {
    title: 'LAMAplanner - Планер објава за Telegram',
    description: 'Аутоматизација објављивања на Telegram-у. Планирање публикација, управљање ботовима и каналима. Испробајте бесплатно!',
  },
  en: {
    title: 'LAMAplanner - Telegram Post Scheduler',
    description: 'Telegram posting automation. Schedule publications, manage bots and channels. Try it for free!',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const data = localeData[locale as keyof typeof localeData] || localeData.ru;

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `https://lamaplanner.com/${locale}`,
      languages: {
        ru: 'https://lamaplanner.com/ru',
        sr: 'https://lamaplanner.com/sr',
        en: 'https://lamaplanner.com/en',
      },
    },
    openGraph: {
      title: data.title,
      description: data.description,
      url: `https://lamaplanner.com/${locale}`,
      siteName: 'LAMAplanner',
      locale: locale,
      type: 'website',
    },
  };
}

export default function LocaleLayout({ children }: Props) {
  return children;
}
