import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Phone,
  User,
  IndianRupee,
  PlusCircle,
  Sparkles,
  Trash2,
  Hotel,
  Layers,
} from "lucide-react";
import { AIRoomSetup } from "@/components/ai-room-setup";
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
import { Badge } from "@/components/ui/badge";

const enquiryFormSchema = z.object({
  propertyId: z.coerce.number().int().min(1, "Please select a property"),
  guestName: z.string().min(2, "Name must be at least 2 characters"),
  guestPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  guestEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  checkInDate: z.date({ required_error: "Please select check-in date" }),
  checkOutDate: z.date({ required_error: "Please select check-out date" }),
  roomId: z.union([z.coerce.number().int().min(1), z.literal("")]).optional(),
  numberOfGuests: z.coerce.number().int().min(1, "At least 1 guest required"),
  mealPlan: z.enum(["EP", "CP", "MAP", "AP"]).default("EP"),
  priceQuoted: z.preprocess(
    (val) => (val === "" || val === undefined || val === null) ? undefined : Number(val),
    z.number().min(0, "Price must be a positive number").optional()
  ),
  advanceAmount: z.preprocess(
    (val) => (val === "" || val === undefined || val === null) ? undefined : Number(val),
    z.number().min(0, "Advance must be a positive number").optional()
  ),
  specialRequests: z.string().optional(),
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: "Check-out date must be after check-in date",
  path: ["checkOutDate"],
});

type EnquiryFormData = z.infer<typeof enquiryFormSchema>;

interface MultiRoomEntry {
  id: string;
  roomId: number | null;
  price: number;
}

export default function NewEnquiry() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [checkInPopoverOpen, setCheckInPopoverOpen] = useState(false);
  const [checkOutPopoverOpen, setCheckOutPopoverOpen] = useState(false);
  const [showAISetup, setShowAISetup] = useState(false);

  // Multi-room state
  const [multiRoomMode, setMultiRoomMode] = useState(false);
  const [multiRooms, setMultiRooms] = useState<MultiRoomEntry[]>([
    { id: "1", roomId: null, price: 0 },
  ]);

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
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

  const checkInDate = form.watch("checkInDate");
  const checkOutDate = form.watch("checkOutDate");
  const selectedPropertyId = form.watch("propertyId");

  // Number of nights
  const numberOfNights = checkInDate && checkOutDate && checkOutDate > checkInDate
    ? Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Multi-room total
  const multiRoomTotal = multiRooms.reduce((sum, r) => sum + (r.price || 0), 0);

  // Sync multi-room total into priceQuoted
  useEffect(() => {
    if (multiRoomMode) {
      form.setValue("priceQuoted", multiRoomTotal || undefined);
    }
  }, [multiRoomTotal, multiRoomMode]);

  // Fetch room availability
  const { data: roomAvailability, isLoading: loadingRooms } = useQuery<Array<{
    roomId: number;
    available: number;
    totalBeds?: number;
    remainingBeds?: number;
  }>>({
    queryKey: ["/api/rooms/availability", selectedPropertyId, checkInDate, checkOutDate],
    enabled: !!(checkInDate && checkOutDate && checkInDate < checkOutDate && selectedPropertyId),
    queryFn: async () => {
      const response = await fetch(
        `/api/rooms/availability?propertyId=${selectedPropertyId}&checkIn=${checkInDate.toISOString()}&checkOut=${checkOutDate.toISOString()}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json();
    },
  });

  const getAvailableRooms = () => {
    if (!roomAvailability || !rooms) {
      return rooms?.filter(r => r.propertyId === selectedPropertyId && (r.status === "available" || r.status === "cleaning")) || [];
    }
    return rooms.filter(room => {
      if (room.propertyId !== selectedPropertyId) return false;
      const roomAvail = roomAvailability.find(a => a.roomId === room.id);
      if (!roomAvail) return false;
      return room.roomCategory === "dormitory"
        ? (roomAvail.remainingBeds || 0) > 0
        : roomAvail.available > 0;
    });
  };

  const availableRooms = getAvailableRooms();
  const selectedRoom = rooms?.find(r => r.id === form.watch("roomId"));
  const propertyRooms = rooms?.filter(r => r.propertyId === selectedPropertyId) || [];
  const hasNoRoomsInProperty = selectedPropertyId && propertyRooms.length === 0;
  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);

  // Multi-room helpers
  const addRoomRow = () => {
    setMultiRooms(prev => [...prev, { id: Date.now().toString(), roomId: null, price: 0 }]);
  };

  const removeRoomRow = (id: string) => {
    setMultiRooms(prev => prev.filter(r => r.id !== id));
  };

  const updateRoomEntry = (id: string, field: "roomId" | "price", value: number | null) => {
    setMultiRooms(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // Auto-fill price from room's price per night × nights when room is selected
      if (field === "roomId" && value) {
        const room = rooms?.find(ro => ro.id === value);
        if (room?.pricePerNight && numberOfNights > 0) {
          updated.price = parseFloat(room.pricePerNight.toString()) * numberOfNights;
        } else if (room?.pricePerNight) {
          updated.price = parseFloat(room.pricePerNight.toString());
        }
      }
      return updated;
    }));
  };

  const createEnquiryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/enquiries", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Enquiry Created!",
        description: "The enquiry has been saved successfully. Redirecting to enquiries page...",
      });
      setTimeout(() => navigate("/enquiries"), 1500);
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
    if (multiRoomMode) {
      const validRooms = multiRooms.filter(r => r.roomId !== null);
      if (validRooms.length === 0) {
        toast({ title: "Error", description: "Please select at least one room.", variant: "destructive" });
        return;
      }
      const roomIds = validRooms.map(r => r.roomId as number);
      const enquiryData = {
        propertyId: data.propertyId,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail || null,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        roomId: null,
        roomIds,
        isGroupEnquiry: true,
        numberOfGuests: data.numberOfGuests,
        mealPlan: data.mealPlan,
        priceQuoted: multiRoomTotal > 0 ? multiRoomTotal.toString() : null,
        advanceAmount: data.advanceAmount != null ? data.advanceAmount.toString() : null,
        specialRequests: data.specialRequests || null,
        status: "new" as const,
      };
      createEnquiryMutation.mutate(enquiryData);
    } else {
      const enquiryData = {
        propertyId: data.propertyId,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail || null,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        roomId: data.roomId && typeof data.roomId === "number" ? data.roomId : null,
        numberOfGuests: data.numberOfGuests,
        bedsBooked: selectedRoom?.roomType === "Dormitory" ? data.numberOfGuests : undefined,
        mealPlan: data.mealPlan,
        priceQuoted: data.priceQuoted != null ? data.priceQuoted.toString() : null,
        advanceAmount: data.advanceAmount != null ? data.advanceAmount.toString() : null,
        specialRequests: data.specialRequests || null,
        status: "new" as const,
      };
      createEnquiryMutation.mutate(enquiryData);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Enquiry</h1>
          <p className="text-muted-foreground mt-1">Quickly create an enquiry while on the go</p>
        </div>
      </div>

      {showAISetup && selectedProperty && (
        <AIRoomSetup
          propertyId={selectedPropertyId!}
          propertyName={selectedProperty.name}
          onClose={() => setShowAISetup(false)}
          onSuccess={() => {
            setShowAISetup(false);
            queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Enquiry Details</CardTitle>
          <CardDescription>Select dates to automatically check room availability</CardDescription>
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
                        field.onChange(parseInt(value));
                        form.setValue("roomId", undefined);
                        setMultiRooms([{ id: "1", roomId: null, price: 0 }]);
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
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              data-testid="button-checkin-date"
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
                            onSelect={(date) => { field.onChange(date); setCheckInPopoverOpen(false); }}
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
                      <Popover open={checkOutPopoverOpen} onOpenChange={setCheckOutPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              data-testid="button-checkout-date"
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
                            onSelect={(date) => { field.onChange(date); setCheckOutPopoverOpen(false); }}
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

              {/* Room Section */}
              {!selectedPropertyId ? (
                <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                  Please select a property first to check room availability
                </div>
              ) : !checkInDate || !checkOutDate ? (
                <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                  Please select check-in and check-out dates to see available rooms
                </div>
              ) : hasNoRoomsInProperty ? (
                <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 space-y-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    No rooms have been set up for this property yet.
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setShowAISetup(true)} data-testid="button-ai-room-setup">
                      <Sparkles className="h-3 w-3 mr-1" />Quick Setup with AI
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => navigate("/rooms")} data-testid="button-go-to-rooms">
                      <PlusCircle className="h-3 w-3 mr-1" />Go to Rooms
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Single / Multi toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {multiRoomMode ? "Rooms Selected" : "Available Rooms"}
                      {numberOfNights > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">({numberOfNights} night{numberOfNights !== 1 ? "s" : ""})</span>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant={multiRoomMode ? "default" : "outline"}
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => {
                        setMultiRoomMode(!multiRoomMode);
                        if (!multiRoomMode) {
                          form.setValue("roomId", undefined);
                          setMultiRooms([{ id: "1", roomId: null, price: 0 }]);
                        }
                      }}
                      data-testid="button-toggle-multi-room"
                    >
                      <Layers className="h-3 w-3" />
                      {multiRoomMode ? "Multi-Room ON" : "Book Multiple Rooms"}
                    </Button>
                  </div>

                  {/* SINGLE ROOM MODE */}
                  {!multiRoomMode && (
                    loadingRooms ? (
                      <Skeleton className="h-10 w-full" />
                    ) : availableRooms.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                        No rooms available for the selected dates.
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="roomId"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => {
                                const roomId = value ? parseInt(value) : "";
                                field.onChange(roomId);
                                const room = availableRooms.find(r => r.id === parseInt(value));
                                if (room?.roomCategory === "dormitory") form.setValue("numberOfGuests", 1);
                                // Auto-fill price
                                if (room?.pricePerNight) {
                                  const nights = numberOfNights > 0 ? numberOfNights : 1;
                                  form.setValue("priceQuoted", parseFloat(room.pricePerNight.toString()) * nights);
                                }
                              }}
                              value={field.value ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-room">
                                  <SelectValue placeholder="Select an available room" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableRooms.map((room) => (
                                  <SelectItem key={room.id} value={room.id.toString()}>
                                    Room {room.roomNumber} — {room.roomType || room.roomCategory}
                                    {room.roomCategory === "dormitory" && room.totalBeds
                                      ? ` (${room.totalBeds} beds — ₹${room.pricePerNight}/bed/night)`
                                      : ` (₹${room.pricePerNight}/night)`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )
                  )}

                  {/* MULTI-ROOM MODE */}
                  {multiRoomMode && (
                    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                      {loadingRooms ? (
                        <Skeleton className="h-10 w-full" />
                      ) : availableRooms.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No rooms available for the selected dates.</div>
                      ) : (
                        <>
                          {/* Header row */}
                          <div className="grid grid-cols-[1fr_140px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                            <span>Room</span>
                            <span>Total Price (₹)</span>
                            <span />
                          </div>

                          {/* Room rows */}
                          {multiRooms.map((entry, index) => (
                            <div key={entry.id} className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
                              {/* Room selector */}
                              <Select
                                value={entry.roomId ? entry.roomId.toString() : ""}
                                onValueChange={(val) => updateRoomEntry(entry.id, "roomId", parseInt(val))}
                              >
                                <SelectTrigger data-testid={`select-multi-room-${index}`} className="text-sm">
                                  <SelectValue placeholder="Select room" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRooms.map((room) => {
                                    const alreadySelected = multiRooms.some(
                                      r => r.id !== entry.id && r.roomId === room.id
                                    );
                                    return (
                                      <SelectItem
                                        key={room.id}
                                        value={room.id.toString()}
                                        disabled={alreadySelected}
                                      >
                                        <span className="flex items-center gap-1">
                                          <Hotel className="h-3 w-3 shrink-0" />
                                          Room {room.roomNumber} — {room.roomType || room.roomCategory}
                                          {alreadySelected && (
                                            <Badge variant="secondary" className="text-[10px] ml-1">Added</Badge>
                                          )}
                                        </span>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>

                              {/* Price input */}
                              <div className="relative">
                                <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className="pl-6 text-sm"
                                  data-testid={`input-room-price-${index}`}
                                  value={entry.price || ""}
                                  onChange={(e) => updateRoomEntry(entry.id, "price", parseFloat(e.target.value) || 0)}
                                />
                              </div>

                              {/* Remove button */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeRoomRow(entry.id)}
                                disabled={multiRooms.length === 1}
                                data-testid={`button-remove-room-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          {/* Add room button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-xs mt-1"
                            onClick={addRoomRow}
                            data-testid="button-add-another-room"
                          >
                            <PlusCircle className="h-3 w-3 mr-1" />
                            Add Another Room
                          </Button>

                          {/* Total summary */}
                          {multiRooms.some(r => r.roomId !== null) && (
                            <div className="flex justify-between items-center pt-2 border-t text-sm font-medium">
                              <span className="text-muted-foreground">
                                {multiRooms.filter(r => r.roomId !== null).length} room{multiRooms.filter(r => r.roomId !== null).length !== 1 ? "s" : ""}
                                {numberOfNights > 0 ? ` × ${numberOfNights} night${numberOfNights !== 1 ? "s" : ""}` : ""}
                              </span>
                              <span className="text-foreground">
                                Total: ₹{multiRoomTotal.toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
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
                          <Input placeholder="Enter guest name" className="pl-9" data-testid="input-guest-name" {...field} />
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
                          <Input placeholder="Enter phone number" className="pl-9" data-testid="input-guest-phone" {...field} />
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
                      <Input type="email" placeholder="guest@example.com" data-testid="input-guest-email" {...field} />
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
                      <FormLabel>
                        {selectedRoom?.roomCategory === "dormitory" ? "Number of Beds *" : "Number of Guests *"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={selectedRoom?.roomCategory === "dormitory" && selectedRoom.totalBeds ? selectedRoom.totalBeds : undefined}
                          placeholder="1"
                          data-testid="input-number-guests"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                      <FormLabel>
                        {multiRoomMode ? "Total Price (auto)" : "Price Quoted *"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-9"
                            data-testid="input-price-quoted"
                            readOnly={multiRoomMode}
                            {...field}
                            value={multiRoomMode ? (multiRoomTotal || "") : (field.value ?? "")}
                          />
                        </div>
                      </FormControl>
                      {multiRoomMode && (
                        <p className="text-xs text-muted-foreground">Auto-calculated from room prices above</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Advance Amount */}
              <FormField
                control={form.control}
                name="advanceAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Amount</FormLabel>
                    <FormControl>
                      <div className="relative max-w-xs">
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

              {/* Special Requests */}
              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requests</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requests or notes..."
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

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={createEnquiryMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit-enquiry"
                >
                  {createEnquiryMutation.isPending ? "Creating..." : "Create Enquiry"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/enquiries")}
                  data-testid="button-cancel-enquiry"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
