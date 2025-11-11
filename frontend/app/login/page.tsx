"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TelegramWidgetUser = {
  id: number;
  hash: string;
  auth_date: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  [key: string]: unknown;
};

const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "LAMMAPLANNERBOT";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(
  /\/$/,
  ""
);

export default function LoginPage() {
  const authEndpoint = `${API_BASE}/auth/telegram`;

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState(
    "Нажмите кнопку ниже, чтобы авторизоваться через Telegram."
  );
  const [debugPayload, setDebugPayload] = useState<string | null>(null);

  const handleTelegramAuth = useCallback(
    async (user: TelegramWidgetUser) => {
      setStatus("loading");
      setMessage("Проверяем данные в Lama Planner…");
      setDebugPayload(JSON.stringify(user, null, 2));

      try {
        const response = await fetch(authEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
          credentials: "include",
        });

        if (!response.ok) {
          let errorMessage = "Не удалось авторизоваться";

          try {
            const errorJson = await response.json();
            errorMessage = errorJson.detail ?? errorMessage;
          } catch {
            // ignore parsing errors
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data?.access_token) {
          localStorage.setItem("lamaplanner_access_token", data.access_token);
        }

        if (data?.refresh_token) {
          localStorage.setItem("lamaplanner_refresh_token", data.refresh_token);
        }

        setStatus("success");

        const displayName =
          data?.user?.telegram_account?.first_name ||
          data?.user?.telegram_account?.username ||
          "пользователь";

        setMessage(`Готово! Привет, ${displayName}. Можно переходить в сервис.`);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Произошла неизвестная ошибка авторизации."
        );
      }
    },
    [authEndpoint]
  );

  const widgetContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).handleTelegramAuth =
      handleTelegramAuth;

    return () => {
      delete (window as unknown as Record<string, unknown>)
        .handleTelegramAuth;
    };
  }, [handleTelegramAuth]);

  useEffect(() => {
    if (!widgetContainerRef.current) {
      return;
    }

    // Удаляем предыдущие экземпляры, если пользователь возвращается на страницу
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-10 shadow-xl backdrop-blur">
        <header className="space-y-2 text-center text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Lama Planner
          </p>
          <h1 className="text-3xl font-semibold">Вход через Telegram</h1>
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-6 py-8 text-center text-slate-200">
          <div ref={widgetContainerRef} className="flex justify-center" />

          {status === "loading" && (
            <p className="mt-4 text-sm text-slate-400">
              Ожидание подтверждения…
            </p>
          )}
          {status === "success" && (
            <p className="mt-4 text-sm text-emerald-400">
              Авторизация прошла успешно!
            </p>
          )}
          {status === "error" && (
            <p className="mt-4 text-sm text-rose-400">Ошибка: {message}</p>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          Нажимая на кнопку, вы соглашаетесь с обработкой персональных данных и
          предоставляете боту возможность написать вам в Telegram.
        </p>

        {debugPayload && (
          <details className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
            <summary className="cursor-pointer select-none text-slate-400">
              Технические детали (payload виджета)
            </summary>
            <pre className="mt-3 max-h-48 overflow-auto text-left text-slate-200">
{debugPayload}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}
