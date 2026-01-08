'use client';

import { useState, useEffect } from 'react';
import AdminMenu from '@/components/admin-menu/admin-menu';
import styles from './pricing-admin.module.scss';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface PricingPlan {
  title: string;
  price: string;
  features: string[];
  isHighlighted: boolean;
  buttonText: string;
  buttonUrl: string;
}

interface PricingContent {
  headline: string;
  subtitle: string;
  description: string;
  plans: PricingPlan[];
}

export default function PricingAdminPage() {
  const [locale, setLocale] = useState('ru');
  const [content, setContent] = useState<PricingContent>({
    headline: '',
    subtitle: '',
    description: '',
    plans: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/pricing?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        setContent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [locale]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/pricing?locale=${locale}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      if (res.ok) {
        setMessage('✅ Сохранено!');
      } else {
        setMessage('❌ Ошибка сохранения');
      }
    } catch {
      setMessage('❌ Ошибка сохранения');
    }
    setSaving(false);
  };

  const addPlan = () => {
    setContent({
      ...content,
      plans: [...content.plans, { title: '', price: '', features: [''], isHighlighted: false, buttonText: '', buttonUrl: '' }]
    });
  };

  const removePlan = (index: number) => {
    const newPlans = content.plans.filter((_, i) => i !== index);
    setContent({ ...content, plans: newPlans });
  };

  const updatePlan = (index: number, field: keyof PricingPlan, value: string | string[] | boolean) => {
    const newPlans = [...content.plans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setContent({ ...content, plans: newPlans });
  };

  const addFeature = (planIndex: number) => {
    const newPlans = [...content.plans];
    newPlans[planIndex].features.push('');
    setContent({ ...content, plans: newPlans });
  };

  const removeFeature = (planIndex: number, featureIndex: number) => {
    const newPlans = [...content.plans];
    newPlans[planIndex].features = newPlans[planIndex].features.filter((_, i) => i !== featureIndex);
    setContent({ ...content, plans: newPlans });
  };

  const updateFeature = (planIndex: number, featureIndex: number, value: string) => {
    const newPlans = [...content.plans];
    newPlans[planIndex].features[featureIndex] = value;
    setContent({ ...content, plans: newPlans });
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <AdminMenu />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Редактирование Pricing секции</h1>
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
            <h2>Тексты</h2>
            
            <label className={styles.field}>
              <span>Заголовок</span>
              <input
                type="text"
                value={content.headline}
                onChange={e => setContent({ ...content, headline: e.target.value })}
                placeholder="Выберите свой план"
              />
            </label>

            <label className={styles.field}>
              <span>Подзаголовок</span>
              <input
                type="text"
                value={content.subtitle}
                onChange={e => setContent({ ...content, subtitle: e.target.value })}
                placeholder="Решение для любого масштаба проектов"
              />
            </label>

            <label className={styles.field}>
              <span>Описание</span>
              <textarea
                value={content.description}
                onChange={e => setContent({ ...content, description: e.target.value })}
                placeholder="От личного блога до крупного проекта — управляйте контентом эффективно и выгодно"
                rows={3}
              />
            </label>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Планы</h2>
              <button className={styles.addButton} onClick={addPlan}>
                + Добавить план
              </button>
            </div>
            
            {content.plans.map((plan, index) => (
              <div key={index} className={styles.planEditor}>
                <div className={styles.planHeader}>
                  <h3>План {index + 1}</h3>
                  <button 
                    className={styles.removeButton}
                    onClick={() => removePlan(index)}
                  >
                    Удалить
                  </button>
                </div>

                <label className={styles.field}>
                  <span>Название плана</span>
                  <input
                    type="text"
                    value={plan.title}
                    onChange={e => updatePlan(index, 'title', e.target.value)}
                    placeholder="Базовый"
                  />
                </label>

                <label className={styles.field}>
                  <span>Цена</span>
                  <input
                    type="text"
                    value={plan.price}
                    onChange={e => updatePlan(index, 'price', e.target.value)}
                    placeholder="890 ₽/месяц"
                  />
                </label>

                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={plan.isHighlighted}
                    onChange={e => updatePlan(index, 'isHighlighted', e.target.checked)}
                  />
                  <span>Выделенный план</span>
                </label>

                <label className={styles.field}>
                  <span>Текст кнопки</span>
                  <input
                    type="text"
                    value={plan.buttonText}
                    onChange={e => updatePlan(index, 'buttonText', e.target.value)}
                    placeholder="Выбрать план"
                  />
                </label>

                <label className={styles.field}>
                  <span>Ссылка кнопки</span>
                  <input
                    type="text"
                    value={plan.buttonUrl}
                    onChange={e => updatePlan(index, 'buttonUrl', e.target.value)}
                    placeholder="/ru/login или https://example.com"
                  />
                </label>

                <div className={styles.featuresSection}>
                  <div className={styles.featuresHeader}>
                    <h4>Особенности</h4>
                    <button 
                      className={styles.addFeatureButton}
                      onClick={() => addFeature(index)}
                    >
                      + Добавить особенность
                    </button>
                  </div>
                  
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className={styles.featureRow}>
                      <input
                        type="text"
                        value={feature}
                        onChange={e => updateFeature(index, featureIndex, e.target.value)}
                        placeholder="Описание особенности"
                        className={styles.featureInput}
                      />
                      <button
                        className={styles.removeFeatureButton}
                        onClick={() => removeFeature(index, featureIndex)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <a href="/" className={styles.previewLink} target="_blank">
            Посмотреть на сайте →
          </a>
        </div>
      </div>
    </div>
  );
}

