import { WebSocketEvent, WebSocketEventType } from '../types';

export type EventListener<T = any> = (event: WebSocketEvent<T>) => void;

export class EventDispatcher {
  private listeners: Map<WebSocketEventType | '*', Set<EventListener>> = new Map();

  public subscribe<T = any>(
    type: WebSocketEventType | '*',
    listener: EventListener<T>
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      const set = this.listeners.get(type);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  public dispatch<T = any>(event: WebSocketEvent<T>): void {
    // Specific listeners
    const specific = this.listeners.get(event.eventType);
    if (specific) {
      specific.forEach((listener) => listener(event));
    }

    // Wildcard listeners
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      wildcard.forEach((listener) => listener(event));
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
