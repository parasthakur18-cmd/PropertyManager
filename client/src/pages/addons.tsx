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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExtraServiceSchema, type ExtraService, type Booking } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Car, MapPin, Mountain, Percent, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const serviceFormSchema = insertExtraServiceSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  serviceDate: z.string().min(1, "Service date is required"),
  bookingId: z.number().min(1, "Booking is required"),
});

const serviceTypeIcons: Record<string, any> = {
  taxi: Car,
  guide: MapPin,
  adventure: Mountain,
  partner_commission: Percent,
};

const serviceTypeLabels: Record<string, string> = {
  taxi: "Taxi/Cab",
  guide: "Local Guide",
  adventure: "Adventure Package",
  partner_commission: "Partner Commission",
};

export default function AddOnServices() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const { data: services = [], isLoading } = useQuery<ExtraService[]>({
    queryKey: ["/api/extra-services"],
  });

  const { data: activeBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    select: (bookings) => bookings.filter(b => b.status === "checked-in" || b.status === "confirmed"),
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
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema>) => {
      return await apiRequest("POST", "/api/extra-services", {
        ...data,
        amount: data.amount,
        commission: data.commission || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-services"] });
      toast({
        title: "Service added",
        description: "Add-on service has been recorded successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add service",
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/extra-services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/extra-services"] });
      toast({
        title: "Service deleted",
        description: "Add-on service has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    createServiceMutation.mutate(data);
  });

  const getBookingInfo = (bookingId: number) => {
    const booking = activeBookings.find(b => b.id === bookingId);
    return booking ? `Booking #${booking.id}` : `Booking #${bookingId}`;
  };

  const filteredServices = filterType === "all" 
    ? services 
    : services.filter(s => s.serviceType === filterType);

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
            <p className="text-muted-foreground mt-1">Manage taxi, guide, adventure packages, and partner services</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-service">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                            {activeBookings.map((booking) => (
                              <SelectItem key={booking.id} value={booking.id.toString()}>
                                Booking #{booking.id} - Room {booking.roomId}
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
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-service-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="taxi">Taxi/Cab Booking</SelectItem>
                            <SelectItem value="guide">Local Guide</SelectItem>
                            <SelectItem value="adventure">Adventure Package</SelectItem>
                            <SelectItem value="partner_commission">Partner Service Commission</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Airport Transfer, Mountain Trek" data-testid="input-service-name" />
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
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="1500"
                              data-testid="input-amount"
                            />
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

                  <FormField
                    control={form.control}
                    name="vendorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor/Partner Name (Optional)</FormLabel>
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
                            <Input
                              {...field}
                              value={field.value || ""}
                              type="number"
                              placeholder="150"
                              data-testid="input-commission"
                            />
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
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Additional details about the service"
                            className="resize-none"
                            rows={3}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
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
          {Object.entries(serviceTypeLabels).map(([type, label]) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
              data-testid={`filter-${type}`}
            >
              {label}
            </Button>
          ))}
        </div>

        {filteredServices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No services recorded</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start by adding taxi, guide, or adventure services
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
                      <Badge variant="outline" data-testid={`badge-type-${service.id}`}>
                        {serviceTypeLabels[service.serviceType]}
                      </Badge>
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

                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => deleteServiceMutation.mutate(service.id)}
                        disabled={deleteServiceMutation.isPending}
                        data-testid={`button-delete-${service.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Service
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
