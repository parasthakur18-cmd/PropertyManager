import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Hotel, Calendar, Users, TrendingUp, IndianRupee, LogIn, LogOut, ChefHat, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, isToday } from "date-fns";
import type { Booking, Guest, Room, Property } from "@shared/schema";

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

  const isLoading = statsLoading || bookingsLoading || guestsLoading || roomsLoading || propertiesLoading || ordersLoading;

  // Filter data for tabs
  const todayCheckIns = bookings?.filter(b => 
    isToday(new Date(b.checkInDate)) && (b.status === "pending" || b.status === "confirmed")
  ) || [];

  const todayCheckOuts = bookings?.filter(b => 
    isToday(new Date(b.checkOutDate)) && b.status === "checked-in"
  ) || [];

  const activeOrders = orders?.filter(o => 
    o.status === "pending" || o.status === "preparing" || o.status === "ready"
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
      title: "Total Guests",
      value: stats?.totalGuests || 0,
      icon: Users,
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your property management system.
        </p>
      </div>

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

      {/* Daily Operations Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="today-checkins" data-testid="tab-today-checkins">
            <LogIn className="h-4 w-4 mr-2" />
            Today's Check-ins <Badge variant="secondary" className="ml-2">{todayCheckIns.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="today-checkouts" data-testid="tab-today-checkouts">
            <LogOut className="h-4 w-4 mr-2" />
            Today's Check-outs <Badge variant="secondary" className="ml-2">{todayCheckOuts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active-orders" data-testid="tab-active-orders">
            <ChefHat className="h-4 w-4 mr-2" />
            Active Orders <Badge variant="secondary" className="ml-2">{activeOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all-bookings" data-testid="tab-all-bookings">
            <Receipt className="h-4 w-4 mr-2" />
            All Bookings <Badge variant="secondary" className="ml-2">{bookings?.length || 0}</Badge>
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
                
                // For group bookings, get all rooms
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
                
                // For group bookings, get all rooms
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
                
                // For group bookings, get all rooms
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Check-in</p>
                          <p className="font-medium">{format(new Date(booking.checkInDate), "PP")}</p>
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
                          <p className="text-muted-foreground mb-1">Advance</p>
                          <p className="font-medium font-mono">₹{booking.advanceAmount || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {bookings.length > 10 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Showing 10 of {bookings.length} bookings. Visit the Bookings page to see all.
                </p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
