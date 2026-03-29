import { getAuthToken, API_BASE_URL } from '@/store/api';

export interface WsEvent {
  type: 'message_new' | 'message_edited' | 'message_deleted' | 'chat_updated';
  bot_id: number;
  chat_id: number;
  payload: Record<string, unknown>;
}

type EventHandler = (event: WsEvent) => void;
type StatusHandler = (connected: boolean) => void;

function buildWsUrl(): string {
  const token = getAuthToken()?.trim();
  const base = API_BASE_URL.replace(/^http/, 'ws');
  const url = `${base}/direct/ws`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export class DirectChatWsService {
  private ws: WebSocket | null = null;
  private activeBotId: number | null = null;
  private activeTgChatId: number | null = null;
  private onEvent: EventHandler | null = null;
  private onStatus: StatusHandler | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private reconnectDelay = 2000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private consecutiveQuickDrops = 0;
  private lastOpenTime = 0;

  setHandlers(onEvent: EventHandler, onStatus: StatusHandler) {
    this.onEvent = onEvent;
    this.onStatus = onStatus;
  }

  connect(botId: number, tgChatId: number) {
    const isSameChat = this.activeBotId === botId && this.activeTgChatId === tgChatId;

    if (
      isSameChat &&
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.closeSocket();

    this.activeBotId = botId;
    this.activeTgChatId = tgChatId;
    this.shouldReconnect = true;
    this.createConnection();
  }

  disconnect() {
    this.shouldReconnect = false;
    this.activeBotId = null;
    this.activeTgChatId = null;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.closeSocket();
    this.onStatus?.(false);
  }

  private closeSocket() {
    this.clearPingInterval();

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private createConnection() {
    const url = buildWsUrl();
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.lastOpenTime = Date.now();
      this.reconnectDelay = 2000;
      this.onStatus?.(true);

      this.pingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send('ping');
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        if (event.data === 'pong') {
          return;
        }

        const eventData: WsEvent = JSON.parse(event.data);

        if (this.activeBotId !== null && this.activeTgChatId !== null) {
          if (eventData.bot_id !== this.activeBotId || eventData.chat_id !== this.activeTgChatId) {
            return;
          }
        }

        this.onEvent?.(eventData);
      } catch (error) {
      }
    };

    this.ws.onclose = () => {
      this.clearPingInterval();
      this.onStatus?.(false);

      // Track connections that drop shortly after opening to avoid hammering the server
      const uptime = Date.now() - this.lastOpenTime;
      if (this.lastOpenTime > 0 && uptime < 5000) {
        this.consecutiveQuickDrops++;
      } else {
        this.consecutiveQuickDrops = 0;
      }

      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.clearPingInterval();
    };
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;

    const delay =
      this.consecutiveQuickDrops >= 3
        ? Math.min(this.reconnectDelay * Math.pow(1.5, this.consecutiveQuickDrops), 30000)
        : this.reconnectDelay;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) {
        this.createConnection();
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
      }
    }, delay);
  }
}

export const directChatWs = new DirectChatWsService();