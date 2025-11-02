import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, Phone, User, IndianRupee, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Room, Property } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

const enquiryFormSchema = z.object({
  propertyId: z.coerce.number().int().min(1, "Please select a property"),
  guestName: z.string().min(2, "Name must be at least 2 characters"),
  guestPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  guestEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  checkInDate: z.date({
    required_error: "Please select check-in date",
  }),
  checkOutDate: z.date({
    required_error: "Please select check-out date",
  }),
  roomId: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
  numberOfGuests: z.coerce.number().int().min(1, "At least 1 guest required"),
  mealPlan: z.enum(["EP", "CP", "MAP", "AP"]).default("EP"),
  priceQuoted: z.coerce.number().min(0, "Price must be a positive number").optional(),
  advanceAmount: z.coerce.number().min(0, "Advance must be a positive number").nullable().optional(),
  specialRequests: z.string().optional(),
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: "Check-out date must be after check-in date",
  path: ["checkOutDate"],
});

type EnquiryFormData = z.infer<typeof enquiryFormSchema>;

export default function NewEnquiry() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkOutDate, setCheckOutDate] = useState<Date>();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number>();
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [checkInPopoverOpen, setCheckInPopoverOpen] = useState(false);
  const [checkOutPopoverOpen, setCheckOutPopoverOpen] = useState(false);

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<EnquiryFormData>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      propertyId: undefined,
      guestName: "",
      guestPhone: "",
      guestEmail: "",
      numberOfGuests: 1,
      mealPlan: "EP",
      priceQuoted: undefined,
      advanceAmount: undefined,
      specialRequests: "",
      roomId: undefined,
    },
  });

  const createEnquiryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/enquiries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Enquiry Created!",
        description: "The enquiry has been saved successfully. Redirecting to enquiries page...",
      });
      
      setTimeout(() => {
        navigate("/enquiries");
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create enquiry",
        variant: "destructive",
      });
    },
  });

  const checkAvailability = async (propertyId: number, checkIn: Date, checkOut: Date) => {
    if (!propertyId || !checkIn || !checkOut || checkOut <= checkIn) return;

    setLoadingRooms(true);
    try {
      const response = await fetch(
        `/api/rooms/availability?propertyId=${propertyId}&checkIn=${checkIn.toISOString()}&checkOut=${checkOut.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to check availability");
      const rooms = await response.json();
      setAvailableRooms(rooms);

      if (rooms.length === 0) {
        toast({
          title: "No Rooms Available",
          description: "No rooms are available for the selected dates at this property.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Rooms Found",
          description: `${rooms.length} room(s) available for the selected dates.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check room availability",
        variant: "destructive",
      });
      setAvailableRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const onSubmit = (data: EnquiryFormData) => {
    const enquiryData = {
      propertyId: data.propertyId,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail || null,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      roomId: data.roomId && typeof data.roomId === 'number' ? data.roomId : null,
      numberOfGuests: data.numberOfGuests,
      mealPlan: data.mealPlan,
      priceQuoted: data.priceQuoted !== undefined && data.priceQuoted !== null 
        ? data.priceQuoted.toString() 
        : null,
      advanceAmount: data.advanceAmount !== undefined && data.advanceAmount !== null 
        ? data.advanceAmount.toString() 
        : null,
      specialRequests: data.specialRequests || null,
      status: "new" as const,
    };

    createEnquiryMutation.mutate(enquiryData);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Enquiry</h1>
          <p className="text-muted-foreground mt-1">
            Quickly create an enquiry while on the go
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enquiry Details</CardTitle>
          <CardDescription>
            Select dates to automatically check room availability
          </CardDescription>
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
                        const propId = parseInt(value);
                        field.onChange(propId);
                        setSelectedPropertyId(propId);
                        // Reset available rooms when property changes
                        setAvailableRooms([]);
                        form.setValue("roomId", undefined);
                      }}
                      value={field.value ? field.value.toString() : ""}
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
              <div className="grid gap-4 md:grid-cols-2">
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
                                "pl-3 text-left font-normal",
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
                              setCheckInPopoverOpen(false); // Auto-close calendar
                              if (selectedPropertyId && date && checkOutDate) {
                                checkAvailability(selectedPropertyId, date, checkOutDate);
                              }
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
                                "pl-3 text-left font-normal",
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
                              setCheckOutPopoverOpen(false); // Auto-close calendar
                              if (selectedPropertyId && checkInDate && date) {
                                checkAvailability(selectedPropertyId, checkInDate, date);
                              }
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

              {/* Room Selection */}
              {!selectedPropertyId ? (
                <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                  Please select a property first to check room availability
                </div>
              ) : !checkInDate || !checkOutDate ? (
                <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                  Please select check-in and check-out dates to see available rooms
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Rooms</FormLabel>
                      {loadingRooms ? (
                        <Skeleton className="h-10 w-full" />
                      ) : availableRooms.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                          No rooms available for the selected dates. Please try different dates.
                        </div>
                      ) : (
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : "")}
                          value={field.value ? field.value.toString() : ""}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-room">
                              <SelectValue placeholder="Select an available room" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableRooms.map((room) => (
                              <SelectItem
                                key={room.id}
                                value={room.id.toString()}
                              >
                                Room {room.roomNumber} - {room.roomType} (₹
                                {room.pricePerNight}/night)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Guest Details */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guest Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter guest name"
                            className="pl-9"
                            data-testid="input-guest-name"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guestPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter phone number"
                            className="pl-9"
                            data-testid="input-guest-phone"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="guestEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="guest@example.com"
                        data-testid="input-guest-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pricing & Guests */}
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="numberOfGuests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Guests *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          data-testid="input-number-guests"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mealPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Plan *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-meal-plan">
                            <SelectValue placeholder="Select meal plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EP">EP (Room Only)</SelectItem>
                          <SelectItem value="CP">CP (With Breakfast)</SelectItem>
                          <SelectItem value="MAP">MAP (Breakfast + Dinner)</SelectItem>
                          <SelectItem value="AP">AP (All Meals)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priceQuoted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Quoted *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-9"
                            data-testid="input-price-quoted"
                            {...field}
                          />
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
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-9"
                            data-testid="input-advance-amount"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Special Requests */}
              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requests</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requirements or notes..."
                        className="resize-none"
                        rows={3}
                        data-testid="textarea-special-requests"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createEnquiryMutation.isPending}
                  data-testid="button-submit-enquiry"
                >
                  {createEnquiryMutation.isPending ? (
                    "Creating..."
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Create Enquiry
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">What happens next?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Once you create this enquiry, you can send booking details and payment links to the customer from the Enquiries page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
