'use client';

import { useEffect, useState } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './header-admin.module.scss';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

type NavLink = { text: string; href: string; order?: number };

type ToolsItem = { title: string; description?: string; href: string; order?: number };

type HeaderContent = {
  brandPrefix: string;
  brandSuffix: string;
  toolsLabel: string;
  toolsOrder?: number;
  loginText: string;
  loginHref: string;
  registerText: string;
  registerHref: string;
  telegramText: string;
  telegramHref: string;
  navLinks: NavLink[];
};

type ToolsContent = {
  items: ToolsItem[];
};

const emptyHeader: HeaderContent = {
  brandPrefix: '',
  brandSuffix: '',
  toolsLabel: '',
  toolsOrder: undefined,
  loginText: '',
  loginHref: '',
  registerText: '',
  registerHref: '',
  telegramText: '',
  telegramHref: '',
  navLinks: [],
};

const emptyTools: ToolsContent = {
  items: [],
};

export default function HeaderAdminPage() {
  const [locale, setLocale] = useState('ru');
  const [header, setHeader] = useState<HeaderContent>(emptyHeader);
  const [tools, setTools] = useState<ToolsContent>(emptyTools);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE_URL}/header?locale=${locale}`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/tools?locale=${locale}`).then((res) => res.json()),
    ])
      .then(([headerData, toolsData]) => {
        setHeader({ ...emptyHeader, ...headerData });
        setTools({ ...emptyTools, ...toolsData });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [locale]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const [headerRes, toolsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/header?locale=${locale}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(header),
        }),
        fetch(`${API_BASE_URL}/tools?locale=${locale}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tools),
        }),
      ]);

      if (headerRes.ok && toolsRes.ok) {
        setMessage('✅ Сохранено!');
      } else {
        setMessage('❌ Ошибка сохранения');
      }
    } catch {
      setMessage('❌ Ошибка сохранения');
    }
    setSaving(false);
  };

  const updateNavLink = (index: number, key: keyof NavLink, value: string | number | undefined) => {
    const next = [...header.navLinks];
    next[index] = { ...next[index], [key]: value };
    setHeader({ ...header, navLinks: next });
  };

  const addNavLink = () => {
    setHeader({ ...header, navLinks: [...header.navLinks, { text: '', href: '', order: undefined }] });
  };

  const removeNavLink = (index: number) => {
    const next = header.navLinks.filter((_, i) => i !== index);
    setHeader({ ...header, navLinks: next });
  };

  const updateToolItem = (index: number, key: keyof ToolsItem, value: string | number | undefined) => {
    const next = [...tools.items];
    next[index] = { ...next[index], [key]: value };
    setTools({ ...tools, items: next });
  };

  const addToolItem = () => {
    setTools({ ...tools, items: [...tools.items, { title: '', description: '', href: '', order: undefined }] });
  };

  const removeToolItem = (index: number) => {
    const next = tools.items.filter((_, i) => i !== index);
    setTools({ ...tools, items: next });
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Редактирование Header и Tools</h1>
          <select
            className={styles.localeSelector}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            <option value="ru">🇷🇺 Русский</option>
            <option value="sr">🇷🇸 Сербский</option>
            <option value="en">🇬🇧 Английский</option>
          </select>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        <div className={styles.form}>
          <div className={styles.section}>
            <h2>Бренд</h2>
            <label className={styles.field}>
              <span>Brand Prefix</span>
              <input
                type="text"
                value={header.brandPrefix}
                onChange={(e) => setHeader({ ...header, brandPrefix: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Brand Suffix</span>
              <input
                type="text"
                value={header.brandSuffix}
                onChange={(e) => setHeader({ ...header, brandSuffix: e.target.value })}
              />
            </label>
          </div>

          <div className={styles.section}>
            <h2>Навигация</h2>
            <label className={styles.field}>
              <span>Tools Label</span>
              <input
                type="text"
                value={header.toolsLabel}
                onChange={(e) => setHeader({ ...header, toolsLabel: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Tools Order</span>
              <input
                type="number"
                value={header.toolsOrder ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                  setHeader({ ...header, toolsOrder: value });
                }}
              />
            </label>

            <div className={styles.list}>
              {header.navLinks.map((link, idx) => (
                <div key={idx} className={styles.row}>
                  <input
                    type="number"
                    placeholder="Порядок"
                    value={link.order ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : Number(e.target.value);
                      updateNavLink(idx, 'order', value);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Текст"
                    value={link.text}
                    onChange={(e) => updateNavLink(idx, 'text', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Ссылка"
                    value={link.href}
                    onChange={(e) => updateNavLink(idx, 'href', e.target.value)}
                  />
                  <button type="button" className={styles.removeButton} onClick={() => removeNavLink(idx)}>
                    Удалить
                  </button>
                </div>
              ))}
              <button type="button" className={styles.addButton} onClick={addNavLink}>
                + Добавить ссылку
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Кнопки</h2>
            <label className={styles.field}>
              <span>Login Text</span>
              <input
                type="text"
                value={header.loginText}
                onChange={(e) => setHeader({ ...header, loginText: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Login Href</span>
              <input
                type="text"
                value={header.loginHref}
                onChange={(e) => setHeader({ ...header, loginHref: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Register Text</span>
              <input
                type="text"
                value={header.registerText}
                onChange={(e) => setHeader({ ...header, registerText: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Register Href</span>
              <input
                type="text"
                value={header.registerHref}
                onChange={(e) => setHeader({ ...header, registerHref: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Telegram Text</span>
              <input
                type="text"
                value={header.telegramText}
                onChange={(e) => setHeader({ ...header, telegramText: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span>Telegram Href</span>
              <input
                type="text"
                value={header.telegramHref}
                onChange={(e) => setHeader({ ...header, telegramHref: e.target.value })}
              />
            </label>
          </div>

          <div className={styles.section}>
            <h2>Инструменты</h2>
            <div className={styles.list}>
              {tools.items.map((item, idx) => (
                <div key={idx} className={styles.rowTools}>
                  <input
                    type="number"
                    placeholder="Порядок"
                    value={item.order ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : Number(e.target.value);
                      updateToolItem(idx, 'order', value);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Заголовок"
                    value={item.title}
                    onChange={(e) => updateToolItem(idx, 'title', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Описание"
                    value={item.description || ''}
                    onChange={(e) => updateToolItem(idx, 'description', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Ссылка"
                    value={item.href}
                    onChange={(e) => updateToolItem(idx, 'href', e.target.value)}
                  />
                  <button type="button" className={styles.removeButton} onClick={() => removeToolItem(idx)}>
                    Удалить
                  </button>
                </div>
              ))}
              <button type="button" className={styles.addButton} onClick={addToolItem}>
                + Добавить инструмент
              </button>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
