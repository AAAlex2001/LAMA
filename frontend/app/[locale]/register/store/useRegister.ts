"use client";

import { useReducer, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "LAMMAPLANNERBOT";

const ENDPOINTS = {
  telegramAuth: `${API_URL}/auth/telegram`,
  botLogin: `${API_URL}/auth/bot-login`,
  addEmail: `${API_URL}/auth/me/add-email`,
} as const;

export interface TelegramWidgetUser {
  id: number;
  hash: string;
  auth_date: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  [key: string]: unknown;
}

export interface User {
  id: number;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  email_verified?: boolean;
  telegram_account?: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  };
}

export interface RegisterState {
  step: 1 | 2;
  loading: boolean;
  error: string | null;
  status: "idle" | "loading" | "success" | "error";
  user: User | null;
  showTelegramWidget: boolean;
  accessToken: string | null;
  
  // Step 2 form
  email: string;
  password: string;
  agreePersonalData: boolean;
  agreeTerms: boolean;
}

type RegisterAction =
  | { type: "SET_STEP"; payload: 1 | 2 }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_STATUS"; payload: RegisterState["status"] }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_ACCESS_TOKEN"; payload: string | null }
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "SET_AGREE_PERSONAL_DATA"; payload: boolean }
  | { type: "SET_AGREE_TERMS"; payload: boolean }
  | { type: "RESET" };

const initialState: RegisterState = {
  step: 1,
  loading: false,
  error: null,
  status: "idle",
  user: null,
  showTelegramWidget: true,
  accessToken: null,
  email: "",
  password: "",
  agreePersonalData: false,
  agreeTerms: false,
};

function reducer(state: RegisterState, action: RegisterAction): RegisterState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_ACCESS_TOKEN":
      return { ...state, accessToken: action.payload };
    case "SET_EMAIL":
      return { ...state, email: action.payload };
    case "SET_PASSWORD":
      return { ...state, password: action.payload };
    case "SET_AGREE_PERSONAL_DATA":
      return { ...state, agreePersonalData: action.payload };
    case "SET_AGREE_TERMS":
      return { ...state, agreeTerms: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function parseErrorMessage(detail: unknown): string {
  if (Array.isArray(detail)) {
    return detail.map((d: Record<string, unknown>) => d?.msg || String(d)).join(", ");
  }
  if (typeof detail === "string") {
    return detail;
  }
  return "Ошибка сервера. Попробуйте позже";
}

function saveTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem("lamaplanner_access_token", accessToken);
  if (refreshToken) {
    localStorage.setItem("lamaplanner_refresh_token", refreshToken);
  }
}

export function useRegister(locale: string = 'ru') {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);

  const handleTelegramAuth = useCallback(
    async (user: TelegramWidgetUser) => {
      dispatch({ type: "SET_STATUS", payload: "loading" });
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const response = await fetch(ENDPOINTS.telegramAuth, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
          credentials: "include",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(parseErrorMessage(data.detail));
        }

        // Сохраняем токен в стейт для шага 2
        if (data?.access_token) {
          dispatch({ type: "SET_ACCESS_TOKEN", payload: data.access_token });
          // Также сохраняем в localStorage
          saveTokens(data.access_token, data.refresh_token);
        }

        dispatch({ type: "SET_USER", payload: data.user || null });
        
        // Проверяем, завершена ли регистрация
        if (data.registration_completed) {
          // Регистрация уже завершена - редирект в сервис
          dispatch({ type: "SET_STATUS", payload: "success" });
          setTimeout(() => {
            router.push(`/${locale}/create-post`);
          }, 1500);
        } else {
          // Регистрация не завершена - переходим на шаг 2
          dispatch({ type: "SET_STATUS", payload: "idle" });
          dispatch({ type: "SET_STEP", payload: 2 });
        }

        return true;
      } catch (error) {
        dispatch({ type: "SET_STATUS", payload: "error" });
        dispatch({
          type: "SET_ERROR",
          payload: error instanceof Error ? error.message : "Произошла неизвестная ошибка",
        });
        return false;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [router]
  );

  const initTelegramWidget = useCallback(() => {
    if (!widgetContainerRef.current) return;

    widgetContainerRef.current.innerHTML = "";

    (window as unknown as Record<string, unknown>).handleTelegramAuth = handleTelegramAuth;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", TELEGRAM_BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-lang", "ru");
    script.setAttribute("data-onauth", "handleTelegramAuth(user)");

    widgetContainerRef.current.appendChild(script);
  }, [handleTelegramAuth]);

  const openBotForLogin = useCallback(() => {
    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=register`, "_blank");
  }, []);

  const addEmailToAccount = useCallback(async () => {
    const { email, password, agreePersonalData, agreeTerms, accessToken } = state;

    // Валидация
    if (!email || !password) {
      dispatch({ type: "SET_STATUS", payload: "error" });
      dispatch({ type: "SET_ERROR", payload: "Заполните email и пароль" });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      dispatch({ type: "SET_STATUS", payload: "error" });
      dispatch({ type: "SET_ERROR", payload: "Некорректный email" });
      return false;
    }
    if (password.length < 8) {
      dispatch({ type: "SET_STATUS", payload: "error" });
      dispatch({ type: "SET_ERROR", payload: "Пароль должен быть не менее 8 символов" });
      return false;
    }
    if (!agreePersonalData || !agreeTerms) {
      dispatch({ type: "SET_STATUS", payload: "error" });
      dispatch({ type: "SET_ERROR", payload: "Необходимо принять условия" });
      return false;
    }

    // Проверяем что есть токен (пользователь авторизован через TG)
    const token = accessToken || localStorage.getItem("lamaplanner_access_token");
    if (!token) {
      dispatch({ type: "SET_STATUS", payload: "error" });
      dispatch({ type: "SET_ERROR", payload: "Сначала авторизуйтесь через Telegram" });
      dispatch({ type: "SET_STEP", payload: 1 });
      return false;
    }

    dispatch({ type: "SET_STATUS", payload: "loading" });
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const response = await fetch(ENDPOINTS.addEmail, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          password,
          agree_personal_data: agreePersonalData,
          agree_terms: agreeTerms,
        }),
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(parseErrorMessage(data.detail));
      }

      dispatch({ type: "SET_USER", payload: data || null });
      dispatch({ type: "SET_STATUS", payload: "success" });

      setTimeout(() => {
        router.push(`/${locale}/create-post`);
      }, 1500);

      return true;
    } catch (error) {
      dispatch({ type: "SET_STATUS", payload: "error" });
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Ошибка добавления email",
      });
      return false;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state, router]);

  const actions = useMemo(
    () => ({
      setError: (msg: string | null) => dispatch({ type: "SET_ERROR", payload: msg }),
      reset: () => dispatch({ type: "RESET" }),
      goToStep: (step: 1 | 2) => dispatch({ type: "SET_STEP", payload: step }),
      setEmail: (email: string) => dispatch({ type: "SET_EMAIL", payload: email }),
      setPassword: (password: string) => dispatch({ type: "SET_PASSWORD", payload: password }),
      setAgreePersonalData: (value: boolean) => dispatch({ type: "SET_AGREE_PERSONAL_DATA", payload: value }),
      setAgreeTerms: (value: boolean) => dispatch({ type: "SET_AGREE_TERMS", payload: value }),
    }),
    []
  );

  return {
    state,
    widgetContainerRef,
    initTelegramWidget,
    openBotForLogin,
    addEmailToAccount,
    ...actions,
  };
}

export type RegisterStore = ReturnType<typeof useRegister>;
