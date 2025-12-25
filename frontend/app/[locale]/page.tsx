import Header from "../landing/header/header";
import Hero from "../landing/hero/hero";
import Advantages from "../landing/advantages/advantages";
import Users from "../landing/users/users";
import KeyAdvantages from "../landing/key-advantages/key-advantages";
import Pricing from "../landing/pricing/pricing";
import FAQ from "../landing/faq/faq";
import FAQDecoration from "../landing/faq-decoration/faq-decoration";
import Footer from "../landing/footer/footer";
import SidebarMenu from "@/components/sidebar-menu/sidebar-menu";

type Props = {
  params: Promise<{ locale: string }>;
};

const localeNames = {
  ru: 'Русский',
  sr: 'Српски',
  en: 'English',
};

export async function generateStaticParams() {
  return [
    { locale: 'ru' },
    { locale: 'sr' },
    { locale: 'en' },
  ];
}

export default async function LocalePage({ params }: Props) {
  const { locale } = await params;

  return (
    <main>
      <Header locale={locale} />
      <Hero locale={locale} />
      <div id="advantages">
        <Advantages locale={locale} />
      </div>
      <div id="users">
        <Users locale={locale} />
      </div>
      <div id="key-advantages">
        <KeyAdvantages locale={locale} />
      </div>
      <div id="pricing">
        <Pricing locale={locale} />
      </div>
      <div id="faq">
        <FAQ locale={locale} />
      </div>
      <FAQDecoration />
      <Footer locale={locale} />
      <SidebarMenu />
    </main>
  );
}
