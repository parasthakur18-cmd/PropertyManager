import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Calendar, Users, Wifi, Wind, Utensils, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Room, type Property } from "@shared/schema";
import { format, differenceInCalendarDays } from "date-fns";

export default function CheckAvailability() {
  const [, setLocation] = useLocation();
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: allRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  // Calculate number of nights (only if dates are valid)
  const nightCount = checkInDate && checkOutDate && checkInDate < checkOutDate
    ? Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate))
    : 0;

  // Fetch room availability - only when user has searched AND dates are valid
  const isValidSearchCriteria = !!(
    checkInDate && 
    checkOutDate && 
    checkInDate < checkOutDate && 
    hasSearched
  );

  const { data: roomAvailability, isLoading: isLoadingAvailability, isError: isAvailabilityError, error: availabilityError, refetch: refetchAvailability } = useQuery({
    queryKey: ["/api/rooms/availability", checkInDate, checkOutDate, selectedPropertyId],
    enabled: isValidSearchCriteria,
    retry: 2, // Retry failed requests twice
    queryFn: async () => {
      // Extra safety check - should never happen due to enabled condition
      if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
        throw new Error("Invalid date range");
      }
      
      const params = new URLSearchParams({
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        // Only include propertyId if it's a valid finite number
        ...(Number.isFinite(selectedPropertyId) ? { propertyId: selectedPropertyId.toString() } : {}),
      });
      const response = await fetch(`/api/rooms/availability?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json() as Promise<Array<{
        roomId: number;
        available: number;
        totalBeds?: number;
        remainingBeds?: number;
      }>>;
    },
  });

  // Filter available rooms
  const availableRooms = allRooms?.filter(room => {
    // Filter by property if selected
    if (selectedPropertyId && room.propertyId !== selectedPropertyId) {
      return false;
    }

    // Check availability
    if (!roomAvailability) return false;
    
    const roomAvail = roomAvailability.find(a => a.roomId === room.id);
    if (!roomAvail) return false;
    
    // For regular rooms, check if available > 0
    // For dormitory rooms, check if remainingBeds > 0
    return room.roomCategory === "dormitory" 
      ? (roomAvail.remainingBeds || 0) > 0
      : roomAvail.available > 0;
  }) || [];

  const handleSearch = () => {
    if (!checkInDate || !checkOutDate) return;
    if (checkInDate >= checkOutDate) return;
    setHasSearched(true);
    setSelectedRoomIds([]); // Reset selection on new search
    // Refetch availability if already searched (to refresh data)
    if (hasSearched) {
      refetchAvailability();
    }
  };

  const toggleRoomSelection = (roomId: number) => {
    if (selectedRoomIds.includes(roomId)) {
      setSelectedRoomIds(selectedRoomIds.filter(id => id !== roomId));
    } else {
      setSelectedRoomIds([...selectedRoomIds, roomId]);
    }
  };

  const selectedRooms = allRooms?.filter(r => selectedRoomIds.includes(r.id)) || [];
  const totalPrice = selectedRooms.reduce((sum, room) => {
    const pricePerNight = parseFloat(room.pricePerNight.toString());
    return sum + (pricePerNight * nightCount);
  }, 0);

  const handleContinueToBooking = () => {
    // Guard against null or invalid dates, and no room selection
    if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate || selectedRoomIds.length === 0) return;
    
    // Navigate to bookings page with pre-filled data
    const params = new URLSearchParams({
      new: 'true',
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate.toISOString(),
      ...(selectedPropertyId && { propertyId: selectedPropertyId.toString() }),
      ...(selectedRoomIds.length === 1 && { roomId: selectedRoomIds[0].toString() }),
      ...(selectedRoomIds.length > 1 && { roomIds: selectedRoomIds.join(',') }),
    });
    setLocation(`/bookings?${params.toString()}`);
  };

  const getRoomAmenities = (room: Room) => {
    const amenities = [];
    if (room.amenities?.includes('ac')) amenities.push({ icon: Wind, label: 'AC' });
    if (room.amenities?.includes('wifi')) amenities.push({ icon: Wifi, label: 'WiFi' });
    if (room.amenities?.includes('breakfast')) amenities.push({ icon: Utensils, label: 'Breakfast' });
    return amenities;
  };

  const getRoomTypeLabel = (category: string) => {
    return {
      'standard': 'Standard Room',
      'deluxe': 'Deluxe Room',
      'suite': 'Suite',
      'dormitory': 'Dormitory',
    }[category] || category;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Check Room Availability</h1>
          <p className="text-muted-foreground mt-1">
            Find available rooms for your selected dates
          </p>
        </div>

        {/* Search Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property">Property (Optional)</Label>
                <Select
                  value={selectedPropertyId?.toString() || "all"}
                  onValueChange={(value) => {
                    setSelectedPropertyId(value === "all" ? null : parseInt(value));
                    // Clear selections and reset search state when property filter changes
                    setSelectedRoomIds([]);
                    // Reset search state if user has already searched - they need to search again
                    if (hasSearched) {
                      setHasSearched(false);
                    }
                  }}
                >
                  <SelectTrigger id="property" data-testid="select-property">
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

              <div className="space-y-2">
                <Label htmlFor="checkin">Check-in Date</Label>
                <Input
                  id="checkin"
                  type="datetime-local"
                  value={checkInDate ? new Date(checkInDate.getTime() - checkInDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value) : null;
                    setCheckInDate(newDate);
                    // Clear selections whenever date changes
                    setSelectedRoomIds([]);
                    if (!newDate) {
                      setHasSearched(false);
                    }
                  }}
                  data-testid="input-checkin"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout">Check-out Date</Label>
                <Input
                  id="checkout"
                  type="datetime-local"
                  value={checkOutDate ? new Date(checkOutDate.getTime() - checkOutDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    const newDate = e.target.value ? new Date(e.target.value) : null;
                    setCheckOutDate(newDate);
                    // Clear selections whenever date changes
                    setSelectedRoomIds([]);
                    if (!newDate) {
                      setHasSearched(false);
                    }
                  }}
                  data-testid="input-checkout"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleSearch}
                  disabled={!checkInDate || !checkOutDate || checkInDate >= checkOutDate}
                  className="w-full"
                  data-testid="button-search"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Rooms
                </Button>
              </div>
            </div>

            {nightCount > 0 && (
              <div className="mt-4 p-3 bg-primary/10 rounded-md">
                <p className="text-sm font-medium">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  {nightCount} {nightCount === 1 ? 'night' : 'nights'} • {checkInDate && format(checkInDate, 'dd MMM yyyy')} → {checkOutDate && format(checkOutDate, 'dd MMM yyyy')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invalid Range Warning */}
        {hasSearched && nightCount === 0 && checkInDate && checkOutDate && (
          <Card className="p-8 text-center border-amber-500">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-amber-600">Invalid Date Range</h3>
              <p className="text-muted-foreground max-w-md">
                Check-out date must be after check-in date. Please select valid dates and search again.
              </p>
            </div>
          </Card>
        )}

        {/* Results */}
        {hasSearched && nightCount > 0 && (
          <>
            {isLoadingAvailability ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Checking availability...</p>
                </div>
              </Card>
            ) : isAvailabilityError ? (
              <Card className="p-12 text-center border-destructive">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <Calendar className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-semibold text-destructive">Error Loading Availability</h3>
                  <p className="text-muted-foreground max-w-md">
                    Failed to check room availability. Please try again or contact support if the problem persists.
                  </p>
                  <Button onClick={() => refetchAvailability()} variant="outline">
                    <Search className="h-4 w-4 mr-2" />
                    Retry Search
                  </Button>
                </div>
              </Card>
            ) : availableRooms.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                    <Calendar className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">No rooms available</h3>
                  <p className="text-muted-foreground max-w-md">
                    No rooms are available for the selected dates. Try different dates or contact support.
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                      Available
                    </Badge>
                    {availableRooms.length} {availableRooms.length === 1 ? 'Room' : 'Rooms'}
                  </h2>
                  <p className="text-muted-foreground">
                    {checkInDate && checkOutDate && `${format(checkInDate, 'dd MMM')} – ${format(checkOutDate, 'dd MMM')}`}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableRooms.map(room => {
                    const property = properties?.find(p => p.id === room.propertyId);
                    const pricePerNight = parseFloat(room.pricePerNight.toString());
                    const totalRoomPrice = pricePerNight * nightCount;
                    const isSelected = selectedRoomIds.includes(room.id);
                    const amenities = getRoomAmenities(room);
                    const roomAvail = roomAvailability?.find(a => a.roomId === room.id);

                    return (
                      <Card 
                        key={room.id}
                        className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => toggleRoomSelection(room.id)}
                        data-testid={`card-room-${room.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg font-bold flex items-center gap-2">
                                {room.roomNumber}
                                {isSelected && <Check className="h-5 w-5 text-primary" />}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {getRoomTypeLabel(room.roomCategory)}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                              Available
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {property?.name || 'Unknown Property'}
                          </div>

                          {room.roomCategory === 'dormitory' && roomAvail && (
                            <div className="text-sm">
                              <span className="font-medium">{roomAvail.remainingBeds} beds available</span>
                              <span className="text-muted-foreground"> of {roomAvail.totalBeds}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Up to {room.maxOccupancy} guests
                          </div>

                          {amenities.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {amenities.map((amenity, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  <amenity.icon className="h-3 w-3 mr-1" />
                                  {amenity.label}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="pt-3 border-t space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">₹{pricePerNight.toLocaleString()}</span>
                              <span className="text-sm text-muted-foreground">/night</span>
                            </div>
                            <div className="text-sm font-medium text-primary">
                              Total: ₹{totalRoomPrice.toLocaleString()} <span className="text-muted-foreground font-normal">(for {nightCount} {nightCount === 1 ? 'night' : 'nights'})</span>
                            </div>
                          </div>

                          <Button 
                            variant={isSelected ? "default" : "outline"}
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRoomSelection(room.id);
                            }}
                            data-testid={`button-select-room-${room.id}`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Selected
                              </>
                            ) : (
                              'Select Room'
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Floating Summary Bar */}
      {selectedRoomIds.length > 0 && checkInDate && checkOutDate && checkInDate < checkOutDate && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg p-4 z-50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-bold text-lg">
                {selectedRoomIds.length} {selectedRoomIds.length === 1 ? 'room' : 'rooms'} selected
              </p>
              <p className="text-sm text-muted-foreground">
                Total: ₹{totalPrice.toLocaleString()} <span className="text-muted-foreground">(for {nightCount} {nightCount === 1 ? 'night' : 'nights'})</span>
              </p>
            </div>
            <Button 
              size="lg"
              onClick={handleContinueToBooking}
              disabled={!checkInDate || !checkOutDate || checkInDate >= checkOutDate}
              data-testid="button-continue-booking"
            >
              Continue to Guest Details →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
