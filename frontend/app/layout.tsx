import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import QueryProvider from '@/components/query-provider';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';

export const metadata: Metadata = {
  title: 'LAMAplanner',
  description: 'Telegram posting automation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning style={{ colorScheme: 'light' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
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
            <img src="https://mc.yandex.ru/watch/106059433" style={{ position: 'absolute', left: '-9999px' }} alt="" />
          </div>
        </noscript>
      </head>
      <body className="antialiased" style={{ fontFamily: 'Inter' }}>
        <QueryProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
