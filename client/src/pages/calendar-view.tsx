import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search, Settings, Menu, X, Circle } from "lucide-react";
import { format, addDays, startOfDay, eachDayOfInterval } from "date-fns";
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

const STATUS_COLORS = {
  confirmed: "bg-emerald-400",
  pending: "bg-blue-400",
  "checked-in": "bg-emerald-500",
  "checked-out": "bg-gray-300",
  cancelled: "bg-red-400",
  blocked: "bg-gray-400",
};

const CELL_WIDTH = 96; // px

export default function CalendarView() {
  const [, navigate] = useLocation();
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date>(today);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "all">("all");
  const [showRoomSidebar, setShowRoomSidebar] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
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

  const getBookingForDate = (roomId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.find(b => 
      b.roomId === roomId &&
      format(new Date(b.checkInDate), "yyyy-MM-dd") <= dateStr &&
      format(new Date(b.checkOutDate), "yyyy-MM-dd") > dateStr &&
      b.status !== "cancelled"
    );
  };

  const getBookingsForRoom = (roomId: number) => {
    const bookingSet = new Map<number, Booking>();
    dates.forEach(date => {
      const booking = getBookingForDate(roomId, date);
      if (booking) {
        bookingSet.set(booking.id, booking);
      }
    });
    return Array.from(bookingSet.values());
  };

  const getOccupancyPercent = (date: Date) => {
    const totalRooms = filteredRooms.length;
    if (totalRooms === 0) return 0;
    const occupiedCount = filteredRooms.filter(room => getBookingForDate(room.id, date)).length;
    return Math.round((occupiedCount / totalRooms) * 100);
  };

  const calculateBookingPosition = (booking: Booking, dateIndex: number) => {
    const checkInDate = startOfDay(new Date(booking.checkInDate));
    const checkOutDate = startOfDay(new Date(booking.checkOutDate));
    const rangeStart = startOfDay(startDate);
    
    const checkInIndex = Math.max(0, Math.floor((checkInDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
    const checkOutIndex = Math.floor((checkOutDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dateIndex < checkInIndex || dateIndex >= checkOutIndex) return null;
    
    const isCheckInDay = dateIndex === checkInIndex;
    const isCheckOutDay = dateIndex === checkOutIndex - 1;
    
    let leftOffset = 0;
    let width = CELL_WIDTH;
    
    if (isCheckInDay) {
      leftOffset = CELL_WIDTH / 2; // Start halfway
      width = CELL_WIDTH / 2;
    }
    
    if (isCheckOutDay) {
      width = CELL_WIDTH / 2; // End halfway
    }
    
    if (isCheckInDay && isCheckOutDay) {
      leftOffset = CELL_WIDTH / 2;
      width = 0; // Same day (edge case)
    }
    
    return { leftOffset, width };
  };

  if (roomsLoading || bookingsLoading || propertiesLoading) {
    return <div className="p-4 space-y-4"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card p-3 flex-shrink-0 space-y-3">
        {/* Top Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setShowRoomSidebar(!showRoomSidebar)}
              data-testid="button-toggle-room-sidebar"
            >
              {showRoomSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <CalendarIcon className="h-5 w-5" />
            <h1 className="text-lg font-bold">Room Calendar</h1>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setStartDate(addDays(startDate, -7))} data-testid="button-prev-week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStartDate(today)} data-testid="button-today">
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStartDate(addDays(startDate, 7))} data-testid="button-next-week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reservations, guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-calendar"
              />
            </div>
          </div>
          <Select value={String(selectedPropertyId)} onValueChange={(v) => setSelectedPropertyId(v === "all" ? "all" : parseInt(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" data-testid="button-view-settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar - Rooms */}
        <div className={cn("border-r overflow-y-auto bg-background transition-all duration-300 flex-shrink-0", showRoomSidebar ? "w-48" : "w-0")}>
          <div className="sticky top-0 bg-card border-b p-3 font-semibold text-sm z-20">
            {Object.keys(roomsByType).length} Room Type{Object.keys(roomsByType).length !== 1 ? 's' : ''}
          </div>
          <div className="p-2 space-y-1">
            {Object.entries(roomsByType).map(([type, typeRooms]) => (
              <div key={type} className="space-y-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 rounded sticky top-10 z-10">
                  {type} ({typeRooms.length})
                </div>
                {typeRooms.map(room => (
                  <div
                    key={room.id}
                    className="px-2 py-2 text-sm bg-card border rounded hover:bg-muted/50 cursor-pointer transition"
                    onClick={() => navigate(`/bookings?roomId=${room.id}`)}
                    data-testid={`room-label-${room.id}`}
                  >
                    <div className="font-medium text-xs">{room.roomNumber}</div>
                    <div className="text-xs text-muted-foreground">₹{room.pricePerNight}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="min-w-max">
            {/* Date Headers */}
            <div className="sticky top-0 z-20 bg-card border-b">
              <div className="flex">
                {dates.map((date, idx) => {
                  const dayName = format(date, "EEE");
                  const dayNum = format(date, "dd");
                  const occupancy = getOccupancyPercent(date);
                  const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                  
                  return (
                    <div
                      key={format(date, "yyyy-MM-dd")}
                      className={cn(
                        "border-r p-2 text-center text-xs flex-shrink-0",
                        isToday && "bg-blue-50 dark:bg-blue-950"
                      )}
                      style={{ width: CELL_WIDTH }}
                    >
                      <div className={cn("font-semibold", isToday && "text-blue-600 dark:text-blue-300")}>
                        {dayName}
                      </div>
                      <div className={cn("text-lg font-bold", isToday && "text-blue-600 dark:text-blue-300")}>
                        {dayNum}
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {occupancy}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rooms Grid */}
            {Object.entries(roomsByType).map(([type, typeRooms]) => (
              <div key={type}>
                {typeRooms.map(room => {
                  const roomBookings = getBookingsForRoom(room.id);
                  
                  return (
                    <div key={room.id} className="relative border-b">
                      {/* Background cells */}
                      <div className="flex h-16">
                        {dates.map((date, idx) => {
                          const dateStr = format(date, "yyyy-MM-dd");
                          return (
                            <div
                              key={`${room.id}-${dateStr}`}
                              className="border-r bg-background flex-shrink-0"
                              style={{ width: CELL_WIDTH }}
                              data-testid={`calendar-cell-${room.id}-${dateStr}`}
                            />
                          );
                        })}
                      </div>

                      {/* Booking bars overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        {roomBookings.map((booking) => {
                          // Calculate booking width across all dates
                          const checkInDate = startOfDay(new Date(booking.checkInDate));
                          const checkOutDate = startOfDay(new Date(booking.checkOutDate));
                          const rangeStart = startOfDay(startDate);
                          
                          const checkInIndex = Math.max(0, Math.floor((checkInDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
                          const checkOutIndex = Math.floor((checkOutDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                          
                          if (checkOutIndex <= 0 || checkInIndex >= dates.length) return null;
                          
                          const visibleCheckInIndex = Math.max(0, checkInIndex);
                          const visibleCheckOutIndex = Math.min(dates.length, checkOutIndex);
                          
                          const isCheckInDay = checkInIndex < dates.length && checkInIndex >= 0;
                          const isCheckOutDay = checkOutIndex <= dates.length && checkOutIndex > 0;
                          
                          let leftOffset = visibleCheckInIndex * (CELL_WIDTH + 1); // +1 for border
                          let totalWidth = (visibleCheckOutIndex - visibleCheckInIndex) * (CELL_WIDTH + 1);
                          
                          // Adjust for partial days
                          if (isCheckInDay && checkInIndex >= 0 && checkInIndex < dates.length) {
                            leftOffset += CELL_WIDTH / 2;
                            totalWidth -= CELL_WIDTH / 2;
                          }
                          
                          if (isCheckOutDay && checkOutIndex > 0 && checkOutIndex <= dates.length) {
                            totalWidth -= CELL_WIDTH / 2;
                          }

                          const guestName = guests.find(g => g.id === booking.guestId)?.fullName || "Guest";
                          const statusColor = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;

                          return (
                            <div
                              key={`booking-${booking.id}`}
                              className="absolute top-2 h-12 pointer-events-auto"
                              style={{
                                left: `${leftOffset}px`,
                                width: `${Math.max(0, totalWidth)}px`,
                              }}
                            >
                              <div
                                className={cn(
                                  "w-full h-full rounded text-xs flex items-center justify-between px-1.5 font-semibold text-white cursor-pointer hover:opacity-90 transition overflow-hidden",
                                  statusColor
                                )}
                                onClick={() => navigate(`/bookings/${booking.id}`)}
                                title={guestName}
                                data-testid={`booking-bar-${booking.id}`}
                              >
                                <span className="truncate">{guestName}</span>
                                <Circle className="h-2 w-2 flex-shrink-0 ml-1 fill-current" />
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
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-400" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Checked-in</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-400" />
          <span>Cancelled</span>
        </div>
      </div>
    </div>
  );
}
