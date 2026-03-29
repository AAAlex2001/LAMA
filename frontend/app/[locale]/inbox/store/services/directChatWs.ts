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
  const token = getAuthToken();
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

  setHandlers(onEvent: EventHandler, onStatus: StatusHandler) {
    this.onEvent = onEvent;
    this.onStatus = onStatus;
  }

  connect(botId: number, tgChatId: number) {
    const isSameChat = this.activeBotId === botId && this.activeTgChatId === tgChatId;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (isSameChat) return;
      this.disconnect();
    }

    this.activeBotId = botId;
    this.activeTgChatId = tgChatId;
    this.shouldReconnect = true;

    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.createConnection();
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.activeBotId = null;
    this.activeTgChatId = null;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
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
    this.onStatus?.(false);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private createConnection() {
    const url = buildWsUrl();
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
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
        // console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      this.onStatus?.(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      // console.error('WebSocket error:', error);
    };
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) {
        this.createConnection();
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
      }
    }, this.reconnectDelay);
  }
}

export const directChatWs = new DirectChatWsService();
