import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import RegisterClient from './RegisterClient';

export const dynamic = 'force-static';
export const revalidate = false;

export async function generateStaticParams(): Promise<Array<{ locale: string }>> {
  return [{ locale: 'ru' }, { locale: 'en' }, { locale: 'sr' }];
}

type Props = {
  params: Promise<{ locale: string }>;
};

const registerSeo = {
  ru: {
    title: 'Регистрация | LAMAplanner',
    description: 'Регистрация в LAMAplanner: вход через Telegram или Telegram-бота, затем добавление email для резервного доступа.',
  },
  en: {
    title: 'Sign up | LAMAplanner',
    description: 'Create a LAMAplanner account: sign up via Telegram or Telegram bot, then add email as a backup access method.',
  },
  sr: {
    title: 'Registracija | LAMAplanner',
    description: 'Registracija u LAMAplanner: prijava preko Telegrama ili Telegram bota, zatim dodavanje email-a kao rezervnog pristupa.',
  },
} as const;

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/maintenance`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const data = registerSeo[locale as keyof typeof registerSeo] || registerSeo.ru;
  const canonical = `https://lamaplanner.com/${locale}/register`;

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: data.title,
      description: data.description,
      url: canonical,
      siteName: 'LAMAplanner',
      locale,
      type: 'website',
    },
  };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/maintenance`);
}
