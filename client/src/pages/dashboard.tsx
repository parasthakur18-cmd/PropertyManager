import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Hotel, Calendar, Users, TrendingUp, IndianRupee, LogIn, LogOut, ChefHat, Receipt, Plus, MessageSquarePlus, Clock, Check, AlertCircle } from "lucide-react";
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("today-checkins");
  const [, setLocation] = useLocation();
  const [recentPayments, setRecentPayments] = useState<PaymentNotification[]>([]);
  const [seenPaymentIds, setSeenPaymentIds] = useState<Set<number>>(new Set());
  const [autoCheckoutAlert, setAutoCheckoutAlert] = useState<{ count: number; timestamp: number } | null>(null);
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

  // Auto-checkout overdue bookings and fetch recent payments
  useEffect(() => {
    const processAutoCheckouts = async () => {
      try {
        const response = await fetch("/api/bookings/auto-checkout", { method: "POST" });
        if (response.ok) {
          const data = await response.json();
          if (data.processedCount > 0) {
            console.log(`[Dashboard] Auto-checked out ${data.processedCount} overdue bookings`);
            setAutoCheckoutAlert({ count: data.processedCount, timestamp: Date.now() });
            toast({
              title: "Auto-Checkout Complete",
              description: `${data.processedCount} overdue booking(s) checked out automatically. Guest notifications sent via WhatsApp.`,
              duration: 8000,
            });
          }
        }
      } catch (error) {
        console.error("Failed to process auto-checkouts:", error);
      }
    };

    const fetchRecentPayments = async () => {
      try {
        const response = await fetch("/api/recent-payments");
        if (response.ok) {
          const payments: PaymentNotification[] = await response.json();
          setRecentPayments(payments);
        }
      } catch (error) {
        console.error("Failed to fetch recent payments:", error);
      }
    };

    processAutoCheckouts();
    fetchRecentPayments();
    const interval = setInterval(fetchRecentPayments, 5000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="p-6 md:p-8">
      {/* Payment Notifications */}
      {recentPayments.length > 0 && (
        <div className="mb-6 space-y-2 max-h-96 overflow-y-auto">
          {recentPayments.map((payment) => {
            const isNew = !seenPaymentIds.has(payment.billId);
            if (isNew) {
              setSeenPaymentIds(prev => new Set([...prev, payment.billId]));
            }
            return (
              <div
                key={payment.billId}
                className={`p-4 rounded-lg border-l-4 flex items-center gap-3 ${
                  isNew
                    ? "bg-green-50 dark:bg-green-950 border-l-green-500 animate-pulse"
                    : "bg-green-50/50 dark:bg-green-950/50 border-l-green-400"
                }`}
                data-testid={`notification-payment-${payment.billId}`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white flex-shrink-0">
                  <Check className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Payment Received
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-200 truncate">
                    {payment.guestName} paid ₹{parseFloat(payment.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold font-serif mb-2">Dashboard</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Welcome to Hostezee - the world's first zero-infrastructure property management system. Deploy instantly, manage everything.
        </p>
      </div>

      {/* Quick Action Tabs - Optimized for Mobile (2x3 Grid) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 h-auto p-2 mb-6">
          <TabsTrigger value="today-checkins" className="flex flex-col h-auto py-3 px-2" data-testid="tab-today-checkins">
            <LogIn className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Check-ins</span>
            <Badge variant="secondary" className="mt-1 text-xs h-5">{todayCheckIns.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="today-checkouts" className="flex flex-col h-auto py-3 px-2" data-testid="tab-today-checkouts">
            <LogOut className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Check-outs</span>
            <Badge variant="secondary" className="mt-1 text-xs h-5">{todayCheckOuts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming-checkins" className="flex flex-col h-auto py-3 px-2" data-testid="tab-upcoming-checkins">
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Upcoming</span>
            <Badge variant="secondary" className="mt-1 text-xs h-5">{upcomingCheckIns.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active-orders" className="flex flex-col h-auto py-3 px-2" data-testid="tab-active-orders">
            <ChefHat className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Orders</span>
            <Badge variant="secondary" className="mt-1 text-xs h-5">{activeOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all-bookings" className="flex flex-col h-auto py-3 px-2" data-testid="tab-all-bookings">
            <Receipt className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Bookings</span>
            <Badge variant="secondary" className="mt-1 text-xs h-5">{bookings?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="yet-to-confirmed" className="flex flex-col h-auto py-3 px-2" data-testid="tab-yet-to-confirmed">
            <Clock className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Pending</span>
            <Badge variant="secondary" className="mt-1 text-xs h-5">{yetToConfirmedEnquiries.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="checked-in-guests" className="flex flex-col h-auto py-3 px-2" data-testid="tab-checked-in-guests">
            <LogIn className="h-5 w-5 mb-1 text-green-600" />
            <span className="text-xs font-medium">In Property</span>
            <Badge variant="secondary" className="mt-1 text-xs h-5 bg-green-500 text-white">{checkedInGuests.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="new-booking" 
            className="flex flex-col h-auto py-3 px-2 bg-primary/10 hover:bg-primary/20" 
            onClick={() => setLocation("/bookings?new=true")}
            data-testid="tab-new-booking"
          >
            <Plus className="h-5 w-5 mb-1 text-primary" />
            <span className="text-xs font-medium text-primary">New Booking</span>
          </TabsTrigger>
          <TabsTrigger 
            value="new-enquiry" 
            className="flex flex-col h-auto py-3 px-2 bg-primary/10 hover:bg-primary/20" 
            onClick={() => setLocation("/new-enquiry")}
            data-testid="tab-new-enquiry"
          >
            <MessageSquarePlus className="h-5 w-5 mb-1 text-primary" />
            <span className="text-xs font-medium text-primary">New Enquiry</span>
          </TabsTrigger>
        </TabsList>

        {/* Today's Check-ins */}
        <TabsContent value="today-checkins">
          {todayCheckIns.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LogIn className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold">No check-ins today</h3>
                <p className="text-muted-foreground">All guests scheduled for today have checked in</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {todayCheckIns.map((booking) => {
                const guest = guests?.find(g => g.id === booking.guestId);
                const room = rooms?.find(r => r.id === booking.roomId);
                const property = properties?.find(p => p.id === booking.propertyId);
                
                const groupRooms = booking.isGroupBooking && booking.roomIds
                  ? rooms?.filter((r) => booking.roomIds?.includes(r.id)) || []
                  : [];
                
                const roomDisplay = booking.isGroupBooking && groupRooms.length > 0
                  ? groupRooms.map(r => `Room ${r.roomNumber}`).join(", ")
                  : room ? `Room ${room.roomNumber}` : "Room TBA";
                
                return (
                  <Card key={booking.id} className="hover-elevate" data-testid={`card-checkin-${booking.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                            <LogIn className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2 flex-wrap">
                              {guest?.fullName || "Unknown Guest"}
                              <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                                {booking.status}
                              </Badge>
                              {booking.isGroupBooking && (
                                <Badge variant="secondary" className="bg-blue-500 text-white">
                                  Group Booking
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {property?.name} • {roomDisplay}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Check-in</p>
                          <p className="font-medium">{format(new Date(booking.checkInDate), "PPP")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Check-out</p>
                          <p className="font-medium">{format(new Date(booking.checkOutDate), "PPP")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Guests</p>
                          <p className="font-medium">{booking.numberOfGuests}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Phone</p>
                          <p className="font-medium">{guest?.phone || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Checked-in Guests (Currently in Property) */}
        <TabsContent value="checked-in-guests">
          {checkedInGuests.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100 text-green-600">
                  <LogIn className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold">No guests checked in</h3>
                <p className="text-muted-foreground">No guests are currently in the property</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {checkedInGuests.map((booking) => {
                const guest = guests?.find(g => g.id === booking.guestId);
                const room = rooms?.find(r => r.id === booking.roomId);
                const property = properties?.find(p => p.id === booking.propertyId);
                
                const groupRooms = booking.isGroupBooking && booking.roomIds
                  ? rooms?.filter((r) => booking.roomIds?.includes(r.id)) || []
                  : [];
                
                const roomDisplay = booking.isGroupBooking && groupRooms.length > 0
                  ? groupRooms.map(r => `Room ${r.roomNumber}`).join(", ")
                  : room ? `Room ${room.roomNumber}` : "Room TBA";
                
                return (
                  <Card key={booking.id} className="hover-elevate border-green-200" data-testid={`card-checked-in-${booking.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                            <LogIn className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2 flex-wrap">
                              {guest?.fullName || "Unknown Guest"}
                              <Badge className="bg-green-500 text-white">
                                Checked In
                              </Badge>
                              {booking.isGroupBooking && (
                                <Badge variant="secondary" className="bg-blue-500 text-white">
                                  Group
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {property?.name} • {roomDisplay}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Check-in Date</p>
                          <p className="font-medium">{format(new Date(booking.checkInDate), "MMM dd")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Check-out</p>
                          <p className="font-medium">{format(new Date(booking.checkOutDate), "MMM dd")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Guests</p>
                          <p className="font-medium">{booking.numberOfGuests}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Phone</p>
                          <p className="font-medium">{guest?.phone || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Today's Check-outs */}
        <TabsContent value="today-checkouts">
          {todayCheckOuts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LogOut className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold">No check-outs today</h3>
                <p className="text-muted-foreground">No guests scheduled to check out today</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {todayCheckOuts.map((booking) => {
                const guest = guests?.find(g => g.id === booking.guestId);
                const room = rooms?.find(r => r.id === booking.roomId);
                const property = properties?.find(p => p.id === booking.propertyId);
                
                const groupRooms = booking.isGroupBooking && booking.roomIds
                  ? rooms?.filter((r) => booking.roomIds?.includes(r.id)) || []
                  : [];
                
                const roomDisplay = booking.isGroupBooking && groupRooms.length > 0
                  ? groupRooms.map(r => `Room ${r.roomNumber}`).join(", ")
                  : room ? `Room ${room.roomNumber}` : "Room TBA";
                
                return (
                  <Card key={booking.id} className="hover-elevate" data-testid={`card-checkout-${booking.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                            <LogOut className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2 flex-wrap">
                              {guest?.fullName || "Unknown Guest"}
                              <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                                {booking.status}
                              </Badge>
                              {booking.isGroupBooking && (
                                <Badge variant="secondary" className="bg-blue-500 text-white">
                                  Group Booking
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {property?.name} • {roomDisplay}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Check-in</p>
                          <p className="font-medium">{format(new Date(booking.checkInDate), "PPP")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Check-out</p>
                          <p className="font-medium">{format(new Date(booking.checkOutDate), "PPP")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Guests</p>
                          <p className="font-medium">{booking.numberOfGuests}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Phone</p>
                          <p className="font-medium">{guest?.phone || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Active Orders */}
        <TabsContent value="active-orders">
          {activeOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ChefHat className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold">No active orders</h3>
                <p className="text-muted-foreground">All orders have been completed</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const room = order.roomId ? rooms?.find(r => r.id === order.roomId) : null;
                const property = order.propertyId ? properties?.find(p => p.id === order.propertyId) : null;
                
                return (
                  <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                            <ChefHat className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              Order #{order.id}
                              <Badge className={orderStatusColors[order.status as keyof typeof orderStatusColors]}>
                                {order.status}
                              </Badge>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {order.orderType === "room" 
                                ? `Room ${room?.roomNumber || "N/A"} • ${property?.name || "N/A"}`
                                : order.customerName || "Walk-in Customer"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-lg font-bold font-mono">₹{order.totalAmount}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Items:</p>
                        <div className="text-sm text-muted-foreground">
                          {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                            <div key={idx}>• {item.name} x{item.quantity}</div>
                          ))}
                        </div>
                        {order.specialInstructions && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Special Instructions:</p>
                            <p className="text-sm text-muted-foreground">{order.specialInstructions}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* All Bookings */}
        <TabsContent value="all-bookings">
          {!bookings || bookings.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Receipt className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold">No bookings yet</h3>
                <p className="text-muted-foreground">Create your first booking to get started</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.slice(0, 10).map((booking) => {
                const guest = guests?.find(g => g.id === booking.guestId);
                const room = rooms?.find(r => r.id === booking.roomId);
                const property = properties?.find(p => p.id === booking.propertyId);
                
                const groupRooms = booking.isGroupBooking && booking.roomIds
                  ? rooms?.filter((r) => booking.roomIds?.includes(r.id)) || []
                  : [];
                
                const roomDisplay = booking.isGroupBooking && groupRooms.length > 0
                  ? groupRooms.map(r => `Room ${r.roomNumber}`).join(", ")
                  : room ? `Room ${room.roomNumber}` : "Room TBA";
                
                return (
                  <Card key={booking.id} className="hover-elevate" data-testid={`card-booking-${booking.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Hotel className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2 flex-wrap">
                              {guest?.fullName || "Unknown Guest"}
                              <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                                {booking.status}
                              </Badge>
                              {booking.isGroupBooking && (
                                <Badge variant="secondary" className="bg-blue-500 text-white">
                                  Group Booking
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {property?.name} • {roomDisplay}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs md:text-sm">
                        <div>
                          <p className="text-xs md:text-sm text-muted-foreground mb-1">Check-in</p>
                          <p className="text-xs md:text-sm font-medium">{format(new Date(booking.checkInDate), "PP")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Check-out</p>
                          <p className="font-medium">{format(new Date(booking.checkOutDate), "PP")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Guests</p>
                          <p className="font-medium">{booking.numberOfGuests}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Total</p>
                          <p className="font-medium font-mono">₹{booking.totalAmount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {bookings.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  Showing 10 of {bookings.length} bookings. View all in the Bookings page.
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-5" />
              Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono mb-2" data-testid="stat-occupancy-rate">
              {stats?.occupancyRate || 0}%
            </div>
            <p className="text-sm text-muted-foreground">
              Current occupancy across all properties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-chart-4" />
              Revenue This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono mb-2" data-testid="stat-monthly-revenue">
              ₹{stats?.monthlyRevenue?.toLocaleString() || "0"}
            </div>
            <p className="text-sm text-muted-foreground">
              Total revenue generated this month
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
