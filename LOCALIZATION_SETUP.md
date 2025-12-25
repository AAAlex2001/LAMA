# Инструкция по настройке локализации

## Что уже сделано:

### Backend:
1. ✅ Добавлен enum `Locale` с поддержкой трех языков: ru, sr, en в `backend/models/landing.py`
2. ✅ Добавлено поле `locale` в модель `LandingContent`
3. ✅ Создана миграция БД `2025_12_25_1400_add_locale_to_landing_content.py`
4. ✅ Обновлены GET и PUT эндпоинты в `backend/routes/landing.py` для поддержки параметра `locale`

### Frontend:
1. ✅ Добавлена next-intl в package.json (нужно установить)

## Что нужно сделать:

### 1. Установить зависимости (Frontend):
```bash
cd frontend
npm install next-intl
```

### 2. Применить миграцию БД (Backend):
```bash
cd backend
alembic upgrade head
```

### 3. Обновить сервисы landing (Backend):

Нужно обновить все сервисы в `backend/services/landing/` чтобы они принимали параметр `locale`:

Пример для `hero.py`:
```python
async def get_hero_content(db: AsyncSession, locale: str = "ru"):
    # Добавить фильтрацию по локали
    contents = await db.execute(
        select(LandingContent).where(
            LandingContent.section_id == section.id,
            LandingContent.locale == locale  # ← Добавить эту строку
        ).order_by(LandingContent.order)
    )
    
async def save_hero_content(db: AsyncSession, ..., locale: str = "ru"):
    # При создании контента указывать локаль
    content = LandingContent(
        section_id=section.id,
        locale=locale,  # ← Добавить эту строку
        ...
    )
```

Аналогично обновить:
- `backend/services/landing/advantages.py`
- `backend/services/landing/key_advantages.py`
- `backend/services/landing/pricing.py`
- `backend/services/landing/faq.py`
- `backend/services/landing/users.py`
- `backend/services/landing/lama.py`
- `backend/services/landing/footer.py`

### 4. Настроить Next.js для локализации (Frontend):

#### 4.1. Создать `frontend/i18n.ts`:
```typescript
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

export const locales = ['ru', 'sr', 'en'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({locale}) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
```

#### 4.2. Обновить `frontend/next.config.ts`:
```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'https://lamaplanner.com/uploads/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
```

#### 4.3. Обновить структуру app/:
```
frontend/app/
  [locale]/
    layout.tsx
    page.tsx
    admin/
    landing/
    login/
```

#### 4.4. Создать файлы переводов:
```
frontend/messages/
  ru.json
  sr.json
  en.json
```

Пример `ru.json`:
```json
{
  "common": {
    "loading": "Загрузка...",
    "error": "Ошибка"
  }
}
```

#### 4.5. Создать `frontend/middleware.ts`:
```typescript
import createMiddleware from 'next-intl/middleware';
import {locales} from './i18n';

export default createMiddleware({
  locales,
  defaultLocale: 'ru',
  localePrefix: 'as-needed'
});

export const config = {
  matcher: ['/', '/(ru|sr|en)/:path*']
};
```

### 5. Обновить компоненты для использования локали:

В компонентах лендинга обновить API запросы:
```typescript
const locale = useLocale(); // из next-intl

// В fetch запросах добавлять параметр locale
fetch(`${API_BASE_URL}/hero?locale=${locale}`)
```

### 6. Добавить переключатель языков:

Создать компонент `LocaleSwitcher.tsx`:
```typescript
'use client';

import {useLocale} from 'next-intl';
import {useRouter, usePathname} from 'next/navigation';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div>
      <button onClick={() => switchLocale('ru')}>РУ</button>
      <button onClick={() => switchLocale('sr')}>СР</button>
      <button onClick={() => switchLocale('en')}>EN</button>
    </div>
  );
}
```

## Дополнительно:

### Админка для управления переводами:

В админке можно добавить выбор локали при редактировании контента:
```typescript
<select value={locale} onChange={(e) => setLocale(e.target.value)}>
  <option value="ru">Русский</option>
  <option value="sr">Српски</option>
  <option value="en">English</option>
</select>
```

### Примеры использования в компонентах:

```typescript
'use client';

import {useTranslations, useLocale} from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('common');
  const locale = useLocale();

  // Использование переводов
  const loadingText = t('loading');
  
  // Загрузка контента с учетом локали
  fetch(`/api/content?locale=${locale}`);
  
  return <div>{loadingText}</div>;
}
```
