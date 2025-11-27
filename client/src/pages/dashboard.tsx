import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Hotel, Calendar, Users, TrendingUp, IndianRupee, LogIn, LogOut, ChefHat, Receipt, Plus, MessageSquarePlus, Clock, Check, AlertCircle, ChevronDown, Activity, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, isToday, addDays, isBefore, isAfter, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Guest, Room, Property, Enquiry } from "@shared/schema";

interface Order {
  id: number;
  bookingId?: number | null;
  propertyId?: number | null;
  roomId?: number | null;
  orderType: string;
  customerName?: string | null;
  customerPhone?: string | null;
  items: any;
  totalAmount: string;
  status: string;
  specialInstructions?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
}

interface PaymentNotification {
  billId: number;
  bookingId: number;
  guestName: string;
  totalAmount: string;
  paidAt: string;
  paymentMethod?: string;
}

const statusColors = {
  pending: "bg-amber-500 text-white",
  confirmed: "bg-chart-2 text-white",
  "checked-in": "bg-chart-5 text-white",
  "checked-out": "bg-muted text-muted-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

const orderStatusColors = {
  pending: "bg-amber-500 text-white",
  preparing: "bg-blue-500 text-white",
  ready: "bg-green-500 text-white",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

interface CheckoutReminder {
  bookingId: number;
  guestName: string;
  roomNumber: string;
  checkOutTime: string;
  hoursOverdue: number;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("today-checkins");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [recentPayments, setRecentPayments] = useState<PaymentNotification[]>([]);
  const [seenPaymentIds, setSeenPaymentIds] = useState<Set<number>>(new Set());
  const [autoCheckoutAlert, setAutoCheckoutAlert] = useState<{ count: number; timestamp: number } | null>(null);
  const [checkoutReminders, setCheckoutReminders] = useState<CheckoutReminder[]>([]);
  const [shownReminderIds, setShownReminderIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: guests, isLoading: guestsLoading } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: enquiries, isLoading: enquiriesLoading } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  // Create notification with error handling
  const createNotification = async (type: string, title: string, message: string, soundType: "info" | "warning" | "critical" | "payment") => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, message, soundType, isRead: false }),
      });
      if (!response.ok) {
        console.warn(`[NOTIFICATION] Failed to create ${type} notification: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error(`[NOTIFICATION_ERROR] Failed to create ${type} notification:`, {
        timestamp: new Date().toISOString(),
        type,
        message,
        error: error?.message || "Unknown error",
      });
    }
  };

  // Check for checkout reminders (12 PM+) and force auto-checkout (4 PM+)
  useEffect(() => {
    const checkoutFlow = async () => {
      const now = new Date();
      const currentHour = now.getHours();

      // From 12 PM onwards: Show reminders
      if (currentHour >= 12) {
        try {
          console.log("[CHECKOUT_FLOW] Fetching checkout reminders...");
          const response = await fetch("/api/bookings/checkout-reminders");
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const reminders: CheckoutReminder[] = await response.json();
          setCheckoutReminders(reminders);
          
          // Show reminder popups for unseen reminders
          reminders.forEach(reminder => {
            if (!shownReminderIds.has(reminder.bookingId)) {
              console.log(`[CHECKOUT_REMINDER] Showing reminder for booking ${reminder.bookingId}:`, {
                guestName: reminder.guestName,
                roomNumber: reminder.roomNumber,
                hoursOverdue: reminder.hoursOverdue,
              });
              
              toast({
                title: "Checkout Reminder",
                description: `Guest ${reminder.guestName} in Room ${reminder.roomNumber} was due for checkout at ${reminder.checkOutTime} (${reminder.hoursOverdue}h ago). Please checkout manually.`,
                duration: 10000,
              });
              
              // Create notification
              createNotification(
                "checkout_reminder",
                "Checkout Reminder",
                `${reminder.guestName} (Room ${reminder.roomNumber}) overdue by ${reminder.hoursOverdue}h`,
                "warning"
              );
              
              setShownReminderIds(prev => new Set([...prev, reminder.bookingId]));
            }
          });
        } catch (error: any) {
          console.error("[CHECKOUT_ERROR] Failed to fetch checkout reminders:", {
            timestamp: new Date().toISOString(),
            error: error?.message || "Unknown error",
            stack: error?.stack,
          });
        }
      }

      // At 4 PM (16:00) onwards: Force auto-checkout
      if (currentHour >= 16) {
        try {
          console.log("[AUTO_CHECKOUT] Executing force auto-checkout at 4 PM...");
          const response = await fetch("/api/bookings/force-auto-checkout", { method: "POST" });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          if (data.processedCount > 0) {
            console.log("[AUTO_CHECKOUT_SUCCESS] Force auto-checked out bookings:", {
              timestamp: new Date().toISOString(),
              processedCount: data.processedCount,
            });
            
            setAutoCheckoutAlert({ count: data.processedCount, timestamp: Date.now() });
            toast({
              title: "Forced Auto-Checkout Executed",
              description: `${data.processedCount} booking(s) auto-checked out at 4 PM. Guest notifications sent via WhatsApp.`,
              duration: 8000,
            });
            
            // Create notification
            createNotification(
              "auto_checkout",
              "Auto-Checkout Executed",
              `${data.processedCount} booking(s) auto-checked out. WhatsApp notifications sent.`,
              "critical"
            );
            
            setShownReminderIds(new Set());
          }
        } catch (error: any) {
          console.error("[AUTO_CHECKOUT_ERROR] Failed to process force auto-checkout:", {
            timestamp: new Date().toISOString(),
            error: error?.message || "Unknown error",
            stack: error?.stack,
          });
        }
      }
    };

    const fetchRecentPayments = async () => {
      try {
        console.log("[PAYMENTS] Fetching recent payments...");
        const response = await fetch("/api/recent-payments");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const payments: PaymentNotification[] = await response.json();
        setRecentPayments(payments);
        
        // Create notifications for new payments
        payments.forEach(payment => {
          if (!seenPaymentIds.has(payment.billId)) {
            console.log("[PAYMENT_RECEIVED] New payment recorded:", {
              timestamp: new Date().toISOString(),
              billId: payment.billId,
              guestName: payment.guestName,
              amount: payment.totalAmount,
              method: payment.paymentMethod,
            });
            
            createNotification(
              "payment_received",
              "Payment Received",
              `${payment.guestName} paid ₹${payment.totalAmount} via ${payment.paymentMethod || "online"}`,
              "payment"
            );
          }
        });
      } catch (error: any) {
        console.error("[PAYMENTS_ERROR] Failed to fetch recent payments:", {
          timestamp: new Date().toISOString(),
          error: error?.message || "Unknown error",
          stack: error?.stack,
        });
      }
    };

    checkoutFlow();
    fetchRecentPayments();
    const interval = setInterval(() => {
      checkoutFlow();
      fetchRecentPayments();
    }, 900000); // Check every 15 minutes
    
    return () => clearInterval(interval);
  }, [shownReminderIds, toast, seenPaymentIds]);

  const isLoading = statsLoading || bookingsLoading || guestsLoading || roomsLoading || propertiesLoading || ordersLoading || enquiriesLoading;

  // Filter data for tabs
  const todayCheckIns = bookings?.filter(b => 
    isToday(new Date(b.checkInDate)) && (b.status === "pending" || b.status === "confirmed")
  ) || [];

  const todayCheckOuts = bookings?.filter(b => 
    isToday(new Date(b.checkOutDate)) && b.status === "checked-in"
  ) || [];

  // Upcoming check-ins (next 7 days, excluding today)
  const upcomingCheckIns = bookings?.filter(b => {
    const checkInDate = new Date(b.checkInDate);
    const tomorrow = addDays(startOfDay(new Date()), 1);
    const sevenDaysFromNow = addDays(startOfDay(new Date()), 7);
    return (b.status === "pending" || b.status === "confirmed") && 
           isAfter(checkInDate, tomorrow) && 
           isBefore(checkInDate, sevenDaysFromNow);
  }) || [];

  // All checked-in guests
  const checkedInGuests = bookings?.filter(b => b.status === "checked-in") || [];

  const activeOrders = orders?.filter(o => 
    o.status === "pending" || o.status === "preparing" || o.status === "ready"
  ) || [];

  const yetToConfirmedEnquiries = enquiries?.filter(e => 
    e.status !== "confirmed"
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Properties",
      value: stats?.totalProperties || 0,
      icon: Building2,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Total Rooms",
      value: stats?.totalRooms || 0,
      icon: Hotel,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Active Bookings",
      value: stats?.activeBookings || 0,
      icon: Calendar,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      title: "Active Users",
      value: stats?.activeUsers || 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-600/10",
    },
    {
      title: "Total Guests",
      value: stats?.totalGuests || 0,
      icon: Users,
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
  ];

  // Calculate daily target (assuming ₹50K daily target)
  const dailyTarget = 50000;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with Property Selector */}
      <div className="border-b bg-card p-4 md:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-serif">Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Real-time operational overview</p>
          </div>
          
          {/* Property Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPropertyId || ""}
              onChange={(e) => setSelectedPropertyId(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 rounded-md border bg-background text-sm flex items-center gap-2"
              data-testid="select-property"
            >
              <option value="">All Properties</option>
              {properties?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="border-b bg-card p-4 md:p-6 overflow-x-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 min-w-max md:min-w-0">
          {/* Occupancy % */}
          <div className="flex flex-col gap-1 min-w-max">
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Occupancy</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono" data-testid="kpi-occupancy">
              {stats?.occupancyRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">{stats?.occupiedRooms || 0} / {stats?.totalRooms || 0} rooms</p>
          </div>

          {/* ADR */}
          <div className="flex flex-col gap-1 min-w-max">
            <div className="flex items-center gap-1">
              <IndianRupee className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">ADR</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="kpi-adr">
              ₹{(stats?.adr || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">per room night</p>
          </div>

          {/* RevPAR */}
          <div className="flex flex-col gap-1 min-w-max">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-chart-5" />
              <span className="text-xs font-medium text-muted-foreground">RevPAR</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-chart-5" data-testid="kpi-revpar">
              ₹{(stats?.revpar || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">revenue metric</p>
          </div>

          {/* Today's Revenue vs Target */}
          <div className="flex flex-col gap-1 min-w-max">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Today</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono" data-testid="kpi-revenue-today">
              ₹{(stats?.monthlyRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">vs ₹{(dailyTarget).toLocaleString()} target</p>
          </div>
        </div>
      </div>

      {/* Main Content - Multi-panel Layout */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4 md:p-6">
        {/* Left Sidebar - Quick Actions */}
        <div className="w-full md:w-64 flex flex-col gap-4 overflow-y-auto">
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => setLocation("/bookings?new=true")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm hover-elevate"
                data-testid="action-new-booking"
              >
                <Plus className="h-4 w-4" />
                New Booking
              </button>
              <button
                onClick={() => setLocation("/new-enquiry")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-sm hover-elevate"
                data-testid="action-new-enquiry"
              >
                <MessageSquarePlus className="h-4 w-4" />
                New Enquiry
              </button>
            </CardContent>
          </Card>

          {/* Key Metrics Cards */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Bookings</span>
                <span className="font-bold" data-testid="metric-active-bookings">{stats?.activeBookings || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Guests</span>
                <span className="font-bold" data-testid="metric-total-guests">{stats?.totalGuests || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Revenue</span>
                <span className="font-bold font-mono">₹{(stats?.monthlyRevenue || 0).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center - Timeline View */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">
          {/* Payment Notifications */}
          {recentPayments.length > 0 && (
            <div className="space-y-2">
              {recentPayments.map((payment) => {
                const isNew = !seenPaymentIds.has(payment.billId);
                if (isNew) {
                  setSeenPaymentIds(prev => new Set([...prev, payment.billId]));
                }
                return (
                  <div
                    key={payment.billId}
                    className={`p-3 rounded-lg border-l-4 flex items-center gap-3 text-sm ${
                      isNew
                        ? "bg-green-50 dark:bg-green-950 border-l-green-500 animate-pulse"
                        : "bg-green-50/50 dark:bg-green-950/50 border-l-green-400"
                    }`}
                    data-testid={`notification-payment-${payment.billId}`}
                  >
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        {payment.guestName} paid ₹{parseFloat(payment.totalAmount).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Today's Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayCheckIns.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Check-ins ({todayCheckIns.length})</p>
                  {todayCheckIns.slice(0, 3).map(b => {
                    const guest = guests?.find(g => g.id === b.guestId);
                    return (
                      <div key={b.id} className="text-xs p-2 rounded bg-green-50 dark:bg-green-950">
                        {guest?.fullName || "Guest"} - Room TBA
                      </div>
                    );
                  })}
                </div>
              )}
              {todayCheckOuts.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Check-outs ({todayCheckOuts.length})</p>
                  {todayCheckOuts.slice(0, 3).map(b => {
                    const guest = guests?.find(g => g.id === b.guestId);
                    return (
                      <div key={b.id} className="text-xs p-2 rounded bg-amber-50 dark:bg-amber-950">
                        {guest?.fullName || "Guest"} - Checkout due
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Alerts & Tasks */}
        <div className="w-full md:w-64 flex flex-col gap-4 overflow-y-auto">
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Alerts & Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {checkoutReminders.length > 0 && (
                <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
                  <p className="font-medium text-destructive">
                    {checkoutReminders.length} overdue checkout(s)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {checkoutReminders[0]?.guestName} in Room {checkoutReminders[0]?.roomNumber}
                  </p>
                </div>
              )}
              {activeOrders.length > 0 && (
                <div className="p-2 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {activeOrders.length} active order(s)
                  </p>
                </div>
              )}
              {yetToConfirmedEnquiries.length > 0 && (
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    {yetToConfirmedEnquiries.length} pending enquiry(ies)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Properties Overview */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{stats?.totalProperties || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Rooms</span>
                <span className="font-bold">{stats?.totalRooms || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
