import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { GuestIdUpload } from "@/components/GuestIdUpload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  LogIn, 
  Search, 
  Phone, 
  MapPin, 
  Users, 
  CheckCircle2,
  Clock,
  ArrowLeft
} from "lucide-react";
import { isToday, isBefore, startOfDay } from "date-fns";
import type { Booking, Guest, Property, Room } from "@shared/schema";
import { Link } from "wouter";

export default function CheckIns() {
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const { toast } = useToast();

  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinBookingId, setCheckinBookingId] = useState<number | null>(null);
  const [checkinGuestEntries, setCheckinGuestEntries] = useState<Array<{
    guestName: string; phone: string; email: string; idProofType: string; idProofNumber: string;
    idProofFront: string | null; idProofBack: string | null; isPrimary: boolean;
  }>>([]);

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    refetchInterval: 30000,
  });

  const { data: guests } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const checkInMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest(`/api/bookings/${bookingId}`, "PATCH", { status: "checked-in" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Guest Checked In", description: "Guest has been successfully checked in." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to check in guest", variant: "destructive" });
    },
  });

  const getGuestInfo = (booking: Booking) => {
    const guest = guests?.find(g => g.id === booking.guestId);
    const property = properties?.find(p => p.id === booking.propertyId);
    
    let roomDisplay = "";
    if (booking.isGroupBooking && booking.roomIds && booking.roomIds.length > 0) {
      const roomNumbers = booking.roomIds
        .map(rid => rooms?.find(r => r.id === rid)?.roomNumber)
        .filter(Boolean)
        .join(", ");
      roomDisplay = roomNumbers || "Multiple";
    } else {
      const room = rooms?.find(r => r.id === booking.roomId);
      roomDisplay = room?.roomNumber || "Unassigned";
    }
    
    return { guest, property, roomDisplay };
  };

  const todaysCheckIns = (bookings || []).filter(booking => {
    if (booking.status !== "confirmed") return false;
    const checkInDate = new Date(booking.checkInDate);
    return isToday(checkInDate) || isBefore(checkInDate, startOfDay(new Date()));
  });

  const filteredCheckIns = todaysCheckIns.filter(booking => {
    if (propertyFilter !== "all" && booking.propertyId !== parseInt(propertyFilter)) return false;
    if (searchQuery) {
      const guest = guests?.find(g => g.id === booking.guestId);
      const search = searchQuery.toLowerCase();
      return guest?.fullName?.toLowerCase().includes(search) || 
             guest?.phone?.includes(search);
    }
    return true;
  });

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const handleCheckIn = (booking: Booking) => {
    const guest = guests?.find(g => g.id === booking.guestId);
    setCheckinBookingId(booking.id);
    setCheckinGuestEntries([{
      guestName: guest?.fullName || "",
      phone: guest?.phone || "",
      email: guest?.email || "",
      idProofType: guest?.idProofType || "",
      idProofNumber: guest?.idProofNumber || "",
      idProofFront: guest?.idProofImage || null,
      idProofBack: null,
      isPrimary: true,
    }]);
    setCheckinDialogOpen(true);
  };

  const handleConfirmCheckIn = async () => {
    const hasValidGuest = checkinGuestEntries.some(g => g.guestName && g.idProofFront);
    if (!hasValidGuest) {
      toast({
        title: "ID Required",
        description: "Please upload at least the front ID photo for the primary guest",
        variant: "destructive",
      });
      return;
    }

    if (!checkinBookingId) return;

    try {
      const booking = bookings?.find(b => b.id === checkinBookingId);
      if (!booking) return;

      const primaryGuest = checkinGuestEntries.find(g => g.isPrimary) || checkinGuestEntries[0];
      if (primaryGuest && booking.guestId) {
        await apiRequest(`/api/guests/${booking.guestId}`, "PATCH", {
          idProofImage: primaryGuest.idProofFront,
          idProofType: primaryGuest.idProofType || null,
          idProofNumber: primaryGuest.idProofNumber || null,
        });
      }

      await apiRequest(`/api/bookings/${checkinBookingId}/guests`, "POST", {
        guests: checkinGuestEntries,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/guests"] });

      checkInMutation.mutate(checkinBookingId);

      setCheckinDialogOpen(false);
      setCheckinBookingId(null);
      setCheckinGuestEntries([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save guest information",
        variant: "destructive",
      });
    }
  };

  if (bookingsLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/bookings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Today's Check-ins</h1>
        </div>
        {[1,2,3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Today's Check-ins</h1>
        <Badge variant="secondary" className="ml-2" data-testid="badge-checkin-count">{todaysCheckIns.length}</Badge>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or phone..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-checkins"
          />
        </div>
        {properties && properties.length > 1 && (
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-property-filter">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filteredCheckIns.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-70" />
          <p className="text-lg font-medium mb-1">All caught up!</p>
          <p className="text-muted-foreground">No pending check-ins for today</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCheckIns.map(booking => {
            const { guest, property, roomDisplay } = getGuestInfo(booking);
            const room = rooms?.find(r => r.id === booking.roomId);
            
            return (
              <Card 
                key={booking.id} 
                className="overflow-hidden hover-elevate"
                data-testid={`card-checkin-${booking.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <LogIn className="h-6 w-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-lg truncate" data-testid={`text-guest-name-${booking.id}`}>
                            {guest?.fullName || "Guest"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Room {roomDisplay}
                          </p>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={booking.status === "confirmed" ? "bg-green-500 text-white" : "bg-amber-500 text-white"}
                          data-testid={`badge-status-${booking.id}`}
                        >
                          {booking.status}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {property?.name || "Property"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {booking.numberOfGuests} guest{booking.numberOfGuests !== 1 ? "s" : ""}
                        </span>
                        {room?.roomType && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {room.roomType}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {guest?.phone && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCall(guest.phone)}
                            data-testid={`button-call-${booking.id}`}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        )}
                        <Button 
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleCheckIn(booking)}
                          disabled={checkInMutation.isPending}
                          data-testid={`button-checkin-${booking.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {checkInMutation.isPending ? "Checking In..." : "Check In"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={checkinDialogOpen} onOpenChange={(open) => {
        setCheckinDialogOpen(open);
        if (!open) {
          setCheckinBookingId(null);
          setCheckinGuestEntries([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-checkin-verification">
          <DialogHeader>
            <DialogTitle>Check-In Guest</DialogTitle>
            <DialogDescription>
              Upload front & back of each guest's ID proof. Add more guests if needed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            <GuestIdUpload
              guests={checkinGuestEntries}
              onChange={setCheckinGuestEntries}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCheckinDialogOpen(false);
                setCheckinBookingId(null);
                setCheckinGuestEntries([]);
              }}
              data-testid="button-cancel-checkin"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCheckIn}
              disabled={!checkinGuestEntries.some(g => g.guestName && g.idProofFront)}
              data-testid="button-confirm-checkin"
            >
              Complete Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
