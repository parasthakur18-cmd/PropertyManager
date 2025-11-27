import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  LogIn, 
  Search, 
  Phone, 
  MapPin, 
  Users, 
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft
} from "lucide-react";
import { format, isToday, parseISO, isBefore, startOfDay } from "date-fns";
import type { Booking, Guest, Property, Room } from "@shared/schema";
import { Link } from "wouter";

export default function CheckIns() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

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
      return apiRequest("PATCH", `/api/bookings/${bookingId}`, { status: "checked-in" });
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
      const bookingRooms = rooms?.filter(r => booking.roomIds?.includes(r.id)) || [];
      roomDisplay = bookingRooms.map(r => r.roomNumber).join(", ");
    } else {
      const room = rooms?.find(r => r.id === booking.roomId);
      roomDisplay = room?.roomNumber || "N/A";
    }
    
    return { guest, property, roomDisplay };
  };

  const todayCheckIns = (bookings || []).filter(b => {
    const checkInDate = new Date(b.checkInDate);
    const today = startOfDay(new Date());
    return (isToday(checkInDate) || isBefore(checkInDate, today)) && 
           (b.status === "pending" || b.status === "confirmed");
  });

  const filteredCheckIns = todayCheckIns.filter(booking => {
    const { guest, property } = getGuestInfo(booking);
    const matchesSearch = 
      !searchQuery || 
      guest?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest?.phone?.includes(searchQuery);
    const matchesProperty = 
      propertyFilter === "all" || 
      booking.propertyId?.toString() === propertyFilter;
    return matchesSearch && matchesProperty;
  });

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground">Loading check-ins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Today's Check-ins</h1>
          <p className="text-sm text-muted-foreground">
            {filteredCheckIns.length} guest{filteredCheckIns.length !== 1 ? "s" : ""} arriving today
          </p>
        </div>
        <Badge variant="secondary" className="bg-blue-500 text-white h-8 px-3 text-base">
          {filteredCheckIns.length}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-checkins"
          />
        </div>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-property-filter">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties?.map(property => (
              <SelectItem key={property.id} value={property.id.toString()}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                          onClick={() => checkInMutation.mutate(booking.id)}
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
    </div>
  );
}
