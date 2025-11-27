import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Search, 
  Settings, 
  Menu, 
  X, 
  List, 
  LayoutGrid, 
  Plus,
  ChevronDown,
  ChevronUp,
  Link2,
  AlertTriangle,
  Lock,
  Wrench,
  CheckCircle2,
  MoreVertical
} from "lucide-react";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Property, Booking, Room } from "@shared/schema";

const STATUS_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  confirmed: { 
    bg: "bg-teal-400", 
    text: "text-teal-900",
    gradient: "linear-gradient(135deg, #4fd1c5 0%, #38b2ac 100%)"
  },
  pending: { 
    bg: "bg-blue-300", 
    text: "text-blue-900",
    gradient: "linear-gradient(135deg, #90cdf4 0%, #63b3ed 100%)"
  },
  "checked-in": { 
    bg: "bg-emerald-500", 
    text: "text-white",
    gradient: "linear-gradient(135deg, #48bb78 0%, #38a169 100%)"
  },
  "checked-out": { 
    bg: "bg-gray-300", 
    text: "text-gray-700",
    gradient: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)"
  },
  cancelled: { 
    bg: "bg-red-400", 
    text: "text-red-900",
    gradient: "linear-gradient(135deg, #fc8181 0%, #f56565 100%)"
  },
  blocked: { 
    bg: "bg-gray-400", 
    text: "text-gray-900",
    gradient: "linear-gradient(135deg, #a0aec0 0%, #718096 100%)"
  },
  "out-of-service": {
    bg: "bg-rose-400",
    text: "text-rose-900", 
    gradient: "linear-gradient(135deg, #fda4af 0%, #fb7185 100%)"
  }
};

const CELL_WIDTH = 80;
const ROW_HEIGHT = 48;
const TYPE_ROW_HEIGHT = 40;
const SIDEBAR_WIDTH = 180;

export default function CalendarView() {
  const [, navigate] = useLocation();
  const today = startOfDay(new Date());
  const [startDate, setStartDate] = useState<Date>(today);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "all">("all");
  const [showRoomSidebar, setShowRoomSidebar] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [checkInDate, setCheckInDate] = useState(format(today, "yyyy-MM-dd"));
  const [checkOutDate, setCheckOutDate] = useState(format(addDays(today, 1), "yyyy-MM-dd"));
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [activeRoomMenu, setActiveRoomMenu] = useState<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const endDate = addDays(startDate, 11);
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

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!guestName.trim() || !selectedRoomId) throw new Error("Fill all fields");
      const roomId = parseInt(selectedRoomId);
      const room = rooms.find(r => r.id === roomId);
      if (!room) throw new Error("Room not found");
      
      return apiRequest("/api/bookings", "POST", {
        guestName: guestName.trim(),
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        roomId,
        propertyId: room.propertyId,
        status: "confirmed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setShowCreateBooking(false);
      setGuestName("");
      setCheckInDate(format(today, "yyyy-MM-dd"));
      setCheckOutDate(format(addDays(today, 1), "yyyy-MM-dd"));
      setSelectedRoomId("");
    },
  });

  const updateRoomStatusMutation = useMutation({
    mutationFn: async ({ roomId, status }: { roomId: number; status: string }) => {
      console.log("[MUTATION] Updating room status", { roomId, status });
      const response = await apiRequest(`/api/rooms/${roomId}/status`, "PATCH", { status });
      console.log("[MUTATION] Response:", response);
      return response;
    },
    onSuccess: () => {
      console.log("[MUTATION] Success!");
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setActiveRoomMenu(null);
    },
    onError: (error) => {
      console.log("[MUTATION] Error:", error);
    },
  });

  // Sync vertical scroll between sidebar and calendar
  useEffect(() => {
    const calendar = calendarRef.current;
    const sidebar = sidebarRef.current;
    if (!calendar || !sidebar) return;

    const handleCalendarScroll = () => {
      sidebar.scrollTop = calendar.scrollTop;
    };
    const handleSidebarScroll = () => {
      calendar.scrollTop = sidebar.scrollTop;
    };

    calendar.addEventListener('scroll', handleCalendarScroll);
    sidebar.addEventListener('scroll', handleSidebarScroll);
    return () => {
      calendar.removeEventListener('scroll', handleCalendarScroll);
      sidebar.removeEventListener('scroll', handleSidebarScroll);
    };
  }, []);

  // Initialize all types as expanded
  useEffect(() => {
    if (Object.keys(expandedTypes).length === 0 && rooms.length > 0) {
      const types: Record<string, boolean> = {};
      rooms.forEach(room => {
        const type = room.roomType || "Other";
        types[type] = true;
      });
      setExpandedTypes(types);
    }
  }, [rooms, expandedTypes]);

  const filteredRooms = useMemo(() => {
    let filtered = rooms;
    if (selectedPropertyId !== "all") {
      filtered = filtered.filter(r => r.propertyId === selectedPropertyId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        // Search by room number or type
        const matchesRoom = r.roomNumber.toLowerCase().includes(q) ||
          (r.roomType && r.roomType.toLowerCase().includes(q));
        
        // Search by guest name in bookings
        const matchesGuest = bookings.some(b => 
          b.roomId === r.id && 
          guests.find(g => g.id === b.guestId)?.fullName?.toLowerCase().includes(q)
        );
        
        return matchesRoom || matchesGuest;
      });
    }
    return filtered.sort((a, b) => {
      const numA = parseInt(a.roomNumber.replace(/\D/g, '') || '0');
      const numB = parseInt(b.roomNumber.replace(/\D/g, '') || '0');
      return numA - numB;
    });
  }, [rooms, selectedPropertyId, searchQuery, bookings, guests]);

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

  const getAvailableRoomsForType = (typeRooms: Room[], date: Date) => {
    return typeRooms.filter(room => !getBookingForDate(room.id, date)).length;
  };

  const getPriceForType = (typeRooms: Room[]) => {
    if (typeRooms.length === 0) return "₹0";
    const prices = typeRooms.map(r => Number(r.pricePerNight) || 0);
    const minPrice = Math.min(...prices);
    return `₹${minPrice.toLocaleString()}`;
  };

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  if (roomsLoading || bookingsLoading || propertiesLoading) {
    return <div className="p-4 space-y-4"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white dark:bg-card p-3 flex-shrink-0 space-y-3">
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
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Room Calendar</h1>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setStartDate(addDays(startDate, -7))} data-testid="button-prev-week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStartDate(today)} data-testid="button-today">
              Today
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStartDate(addDays(startDate, 7))} data-testid="button-next-week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reservations, guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 dark:bg-background border-slate-200"
                data-testid="input-search-calendar"
              />
            </div>
          </div>
          <Select value={String(selectedPropertyId)} onValueChange={(v) => setSelectedPropertyId(v === "all" ? "all" : parseInt(v))}>
            <SelectTrigger className="w-44 bg-white dark:bg-card">
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
        {/* Left Sidebar */}
        <div className={cn(
          "border-r bg-white dark:bg-card transition-all duration-300 flex-shrink-0 flex flex-col",
          showRoomSidebar ? "md:w-[220px] w-full" : "w-0 overflow-hidden"
        )}>
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-2 border-b bg-slate-50 dark:bg-muted/30">
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <List className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Search className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={() => setShowCreateBooking(true)}
              data-testid="button-create-booking"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* All Accommodations Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-card border-b font-semibold text-sm">
            <span>All Accommodations</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Room Types & Rooms */}
          <div 
            ref={sidebarRef}
            className="flex-1 overflow-y-auto overflow-x-visible"
          >
            {Object.entries(roomsByType).map(([type, typeRooms]) => (
              <div key={type}>
                {/* Room Type Header */}
                <div
                  className="flex items-center justify-between px-3 border-b bg-slate-50 dark:bg-muted/20 cursor-pointer hover:bg-slate-100 dark:hover:bg-muted/30 transition-colors"
                  style={{ height: TYPE_ROW_HEIGHT }}
                  onClick={() => toggleType(type)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{type}</span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-muted-foreground transition-transform",
                      !expandedTypes[type] && "-rotate-90"
                    )} />
                  </div>
                </div>

                {/* Room Rows */}
                {expandedTypes[type] && typeRooms.map(room => {
                  const isLoading = updateRoomStatusMutation.isPending;
                  return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between px-2 border-b hover:bg-slate-50 dark:hover:bg-muted/10 group transition-colors relative"
                    style={{ height: ROW_HEIGHT }}
                    data-testid={`room-row-${room.id}`}
                  >
                    <div 
                      className="flex items-center gap-1 cursor-pointer flex-1 min-w-0"
                      onClick={() => navigate(`/rooms/${room.id}`)}
                    >
                      <span className="font-medium text-sm truncate">{room.roomNumber}</span>
                      <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </div>
                    
                    {/* Quick Action Buttons - Test with visible background */}
                    <div className="flex items-center gap-1 flex-shrink-0 bg-blue-50 dark:bg-blue-950 p-1 rounded">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("[BUTTON-CLICK] Available for room", room.id);
                          updateRoomStatusMutation.mutate({ roomId: room.id, status: "available" });
                        }}
                        disabled={isLoading}
                        className="p-1 bg-green-500 hover:bg-green-600 rounded cursor-pointer text-white min-w-fit"
                        title="Available"
                        data-testid={`button-available-${room.id}`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("[BUTTON-CLICK] Block for room", room.id);
                          updateRoomStatusMutation.mutate({ roomId: room.id, status: "blocked" });
                        }}
                        disabled={isLoading}
                        className="p-1 bg-yellow-500 hover:bg-yellow-600 rounded cursor-pointer text-white min-w-fit"
                        title="Block"
                        data-testid={`button-block-${room.id}`}
                      >
                        <Lock className="h-3 w-3" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("[BUTTON-CLICK] Out-of-service for room", room.id);
                          updateRoomStatusMutation.mutate({ roomId: room.id, status: "out-of-service" });
                        }}
                        disabled={isLoading}
                        className="p-1 bg-red-500 hover:bg-red-600 rounded cursor-pointer text-white min-w-fit"
                        title="Out of Service"
                        data-testid={`button-out-of-service-${room.id}`}
                      >
                        <Wrench className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div 
          ref={calendarRef}
          className="flex-1 overflow-auto"
        >
          <div className="min-w-max">
            {/* Date Headers Row */}
            <div className="sticky top-0 z-20 bg-white dark:bg-card border-b flex">
              {dates.map((date, idx) => {
                const dayName = format(date, "EEE");
                const dayNum = format(date, "d");
                const occupancy = getOccupancyPercent(date);
                const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                
                return (
                  <div
                    key={format(date, "yyyy-MM-dd")}
                    className={cn(
                      "border-r text-center flex-shrink-0 py-2",
                      isToday && "bg-blue-50 dark:bg-blue-950/30"
                    )}
                    style={{ width: CELL_WIDTH }}
                  >
                    <div className={cn(
                      "text-xs font-medium text-muted-foreground",
                      isToday && "text-blue-600 dark:text-blue-400"
                    )}>
                      {dayName}
                    </div>
                    <div className={cn(
                      "text-xl font-bold",
                      isToday && "text-blue-600 dark:text-blue-400"
                    )}>
                      {dayNum}
                    </div>
                    <div className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                      occupancy >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      occupancy >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {occupancy}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Room Type Rows with Price Headers + Room Rows */}
            {Object.entries(roomsByType).map(([type, typeRooms]) => (
              <div key={type}>
                {/* Room Type Price Row */}
                <div className="flex border-b bg-slate-50 dark:bg-muted/10">
                  {dates.map((date, idx) => {
                    const available = getAvailableRoomsForType(typeRooms, date);
                    const price = getPriceForType(typeRooms);
                    
                    return (
                      <div
                        key={`type-${type}-${format(date, "yyyy-MM-dd")}`}
                        className="border-r text-center flex flex-col items-center justify-center flex-shrink-0"
                        style={{ width: CELL_WIDTH, height: TYPE_ROW_HEIGHT }}
                      >
                        <div className="text-xs text-muted-foreground">{available}</div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{price}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Individual Room Rows */}
                {expandedTypes[type] && typeRooms.map(room => {
                  const roomBookings = getBookingsForRoom(room.id);
                  
                  return (
                    <div key={room.id} className="relative border-b bg-white dark:bg-card">
                      {/* Background cells */}
                      <div className="flex" style={{ height: ROW_HEIGHT }}>
                        {dates.map((date) => {
                          const dateStr = format(date, "yyyy-MM-dd");
                          return (
                            <div
                              key={`${room.id}-${dateStr}`}
                              className="border-r flex-shrink-0"
                              style={{ width: CELL_WIDTH }}
                              data-testid={`calendar-cell-${room.id}-${dateStr}`}
                            />
                          );
                        })}
                      </div>

                      {/* Booking bars overlay */}
                      <div className="absolute inset-0 pointer-events-none py-1.5">
                        {roomBookings.map((booking) => {
                          const checkInDate = startOfDay(new Date(booking.checkInDate));
                          const checkOutDate = startOfDay(new Date(booking.checkOutDate));
                          const rangeStart = startOfDay(startDate);
                          
                          const checkInDaysDiff = Math.floor((checkInDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                          const checkOutDaysDiff = Math.floor((checkOutDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                          
                          if (checkOutDaysDiff <= 0 || checkInDaysDiff >= dates.length) return null;
                          
                          const visibleStartIdx = Math.max(0, checkInDaysDiff);
                          const visibleEndIdx = Math.min(dates.length, checkOutDaysDiff);
                          
                          // Calculate position with half-day offsets
                          let leftPx = visibleStartIdx * CELL_WIDTH;
                          let widthPx = (visibleEndIdx - visibleStartIdx) * CELL_WIDTH;
                          
                          // Start at half of check-in day if check-in is visible
                          if (checkInDaysDiff >= 0 && checkInDaysDiff < dates.length) {
                            leftPx += CELL_WIDTH / 2;
                            widthPx -= CELL_WIDTH / 2;
                          }
                          
                          // End at half of checkout day if checkout is visible
                          if (checkOutDaysDiff > 0 && checkOutDaysDiff <= dates.length) {
                            widthPx -= CELL_WIDTH / 2;
                          }

                          if (widthPx <= 0) return null;

                          const guestName = guests.find(g => g.id === booking.guestId)?.fullName || "Guest";
                          const statusStyle = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                          const isPaid = booking.status === "checked-out" || booking.status === "confirmed";

                          return (
                            <div
                              key={`booking-${booking.id}`}
                              className="absolute pointer-events-auto cursor-pointer group"
                              style={{
                                left: `${leftPx}px`,
                                width: `${widthPx}px`,
                                top: '4px',
                                bottom: '4px',
                              }}
                              onClick={() => navigate(`/bookings/${booking.id}`)}
                              data-testid={`booking-bar-${booking.id}`}
                            >
                              <div
                                className={cn(
                                  "w-full h-full rounded-md flex items-center justify-between px-2 text-xs font-semibold shadow-sm transition-all group-hover:shadow-md group-hover:scale-[1.02]",
                                  statusStyle.text
                                )}
                                style={{
                                  background: statusStyle.gradient,
                                }}
                                title={`${guestName} - ${booking.status}`}
                              >
                                <span className="truncate">{guestName}</span>
                                <span 
                                  className={cn(
                                    "w-2 h-2 rounded-full flex-shrink-0 ml-1",
                                    isPaid ? "bg-green-600" : "bg-red-500"
                                  )}
                                />
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
      <div className="border-t bg-white dark:bg-card p-2 flex gap-4 flex-wrap text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.confirmed.gradient }} />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.pending.gradient }} />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS["checked-in"].gradient }} />
          <span>Checked-in</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.blocked.gradient }} />
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS["out-of-service"].gradient }} />
          <span>Out of Service</span>
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <span className="w-2 h-2 rounded-full bg-green-600" />
          <span>Paid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Unpaid</span>
        </div>
      </div>

      {/* Create Booking Dialog */}
      <Dialog open={showCreateBooking} onOpenChange={setShowCreateBooking}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-create-booking">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
              Fill in the booking details to create a new reservation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="guest-name">Guest Name</Label>
              <Input
                id="guest-name"
                placeholder="Enter guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                data-testid="input-guest-name"
              />
            </div>
            <div>
              <Label htmlFor="check-in">Check-in Date</Label>
              <Input
                id="check-in"
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                data-testid="input-check-in-date"
              />
            </div>
            <div>
              <Label htmlFor="check-out">Check-out Date</Label>
              <Input
                id="check-out"
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                data-testid="input-check-out-date"
              />
            </div>
            <div>
              <Label htmlFor="room">Select Room</Label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger id="room" data-testid="select-room">
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRooms.map(room => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {room.roomNumber} - {room.roomType} (₹{room.pricePerNight})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateBooking(false)}
              data-testid="button-cancel-booking"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createBookingMutation.mutate()}
              disabled={createBookingMutation.isPending}
              data-testid="button-save-booking"
            >
              {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
