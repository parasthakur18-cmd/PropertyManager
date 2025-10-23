import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, User, Hotel } from "lucide-react";
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
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [showQuickGuestForm, setShowQuickGuestForm] = useState(false);
  const [quickGuestData, setQuickGuestData] = useState({
    fullName: "",
    phone: "",
    email: "",
  });
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
    enabled: !!selectedProperty,
  });

  const form = useForm<InsertBooking>({
    resolver: zodResolver(insertBookingSchema),
    defaultValues: {
      propertyId: undefined as any,
      guestId: undefined as any,
      roomId: null,
      checkInDate: new Date(),
      checkOutDate: new Date(),
      status: "pending",
      numberOfGuests: 1,
      specialRequests: "",
    },
  });

  const quickGuestMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/guests", data);
    },
    onSuccess: (newGuest: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      form.setValue("guestId", newGuest.id);
      setShowQuickGuestForm(false);
      setQuickGuestData({ fullName: "", phone: "", email: "" });
      toast({
        title: "Success",
        description: "Guest added successfully",
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

  const createMutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      return await apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      setShowQuickGuestForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuickAddGuest = () => {
    if (!quickGuestData.fullName || !quickGuestData.phone) {
      toast({
        title: "Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }
    quickGuestMutation.mutate(quickGuestData);
  };

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

  const onSubmit = (data: InsertBooking) => {
    createMutation.mutate(data);
  };

  const availableRooms = rooms?.filter((room) => room.status === "available");

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

  return (
    <div className="p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage reservations and check-ins</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const propId = parseInt(value);
                          field.onChange(propId);
                          setSelectedProperty(propId);
                        }}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-booking-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Guest</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowQuickGuestForm(!showQuickGuestForm)}
                          data-testid="button-toggle-quick-guest"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {showQuickGuestForm ? "Cancel" : "Quick Add Guest"}
                        </Button>
                      </div>
                      
                      {showQuickGuestForm ? (
                        <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/50">
                          <Input
                            placeholder="Full Name *"
                            value={quickGuestData.fullName}
                            onChange={(e) => setQuickGuestData({ ...quickGuestData, fullName: e.target.value })}
                            data-testid="input-quick-guest-name"
                          />
                          <Input
                            placeholder="Phone Number *"
                            value={quickGuestData.phone}
                            onChange={(e) => setQuickGuestData({ ...quickGuestData, phone: e.target.value })}
                            data-testid="input-quick-guest-phone"
                          />
                          <Input
                            placeholder="Email (optional)"
                            type="email"
                            value={quickGuestData.email}
                            onChange={(e) => setQuickGuestData({ ...quickGuestData, email: e.target.value })}
                            data-testid="input-quick-guest-email"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleQuickAddGuest}
                            disabled={quickGuestMutation.isPending}
                            data-testid="button-save-quick-guest"
                          >
                            {quickGuestMutation.isPending ? "Adding..." : "Add Guest"}
                          </Button>
                        </div>
                      ) : (
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value ? field.value.toString() : undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-booking-guest">
                              <SelectValue placeholder="Select guest" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {guests?.map((guest) => (
                              <SelectItem key={guest.id} value={guest.id.toString()}>
                                {guest.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room (Optional - Auto-assign if not selected)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "auto" ? null : parseInt(value))}
                        value={field.value ? field.value.toString() : "auto"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-booking-room">
                            <SelectValue placeholder="Auto-assign room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="auto">Auto-assign</SelectItem>
                          {availableRooms?.map((room) => (
                            <SelectItem key={room.id} value={room.id.toString()}>
                              Room {room.roomNumber} - {room.roomType} (₹{room.pricePerNight}/night)
                            </SelectItem>
                          ))}
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

      {!bookings || bookings.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Calendar className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-semibold">No bookings yet</h3>
            <p className="text-muted-foreground max-w-md">
              Create your first booking to get started
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
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
    </div>
  );
}
