import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Download, UtensilsCrossed, IndianRupee, Plus } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Order {
  id: number;
  roomId: number;
  bookingId: number | null;
  guestId: number | null;
  items: any[];
  totalAmount: string;
  status: string;
  createdAt: string;
  orderSource: string;
  roomNumber: string;
  specialInstructions: string | null;
  customerName?: string;
  customerPhone?: string;
}

interface Guest {
  id: number;
  fullName: string;
  phone: string;
}

interface Booking {
  id: number;
  guestId: number;
}

interface ActiveBooking {
  id: number;
  guest: {
    fullName: string;
  };
  room: {
    roomNumber: string;
  };
}

export default function FoodOrdersReport() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState<string>("last7days");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [mergeDialog, setMergeDialog] = useState<{ open: boolean; order: Order | null }>({
    open: false,
    order: null,
  });
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 10000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: guests } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: activeBookings } = useQuery<ActiveBooking[]>({
    queryKey: ["/api/bookings/active"],
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ orderIds, bookingId }: { orderIds: number[]; bookingId: number }) => {
      return await apiRequest("/api/orders/merge-to-booking", "PATCH", {
        orderIds,
        bookingId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      setMergeDialog({ open: false, order: null });
      setSelectedBookingId("");
      toast({
        title: "Order merged successfully",
        description: "The café order has been added to the guest bill",
      });
      navigate("/active-bookings");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to merge order",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleMergeOrder = () => {
    if (!mergeDialog.order || !selectedBookingId) {
      toast({
        title: "Please select a booking",
        description: "You must select an active booking to merge this order",
        variant: "destructive",
      });
      return;
    }
    
    const bookingId = parseInt(selectedBookingId, 10);
    if (isNaN(bookingId)) {
      toast({
        title: "Invalid booking selected",
        description: "Please select a valid booking",
        variant: "destructive",
      });
      return;
    }
    
    mergeMutation.mutate({
      orderIds: [mergeDialog.order.id],
      bookingId,
    });
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (dateRange) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "last7days":
        startDate = startOfDay(subDays(now, 6));
        break;
      case "last30days":
        startDate = startOfDay(subDays(now, 29));
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = startOfDay(new Date(customStartDate));
          endDate = endOfDay(new Date(customEndDate));
        } else {
          startDate = startOfDay(subDays(now, 6));
        }
        break;
      default:
        startDate = startOfDay(subDays(now, 6));
    }

    return { startDate, endDate };
  };

  const isCustomRangeIncomplete = dateRange === "custom" && (!customStartDate || !customEndDate);
  const { startDate, endDate } = getDateRange();
  const filteredOrders = isCustomRangeIncomplete 
    ? [] 
    : orders?.filter((order) => {
        const orderDate = new Date(order.createdAt);
        const isInDateRange = orderDate >= startDate && orderDate <= endDate;
        // Exclude rejected and cancelled orders from revenue calculations
        const isValidStatus = order.status !== "rejected" && order.status !== "cancelled";
        return isInDateRange && isValidStatus;
      });

  const getGuestName = (order: Order) => {
    if (order.customerName) return order.customerName;
    if (order.guestId) {
      const guest = guests?.find((g) => g.id === order.guestId);
      return guest?.fullName || "Unknown Guest";
    }
    if (order.bookingId) {
      const booking = bookings?.find((b) => b.id === order.bookingId);
      if (booking) {
        const guest = guests?.find((g) => g.id === booking.guestId);
        return guest?.fullName || "Unknown Guest";
      }
    }
    return order.orderSource === "guest" ? "Guest Order" : "Walk-in Customer";
  };

  const totalOrders = filteredOrders?.length || 0;
  const totalRevenue = filteredOrders?.reduce((sum, order) => {
    return sum + parseFloat(order.totalAmount || "0");
  }, 0) || 0;

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const ordersByStatus = filteredOrders?.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleExport = () => {
    if (!filteredOrders || filteredOrders.length === 0) return;

    const csvContent = [
      ["Order ID", "Date", "Room", "Guest Name", "Items", "Amount", "Status"].join(","),
      ...filteredOrders.map((order) => {
        const items = Array.isArray(order.items)
          ? order.items.map((item: any) => `${item.name} x${item.quantity}`).join("; ")
          : "N/A";
        return [
          order.id,
          format(new Date(order.createdAt), "dd MMM yyyy HH:mm"),
          order.roomNumber || "N/A",
          getGuestName(order),
          `"${items}"`,
          order.totalAmount,
          order.status,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `food-orders-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (ordersLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-food-orders-report">
            Food Orders Report
          </h1>
          <p className="text-muted-foreground mt-1">View and analyze food order history</p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          disabled={isCustomRangeIncomplete || !filteredOrders || filteredOrders.length === 0}
          data-testid="button-export"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Select Period</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Start Date *</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">End Date *</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </>
            )}

            <div className="text-sm">
              {dateRange === "custom" && (!customStartDate || !customEndDate) ? (
                <span className="text-destructive">Please select both start and end dates</span>
              ) : (
                <span className="text-muted-foreground">
                  Showing: {format(startDate, "MMM dd, yyyy")} - {format(endDate, "MMM dd, yyyy")}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-orders">
              {totalOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ordersByStatus?.delivered || 0} delivered, {ordersByStatus?.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ₹{totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {totalOrders} order{totalOrders !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-order-value">
              ₹{averageOrderValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per order average</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredOrders || filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found for the selected date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(order.createdAt), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.roomNumber || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>{getGuestName(order)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {Array.isArray(order.items) ? (
                            <div className="text-sm">
                              {order.items.map((item: any, idx: number) => (
                                <div key={idx} className="truncate">
                                  {item.name} x{item.quantity}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No items</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{parseFloat(order.totalAmount || "0").toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "delivered"
                              ? "default"
                              : order.status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.status === "delivered" && !order.bookingId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setMergeDialog({ open: true, order })}
                            data-testid={`button-merge-${order.id}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Merge to Bill
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog 
        open={mergeDialog.open} 
        onOpenChange={(open) => {
          setMergeDialog({ open, order: null });
          setSelectedBookingId("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Order to Guest Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Order #{mergeDialog.order?.id} - ₹{mergeDialog.order?.totalAmount}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Customer: {mergeDialog.order && getGuestName(mergeDialog.order)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Select Active Booking *</label>
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger data-testid="select-booking">
                  <SelectValue placeholder="Choose a guest's booking" />
                </SelectTrigger>
                <SelectContent>
                  {activeBookings && activeBookings.length > 0 ? (
                    activeBookings.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id.toString()}>
                        {booking.guest?.fullName && booking.room?.roomNumber
                          ? `${booking.guest.fullName} - Room ${booking.room.roomNumber}`
                          : `Booking #${booking.id}`
                        }
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-bookings" disabled>
                      No active bookings available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMergeDialog({ open: false, order: null });
                setSelectedBookingId("");
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMergeOrder}
              disabled={!selectedBookingId || mergeMutation.isPending}
              data-testid="button-confirm-merge"
            >
              {mergeMutation.isPending ? "Merging..." : "Merge to Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
