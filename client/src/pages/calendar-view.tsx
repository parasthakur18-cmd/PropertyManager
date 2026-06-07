import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NewBookingDialog } from "@/components/NewBookingDialog";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
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
  BedDouble,
  Clock,
  Wifi,
  WifiOff,
  Sparkles,
  BarChart3,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { format, addDays, startOfDay, eachDayOfInterval, addMonths, parseISO } from "date-fns";
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
  no_show: {
    bg: "bg-slate-400",
    text: "text-white",
    gradient: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
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
  const [viewMode, setViewMode] = useState<"calendar" | "availability">("calendar");
  const [availStartStr, setAvailStartStr] = useState<string>(format(today, "yyyy-MM-dd"));
  const [availDays, setAvailDays] = useState<number>(30);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | "all">(() => {
    const saved = localStorage.getItem('selectedPropertyId');
    return saved ? parseInt(saved) : "all";
  });

  // Global property filter — used to auto-sync the availability grid to the
  // currently selected property so it doesn't bleed in rooms from other properties.
  const { selectedPropertyId: globalPropertyId } = usePropertyFilter();

  // When switching to Availability view: if local selector is "all" but the
  // global filter has a specific property selected, snap to it automatically.
  // This prevents rooms from other properties (e.g. Duplex from property 1)
  // appearing in the availability grid when comparing against a single property
  // in AioSell.
  useEffect(() => {
    if (viewMode === "availability" && selectedPropertyId === "all" && globalPropertyId != null) {
      setSelectedPropertyId(globalPropertyId);
    }
  }, [viewMode, globalPropertyId]);

  // Sync property selection to localStorage
  useEffect(() => {
    if (selectedPropertyId !== "all") {
      localStorage.setItem('selectedPropertyId', selectedPropertyId.toString());
    }
  }, [selectedPropertyId]);
  const [showRoomSidebar, setShowRoomSidebar] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [expandedDorms, setExpandedDorms] = useState<Record<number, boolean>>({});
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [newBookingDefaults, setNewBookingDefaults] = useState<{ checkIn?: string; checkOut?: string; roomId?: number }>({});
  const [activeRoomMenu, setActiveRoomMenu] = useState<number | null>(null);
  const [dormitoryPopup, setDormitoryPopup] = useState<{
    isOpen: boolean;
    room: Room | null;
    bookings: Booking[];
    date: Date | null;
  }>({ isOpen: false, room: null, bookings: [], date: null });
  const [dormBedFilter, setDormBedFilter] = useState<"all" | "vacant" | "arrivals" | "checkout">("all");

  // ── Change Room state ───────────────────────────────────────────────────────
  const [changeRoomBooking, setChangeRoomBooking] = useState<Booking | null>(null);
  const [changeRoomFromRoomId, setChangeRoomFromRoomId] = useState<number | null>(null);
  const [changeRoomDialogOpen, setChangeRoomDialogOpen] = useState(false);
  const [changeRoomNewRoomId, setChangeRoomNewRoomId] = useState<string>("");
  const [changeRoomRecalculate, setChangeRoomRecalculate] = useState(true);
  const [otaPromptOpen, setOtaPromptOpen] = useState(false);
  const [pendingRoomChange, setPendingRoomChange] = useState<{ bookingId: number; newRoomId: number; fromRoomId?: number; recalculatePrice: boolean } | null>(null);

  const changeRoomMutation = useMutation({
    mutationFn: async ({ bookingId, newRoomId, openOldRoomOnOTA, recalculatePrice, fromRoomId }: { bookingId: number; newRoomId: number; openOldRoomOnOTA: boolean; recalculatePrice: boolean; fromRoomId?: number }) =>
      apiRequest(`/api/bookings/${bookingId}/change-room`, "POST", { newRoomId, openOldRoomOnOTA, recalculatePrice, fromRoomId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setOtaPromptOpen(false);
      setPendingRoomChange(null);
      setChangeRoomBooking(null);
      setChangeRoomFromRoomId(null);
      setChangeRoomDialogOpen(false);
      setDormitoryPopup(prev => ({ ...prev, isOpen: false }));
      const priceNote = data?.newTotal ? ` Total updated to ₹${Number(data.newTotal).toLocaleString()}.` : "";
      const waNote = data?.whatsappSent ? " WhatsApp sent to guest with new room link." : "";
      const ordersNote = data?.ordersMigrated > 0 ? ` ${data.ordersMigrated} order(s) transferred.` : "";
      toast({
        title: "Room Changed",
        description: `Booking moved to Room ${data?.newRoom?.roomNumber}.${priceNote}${ordersNote}${waNote} OTA inventory synced.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to change room", variant: "destructive" });
    },
  });

  // ── Inline bedsBooked edit for dorm popup ────────────────────────────────
  const updateBedsMutation = useMutation({
    mutationFn: async ({ bookingId, bedsBooked }: { bookingId: number; bedsBooked: number }) =>
      apiRequest(`/api/bookings/${bookingId}`, "PATCH", { bedsBooked }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      // Update the popup bookings in-place so the bed layout re-renders immediately
      setDormitoryPopup(prev => ({
        ...prev,
        bookings: prev.bookings.map(b =>
          b.id === vars.bookingId ? { ...b, bedsBooked: vars.bedsBooked } : b
        ),
      }));
      toast({ title: "Beds updated", description: `Beds booked set to ${vars.bedsBooked}` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update beds", variant: "destructive" });
    },
  });

  // Compute available rooms for a booking's dates (client-side pre-filter; server validates too)
  const getAvailableRoomsForChange = (booking: Booking): Room[] => {
    const cin = format(new Date(booking.checkInDate), "yyyy-MM-dd");
    const cout = format(new Date(booking.checkOutDate), "yyyy-MM-dd");
    // The specific room slot being swapped out — exclude it from results
    const excludeRoomId = changeRoomFromRoomId ?? booking.roomId;
    return rooms.filter(room => {
      if (room.id === excludeRoomId) return false;
      if (room.propertyId !== booking.propertyId) return false;
      if (room.status === "out-of-service" || room.status === "maintenance") return false;
      const hasConflict = bookings.some(b => {
        if (b.status === "cancelled" || b.status === "checked-out" || b.status === "no_show") return false;
        // For the same booking being moved: rooms OTHER than the one being swapped are still occupied
        if (b.id === booking.id) {
          if (room.id === excludeRoomId) return false; // already filtered above
          // Only block if this room is explicitly listed in booking.roomIds (confirmed multi-room)
          // Do NOT use booking.roomId here — it can be a stale primary-key value
          const otherRooms = (b.roomIds || []).filter((id): id is number => id != null && id !== excludeRoomId);
          return otherRooms.includes(room.id);
        }
        // For other bookings: multi-room bookings use ONLY roomIds (roomId can be stale).
        // Single-room bookings (no roomIds) fall back to roomId.
        const bRoomIds = (b.roomIds && b.roomIds.length > 0)
          ? b.roomIds.filter((id): id is number => id != null)
          : [b.roomId].filter((id): id is number => id != null);
        if (!bRoomIds.includes(room.id)) return false;
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

  // ── Dorm bed layout: derive bed-to-guest mapping for the popup ────────────
  // ── Stay-Status Engine ────────────────────────────────────────────────────
  const STANDARD_CHECKOUT_HOUR = 11; // 11:00 AM standard checkout time

  const getDormStayStatus = useCallback((booking: any): "lateCheckout" | "cleaning" | "checkoutToday" | "inHouse" | "arrivingToday" | "upcoming" | "completed" => {
    if (booking.status === "cancelled") return "completed";
    const refDate  = dormitoryPopup.date ? startOfDay(new Date(dormitoryPopup.date)) : startOfDay(new Date());
    const checkIn  = startOfDay(new Date(booking.checkInDate));
    const checkOut = startOfDay(new Date(booking.checkOutDate));

    // Cleaning: checked-out today and the room itself is in "Cleaning" status
    if (booking.status === "checked-out" && checkOut.getTime() === refDate.getTime()
        && dormitoryPopup.room?.status === "Cleaning") return "cleaning";
    if (booking.status === "checked-out") return "completed";

    // Late Checkout: checkout is today, past 11 AM, not yet checked out
    if (checkOut.getTime() === refDate.getTime()) {
      const nowHour = new Date().getHours();
      if (nowHour >= STANDARD_CHECKOUT_HOUR) return "lateCheckout";
      return "checkoutToday";
    }
    if (checkIn.getTime() === refDate.getTime() && booking.status !== "checked-in") return "arrivingToday";
    if (checkIn <= refDate && refDate < checkOut) return "inHouse";
    if (checkIn > refDate) return "upcoming";
    return "completed";
  }, [dormitoryPopup.date, dormitoryPopup.room?.status]);

  const STAY_STATUS_CONFIG = {
    lateCheckout:   { label: "Late Checkout",  color: "orange",  priority: 0 },
    checkoutToday:  { label: "Checkout Today", color: "red",     priority: 1 },
    inHouse:        { label: "In House",       color: "green",   priority: 2 },
    arrivingToday:  { label: "Arriving Today", color: "yellow",  priority: 3 },
    upcoming:       { label: "Upcoming",       color: "blue",    priority: 4 },
    cleaning:       { label: "Cleaning",       color: "purple",  priority: 5 },
    completed:      { label: "Completed",      color: "gray",    priority: 6 },
  } as const;

  const dormBedAssignments = useMemo(() => {
    if (!dormitoryPopup.room || dormitoryPopup.room.roomCategory !== "dormitory") return [];
    const totalBeds = dormitoryPopup.room.totalBeds || 0;
    if (totalBeds === 0) return [];
    type DormBed = { bedNumber: number; guestName: string; stayStatus: keyof typeof STAY_STATUS_CONFIG; booking: any | null };
    const result: DormBed[] = [];
    let bedCursor = 1;

    const refDate = dormitoryPopup.date ? startOfDay(new Date(dormitoryPopup.date)) : startOfDay(new Date());

    // Include active bookings AND checked-out-today (for cleaning state display)
    const activeBookings = dormitoryPopup.bookings
      .filter(b => {
        if (b.status === "cancelled") return false;
        const checkIn  = startOfDay(new Date(b.checkInDate));
        const checkOut = startOfDay(new Date(b.checkOutDate));
        if (b.status === "checked-out") {
          // Only keep if checkout was today and room is in Cleaning state
          return checkOut.getTime() === refDate.getTime() && dormitoryPopup.room?.status === "Cleaning";
        }
        return checkIn <= refDate && refDate <= checkOut;
      })
      .sort((a, b) => {
        const pa = STAY_STATUS_CONFIG[getDormStayStatus(a)].priority;
        const pb = STAY_STATUS_CONFIG[getDormStayStatus(b)].priority;
        return pa - pb;
      });

    for (const booking of activeBookings) {
      const guest = (guests as any[]).find((g: any) => g.id === booking.guestId);
      const guestName = guest?.fullName || "Guest";
      const bedsBooked = (booking as any).bedsBooked || booking.numberOfGuests || 1;
      const stayStatus = getDormStayStatus(booking);
      for (let i = 0; i < bedsBooked && bedCursor <= totalBeds; i++) {
        result.push({ bedNumber: bedCursor++, guestName, stayStatus, booking });
      }
    }
    while (bedCursor <= totalBeds) {
      result.push({ bedNumber: bedCursor++, guestName: "", stayStatus: "completed", booking: null });
    }
    return result;
  }, [dormitoryPopup, guests, getDormStayStatus]);



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

  // ── Availability Grid Data ─────────────────────────────────────────────────
  const availabilityGridData = useMemo(() => {
    const BLOCKING = ["maintenance", "out-of-order", "blocked"];
    const availStart = parseISO(availStartStr);
    const availEnd = addDays(availStart, availDays - 1);
    const gridDates = eachDayOfInterval({ start: availStart, end: availEnd });

    // Use rooms filtered by selected property
    const propRooms = rooms.filter(r =>
      selectedPropertyId === "all" || r.propertyId === selectedPropertyId
    );

    // Group rooms by type
    const byType: Record<string, Room[]> = {};
    propRooms.forEach(r => {
      const t = r.roomType || "Other";
      if (!byType[t]) byType[t] = [];
      byType[t].push(r);
    });

    const typeRows = Object.entries(byType).map(([type, typeRooms]) => {
      const days = gridDates.map(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        const total = typeRooms.length;
        const available = typeRooms.filter(room => {
          if (BLOCKING.includes(room.status ?? "")) return false;
          const occupied = bookings.some(b => {
            if (["cancelled", "no_show", "checked-out"].includes(b.status)) return false;
            const roomMatches = (b.roomIds && b.roomIds.length > 0)
              ? b.roomIds.includes(room.id)
              : b.roomId === room.id;
            if (!roomMatches) return false;
            const cin = String(b.checkInDate).slice(0, 10);
            const cout = String(b.checkOutDate).slice(0, 10);
            return cin <= dateStr && cout > dateStr;
          });
          return !occupied;
        }).length;
        return { available, total, occupancy: total > 0 ? Math.round(((total - available) / total) * 100) : 0 };
      });
      return { type, total: typeRooms.length, days };
    });

    // Total row
    const totalDays = gridDates.map((_, i) => ({
      available: typeRows.reduce((sum, r) => sum + r.days[i].available, 0),
      total: typeRows.reduce((sum, r) => sum + r.days[i].total, 0),
      occupancy: 0,
    })).map(d => ({ ...d, occupancy: d.total > 0 ? Math.round(((d.total - d.available) / d.total) * 100) : 0 }));

    return { dates: gridDates, typeRows, totalDays };
  }, [rooms, bookings, availStartStr, availDays, selectedPropertyId]);

  // Bookings with no room assigned (e.g. OTA bookings where room mapping wasn't found)
  // that overlap the currently visible date range
  const unassignedBookings = useMemo(() => {
    const rangeStart = format(startDate, "yyyy-MM-dd");
    const rangeEnd = format(addDays(startDate, 11), "yyyy-MM-dd");
    return bookings.filter(b => {
      if (b.status === "cancelled" || b.status === "no_show") return false;
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
    // Property guard: look up the room's propertyId so we never bleed bookings
    // from a different property into this calendar row, even if roomIds coincide.
    const roomPropertyId = rooms.find(r => r.id === roomId)?.propertyId;
    return bookings.find(b => {
      // Skip if booking belongs to a different property than the room
      if (roomPropertyId != null && b.propertyId !== roomPropertyId) return false;
      // For group bookings that have a roomIds array, ONLY use that array for room matching.
      // Never fall back to booking.roomId for group bookings — roomId on a group booking is
      // the "primary" room and can diverge from roomIds after a room-change operation,
      // causing phantom bars in rooms the guest does not actually occupy.
      const roomMatches = (b.isGroupBooking && b.roomIds && b.roomIds.length > 0)
        ? b.roomIds.includes(roomId)
        : b.roomId === roomId || (b.roomIds && b.roomIds.includes(roomId));
      if (!roomMatches) return false;
      
      // Hide cancelled and no-show bookings; checked-out bookings remain visible in gray
      if (b.status === "cancelled" || b.status === "no_show") return false;
      
      // Check date range
      return format(new Date(b.checkInDate), "yyyy-MM-dd") <= dateStr &&
        format(new Date(b.checkOutDate), "yyyy-MM-dd") > dateStr;
    });
  };

  const getBookingsForRoom = (roomId: number) => {
    const bookingSet = new Map<number, Booking>();
    // Property guard — same rule as getBookingForDate
    const roomPropertyId = rooms.find(r => r.id === roomId)?.propertyId;
    dates.forEach(date => {
      const booking = getBookingForDate(roomId, date);
      if (booking) {
        bookingSet.set(booking.id, booking);
      }
    });
    
    // Also include group bookings that contain this room (exclude cancelled and no-show)
    bookings.forEach(booking => {
      if (booking.status === "cancelled" || booking.status === "no_show") return;
      // Skip bookings from a different property
      if (roomPropertyId != null && booking.propertyId !== roomPropertyId) return;
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
    const roomPropertyId = rooms.find(r => r.id === roomId)?.propertyId;
    return bookings.filter(b => {
      // Property guard: skip bookings from a different property
      if (roomPropertyId != null && b.propertyId !== roomPropertyId) return false;
      const roomMatches = (b.isGroupBooking && b.roomIds && b.roomIds.length > 0)
        ? b.roomIds.includes(roomId)
        : b.roomId === roomId || (b.roomIds && b.roomIds.includes(roomId));
      if (!roomMatches) return false;
      if (b.status === "cancelled" || b.status === "no_show") return false;
      
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

  // Get total beds booked for a dormitory room in a date range.
  // Checks BOTH roomId (single-room) and roomIds array (multi-room / OTA bookings)
  // to avoid showing wrong "X free" count when a booking has a stale primary roomId.
  const getBedsBookedForDateRange = (roomId: number, startDate: Date, endDate: Date): number => {
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");
    
    return bookings
      .filter(b => {
        // Multi-room-aware room match: use roomIds if populated, else fall back to roomId
        const roomMatches = (b.roomIds && b.roomIds.length > 0)
          ? b.roomIds.includes(roomId)
          : b.roomId === roomId;
        if (!roomMatches) return false;
        
        const bookingStart = format(new Date(b.checkInDate), "yyyy-MM-dd");
        const bookingEnd = format(new Date(b.checkOutDate), "yyyy-MM-dd");
        
        // Check if booking overlaps with the date range
        return bookingStart < endStr && bookingEnd > startStr && b.status !== "cancelled" && b.status !== "checked-out" && b.status !== "no_show";
      })
      .reduce((total, b) => total + (b.bedsBooked || b.numberOfGuests || 1), 0);
  };

  const getOccupancyPercent = (date: Date) => {
    // Count beds for dorm rooms, 1 unit for regular rooms — matches AioSell's inventory logic
    let totalCapacity = 0;
    let occupiedCapacity = 0;
    const nextDay = addDays(date, 1);

    for (const room of filteredRooms) {
      if (isDormitoryRoom(room)) {
        const beds = room.totalBeds || 1;
        const booked = getBedsBookedForDateRange(room.id, date, nextDay);
        totalCapacity += beds;
        occupiedCapacity += Math.min(booked, beds);
      } else {
        totalCapacity += 1;
        if (getBookingForDate(room.id, date)) occupiedCapacity += 1;
      }
    }

    if (totalCapacity === 0) return 0;
    return Math.round((occupiedCapacity / totalCapacity) * 100);
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

  const toggleDorm = (roomId: number) => {
    setExpandedDorms(prev => ({ ...prev, [roomId]: !prev[roomId] }));
  };

  // Greedy interval scheduling: assign each booking to the earliest available consecutive bed slots.
  // Returns an array of length totalBeds where each entry is the list of bookings occupying that slot.
  const assignDormBeds = (room: Room, roomBookings: Booking[]): { booking: Booking; cin: Date; cout: Date }[][] => {
    const totalBeds = room.totalBeds || 0;
    if (totalBeds === 0) return [];
    const bedSlots: { booking: Booking; cin: Date; cout: Date }[][] = Array.from({ length: totalBeds }, () => []);
    const sorted = [...roomBookings]
      .filter(b => b.status !== "cancelled" && b.status !== "no_show")
      .sort((a, b) => {
        const diff = new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime();
        return diff !== 0 ? diff : a.id - b.id;
      });
    for (const booking of sorted) {
      const bedsNeeded = booking.bedsBooked || (booking as any).numberOfGuests || 1;
      const cin = startOfDay(new Date(booking.checkInDate));
      const cout = startOfDay(new Date(booking.checkOutDate));
      let assigned = false;
      for (let startSlot = 0; startSlot <= totalBeds - bedsNeeded && !assigned; startSlot++) {
        let allAvail = true;
        for (let slot = startSlot; slot < startSlot + bedsNeeded; slot++) {
          if (bedSlots[slot].some(e => e.cin < cout && e.cout > cin)) { allAvail = false; break; }
        }
        if (allAvail) {
          for (let slot = startSlot; slot < startSlot + bedsNeeded; slot++) {
            bedSlots[slot].push({ booking, cin, cout });
          }
          assigned = true;
        }
      }
    }
    return bedSlots;
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

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-muted rounded-md p-0.5 flex-shrink-0">
          <Button
            size="sm"
            variant={viewMode === "calendar" ? "secondary" : "ghost"}
            className="h-6 px-2 text-xs rounded-sm"
            onClick={() => setViewMode("calendar")}
            data-testid="button-view-calendar"
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Calendar</span>
          </Button>
          <Button
            size="sm"
            variant={viewMode === "availability" ? "secondary" : "ghost"}
            className="h-6 px-2 text-xs rounded-sm"
            onClick={() => setViewMode("availability")}
            data-testid="button-view-availability"
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Availability</span>
          </Button>
        </div>

        {/* Date navigation — only shown in calendar mode */}
        {viewMode === "calendar" && (
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
        )}

        {/* Search — only in calendar mode */}
        {viewMode === "calendar" && (
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
        )}

        {viewMode === "availability" && <div className="flex-1" />}

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

        {viewMode === "calendar" && (
          <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" data-testid="button-view-settings">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* ── Availability Grid View ───────────────────────────────────────── */}
      {viewMode === "availability" && (
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-background">
          {/* Filter bar */}
          <div className="border-b bg-white dark:bg-card px-4 py-2 flex flex-wrap items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">From</label>
              <input
                type="date"
                value={availStartStr}
                onChange={e => setAvailStartStr(e.target.value)}
                className="h-7 text-xs border rounded px-2 bg-white dark:bg-card dark:border-slate-600"
                data-testid="input-avail-start"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Days</label>
              <select
                value={availDays}
                onChange={e => setAvailDays(Number(e.target.value))}
                className="h-7 text-xs border rounded px-2 bg-white dark:bg-card dark:border-slate-600"
                data-testid="select-avail-days"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => { setAvailStartStr(format(today, "yyyy-MM-dd")); setAvailDays(30); }}
              data-testid="button-avail-reset"
            >
              Today · 30d
            </Button>
            <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300" /> Available</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-300" /> Partial</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300" /> Full</span>
            </div>
          </div>

          {/* Grid table */}
          <div className="overflow-x-auto">
            <table className="text-xs border-separate border-spacing-0 w-full min-w-max">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-white dark:bg-card border-b border-r px-3 py-2 text-left font-semibold text-sm text-foreground min-w-[160px]">
                    Room Type
                  </th>
                  <th className="sticky left-[160px] z-20 bg-white dark:bg-card border-b border-r px-2 py-2 text-center font-semibold text-muted-foreground whitespace-nowrap">
                    Total
                  </th>
                  {availabilityGridData.dates.map((date, i) => {
                    const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                    const showMonth = i === 0 || format(date, "d") === "1";
                    return (
                      <th
                        key={format(date, "yyyy-MM-dd")}
                        className={cn(
                          "border-b border-r px-1 py-1 text-center font-medium whitespace-nowrap",
                          isToday ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300" : "text-foreground",
                          showMonth && i !== 0 ? "border-l-2 border-l-slate-300 dark:border-l-slate-600" : ""
                        )}
                        style={{ minWidth: "52px" }}
                      >
                        <div className="font-semibold leading-tight">{format(date, "d")}</div>
                        <div className={cn("text-[10px]", isToday ? "text-amber-600" : "text-muted-foreground")}>{format(date, "EEE")}</div>
                        {showMonth && <div className="text-[10px] text-primary font-bold">{format(date, "MMM")}</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Total available row */}
                <tr className="bg-slate-50 dark:bg-muted/20">
                  <td className="sticky left-0 z-10 bg-slate-50 dark:bg-muted/20 border-b border-r px-3 py-2 font-bold text-foreground">
                    All Rooms
                  </td>
                  <td className="sticky left-[160px] z-10 bg-slate-50 dark:bg-muted/20 border-b border-r px-2 py-2 text-center font-bold text-foreground">
                    {availabilityGridData.typeRows.reduce((s, r) => s + r.total, 0)}
                  </td>
                  {availabilityGridData.totalDays.map((day, i) => {
                    const date = availabilityGridData.dates[i];
                    const occ = day.occupancy;
                    const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                    return (
                      <td key={i} className={cn(
                        "border-b border-r px-1 py-2 text-center font-bold",
                        isToday && "ring-1 ring-inset ring-amber-300 dark:ring-amber-700"
                      )}>
                        <div className={cn(
                          "text-sm font-bold",
                          occ >= 80 ? "text-red-600 dark:text-red-400" :
                          occ >= 50 ? "text-amber-600 dark:text-amber-400" :
                          "text-green-700 dark:text-green-400"
                        )}>
                          {day.available}
                        </div>
                        <div className="text-[9px] text-muted-foreground">{occ}% full</div>
                      </td>
                    );
                  })}
                </tr>

                {/* Per-room-type rows */}
                {availabilityGridData.typeRows.map(({ type, total, days }) => (
                  <tr key={type} className="hover:bg-slate-50/80 dark:hover:bg-muted/10 transition-colors">
                    <td className="sticky left-0 z-10 bg-white dark:bg-card border-b border-r px-3 py-2 font-medium text-foreground max-w-[160px]">
                      <div className="truncate" title={type}>{type}</div>
                    </td>
                    <td className="sticky left-[160px] z-10 bg-white dark:bg-card border-b border-r px-2 py-2 text-center text-muted-foreground font-medium">
                      {total}
                    </td>
                    {days.map((day, i) => {
                      const date = availabilityGridData.dates[i];
                      const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
                      const occ = day.occupancy;
                      const cellBg =
                        occ >= 80 ? "bg-red-50 dark:bg-red-950/20" :
                        occ >= 40 ? "bg-amber-50 dark:bg-amber-950/20" :
                        "bg-green-50 dark:bg-green-950/20";
                      return (
                        <td
                          key={i}
                          className={cn(
                            "border-b border-r px-1 py-1.5 text-center",
                            cellBg,
                            isToday && "ring-1 ring-inset ring-amber-300 dark:ring-amber-600"
                          )}
                        >
                          <div className={cn(
                            "font-bold text-sm",
                            day.available === 0 ? "text-red-600 dark:text-red-400" :
                            day.available < total * 0.4 ? "text-amber-600 dark:text-amber-400" :
                            "text-green-700 dark:text-green-400"
                          )}>
                            {day.available}
                          </div>
                          <div className="text-[9px] text-muted-foreground">/{total}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {availabilityGridData.typeRows.length === 0 && (
                  <tr>
                    <td colSpan={availabilityGridData.dates.length + 2} className="text-center py-12 text-muted-foreground">
                      No rooms found for the selected property.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unassigned OTA Bookings — compact single-line strip */}
      {viewMode === "calendar" && unassignedBookings.length > 0 && (
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
      {viewMode === "calendar" && <><div
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
                  onClick={() => { setNewBookingDefaults({}); setShowCreateBooking(true); }}
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
                    const otherBeds = overlapping.filter(b => b.id !== booking.id).reduce((sum, b) => sum + (b.bedsBooked || b.numberOfGuests || 1), 0);
                    const thisBookingExtraBeds = Math.max(0, (booking.bedsBooked || booking.numberOfGuests || 1) - 1);
                    return { booking, allBookings: overlapping, additionalBeds: otherBeds + thisBookingExtraBeds };
                  });
                };

                const displayBookings = getDormitoryDisplayBookings();

                const bedsOccupiedToday = isDorm
                  ? Math.min(getAllDormitoryBookingsForDate(room.id, today).reduce((s, b) => s + (b.bedsBooked || b.numberOfGuests || 1), 0), room.totalBeds || 0)
                  : 0;
                const isDormExpanded = isDorm && !!expandedDorms[room.id];

                return (
                  <div key={room.id}>
                  <div className="flex border-b bg-white dark:bg-card" data-testid={`room-row-${room.id}`}>
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
                                if (b.status === "no_show" || b.status === "cancelled") return false;
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
                        {isDorm && (
                          <button
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-muted/30 transition-colors flex-shrink-0 ml-1 font-mono"
                            onClick={(e) => { e.stopPropagation(); toggleDorm(room.id); }}
                            title={isDormExpanded ? "Collapse bed view" : "Expand bed view"}
                            data-testid={`button-expand-dorm-${room.id}`}
                          >
                            <span>{bedsOccupiedToday}/{room.totalBeds || 0}</span>
                            {isDormExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Date cells + booking bars (self-contained relative context) */}
                    <div className="relative flex-shrink-0" style={{ width: dates.length * CELL_WIDTH, height: ROW_HEIGHT }}>
                      {isDorm ? (
                        /* ── Dorm parent row: per-day bed availability summary, no booking bars ── */
                        <div className="flex h-full">
                          {dates.map((date) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            const isTodayCell = dateStr === format(today, "yyyy-MM-dd");
                            const bedsUsed = getAllDormitoryBookingsForDate(room.id, date)
                              .reduce((s, b) => s + (b.bedsBooked || b.numberOfGuests || 1), 0);
                            const totalBeds = room.totalBeds || 0;
                            const available = Math.max(0, totalBeds - bedsUsed);
                            return (
                              <div
                                key={`${room.id}-dorm-${dateStr}`}
                                className={cn(
                                  "border-r flex-shrink-0 flex flex-col items-center justify-center gap-0.5",
                                  isTodayCell && "bg-amber-50/40 dark:bg-amber-950/10"
                                )}
                                style={{ width: CELL_WIDTH }}
                              >
                                <span className={cn(
                                  "text-[10px] font-semibold leading-tight",
                                  available === 0 ? "text-red-500 dark:text-red-400" :
                                  available <= 1 ? "text-amber-500 dark:text-amber-400" :
                                  "text-green-600 dark:text-green-400"
                                )}>
                                  {available} free
                                </span>
                                <span className="text-[9px] text-muted-foreground leading-tight">
                                  {bedsUsed}/{totalBeds}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <>
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
                                    setNewBookingDefaults({
                                      checkIn: dateStr,
                                      checkOut: format(addDays(date, 1), "yyyy-MM-dd"),
                                      roomId: room.id,
                                    });
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
                              const arrivingToday =
                                format(checkInDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") &&
                                booking.status !== "checked-in" &&
                                booking.status !== "checked-out" &&
                                booking.status !== "cancelled";
                              const statusStyle = arrivingToday
                                ? { bg: "bg-orange-500", text: "text-white", gradient: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)" }
                                : baseStatusStyle;
                              const isPaid = booking.status === "checked-out" || booking.status === "confirmed";
                              const handleClick = () => {
                                // Dorm rooms: use the booking's check-in date so bed layout shows
                                // the correct occupancy for that future date.
                                // Non-dorm rooms: always use today so status labels (Arriving Today,
                                // In House, Upcoming) are relative to the actual current date, not
                                // the booking's check-in date (which caused future bookings to show
                                // as "Arriving Today" incorrectly).
                                const popupDate = room.roomCategory === "dormitory"
                                  ? (checkInDate <= today ? today : checkInDate)
                                  : today;
                                setDormitoryPopup({ isOpen: true, room, bookings: allBookings, date: popupDate });
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
                                    title={`${guestName} - ${booking.status}`}
                                  >
                                    <span className="truncate">{guestName}</span>
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
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Expandable Bed Rows ───────────────────────────────── */}
                  {isDormExpanded && (() => {
                    const bedSlots = assignDormBeds(room, roomBookings);
                    return bedSlots.map((slotEntries, slotIdx) => {
                      const bedNumber = slotIdx + 1;
                      const isVacant = slotEntries.length === 0 ||
                        !slotEntries.some(e => {
                          const rangeEnd = addDays(startDate, 11);
                          return e.cin < rangeEnd && e.cout > startDate;
                        });
                      return (
                        <div
                          key={`bed-${room.id}-${bedNumber}`}
                          className="flex border-b bg-slate-50/70 dark:bg-muted/5"
                          data-testid={`bed-row-${room.id}-${bedNumber}`}
                        >
                          {/* Bed sidebar */}
                          {showRoomSidebar && (
                            <div
                              className="sticky left-0 z-10 bg-slate-50/90 dark:bg-muted/10 border-r flex items-center gap-1.5 px-2 flex-shrink-0"
                              style={{ width: sidebarWidth, height: ROW_HEIGHT }}
                            >
                              <div className="w-0.5 self-stretch bg-slate-200 dark:bg-muted rounded-full my-1.5 flex-shrink-0" />
                              <BedDouble className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground font-medium">Bed {bedNumber}</span>
                              {isVacant && (
                                <span className="ml-auto text-[9px] text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide">
                                  Vacant
                                </span>
                              )}
                            </div>
                          )}

                          {/* Date cells + booking bars */}
                          <div className="relative flex-shrink-0" style={{ width: dates.length * CELL_WIDTH, height: ROW_HEIGHT }}>
                            <div className="flex h-full">
                              {dates.map(date => {
                                const dateStr = format(date, "yyyy-MM-dd");
                                const isTodayCell = dateStr === format(today, "yyyy-MM-dd");
                                const occupied = slotEntries.some(e => date >= e.cin && date < e.cout);
                                return (
                                  <div
                                    key={`bed-cell-${room.id}-${bedNumber}-${dateStr}`}
                                    className={cn(
                                      "border-r flex-shrink-0",
                                      isTodayCell && "bg-amber-50/40 dark:bg-amber-950/10",
                                      !occupied && !isTodayCell && "bg-slate-50/50 dark:bg-muted/5"
                                    )}
                                    style={{ width: CELL_WIDTH }}
                                  />
                                );
                              })}
                            </div>

                            {/* Booking bars */}
                            <div className="absolute inset-0 pointer-events-none py-1.5">
                              {slotEntries.map(({ booking, cin, cout }) => {
                                const rangeStart = startOfDay(startDate);
                                const checkInDaysDiff = Math.floor((cin.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                                const checkOutDaysDiff = Math.floor((cout.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
                                if (checkOutDaysDiff <= 0 || checkInDaysDiff >= dates.length) return null;
                                const visibleStartIdx = Math.max(0, checkInDaysDiff);
                                const visibleEndIdx = Math.min(dates.length, checkOutDaysDiff + 1);
                                let leftPx = visibleStartIdx * CELL_WIDTH;
                                let widthPx = (visibleEndIdx - visibleStartIdx) * CELL_WIDTH;
                                if (checkInDaysDiff >= 0 && checkInDaysDiff < dates.length) { leftPx += CELL_WIDTH / 2; widthPx -= CELL_WIDTH / 2; }
                                if (checkOutDaysDiff > 0 && checkOutDaysDiff <= dates.length) { widthPx -= CELL_WIDTH / 2; }
                                if (widthPx <= 0) return null;
                                const gName = guests.find(g => g.id === booking.guestId)?.fullName || "Guest";
                                const baseStyle = STATUS_COLORS[booking.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
                                const arrivingToday =
                                  format(cin, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") &&
                                  booking.status !== "checked-in" &&
                                  booking.status !== "checked-out" &&
                                  booking.status !== "cancelled";
                                const barStyle = arrivingToday
                                  ? { bg: "bg-orange-500", text: "text-white", gradient: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)" }
                                  : baseStyle;
                                const isPaid = booking.status === "checked-out" || booking.status === "confirmed";
                                return (
                                  <div
                                    key={`bed-bar-${booking.id}-bed${bedNumber}`}
                                    className="absolute pointer-events-auto cursor-pointer group"
                                    style={{ left: `${leftPx}px`, width: `${widthPx}px`, top: '4px', bottom: '4px' }}
                                    onClick={() => navigate(`/bookings/${booking.id}`)}
                                    data-testid={`bed-bar-${booking.id}-${bedNumber}`}
                                  >
                                    <div
                                      className={cn("w-full h-full rounded-md flex items-center justify-between px-2 text-xs font-semibold shadow-sm transition-all group-hover:shadow-md group-hover:scale-[1.02]", barStyle.text)}
                                      style={{ background: barStyle.gradient }}
                                      title={`${gName} — Bed ${bedNumber}`}
                                    >
                                      <span className="truncate">{gName}</span>
                                      {!isPaid && (
                                        <span className="w-2 h-2 rounded-full flex-shrink-0 ml-1 bg-red-500 ring-2 ring-white shadow-sm animate-pulse" />
                                      )}
                                      {isPaid && (
                                        <span className="w-2 h-2 rounded-full flex-shrink-0 ml-1 bg-white/90" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
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
      </div></>}

      {/* Create Booking Dialog */}
      <NewBookingDialog
        open={showCreateBooking}
        onOpenChange={setShowCreateBooking}
        defaultCheckIn={newBookingDefaults.checkIn}
        defaultCheckOut={newBookingDefaults.checkOut}
        defaultRoomId={newBookingDefaults.roomId}
      />

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
                ? `${dormitoryPopup.room?.totalBeds || 0} beds total | ${dormBedAssignments.filter(b => b.booking !== null).length} occupied${dormitoryPopup.date ? ` on ${format(new Date(dormitoryPopup.date), "MMM d")}` : ""}`
                : `${dormitoryPopup.room?.roomType || "Room"} | ${dormitoryPopup.bookings.length} booking(s)`
              }
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4">

              {/* ── Dorm Bed Layout ────────────────────────────────────────── */}
              {dormitoryPopup.room?.roomCategory === "dormitory" && dormBedAssignments.length > 0 && (() => {
                const totalBeds   = dormitoryPopup.room!.totalBeds || 0;
                const occupied    = dormBedAssignments.filter(b => b.booking !== null && b.stayStatus !== "cleaning").length;
                const vacant      = dormBedAssignments.filter(b => b.booking === null).length;
                const cleaning    = dormBedAssignments.filter(b => b.stayStatus === "cleaning").length;
                const lateOut     = dormBedAssignments.filter(b => b.stayStatus === "lateCheckout").length;
                const checkoutCnt = dormBedAssignments.filter(b => b.stayStatus === "checkoutToday").length;
                const arrivalCnt  = dormBedAssignments.filter(b => b.stayStatus === "arrivingToday").length;
                const hasConflict = occupied > totalBeds;
                const hasAiosell  = !!(dormitoryPopup.room as any)?.aiosellRoomCode;

                const getTileStyle = (stayStatus: keyof typeof STAY_STATUS_CONFIG, isVacant: boolean) => {
                  if (isVacant)                         return { tile: "bg-background border-dashed border-muted-foreground/30", badge: "bg-muted text-muted-foreground", name: "text-muted-foreground", label: "text-muted-foreground" };
                  if (stayStatus === "lateCheckout")    return { tile: "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700", badge: "bg-orange-500 text-white", name: "text-orange-800 dark:text-orange-200", label: "text-orange-600 dark:text-orange-400" };
                  if (stayStatus === "checkoutToday")   return { tile: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", badge: "bg-red-600 text-white", name: "text-red-800 dark:text-red-200", label: "text-red-500 dark:text-red-400" };
                  if (stayStatus === "inHouse")         return { tile: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800", badge: "bg-green-600 text-white", name: "text-green-800 dark:text-green-200", label: "text-green-600 dark:text-green-400" };
                  if (stayStatus === "arrivingToday")   return { tile: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700", badge: "bg-yellow-500 text-white", name: "text-yellow-800 dark:text-yellow-200", label: "text-yellow-600 dark:text-yellow-400" };
                  if (stayStatus === "cleaning")        return { tile: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-700", badge: "bg-purple-600 text-white", name: "text-purple-800 dark:text-purple-200", label: "text-purple-500 dark:text-purple-400" };
                  return { tile: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800", badge: "bg-blue-600 text-white", name: "text-blue-800 dark:text-blue-200", label: "text-blue-500 dark:text-blue-400" };
                };

                const filteredBeds = dormBedAssignments.filter(bed => {
                  if (dormBedFilter === "vacant")   return bed.booking === null;
                  if (dormBedFilter === "arrivals") return bed.stayStatus === "arrivingToday";
                  if (dormBedFilter === "checkout") return bed.stayStatus === "checkoutToday" || bed.stayStatus === "lateCheckout";
                  return true;
                });

                return (
                  <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                    {/* ── Occupancy summary bar ── */}
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[
                        { val: totalBeds, label: "Total",    cls: "text-foreground" },
                        { val: occupied,  label: "Occupied", cls: "text-green-700 dark:text-green-400" },
                        { val: lateOut + checkoutCnt, label: "Checkout", cls: "text-red-700 dark:text-red-400" },
                        { val: arrivalCnt, label: "Arrivals", cls: "text-yellow-700 dark:text-yellow-400" },
                      ].map(({ val, label, cls }) => (
                        <div key={label} className="rounded-md bg-background border px-1 py-1.5">
                          <div className={`text-base font-bold leading-none ${cls}`}>{val}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* ── Conflict detector + OTA sync badge ── */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasConflict && (
                        <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded-md px-2 py-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="font-semibold">Conflict: {occupied} beds assigned &gt; {totalBeds} total</span>
                        </div>
                      )}
                      {lateOut > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 rounded-md px-2 py-1">
                          <Clock className="h-3 w-3" />
                          <span className="font-semibold">{lateOut} late checkout{lateOut > 1 ? "s" : ""} — past {STANDARD_CHECKOUT_HOUR}:00 AM</span>
                        </div>
                      )}
                      <div className={`ml-auto flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border ${hasAiosell ? "bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700 dark:text-green-400" : "bg-muted/60 border-muted text-muted-foreground"}`}>
                        {hasAiosell ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        <span>{hasAiosell ? "OTA Synced" : "No OTA"}</span>
                      </div>
                    </div>

                    {/* ── Quick filter buttons ── */}
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { key: "all",      label: "All Beds" },
                        { key: "vacant",   label: `Vacant (${vacant})` },
                        { key: "arrivals", label: `Arrivals (${arrivalCnt})` },
                        { key: "checkout", label: `Checkout (${lateOut + checkoutCnt})` },
                      ] as const).map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setDormBedFilter(key)}
                          className={`text-[10px] px-2 py-1 rounded-full border font-medium transition-colors ${dormBedFilter === key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-muted-foreground/20 text-muted-foreground hover:bg-muted"}`}
                          data-testid={`dorm-filter-${key}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* ── Bed layout header ── */}
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Bed Layout — {dormitoryPopup.room!.totalBeds} Beds
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {cleaning > 0 && <><span className="text-purple-600">{cleaning} cleaning</span> · </>}
                        {vacant} vacant
                      </span>
                    </div>

                    {/* ── Bed tiles ── */}
                    <TooltipProvider delayDuration={200}>
                      <div className="grid grid-cols-2 gap-2">
                        {filteredBeds.length === 0 && (
                          <p className="col-span-2 text-center text-xs text-muted-foreground py-3 italic">No beds match this filter</p>
                        )}
                        {filteredBeds.map(({ bedNumber, guestName, stayStatus, booking: bedBooking }) => {
                          const isVacant = bedBooking === null;
                          const tileStyle = getTileStyle(stayStatus, isVacant);
                          const isCheckingOut = stayStatus === "checkoutToday" || stayStatus === "lateCheckout";
                          const checkoutTimeLabel = `${STANDARD_CHECKOUT_HOUR}:00 AM`;
                          const source = bedBooking?.source;
                          const sourceLabels: Record<string, string> = { direct: "Direct", "walk-in": "Walk-in", airbnb: "Airbnb", booking: "Booking.com", goibibo: "Goibibo", makemytrip: "MakeMyTrip", oyo: "OYO", agoda: "Agoda", other: "Other" };
                          const guestObj = isVacant ? null : (guests as any[]).find((g: any) => g.id === bedBooking.guestId);
                          const totalAmt = Number(bedBooking?.totalAmount || 0);
                          const advAmt   = Number(bedBooking?.advanceAmount || 0);
                          const isPaid   = advAmt >= totalAmt && totalAmt > 0;

                          const tile = (
                            <div
                              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${tileStyle.tile} ${!isVacant ? "cursor-help" : ""}`}
                              data-testid={`bed-card-${bedNumber}`}
                            >
                              <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${tileStyle.badge}`}>
                                {bedNumber}
                              </div>
                              <div className="min-w-0 flex-1">
                                {!isVacant ? (
                                  <>
                                    <p className={`text-xs font-semibold truncate leading-tight ${tileStyle.name}`}>{guestName}</p>
                                    <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${tileStyle.label}`}>
                                      {stayStatus === "cleaning" && <Sparkles className="h-2.5 w-2.5" />}
                                      {STAY_STATUS_CONFIG[stayStatus].label}
                                      {isCheckingOut && <span className="opacity-75">— {checkoutTimeLabel}</span>}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">Vacant</p>
                                )}
                              </div>
                            </div>
                          );

                          if (isVacant) return <div key={bedNumber}>{tile}</div>;
                          return (
                            <Tooltip key={bedNumber}>
                              <TooltipTrigger asChild>{tile}</TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px] text-xs space-y-1 p-3">
                                <p className="font-semibold text-sm">{guestName}</p>
                                {guestObj?.phone && <p className="text-muted-foreground">📞 {guestObj.phone}</p>}
                                {source && <p className="text-muted-foreground">🌐 {sourceLabels[source] || source}</p>}
                                <p className="text-muted-foreground">📅 {format(new Date(bedBooking.checkInDate), "MMM d")} → {format(new Date(bedBooking.checkOutDate), "MMM d")}</p>
                                <p className={isPaid ? "text-green-600" : "text-red-500"}>
                                  {isPaid ? "✅ Paid" : `⚠ Balance ₹${(totalAmt - advAmt).toLocaleString()}`}
                                </p>
                                {bedBooking.mealPlan && <p className="text-muted-foreground">🍽 {bedBooking.mealPlan.toUpperCase()}</p>}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>

                    {/* ── Legend ── */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-muted-foreground/10">
                      {[
                        { dot: "bg-green-600",  label: "In House" },
                        { dot: "bg-yellow-500", label: "Arriving" },
                        { dot: "bg-orange-500", label: "Late Checkout" },
                        { dot: "bg-red-600",    label: "Checkout Today" },
                        { dot: "bg-blue-600",   label: "Upcoming" },
                        { dot: "bg-purple-600", label: "Cleaning" },
                        { dot: "bg-muted border", label: "Vacant" },
                      ].map(({ dot, label }) => (
                        <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className={`h-2 w-2 rounded-full inline-block ${dot}`} />{label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const sourceLabels: Record<string, string> = {
                  direct: "Direct", "walk-in": "Walk-in", airbnb: "Airbnb",
                  booking: "Booking.com", goibibo: "Goibibo", makemytrip: "MakeMyTrip",
                  oyo: "OYO", agoda: "Agoda", other: "Other",
                };

                const sections: Array<{
                  key: keyof typeof STAY_STATUS_CONFIG;
                  headerClass: string;
                  dotClass: string;
                }> = [
                  { key: "checkoutToday",  headerClass: "text-red-700 dark:text-red-400",    dotClass: "bg-red-500" },
                  { key: "inHouse",        headerClass: "text-green-700 dark:text-green-400", dotClass: "bg-green-500" },
                  { key: "arrivingToday",  headerClass: "text-yellow-700 dark:text-yellow-400", dotClass: "bg-yellow-500" },
                  { key: "upcoming",       headerClass: "text-blue-700 dark:text-blue-400",   dotClass: "bg-blue-500" },
                ];

                const grouped = Object.fromEntries(
                  sections.map(s => [s.key, dormitoryPopup.bookings.filter(b => getDormStayStatus(b) === s.key)])
                );

                const renderBookingCard = (booking: any) => {
                  const guest = guests.find(g => g.id === booking.guestId);
                  const guestName = guest?.fullName || "Guest";
                  const guestPhone = guest?.phone || "-";
                  const bedsBooked = booking.bedsBooked || booking.numberOfGuests || 1;
                  const stayStatus = getDormStayStatus(booking);
                  const stayConfig = STAY_STATUS_CONFIG[stayStatus];
                  const isPaid = booking.advancePaymentStatus === "paid" || Number(booking.advanceAmount || 0) >= Number(booking.totalAmount || 0);

                  const stayBadgeClass =
                    stayStatus === "checkoutToday"  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200" :
                    stayStatus === "inHouse"         ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200" :
                    stayStatus === "arrivingToday"   ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200" :
                                                       "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200";

                  return (
                    <div
                      key={booking.id}
                      className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                      data-testid={`dormitory-booking-${booking.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-base">{guestName}</h4>
                          <p className="text-sm text-muted-foreground">{guestPhone}</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Badge variant="outline" className={`text-xs border ${stayBadgeClass}`}>
                            {stayConfig.label}
                          </Badge>
                          {isPaid ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">Paid</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-xs">Unpaid</Badge>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Booking ID:</span>
                          <span className="ml-2 font-medium">#{booking.id}</span>
                        </div>
                        {dormitoryPopup.room?.roomCategory === "dormitory" ? (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Beds:</span>
                            <button
                              className="ml-1 h-5 w-5 rounded border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40"
                              disabled={bedsBooked <= 1 || updateBedsMutation.isPending}
                              onClick={() => updateBedsMutation.mutate({ bookingId: booking.id, bedsBooked: bedsBooked - 1 })}
                              data-testid={`btn-beds-minus-${booking.id}`}
                            >−</button>
                            <span className="font-bold text-sm min-w-[1.25rem] text-center">{bedsBooked}</span>
                            <button
                              className="h-5 w-5 rounded border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40"
                              disabled={bedsBooked >= (dormitoryPopup.room?.totalBeds || 99) || updateBedsMutation.isPending}
                              onClick={() => updateBedsMutation.mutate({ bookingId: booking.id, bedsBooked: bedsBooked + 1 })}
                              data-testid={`btn-beds-plus-${booking.id}`}
                            >+</button>
                          </div>
                        ) : (
                          <div>
                            <span className="text-muted-foreground">Guests:</span>
                            <span className="ml-2 font-medium">{booking.numberOfGuests || 1}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Check-in:</span>
                          <span className="ml-2 font-medium">{format(new Date(booking.checkInDate), "MMM d, yyyy")}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Check-out:</span>
                          <span className="ml-2 font-medium">{format(new Date(booking.checkOutDate), "MMM d, yyyy")}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Source:</span>
                          <span className="ml-2 font-medium">{sourceLabels[booking.source || "direct"] || booking.source}</span>
                        </div>
                        {booking.mealPlan && (
                          <div>
                            <span className="text-muted-foreground">Meal Plan:</span>
                            <span className="ml-2 font-medium capitalize">{booking.mealPlan}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-dashed">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Payment Details</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <span className="ml-2 font-medium">₹{Number(booking.totalAmount || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Advance:</span>
                            <span className="ml-2 font-medium">₹{Number(booking.advanceAmount || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Balance:</span>
                            <span className="ml-2 font-medium">₹{(Number(booking.totalAmount || 0) - Number(booking.advanceAmount || 0)).toLocaleString()}</span>
                          </div>
                          {booking.advancePaymentStatus && (
                            <div>
                              <span className="text-muted-foreground">Adv. Status:</span>
                              <span className="ml-2 font-medium capitalize">{booking.advancePaymentStatus}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline" size="sm" className="flex-1"
                          onClick={() => { setDormitoryPopup(prev => ({ ...prev, isOpen: false })); navigate(`/bookings/${booking.id}`); }}
                          data-testid={`button-view-booking-${booking.id}`}
                        >View Full Details</Button>
                        {booking.status !== "checked-out" && booking.status !== "cancelled" && (
                          <Button
                            size="sm" className="flex-1 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                            onClick={() => { setChangeRoomBooking(booking); setChangeRoomFromRoomId(dormitoryPopup.room?.id ?? booking.roomId ?? null); setChangeRoomNewRoomId(""); setChangeRoomDialogOpen(true); }}
                            data-testid={`button-change-room-${booking.id}`}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />Change Room
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                };

                return sections.map(({ key, headerClass, dotClass }) => {
                  const bookingsInSection = grouped[key];
                  if (!bookingsInSection || bookingsInSection.length === 0) return null;
                  return (
                    <div key={key}>
                      <div className={`flex items-center gap-2 px-1 mb-2 mt-1`}>
                        <span className={`h-2 w-2 rounded-full inline-block flex-shrink-0 ${dotClass}`} />
                        <span className={`text-xs font-semibold uppercase tracking-wide ${headerClass}`}>
                          {STAY_STATUS_CONFIG[key].label} ({bookingsInSection.length})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {bookingsInSection.map(renderBookingCard)}
                      </div>
                    </div>
                  );
                });
              })()}
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
      <Dialog open={changeRoomDialogOpen} onOpenChange={(open) => { if (!open) { setChangeRoomDialogOpen(false); setChangeRoomBooking(null); setChangeRoomFromRoomId(null); setChangeRoomNewRoomId(""); } }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-change-room">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-[#1E3A5F]" />
              Change Room Assignment
            </DialogTitle>
            <DialogDescription>
              {changeRoomBooking && (() => {
                const guest = guests.find(g => g.id === changeRoomBooking.guestId);
                const currentRoom = rooms.find(r => r.id === (changeRoomFromRoomId ?? changeRoomBooking.roomId));
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
              const oldRoom = rooms.find(r => r.id === (changeRoomFromRoomId ?? changeRoomBooking.roomId));
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
            <Button variant="outline" onClick={() => { setChangeRoomDialogOpen(false); setChangeRoomBooking(null); setChangeRoomFromRoomId(null); setChangeRoomNewRoomId(""); }} data-testid="button-cancel-change-room">
              Cancel
            </Button>
            <Button
              disabled={!changeRoomNewRoomId || changeRoomMutation.isPending}
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
              onClick={() => {
                if (!changeRoomBooking || !changeRoomNewRoomId) return;
                setPendingRoomChange({ bookingId: changeRoomBooking.id, newRoomId: parseInt(changeRoomNewRoomId), fromRoomId: changeRoomFromRoomId ?? undefined, recalculatePrice: changeRoomRecalculate });
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
