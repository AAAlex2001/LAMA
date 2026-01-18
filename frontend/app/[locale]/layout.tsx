import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "../globals.css";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        'ru': 'https://lamaplanner.com/ru',
        'sr': 'https://lamaplanner.com/sr',
        'en': 'https://lamaplanner.com/en',
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

export default async function LocaleLayout({ params, children }: Props) {
  const { locale } = await params;

  return (
    <html lang={locale} style={{ colorScheme: 'light' }}>
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YFR1RBS89M"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YFR1RBS89M');
          `}
        </Script>

        {/* Yandex.Metrika */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=106059433', 'ym');

            ym(106059433, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});
          `}
        </Script>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/106059433" style={{position:'absolute', left:'-9999px'}} alt="" />
          </div>
        </noscript>
      </head>
      <body
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter)" }}
      >
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
