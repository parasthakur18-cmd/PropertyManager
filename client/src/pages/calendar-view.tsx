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
  MoreVertical,
  Hotel
} from "lucide-react";
import { format, addDays, startOfDay, eachDayOfInterval, addMonths } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "all">(() => {
    const saved = localStorage.getItem('selectedPropertyId');
    return saved ? parseInt(saved) : "all";
  });
  
  // Sync property selection to localStorage
  useEffect(() => {
    if (selectedPropertyId !== "all") {
      localStorage.setItem('selectedPropertyId', selectedPropertyId.toString());
    }
  }, [selectedPropertyId]);
  const [showRoomSidebar, setShowRoomSidebar] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [checkInDate, setCheckInDate] = useState(format(today, "yyyy-MM-dd"));
  const [checkOutDate, setCheckOutDate] = useState(format(addDays(today, 1), "yyyy-MM-dd"));
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [activeRoomMenu, setActiveRoomMenu] = useState<number | null>(null);
  const [dormitoryPopup, setDormitoryPopup] = useState<{
    isOpen: boolean;
    room: Room | null;
    bookings: Booking[];
    date: Date | null;
  }>({ isOpen: false, room: null, bookings: [], date: null });
  const calendarRef = useRef<HTMLDivElement>(null);
  
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
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }); // Refresh notifications
      setShowCreateBooking(false);
      setGuestName("");
      setCheckInDate(format(today, "yyyy-MM-dd"));
      setCheckOutDate(format(addDays(today, 1), "yyyy-MM-dd"));
      setSelectedRoomId("");
    },
  });


  // Lock the page scroll so our single calendar scroll container handles all scrolling.
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const prev = (main as HTMLElement).style.overflow;
    (main as HTMLElement).style.overflow = 'hidden';
    return () => { (main as HTMLElement).style.overflow = prev; };
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

  // Bookings with no room assigned (e.g. OTA bookings where room mapping wasn't found)
  // that overlap the currently visible date range
  const unassignedBookings = useMemo(() => {
    const rangeStart = format(startDate, "yyyy-MM-dd");
    const rangeEnd = format(addDays(startDate, 11), "yyyy-MM-dd");
    return bookings.filter(b => {
      if (b.status === "cancelled") return false;
      if (b.roomId != null) return false;
      if (b.roomIds && b.roomIds.length > 0) return false;
      if (selectedPropertyId !== "all" && b.propertyId !== selectedPropertyId) return false;
      // Overlaps visible range: checkIn <= rangeEnd AND checkOut > rangeStart
      const cin = format(new Date(b.checkInDate), "yyyy-MM-dd");
      const cout = format(new Date(b.checkOutDate), "yyyy-MM-dd");
      return cin <= rangeEnd && cout > rangeStart;
    });
  }, [bookings, startDate, selectedPropertyId]);

  const getBookingForDate = (roomId: number, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.find(b => {
      // Check if room matches (either roomId or in roomIds array for group bookings)
      const roomMatches = b.roomId === roomId || (b.roomIds && b.roomIds.includes(roomId));
      if (!roomMatches) return false;
      
      // Hide cancelled bookings only; checked-out bookings remain visible in gray
      if (b.status === "cancelled") return false;
      
      // Check date range
      return format(new Date(b.checkInDate), "yyyy-MM-dd") <= dateStr &&
        format(new Date(b.checkOutDate), "yyyy-MM-dd") > dateStr;
    });
  };

  const getBookingsForRoom = (roomId: number) => {
    const bookingSet = new Map<number, Booking>();
    dates.forEach(date => {
      const booking = getBookingForDate(roomId, date);
      if (booking) {
        bookingSet.set(booking.id, booking);
      }
    });
    
    // Also include group bookings that contain this room (exclude cancelled only)
    bookings.forEach(booking => {
      if (booking.status === "cancelled") return;
      if (booking.roomIds && booking.roomIds.includes(roomId)) {
        // Check if this booking overlaps with our date range
        const bookingStart = new Date(booking.checkInDate);
        const bookingEnd = new Date(booking.checkOutDate);
        const rangeStart = dates[0];
        const rangeEnd = dates[dates.length - 1];
        
        if (bookingStart <= rangeEnd && bookingEnd >= rangeStart) {
          bookingSet.set(booking.id, booking);
        }
      }
    });
    
    return Array.from(bookingSet.values());
  };

  // Get ALL bookings for a dormitory room on a specific date (allows multiple bookings)
  const getAllDormitoryBookingsForDate = (roomId: number, date: Date): Booking[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter(b => {
      const roomMatches = b.roomId === roomId || (b.roomIds && b.roomIds.includes(roomId));
      if (!roomMatches) return false;
      if (b.status === "cancelled") return false;
      
      return format(new Date(b.checkInDate), "yyyy-MM-dd") <= dateStr &&
        format(new Date(b.checkOutDate), "yyyy-MM-dd") > dateStr;
    });
  };

  // Get all bookings for a dormitory room in the visible date range
  const getAllDormitoryBookingsInRange = (roomId: number): Booking[] => {
    const bookingSet = new Map<number, Booking>();
    dates.forEach(date => {
      const dormBookings = getAllDormitoryBookingsForDate(roomId, date);
      dormBookings.forEach(b => bookingSet.set(b.id, b));
    });
    return Array.from(bookingSet.values());
  };

  // Check if a room is a dormitory
  const isDormitoryRoom = (room: Room): boolean => {
    return room.roomCategory === "dormitory" && (room.totalBeds || 1) > 1;
  };

  // Get total beds booked for a dormitory room in a date range
  const getBedsBookedForDateRange = (roomId: number, startDate: Date, endDate: Date): number => {
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");
    
    return bookings
      .filter(b => {
        const roomMatches = b.roomId === roomId;
        if (!roomMatches) return false;
        
        const bookingStart = format(new Date(b.checkInDate), "yyyy-MM-dd");
        const bookingEnd = format(new Date(b.checkOutDate), "yyyy-MM-dd");
        
        // Check if booking overlaps with the date range
        return bookingStart < endStr && bookingEnd > startStr && b.status !== "cancelled" && b.status !== "checked-out";
      })
      .reduce((total, b) => total + (b.bedsBooked || 1), 0);
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
        <div className="flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setShowRoomSidebar(!showRoomSidebar)}
              data-testid="button-toggle-room-sidebar"
              className="hidden md:flex"
            >
              {showRoomSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <CalendarIcon className="h-5 w-5 text-primary flex-shrink-0" />
            <h1 className="text-base md:text-lg font-bold truncate">Room Calendar</h1>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setStartDate(addMonths(startDate, -1))} title="Previous Month" data-testid="button-prev-month">
              {format(addMonths(startDate, -1), "MMM")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStartDate(addDays(startDate, -7))} data-testid="button-prev-week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStartDate(today)} data-testid="button-today">
              Today
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStartDate(addDays(startDate, 7))} data-testid="button-next-week">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStartDate(addMonths(startDate, 1))} title="Next Month" data-testid="button-next-month">
              {format(addMonths(startDate, 1), "MMM")}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap">
          <div className="flex-1 min-w-0 md:max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 dark:bg-background border-slate-200 text-sm md:text-base"
                data-testid="input-search-calendar"
              />
            </div>
          </div>
          <Select value={String(selectedPropertyId)} onValueChange={(v) => setSelectedPropertyId(v === "all" ? "all" : parseInt(v))}>
            <SelectTrigger className="w-auto md:w-44 bg-white dark:bg-card text-sm md:text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" data-testid="button-view-settings" className="flex-shrink-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Unassigned OTA Bookings Banner */}
      {unassignedBookings.length > 0 && (
        <div className="border-b bg-amber-50 dark:bg-amber-950/30 px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {unassignedBookings.length} Unassigned OTA Booking{unassignedBookings.length > 1 ? "s" : ""} — room not yet assigned
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedBookings.map(b => {
              const guest = guests.find(g => g.id === b.guestId);
              const guestName = guest?.fullName || "Unknown Guest";
              const source = b.source || b.externalSource || "OTA";
              const statusStyle = STATUS_COLORS[b.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
              return (
                <button
                  key={b.id}
                  className="flex items-center gap-2 bg-white dark:bg-card border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5 text-xs hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/bookings/${b.id}`)}
                  data-testid={`unassigned-booking-${b.id}`}
                >
                  <span className="font-semibold text-foreground">{guestName}</span>
                  <span className="text-muted-foreground">
                    {format(new Date(b.checkInDate), "d MMM")} – {format(new Date(b.checkOutDate), "d MMM")}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {b.status}
                  </span>
                  <span className="text-muted-foreground italic">{source}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Content — single scroll container with sticky room-name column */}
      <div
        ref={calendarRef}
        className="flex-1 overflow-auto"
      >
        <div style={{ minWidth: `${(showRoomSidebar ? SIDEBAR_WIDTH : 0) + dates.length * CELL_WIDTH}px` }}>

          {/* ── Sticky date-header row ───────────────────────────────────── */}
          <div className="sticky top-0 z-30 flex bg-white dark:bg-card border-b">
            {/* Top-left corner: sticky on both axes */}
            {showRoomSidebar && (
              <div
                className="sticky left-0 z-40 bg-white dark:bg-card border-r flex items-center justify-between px-2 flex-shrink-0"
                style={{ width: SIDEBAR_WIDTH }}
              >
                <span className="font-semibold text-xs text-muted-foreground truncate">All Rooms</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => setShowCreateBooking(true)}
                  data-testid="button-create-booking"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {/* Date columns */}
            {dates.map((date, idx) => {
              const dayName = format(date, "EEE");
              const dayNum = format(date, "d");
              const monthLabel = format(date, "MMM");
              const occupancy = getOccupancyPercent(date);
              const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
              const showMonth = idx === 0 || format(date, "d") === "1";
              return (
                <div
                  key={format(date, "yyyy-MM-dd")}
                  className={cn(
                    "border-r text-center flex-shrink-0 py-2",
                    isToday && "bg-blue-50 dark:bg-blue-950/30",
                    showMonth && idx !== 0 && "border-l-2 border-l-slate-300 dark:border-l-slate-600"
                  )}
                  style={{ width: CELL_WIDTH }}
                >
                  <div className={cn("text-xs font-medium text-muted-foreground", isToday && "text-blue-600 dark:text-blue-400")}>{dayName}</div>
                  <div className={cn("text-xl font-bold leading-tight", isToday && "text-blue-600 dark:text-blue-400")}>{dayNum}</div>
                  <div className={cn(
                    "text-xs font-semibold leading-tight",
                    showMonth ? (isToday ? "text-blue-500 dark:text-blue-400" : "text-slate-500 dark:text-slate-400") : "text-transparent select-none"
                  )}>{monthLabel}</div>
                  <div className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-0.5",
                    occupancy >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    occupancy >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}>{occupancy}%</div>
                </div>
              );
            })}
          </div>

          {/* ── Unassigned OTA Bookings ──────────────────────────────────── */}
          {unassignedBookings.length > 0 && (
            <>
              {/* Section header row */}
              <div className="flex border-b bg-amber-50 dark:bg-amber-950/30">
                {showRoomSidebar && (
                  <div
                    className="sticky left-0 z-10 bg-amber-50 dark:bg-amber-950/30 border-r flex items-center gap-2 px-3 flex-shrink-0"
                    style={{ width: SIDEBAR_WIDTH, height: TYPE_ROW_HEIGHT }}
                  >
                    <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="font-semibold text-xs text-amber-800 dark:text-amber-300 truncate">
                      Unassigned ({unassignedBookings.length})
                    </span>
                  </div>
                )}
                {dates.map(date => (
                  <div key={`ua-hdr-${format(date, "yyyy-MM-dd")}`} className="border-r flex-shrink-0"
                    style={{ width: CELL_WIDTH, height: TYPE_ROW_HEIGHT }} />
                ))}
              </div>

              {/* One row per unassigned booking */}
              {unassignedBookings.map(b => {
                const checkInDate = startOfDay(new Date(b.checkInDate));
                const checkOutDate = startOfDay(new Date(b.checkOutDate));
                const rangeStart = startOfDay(startDate);
                const checkInDaysDiff = Math.floor((checkInDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                const checkOutDaysDiff = Math.floor((checkOutDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                const visibleStartIdx = Math.max(0, checkInDaysDiff);
                const visibleEndIdx = Math.min(dates.length, checkOutDaysDiff + 1);
                let leftPx = visibleStartIdx * CELL_WIDTH;
                let widthPx = (visibleEndIdx - visibleStartIdx) * CELL_WIDTH;
                if (checkInDaysDiff >= 0 && checkInDaysDiff < dates.length) { leftPx += CELL_WIDTH / 2; widthPx -= CELL_WIDTH / 2; }
                if (checkOutDaysDiff > 0 && checkOutDaysDiff <= dates.length) { widthPx -= CELL_WIDTH / 2; }
                const guestName = guests.find(g => g.id === b.guestId)?.fullName || "OTA Guest";
                const source = b.source || b.externalSource || "OTA";
                const statusStyle = STATUS_COLORS[b.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                return (
                  <div key={`ua-row-${b.id}`} className="flex border-b bg-white dark:bg-card">
                    {showRoomSidebar && (
                      <div
                        className="sticky left-0 z-10 bg-amber-50/60 dark:bg-amber-950/20 border-r flex items-center justify-between px-2 flex-shrink-0 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
                        style={{ width: SIDEBAR_WIDTH, height: ROW_HEIGHT }}
                        onClick={() => navigate(`/bookings/${b.id}`)}
                        data-testid={`unassigned-sidebar-${b.id}`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-xs truncate">{guestName}</span>
                          <span className="text-xs text-muted-foreground truncate italic">{source}</span>
                        </div>
                        <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-1" />
                      </div>
                    )}
                    {/* Date cells + booking bar */}
                    <div className="relative flex-shrink-0" style={{ width: dates.length * CELL_WIDTH, height: ROW_HEIGHT }}>
                      <div className="flex h-full">
                        {dates.map(date => (
                          <div key={`ua-cell-${b.id}-${format(date,"yyyy-MM-dd")}`}
                            className="border-r flex-shrink-0 bg-amber-50/40 dark:bg-amber-950/10"
                            style={{ width: CELL_WIDTH }} />
                        ))}
                      </div>
                      {widthPx > 0 && checkOutDaysDiff > 0 && checkInDaysDiff < dates.length && (
                        <div className="absolute inset-0 pointer-events-none py-1.5">
                          <div
                            className="absolute pointer-events-auto cursor-pointer group"
                            style={{ left: `${leftPx}px`, width: `${widthPx}px`, top: '4px', bottom: '4px' }}
                            onClick={() => navigate(`/bookings/${b.id}`)}
                            data-testid={`unassigned-bar-${b.id}`}
                          >
                            <div
                              className={`w-full h-full rounded-md flex items-center justify-between px-2 text-xs font-semibold shadow-sm border-2 border-amber-400 transition-all group-hover:shadow-md group-hover:scale-[1.02] ${statusStyle.text}`}
                              style={{ background: statusStyle.gradient }}
                              title={`${guestName} — No room assigned yet`}
                            >
                              <span className="truncate">{guestName}</span>
                              <AlertTriangle className="h-3 w-3 flex-shrink-0 ml-1 opacity-80" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── Room Types + Room Rows ───────────────────────────────────── */}
          {Object.entries(roomsByType).map(([type, typeRooms]) => (
            <div key={type}>
              {/* Type header / price row */}
              <div className="flex border-b bg-slate-50 dark:bg-muted/10">
                {showRoomSidebar && (
                  <div
                    className="sticky left-0 z-10 bg-slate-50 dark:bg-muted/20 border-r flex items-center justify-between px-3 flex-shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-muted/30 transition-colors"
                    style={{ width: SIDEBAR_WIDTH, height: TYPE_ROW_HEIGHT }}
                    onClick={() => toggleType(type)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm truncate">{type}</span>
                      <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform flex-shrink-0", !expandedTypes[type] && "-rotate-90")} />
                    </div>
                  </div>
                )}
                {dates.map((date) => {
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

              {/* Individual room rows */}
              {expandedTypes[type] && typeRooms.map(room => {
                const isDorm = isDormitoryRoom(room);
                const roomBookings = isDorm
                  ? getAllDormitoryBookingsInRange(room.id)
                  : getBookingsForRoom(room.id);

                const getDormitoryDisplayBookings = () => {
                  return roomBookings.map(booking => {
                    if (!isDorm) return { booking, allBookings: [booking], additionalBeds: 0 };
                    const overlapping = roomBookings.filter(other => {
                      const bookingStart = new Date(booking.checkInDate);
                      const bookingEnd = new Date(booking.checkOutDate);
                      const otherStart = new Date(other.checkInDate);
                      const otherEnd = new Date(other.checkOutDate);
                      return bookingStart < otherEnd && bookingEnd > otherStart;
                    });
                    const otherBeds = overlapping.filter(b => b.id !== booking.id).reduce((sum, b) => sum + (b.bedsBooked || 1), 0);
                    const thisBookingExtraBeds = Math.max(0, (booking.bedsBooked || 1) - 1);
                    return { booking, allBookings: overlapping, additionalBeds: otherBeds + thisBookingExtraBeds };
                  });
                };

                const displayBookings = getDormitoryDisplayBookings();

                return (
                  <div key={room.id} className="flex border-b bg-white dark:bg-card" data-testid={`room-row-${room.id}`}>
                    {/* Sticky room name cell */}
                    {showRoomSidebar && (
                      <div
                        className="sticky left-0 z-10 bg-white dark:bg-card border-r flex items-center justify-between px-2 flex-shrink-0 group hover:bg-slate-50 dark:hover:bg-muted/10 transition-colors"
                        style={{ width: SIDEBAR_WIDTH, height: ROW_HEIGHT }}
                      >
                        <div
                          className="flex items-center gap-1 cursor-pointer min-w-0 flex-1"
                          onClick={() => navigate(`/rooms/${room.id}`)}
                        >
                          <span className="font-medium text-sm truncate">{room.roomNumber}</span>
                          <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    )}

                    {/* Date cells + booking bars (self-contained relative context) */}
                    <div className="relative flex-shrink-0" style={{ width: dates.length * CELL_WIDTH, height: ROW_HEIGHT }}>
                      {/* Background grid cells */}
                      <div className="flex h-full">
                        {dates.map((date) => (
                          <div
                            key={`${room.id}-${format(date, "yyyy-MM-dd")}`}
                            className="border-r flex-shrink-0"
                            style={{ width: CELL_WIDTH }}
                            data-testid={`calendar-cell-${room.id}-${format(date, "yyyy-MM-dd")}`}
                          />
                        ))}
                      </div>

                      {/* Booking bars */}
                      <div className="absolute inset-0 pointer-events-none py-1.5">
                        {displayBookings.map(({ booking, allBookings, additionalBeds }) => {
                          const checkInDate = startOfDay(new Date(booking.checkInDate));
                          const checkOutDate = startOfDay(new Date(booking.checkOutDate));
                          const rangeStart = startOfDay(startDate);
                          const checkInDaysDiff = Math.floor((checkInDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                          const checkOutDaysDiff = Math.floor((checkOutDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                          if (checkOutDaysDiff <= 0 || checkInDaysDiff >= dates.length) return null;
                          const visibleStartIdx = Math.max(0, checkInDaysDiff);
                          const visibleEndIdx = Math.min(dates.length, checkOutDaysDiff + 1);
                          let leftPx = visibleStartIdx * CELL_WIDTH;
                          let widthPx = (visibleEndIdx - visibleStartIdx) * CELL_WIDTH;
                          if (checkInDaysDiff >= 0 && checkInDaysDiff < dates.length) { leftPx += CELL_WIDTH / 2; widthPx -= CELL_WIDTH / 2; }
                          if (checkOutDaysDiff > 0 && checkOutDaysDiff <= dates.length) { widthPx -= CELL_WIDTH / 2; }
                          if (widthPx <= 0) return null;
                          const guestName = guests.find(g => g.id === booking.guestId)?.fullName || "Guest";
                          const statusStyle = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                          const isPaid = booking.status === "checked-out" || booking.status === "confirmed";
                          const displayName = isDorm && additionalBeds > 0 ? `${guestName} +${additionalBeds}` : guestName;
                          const handleClick = () => {
                            setDormitoryPopup({ isOpen: true, room, bookings: isDorm ? allBookings : [booking], date: checkInDate });
                          };
                          return (
                            <div
                              key={`booking-${booking.id}`}
                              className="absolute pointer-events-auto cursor-pointer group"
                              style={{ left: `${leftPx}px`, width: `${widthPx}px`, top: '4px', bottom: '4px' }}
                              onClick={handleClick}
                              data-testid={`booking-bar-${booking.id}`}
                            >
                              <div
                                className={cn("w-full h-full rounded-md flex items-center justify-between px-2 text-xs font-semibold shadow-sm transition-all group-hover:shadow-md group-hover:scale-[1.02]", statusStyle.text)}
                                style={{ background: statusStyle.gradient }}
                                title={isDorm && additionalBeds > 0 ? `${guestName} +${additionalBeds} beds - Click for details` : `${guestName} - ${booking.status}`}
                              >
                                <span className="truncate">{displayName}</span>
                                <span className={cn("w-2 h-2 rounded-full flex-shrink-0 ml-1", isPaid ? "bg-green-600" : "bg-red-500")} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-create-booking">
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

      {/* Booking Details Popup */}
      <Dialog 
        open={dormitoryPopup.isOpen} 
        onOpenChange={(open) => setDormitoryPopup(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh]" data-testid="dialog-booking-details">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Room {dormitoryPopup.room?.roomNumber} - Booking Details
            </DialogTitle>
            <DialogDescription>
              {dormitoryPopup.room?.roomCategory === "dormitory" 
                ? `${dormitoryPopup.room?.totalBeds || 0} beds total | ${dormitoryPopup.bookings.length} booking(s)`
                : `${dormitoryPopup.room?.roomType || "Room"} | ${dormitoryPopup.bookings.length} booking(s)`
              }
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4">
              {dormitoryPopup.bookings.map((booking, index) => {
                const guest = guests.find(g => g.id === booking.guestId);
                const guestName = guest?.fullName || "Guest";
                const guestPhone = guest?.phone || "-";
                const bedsBooked = booking.bedsBooked || 1;
                const statusStyle = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                const isPaid = booking.status === "checked-out" || booking.status === "confirmed";
                
                const sourceLabels: Record<string, string> = {
                  direct: "Direct",
                  "walk-in": "Walk-in",
                  airbnb: "Airbnb",
                  booking: "Booking.com",
                  goibibo: "Goibibo",
                  makemytrip: "MakeMyTrip",
                  oyo: "OYO",
                  agoda: "Agoda",
                  other: "Other"
                };
                
                return (
                  <div 
                    key={booking.id} 
                    className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                    data-testid={`dormitory-booking-${booking.id}`}
                  >
                    {/* Header with guest name and status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-base">{guestName}</h4>
                        <p className="text-sm text-muted-foreground">{guestPhone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className="text-xs"
                          style={{ background: statusStyle.gradient, color: statusStyle.text }}
                        >
                          {booking.status}
                        </Badge>
                        {isPaid ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-xs">
                            Unpaid
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Booking details grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Booking ID:</span>
                        <span className="ml-2 font-medium">#{booking.id}</span>
                      </div>
                      {dormitoryPopup.room?.roomCategory === "dormitory" ? (
                        <div>
                          <span className="text-muted-foreground">Beds Booked:</span>
                          <span className="ml-2 font-medium">{bedsBooked}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-muted-foreground">Guests:</span>
                          <span className="ml-2 font-medium">{booking.numberOfGuests || 1}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Check-in:</span>
                        <span className="ml-2 font-medium">
                          {format(new Date(booking.checkInDate), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Check-out:</span>
                        <span className="ml-2 font-medium">
                          {format(new Date(booking.checkOutDate), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Source:</span>
                        <span className="ml-2 font-medium">
                          {sourceLabels[booking.source || "direct"] || booking.source}
                        </span>
                      </div>
                      {booking.mealPlan && (
                        <div>
                          <span className="text-muted-foreground">Meal Plan:</span>
                          <span className="ml-2 font-medium capitalize">{booking.mealPlan}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Payment details section */}
                    <div className="mt-3 pt-3 border-t border-dashed">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Payment Details</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Amount:</span>
                          <span className="ml-2 font-medium">
                            ₹{Number(booking.totalAmount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Advance:</span>
                          <span className="ml-2 font-medium">
                            ₹{Number(booking.advanceAmount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Balance:</span>
                          <span className="ml-2 font-medium">
                            ₹{(Number(booking.totalAmount || 0) - Number(booking.advanceAmount || 0)).toLocaleString()}
                          </span>
                        </div>
                        {booking.advancePaymentStatus && (
                          <div>
                            <span className="text-muted-foreground">Advance Status:</span>
                            <span className="ml-2 font-medium capitalize">{booking.advancePaymentStatus}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* View booking button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => {
                        setDormitoryPopup(prev => ({ ...prev, isOpen: false }));
                        navigate(`/bookings/${booking.id}`);
                      }}
                      data-testid={`button-view-booking-${booking.id}`}
                    >
                      View Full Details
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDormitoryPopup(prev => ({ ...prev, isOpen: false }))}
              data-testid="button-close-dormitory-popup"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
