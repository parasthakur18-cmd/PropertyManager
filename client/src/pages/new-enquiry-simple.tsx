import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, User, Phone, Mail, IndianRupee, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Room, Property } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const enquiryFormSchema = z.object({
  propertyId: z.coerce.number().min(1, "Property is required"),
  checkInDate: z.date({ required_error: "Check-in date is required" }),
  checkOutDate: z.date({ required_error: "Check-out date is required" }),
  roomId: z.coerce.number().min(1, "Room is required"),
  guestName: z.string().min(2, "Name must be at least 2 characters"),
  guestPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  guestEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  numberOfGuests: z.coerce.number().int().min(1, "At least 1 guest required"),
  priceQuoted: z.coerce.number().min(0).optional(),
  advanceAmount: z.coerce.number().min(0).optional(),
  specialRequests: z.string().optional(),
}).refine(data => data.checkOutDate > data.checkInDate, {
  message: "Check-out must be after check-in",
  path: ["checkOutDate"],
});

type EnquiryFormData = z.infer<typeof enquiryFormSchema>;

export default function NewEnquirySimple() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number>();
  const [checkInPopoverOpen, setCheckInPopoverOpen] = useState(false);
  const [checkOutPopoverOpen, setCheckOutPopoverOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkOutDate, setCheckOutDate] = useState<Date>();

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    enabled: !!selectedPropertyId,
  });

  // Check room availability for selected dates
  const { data: availableRoomIds = [] } = useQuery<number[]>({
    queryKey: ["/api/rooms/check-availability", selectedPropertyId, checkInDate, checkOutDate],
    queryFn: async () => {
      if (!selectedPropertyId || !checkInDate || !checkOutDate) return [];
      const response = await apiRequest(
        `/api/rooms/check-availability?propertyId=${selectedPropertyId}&checkInDate=${checkInDate.toISOString()}&checkOutDate=${checkOutDate.toISOString()}`,
        "GET"
      );
      return response.availableRoomIds || [];
    },
    enabled: !!selectedPropertyId && !!checkInDate && !!checkOutDate,
  });

  const filteredRooms = rooms?.filter(r => {
    const isCorrectProperty = r.propertyId === selectedPropertyId;
    // If dates are selected, only show available rooms
    if (checkInDate && checkOutDate) {
      return isCorrectProperty && availableRoomIds.includes(r.id);
    }
    return isCorrectProperty;
  }) || [];

  const form = useForm<EnquiryFormData>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      guestName: "",
      guestPhone: "",
      guestEmail: "",
      numberOfGuests: 1,
      priceQuoted: undefined,
      advanceAmount: undefined,
      specialRequests: "",
    },
  });

  const createEnquiryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/enquiries", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Success!",
        description: "Enquiry created successfully.",
      });
      form.reset();
      setSelectedPropertyId(undefined);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create enquiry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EnquiryFormData) => {
    const enquiryData = {
      propertyId: data.propertyId,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail || null,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      roomId: data.roomId,
      numberOfGuests: data.numberOfGuests,
      priceQuoted: data.priceQuoted?.toString() || null,
      advanceAmount: data.advanceAmount?.toString() || null,
      specialRequests: data.specialRequests || null,
      status: "new" as const,
    };

    createEnquiryMutation.mutate(enquiryData);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">New Enquiry</h1>
        <p className="text-muted-foreground mt-1">
          Create a new booking enquiry
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enquiry Details</CardTitle>
          <CardDescription>Fill in the details for the new enquiry</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Property Selection */}
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPropertyId(parseInt(value));
                        form.setValue('roomId', 0 as any); // Reset room selection
                      }} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-property">
                          <SelectValue placeholder="Select a property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties?.map((property) => (
                          <SelectItem key={property.id} value={property.id.toString()}>
                            {property.name} - {property.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-in Date *</FormLabel>
                      <Popover open={checkInPopoverOpen} onOpenChange={setCheckInPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-checkin-date"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setCheckInDate(date);
                              setCheckInPopoverOpen(false);
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="checkOutDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-out Date *</FormLabel>
                      <Popover open={checkOutPopoverOpen} onOpenChange={setCheckOutPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-checkout-date"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setCheckOutDate(date);
                              setCheckOutPopoverOpen(false);
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Availability Note */}
              {checkInDate && checkOutDate && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-md">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    Showing {filteredRooms.length} available room{filteredRooms.length !== 1 ? 's' : ''} for {format(checkInDate, "MMM d")} to {format(checkOutDate, "MMM d")}
                  </p>
                </div>
              )}

              {/* Room Selection */}
              {selectedPropertyId && (
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-room">
                            <SelectValue placeholder="Select a room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id.toString()}>
                              Room {room.roomNumber} - {room.roomType} - ₹{room.pricePerNight}/night
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Guest Details */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg">Guest Information</h3>
                
                <FormField
                  control={form.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guest Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter guest name" className="pl-9" {...field} data-testid="input-guest-name" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guestPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Enter phone" className="pl-9" {...field} data-testid="input-phone" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guestEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="guest@example.com" className="pl-9" {...field} data-testid="input-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="numberOfGuests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Guests *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} data-testid="input-guests" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priceQuoted"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Quoted</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" placeholder="0" className="pl-9" {...field} data-testid="input-price" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="advanceAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advance Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" placeholder="0" className="pl-9" {...field} data-testid="input-advance" />
                          </div>
                        </FormControl>
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
                        <Textarea placeholder="Any special requirements..." rows={3} {...field} data-testid="textarea-requests" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createEnquiryMutation.isPending} 
                data-testid="button-submit-enquiry"
              >
                {createEnquiryMutation.isPending ? "Creating..." : "Create Enquiry"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
