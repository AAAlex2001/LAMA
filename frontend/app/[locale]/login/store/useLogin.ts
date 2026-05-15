"use client";

import { useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  type LoginState,
  type User,
  type TelegramWidgetUser,
  initialLoginState,
  loginReducer,
} from "./types";

import {
  handleTelegramLogin,
  handleBotLogin,
  handleEmailLogin,
  handleLogout,
} from "./actions";

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "LAMMAPLANNERBOT";

export function useLogin(locale: string = 'ru') {
  const [state, dispatch] = useReducer(loginReducer, initialLoginState);
  const router = useRouter();
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleTelegramAuth = async (user: TelegramWidgetUser) => {
      dispatch({ type: "SET_STATUS", payload: "loading" });
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "CLEAR_NOTIFICATIONS" });

      const result = await handleTelegramLogin(user);

      if (result.success) {
        if (result.requiresRegistration) {
          dispatch({ type: "SET_STATUS", payload: "idle" });
          router.push("/register?step=2");
          return true;
        }

        dispatch({ type: "SET_STATUS", payload: "success" });
        setTimeout(() => router.push(`/${locale}/create-post`), 1500);
        return true;
      }

      dispatch({ type: "SET_STATUS", payload: "error" });
      dispatch({ type: "SET_ERROR", payload: result.message || "Ошибка входа" });
      dispatch({ type: "SET_LOADING", payload: false });
      return false;
    };

    (window as unknown as Record<string, unknown>).handleTelegramAuth = handleTelegramAuth;

    return () => {
      delete (window as unknown as Record<string, unknown>).handleTelegramAuth;
    };
  }, [router, locale]);

  const initTelegramWidget = () => {
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
  };

  const openBotForLogin = () => {
    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=login`, "_blank");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tgId = params.get("tg_id");

    if (!tgId) return;

    const authData = {
      telegram_id: parseInt(tgId),
      username: params.get("username") || undefined,
      first_name: params.get("first_name") || undefined,
      last_name: params.get("last_name") || undefined,
    };

    dispatch({ type: "SET_STATUS", payload: "loading" });
    dispatch({ type: "SET_LOADING", payload: true });

    handleBotLogin(authData)
      .then((result) => {
        if (result.success) {
          if (result.requiresRegistration) {
            dispatch({ type: "SET_STATUS", payload: "idle" });
            window.history.replaceState({}, document.title, window.location.pathname);
            router.push("/register?step=2");
            return;
          }

          dispatch({ type: "SET_STATUS", payload: "success" });
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => router.push(`/${locale}/create-post`), 1500);
        } else {
          dispatch({ type: "SET_STATUS", payload: "error" });
          dispatch({ type: "SET_ERROR", payload: result.message || "Ошибка авторизации" });
        }
      })
      .finally(() => {
        dispatch({ type: "SET_LOADING", payload: false });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginWithEmail = async () => {
    dispatch({ type: "CLEAR_FIELD_ERRORS" });
    dispatch({ type: "CLEAR_NOTIFICATIONS" });

    const { email, password } = state.form;

    let hasErrors = false;
    if (!email) {
      dispatch({ type: "SET_FIELD_ERROR", payload: { field: "email", message: "Введите email" } });
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      dispatch({ type: "SET_FIELD_ERROR", payload: { field: "email", message: "Некорректный email" } });
      hasErrors = true;
    }
    if (!password) {
      dispatch({ type: "SET_FIELD_ERROR", payload: { field: "password", message: "Введите пароль" } });
      hasErrors = true;
    }
    if (hasErrors) return false;

    dispatch({ type: "SET_STATUS", payload: "loading" });
    dispatch({ type: "SET_LOADING", payload: true });

    const result = await handleEmailLogin({ email, password });

    if (result.success) {
      if (result.requiresRegistration) {
        dispatch({ type: "SET_STATUS", payload: "idle" });
        router.push("/register?step=2");
        dispatch({ type: "SET_LOADING", payload: false });
        return true;
      }

      dispatch({ type: "SET_STATUS", payload: "success" });
      setTimeout(() => router.push(`/${locale}/create-post`), 1500);
      dispatch({ type: "SET_LOADING", payload: false });
      return true;
    }

    dispatch({ type: "SET_STATUS", payload: "error" });
    dispatch({ type: "SET_ERROR", payload: result.message || "Ошибка входа" });
    dispatch({ type: "SET_LOADING", payload: false });
    return false;
  };

  const logout = async () => {
    await handleLogout();
    dispatch({ type: "SET_USER", payload: null });
    dispatch({ type: "RESET" });
    router.push("/login");
  };

  const actions = {
    setEmail: (v: string) => dispatch({ type: "SET_EMAIL", payload: v }),
    setPassword: (v: string) => dispatch({ type: "SET_PASSWORD", payload: v }),
    toggleShowPassword: () => dispatch({ type: "TOGGLE_SHOW_PASSWORD" }),
    setError: (msg: string | null) => dispatch({ type: "SET_ERROR", payload: msg }),
    clearNotifications: () => dispatch({ type: "CLEAR_NOTIFICATIONS" }),
    reset: () => dispatch({ type: "RESET" }),
  };

  return {
    state,
    widgetContainerRef,
    initTelegramWidget,
    openBotForLogin,
    loginWithEmail,
    logout,
    ...actions,
  };
}

export type { LoginState, User, TelegramWidgetUser };
export type LoginStore = ReturnType<typeof useLogin>;
