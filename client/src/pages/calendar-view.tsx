import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, startOfDay, eachDayOfInterval, differenceInDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Property, Booking, Room } from "@shared/schema";

interface CalendarBooking {
  id: number;
  roomId: number;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount: string;
}

interface RoomWithBookings {
  id: number;
  roomNumber: string;
  roomType: string;
  rate: number;
  bookings: CalendarBooking[];
}

const STATUS_COLORS = {
  confirmed: "bg-emerald-400 text-emerald-900",
  pending: "bg-blue-400 text-blue-900",
  "checked-in": "bg-emerald-500 text-white",
  "checked-out": "bg-gray-300 text-gray-900",
  cancelled: "bg-red-400 text-red-900",
  blocked: "bg-gray-400 text-gray-900",
};

export default function CalendarView() {
  const [, navigate] = useLocation();
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date>(today);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "all">("all");
  
  const endDate = addDays(startDate, 13); // 2 weeks view
  const dates = eachDayOfInterval({ start: startDate, end: endDate });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: guests = [] } = useQuery<any[]>({
    queryKey: ["/api/guests"],
  });

  const filteredRooms = useMemo(() => {
    let filtered = rooms;
    if (selectedPropertyId !== "all") {
      filtered = filtered.filter(r => r.propertyId === selectedPropertyId);
    }
    return filtered.sort((a, b) => {
      const numA = parseInt(a.roomNumber.replace(/\D/g, '') || '0');
      const numB = parseInt(b.roomNumber.replace(/\D/g, '') || '0');
      return numA - numB;
    });
  }, [rooms, selectedPropertyId]);

  // Group rooms by type
  const roomsByType = useMemo(() => {
    const grouped: Record<string, Room[]> = {};
    filteredRooms.forEach(room => {
      const type = room.roomType || "Other";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(room);
    });
    return grouped;
  }, [filteredRooms]);

  const getBookingsForRoom = (roomId: number) => {
    return bookings.filter(b => b.roomId === roomId && b.status !== "cancelled");
  };

  const getBookingForDate = (roomId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.find(b => 
      b.roomId === roomId &&
      format(new Date(b.checkInDate), "yyyy-MM-dd") <= dateStr &&
      format(new Date(b.checkOutDate), "yyyy-MM-dd") > dateStr &&
      b.status !== "cancelled"
    );
  };

  const getOccupancyPercent = (date: Date) => {
    const totalRooms = filteredRooms.length;
    if (totalRooms === 0) return 0;
    const occupiedCount = filteredRooms.filter(room => getBookingForDate(room.id, date)).length;
    return Math.round((occupiedCount / totalRooms) * 100);
  };

  if (roomsLoading || bookingsLoading || propertiesLoading) {
    return <div className="p-4 space-y-4"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5" />
            <h1 className="text-xl font-bold">Room Calendar</h1>
          </div>
          <Select value={String(selectedPropertyId)} onValueChange={(v) => setSelectedPropertyId(v === "all" ? "all" : parseInt(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setStartDate(addDays(startDate, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStartDate(today)}>
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStartDate(addDays(startDate, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar - Rooms */}
        <div className="w-48 border-r overflow-y-auto bg-background">
          <div className="sticky top-0 bg-card border-b p-3 font-semibold text-sm">
            {Object.keys(roomsByType).length} Room Type{Object.keys(roomsByType).length !== 1 ? 's' : ''}
          </div>
          <div className="p-2 space-y-1">
            {Object.entries(roomsByType).map(([type, typeRooms]) => (
              <div key={type} className="space-y-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 rounded sticky top-0">
                  {type} ({typeRooms.length})
                </div>
                {typeRooms.map(room => (
                  <div
                    key={room.id}
                    className="px-2 py-2 text-sm bg-card border rounded hover:bg-muted/50 cursor-pointer transition"
                    onClick={() => navigate(`/bookings?roomId=${room.id}`)}
                    data-testid={`room-label-${room.id}`}
                  >
                    <div className="font-medium">{room.roomNumber}</div>
                    <div className="text-xs text-muted-foreground">₹{room.pricePerNight}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-x-auto">
          {/* Date Headers */}
          <div className="min-w-max border-b bg-card sticky top-0 z-10">
            <div className="flex h-24">
              {dates.map(date => {
                const dayName = format(date, "EEE");
                const dayNum = format(date, "dd");
                const occupancy = getOccupancyPercent(date);
                const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                
                return (
                  <div
                    key={format(date, "yyyy-MM-dd")}
                    className={cn(
                      "w-24 border-r p-2 text-center flex flex-col items-center justify-center",
                      isToday && "bg-blue-50 dark:bg-blue-950"
                    )}
                  >
                    <div className={cn("text-xs font-semibold", isToday && "text-blue-600 dark:text-blue-300")}>
                      {dayName}
                    </div>
                    <div className={cn("text-lg font-bold", isToday && "text-blue-600 dark:text-blue-300")}>
                      {dayNum}
                    </div>
                    <Badge variant="secondary" className="text-xs mt-1 bg-muted">
                      {occupancy}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="min-w-max">
            {Object.entries(roomsByType).map(([type, typeRooms]) => (
              <div key={type}>
                {typeRooms.map(room => {
                  // Get unique bookings for this room that are visible in the date range
                  const bookingSet = new Map<number, Booking>();
                  dates.forEach(date => {
                    const booking = getBookingForDate(room.id, date);
                    if (booking) {
                      bookingSet.set(booking.id, booking);
                    }
                  });
                  const visibleBookings = Array.from(bookingSet.values());

                  return (
                    <div key={room.id} className="relative border-b">
                      {/* Background cells */}
                      <div className="flex h-16">
                        {dates.map(date => {
                          const dateStr = format(date, "yyyy-MM-dd");
                          return (
                            <div
                              key={`${room.id}-${dateStr}`}
                              className="w-24 border-r p-1 bg-background"
                              data-testid={`calendar-cell-${room.id}-${dateStr}`}
                            />
                          );
                        })}
                      </div>

                      {/* Booking bars overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        {visibleBookings.map(booking => {
                          const checkInDate = startOfDay(new Date(booking.checkInDate));
                          const checkOutDate = startOfDay(new Date(booking.checkOutDate));
                          const rangeStart = startOfDay(startDate);
                          
                          // Find the starting column
                          let startCol = -1;
                          let endCol = -1;
                          
                          dates.forEach((date, idx) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            const currentDate = startOfDay(date);
                            
                            if (format(currentDate, "yyyy-MM-dd") === format(checkInDate, "yyyy-MM-dd") && startCol === -1) {
                              startCol = idx;
                            }
                            if (currentDate >= checkOutDate || (currentDate < checkOutDate && currentDate >= checkInDate)) {
                              endCol = idx;
                            }
                          });

                          if (startCol === -1) return null;
                          
                          const bookingSpan = Math.max(1, endCol - startCol + 1);
                          const bookingWidth = bookingSpan * 96 + (bookingSpan - 1) * 1; // 96px width + 1px borders

                          return (
                            <div
                              key={`booking-${booking.id}`}
                              className="absolute top-1 h-14 pointer-events-auto"
                              style={{
                                left: `${startCol * 97}px`, // 96px + 1px border
                                width: `${bookingWidth}px`,
                              }}
                            >
                              <div
                                className={cn(
                                  "w-full h-full rounded text-xs flex items-center justify-center font-semibold text-white cursor-pointer hover:opacity-90 transition overflow-hidden",
                                  STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending
                                )}
                                onClick={() => navigate(`/bookings/${booking.id}`)}
                                title={guests.find(g => g.id === booking.guestId)?.fullName || "Guest"}
                              >
                                <div className="truncate px-1">{guests.find(g => g.id === booking.guestId)?.fullName || "Guest"}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t bg-card p-3 flex gap-4 flex-wrap text-xs flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-400" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-400" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span>Checked-in</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-400" />
          <span>Blocked/Out of Service</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-400" />
          <span>Cancelled</span>
        </div>
      </div>
    </div>
  );
}
