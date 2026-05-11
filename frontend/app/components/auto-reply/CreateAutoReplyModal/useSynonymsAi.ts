'use client';

import { useState } from 'react';
import { API_BASE_URL } from '@/store/api';
import { useNotifications } from '@/components/notifications/NotificationProvider';

export function useSynonymsAi() {
  const { showError } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [forWord, setForWord] = useState('');

  const fetchSynonyms = async (word: string) => {
    if (!word) return;
    setLoading(true);
    setForWord(word);
    setSuggestions([]);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('lamaplanner_access_token') || '' : '';
      const response = await fetch(`${API_BASE_URL}/publications/ai/edit-text-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text: word,
          instruction: `Найди 6-8 синонимов для слова "${word}". Верни ТОЛЬКО слова через запятую. Без нумерации, без пояснений, без самого слова "${word}", без лишних символов.`,
        }),
      });

      if (!response.ok) throw new Error('AI error');

      const reader = response.body?.getReader();
      if (!reader) return;

      let raw = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }

      const text = raw
        .split('\n')
        .map((line) => (line.startsWith('data: ') ? line.slice(6) : line))
        .join('')
        .replace(/\[DONE\]/g, '')
        .trim();

      const words = text
        .split(/[,;\n]+/)
        .map((w) =>
          w
            .trim()
            .replace(/^\d+[\.)]\s*/, '')
            .replace(/[«»"'*_]/g, '')
            .trim(),
        )
        .filter((w) => w.length > 0 && w.length < 40 && w.toLowerCase() !== word.toLowerCase());

      if (words.length > 0) {
        setSuggestions(words.slice(0, 10));
      }
    } catch {
      showError('Не удалось получить синонимы');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => setSuggestions([]);

  return { loading, suggestions, forWord, fetchSynonyms, clear };
}
