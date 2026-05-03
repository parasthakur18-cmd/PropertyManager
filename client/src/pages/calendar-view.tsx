import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Hotel,
  ArrowRightLeft,
  CheckCircle2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
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
    bg: "bg-green-500", 
    text: "text-white",
    gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
  },
  pending: { 
    bg: "bg-blue-500", 
    text: "text-white",
    gradient: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)"
  },
  "checked-in": { 
    bg: "bg-teal-500", 
    text: "text-white",
    gradient: "linear-gradient(135deg, #2BB6A8 0%, #14b8a6 100%)"
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
  const { toast } = useToast();
  const isMobile = useIsMobile();
  // On mobile, shrink the room sidebar so the main calendar gets more space
  const sidebarWidth = isMobile ? 96 : SIDEBAR_WIDTH;
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

  // ── Change Room state ───────────────────────────────────────────────────────
  const [changeRoomBooking, setChangeRoomBooking] = useState<Booking | null>(null);
  const [changeRoomDialogOpen, setChangeRoomDialogOpen] = useState(false);
  const [changeRoomNewRoomId, setChangeRoomNewRoomId] = useState<string>("");
  const [changeRoomRecalculate, setChangeRoomRecalculate] = useState(true);
  const [otaPromptOpen, setOtaPromptOpen] = useState(false);
  const [pendingRoomChange, setPendingRoomChange] = useState<{ bookingId: number; newRoomId: number; recalculatePrice: boolean } | null>(null);

  const changeRoomMutation = useMutation({
    mutationFn: async ({ bookingId, newRoomId, openOldRoomOnOTA, recalculatePrice }: { bookingId: number; newRoomId: number; openOldRoomOnOTA: boolean; recalculatePrice: boolean }) =>
      apiRequest(`/api/bookings/${bookingId}/change-room`, "POST", { newRoomId, openOldRoomOnOTA, recalculatePrice }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setOtaPromptOpen(false);
      setPendingRoomChange(null);
      setChangeRoomBooking(null);
      setChangeRoomDialogOpen(false);
      setDormitoryPopup(prev => ({ ...prev, isOpen: false }));
      const priceNote = data?.newTotal ? ` Booking total updated to ₹${Number(data.newTotal).toLocaleString()}.` : "";
      toast({
        title: "Room Changed",
        description: `Booking moved to Room ${data?.newRoom?.roomNumber}.${priceNote} OTA inventory synced.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to change room", variant: "destructive" });
    },
  });

  // Compute available rooms for a booking's dates (client-side pre-filter; server validates too)
  const getAvailableRoomsForChange = (booking: Booking): Room[] => {
    const cin = format(new Date(booking.checkInDate), "yyyy-MM-dd");
    const cout = format(new Date(booking.checkOutDate), "yyyy-MM-dd");
    return rooms.filter(room => {
      if (room.id === booking.roomId) return false;
      if (room.propertyId !== booking.propertyId) return false;
      if (room.status === "out-of-service" || room.status === "maintenance") return false;
      const hasConflict = bookings.some(b => {
        if (b.id === booking.id) return false;
        if (b.status === "cancelled" || b.status === "checked-out" || b.status === "no_show") return false;
        if (b.roomId !== room.id) return false;
        const bc = format(new Date(b.checkInDate), "yyyy-MM-dd");
        const bo = format(new Date(b.checkOutDate), "yyyy-MM-dd");
        return bc < cout && bo > cin;
      });
      return !hasConflict;
    });
  };
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
      {/* Header — single compact row */}
      <div className="border-b bg-white dark:bg-card px-2 py-1.5 flex-shrink-0 flex items-center gap-2 min-w-0">
        {/* Sidebar toggle + title */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowRoomSidebar(!showRoomSidebar)}
          data-testid="button-toggle-room-sidebar"
          className="h-7 w-7 flex-shrink-0 hidden md:flex"
        >
          {showRoomSidebar ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
        </Button>
        <CalendarIcon className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="font-bold text-sm truncate flex-shrink-0 hidden sm:block">Room Calendar</span>

        {/* Date navigation */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setStartDate(addMonths(startDate, -1))} title="Previous Month" data-testid="button-prev-month">
            {format(addMonths(startDate, -1), "MMM")}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStartDate(addDays(startDate, -7))} data-testid="button-prev-week">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setStartDate(today)} data-testid="button-today">
            Today
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStartDate(addDays(startDate, 7))} data-testid="button-next-week">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setStartDate(addMonths(startDate, 1))} title="Next Month" data-testid="button-next-month">
            {format(addMonths(startDate, 1), "MMM")}
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs bg-slate-50 dark:bg-background border-slate-200"
            data-testid="input-search-calendar"
          />
        </div>

        {/* Property selector */}
        <Select value={String(selectedPropertyId)} onValueChange={(v) => setSelectedPropertyId(v === "all" ? "all" : parseInt(v))}>
          <SelectTrigger className="h-7 w-auto max-w-[160px] text-xs flex-shrink-0 bg-white dark:bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" data-testid="button-view-settings">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Unassigned OTA Bookings — compact single-line strip */}
      {unassignedBookings.length > 0 && (
        <div className="border-b bg-amber-50 dark:bg-amber-950/30 px-3 py-1 flex-shrink-0 flex items-center gap-2 min-w-0 overflow-x-auto">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex-shrink-0">
            {unassignedBookings.length} Unassigned:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {unassignedBookings.map(b => {
              const guest = guests.find(g => g.id === b.guestId);
              const guestName = guest?.fullName || "Unknown Guest";
              const source = b.source || b.externalSource || "OTA";
              const statusStyle = STATUS_COLORS[b.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
              return (
                <button
                  key={b.id}
                  className="flex items-center gap-1.5 bg-white dark:bg-card border border-amber-200 dark:border-amber-800 rounded px-2 py-0.5 text-xs hover:shadow-sm transition-shadow cursor-pointer flex-shrink-0"
                  onClick={() => navigate(`/bookings/${b.id}`)}
                  data-testid={`unassigned-booking-${b.id}`}
                >
                  <span className="font-semibold text-foreground">{guestName}</span>
                  <span className="text-muted-foreground">{format(new Date(b.checkInDate), "d MMM")}–{format(new Date(b.checkOutDate), "d MMM")}</span>
                  <span className={`rounded px-1 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>{b.status}</span>
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
        <div style={{ minWidth: `${(showRoomSidebar ? sidebarWidth : 0) + dates.length * CELL_WIDTH}px` }}>

          {/* ── Sticky date-header row ───────────────────────────────────── */}
          <div className="sticky top-0 z-30 flex bg-white dark:bg-card border-b">
            {/* Top-left corner: sticky on both axes */}
            {showRoomSidebar && (
              <div
                className="sticky left-0 z-40 bg-white dark:bg-card border-r flex items-center justify-between px-2 flex-shrink-0"
                style={{ width: sidebarWidth }}
              >
                <span className="font-semibold text-xs text-muted-foreground truncate">{isMobile ? "Rooms" : "All Rooms"}</span>
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
                    "border-r text-center flex-shrink-0 py-1",
                    isToday && "bg-amber-50 dark:bg-amber-950/30 ring-1 ring-inset ring-amber-300 dark:ring-amber-700",
                    showMonth && idx !== 0 && "border-l-2 border-l-slate-300 dark:border-l-slate-600"
                  )}
                  style={{ width: CELL_WIDTH }}
                >
                  {/* Day name + number on one line */}
                  <div className={cn("text-xs font-semibold leading-tight", isToday ? "text-amber-700 dark:text-amber-300" : "text-foreground")}>
                    {isToday ? `Today ${dayNum}` : `${dayName} ${dayNum}`}
                  </div>
                  {/* Month label — only when month changes */}
                  <div className={cn(
                    "text-xs leading-tight",
                    showMonth ? (isToday ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground") : "text-transparent select-none"
                  )}>{monthLabel}</div>
                  {/* Occupancy badge — color = demand intensity */}
                  <div className={cn(
                    "text-xs font-bold",
                    occupancy >= 80 ? "text-red-600 dark:text-red-400" :
                    occupancy >= 50 ? "text-amber-600 dark:text-amber-400" :
                    "text-green-600 dark:text-green-400"
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
                    style={{ width: sidebarWidth, height: TYPE_ROW_HEIGHT }}
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
                        style={{ width: sidebarWidth, height: ROW_HEIGHT }}
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
              {/* Type header / price row — hidden on mobile to maximise calendar visibility */}
              <div className={cn("border-b bg-slate-50 dark:bg-muted/10", isMobile ? "hidden" : "flex")}>
                {showRoomSidebar && (
                  <div
                    className="sticky left-0 z-10 bg-slate-50 dark:bg-muted/20 border-r flex items-center justify-between px-3 flex-shrink-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-muted/30 transition-colors"
                    style={{ width: sidebarWidth, height: TYPE_ROW_HEIGHT }}
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
                      <div className="text-[10px] text-muted-foreground leading-tight">{available} left</div>
                      <div className="text-xs font-bold text-primary leading-tight">{price}</div>
                    </div>
                  );
                })}
              </div>

              {/* Individual room rows — on mobile, type collapse is disabled so always show */}
              {(isMobile || expandedTypes[type]) && typeRooms.map(room => {
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
                        style={{ width: sidebarWidth, height: ROW_HEIGHT }}
                      >
                        <div
                          className="flex items-center gap-1.5 cursor-pointer min-w-0 flex-1"
                          onClick={() => navigate(`/rooms/${room.id}`)}
                          title={`Room ${room.roomNumber} · ${room.status || "available"}`}
                        >
                          {/* Status dot: occupied (today booking) / cleaning / available */}
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-white shadow-sm",
                              roomBookings.some(b => {
                                const cin = startOfDay(new Date(b.checkInDate));
                                const cout = startOfDay(new Date(b.checkOutDate));
                                return today >= cin && today < cout;
                              })
                                ? "bg-teal-500"
                                : room.status === "cleaning" || room.status === "maintenance"
                                ? "bg-amber-500"
                                : room.status === "blocked" || room.status === "out-of-service"
                                ? "bg-gray-400"
                                : "bg-green-500"
                            )}
                          />
                          <span className="font-medium text-sm truncate">{room.roomNumber}</span>
                          <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    )}

                    {/* Date cells + booking bars (self-contained relative context) */}
                    <div className="relative flex-shrink-0" style={{ width: dates.length * CELL_WIDTH, height: ROW_HEIGHT }}>
                      {/* Background grid cells — click empty cells to quick-create a booking */}
                      <div className="flex h-full">
                        {dates.map((date) => {
                          const dateStr = format(date, "yyyy-MM-dd");
                          const isOccupied = displayBookings.some(({ booking }) => {
                            const cin = startOfDay(new Date(booking.checkInDate));
                            const cout = startOfDay(new Date(booking.checkOutDate));
                            return date >= cin && date < cout;
                          });
                          const isTodayCell = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                          return (
                            <div
                              key={`${room.id}-${dateStr}`}
                              className={cn(
                                "border-r flex-shrink-0 transition-colors",
                                isTodayCell && "bg-amber-50/40 dark:bg-amber-950/10",
                                !isOccupied && "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 group/cell"
                              )}
                              style={{ width: CELL_WIDTH }}
                              onClick={() => {
                                if (isOccupied) return;
                                setCheckInDate(dateStr);
                                setCheckOutDate(format(addDays(date, 1), "yyyy-MM-dd"));
                                setSelectedRoomId(String(room.id));
                                setGuestName("");
                                setShowCreateBooking(true);
                              }}
                              title={!isOccupied ? `Book Room ${room.roomNumber} on ${format(date, "d MMM")}` : undefined}
                              data-testid={`calendar-cell-${room.id}-${dateStr}`}
                            >
                              {!isOccupied && (
                                <div className="h-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                  <Plus className="h-3.5 w-3.5 text-blue-400" />
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                          const baseStatusStyle = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                          // Override: bookings arriving TODAY (and not yet checked-in) → orange
                          const arrivingToday =
                            format(checkInDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") &&
                            booking.status !== "checked-in" &&
                            booking.status !== "checked-out" &&
                            booking.status !== "cancelled";
                          const statusStyle = arrivingToday
                            ? { bg: "bg-orange-500", text: "text-white", gradient: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)" }
                            : baseStatusStyle;
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
                                {!isPaid && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 ml-1 bg-red-500 ring-2 ring-white shadow-sm animate-pulse"
                                    title="Unpaid / overdue balance"
                                  />
                                )}
                                {isPaid && (
                                  <span className="w-2 h-2 rounded-full flex-shrink-0 ml-1 bg-white/90" title="Paid" />
                                )}
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

      {/* Mobile hint — visible only on small screens */}
      <div className="md:hidden border-t bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5 flex-shrink-0">
        <span>👉 Swipe horizontally to scroll the calendar</span>
      </div>

      {/* Legend */}
      <div className="border-t bg-white dark:bg-card p-2 flex gap-3 flex-wrap text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.confirmed.gradient }} />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.pending.gradient }} />
          <span>Upcoming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)" }} />
          <span>Arriving Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS["checked-in"].gradient }} />
          <span>In-house</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.blocked.gradient }} />
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2 border-l pl-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white shadow-sm" />
          <span>Unpaid</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2 border-l pl-3">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Cleaning</span>
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
                    
                    {/* Action buttons */}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setDormitoryPopup(prev => ({ ...prev, isOpen: false }));
                          navigate(`/bookings/${booking.id}`);
                        }}
                        data-testid={`button-view-booking-${booking.id}`}
                      >
                        View Full Details
                      </Button>
                      {booking.status !== "checked-out" && booking.status !== "cancelled" && (
                        <Button
                          size="sm"
                          className="flex-1 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                          onClick={() => {
                            setChangeRoomBooking(booking);
                            setChangeRoomNewRoomId("");
                            setChangeRoomDialogOpen(true);
                          }}
                          data-testid={`button-change-room-${booking.id}`}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                          Change Room
                        </Button>
                      )}
                    </div>
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

      {/* ── Change Room: Room Picker Dialog ──────────────────────────────── */}
      <Dialog open={changeRoomDialogOpen} onOpenChange={(open) => { if (!open) { setChangeRoomDialogOpen(false); setChangeRoomBooking(null); setChangeRoomNewRoomId(""); } }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-change-room">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-[#1E3A5F]" />
              Change Room Assignment
            </DialogTitle>
            <DialogDescription>
              {changeRoomBooking && (() => {
                const guest = guests.find(g => g.id === changeRoomBooking.guestId);
                const currentRoom = rooms.find(r => r.id === changeRoomBooking.roomId);
                return `Moving ${guest?.fullName || "Guest"} from Room ${currentRoom?.roomNumber || "—"} · ${format(new Date(changeRoomBooking.checkInDate), "d MMM")} – ${format(new Date(changeRoomBooking.checkOutDate), "d MMM yyyy")}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Select New Room</Label>
              {changeRoomBooking && (() => {
                const available = getAvailableRoomsForChange(changeRoomBooking);
                if (available.length === 0) {
                  return (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                      No available rooms found for these dates in this property.
                    </div>
                  );
                }
                const byType: Record<string, Room[]> = {};
                available.forEach(r => { const t = r.roomType || "Other"; if (!byType[t]) byType[t] = []; byType[t].push(r); });
                return (
                  <Select value={changeRoomNewRoomId} onValueChange={setChangeRoomNewRoomId}>
                    <SelectTrigger data-testid="select-new-room">
                      <SelectValue placeholder="Choose an available room…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(byType).map(([type, typeRooms]) => (
                        <div key={type}>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{type}</div>
                          {typeRooms.map(r => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              Room {r.roomNumber} — ₹{Number(r.pricePerNight).toLocaleString()}/night
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>

            {changeRoomNewRoomId && changeRoomBooking && (() => {
              const newRoom = rooms.find(r => r.id === parseInt(changeRoomNewRoomId));
              const oldRoom = rooms.find(r => r.id === changeRoomBooking.roomId);
              const nights = Math.max(1, Math.round(
                (new Date(changeRoomBooking.checkOutDate).getTime() - new Date(changeRoomBooking.checkInDate).getTime())
                / (1000 * 60 * 60 * 24)
              ));
              const oldTotal = Number(changeRoomBooking.totalAmount || 0);
              const newTotal = Number(newRoom?.pricePerNight || 0) * nights;
              const diff = newTotal - oldTotal;
              return (
                <div className="space-y-3">
                  {/* Room swap preview */}
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Room {oldRoom?.roomNumber || "—"}</span>
                      <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-[#2BB6A8]">Room {newRoom?.roomNumber}</span>
                      <span className="text-xs text-muted-foreground ml-1">({newRoom?.roomType})</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {nights} night{nights !== 1 ? "s" : ""} · ₹{Number(newRoom?.pricePerNight || 0).toLocaleString()}/night
                    </p>
                  </div>

                  {/* Price comparison */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm space-y-2">
                    <p className="font-medium text-amber-900 dark:text-amber-200 text-xs uppercase tracking-wide">Billing Impact</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current booking total</span>
                      <span className="font-medium">₹{oldTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">New room rate ({nights}n × ₹{Number(newRoom?.pricePerNight || 0).toLocaleString()})</span>
                      <span className="font-medium text-[#1E3A5F]">₹{newTotal.toLocaleString()}</span>
                    </div>
                    {diff !== 0 && (
                      <div className="flex justify-between border-t pt-1.5 mt-1">
                        <span className="text-muted-foreground">Difference</span>
                        <span className={`font-semibold ${diff > 0 ? "text-orange-600" : "text-green-600"}`}>
                          {diff > 0 ? "+" : ""}₹{Math.abs(diff).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Recalculate toggle */}
                  <label className="flex items-start gap-3 cursor-pointer group" data-testid="label-recalculate-price">
                    <div
                      className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${changeRoomRecalculate ? "bg-[#1E3A5F] border-[#1E3A5F]" : "border-muted-foreground"}`}
                      onClick={() => setChangeRoomRecalculate(v => !v)}
                      data-testid="checkbox-recalculate"
                    >
                      {changeRoomRecalculate && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <div onClick={() => setChangeRoomRecalculate(v => !v)}>
                      <p className="text-sm font-medium leading-tight">Update booking total to new room rate</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {changeRoomRecalculate
                          ? `Total will be updated to ₹${newTotal.toLocaleString()}`
                          : `Total stays at ₹${oldTotal.toLocaleString()} (you can adjust manually later)`}
                      </p>
                    </div>
                  </label>
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setChangeRoomDialogOpen(false); setChangeRoomBooking(null); setChangeRoomNewRoomId(""); }} data-testid="button-cancel-change-room">
              Cancel
            </Button>
            <Button
              disabled={!changeRoomNewRoomId || changeRoomMutation.isPending}
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
              onClick={() => {
                if (!changeRoomBooking || !changeRoomNewRoomId) return;
                setPendingRoomChange({ bookingId: changeRoomBooking.id, newRoomId: parseInt(changeRoomNewRoomId), recalculatePrice: changeRoomRecalculate });
                setChangeRoomDialogOpen(false);
                setOtaPromptOpen(true);
              }}
              data-testid="button-confirm-change-room"
            >
              {changeRoomMutation.isPending ? "Moving…" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Room: OTA Prompt AlertDialog ──────────────────────────── */}
      <AlertDialog open={otaPromptOpen} onOpenChange={setOtaPromptOpen}>
        <AlertDialogContent data-testid="dialog-ota-prompt">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#2BB6A8]" />
              Open Previous Room on OTAs?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                The room has been reassigned. Would you like to <strong>open the previous room for sale</strong> on connected OTAs (e.g. Booking.com)?
              </span>
              <span className="block text-xs text-muted-foreground">
                Select <em>Yes, Open for Sale</em> to make it available again, or <em>Keep Blocked</em> to leave it closed — useful when the room needs maintenance or inspection.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (pendingRoomChange) {
                  changeRoomMutation.mutate({ ...pendingRoomChange, openOldRoomOnOTA: false });
                }
              }}
              data-testid="button-keep-blocked"
            >
              Keep Blocked
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#2BB6A8] hover:bg-[#229e91] text-white"
              onClick={() => {
                if (pendingRoomChange) {
                  changeRoomMutation.mutate({ ...pendingRoomChange, openOldRoomOnOTA: true });
                }
              }}
              data-testid="button-open-ota"
            >
              Yes, Open for Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
