import { redirect } from 'next/navigation';

export const dynamic = 'force-static';
export const revalidate = false;

export async function generateStaticParams(): Promise<Array<{ locale: string }>> {
  return [{ locale: 'ru' }, { locale: 'en' }, { locale: 'sr' }];
}

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/maintenance`);
}
