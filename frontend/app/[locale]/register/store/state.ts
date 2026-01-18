"use client";

import { useEffect, useReducer, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { RegisterAction, RegisterState, TelegramWidgetUser } from './types';
import { getAccessToken, handleAddEmail, handleTelegramRegister } from './actions';

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'LAMMAPLANNERBOT';

export const initialRegisterState: RegisterState = {
  step: 1,
  loading: false,
  error: null,
  status: 'idle',
  user: null,
  accessToken: null,
  email: '',
  password: '',
  agreePersonalData: false,
  agreeTerms: false,
};

export function registerReducer(state: RegisterState, action: RegisterAction): RegisterState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_ACCESS_TOKEN':
      return { ...state, accessToken: action.payload };
    case 'SET_EMAIL':
      return { ...state, email: action.payload };
    case 'SET_PASSWORD':
      return { ...state, password: action.payload };
    case 'SET_AGREE_PERSONAL_DATA':
      return { ...state, agreePersonalData: action.payload };
    case 'SET_AGREE_TERMS':
      return { ...state, agreeTerms: action.payload };
    case 'RESET':
      return initialRegisterState;
    default:
      return state;
  }
}

export function useRegister(locale: string = 'ru') {
  const [state, dispatch] = useReducer(registerReducer, initialRegisterState);
  const router = useRouter();
  const searchParams = useSearchParams();
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);

  const onTelegramAuth = useCallback(
    async (user: TelegramWidgetUser) => {
      dispatch({ type: 'SET_STATUS', payload: 'loading' });
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const result = await handleTelegramRegister(user);

      if (result.success) {
        dispatch({ type: 'SET_USER', payload: result.user ?? null });
        if (result.accessToken) {
          dispatch({ type: 'SET_ACCESS_TOKEN', payload: result.accessToken });
        }

        if (result.requiresEmailStep) {
          dispatch({ type: 'SET_STATUS', payload: 'idle' });
          dispatch({ type: 'SET_STEP', payload: 2 });
          dispatch({ type: 'SET_LOADING', payload: false });
          return true;
        }

        dispatch({ type: 'SET_STATUS', payload: 'success' });
        dispatch({ type: 'SET_LOADING', payload: false });
        setTimeout(() => router.push(`/${locale}/create-post`), 1500);
        return true;
      }

      dispatch({ type: 'SET_STATUS', payload: 'error' });
      dispatch({ type: 'SET_ERROR', payload: result.message || 'Ошибка регистрации' });
      dispatch({ type: 'SET_LOADING', payload: false });
      return false;
    },
    [router, locale]
  );

  useEffect(() => {
    (window as unknown as Record<string, unknown>).handleTelegramAuth = onTelegramAuth;

    return () => {
      delete (window as unknown as Record<string, unknown>).handleTelegramAuth;
    };
  }, [onTelegramAuth]);

  const initTelegramWidget = useCallback(() => {
    if (!widgetContainerRef.current) return;

    widgetContainerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-lang', 'ru');
    script.setAttribute('data-onauth', 'handleTelegramAuth(user)');

    widgetContainerRef.current.appendChild(script);
  }, []);

  useEffect(() => {
    initTelegramWidget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const step = searchParams.get('step');
    if (step === '2') {
      dispatch({ type: 'SET_STEP', payload: 2 });
    }
  }, [searchParams]);

  const openBotForLogin = useCallback(() => {
    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=register`, '_blank');
  }, []);

  const addEmailToAccount = useCallback(async () => {
    const { email, password, agreePersonalData, agreeTerms } = state;

    if (!email || !password) {
      dispatch({ type: 'SET_STATUS', payload: 'error' });
      dispatch({ type: 'SET_ERROR', payload: 'Заполните email и пароль' });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      dispatch({ type: 'SET_STATUS', payload: 'error' });
      dispatch({ type: 'SET_ERROR', payload: 'Некорректный email' });
      return false;
    }
    if (password.length < 8) {
      dispatch({ type: 'SET_STATUS', payload: 'error' });
      dispatch({ type: 'SET_ERROR', payload: 'Пароль должен быть не менее 8 символов' });
      return false;
    }
    if (!agreePersonalData || !agreeTerms) {
      dispatch({ type: 'SET_STATUS', payload: 'error' });
      dispatch({ type: 'SET_ERROR', payload: 'Необходимо принять условия' });
      return false;
    }

    const token = state.accessToken || getAccessToken();
    if (!token) {
      dispatch({ type: 'SET_STATUS', payload: 'error' });
      dispatch({ type: 'SET_ERROR', payload: 'Сначала авторизуйтесь через Telegram' });
      dispatch({ type: 'SET_STEP', payload: 1 });
      return false;
    }

    dispatch({ type: 'SET_STATUS', payload: 'loading' });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    const result = await handleAddEmail(token, {
      email,
      password,
      agree_personal_data: agreePersonalData,
      agree_terms: agreeTerms,
    });

    if (result.success) {
      dispatch({ type: 'SET_USER', payload: result.user ?? null });
      dispatch({ type: 'SET_STATUS', payload: 'success' });
      dispatch({ type: 'SET_LOADING', payload: false });
      setTimeout(() => router.push(`/${locale}/create-post`), 1500);
      return true;
    }

    dispatch({ type: 'SET_STATUS', payload: 'error' });
    dispatch({ type: 'SET_ERROR', payload: result.message || 'Ошибка добавления email' });
    dispatch({ type: 'SET_LOADING', payload: false });
    return false;
  }, [state, router, locale]);

  const actions = useMemo(
    () => ({
      setError: (msg: string | null) => dispatch({ type: 'SET_ERROR', payload: msg }),
      reset: () => dispatch({ type: 'RESET' }),
      goToStep: (step: 1 | 2) => dispatch({ type: 'SET_STEP', payload: step }),
      setEmail: (email: string) => dispatch({ type: 'SET_EMAIL', payload: email }),
      setPassword: (password: string) => dispatch({ type: 'SET_PASSWORD', payload: password }),
      setAgreePersonalData: (value: boolean) =>
        dispatch({ type: 'SET_AGREE_PERSONAL_DATA', payload: value }),
      setAgreeTerms: (value: boolean) => dispatch({ type: 'SET_AGREE_TERMS', payload: value }),
    }),
    []
  );

  return {
    state,
    widgetContainerRef,
    openBotForLogin,
    addEmailToAccount,
    ...actions,
  };
}

export type RegisterStore = ReturnType<typeof useRegister>;
