import { WebSocketEvent, WebSocketEventType } from '../types';
import { EventDispatcher, EventListener } from './events';
import { ReconnectStrategy } from './reconnect';

export type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'LOCAL';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  /** No backend gateway exists yet — see docs/roadmap. Without an explicit VITE_WS_URL we
   * skip real WebSocket attempts entirely and rely on BroadcastChannel for the local demo. */
  private hasBackend: boolean;
  private state: ConnectionState = 'DISCONNECTED';
  private dispatcher: EventDispatcher = new EventDispatcher();
  private reconnectStrategy: ReconnectStrategy = new ReconnectStrategy();
  private broadcastChannel: BroadcastChannel | null = null;
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private reconnectTimer: any = null;

  constructor(url?: string) {
    const envUrl = import.meta.env.VITE_WS_URL;
    this.hasBackend = Boolean(url || envUrl);
    this.url = url || envUrl || 'ws://localhost:3000';
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('ridemesh_realtime_channel');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.eventType) {
          this.dispatcher.dispatch(event.data);
        }
      };
    }
  }

  public connect(): void {
    if (this.state === 'CONNECTED' || this.state === 'CONNECTING') return;

    if (!this.hasBackend) {
      this.updateState('LOCAL');
      return;
    }

    this.updateState('CONNECTING');
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.updateState('CONNECTED');
        this.reconnectStrategy.reset();
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed: WebSocketEvent = JSON.parse(event.data);
          this.dispatcher.dispatch(parsed);
        } catch (e) {
          console.error('[WebSocketClient] Invalid event frame:', e);
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = () => {
        this.handleDisconnect();
      };
    } catch (e) {
      // Fall back to local channel if backend is unreachable
      this.handleDisconnect();
    }
  }

  private handleDisconnect(): void {
    if (this.state === 'DISCONNECTED') return;

    this.updateState('RECONNECTING');
    const delay = this.reconnectStrategy.getNextDelay();
    console.log(`[WebSocketClient] Reconnecting in ${delay}ms...`);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateState('DISCONNECTED');
  }

  public send<T = any>(eventType: WebSocketEventType, payload: T): void {
    const event: WebSocketEvent<T> = {
      eventType,
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      payload,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }

    // Broadcast across browser context (multi-tab / split view sync)
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(event);
    }

    // Dispatch locally as well
    this.dispatcher.dispatch(event);
  }

  public subscribe<T = any>(
    eventType: WebSocketEventType | '*',
    listener: EventListener<T>
  ): () => void {
    return this.dispatcher.subscribe(eventType, listener);
  }

  public onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public getState(): ConnectionState {
    return this.state;
  }

  private updateState(newState: ConnectionState): void {
    this.state = newState;
    this.stateListeners.forEach((fn) => fn(newState));
  }
}

export const wsClient = new WebSocketClient();
