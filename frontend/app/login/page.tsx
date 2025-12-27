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
  const botAuthEndpoint = `${API_BASE}/auth/bot-login`;

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState(
    "Нажмите кнопку ниже, чтобы авторизоваться через Telegram."
  );
  const [debugPayload, setDebugPayload] = useState<string | null>(null);

  // Проверяем URL параметры при загрузке
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tgId = params.get("tg_id");
    
    if (tgId) {
      handleBotAuthFromUrl({
        telegram_id: parseInt(tgId),
        username: params.get("username") || undefined,
        first_name: params.get("first_name") || undefined,
        last_name: params.get("last_name") || undefined,
      });
    }
  }, []);

  const handleBotAuthFromUrl = async (data: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  }) => {
    setStatus("loading");
    setMessage("Авторизация через бота...");

    try {
      const response = await fetch(botAuthEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

      const responseData = await response.json();

      if (responseData?.access_token) {
        localStorage.setItem("lamaplanner_access_token", responseData.access_token);
      }

      if (responseData?.refresh_token) {
        localStorage.setItem("lamaplanner_refresh_token", responseData.refresh_token);
      }

      setStatus("success");

      const displayName =
        responseData?.user?.telegram_account?.first_name ||
        responseData?.user?.telegram_account?.username ||
        "пользователь";

      setMessage(`Готово! Привет, ${displayName}. Можно переходить в сервис.`);
      
      // Очищаем URL от параметров
      window.history.replaceState({}, document.title, "/login");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Произошла неизвестная ошибка авторизации."
      );
    }
  };

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
          <h1 className="text-3xl font-semibold">Вход в Lama Planner</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Отложенный постинг в Telegram
          </p>
        </header>

        {/* Выбор метода авторизации */}
        <div className="space-y-4">
          <p className="text-center text-sm text-slate-400">
            Авторизация с помощью виджета Telegram
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-6 py-8 text-center text-slate-200">
            <div ref={widgetContainerRef} className="flex justify-center" />

            {status === "loading" && (
              <p className="mt-4 text-sm text-slate-400">
                Ожидание подтверждения…
              </p>
            )}
          </div>

          <p className="text-center text-sm text-slate-400">
            Авторизация с помощью бота Lama Planner
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-6 py-8">
            <button
              onClick={() => window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=login`, "_blank")}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-white font-medium transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 3.767-1.36 5.002-.169.524-.503.699-.826.716-.703.031-1.237-.465-1.918-.911-1.065-.7-1.668-1.135-2.702-1.817-1.195-.788-.42-1.221.261-1.929.179-.186 3.293-3.02 3.354-3.278.008-.032.015-.15-.056-.212-.07-.062-.174-.041-.248-.024-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.892-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.332-1.386 4.025-1.627 4.477-1.635.099-.001.321.023.465.141.121.099.154.232.17.326.015.094.034.308.019.475z"/>
              </svg>
              Открыть бота для входа
            </button>
          </div>

          {status === "success" && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center text-emerald-400">
              Авторизация прошла успешно!
            </div>
          )}
          {status === "error" && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-center text-rose-400">
              {message}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          Нажимая на кнопку, вы соглашаетесь с обработкой персональных данных и
          предоставляете боту возможность написать вам в Telegram.
        </p>

        <div className="text-center">
          <a
            href="#"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Нужна помощь?
          </a>
        </div>

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
