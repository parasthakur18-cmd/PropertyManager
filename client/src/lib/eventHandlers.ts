import { queryClient } from './queryClient';
import { toast } from '@/hooks/use-toast';

// Play a short 3-beep alert sound using Web Audio API (no file needed)
function playOrderAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.45, 0.9].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.6, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.35);
    });
  } catch (_) {
    // Silently ignore if audio is not available
  }
}

export interface DomainEvent {
  id: string;
  type: string;
  timestamp: string;
  userId?: string;
  propertyId?: number;
  data: any;
}

export function handleDomainEvent(event: DomainEvent) {
  console.log('[EventHandler] Received event:', event.type, event);

  switch (event.type) {
    case 'connected':
      console.log('[EventHandler] Connected to event stream');
      break;

    case 'booking.created':
      // Invalidate with prefix matching to catch all query key variations
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === '/api/bookings' || 
                 key === '/api/bookings/active' ||
                 key === '/api/rooms' ||
                 key === '/api/dashboard/stats' ||
                 key === '/api/analytics';
        }
      });
      
      toast({
        title: "New Booking Created",
        description: `Booking ID: ${event.data.id}`,
      });
      break;

    case 'booking.updated':
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      break;

    case 'booking.cancelled':
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      
      toast({
        title: "Booking Cancelled",
        description: `Booking ID: ${event.data.id}`,
      });
      break;

    case 'booking.checked_in':
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      break;

    case 'booking.checked_out':
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financials'] });
      break;

    case 'payment.received':
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "Payment Received",
        description: `Amount: ₹${event.data.amount}`,
      });
      break;

    case 'order.placed':
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });

      playOrderAlertSound();

      toast({
        title: "🍽️ New Food Order!",
        description: event.data.roomNumber
          ? `Room ${event.data.roomNumber} — ₹${event.data.totalAmount}`
          : `Walk-in / Café — ₹${event.data.totalAmount}`,
        duration: 8000,
      });
      break;

    case 'order.updated':
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      break;

    case 'room.status_changed':
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      break;

    case 'enquiry.created':
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      break;

    case 'enquiry.confirmed':
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      
      toast({
        title: "Enquiry Confirmed",
        description: "Converted to booking",
      });
      break;

    case 'expense.added':
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      break;

    case 'bill.generated':
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/active'] });
      break;

    case 'bill.paid':
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics'] });
      break;

    default:
      console.log('[EventHandler] Unhandled event type:', event.type);
  }
}

export function connectToEventStream(): EventSource | null {
  try {
    const eventSource = new EventSource('/api/events/stream');

    eventSource.onopen = () => {
      console.log('[EventSource] Connected to event stream');
    };

    eventSource.onmessage = (event) => {
      try {
        const domainEvent: DomainEvent = JSON.parse(event.data);
        handleDomainEvent(domainEvent);
      } catch (error) {
        console.error('[EventSource] Failed to parse event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[EventSource] Error:', error);
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[EventSource] Connection closed, will reconnect...');
      }
    };

    return eventSource;
  } catch (error) {
    console.error('[EventSource] Failed to connect:', error);
    return null;
  }
}
