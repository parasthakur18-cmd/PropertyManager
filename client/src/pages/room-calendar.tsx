import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, Phone, Mail, IndianRupee, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Property, Room, Booking } from "@shared/schema";

const enquiryFormSchema = z.object({
  checkInDate: z.date({ required_error: "Check-in date is required" }),
  checkOutDate: z.date({ required_error: "Check-out date is required" }),
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

export default function RoomCalendar() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isEnquiryDialogOpen, setIsEnquiryDialogOpen] = useState(false);

  const { data: properties, isLoading: isLoadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

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

  // Filter rooms for selected property
  const propertyRooms = useMemo(() => {
    if (!selectedPropertyId) return [];
    return rooms.filter(room => room.propertyId === selectedPropertyId);
  }, [rooms, selectedPropertyId]);

  // Filter bookings for selected property with confirmed or checked-in status
  const propertyBookings = useMemo(() => {
    if (!selectedPropertyId) return [];
    return bookings.filter(
      booking => 
        booking.propertyId === selectedPropertyId && 
        (booking.status === 'confirmed' || booking.status === 'checked-in')
    );
  }, [bookings, selectedPropertyId]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Check if a room is occupied on a specific date
  const isRoomOccupied = (roomId: number, date: Date) => {
    return propertyBookings.some(booking => {
      if (booking.roomId !== roomId) return false;
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      return date >= checkIn && date < checkOut;
    });
  };

  // Get room availability count for a specific date
  const getAvailableRoomsCount = (date: Date) => {
    return propertyRooms.filter(room => !isRoomOccupied(room.id, date)).length;
  };

  const goToPreviousMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsEnquiryDialogOpen(true);
    form.reset();
  };

  const createEnquiryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/enquiries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Enquiry Created!",
        description: "The enquiry has been saved successfully.",
      });
      setIsEnquiryDialogOpen(false);
      setSelectedRoom(null);
      form.reset();
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
    if (!selectedRoom || !selectedPropertyId) return;

    const enquiryData = {
      propertyId: selectedPropertyId,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail || null,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      roomId: selectedRoom.id,
      numberOfGuests: data.numberOfGuests,
      priceQuoted: data.priceQuoted?.toString() || null,
      advanceAmount: data.advanceAmount?.toString() || null,
      specialRequests: data.specialRequests || null,
      status: "new" as const,
    };

    createEnquiryMutation.mutate(enquiryData);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Room Availability Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Visual overview of room availability - click on an available room to create enquiry
          </p>
        </div>
      </div>

      {/* Property Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Property</label>
              {isLoadingProperties ? (
                <div className="h-10 bg-muted animate-pulse rounded-md" />
              ) : (
                <Select
                  value={selectedPropertyId?.toString() || ""}
                  onValueChange={(value) => {
                    if (value) {
                      setSelectedPropertyId(parseInt(value));
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-property-calendar">
                    <SelectValue placeholder="Choose a property to view calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties && properties.length > 0 ? (
                      properties.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.name} - {property.location}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No properties available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedPropertyId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Property Selected</h3>
            <p className="text-muted-foreground">
              Please select a property above to view the room availability calendar
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Month Navigation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <CardTitle className="text-2xl">
                    {format(currentDate, "MMMM yyyy")}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToToday}
                    className="mt-1"
                    data-testid="button-today"
                  >
                    Today
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Calendar Grid */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-sm py-2">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Calendar days */}
                {calendarDays.map(day => {
                  const availableCount = getAvailableRoomsCount(day);
                  const totalRooms = propertyRooms.length;
                  const occupancyRate = totalRooms > 0 
                    ? Math.round(((totalRooms - availableCount) / totalRooms) * 100) 
                    : 0;

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        border rounded-md p-3 min-h-[100px] flex flex-col
                        ${isToday(day) ? 'border-primary border-2' : ''}
                        ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                      `}
                      data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${isToday(day) ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </span>
                        {isToday(day) && (
                          <Badge variant="default" className="text-xs px-1 py-0">
                            Today
                          </Badge>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-center items-center space-y-1">
                        <div className="text-xs text-muted-foreground text-center">
                          {availableCount}/{totalRooms}
                        </div>
                        <div className="text-xs text-center">
                          available
                        </div>
                        <Badge
                          variant={availableCount === totalRooms ? "outline" : availableCount > 0 ? "secondary" : "destructive"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {occupancyRate}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Room-wise Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Room-wise Availability (Click Available Room to Create Enquiry)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyRooms.map(room => (
                  <div key={room.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold">
                        {room.roomNumber} - {room.roomType}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRoomClick(room)}
                        data-testid={`button-create-enquiry-room-${room.id}`}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Enquiry
                      </Button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells for alignment */}
                      {Array.from({ length: calendarDays[0].getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      
                      {calendarDays.map(day => {
                        const isOccupied = isRoomOccupied(room.id, day);
                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => !isOccupied && handleRoomClick(room)}
                            disabled={isOccupied}
                            className={`
                              h-10 rounded flex items-center justify-center text-xs font-medium
                              ${isOccupied 
                                ? 'bg-destructive text-destructive-foreground cursor-not-allowed' 
                                : 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 cursor-pointer'
                              }
                              ${isToday(day) ? 'ring-2 ring-primary' : ''}
                            `}
                            title={isOccupied ? 'Occupied' : 'Click to create enquiry'}
                            data-testid={`room-${room.id}-day-${format(day, 'yyyy-MM-dd')}`}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {propertyRooms.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No rooms found for this property
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded border" />
                  <span className="text-sm">Available (Click to create enquiry)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-destructive rounded border" />
                  <span className="text-sm">Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 border-2 border-primary rounded" />
                  <span className="text-sm">Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Enquiry Creation Dialog */}
      <Dialog open={isEnquiryDialogOpen} onOpenChange={setIsEnquiryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Enquiry</DialogTitle>
            <DialogDescription>
              {selectedRoom && `Room ${selectedRoom.roomNumber} - ${selectedRoom.roomType}`}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Check-in Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Guest Details */}
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guest Name *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Enter guest name" className="pl-9" {...field} />
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
                          <Input placeholder="Enter phone" className="pl-9" {...field} />
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
                          <Input type="email" placeholder="guest@example.com" className="pl-9" {...field} />
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
                      <FormLabel>Guests *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
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
                          <Input type="number" placeholder="0" className="pl-9" {...field} />
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
                      <FormLabel>Advance</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" placeholder="0" className="pl-9" {...field} />
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
                      <Textarea placeholder="Any special requirements..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEnquiryDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createEnquiryMutation.isPending} className="flex-1">
                  {createEnquiryMutation.isPending ? "Creating..." : "Create Enquiry"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
