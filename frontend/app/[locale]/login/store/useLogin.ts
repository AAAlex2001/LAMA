"use client";

import { useEffect, useReducer, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "LAMMAPLANNERBOT";

const ENDPOINTS = {
  telegramAuth: `${API_URL}/auth/telegram`,
  botLogin: `${API_URL}/auth/bot-login`,
  refresh: `${API_URL}/auth/refresh`,
  me: `${API_URL}/auth/me`,
  logout: `${API_URL}/auth/logout`,
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
  telegram_account?: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  };
}

export interface LoginState {
  loading: boolean;
  error: string | null;
  status: "idle" | "loading" | "success" | "error";
  
  user: User | null;
  showTelegramWidget: boolean;
  
  form: {
    email: string;
    password: string;
    showPassword: boolean;
  };
  
  fieldErrors: {
    email: string | null;
    password: string | null;
  };
}

type LoginAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_STATUS"; payload: LoginState["status"] }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "TOGGLE_SHOW_PASSWORD" }
  | { type: "SET_FIELD_ERROR"; payload: { field: keyof LoginState["fieldErrors"]; message: string | null } }
  | { type: "CLEAR_FIELD_ERRORS" }
  | { type: "SET_USER"; payload: User | null }
  | { type: "TOGGLE_TELEGRAM_WIDGET" }
  | { type: "RESET" };

const initialState: LoginState = {
  loading: false,
  error: null,
  status: "idle",
  user: null,
  showTelegramWidget: false,
  
  form: {
    email: "",
    password: "",
    showPassword: false,
  },
  
  fieldErrors: {
    email: null,
    password: null,
  },
};

function reducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "CLEAR_NOTIFICATIONS":
      return { ...state, error: null };
      
    case "SET_EMAIL":
      return {
        ...state,
        form: { ...state.form, email: action.payload },
        fieldErrors: { ...state.fieldErrors, email: null },
      };
    case "SET_PASSWORD":
      return {
        ...state,
        form: { ...state.form, password: action.payload },
        fieldErrors: { ...state.fieldErrors, password: null },
      };
    case "TOGGLE_SHOW_PASSWORD":
      return { ...state, form: { ...state.form, showPassword: !state.form.showPassword } };
      
    case "SET_FIELD_ERROR":
      return {
        ...state,
        fieldErrors: { ...state.fieldErrors, [action.payload.field]: action.payload.message },
      };
    case "CLEAR_FIELD_ERRORS":
      return { ...state, fieldErrors: initialState.fieldErrors };
      
    case "SET_USER":
      return { ...state, user: action.payload };
      
    case "TOGGLE_TELEGRAM_WIDGET":
      return { ...state, showTelegramWidget: !state.showTelegramWidget };
      
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

function clearTokens() {
  localStorage.removeItem("lamaplanner_access_token");
  localStorage.removeItem("lamaplanner_refresh_token");
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lamaplanner_access_token");
}

export function useLogin() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);

  const handleTelegramAuth = useCallback(
    async (user: TelegramWidgetUser) => {
      dispatch({ type: "SET_STATUS", payload: "loading" });
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "CLEAR_NOTIFICATIONS" });

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

        if (data?.access_token) {
          saveTokens(data.access_token, data.refresh_token);
        }

        dispatch({ type: "SET_USER", payload: data.user || null });
        dispatch({ type: "SET_STATUS", payload: "success" });
        
        setTimeout(() => {
          router.push("/");
        }, 1500);
        
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

  // Инициализация Telegram Widget
  useEffect(() => {
    (window as unknown as Record<string, unknown>).handleTelegramAuth = handleTelegramAuth;

    return () => {
      delete (window as unknown as Record<string, unknown>).handleTelegramAuth;
    };
  }, [handleTelegramAuth]);

  const initTelegramWidget = useCallback(() => {
    if (!widgetContainerRef.current) return;

    widgetContainerRef.current.innerHTML = "";

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
  }, []);

  const openBotForLogin = useCallback(() => {
    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=login`, "_blank");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tgId = params.get("tg_id");
    
    if (tgId) {
      const authData = {
        telegram_id: parseInt(tgId),
        username: params.get("username") || undefined,
        first_name: params.get("first_name") || undefined,
        last_name: params.get("last_name") || undefined,
      };
      
      dispatch({ type: "SET_STATUS", payload: "loading" });
      dispatch({ type: "SET_LOADING", payload: true });

      fetch(ENDPOINTS.botLogin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData),
        credentials: "include",
      })
        .then(async (response) => {
          const responseData = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(parseErrorMessage(responseData.detail));
          }

          if (responseData?.access_token) {
            saveTokens(responseData.access_token, responseData.refresh_token);
          }

          dispatch({ type: "SET_USER", payload: responseData.user || null });
          dispatch({ type: "SET_STATUS", payload: "success" });

          window.history.replaceState({}, document.title, window.location.pathname);

          setTimeout(() => {
            router.push("/");
          }, 1500);
        })
        .catch((error) => {
          dispatch({ type: "SET_STATUS", payload: "error" });
          dispatch({
            type: "SET_ERROR",
            payload: error instanceof Error ? error.message : "Ошибка авторизации через бота",
          });
        })
        .finally(() => {
          dispatch({ type: "SET_LOADING", payload: false });
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    const token = getAccessToken();
    
    if (token) {
      try {
        await fetch(ENDPOINTS.logout, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch {
      }
    }
    
    clearTokens();
    dispatch({ type: "SET_USER", payload: null });
    dispatch({ type: "RESET" });
    router.push("/login");
  }, [router]);

  const actions = useMemo(
    () => ({
      setEmail: (v: string) => dispatch({ type: "SET_EMAIL", payload: v }),
      setPassword: (v: string) => dispatch({ type: "SET_PASSWORD", payload: v }),
      toggleShowPassword: () => dispatch({ type: "TOGGLE_SHOW_PASSWORD" }),
      toggleTelegramWidget: () => dispatch({ type: "TOGGLE_TELEGRAM_WIDGET" }),
      setError: (msg: string | null) => dispatch({ type: "SET_ERROR", payload: msg }),
      clearNotifications: () => dispatch({ type: "CLEAR_NOTIFICATIONS" }),
      reset: () => dispatch({ type: "RESET" }),
    }),
    []
  );

  return {
    state,
    widgetContainerRef,
    initTelegramWidget,
    handleTelegramAuth,
    openBotForLogin,
    logout,
    ...actions,
  };
}

export type LoginStore = ReturnType<typeof useLogin>;
