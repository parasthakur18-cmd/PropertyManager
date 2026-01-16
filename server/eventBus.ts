import { EventEmitter } from 'events';

export interface DomainEvent {
  id: string;
  type: string;
  timestamp: string;
  userId?: string;
  propertyId?: number;
  organizationId?: number;
  data: any;
  metadata?: Record<string, any>;
}

class EventBus extends EventEmitter {
  private static instance: EventBus;
  private eventHistory: DomainEvent[] = [];
  private readonly MAX_HISTORY = 100;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  publish(event: Omit<DomainEvent, 'id' | 'timestamp'>): void {
    const fullEvent: DomainEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift();
    }

    this.emit('event', fullEvent);
    this.emit(event.type, fullEvent);

    console.log(`[EventBus] Published: ${event.type}`, {
      id: fullEvent.id,
      propertyId: event.propertyId,
    });
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => void): () => void {
    this.on(eventType, handler);
    return () => this.off(eventType, handler);
  }

  subscribeAll(handler: (event: DomainEvent) => void): () => void {
    this.on('event', handler);
    return () => this.off('event', handler);
  }

  getRecentEvents(limit: number = 10): DomainEvent[] {
    return this.eventHistory.slice(-limit);
  }
}

export const eventBus = EventBus.getInstance();

export const EventTypes = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_UPDATED: 'booking.updated',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_CHECKED_IN: 'booking.checked_in',
  BOOKING_CHECKED_OUT: 'booking.checked_out',
  PAYMENT_RECEIVED: 'payment.received',
  ORDER_PLACED: 'order.placed',
  ORDER_UPDATED: 'order.updated',
  ROOM_STATUS_CHANGED: 'room.status_changed',
  ENQUIRY_CREATED: 'enquiry.created',
  ENQUIRY_CONFIRMED: 'enquiry.confirmed',
  EXPENSE_ADDED: 'expense.added',
  BILL_GENERATED: 'bill.generated',
  BILL_PAID: 'bill.paid',
} as const;
