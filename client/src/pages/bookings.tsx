import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, User, Hotel, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertBookingSchema, type InsertBooking, type Booking, type Property, type Guest, type Room } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusColors = {
  pending: "bg-amber-500 text-white",
  confirmed: "bg-chart-2 text-white",
  "checked-in": "bg-chart-5 text-white",
  "checked-out": "bg-muted text-muted-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

export default function Bookings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [quickGuestData, setQuickGuestData] = useState({
    fullName: "",
    phone: "",
    email: "",
  });
  const [checkoutBookingId, setCheckoutBookingId] = useState<number | null>(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: guests } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const form = useForm<InsertBooking>({
    resolver: zodResolver(insertBookingSchema),
    defaultValues: {
      propertyId: undefined as any,
      guestId: undefined as any,
      roomId: undefined as any,
      checkInDate: new Date(),
      checkOutDate: new Date(),
      status: "pending",
      numberOfGuests: 1,
      customPrice: null,
      advanceAmount: "0",
      specialRequests: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      return await apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      setQuickGuestData({ fullName: "", phone: "", email: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/bookings/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Booking status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertBooking) => {
    // First, validate and create the guest
    if (!quickGuestData.fullName || !quickGuestData.phone) {
      toast({
        title: "Error",
        description: "Guest name and phone number are required",
        variant: "destructive",
      });
      return;
    }

    // Validate room selection
    if (!data.roomId) {
      toast({
        title: "Error",
        description: "Please select a room",
        variant: "destructive",
      });
      return;
    }

    // Create guest first
    try {
      const guestResponse = await apiRequest("POST", "/api/guests", quickGuestData);
      const newGuest = await guestResponse.json();
      
      // Then create booking with the new guest
      const bookingData = {
        ...data,
        guestId: newGuest.id,
      };
      createMutation.mutate(bookingData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create guest",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Filter bookings based on search query
  const filteredBookings = bookings?.filter((booking) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const property = properties?.find(p => p.id === booking.propertyId);
    const guest = guests?.find(g => g.id === booking.guestId);
    const room = rooms?.find(r => r.id === booking.roomId);
    
    return (
      guest?.fullName?.toLowerCase().includes(query) ||
      guest?.phone?.toLowerCase().includes(query) ||
      property?.name?.toLowerCase().includes(query) ||
      room?.roomNumber?.toLowerCase().includes(query) ||
      booking.status?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage reservations and check-ins</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest, property, room, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-bookings"
            />
          </div>
          <Dialog 
            open={isDialogOpen} 
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                form.reset();
                setQuickGuestData({ fullName: "", phone: "", email: "" });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-add-booking">
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.log("Form validation errors:", errors);
                toast({
                  title: "Form Validation Error",
                  description: "Please check all required fields",
                  variant: "destructive",
                });
              })} className="space-y-4 pb-4">
                <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/10">
                  <h3 className="font-medium">Guest Details</h3>
                  <Input
                    placeholder="Full Name *"
                    value={quickGuestData.fullName}
                    onChange={(e) => setQuickGuestData({ ...quickGuestData, fullName: e.target.value })}
                    data-testid="input-guest-name"
                  />
                  <Input
                    placeholder="Phone Number *"
                    value={quickGuestData.phone}
                    onChange={(e) => setQuickGuestData({ ...quickGuestData, phone: e.target.value })}
                    data-testid="input-guest-phone"
                  />
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    value={quickGuestData.email}
                    onChange={(e) => setQuickGuestData({ ...quickGuestData, email: e.target.value })}
                    data-testid="input-guest-email"
                  />
                </div>
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const roomId = parseInt(value);
                          field.onChange(roomId);
                          const selectedRoom = rooms?.find(r => r.id === roomId);
                          if (selectedRoom) {
                            form.setValue("propertyId", selectedRoom.propertyId);
                          }
                        }}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-booking-room">
                            <SelectValue placeholder="Select room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms?.filter(r => r.status === "available").map((room) => {
                            const property = properties?.find(p => p.id === room.propertyId);
                            return (
                              <SelectItem key={room.id} value={room.id.toString()}>
                                {property?.name} - Room {room.roomNumber} ({room.roomType}) - ₹{room.pricePerNight}/night
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="checkInDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in Date</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-booking-checkin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="checkOutDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-out Date</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-booking-checkout"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="numberOfGuests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Guests</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          value={field.value || 1}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-booking-guests"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Price Per Night (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Leave empty for room price"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? e.target.value : null)}
                            data-testid="input-booking-custom-price"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Override room price with a custom rate
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="advanceAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advance Payment</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? e.target.value : "0")}
                            data-testid="input-booking-advance"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Amount received in advance
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requirements..."
                          value={field.value || ""}
                          onChange={field.onChange}
                          data-testid="input-booking-requests"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-booking">
                    {createMutation.isPending ? "Creating..." : "Create Booking"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {!filteredBookings || filteredBookings.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Calendar className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-semibold">{searchQuery ? "No bookings found" : "No bookings yet"}</h3>
            <p className="text-muted-foreground max-w-md">
              {searchQuery ? "Try adjusting your search query" : "Create your first booking to get started"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const property = properties?.find((p) => p.id === booking.propertyId);
            const guest = guests?.find((g) => g.id === booking.guestId);
            const room = rooms?.find((r) => r.id === booking.roomId);

            return (
              <Card key={booking.id} className="hover-elevate" data-testid={`card-booking-${booking.id}`}>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Hotel className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {property?.name || "Unknown Property"}
                          <Badge className={statusColors[booking.status as keyof typeof statusColors] || ""} data-testid={`badge-booking-status-${booking.id}`}>
                            {booking.status}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {guest?.fullName || "Unknown Guest"} • {room ? `Room ${room.roomNumber}` : "Room TBA"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.status === "checked-in" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setCheckoutBookingId(booking.id);
                            setCheckoutDialogOpen(true);
                          }}
                          data-testid={`button-checkout-${booking.id}`}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Checkout
                        </Button>
                      )}
                      <Select
                        value={booking.status}
                        onValueChange={(value) => updateStatusMutation.mutate({ id: booking.id, status: value })}
                      >
                        <SelectTrigger className="w-40" data-testid={`select-booking-status-${booking.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="checked-in">Checked In</SelectItem>
                          <SelectItem value="checked-out">Checked Out</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Check-in</p>
                      <p className="font-medium" data-testid={`text-booking-checkin-${booking.id}`}>{format(new Date(booking.checkInDate), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Check-out</p>
                      <p className="font-medium" data-testid={`text-booking-checkout-${booking.id}`}>{format(new Date(booking.checkOutDate), "PPP")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Guests</p>
                      <p className="font-medium" data-testid={`text-booking-guests-${booking.id}`}>{booking.numberOfGuests}</p>
                    </div>
                    {booking.specialRequests && (
                      <div className="md:col-span-3">
                        <p className="text-muted-foreground mb-1">Special Requests</p>
                        <p className="text-sm">{booking.specialRequests}</p>
                      </div>
                    )}
                    {booking.totalAmount && (
                      <div>
                        <p className="text-muted-foreground mb-1">Total Amount</p>
                        <p className="font-semibold font-mono text-lg" data-testid={`text-booking-total-${booking.id}`}>₹{booking.totalAmount}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout - Bill Summary</DialogTitle>
          </DialogHeader>
          {checkoutBookingId && <CheckoutBillSummary 
            bookingId={checkoutBookingId} 
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            onClose={() => setCheckoutDialogOpen(false)}
          />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Checkout Bill Summary Component
function CheckoutBillSummary({ 
  bookingId, 
  paymentMethod, 
  setPaymentMethod,
  onClose 
}: { 
  bookingId: number;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();

  // Fetch booking details
  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const booking = bookings?.find(b => b.id === bookingId);

  // Fetch related data
  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: rooms } = useQuery<any[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: guests } = useQuery<any[]>({
    queryKey: ["/api/guests"],
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  const { data: extraServices } = useQuery<any[]>({
    queryKey: ["/api/addons"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/bookings/checkout", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Checkout completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process checkout",
        variant: "destructive",
      });
    },
  });

  if (!booking) {
    return <div className="p-4">Loading booking details...</div>;
  }

  const property = properties?.find(p => p.id === booking.propertyId);
  const room = rooms?.find(r => r.id === booking.roomId);
  const guest = guests?.find(g => g.id === booking.guestId);

  // Filter orders and extras for this booking
  const bookingOrders = orders?.filter(o => o.bookingId === bookingId) || [];
  const bookingExtras = extraServices?.filter(e => e.bookingId === bookingId) || [];

  // Calculate charges
  const checkInDate = new Date(booking.checkInDate);
  const checkOutDate = new Date(booking.checkOutDate);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Use customPrice if available, otherwise use room price
  const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) : (room ? parseFloat(room.pricePerNight) : 0);
  const roomCharges = pricePerNight * nights;

  const foodCharges = bookingOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);
  const extraCharges = bookingExtras.reduce((sum, extra) => sum + parseFloat(extra.amount || "0"), 0);

  const subtotal = roomCharges + foodCharges + extraCharges;
  const gstRate = 18;
  const gstAmount = (subtotal * gstRate) / 100;
  const serviceChargeRate = 10;
  const serviceChargeAmount = (subtotal * serviceChargeRate) / 100;
  const totalAmount = subtotal + gstAmount + serviceChargeAmount;

  const advancePaid = parseFloat(booking.advanceAmount || "0");
  const balanceAmount = totalAmount - advancePaid;

  const handleCheckout = () => {
    checkoutMutation.mutate({
      bookingId,
      paymentMethod,
    });
  };

  return (
    <div className="space-y-6">
      {/* Guest and Room Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{guest?.fullName}</h3>
            <p className="text-sm text-muted-foreground">{property?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{room ? `Room ${room.roomNumber}` : "Room TBA"}</p>
            <p className="text-xs text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <span>{format(checkInDate, "PPP")}</span>
          <span className="mx-2">→</span>
          <span>{format(checkOutDate, "PPP")}</span>
        </div>
      </div>

      {/* Bill Details */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold mb-3">Bill Details</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Room Charges ({nights} × ₹{pricePerNight.toFixed(2)})</span>
            <span className="font-mono" data-testid="text-checkout-room-charges">₹{roomCharges.toFixed(2)}</span>
          </div>
          
          {foodCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span>Food & Beverage ({bookingOrders.length} order{bookingOrders.length !== 1 ? 's' : ''})</span>
              <span className="font-mono" data-testid="text-checkout-food-charges">₹{foodCharges.toFixed(2)}</span>
            </div>
          )}
          
          {extraCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span>Extra Services ({bookingExtras.length} service{bookingExtras.length !== 1 ? 's' : ''})</span>
              <span className="font-mono" data-testid="text-checkout-extra-charges">₹{extraCharges.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span>GST ({gstRate}%)</span>
            <span className="font-mono">₹{gstAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Service Charge ({serviceChargeRate}%)</span>
            <span className="font-mono">₹{serviceChargeAmount.toFixed(2)}</span>
          </div>

          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total Amount</span>
              <span className="font-mono text-lg" data-testid="text-checkout-total">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {advancePaid > 0 && (
            <div className="flex justify-between text-sm text-chart-2">
              <span>Advance Paid</span>
              <span className="font-mono" data-testid="text-checkout-advance">-₹{advancePaid.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Balance Due</span>
              <span className="font-mono text-primary" data-testid="text-checkout-balance">₹{balanceAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Method</label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger data-testid="select-checkout-payment-method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-checkout">
          Cancel
        </Button>
        <Button 
          onClick={handleCheckout} 
          disabled={checkoutMutation.isPending}
          data-testid="button-confirm-checkout"
        >
          {checkoutMutation.isPending ? "Processing..." : `Complete Checkout (₹${balanceAmount.toFixed(2)})`}
        </Button>
      </DialogFooter>
    </div>
  );
}
