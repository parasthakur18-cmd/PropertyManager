import { useState, useRef, memo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { IdVerificationUpload } from "@/components/IdVerificationUpload";
import type { Property, Room, TravelAgent, InsertBooking } from "@shared/schema";
import { format } from "date-fns";

const GuestFields = memo(function GuestFields({
  guestDataRef,
  resetKey,
  validationAttempted,
}: {
  guestDataRef: React.MutableRefObject<{ fullName: string; phone: string; email: string; idProofImage: string }>;
  resetKey: number;
  validationAttempted: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setName(""); setPhone(""); setEmail("");
  }, [resetKey]);

  return (
    <>
      <Input
        placeholder="Full Name *"
        value={name}
        onChange={(e) => { setName(e.target.value); guestDataRef.current.fullName = e.target.value; }}
        data-testid="input-guest-name"
        className={`bg-background ${validationAttempted && !name ? "border-destructive border-2" : ""}`}
      />
      <Input
        placeholder="Phone Number *"
        value={phone}
        onChange={(e) => { setPhone(e.target.value); guestDataRef.current.phone = e.target.value; }}
        data-testid="input-guest-phone"
        className={`bg-background ${validationAttempted && !phone ? "border-destructive border-2" : ""}`}
      />
      <Input
        placeholder="Email (optional)"
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); guestDataRef.current.email = e.target.value; }}
        data-testid="input-guest-email"
        className="bg-background"
      />
      <IdVerificationUpload onUploadComplete={(key) => { guestDataRef.current.idProofImage = key; }} />
    </>
  );
});

interface NewBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewBookingDialog({ open, onOpenChange }: NewBookingDialogProps) {
  const { toast } = useToast();
  const guestDataRef = useRef({ fullName: "", phone: "", email: "", idProofImage: "" });
  const guestResetKey = useRef(0);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [bookingType, setBookingType] = useState<"single" | "group" | "dormitory">("single");
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);

  const getDefaultCheckIn = () => { const d = new Date(); d.setHours(11, 0, 0, 0); return d; };
  const getDefaultCheckOut = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; };

  const form = useForm({
    defaultValues: {
      propertyId: undefined as any,
      roomId: undefined as any,
      checkInDate: getDefaultCheckIn(),
      checkOutDate: getDefaultCheckOut(),
      status: "pending",
      numberOfGuests: 1,
      customPrice: null as any,
      specialRequests: "",
      source: "Walk-in",
      travelAgentId: null as any,
      mealPlan: "EP",
      advanceAmount: "",
      bedsBooked: null as any,
    },
  });

  const selectedPropertyId = form.watch("propertyId");
  const checkInDate = form.watch("checkInDate");
  const checkOutDate = form.watch("checkOutDate");
  const selectedRoomId = form.watch("roomId");

  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"], staleTime: 5 * 60 * 1000 });
  const { data: rooms } = useQuery<Room[]>({ queryKey: ["/api/rooms"], staleTime: 2 * 60 * 1000 });
  const { data: travelAgents } = useQuery<TravelAgent[]>({
    queryKey: ["/api/travel-agents"],
    staleTime: 5 * 60 * 1000,
    select: (agents) => selectedPropertyId ? agents.filter(a => a.propertyId === selectedPropertyId) : agents,
  });

  const { data: roomAvailability } = useQuery({
    queryKey: ["/api/rooms/availability", checkInDate, checkOutDate],
    enabled: !!(checkInDate && checkOutDate),
    queryFn: async () => {
      const response = await fetch(`/api/rooms/availability?checkIn=${checkInDate?.toISOString()}&checkOut=${checkOutDate?.toISOString()}`);
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json() as Promise<number[]>;
    },
    staleTime: 30 * 1000,
  });

  const selectedRoom = rooms?.find(r => r.id === selectedRoomId);

  const { data: bedInventory } = useQuery({
    queryKey: ["/api/rooms", selectedRoomId, "bed-inventory", checkInDate, checkOutDate],
    enabled: !!(selectedRoom?.roomCategory === "dormitory" && selectedRoomId && checkInDate && checkOutDate),
    queryFn: async () => {
      const r = await fetch(`/api/rooms/${selectedRoomId}/bed-inventory?checkIn=${checkInDate?.toISOString()}&checkOut=${checkOutDate?.toISOString()}`);
      if (!r.ok) throw new Error("Failed to fetch bed inventory");
      return r.json() as Promise<{ totalBeds: number; reservedBeds: number; remainingBeds: number }>;
    },
  });

  const getRoomsForType = (type: "single" | "group" | "dormitory") => {
    const all = rooms || [];
    const typed = type === "dormitory"
      ? all.filter(r => r.roomCategory === "dormitory")
      : all.filter(r => r.roomCategory !== "dormitory");
    return selectedPropertyId ? typed.filter(r => r.propertyId === selectedPropertyId) : typed;
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertBooking) => apiRequest("/api/bookings", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
      toast({ title: "Success", description: "Booking created successfully" });
      handleClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    form.reset({ propertyId: undefined, roomId: undefined, checkInDate: getDefaultCheckIn(), checkOutDate: getDefaultCheckOut(), status: "pending", numberOfGuests: 1, customPrice: null, specialRequests: "", source: "Walk-in", travelAgentId: null, mealPlan: "EP", advanceAmount: "", bedsBooked: null });
    guestDataRef.current = { fullName: "", phone: "", email: "", idProofImage: "" };
    guestResetKey.current += 1;
    setBookingType("single");
    setSelectedRoomIds([]);
    setValidationAttempted(false);
    onOpenChange(false);
  };

  const onSubmit = async (data: any) => {
    if (createMutation.isPending) return;
    setValidationAttempted(true);

    if (!guestDataRef.current.fullName || !guestDataRef.current.phone) {
      toast({ title: "Missing Required Fields", description: "Please enter guest name and phone number", variant: "destructive" });
      return;
    }
    if ((bookingType === "single" || bookingType === "dormitory") && !data.roomId) {
      toast({ title: "Error", description: "Please select a room", variant: "destructive" });
      return;
    }
    if (bookingType === "group" && selectedRoomIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one room for group booking", variant: "destructive" });
      return;
    }

    try {
      const guestResponse = await apiRequest("/api/guests", "POST", {
        fullName: guestDataRef.current.fullName,
        phone: guestDataRef.current.phone,
        email: guestDataRef.current.email || null,
        idProofImage: guestDataRef.current.idProofImage || null,
        idProofType: null, idProofNumber: null, address: null, preferences: null,
      });
      const newGuest = await guestResponse.json();

      const checkIn = new Date(data.checkInDate);
      const checkOut = new Date(data.checkOutDate);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      let roomCharges = 0;
      if (bookingType === "single" || bookingType === "dormitory") {
        const room = rooms?.find(r => r.id === data.roomId);
        if (room) roomCharges = data.customPrice ? parseFloat(data.customPrice) : parseFloat(room.pricePerNight.toString());
      } else {
        const sel = rooms?.filter(r => selectedRoomIds.includes(r.id)) || [];
        roomCharges = sel.reduce((s, r) => s + (data.customPrice ? parseFloat(data.customPrice) / sel.length : parseFloat(r.pricePerNight.toString())), 0);
      }

      const numGuests = Number(data.numberOfGuests);
      createMutation.mutate({
        propertyId: bookingType === "group" ? rooms?.find(r => r.id === selectedRoomIds[0])?.propertyId : data.propertyId,
        guestId: newGuest.id,
        roomId: bookingType === "group" ? null : data.roomId,
        roomIds: bookingType === "group" ? selectedRoomIds : null,
        checkInDate: fmt(checkIn),
        checkOutDate: fmt(checkOut),
        numberOfGuests: Number.isInteger(numGuests) && numGuests >= 1 ? numGuests : 1,
        customPrice: data.customPrice ? data.customPrice.toString() : null,
        advanceAmount: data.advanceAmount ? data.advanceAmount.toString() : "0",
        totalAmount: (roomCharges * nights).toFixed(2),
        status: data.status || "pending",
        source: data.source || "Walk-in",
        mealPlan: data.mealPlan || "EP",
        specialRequests: data.specialRequests || "",
        isGroupBooking: bookingType === "group",
        bedsBooked: bookingType === "group" ? selectedRoomIds.length : (bookingType === "dormitory" && data.bedsBooked ? parseInt(String(data.bedsBooked)) : null),
        travelAgentId: data.travelAgentId || null,
      } as InsertBooking);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create guest", variant: "destructive" });
    }
  };

  const availableRooms = getRoomsForType(bookingType);
  const source = form.watch("source");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>Fill in guest details and select room(s) to create a new booking</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, () => toast({ title: "Validation Error", description: "Please check all required fields", variant: "destructive" }))} className="space-y-4 pb-4">

            <div className="space-y-3 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Guest Details
                <Badge variant="destructive" className="ml-auto text-xs">Required</Badge>
              </h3>
              <GuestFields guestDataRef={guestDataRef} resetKey={guestResetKey.current} validationAttempted={validationAttempted} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="checkInDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-in Date *</FormLabel>
                  <FormControl>
                    <Input type="date" value={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value).toISOString().slice(0, 10) : ""} onChange={(e) => field.onChange(new Date(e.target.value))} data-testid="input-booking-checkin" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="checkOutDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-out Date *</FormLabel>
                  <FormControl>
                    <Input type="date" value={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value).toISOString().slice(0, 10) : ""} onChange={(e) => field.onChange(new Date(e.target.value))} data-testid="input-booking-checkout" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="propertyId" render={({ field }) => (
              <FormItem>
                <FormLabel>Property</FormLabel>
                <Select onValueChange={(v) => { field.onChange(parseInt(v)); form.setValue("roomId", undefined); }} value={field.value ? field.value.toString() : undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-property"><SelectValue placeholder="Select property (optional – filters rooms)" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {properties?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} - {p.location}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <Tabs value={bookingType} onValueChange={(v) => setBookingType(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="single" data-testid="tab-single-room">Single Room</TabsTrigger>
                <TabsTrigger value="dormitory" data-testid="tab-dormitory">Dormitory</TabsTrigger>
                <TabsTrigger value="group" data-testid="tab-group-booking">Group Booking</TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="mt-4">
                <FormField control={form.control} name="roomId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <Select onValueChange={(v) => { const id = parseInt(v); field.onChange(id); const r = rooms?.find(r => r.id === id); if (r) form.setValue("propertyId", r.propertyId); }} value={field.value ? field.value.toString() : undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-booking-room"><SelectValue placeholder="Select room" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRooms.map(room => {
                          const prop = properties?.find(p => p.id === room.propertyId);
                          return <SelectItem key={room.id} value={room.id.toString()}>{prop?.name} - Room {room.roomNumber} ({room.roomType || "Standard"}) - ₹{room.pricePerNight}/night</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="dormitory" className="mt-4 space-y-3">
                <FormField control={form.control} name="roomId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dormitory Room</FormLabel>
                    <Select onValueChange={(v) => { const id = parseInt(v); field.onChange(id); const r = rooms?.find(r => r.id === id); if (r) form.setValue("propertyId", r.propertyId); }} value={field.value ? field.value.toString() : undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-dormitory-room"><SelectValue placeholder="Select dormitory room" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getRoomsForType("dormitory").map(room => {
                          const prop = properties?.find(p => p.id === room.propertyId);
                          return <SelectItem key={room.id} value={room.id.toString()}>{prop?.name} - Room {room.roomNumber} - ₹{room.pricePerNight}/bed/night</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {selectedRoom?.roomCategory === "dormitory" && bedInventory && (
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {bedInventory.reservedBeds > 0 ? `${bedInventory.reservedBeds} of ${bedInventory.totalBeds} beds occupied • ${bedInventory.remainingBeds} available` : `All ${bedInventory.totalBeds} beds available`}
                  </div>
                )}
                {selectedRoom?.roomCategory === "dormitory" && bedInventory?.remainingBeds === 0 ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">Dormitory fully booked for these dates.</div>
                ) : selectedRoom?.roomCategory === "dormitory" && (
                  <FormField control={form.control} name="bedsBooked" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Beds</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max={bedInventory?.remainingBeds || selectedRoom.totalBeds || 6} placeholder="Enter number of beds" value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")} data-testid="input-beds-booked" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </TabsContent>

              <TabsContent value="group" className="mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <FormLabel>Select Rooms</FormLabel>
                  <Badge variant="secondary">{selectedRoomIds.length} room{selectedRoomIds.length !== 1 ? "s" : ""} selected</Badge>
                </div>
                <div className="border border-border rounded-md max-h-48 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr className="border-b border-border">
                        <th className="p-2 text-left text-xs">
                          <input type="checkbox" checked={selectedRoomIds.length === getRoomsForType("group").length && getRoomsForType("group").length > 0} onChange={(e) => setSelectedRoomIds(e.target.checked ? getRoomsForType("group").map(r => r.id) : [])} />
                        </th>
                        <th className="p-2 text-left text-xs font-medium">Property</th>
                        <th className="p-2 text-left text-xs font-medium">Room</th>
                        <th className="p-2 text-left text-xs font-medium">Type</th>
                        <th className="p-2 text-left text-xs font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRoomsForType("group").map(room => {
                        const prop = properties?.find(p => p.id === room.propertyId);
                        const sel = selectedRoomIds.includes(room.id);
                        return (
                          <tr key={room.id} className={`border-b border-border cursor-pointer ${sel ? "bg-primary/10" : ""}`} onClick={() => setSelectedRoomIds(sel ? selectedRoomIds.filter(id => id !== room.id) : [...selectedRoomIds, room.id])}>
                            <td className="p-2"><input type="checkbox" checked={sel} onChange={() => {}} /></td>
                            <td className="p-2 text-sm">{prop?.name}</td>
                            <td className="p-2 text-sm font-mono font-semibold">{room.roomNumber}</td>
                            <td className="p-2 text-sm text-muted-foreground">{room.roomType || "Standard"}</td>
                            <td className="p-2 text-sm">₹{room.pricePerNight}/night</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>

            {availableRooms.length === 0 && roomAvailability && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">No Rooms Available</p>
                  <p className="text-xs text-muted-foreground mt-1">All rooms are booked for {checkInDate ? format(checkInDate, "MMM dd") : ""} – {checkOutDate ? format(checkOutDate, "MMM dd") : ""}. Try different dates.</p>
                </div>
              </div>
            )}

            <FormField control={form.control} name="numberOfGuests" render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Guests</FormLabel>
                <FormControl>
                  <Input type="number" min="1" placeholder="1" value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")} data-testid="input-booking-guests" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="customPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Price Per Night (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="Leave empty for room price" value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? e.target.value : null)} data-testid="input-booking-custom-price" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="advanceAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Advance Payment (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="Enter amount" value={field.value || ""} onChange={(e) => field.onChange(e.target.value || "")} data-testid="input-booking-advance" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "Walk-in"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-booking-source"><SelectValue placeholder="Select source" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["Walk-in","Online","Booking.com","MMT","Airbnb","OTA","Travel Agent","Others"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="mealPlan" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Plan</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "EP"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-booking-meal-plan"><SelectValue placeholder="Select meal plan" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EP">EP - Room Only</SelectItem>
                      <SelectItem value="CP">CP - Room + Breakfast</SelectItem>
                      <SelectItem value="MAP">MAP - Room + Breakfast + Dinner</SelectItem>
                      <SelectItem value="AP">AP - All Meals Included</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {source === "Travel Agent" && (
              <FormField control={form.control} name="travelAgentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Travel Agent</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? String(field.value) : undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-travel-agent"><SelectValue placeholder="Select travel agent" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {travelAgents?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="specialRequests" render={({ field }) => (
              <FormItem>
                <FormLabel>Special Requests (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Any special requirements..." {...field} data-testid="input-booking-special-requests" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel-booking">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-booking">
                {createMutation.isPending ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
