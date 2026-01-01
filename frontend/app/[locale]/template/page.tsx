import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TemplateAliasPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/template/1`);
}
