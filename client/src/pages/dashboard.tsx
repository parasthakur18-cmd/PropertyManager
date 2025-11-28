import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Hotel, Calendar, Users, TrendingUp, IndianRupee, LogIn, LogOut, ChefHat, Receipt, Plus, MessageSquarePlus, Clock, Check, AlertCircle, ChevronDown, Activity, AlertTriangle, Phone, User, MapPin, Utensils, Home, Bell, ArrowRight, CheckCircle2, XCircle, Timer, CookingPot, Upload, Camera } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, isToday, addDays, isBefore, isAfter, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

interface DashboardStats {
  totalProperties: number;
  totalRooms: number;
  activeBookings: number;
  activeUsers: number;
  totalGuests: number;
  occupancyRate: number;
  occupiedRooms: number;
  adr: number;
  revpar: number;
  monthlyRevenue: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500 text-white",
  confirmed: "bg-chart-2 text-white",
  "checked-in": "bg-chart-5 text-white",
  "checked-out": "bg-muted text-muted-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

const orderStatusColors: Record<string, string> = {
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

type MobileTab = "checkins" | "checkouts" | "inhouse" | "orders" | "upcoming";

export default function Dashboard() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("inhouse");
  const [, setLocation] = useLocation();
  const [recentPayments, setRecentPayments] = useState<PaymentNotification[]>([]);
  const [seenPaymentIds, setSeenPaymentIds] = useState<Set<number>>(new Set());
  const [autoCheckoutAlert, setAutoCheckoutAlert] = useState<{ count: number; timestamp: number } | null>(null);
  const [checkoutReminders, setCheckoutReminders] = useState<CheckoutReminder[]>([]);
  const [shownReminderIds, setShownReminderIds] = useState<Set<number>>(new Set());
  
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinBookingId, setCheckinBookingId] = useState<number | null>(null);
  const [checkinIdProof, setCheckinIdProof] = useState<string | null>(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutBookingId, setCheckoutBookingId] = useState<number | null>(null);
  const [cashReceived, setCashReceived] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", selectedPropertyId],
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

  const { data: bills } = useQuery<any[]>({
    queryKey: ["/api/bills"],
  });

  const { data: extraServices } = useQuery<any[]>({
    queryKey: ["/api/extra-services"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest(`/api/bookings/${id}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Success", description: "Booking status updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update booking status", variant: "destructive" });
    },
  });

  // Handler for check-in - opens dialog if ID proof missing
  const handleCheckInWithValidation = (booking: Booking) => {
    const guest = guests?.find(g => g.id === booking.guestId);
    
    if (!guest) {
      toast({
        title: "Guest Not Found",
        description: "Cannot check in without valid guest information",
        variant: "destructive",
      });
      return;
    }

    // If guest has ID proof, check-in directly
    if (guest.idProofImage) {
      updateStatusMutation.mutate({ id: booking.id, status: "checked-in" });
      return;
    }

    // No ID proof - open the check-in dialog to capture ID
    setCheckinBookingId(booking.id);
    setCheckinIdProof(null);
    setCheckinDialogOpen(true);
  };

  // Handler for checkout - opens checkout dialog
  const handleCheckout = (bookingId: number) => {
    setCheckoutBookingId(bookingId);
    setPaymentMethod("cash");
    setCheckoutDialogOpen(true);
  };

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return apiRequest(`/api/orders/${orderId}`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order Updated", description: "Order status has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update order", variant: "destructive" });
    },
  });

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

  useEffect(() => {
    const checkoutFlow = async () => {
      const now = new Date();
      const currentHour = now.getHours();

      if (currentHour >= 12) {
        try {
          console.log("[CHECKOUT_FLOW] Fetching checkout reminders...");
          const response = await fetch("/api/bookings/checkout-reminders");
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const reminders: CheckoutReminder[] = await response.json();
          setCheckoutReminders(reminders);
          
          reminders.forEach(reminder => {
            if (!shownReminderIds.has(reminder.bookingId)) {
              console.log(`[CHECKOUT_REMINDER] Showing reminder for booking ${reminder.bookingId}`);
              
              toast({
                title: "Checkout Reminder",
                description: `Guest ${reminder.guestName} in Room ${reminder.roomNumber} was due for checkout at ${reminder.checkOutTime} (${reminder.hoursOverdue}h ago). Please checkout manually.`,
                duration: 10000,
              });
              
              createNotification(
                "checkout_reminder",
                "Checkout Reminder",
                `${reminder.guestName} (Room ${reminder.roomNumber}) overdue by ${reminder.hoursOverdue}h`,
                "warning"
              );
              
              setShownReminderIds(prev => new Set(Array.from(prev).concat(reminder.bookingId)));
            }
          });
        } catch (error: any) {
          console.error("[CHECKOUT_ERROR] Failed to fetch checkout reminders:", error?.message);
        }
      }

      if (currentHour >= 16) {
        try {
          console.log("[AUTO_CHECKOUT] Executing force auto-checkout at 4 PM...");
          const response = await fetch("/api/bookings/force-auto-checkout", { method: "POST" });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();
          if (data.processedCount > 0) {
            console.log("[AUTO_CHECKOUT_SUCCESS] Force auto-checked out bookings:", data.processedCount);
            
            setAutoCheckoutAlert({ count: data.processedCount, timestamp: Date.now() });
            toast({
              title: "Forced Auto-Checkout Executed",
              description: `${data.processedCount} booking(s) auto-checked out at 4 PM. Guest notifications sent via WhatsApp.`,
              duration: 8000,
            });
            
            createNotification(
              "auto_checkout",
              "Auto-Checkout Executed",
              `${data.processedCount} booking(s) auto-checked out. WhatsApp notifications sent.`,
              "critical"
            );
            
            setShownReminderIds(new Set());
          }
        } catch (error: any) {
          console.error("[AUTO_CHECKOUT_ERROR] Failed to process force auto-checkout:", error?.message);
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
        
        const newPaymentIds: number[] = [];
        payments.forEach(payment => {
          if (!seenPaymentIds.has(payment.billId)) {
            console.log("[PAYMENT_RECEIVED] New payment recorded:", payment.billId);
            newPaymentIds.push(payment.billId);
            
            createNotification(
              "payment_received",
              "Payment Received",
              `${payment.guestName} paid ₹${payment.totalAmount} via ${payment.paymentMethod || "online"}`,
              "payment"
            );
          }
        });
        
        if (newPaymentIds.length > 0) {
          setSeenPaymentIds(prev => new Set(Array.from(prev).concat(newPaymentIds)));
        }
      } catch (error: any) {
        console.error("[PAYMENTS_ERROR] Failed to fetch recent payments:", error?.message);
      }
    };

    checkoutFlow();
    fetchRecentPayments();
    const interval = setInterval(() => {
      checkoutFlow();
      fetchRecentPayments();
    }, 900000);
    
    return () => clearInterval(interval);
  }, [shownReminderIds, toast, seenPaymentIds]);

  const isLoading = statsLoading || bookingsLoading || guestsLoading || roomsLoading || propertiesLoading || ordersLoading || enquiriesLoading;

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!selectedPropertyId) return bookings;
    return bookings.filter(b => b.propertyId === selectedPropertyId);
  }, [bookings, selectedPropertyId]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    // Always show all orders regardless of property filter to ensure consistency between mobile and desktop
    // The property filter applies to bookings and other sections, but orders should always be visible
    return orders;
  }, [orders]);

  const todayCheckIns = useMemo(() => 
    filteredBookings.filter(b => 
      isToday(new Date(b.checkInDate)) && (b.status === "pending" || b.status === "confirmed")
    ), [filteredBookings]
  );

  const todayCheckOuts = useMemo(() => 
    filteredBookings.filter(b => 
      isToday(new Date(b.checkOutDate)) && b.status === "checked-in"
    ), [filteredBookings]
  );

  const checkedInGuests = useMemo(() => 
    filteredBookings.filter(b => b.status === "checked-in"), [filteredBookings]
  );

  const upcomingBookings = useMemo(() => {
    const now = startOfDay(new Date());
    const next30Days = addDays(now, 30);
    return filteredBookings.filter(b => {
      const checkInDate = startOfDay(new Date(b.checkInDate));
      return checkInDate > now && checkInDate <= next30Days && (b.status === "confirmed" || b.status === "pending");
    }).sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());
  }, [filteredBookings]);

  const activeOrders = useMemo(() => 
    filteredOrders.filter(o => 
      o.status === "pending" || o.status === "preparing" || o.status === "ready"
    ), [filteredOrders]
  );

  const yetToConfirmedEnquiries = useMemo(() => 
    enquiries?.filter(e => e.status !== "confirmed") || [], [enquiries]
  );

  const getGuestInfo = (booking: Booking) => {
    const guest = guests?.find(g => g.id === booking.guestId);
    const room = rooms?.find(r => r.id === booking.roomId);
    const property = properties?.find(p => p.id === booking.propertyId);
    
    const groupRooms = booking.isGroupBooking && booking.roomIds
      ? rooms?.filter((r) => booking.roomIds?.includes(r.id)) || []
      : [];
    
    const roomDisplay = booking.isGroupBooking && groupRooms.length > 0
      ? groupRooms.map(r => r.roomNumber).join(", ")
      : room?.roomNumber || "TBA";
    
    return { guest, room, property, roomDisplay };
  };

  const getOrderInfo = (order: Order) => {
    const room = order.roomId ? rooms?.find(r => r.id === order.roomId) : null;
    const property = order.propertyId ? properties?.find(p => p.id === order.propertyId) : null;
    return { room, property };
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="h-16 border-t">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  const mobileTabConfig = [
    { key: "inhouse" as MobileTab, label: "In-House", icon: Home, count: checkedInGuests.length, color: "text-green-600" },
    { key: "checkins" as MobileTab, label: "Check-ins", icon: LogIn, count: todayCheckIns.length, color: "text-blue-600" },
    { key: "checkouts" as MobileTab, label: "Check-outs", icon: LogOut, count: todayCheckOuts.length, color: "text-amber-600" },
    { key: "orders" as MobileTab, label: "Orders", icon: Utensils, count: activeOrders.length, color: "text-purple-600" },
    { key: "upcoming" as MobileTab, label: "Upcoming", icon: Calendar, count: upcomingBookings.length, color: "text-orange-600" },
  ];

  // Enhanced analytics display
  const analyticsMetrics = [
    { label: "Total Properties", value: stats?.totalProperties || 0, icon: Building2, color: "from-purple-500 to-pink-500", trend: "+2 this month" },
    { label: "Occupancy Rate", value: stats?.occupancyRate ? `${Math.round(stats.occupancyRate)}%` : "0%", icon: Home, color: "from-green-500 to-emerald-500", trend: `${stats?.occupiedRooms || 0} rooms occupied` },
    { label: "Today's Check-ins", value: todayCheckIns.length, icon: LogIn, color: "from-blue-500 to-cyan-500", trend: `${checkedInGuests.length} already in-house` },
    { label: "Active Bookings", value: stats?.activeBookings || 0, icon: Calendar, color: "from-orange-500 to-amber-500", trend: `₹${(stats?.monthlyRevenue || 0).toLocaleString()}` },
    { label: "Monthly Revenue", value: `₹${(stats?.monthlyRevenue || 0).toLocaleString()}`, icon: IndianRupee, color: "from-teal-500 to-green-500", trend: "This month" },
    { label: "Active Users", value: stats?.activeUsers || 0, icon: Users, color: "from-pink-500 to-rose-500", trend: "On platform" },
  ];

  const renderAnalyticsCards = () => (
    <div className="hidden lg:grid grid-cols-3 gap-6 mb-8">
      {analyticsMetrics.slice(0, 3).map((metric, idx) => {
        const Icon = metric.icon;
        return (
          <Card key={idx} className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{metric.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{metric.trend}</p>
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br ${metric.color} text-white opacity-20 group-hover:opacity-30 transition-all`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${metric.color} animate-pulse-slow`} style={{width: `${Math.min(parseFloat(metric.value.toString()), 100)}%`}}></div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderMobileAnalyticsCards = () => (
    <div className="lg:hidden grid grid-cols-2 gap-3 mb-6">
      {analyticsMetrics.slice(0, 4).map((metric, idx) => {
        const Icon = metric.icon;
        return (
          <Card key={idx} className="group hover:shadow-md transition-all duration-300 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">{metric.label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{metric.value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color} text-white flex-shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderMobileContent = () => {
    switch (mobileTab) {
      case "inhouse":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold">In-House Guests</h2>
              <Badge variant="secondary" className="bg-green-500 text-white">{checkedInGuests.length}</Badge>
            </div>
            {checkedInGuests.length === 0 ? (
              <Card className="p-8 text-center">
                <Home className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No guests currently in property</p>
              </Card>
            ) : (
              checkedInGuests.map(booking => {
                const { guest, property, roomDisplay } = getGuestInfo(booking);
                return (
                  <Card key={booking.id} className="overflow-hidden" data-testid={`card-inhouse-${booking.id}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-base truncate">{guest?.fullName || "Guest"}</p>
                              <p className="text-sm text-muted-foreground">Room {roomDisplay}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property?.name || "Property"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {booking.numberOfGuests} guest(s)
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Out: {format(new Date(booking.checkOutDate), "MMM dd")}
                            </span>
                          </div>
                        </div>
                        {booking.isGroupBooking && (
                          <Badge variant="secondary" className="bg-blue-500 text-white flex-shrink-0">Group</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        {guest?.phone && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-11"
                            onClick={() => window.open(`tel:${guest.phone}`, "_self")}
                            data-testid={`btn-call-${booking.id}`}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        )}
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 h-11 bg-amber-500 hover:bg-amber-600"
                          onClick={() => handleCheckout(booking.id)}
                          data-testid={`btn-checkout-${booking.id}`}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Check Out
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        );

      case "checkins":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold">Today's Check-ins</h2>
              <Badge variant="secondary" className="bg-blue-500 text-white">{todayCheckIns.length}</Badge>
            </div>
            {todayCheckIns.length === 0 ? (
              <Card className="p-8 text-center">
                <LogIn className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No check-ins scheduled for today</p>
              </Card>
            ) : (
              todayCheckIns.map(booking => {
                const { guest, property, roomDisplay } = getGuestInfo(booking);
                return (
                  <Card key={booking.id} className="overflow-hidden" data-testid={`card-checkin-${booking.id}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                              <LogIn className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-base truncate">{guest?.fullName || "Guest"}</p>
                              <p className="text-sm text-muted-foreground">Room {roomDisplay}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property?.name || "Property"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {booking.numberOfGuests} guest(s)
                            </span>
                            <Badge className={statusColors[booking.status] || "bg-gray-500 text-white"}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                        {booking.isGroupBooking && (
                          <Badge variant="secondary" className="bg-blue-500 text-white flex-shrink-0">Group</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        {guest?.phone && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-11"
                            onClick={() => window.open(`tel:${guest.phone}`, "_self")}
                            data-testid={`btn-call-checkin-${booking.id}`}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        )}
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 h-11 bg-green-500 hover:bg-green-600"
                          onClick={() => handleCheckInWithValidation(booking)}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`btn-checkin-${booking.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Check In
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        );

      case "checkouts":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold">Today's Check-outs</h2>
              <Badge variant="secondary" className="bg-amber-500 text-white">{todayCheckOuts.length}</Badge>
            </div>
            {checkoutReminders.length > 0 && (
              <Alert variant="destructive" className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {checkoutReminders.length} guest(s) overdue for checkout
                </AlertDescription>
              </Alert>
            )}
            {todayCheckOuts.length === 0 ? (
              <Card className="p-8 text-center">
                <LogOut className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No check-outs scheduled for today</p>
              </Card>
            ) : (
              todayCheckOuts.map(booking => {
                const { guest, property, roomDisplay } = getGuestInfo(booking);
                const isOverdue = checkoutReminders.some(r => r.bookingId === booking.id);
                return (
                  <Card 
                    key={booking.id} 
                    className={`overflow-hidden ${isOverdue ? "border-destructive border-2" : ""}`}
                    data-testid={`card-checkout-${booking.id}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? "bg-destructive/10" : "bg-amber-500/10"}`}>
                              <LogOut className={`h-5 w-5 ${isOverdue ? "text-destructive" : "text-amber-600"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-base truncate">{guest?.fullName || "Guest"}</p>
                              <p className="text-sm text-muted-foreground">Room {roomDisplay}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {property?.name || "Property"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {booking.numberOfGuests} guest(s)
                            </span>
                            {isOverdue && (
                              <Badge variant="destructive" className="animate-pulse">Overdue</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {guest?.phone && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-11"
                            onClick={() => window.open(`tel:${guest.phone}`, "_self")}
                            data-testid={`btn-call-checkout-${booking.id}`}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        )}
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 h-11 bg-amber-500 hover:bg-amber-600"
                          onClick={() => handleCheckout(booking.id)}
                          data-testid={`btn-checkout-action-${booking.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete Checkout
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        );

      case "upcoming":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold">Upcoming Bookings</h2>
              <Badge variant="secondary" className="bg-orange-500 text-white">{upcomingBookings.length}</Badge>
            </div>
            {upcomingBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No upcoming bookings in next 30 days</p>
              </Card>
            ) : (
              upcomingBookings.map(booking => {
                const { guest, property, roomDisplay } = getGuestInfo(booking);
                const daysUntilCheckIn = Math.ceil((new Date(booking.checkInDate).getTime() - startOfDay(new Date()).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Card key={booking.id} className="overflow-hidden" data-testid={`card-upcoming-${booking.id}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-base truncate">{guest?.fullName || "Guest"}</p>
                              <p className="text-xs text-muted-foreground">{property?.name || "Property"}</p>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(booking.checkInDate), "MMM dd, yyyy")} ({daysUntilCheckIn} days)</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Hotel className="h-4 w-4 text-muted-foreground" />
                              <span>Room: {roomDisplay}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{booking.numberOfGuests} guest(s)</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={booking.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        );
      case "orders":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold">Active Orders</h2>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-purple-500 text-white">{activeOrders.length}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLocation("/orders?new=true")}
                  data-testid="btn-new-order"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
            </div>
            {activeOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Utensils className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active orders</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation("/orders?new=true")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Order
                </Button>
              </Card>
            ) : (
              activeOrders.map(order => {
                const { room, property } = getOrderInfo(order);
                const nextStatus = order.status === "pending" ? "preparing" : order.status === "preparing" ? "ready" : "completed";
                const nextStatusLabel = order.status === "pending" ? "Start Preparing" : order.status === "preparing" ? "Mark Ready" : "Complete";
                const nextStatusIcon = order.status === "pending" ? CookingPot : order.status === "preparing" ? CheckCircle2 : Check;
                const NextIcon = nextStatusIcon;
                
                return (
                  <Card key={order.id} className="overflow-hidden" data-testid={`card-order-${order.id}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                              <ChefHat className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-base">Order #{order.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.orderType === "room" 
                                  ? `Room ${room?.roomNumber || "N/A"}`
                                  : order.customerName || "Walk-in"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(order.items) && order.items.slice(0, 3).map((item: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {item.name} x{item.quantity}
                                </Badge>
                              ))}
                              {Array.isArray(order.items) && order.items.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{order.items.length - 3} more</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                              <Badge className={orderStatusColors[order.status] || "bg-gray-500 text-white"}>
                                {order.status}
                              </Badge>
                              <span className="font-mono font-bold text-foreground">₹{parseFloat(order.totalAmount).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {order.specialInstructions && (
                        <div className="mt-3 p-2 rounded bg-muted text-xs">
                          <span className="font-medium">Note:</span> {order.specialInstructions}
                        </div>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-11 text-destructive border-destructive"
                          onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: "cancelled" })}
                          disabled={updateOrderMutation.isPending}
                          data-testid={`btn-cancel-order-${order.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 h-11"
                          onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: nextStatus })}
                          disabled={updateOrderMutation.isPending}
                          data-testid={`btn-update-order-${order.id}`}
                        >
                          <NextIcon className="h-4 w-4 mr-2" />
                          {nextStatusLabel}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Compact Header with KPIs - Mobile Optimized */}
      <div className="border-b bg-card p-3 md:p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold">Dashboard</h1>
            <select
              value={selectedPropertyId || ""}
              onChange={(e) => setSelectedPropertyId(e.target.value ? parseInt(e.target.value) : null)}
              className="px-2 py-1 rounded-md border bg-background text-xs md:text-sm"
              data-testid="select-property"
            >
              <option value="">All Properties</option>
              {properties?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation("/enquiries?new=true")}
              className="h-8"
              data-testid="btn-quick-enquiry"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Enquiry</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation("/bookings?new=true")}
              className="h-8"
              data-testid="btn-quick-booking"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Booking</span>
            </Button>
          </div>
        </div>

        {/* KPI Strip - Horizontal Scroll on Mobile */}
        <div className="flex gap-4 overflow-x-auto pb-1 -mx-3 px-3">
          <div className="flex items-center gap-2 min-w-max bg-background/50 rounded-lg px-3 py-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Occupancy</p>
              <p className="text-lg font-bold font-mono" data-testid="kpi-occupancy">{stats?.occupancyRate || 0}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-max bg-background/50 rounded-lg px-3 py-2">
            <IndianRupee className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">ADR</p>
              <p className="text-lg font-bold font-mono text-green-600" data-testid="kpi-adr">₹{(stats?.adr || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-max bg-background/50 rounded-lg px-3 py-2">
            <TrendingUp className="h-4 w-4 text-chart-5" />
            <div>
              <p className="text-xs text-muted-foreground">RevPAR</p>
              <p className="text-lg font-bold font-mono text-chart-5" data-testid="kpi-revpar">₹{(stats?.revpar || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-max bg-background/50 rounded-lg px-3 py-2">
            <Receipt className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold font-mono" data-testid="kpi-revenue">₹{(stats?.monthlyRevenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Notifications Banner */}
      {recentPayments.length > 0 && (
        <div className="border-b bg-green-50 dark:bg-green-950 px-3 py-2 flex-shrink-0">
          {recentPayments.slice(0, 1).map((payment) => (
            <div
              key={payment.billId}
              className="flex items-center gap-2 text-sm"
              data-testid={`notification-payment-${payment.billId}`}
            >
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-green-900 dark:text-green-100 truncate">
                <span className="font-semibold">{payment.guestName}</span> paid ₹{parseFloat(payment.totalAmount).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 pb-20 lg:pb-4">
        {/* Desktop: 4-Column Full Section Layout */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4">
          {/* Check-In Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <LogIn className="h-5 w-5 text-blue-600" />
                Check-Ins
              </h2>
              <Badge className="bg-blue-500 text-white">{todayCheckIns.length}</Badge>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {todayCheckIns.length === 0 ? (
                <Card className="p-8 text-center">
                  <LogIn className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No check-ins today</p>
                </Card>
              ) : (
                todayCheckIns.map(booking => {
                  const { guest, roomDisplay, property } = getGuestInfo(booking);
                  return (
                    <Card key={booking.id} className="overflow-hidden" data-testid={`card-checkin-desktop-${booking.id}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <LogIn className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-base truncate">{guest?.fullName || "Guest"}</p>
                                <p className="text-sm text-muted-foreground">Room {roomDisplay}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {property?.name || "Property"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {booking.numberOfGuests} guest(s)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          {guest?.phone && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-11"
                              onClick={() => window.open(`tel:${guest.phone}`, "_self")}
                              data-testid={`btn-call-checkin-${booking.id}`}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </Button>
                          )}
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1 h-11 bg-blue-500 hover:bg-blue-600"
                            onClick={() => handleCheckInWithValidation(booking)}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`btn-checkin-action-${booking.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Check In
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* In-House Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Home className="h-5 w-5 text-green-600" />
                In-House
              </h2>
              <Badge className="bg-green-500 text-white">{checkedInGuests.length}</Badge>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {checkedInGuests.length === 0 ? (
                <Card className="p-8 text-center">
                  <Home className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No guests checked in</p>
                </Card>
              ) : (
                checkedInGuests.map(booking => {
                  const { guest, roomDisplay, property } = getGuestInfo(booking);
                  return (
                    <Card key={booking.id} className="overflow-hidden cursor-pointer hover-elevate" onClick={() => setLocation(`/bookings/${booking.id}`)} data-testid={`card-inhouse-desktop-${booking.id}`}>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base truncate">{guest?.fullName || "Guest"}</p>
                            <p className="text-sm text-muted-foreground">Room {roomDisplay}</p>
                            <p className="text-xs text-muted-foreground mt-1">{property?.name || "Property"}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Check-Out Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <LogOut className="h-5 w-5 text-amber-600" />
                Check-Outs
              </h2>
              <Badge className="bg-amber-500 text-white">{todayCheckOuts.length}</Badge>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {todayCheckOuts.length === 0 ? (
                <Card className="p-8 text-center">
                  <LogOut className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No check-outs today</p>
                </Card>
              ) : (
                todayCheckOuts.map(booking => {
                  const { guest, roomDisplay, property } = getGuestInfo(booking);
                  const isOverdue = checkoutReminders.some(r => r.bookingId === booking.id);
                  return (
                    <Card key={booking.id} className={`overflow-hidden ${isOverdue ? "border-destructive" : ""}`} data-testid={`card-checkout-desktop-${booking.id}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                <LogOut className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-base truncate">{guest?.fullName || "Guest"}</p>
                                <p className="text-sm text-muted-foreground">Room {roomDisplay}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {property?.name || "Property"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {booking.numberOfGuests} guest(s)
                              </span>
                              {isOverdue && (
                                <Badge variant="destructive" className="animate-pulse">Overdue</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          {guest?.phone && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-11"
                              onClick={() => window.open(`tel:${guest.phone}`, "_self")}
                              data-testid={`btn-call-checkout-${booking.id}`}
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </Button>
                          )}
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1 h-11 bg-amber-500 hover:bg-amber-600"
                            onClick={() => handleCheckout(booking.id)}
                            data-testid={`btn-checkout-action-${booking.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Complete Checkout
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Orders Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Utensils className="h-5 w-5 text-purple-600" />
                Orders
              </h2>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500 text-white">{activeOrders.length}</Badge>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setLocation("/orders?new=true")} data-testid="btn-new-order">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {activeOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <Utensils className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No active orders</p>
                </Card>
              ) : (
                activeOrders.map(order => {
                  const { room } = getOrderInfo(order);
                  return (
                    <Card key={order.id} className="overflow-hidden cursor-pointer hover-elevate" onClick={() => setLocation(`/orders/${order.id}`)} data-testid={`card-order-desktop-${order.id}`}>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <Utensils className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base">Order #{order.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.orderType === "room" ? `Room ${room?.roomNumber}` : order.customerName || "Walk-in"}
                            </p>
                            <Badge className={`${orderStatusColors[order.status] || "bg-gray-500 text-white"} mt-2`}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet: Tab Content */}
        <div className="lg:hidden">
          {renderMobileContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation - Fixed */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-card z-50">
        <div className="flex">
          {mobileTabConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = mobileTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key)}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[60px] transition-colors ${
                  isActive ? "bg-accent" : ""
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${isActive ? tab.color : "text-muted-foreground"}`} />
                  {tab.count > 0 && (
                    <span className={`absolute -top-1 -right-2 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted-foreground text-background"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Checkout Dialog - Split Payment System */}
      <Dialog open={checkoutDialogOpen} onOpenChange={(open) => {
        setCheckoutDialogOpen(open);
        if (!open) {
          setCheckoutBookingId(null);
          setCashReceived("0");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Split Payment Checkout</DialogTitle>
          </DialogHeader>
          {checkoutBookingId && (() => {
            const booking = bookings?.find(b => b.id === checkoutBookingId);
            const guest = guests?.find(g => g.id === booking?.guestId);
            const bookingOrders = orders?.filter(o => o.bookingId === checkoutBookingId) || [];
            const bookingExtras = extraServices?.filter(e => e.bookingId === checkoutBookingId) || [];
            const bookingRooms = booking?.isGroupBooking 
              ? rooms?.filter(r => booking?.roomIds?.includes(r.id)) || []
              : rooms?.filter(r => r.id === booking?.roomId) || [];
            
            const checkInDate = booking ? new Date(booking.checkInDate) : new Date();
            const checkOutDate = booking ? new Date(booking.checkOutDate) : new Date();
            const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
            
            const roomCharges = booking?.isGroupBooking
              ? bookingRooms.reduce((total, room) => {
                  const pricePerNight = booking?.customPrice ? parseFloat(booking.customPrice) / bookingRooms.length : parseFloat(room.pricePerNight);
                  return total + (pricePerNight * nights);
                }, 0)
              : (() => {
                  const room = bookingRooms[0];
                  const pricePerNight = booking?.customPrice ? parseFloat(booking.customPrice) : (room ? parseFloat(room.pricePerNight) : 0);
                  return pricePerNight * nights;
                })();
            
            const foodCharges = bookingOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);
            const extraCharges = bookingExtras.reduce((sum, extra) => sum + parseFloat(extra.amount || "0"), 0);
            const billTotal = roomCharges + foodCharges + extraCharges;
            const cashPaid = parseFloat(cashReceived) || 0;
            const remainingBalance = billTotal - cashPaid;
            
            return (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cash Received</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="0"
                  />
                </div>
                
                <div className="bg-muted/50 p-3 rounded-md space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bill Total:</span>
                    <span className="font-mono font-semibold">₹{billTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Paid:</span>
                    <span className="font-mono font-semibold">₹{cashPaid.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Remaining Balance:</span>
                    <span className={`font-mono font-bold ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      ₹{Math.max(0, remainingBalance).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/whatsapp/send-prebill', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            bookingId: checkoutBookingId,
                            phoneNumber: guest?.phone,
                            guestName: guest?.fullName,
                            billTotal
                          })
                        });
                        if (!res.ok) {
                          const error = await res.json();
                          throw new Error(error.message || 'Failed to send pre-bill');
                        }
                        toast({ title: "Success", description: "Pre-bill sent via WhatsApp" });
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message || "Failed to send pre-bill", variant: "destructive" });
                      }
                    }}
                  >
                    Send Pre-Bill via WhatsApp
                  </Button>
                  
                  {remainingBalance > 0 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/whatsapp/send-payment-link', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              amount: remainingBalance,
                              guestName: guest?.fullName,
                              guestPhone: guest?.phone,
                              guestEmail: guest?.email,
                              bookingId: checkoutBookingId
                            })
                          });
                          if (!res.ok) {
                            const error = await res.json();
                            throw new Error(error.message || 'Failed to send payment link');
                          }
                          toast({ title: "Success", description: "Payment link sent via WhatsApp" });
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message || "Failed to send payment link", variant: "destructive" });
                        }
                      }}
                    >
                      Send Payment Link
                    </Button>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCheckoutDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={async () => {
                        try {
                          await apiRequest("/api/bookings/checkout", "POST", {
                            bookingId: checkoutBookingId,
                            paymentMethod: paymentMethod,
                            cashReceived: cashPaid,
                            remainingBalance: Math.max(0, remainingBalance),
                            totalAmount: billTotal
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                          setCheckoutDialogOpen(false);
                          setCashReceived("0");
                          toast({ title: "Success", description: "Checkout completed" });
                        } catch (error: any) {
                          const errorMsg = error.message || "Checkout failed";
                          if (errorMsg.includes("Checkout not allowed") || errorMsg.includes("pending")) {
                            toast({ 
                              title: "⚠️ Cannot Checkout", 
                              description: errorMsg.includes("food order") 
                                ? "Complete all pending food orders before checkout. Go to Orders column and mark orders as completed."
                                : errorMsg,
                              variant: "destructive",
                              className: "border-2 border-destructive"
                            });
                          } else {
                            toast({ title: "Error", description: errorMsg, variant: "destructive" });
                          }
                        }
                      }}
                    >
                      Complete Checkout
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Check-in ID Verification Dialog */}
      <Dialog open={checkinDialogOpen} onOpenChange={(open) => {
        setCheckinDialogOpen(open);
        if (!open) {
          setCheckinBookingId(null);
          setCheckinIdProof(null);
        }
      }}>
        <DialogContent data-testid="dialog-checkin-verification" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload ID Proof</DialogTitle>
            <DialogDescription>
              Capture or upload guest's ID (Aadhar, PAN, Passport, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <input
              type="file"
              accept="image/*"
              id="checkin-file-upload"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                try {
                  // Get upload URL
                  const uploadRes = await fetch('/api/objects/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                  if (!uploadRes.ok) throw new Error('Failed to get upload URL');
                  const { uploadURL } = await uploadRes.json();
                  
                  // Upload file
                  const putRes = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
                  if (!putRes.ok) throw new Error('Failed to upload file');
                  
                  // Set ACL
                  const aclRes = await fetch('/api/guest-id-proofs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idProofUrl: uploadURL }) });
                  if (!aclRes.ok) throw new Error('Failed to secure ID proof');
                  const { objectPath } = await aclRes.json();
                  
                  setCheckinIdProof(objectPath);
                  toast({ title: "Success", description: "ID proof uploaded" });
                } catch (error: any) {
                  toast({ title: "Error", description: error.message || "Upload failed", variant: "destructive" });
                }
              }}
              data-testid="input-checkin-file"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="checkin-camera-capture"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                try {
                  const uploadRes = await fetch('/api/objects/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                  if (!uploadRes.ok) throw new Error('Failed to get upload URL');
                  const { uploadURL } = await uploadRes.json();
                  
                  const putRes = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
                  if (!putRes.ok) throw new Error('Failed to upload file');
                  
                  const aclRes = await fetch('/api/guest-id-proofs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idProofUrl: uploadURL }) });
                  if (!aclRes.ok) throw new Error('Failed to secure ID proof');
                  const { objectPath } = await aclRes.json();
                  
                  setCheckinIdProof(objectPath);
                  toast({ title: "Success", description: "ID proof captured" });
                } catch (error: any) {
                  toast({ title: "Error", description: error.message || "Upload failed", variant: "destructive" });
                }
              }}
              data-testid="input-checkin-camera"
            />
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById('checkin-file-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById('checkin-camera-capture')?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            </div>
            
            {checkinIdProof && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                <Upload className="h-4 w-4" />
                ID uploaded successfully
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCheckinDialogOpen(false);
                setCheckinBookingId(null);
                setCheckinIdProof(null);
              }}
              data-testid="button-cancel-checkin"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!checkinIdProof) {
                  toast({
                    title: "ID Required",
                    description: "Please upload guest ID proof before checking in",
                    variant: "destructive",
                  });
                  return;
                }
                
                if (!checkinBookingId) {
                  toast({
                    title: "Error",
                    description: "No booking selected",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  const booking = bookings?.find(b => b.id === checkinBookingId);
                  if (!booking) {
                    toast({
                      title: "Error",
                      description: "Booking not found",
                      variant: "destructive",
                    });
                    return;
                  }

                  console.log("[CHECK-IN] Starting check-in for booking:", checkinBookingId);

                  // Update guest with ID proof
                  console.log("[CHECK-IN] Updating guest with ID proof...");
                  await apiRequest(`/api/guests/${booking.guestId}`, "PATCH", {
                    idProofImage: checkinIdProof
                  });
                  console.log("[CHECK-IN] Guest updated with ID proof");

                  queryClient.invalidateQueries({ queryKey: ["/api/guests"] });

                  // Update booking status
                  console.log("[CHECK-IN] Updating booking status to checked-in...");
                  await apiRequest(`/api/bookings/${checkinBookingId}/status`, "PATCH", {
                    status: "checked-in"
                  });
                  console.log("[CHECK-IN] Booking status updated successfully");

                  queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
                  
                  toast({
                    title: "Success",
                    description: "Guest checked in successfully",
                  });
                  
                  setCheckinDialogOpen(false);
                  setCheckinBookingId(null);
                  setCheckinIdProof(null);
                } catch (error: any) {
                  console.error("[CHECK-IN] Error during check-in:", error);
                  toast({
                    title: "Error",
                    description: error.message || "Failed to check in guest",
                    variant: "destructive",
                  });
                }
              }}
              disabled={!checkinIdProof}
              data-testid="button-confirm-checkin"
            >
              Complete Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
