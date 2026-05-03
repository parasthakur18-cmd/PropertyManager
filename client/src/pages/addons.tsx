import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExtraServiceSchema, type ExtraService, type Booking } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Car, MapPin, Mountain, Percent, Trash2, CheckCircle2, Clock, Flame, Shirt, BedDouble, Bus, Thermometer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActiveBookingWithDetails extends Booking {
  guest: { id: number; fullName: string; email: string | null; phone: string };
  room: { id: number; roomNumber: string; type: string; pricePerNight: string };
  property?: { id: number; name: string; location: string };
}

const serviceFormSchema = insertExtraServiceSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  serviceDate: z.string().min(1, "Service date is required"),
  bookingId: z.number().min(1, "Booking is required"),
  commission: z.string().optional(),
  vendorName: z.string().optional(),
  vendorContact: z.string().optional(),
  description: z.string().optional(),
  isPaid: z.boolean().optional(),
  paymentMethod: z.string().optional(),
});

export const serviceTypeIcons: Record<string, any> = {
  taxi: Car,
  guide: MapPin,
  adventure: Mountain,
  partner_commission: Percent,
  bonfire: Flame,
  laundry: Shirt,
  extra_bed: BedDouble,
  local_tour: Bus,
  heater: Thermometer,
};

export const serviceTypeLabels: Record<string, string> = {
  taxi: "Taxi/Cab",
  guide: "Local Guide",
  adventure: "Adventure Package",
  partner_commission: "Partner Commission",
  bonfire: "Bonfire",
  laundry: "Laundry",
  extra_bed: "Extra Bed",
  heater: "Room Heater",
  local_tour: "Local Tour",
  spa: "Spa / Massage",
  cycling: "Cycling / Bike Rental",
  photoshoot: "Photoshoot",
  camping: "Camping",
  boating: "Boating",
  trekking: "Trekking",
  yoga: "Yoga / Meditation",
  airport_pickup: "Airport Pickup",
  airport_drop: "Airport Drop",
  room_decoration: "Room Decoration",
  cake: "Birthday Cake",
  other: "Other/Custom",
};

export const SERVICE_TYPES = [
  { value: "taxi", label: "Taxi/Cab Booking" },
  { value: "airport_pickup", label: "Airport Pickup" },
  { value: "airport_drop", label: "Airport Drop" },
  { value: "bonfire", label: "Bonfire" },
  { value: "laundry", label: "Laundry" },
  { value: "extra_bed", label: "Extra Bed" },
  { value: "heater", label: "Room Heater" },
  { value: "local_tour", label: "Local Tour / Transport" },
  { value: "guide", label: "Local Guide" },
  { value: "adventure", label: "Adventure Package" },
  { value: "trekking", label: "Trekking" },
  { value: "cycling", label: "Cycling / Bike Rental" },
  { value: "boating", label: "Boating" },
  { value: "camping", label: "Camping" },
  { value: "spa", label: "Spa / Massage" },
  { value: "yoga", label: "Yoga / Meditation" },
  { value: "photoshoot", label: "Photoshoot" },
  { value: "room_decoration", label: "Room Decoration" },
  { value: "cake", label: "Birthday Cake" },
  { value: "partner_commission", label: "Partner Commission" },
  { value: "other", label: "Other / Custom" },
];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
];

export default function AddOnServices() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [showCustomServiceType, setShowCustomServiceType] = useState(false);
  const [markPaidDialog, setMarkPaidDialog] = useState<{ open: boolean; serviceId: number | null }>({ open: false, serviceId: null });
  const [markPaidMethod, setMarkPaidMethod] = useState("cash");

  const { data: services = [], isLoading } = useQuery<ExtraService[]>({
    queryKey: ["/api/extra-services"],
  });

  const { data: activeBookings = [] } = useQuery<ActiveBookingWithDetails[]>({
    queryKey: ["/api/bookings/active"],
  });

  const form = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      bookingId: 0,
      serviceType: "taxi",
      serviceName: "",
      description: "",
      amount: "",
      vendorName: "",
      vendorContact: "",
      commission: "",
      serviceDate: new Date().toISOString().split("T")[0],
      isPaid: false,
      paymentMethod: "cash",
    },
  });

  const selectedServiceType = form.watch("serviceType");
  const collectNow = form.watch("isPaid");

  const createServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema>) => {
      const res = await apiRequest("/api/extra-services", "POST", {
        ...data,
        amount: data.amount,
        commission: data.commission || null,
        paymentMethod: data.isPaid ? (data.paymentMethod || "cash") : null,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions"] });
      toast({ title: "Service added", description: "Add-on service has been recorded successfully" });
      if (data?.walletWarning) {
        setTimeout(() => {
          toast({ title: "Wallet not updated", description: data.walletWarning, variant: "destructive" });
        }, 500);
      }
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add service", variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/extra-services/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      toast({ title: "Service deleted", description: "Add-on service has been removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete service", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ serviceId, paymentMethod }: { serviceId: number; paymentMethod: string }) => {
      const res = await apiRequest(`/api/extra-services/${serviceId}/mark-paid`, "POST", { paymentMethod });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions"] });
      toast({ title: "Payment recorded", description: "Service payment has been recorded to your wallet" });
      if (data?.walletWarning) {
        setTimeout(() => {
          toast({ title: "Wallet not updated", description: data.walletWarning, variant: "destructive" });
        }, 500);
      }
      setMarkPaidDialog({ open: false, serviceId: null });
      setMarkPaidMethod("cash");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record payment", variant: "destructive" });
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createServiceMutation.mutate(data);
  });

  const getBookingInfo = (bookingId: number | null) => {
    if (!bookingId) return "No booking";
    const booking = activeBookings.find(b => b.id === bookingId);
    if (!booking) return `Booking #${bookingId}`;
    const roomNumber = booking.room?.roomNumber || booking.roomId;
    const guestName = booking.guest?.fullName || "Guest";
    return `Room ${roomNumber} - ${guestName}`;
  };

  const filteredServices = filterType === "all"
    ? services
    : services.filter(s => s.serviceType === filterType);

  const uniqueServiceTypes = Array.from(new Set(services.map(s => s.serviceType)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Add-on Services</h1>
            <p className="text-muted-foreground mt-1">Manage taxi, bonfire, laundry, extra bed, tours, and other guest services</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-service">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Add-on Service</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="bookingId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking / Room</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-booking">
                              <SelectValue placeholder="Select booking" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeBookings.map((booking) => {
                              const roomNumber = booking.room?.roomNumber || booking.roomId;
                              const guestName = booking.guest?.fullName || "Guest";
                              return (
                                <SelectItem key={booking.id} value={booking.id.toString()}>
                                  Room {roomNumber} - {guestName}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setShowCustomServiceType(value === "other");
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-service-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {showCustomServiceType && (
                    <FormItem>
                      <FormLabel>Custom Service Type Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Bike Rental, Massage"
                          onChange={(e) => {
                            const customType = e.target.value;
                            form.setValue("serviceType", customType || "other");
                          }}
                          data-testid="input-custom-service-type"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Enter your custom service type</p>
                    </FormItem>
                  )}

                  <FormField
                    control={form.control}
                    name="serviceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Airport Transfer, Bonfire for 2" data-testid="input-service-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="1500" data-testid="input-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="serviceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-service-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <FormField
                      control={form.control}
                      name="isPaid"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel className="text-sm font-semibold">Collect Payment Now</FormLabel>
                            <p className="text-xs text-muted-foreground">Turn on if guest has already paid for this service</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={!!field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-collect-now"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {collectNow && (
                      <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "cash"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-payment-method">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PAYMENT_METHODS.map(m => (
                                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Payment will be recorded to your wallet immediately</p>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="vendorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor / Partner Name (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., Mountain Adventure Co." data-testid="input-vendor-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendorContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor Contact (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="+91-" data-testid="input-vendor-contact" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="commission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commission (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} type="number" placeholder="150" data-testid="input-commission" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Additional details about the service"
                            className="resize-none"
                            rows={2}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createServiceMutation.isPending} data-testid="button-submit">
                      {createServiceMutation.isPending ? "Adding..." : "Add Service"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
            data-testid="filter-all"
          >
            All Services
          </Button>
          {uniqueServiceTypes.map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
              data-testid={`filter-${type}`}
            >
              {serviceTypeLabels[type] || type}
            </Button>
          ))}
        </div>

        {filteredServices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No services recorded</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add taxi, bonfire, laundry, extra bed, or any other guest service
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => {
              const Icon = serviceTypeIcons[service.serviceType] || Plus;
              return (
                <Card key={service.id} className="hover-elevate" data-testid={`card-service-${service.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{service.serviceName}</CardTitle>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" data-testid={`badge-type-${service.id}`}>
                          {serviceTypeLabels[service.serviceType] || service.serviceType}
                        </Badge>
                        {service.isPaid ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs" data-testid={`badge-paid-${service.id}`}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Collected
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs" data-testid={`badge-unpaid-${service.id}`}>
                            <Clock className="h-3 w-3 mr-1" />
                            On Bill
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-mono font-semibold" data-testid={`text-amount-${service.id}`}>
                          ₹{parseFloat(service.amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Booking</span>
                        <span className="font-medium">{getBookingInfo(service.bookingId)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">{format(new Date(service.serviceDate), "MMM d, yyyy")}</span>
                      </div>
                      {service.paymentMethod && service.isPaid && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Paid via</span>
                          <span className="font-medium capitalize">{service.paymentMethod}</span>
                        </div>
                      )}
                      {service.vendorName && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Vendor</span>
                          <span className="font-medium">{service.vendorName}</span>
                        </div>
                      )}
                      {service.commission && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Commission</span>
                          <span className="font-mono text-green-600 dark:text-green-400">
                            ₹{parseFloat(service.commission).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {service.description && (
                      <p className="text-sm text-muted-foreground border-t pt-2">{service.description}</p>
                    )}

                    <div className="pt-2 border-t flex gap-2">
                      {!service.isPaid && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setMarkPaidDialog({ open: true, serviceId: service.id });
                            setMarkPaidMethod("cash");
                          }}
                          data-testid={`button-mark-paid-${service.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className={service.isPaid ? "w-full" : "flex-1"}
                        onClick={() => deleteServiceMutation.mutate(service.id)}
                        disabled={deleteServiceMutation.isPending}
                        data-testid={`button-delete-${service.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={markPaidDialog.open} onOpenChange={(open) => setMarkPaidDialog({ open, serviceId: open ? markPaidDialog.serviceId : null })}>
        <DialogContent className="max-w-sm" data-testid="dialog-mark-paid">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select how the guest paid for this service. Payment will be recorded to your wallet immediately.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={markPaidMethod} onValueChange={setMarkPaidMethod}>
                <SelectTrigger data-testid="select-mark-paid-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMarkPaidDialog({ open: false, serviceId: null })}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (markPaidDialog.serviceId) {
                    markPaidMutation.mutate({ serviceId: markPaidDialog.serviceId, paymentMethod: markPaidMethod });
                  }
                }}
                disabled={markPaidMutation.isPending}
                data-testid="button-confirm-mark-paid"
              >
                {markPaidMutation.isPending ? "Recording..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
