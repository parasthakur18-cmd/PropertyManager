import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Calendar, User, Hotel, Receipt, Search, Pencil, Upload, Trash2, Phone, QrCode, AlertTriangle, Info, CreditCard, Check, Send, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { IdVerificationUpload } from "@/components/IdVerificationUpload";
import { GuestIdUpload } from "@/components/GuestIdUpload";
import { BookingQRCode } from "@/components/BookingQRCode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertBookingSchema, type InsertBooking, type Booking, type Property, type Guest, type Room, type TravelAgent, type Bill, type Order, type BookingRoomStay } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const GuestInputFields = memo(function GuestInputFields({ 
  guestDataRef, 
  resetKey, 
  validationAttempted 
}: { 
  guestDataRef: React.MutableRefObject<{ fullName: string; phone: string; email: string; idProofImage: string }>;
  resetKey: number;
  validationAttempted: boolean;
}) {
  const [localName, setLocalName] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [localEmail, setLocalEmail] = useState("");

  useEffect(() => {
    setLocalName("");
    setLocalPhone("");
    setLocalEmail("");
  }, [resetKey]);

  return (
    <>
      <Input
        placeholder="Full Name *"
        value={localName}
        onChange={(e) => {
          setLocalName(e.target.value);
          guestDataRef.current.fullName = e.target.value;
        }}
        data-testid="input-guest-name"
        className={`bg-background ${validationAttempted && !localName ? 'border-destructive border-2' : ''}`}
      />
      <Input
        placeholder="Phone Number *"
        value={localPhone}
        onChange={(e) => {
          setLocalPhone(e.target.value);
          guestDataRef.current.phone = e.target.value;
        }}
        data-testid="input-guest-phone"
        className={`bg-background ${validationAttempted && !localPhone ? 'border-destructive border-2' : ''}`}
      />
      <Input
        placeholder="Email (optional)"
        type="email"
        value={localEmail}
        onChange={(e) => {
          setLocalEmail(e.target.value);
          guestDataRef.current.email = e.target.value;
        }}
        data-testid="input-guest-email"
        className="bg-background"
      />
      <IdVerificationUpload
        onUploadComplete={(objectKey) => {
          guestDataRef.current.idProofImage = objectKey;
        }}
      />
    </>
  );
});

const statusColors = {
  pending: "bg-amber-500 text-white",
  pending_advance: "bg-orange-500 text-white",
  confirmed: "bg-chart-2 text-white",
  "checked-in": "bg-chart-5 text-white",
  "checked-out": "bg-muted text-muted-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
  no_show: "bg-purple-600 text-white",
};

function normalizeSource(source: string | null | undefined): string {
  if (!source) return "Walk-in";
  if (source.startsWith("aiosell-")) {
    const channel = source.replace("aiosell-", "").toLowerCase();
    if (channel.includes("booking")) return "Booking.com";
    if (channel.includes("mmt") || channel.includes("makemytrip")) return "MMT";
    if (channel.includes("airbnb")) return "Airbnb";
    if (channel.includes("goibibo")) return "Goibibo";
    if (channel.includes("agoda")) return "Agoda";
    if (channel.includes("expedia")) return "Expedia";
    return "OTA";
  }
  return source;
}

export default function Bookings() {
  const [location, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const guestDataRef = useRef({ fullName: "", phone: "", email: "", idProofImage: "" });
  const guestInputResetKey = useRef(0);
  const bookingTableRef = useRef<HTMLDivElement>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [checkoutBookingId, setCheckoutBookingId] = useState<number | null>(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const [deleteBookingId, setDeleteBookingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingType, setBookingType] = useState<"single" | "group" | "dormitory">("single");
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [editBookingType, setEditBookingType] = useState<"single" | "group" | "dormitory">("single");
  const [editSelectedRoomIds, setEditSelectedRoomIds] = useState<number[]>([]);
  const [editSelectedPropertyId, setEditSelectedPropertyId] = useState<number | undefined>(undefined);
  const [checkinBookingId, setCheckinBookingId] = useState<number | null>(null);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinIdProof, setCheckinIdProof] = useState<string | null>(null);
  const [checkinGuestEntries, setCheckinGuestEntries] = useState<Array<{
    guestName: string; phone: string; email: string; idProofType: string; idProofNumber: string;
    idProofFront: string | null; idProofBack: string | null; isPrimary: boolean;
  }>>([]);
  const [isAddAgentDialogOpen, setIsAddAgentDialogOpen] = useState(false);
  const [newAgentData, setNewAgentData] = useState({ name: "", contactPerson: "", phone: "", email: "" });
  const [checkinDateFilter, setCheckinDateFilter] = useState<string>(""); // Filter by check-in date (YYYY-MM-DD)
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all"); // Property dropdown filter
  const [qrBookingId, setQrBookingId] = useState<number | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationType, setCancellationType] = useState<"full_refund" | "partial_refund" | "no_refund">("full_refund");
  const [cancellationCharges, setCancellationCharges] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  // No-show dialog state
  const [noShowBookingId, setNoShowBookingId] = useState<number | null>(null);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [noShowChargeType, setNoShowChargeType] = useState<"full_charge" | "partial_charge" | "no_charge">("full_charge");
  const [noShowCharges, setNoShowCharges] = useState("");
  const [noShowNotes, setNoShowNotes] = useState("");
  const [sameDayWarningOpen, setSameDayWarningOpen] = useState(false);
  const [sameDayBookingId, setSameDayBookingId] = useState<number | null>(null);
  const [extendCheckoutDate, setExtendCheckoutDate] = useState<Date | null>(null);
  const { toast} = useToast();

  // Debounce search input for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-open dialog when coming from dashboard with ?new=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === 'true') {
      setIsDialogOpen(true);
      setValidationAttempted(false);
      // Clean up URL without page reload
      window.history.replaceState({}, '', '/bookings');
    }
  }, []);
  
  // Reset validation state when dialog is closed
  useEffect(() => {
    if (!isDialogOpen) {
      setValidationAttempted(false);
    }
  }, [isDialogOpen]);

  // Reset to page 1 when any filter changes
  useEffect(() => { setCurrentPage(1); }, [activeTab, checkinDateFilter, dateFrom, dateTo, debouncedSearch, propertyFilter]);

  type BookingCounts = { active: number; completed: number; cancelled: number; no_show: number };
  type PaginatedBookingsResponse = { data: Booking[]; total: number; counts: BookingCounts };

  const { data: bookingsResponse, isLoading, isFetching } = useQuery<PaginatedBookingsResponse>({
    queryKey: ["/api/bookings", activeTab, checkinDateFilter, dateFrom, dateTo, debouncedSearch, currentPage, propertyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((currentPage - 1) * PAGE_SIZE));
      if (activeTab !== "all") params.set("status", activeTab);
      if (checkinDateFilter) params.set("checkinDate", checkinDateFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (propertyFilter && propertyFilter !== "all") params.set("propertyId", propertyFilter);
      const res = await fetch(`/api/bookings?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
  const bookings = bookingsResponse?.data;

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select property when dialog opens and only one property exists
  useEffect(() => {
    if (isDialogOpen && properties && properties.length === 1) {
      if (!form.getValues("propertyId")) {
        form.setValue("propertyId", properties[0].id);
      }
    }
  }, [isDialogOpen, properties]);

  const { data: guests } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    staleTime: 2 * 60 * 1000,
  });

  // Room stays for the booking being edited (shown only for OTA/multi-room bookings)
  const { data: editingBookingRoomStays } = useQuery<BookingRoomStay[]>({
    queryKey: ["/api/bookings", editingBooking?.id, "room-stays"],
    enabled: !!editingBooking?.id && editingBooking?.source?.startsWith("aiosell-"),
    staleTime: 30 * 1000,
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    staleTime: 5 * 60 * 1000,
  });

  // Helper to get default check-in time (11:00 AM today)
  const getDefaultCheckIn = () => {
    const date = new Date();
    date.setHours(11, 0, 0, 0); // 11:00 AM
    return date;
  };

  // Helper to get default checkout time (10:00 AM, next day from today)
  const getDefaultCheckOut = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0); // 10:00 AM
    return date;
  };

  const form = useForm({
    // Don't use zodResolver because we create the guest first
    defaultValues: {
      propertyId: undefined as any,
      guestId: undefined as any,
      roomId: undefined as any,
      checkInDate: getDefaultCheckIn(),
      checkOutDate: getDefaultCheckOut(),
      status: "pending",
      numberOfGuests: 1,
      customPrice: null,
      specialRequests: "",
      source: "Walk-in",
      travelAgentId: null,
      mealPlan: "EP",
      advanceAmount: "",
      advancePaymentMethod: "upi",
      bedsBooked: null as number | null,
    },
  });

  const editForm = useForm({
    defaultValues: {
      propertyId: undefined as any,
      guestId: undefined as any,
      roomId: undefined as any,
      checkInDate: getDefaultCheckIn(),
      checkOutDate: getDefaultCheckOut(),
      status: "pending",
      numberOfGuests: 1,
      customPrice: null,
      specialRequests: "",
      source: "Walk-in",
      travelAgentId: undefined as number | undefined,
      mealPlan: "EP",
      advanceAmount: "",
      advancePaymentMethod: "upi",
      bedsBooked: null as number | null,
      guestName: "",
      guestPhone: "",
      guestWhatsappPhone: "",
    },
  });

  // Watch propertyId to filter travel agents by property
  const selectedPropertyId = form.watch("propertyId");
  
  const { data: travelAgents } = useQuery<TravelAgent[]>({
    queryKey: ["/api/travel-agents"],
    staleTime: 5 * 60 * 1000,
    select: (agents) => selectedPropertyId 
      ? agents.filter(agent => agent.propertyId === selectedPropertyId)
      : agents,
  });

  // Watch check-in and check-out dates for availability checking
  const checkInDate = form.watch("checkInDate");
  const checkOutDate = form.watch("checkOutDate");
  const editCheckInDate = editForm.watch("checkInDate");
  const editCheckOutDate = editForm.watch("checkOutDate");
  const watchedCustomPrice = form.watch("customPrice");
  const editWatchedCustomPrice = editForm.watch("customPrice");

  // Fetch room availability based on selected dates (for new booking)
  const { data: roomAvailability, isFetching: isAvailabilityFetching } = useQuery({
    queryKey: ["/api/rooms/availability", checkInDate, checkOutDate, selectedPropertyId],
    enabled: !!(checkInDate && checkOutDate && checkInDate < checkOutDate),
    queryFn: async () => {
      const params = new URLSearchParams({
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
      });
      if (selectedPropertyId) params.set("propertyId", selectedPropertyId.toString());
      const response = await fetch(`/api/rooms/availability?${params}`);
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json() as Promise<Array<{
        roomId: number;
        available: number;
        totalBeds?: number;
        remainingBeds?: number;
        conflictBookingId?: number | null;
        conflictCheckIn?: string | null;
        conflictCheckOut?: string | null;
      }>>;
    },
  });

  // Fetch room availability for edit mode
  const { data: editRoomAvailability } = useQuery({
    queryKey: ["/api/rooms/availability", editCheckInDate, editCheckOutDate, editingBooking?.id],
    enabled: !!(editCheckInDate && editCheckOutDate && editCheckInDate < editCheckOutDate && editingBooking),
    queryFn: async () => {
      const response = await fetch(
        `/api/rooms/availability?checkIn=${editCheckInDate.toISOString()}&checkOut=${editCheckOutDate.toISOString()}&excludeBookingId=${editingBooking?.id}`
      );
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json() as Promise<Array<{
        roomId: number;
        available: number;
        totalBeds?: number;
        remainingBeds?: number;
        conflictBookingId?: number | null;
        conflictCheckIn?: string | null;
        conflictCheckOut?: string | null;
      }>>;
    },
  });

  // Check for extended stay conflicts (guest still in room past checkout)
  const watchedRoomIdForConflicts = form.watch("roomId");
  const { data: extendedStayConflicts } = useQuery({
    queryKey: ["/api/rooms/extended-stay-conflicts", watchedRoomIdForConflicts, selectedRoomIds, checkInDate],
    enabled: !!(checkInDate && (watchedRoomIdForConflicts || selectedRoomIds.length > 0)),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("checkInDate", checkInDate.toISOString());
      
      if (bookingType === "group" && selectedRoomIds.length > 0) {
        params.append("roomIds", JSON.stringify(selectedRoomIds));
      } else if (watchedRoomIdForConflicts) {
        params.append("roomId", watchedRoomIdForConflicts.toString());
      }
      
      const response = await fetch(`/api/rooms/extended-stay-conflicts?${params}`);
      if (!response.ok) throw new Error("Failed to check conflicts");
      return response.json() as Promise<{
        hasConflict: boolean;
        conflicts: Array<{
          bookingId: number;
          guestName: string;
          roomNumber: string;
          originalCheckout: string;
          daysExtended: number;
        }>;
      }>;
    },
  });

  // Helper function to get available rooms based on date-range availability
  // Filters rooms to only those with no conflicting bookings for the selected dates
  const getAvailableRooms = (isEditMode: boolean = false) => {
    if (!rooms) return [];
    const availability = isEditMode ? editRoomAvailability : roomAvailability;
    // If dates are set and availability data is loaded, filter to available rooms only
    const hasDateRange = isEditMode
      ? !!(editCheckInDate && editCheckOutDate && editCheckInDate < editCheckOutDate)
      : !!(checkInDate && checkOutDate && checkInDate < checkOutDate);
    if (hasDateRange && availability) {
      const availableIds = new Set(
        availability
          .filter(a => a.available > 0)
          .map(a => a.roomId)
      );
      return rooms.filter(r => availableIds.has(r.id));
    }
    return rooms;
  };

  // Helper to filter rooms by booking type (dormitory vs non-dormitory)
  const filterRoomsByBookingType = (roomsList: Room[], type: "single" | "group" | "dormitory") => {
    if (type === "dormitory") {
      // Show only dormitory rooms
      return roomsList.filter(r => r.roomCategory === "dormitory");
    } else {
      // For single and group bookings, show only non-dormitory rooms
      return roomsList.filter(r => r.roomCategory !== "dormitory");
    }
  };

  // Composed helper: get rooms filtered by availability, booking type, and selected property
  const getRoomsForBookingType = (type: "single" | "group" | "dormitory", options: { isEditMode?: boolean; propertyId?: number; includeRoomIds?: number[] } = {}) => {
    const availableRooms = getAvailableRooms(options.isEditMode || false);
    const byType = filterRoomsByBookingType(availableRooms, type);
    
    // Filter by selected property if provided
    const propertyFilter = options.propertyId ?? selectedPropertyId;
    let filtered = propertyFilter ? byType.filter(room => room.propertyId === propertyFilter) : byType;
    
    // In edit mode, also include currently selected rooms that might not be in the available list
    if (options.includeRoomIds && options.includeRoomIds.length > 0 && rooms) {
      const additionalRooms = rooms.filter(r => 
        options.includeRoomIds!.includes(r.id) && 
        !filtered.find(f => f.id === r.id) &&
        (!propertyFilter || r.propertyId === propertyFilter)
      );
      filtered = [...filtered, ...additionalRooms];
    }
    
    return filtered;
  };

  // NEW: Fetch bed inventory for selected dormitory room
  const selectedRoomId = form.watch("roomId");
  const selectedRoom = rooms?.find(r => r.id === selectedRoomId);
  
  const { data: bedInventory } = useQuery({
    queryKey: ["/api/rooms", selectedRoomId, "bed-inventory", checkInDate, checkOutDate],
    enabled: !!(selectedRoom?.roomCategory === "dormitory" && selectedRoomId && checkInDate && checkOutDate),
    queryFn: async () => {
      const response = await fetch(
        `/api/rooms/${selectedRoomId}/bed-inventory?checkIn=${checkInDate?.toISOString()}&checkOut=${checkOutDate?.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch bed inventory");
      return response.json() as Promise<{
        totalBeds: number;
        reservedBeds: number;
        remainingBeds: number;
      }>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBooking) => {
      return await apiRequest("/api/bookings", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/availability"] });
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      guestDataRef.current = { fullName: "", phone: "", email: "", idProofImage: "" };
      guestInputResetKey.current += 1;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/bookings/${id}/status`, "PATCH", { status });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });

      if (data?.autoCheckedOutBookingIds?.length > 0) {
        const oldId = data.autoCheckedOutBookingIds[0];
        setCheckoutBookingId(oldId);
        setCheckoutDialogOpen(true);
        toast({
          title: "Previous Guest Auto-Checked Out",
          description: `Booking #${oldId} was automatically checked out. Please review and settle the bill.`,
        });
      } else {
        toast({
          title: "Success",
          description: "Booking status updated",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler for status changes with ID validation for check-in
  const handleStatusChange = (booking: Booking, newStatus: string) => {
    // If changing to cancelled, open cancellation dialog for advance handling
    if (newStatus === "cancelled") {
      const advanceAmount = parseFloat(booking.advanceAmount || "0");
      setCancelBookingId(booking.id);
      setCancellationType("full_refund");
      setRefundAmount(advanceAmount > 0 ? String(advanceAmount) : "0");
      setCancellationCharges("0");
      setCancellationReason("");
      setCancelDialogOpen(true);
      return;
    }

    // If marking as no-show, open no-show dialog
    if (newStatus === "no_show") {
      const advanceAmount = parseFloat(booking.advanceAmount || "0");
      setNoShowBookingId(booking.id);
      setNoShowChargeType("full_charge");
      setNoShowCharges(advanceAmount > 0 ? String(advanceAmount) : "0");
      setNoShowNotes("");
      setNoShowDialogOpen(true);
      return;
    }

    // If changing to checked-in, validate guest has ID proof
    if (newStatus === "checked-in") {
      const guest = guests?.find(g => g.id === booking.guestId);
      
      if (!guest) {
        toast({
          title: "Guest Not Found",
          description: "Cannot check in without valid guest information",
          variant: "destructive",
        });
        return;
      }

      // Check if checkout is today or in the past (same-day or overdue checkout)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkoutDate = new Date(booking.checkOutDate);
      checkoutDate.setHours(0, 0, 0, 0);
      
      if (checkoutDate <= today) {
        // Same-day or overdue checkout - show warning
        setSameDayBookingId(booking.id);
        setExtendCheckoutDate(new Date(checkoutDate));
        setSameDayWarningOpen(true);
        return;
      }

      setCheckinBookingId(booking.id);
      setCheckinGuestEntries([{
        guestName: guest.fullName || "",
        phone: guest.phone || "",
        email: guest.email || "",
        idProofType: guest.idProofType || "",
        idProofNumber: guest.idProofNumber || "",
        idProofFront: guest.idProofImage || null,
        idProofBack: null,
        isPrimary: true,
      }]);
      setCheckinDialogOpen(true);
      return;
    }

    // Proceed with status change
    updateStatusMutation.mutate({
      id: booking.id,
      status: newStatus as "pending" | "confirmed" | "checked-in" | "checked-out" | "cancelled"
    });
  };

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/bookings/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/availability"] });
      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeleteBookingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (data: { 
      bookingId: number; 
      cancellationType: string; 
      cancellationCharges: number; 
      refundAmount: number; 
      cancellationReason: string;
    }) => {
      return await apiRequest(`/api/bookings/${data.bookingId}/cancel`, "POST", {
        cancellationType: data.cancellationType,
        cancellationCharges: data.cancellationCharges,
        refundAmount: data.refundAmount,
        cancellationReason: data.cancellationReason,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/property-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      
      const summary = data?.financialSummary || {};
      let message = `Booking cancelled. `;
      if (summary?.refundAmount > 0) {
        message += `Refund: ₹${summary.refundAmount}. `;
      }
      if (summary?.cancellationCharges > 0) {
        message += `Cancellation income: ₹${summary.cancellationCharges}`;
      }
      
      toast({
        title: "Booking Cancelled",
        description: message,
      });
      setCancelDialogOpen(false);
      setCancelBookingId(null);
      setCancellationType("full_refund");
      setCancellationCharges("");
      setRefundAmount("");
      setCancellationReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const noShowMutation = useMutation({
    mutationFn: async (data: { bookingId: number; chargeType: string; noShowCharges: number; noShowNotes: string }) => {
      return await apiRequest(`/api/bookings/${data.bookingId}/no-show`, "POST", {
        chargeType: data.chargeType,
        noShowCharges: data.noShowCharges,
        noShowNotes: data.noShowNotes,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions"] });
      const s = data?.financialSummary || {};
      let message = "Booking marked as No Show.";
      if (s.noShowCharges > 0) message += ` ₹${s.noShowCharges} kept as no-show income.`;
      if (s.refundBack > 0) message += ` ₹${s.refundBack} advance refunded.`;
      toast({ title: "No Show Recorded", description: message });
      setNoShowDialogOpen(false);
      setNoShowBookingId(null);
      setNoShowChargeType("full_charge");
      setNoShowCharges("");
      setNoShowNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "No Show Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertBooking> }) => {
      return await apiRequest(`/api/bookings/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/availability"] });
      toast({
        title: "Success",
        description: "Booking updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingBooking(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear travelAgentId when source changes away from "Travel Agent"
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "source" && value.source !== "Travel Agent") {
        form.setValue("travelAgentId", null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Clear travelAgentId when propertyId changes (prevent cross-property agent mismatch)
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "propertyId") {
        form.setValue("travelAgentId", null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Clear travelAgentId in edit form when propertyId changes
  useEffect(() => {
    const subscription = editForm.watch((value, { name }) => {
      if (name === "propertyId") {
        editForm.setValue("travelAgentId", undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [editForm]);

  const createTravelAgentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/travel-agents", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/travel-agents"] });
      toast({
        title: "Success",
        description: "Travel agent added successfully",
      });
      setIsAddAgentDialogOpen(false);
      setNewAgentData({ name: "", contactPerson: "", phone: "", email: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendAdvancePaymentMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      return await apiRequest(`/api/bookings/${bookingId}/send-advance-payment`, "POST");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Payment Link Sent",
        description: data.message || "Advance payment link sent via WhatsApp",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Payment Link",
        description: error.message || "Unable to send payment link",
        variant: "destructive",
      });
    },
  });

  const confirmAdvancePaymentMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      return await apiRequest(`/api/bookings/${bookingId}/confirm-advance-payment`, "POST");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Confirmed",
        description: "Advance payment received and booking confirmed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Confirmation Failed",
        description: error.message || "Unable to confirm booking",
        variant: "destructive",
      });
    },
  });

  const sendCheckinLinkMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      return await apiRequest(`/api/bookings/${bookingId}/send-checkin-link`, "POST");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Check-in Link Sent",
        description: "Self check-in link sent via WhatsApp",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Link",
        description: error.message || "Unable to send check-in link",
        variant: "destructive",
      });
    },
  });

  const resendWaMutation = useMutation({
    mutationFn: async ({ bookingId, type }: { bookingId: number; type: "confirmation" | "payment" | "checkin" }) => {
      return await apiRequest(`/api/bookings/${bookingId}/resend-whatsapp`, "POST", { type });
    },
    onSuccess: (data: any) => {
      toast({ title: "WhatsApp Sent", description: data?.message || "Message sent successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Send Failed", description: error.message || "Could not send WhatsApp message", variant: "destructive" });
    },
  });

  const onSubmit = async (data: any) => {
    // Prevent double submission
    if (createMutation.isPending) {
      return;
    }
    
    // Mark that validation has been attempted
    setValidationAttempted(true);
    
    // First, validate and create the guest
    if (!guestDataRef.current.fullName || !guestDataRef.current.phone) {
      toast({
        title: "Missing Required Fields",
        description: "Please enter guest name and phone number (marked with red border)",
        variant: "destructive",
      });
      return;
    }

    // Validate room selection based on booking type
    if (bookingType === "single" || bookingType === "dormitory") {
      if (!data.roomId) {
        toast({
          title: "Error",
          description: "Please select a room",
          variant: "destructive",
        });
        return;
      }
    } else if (bookingType === "group") {
      // Group booking
      if (selectedRoomIds.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one room for group booking",
          variant: "destructive",
        });
        return;
      }
    }

    // Create guest first (ID proof is optional)
    try {
      const guestData = {
        fullName: guestDataRef.current.fullName,
        phone: guestDataRef.current.phone,
        email: guestDataRef.current.email || null,
        idProofImage: guestDataRef.current.idProofImage || null,
        idProofType: null,
        idProofNumber: null,
        address: null,
        preferences: null,
      };
      const guestResponse = await apiRequest("/api/guests", "POST", guestData);
      const newGuest = await guestResponse.json();
      
      // Calculate totalAmount before sending
      const checkInDate = new Date(data.checkInDate);
      const checkOutDate = new Date(data.checkOutDate);
      const numberOfNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate roomCharges (price per night)
      let roomCharges = 0;
      if (bookingType === "single" || bookingType === "dormitory") {
        const selectedRoom = rooms?.find(r => r.id === data.roomId);
        if (selectedRoom) {
          roomCharges = data.customPrice ? parseFloat(data.customPrice) : parseFloat(selectedRoom.pricePerNight.toString());
        }
      } else {
        // Group booking - sum all room prices
        const selectedRooms = rooms?.filter(r => selectedRoomIds.includes(r.id)) || [];
        roomCharges = selectedRooms.reduce((sum, r) => {
          const roomPrice = data.customPrice ? parseFloat(data.customPrice) / selectedRooms.length : parseFloat(r.pricePerNight.toString());
          return sum + roomPrice;
        }, 0);
      }
      
      const totalAmount = (roomCharges * numberOfNights).toFixed(2);
      
      // Format dates as YYYY-MM-DD to avoid timezone shifts
      const formatDateForDB = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Build booking data - only include fields that exist in schema
      const numGuests = Number(data.numberOfGuests);
      const numberOfGuests = Number.isInteger(numGuests) && numGuests >= 1 ? numGuests : 1;
      let bookingData: any = {
        propertyId: bookingType === "group" ? rooms?.find(r => r.id === selectedRoomIds[0])?.propertyId : data.propertyId,
        guestId: newGuest.id,
        roomId: bookingType === "group" ? null : data.roomId,
        roomIds: bookingType === "group" ? selectedRoomIds : null,
        checkInDate: formatDateForDB(data.checkInDate),
        checkOutDate: formatDateForDB(data.checkOutDate),
        numberOfGuests,
        customPrice: data.customPrice ? data.customPrice.toString() : null,
        advanceAmount: data.advanceAmount ? data.advanceAmount.toString() : "0",
        advancePaymentMethod: data.advancePaymentMethod || "cash",
        totalAmount: totalAmount,
        status: data.status || "pending",
        source: data.source || "Walk-in",
        mealPlan: data.mealPlan || "EP",
        specialRequests: data.specialRequests || "",
        isGroupBooking: bookingType === "group",
        bedsBooked: bookingType === "group" ? selectedRoomIds.length : (bookingType === "dormitory" && data.bedsBooked ? parseInt(String(data.bedsBooked)) : null),
        travelAgentId: data.travelAgentId || null,
      };
      
      createMutation.mutate(bookingData as InsertBooking);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create guest",
        variant: "destructive",
      });
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setEditSelectedPropertyId(booking.propertyId || undefined);
    
    // Initialize booking type and room selection based on booking characteristics
    if (booking.roomIds && booking.roomIds.length > 0) {
      setEditBookingType("group");
      setEditSelectedRoomIds(booking.roomIds);
    } else {
      const assignedRoom = rooms?.find(r => r.id === booking.roomId);
      if (assignedRoom?.roomCategory === "dormitory") {
        setEditBookingType("dormitory");
      } else if (!booking.roomId) {
        // TBA booking – no room assigned yet. Auto-detect the right tab based on
        // what kinds of rooms the property actually has, so the user doesn't see
        // an empty list. Prefer dormitory if the property has no single rooms.
        const propId = booking.propertyId;
        const propRooms = rooms?.filter(r => r.propertyId === propId) || [];
        const hasSingleRooms = propRooms.some(r => r.roomCategory !== "dormitory");
        const hasDormRooms = propRooms.some(r => r.roomCategory === "dormitory");
        if (!hasSingleRooms && hasDormRooms) {
          setEditBookingType("dormitory");
        } else {
          setEditBookingType("single");
        }
      } else {
        setEditBookingType("single");
      }
      setEditSelectedRoomIds([]);
    }
    
    // Parse dates correctly without timezone shift - extract date part from ISO string directly
    const parseDateWithoutTimezone = (dateStr: string) => {
      if (!dateStr) return new Date();
      try {
        // Extract the date part from ISO string (YYYY-MM-DD) before any timezone conversion
        const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.slice(0, 10);
        const parts = dateOnly.split('-');
        if (parts.length !== 3) return new Date(dateStr);
        const [year, month, day] = parts.map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(dateStr);
        return new Date(year, month - 1, day); // month is 0-indexed in JS Date
      } catch {
        return new Date(dateStr);
      }
    };

    // Get guest details for editing
    const guest = guests?.find(g => g.id === booking.guestId);
    
    editForm.reset({
      propertyId: booking.propertyId,
      guestId: booking.guestId,
      roomId: booking.roomId || undefined,
      checkInDate: parseDateWithoutTimezone(booking.checkInDate),
      checkOutDate: parseDateWithoutTimezone(booking.checkOutDate),
      status: booking.status,
      numberOfGuests: booking.numberOfGuests,
      customPrice: booking.customPrice ? parseFloat(booking.customPrice) : null,
      advanceAmount: booking.advanceAmount ? parseFloat(booking.advanceAmount) : 0,
      advancePaymentMethod: (booking as any).advancePaymentMethod || "cash",
      specialRequests: booking.specialRequests || "",
      source: normalizeSource(booking.source),
      travelAgentId: booking.travelAgentId || undefined,
      mealPlan: booking.mealPlan || "EP",
      guestName: guest?.fullName || "",
      guestPhone: guest?.phone || "",
      guestWhatsappPhone: (guest as any)?.whatsappPhone || "",
    });
    setIsEditDialogOpen(true);
  };

  const onEditSubmit = (data: any) => {
    if (!editingBooking) return;
    
    // Validate group booking has rooms selected
    if (editBookingType === "group" && editSelectedRoomIds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one room for group booking",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate totalAmount for edited booking
    const checkInDate = new Date(data.checkInDate);
    const checkOutDate = new Date(data.checkOutDate);
    const numberOfNights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let roomCharges = 0;
    let roomIds: number[] | null = null;
    let roomId: number | null = null;
    
    if (editBookingType === "group") {
      roomIds = editSelectedRoomIds;
      const selectedRooms = rooms?.filter(r => editSelectedRoomIds.includes(r.id)) || [];
      roomCharges = selectedRooms.reduce((sum, r) => {
        const roomPrice = data.customPrice ? parseFloat(data.customPrice) / selectedRooms.length : parseFloat(r.pricePerNight.toString());
        return sum + roomPrice;
      }, 0);
    } else {
      roomId = data.roomId;
      const selectedRoom = rooms?.find(r => r.id === data.roomId);
      if (selectedRoom) {
        roomCharges = data.customPrice ? parseFloat(data.customPrice) : parseFloat(selectedRoom.pricePerNight.toString());
      }
    }
    
    const totalAmount = (roomCharges * numberOfNights).toFixed(2);
    
    // Format dates as YYYY-MM-DD to avoid timezone shifts
    const formatDateForDB = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Build update payload - only include schema fields
    const payload: Partial<InsertBooking> = {
      roomId: roomId,
      roomIds: roomIds,
      checkInDate: formatDateForDB(data.checkInDate),
      checkOutDate: formatDateForDB(data.checkOutDate),
      numberOfGuests: parseInt(data.numberOfGuests),
      customPrice: data.customPrice ? data.customPrice.toString() : null,
      advanceAmount: data.advanceAmount ? data.advanceAmount.toString() : "0",
      advancePaymentMethod: data.advancePaymentMethod || "cash",
      totalAmount: totalAmount,
      status: data.status,
      source: data.source,
      mealPlan: data.mealPlan,
      specialRequests: data.specialRequests,
      isGroupBooking: bookingType === "group",
      bedsBooked: editBookingType === "group" ? editSelectedRoomIds.length : (editBookingType === "dormitory" && data.bedsBooked ? parseInt(String(data.bedsBooked)) : null),
      travelAgentId: data.travelAgentId || null,
    };
    
    // Update guest details if name, phone, or whatsapp number changed
    if (editingBooking.guestId && (data.guestName || data.guestPhone)) {
      const guestPayload: any = {};
      if (data.guestName) guestPayload.fullName = data.guestName;
      if (data.guestPhone) guestPayload.phone = data.guestPhone;
      guestPayload.whatsappPhone = data.guestWhatsappPhone || null;
      
      // Update guest first, then update booking
      apiRequest(`/api/guests/${editingBooking.guestId}`, "PATCH", guestPayload)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/guests"] });
          updateBookingMutation.mutate({ id: editingBooking.id, data: payload });
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to update guest details: " + error.message,
            variant: "destructive",
          });
        });
    } else {
      updateBookingMutation.mutate({ id: editingBooking.id, data: payload });
    }
  };

  const guestMap = useMemo(() => {
    const map = new Map<number, Guest>();
    guests?.forEach(g => map.set(g.id, g));
    return map;
  }, [guests]);

  const propertyMap = useMemo(() => {
    const map = new Map<number, Property>();
    properties?.forEach(p => map.set(p.id, p));
    return map;
  }, [properties]);

  const roomMap = useMemo(() => {
    const map = new Map<number, Room>();
    rooms?.forEach(r => map.set(r.id, r));
    return map;
  }, [rooms]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings;
  }, [bookings]);

  // Counts come from the server (across all pages, not just current page)
  const bookingCounts = {
    all: (bookingsResponse?.counts?.active ?? 0) + (bookingsResponse?.counts?.completed ?? 0) + (bookingsResponse?.counts?.cancelled ?? 0) + (bookingsResponse?.counts?.no_show ?? 0),
    active: bookingsResponse?.counts?.active ?? 0,
    completed: bookingsResponse?.counts?.completed ?? 0,
    cancelled: bookingsResponse?.counts?.cancelled ?? 0,
    no_show: bookingsResponse?.counts?.no_show ?? 0,
  };
  const totalPages = Math.ceil((bookingsResponse?.total ?? 0) / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-2 mb-6">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-md" />)}
        </div>
        <div className="rounded-lg border overflow-hidden">
          <Skeleton className="h-12 w-full" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-t">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 md:p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Bookings</h1>
            <p className="text-muted-foreground text-lg">Manage reservations and check-ins seamlessly</p>
          </div>
        </div>

        {/* Compact Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search guest, property, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              data-testid="input-search-bookings"
            />
          </div>

          {/* Property Filter Dropdown */}
          {properties && properties.length > 1 && (
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="h-9 w-[180px]" data-testid="select-property-filter">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Quick Date Hotkeys */}
          {(() => {
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const tomorrowStr = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
            const setQuickDate = (d: string) => {
              if (checkinDateFilter === d) {
                setCheckinDateFilter("");
              } else {
                setCheckinDateFilter(d);
                setDateFrom("");
                setDateTo("");
              }
            };
            return (
              <>
                <Button
                  size="sm"
                  variant={checkinDateFilter === todayStr ? "default" : "outline"}
                  onClick={() => setQuickDate(todayStr)}
                  className="h-9 px-3 text-xs font-medium"
                  data-testid="button-filter-today"
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={checkinDateFilter === tomorrowStr ? "default" : "outline"}
                  onClick={() => setQuickDate(tomorrowStr)}
                  className="h-9 px-3 text-xs font-medium"
                  data-testid="button-filter-tomorrow"
                >
                  Tomorrow
                </Button>
              </>
            );
          })()}
          
          {/* Check-in Date Filter (calendar picker) */}
          <div className="flex items-center gap-1">
            <label htmlFor="checkin-date" className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background cursor-pointer hover:border-ring transition-colors">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                id="checkin-date"
                type="date"
                value={checkinDateFilter}
                onChange={(e) => { setCheckinDateFilter(e.target.value); setDateFrom(""); setDateTo(""); }}
                className="border-none outline-none bg-transparent text-sm w-[110px] cursor-pointer"
                data-testid="input-checkin-date-filter"
              />
            </label>
            {checkinDateFilter && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCheckinDateFilter("")}
                className="h-9 w-9"
                data-testid="button-clear-date-filter"
                title="Clear date filter"
              >
                <span className="text-sm">✕</span>
              </Button>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="date-from" className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background cursor-pointer hover:border-ring transition-colors">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border-none outline-none bg-transparent text-sm w-[110px] cursor-pointer"
                data-testid="input-date-from-filter"
                title="From date"
              />
            </label>
            <span className="text-muted-foreground text-sm">–</span>
            <label htmlFor="date-to" className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background cursor-pointer hover:border-ring transition-colors">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border-none outline-none bg-transparent text-sm w-[110px] cursor-pointer"
                data-testid="input-date-to-filter"
                title="To date"
              />
            </label>
            {(dateFrom || dateTo) && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="h-9 w-9"
                data-testid="button-clear-date-range-filter"
                title="Clear date range"
              >
                <span className="text-sm">✕</span>
              </Button>
            )}
          </div>

          {/* Filter Badge */}
          {(searchQuery || checkinDateFilter || dateFrom || dateTo || (propertyFilter && propertyFilter !== "all")) && (
            <Badge variant="secondary" className="h-7">
              {(searchQuery ? 1 : 0) + (checkinDateFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0) + (propertyFilter && propertyFilter !== "all" ? 1 : 0)} filter{(searchQuery ? 1 : 0) + (checkinDateFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0) + (propertyFilter && propertyFilter !== "all" ? 1 : 0) !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end mb-6">
        <Dialog 
            open={isDialogOpen} 
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                form.reset();
                guestDataRef.current = { fullName: "", phone: "", email: "", idProofImage: "" };
                guestInputResetKey.current += 1;
                setBookingType("single");
                setSelectedRoomIds([]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-add-booking">
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>
                Fill in guest details and select room(s) to create a new booking
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.log("Form validation errors:", errors);
                toast({
                  title: "Form Validation Error",
                  description: "Please check all required fields",
                  variant: "destructive",
                });
              })} className="space-y-4 pb-4">
                <div className="space-y-3 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Guest Details
                    <Badge variant="destructive" className="ml-auto text-xs">Required</Badge>
                  </h3>
                  <GuestInputFields
                    guestDataRef={guestDataRef}
                    resetKey={guestInputResetKey.current}
                    validationAttempted={validationAttempted}
                  />
                </div>

                {/* Date Selection - Moved before room selection */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="checkInDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value).toISOString().slice(0, 10) : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-booking-checkin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="checkOutDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-out Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value).toISOString().slice(0, 10) : ""}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-booking-checkout"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Property Selection */}
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          form.setValue("roomId", undefined);
                        }}
                        value={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name} - {property.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Tabs value={bookingType} onValueChange={(value) => setBookingType(value as "single" | "group" | "dormitory")} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="single" data-testid="tab-single-room">Single Room</TabsTrigger>
                    <TabsTrigger value="dormitory" data-testid="tab-dormitory">Dormitory</TabsTrigger>
                    <TabsTrigger value="group" data-testid="tab-group-booking">Group Booking</TabsTrigger>
                  </TabsList>
                  <TabsContent value="single" className="mt-4">
                    <FormField
                      control={form.control}
                      name="roomId"
                      render={({ field }) => {
                        const availableSingleRooms = getRoomsForBookingType("single", { isEditMode: false });
                        const datesSelected = !!(checkInDate && checkOutDate && checkInDate < checkOutDate);
                        const loadingAvailability = datesSelected && isAvailabilityFetching;
                        const allSingleRoomsForProperty = rooms?.filter(r =>
                          r.roomCategory !== "dormitory" &&
                          (!selectedPropertyId || r.propertyId === selectedPropertyId)
                        ) ?? [];
                        const noRoomsAvailable = datesSelected && !isAvailabilityFetching && roomAvailability && availableSingleRooms.length === 0 && allSingleRoomsForProperty.length === 0;
                        return (
                          <FormItem>
                            <FormLabel>Room</FormLabel>
                            {noRoomsAvailable ? (
                              <div className="p-4 border border-dashed border-orange-300 rounded-md bg-orange-50 dark:bg-orange-950/20 text-center">
                                <p className="text-sm font-medium text-orange-700 dark:text-orange-400">No rooms available for the selected dates</p>
                                <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">All rooms are booked for this period. Try different dates or a different property.</p>
                              </div>
                            ) : (
                              <Select
                                onValueChange={(value) => {
                                  const roomId = parseInt(value);
                                  field.onChange(roomId);
                                }}
                                value={field.value ? field.value.toString() : undefined}
                                disabled={!selectedPropertyId || loadingAvailability}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-booking-room">
                                    <SelectValue placeholder={
                                      !selectedPropertyId ? "Select a property first" :
                                      loadingAvailability ? "Checking availability..." :
                                      "Select available room"
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(() => {
                                    const datesSet = !!(checkInDate && checkOutDate && checkInDate < checkOutDate);
                                    const conflictMap = new Map(
                                      (roomAvailability ?? [])
                                        .filter(a => a.available === 0 && a.conflictBookingId)
                                        .map(a => [a.roomId, a])
                                    );
                                    const allPropertySingleRooms = rooms?.filter(r =>
                                      r.roomCategory !== "dormitory" &&
                                      (!selectedPropertyId || r.propertyId === selectedPropertyId)
                                    ) ?? [];
                                    const unavailableRooms = datesSet
                                      ? allPropertySingleRooms.filter(r => !availableSingleRooms.find(a => a.id === r.id))
                                      : [];
                                    return (
                                      <>
                                        {availableSingleRooms.map((room) => {
                                          const roomDescription = room.roomType || "Standard";
                                          return (
                                            <SelectItem key={room.id} value={room.id.toString()}>
                                              Room {room.roomNumber} ({roomDescription}) - ₹{room.pricePerNight}/night
                                            </SelectItem>
                                          );
                                        })}
                                        {unavailableRooms.length > 0 && (
                                          <>
                                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                                              Occupied / Unavailable
                                            </div>
                                            {unavailableRooms.map((room) => {
                                              const conflict = conflictMap.get(room.id);
                                              const roomDescription = room.roomType || "Standard";
                                              const conflictLabel = conflict
                                                ? `Booked ${conflict.conflictCheckIn ? String(conflict.conflictCheckIn).slice(0, 10) : ''} – ${conflict.conflictCheckOut ? String(conflict.conflictCheckOut).slice(0, 10) : ''}`
                                                : "Unavailable";
                                              return (
                                                <SelectItem
                                                  key={room.id}
                                                  value={room.id.toString()}
                                                  disabled
                                                  className="opacity-50 text-muted-foreground"
                                                >
                                                  Room {room.roomNumber} ({roomDescription}) — {conflictLabel}
                                                </SelectItem>
                                              );
                                            })}
                                          </>
                                        )}
                                      </>
                                    );
                                  })()}
                                </SelectContent>
                              </Select>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </TabsContent>

                  {/* DORMITORY TAB - For booking dorm beds */}
                  <TabsContent value="dormitory" className="mt-4">
                    <FormField
                      control={form.control}
                      name="roomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dormitory Room</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              const roomId = parseInt(value);
                              field.onChange(roomId);
                            }}
                            value={field.value ? field.value.toString() : undefined}
                            disabled={!selectedPropertyId}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-dormitory-room">
                                <SelectValue placeholder={selectedPropertyId ? "Select dormitory room" : "Select a property first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getRoomsForBookingType("dormitory", { isEditMode: false }).map((room) => {
                                return (
                                  <SelectItem key={room.id} value={room.id.toString()}>
                                    Room {room.roomNumber} (Dormitory) - ₹{room.pricePerNight}/bed/night
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Bed selection UI for dormitory */}
                    {selectedRoom?.roomCategory === "dormitory" && (
                      <div className="space-y-3">
                        {bedInventory && (
                          <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium">
                              {bedInventory.reservedBeds > 0 
                                ? `${bedInventory.reservedBeds} of ${bedInventory.totalBeds} beds occupied • ${bedInventory.remainingBeds} beds available`
                                : `All ${bedInventory.totalBeds} beds available`
                              }
                            </p>
                          </div>
                        )}
                        
                        {bedInventory && bedInventory.remainingBeds <= 0 ? (
                          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="text-sm text-destructive font-medium">
                              This dormitory room is fully booked for the selected dates. Please choose different dates or another room.
                            </p>
                          </div>
                        ) : (
                          <FormField
                            control={form.control}
                            name="bedsBooked"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Beds to Book</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    max={bedInventory?.remainingBeds || selectedRoom.totalBeds || 6}
                                    placeholder="Enter number of beds"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      const maxBeds = bedInventory?.remainingBeds || selectedRoom.totalBeds || 6;
                                      const inputValue = parseInt(e.target.value);
                                      if (e.target.value && inputValue > maxBeds) {
                                        field.onChange(maxBeds);
                                      } else {
                                        field.onChange(e.target.value ? inputValue : "");
                                      }
                                    }}
                                    data-testid="input-beds-booked"
                                  />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">
                                  Price: ₹{selectedRoom.pricePerNight}/bed/night • Max: {bedInventory?.remainingBeds || selectedRoom.totalBeds || 6} beds
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="group" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <FormLabel>Select Rooms for Group Booking</FormLabel>
                        <Badge variant="secondary" data-testid="badge-selected-rooms">
                          {selectedRoomIds.length} room{selectedRoomIds.length !== 1 ? 's' : ''} selected
                        </Badge>
                      </div>
                      {!selectedPropertyId && (
                        <div className="border border-dashed border-border rounded-md p-6 text-center text-sm text-muted-foreground">
                          Select a property above to see available rooms
                        </div>
                      )}
                      {selectedPropertyId && !!(checkInDate && checkOutDate && checkInDate < checkOutDate) && !isAvailabilityFetching && roomAvailability && getRoomsForBookingType("group", { isEditMode: false }).length === 0 && (
                        <div className="p-4 border border-dashed border-orange-300 rounded-md bg-orange-50 dark:bg-orange-950/20 text-center">
                          <p className="text-sm font-medium text-orange-700 dark:text-orange-400">No rooms available for the selected dates</p>
                          <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">All rooms are booked for this period. Try different dates or a different property.</p>
                        </div>
                      )}
                      <div className={`border border-border rounded-md max-h-64 overflow-y-auto ${!selectedPropertyId ? 'hidden' : ''}`}>
                        <table className="w-full">
                          <thead className="bg-muted sticky top-0">
                            <tr className="border-b border-border">
                              <th className="p-2 text-left text-xs font-medium">
                                <input
                                  type="checkbox"
                                  checked={selectedRoomIds.length === getRoomsForBookingType("group", { isEditMode: false }).length && getRoomsForBookingType("group", { isEditMode: false }).length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRoomIds(getRoomsForBookingType("group", { isEditMode: false }).map(r => r.id));
                                    } else {
                                      setSelectedRoomIds([]);
                                    }
                                  }}
                                  data-testid="checkbox-select-all-rooms"
                                />
                              </th>
                              <th className="p-2 text-left text-xs font-medium">Property</th>
                              <th className="p-2 text-left text-xs font-medium">Room</th>
                              <th className="p-2 text-left text-xs font-medium">Type</th>
                              <th className="p-2 text-left text-xs font-medium">Price/Night</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getRoomsForBookingType("group", { isEditMode: false }).map((room) => {
                              const property = properties?.find(p => p.id === room.propertyId);
                              const isSelected = selectedRoomIds.includes(room.id);
                              const roomDescription = room.roomType || "Standard";
                              const priceText = `₹${room.pricePerNight}/night`;
                              return (
                                <tr 
                                  key={room.id} 
                                  className={`border-b border-border hover-elevate cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedRoomIds(selectedRoomIds.filter(id => id !== room.id));
                                    } else {
                                      setSelectedRoomIds([...selectedRoomIds, room.id]);
                                    }
                                  }}
                                  data-testid={`row-room-${room.id}`}
                                >
                                  <td className="p-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        if (e.target.checked) {
                                          setSelectedRoomIds([...selectedRoomIds, room.id]);
                                        } else {
                                          setSelectedRoomIds(selectedRoomIds.filter(id => id !== room.id));
                                        }
                                      }}
                                      data-testid={`checkbox-room-${room.id}`}
                                    />
                                  </td>
                                  <td className="p-2 text-sm">{property?.name}</td>
                                  <td className="p-2 text-sm font-mono font-semibold">{room.roomNumber}</td>
                                  <td className="p-2 text-sm text-muted-foreground">{roomDescription}</td>
                                  <td className="p-2 text-sm font-medium">{priceText}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {selectedRoomIds.length > 0 && (() => {
                        const selectedRooms = rooms?.filter(r => selectedRoomIds.includes(r.id)) || [];
                        const roomsTotal = selectedRooms.reduce((sum, r) => sum + parseFloat(r.pricePerNight.toString()), 0);
                        const cp = watchedCustomPrice ? parseFloat(String(watchedCustomPrice)) : null;
                        const displayPrice = cp && cp > 0 ? cp : roomsTotal;
                        const isCustom = cp && cp > 0;
                        return (
                          <div className="p-3 bg-muted/50 rounded-md text-sm">
                            <p className="font-medium">Group Booking Summary:</p>
                            <p className="text-muted-foreground">
                              {selectedRoomIds.length} rooms selected • Total: ₹{displayPrice}/night
                              {isCustom && <span className="ml-1 text-blue-600 dark:text-blue-400">(custom price)</span>}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Extended Stay Conflict Warning */}
                {extendedStayConflicts?.hasConflict && (
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-400 rounded-lg flex items-start gap-2" data-testid="warning-extended-stay-conflict">
                    <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Extended Stay Conflict</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        The following guest(s) are still in this room past their checkout date:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {extendedStayConflicts.conflicts.map(conflict => (
                          <li key={conflict.bookingId} className="text-xs bg-orange-50 dark:bg-orange-900/50 p-2 rounded">
                            <span className="font-medium">{conflict.guestName}</span> - Room {conflict.roomNumber}
                            <br />
                            <span className="text-muted-foreground">
                              Original checkout: {format(new Date(conflict.originalCheckout), "MMM dd")} 
                              ({conflict.daysExtended} day(s) extended)
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mt-2">
                        Please check out the current guest before confirming this booking.
                      </p>
                    </div>
                  </div>
                )}

                {/* No Rooms Available Warning for New Booking */}
                {(() => {
                  const availableRooms = getRoomsForBookingType(bookingType, { isEditMode: false });
                  const propertyHasNoRooms = selectedPropertyId && rooms?.filter(r => r.propertyId === selectedPropertyId).length === 0;
                  const hasNoRooms = availableRooms.length === 0 && roomAvailability;
                  
                  if (propertyHasNoRooms) {
                    return (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2" data-testid="warning-no-rooms-in-property">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No rooms have been set up for this property yet.</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">You need to add rooms before creating bookings.</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setLocation("/rooms")}
                          data-testid="button-go-to-rooms-from-booking"
                        >
                          Go to Rooms
                        </Button>
                      </div>
                    );
                  }

                  if (hasNoRooms) {
                    return (
                      <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2" data-testid="warning-new-booking-no-rooms">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-destructive">No Rooms Available</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            All rooms are booked for the selected dates ({checkInDate ? format(checkInDate, "MMM dd") : ""} - {checkOutDate ? format(checkOutDate, "MMM dd") : ""}). 
                            Please choose different dates or try a different room type.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })()}

                <FormField
                  control={form.control}
                  name="numberOfGuests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Guests</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                          data-testid="input-booking-guests"
                        />
                      </FormControl>
                      {/* Guest Capacity Warning */}
                      {(() => {
                        const guestCount = field.value || 0;
                        const roomId = form.watch("roomId");
                        const room = rooms?.find(r => r.id === roomId);
                        
                        if (bookingType === "single" && room && guestCount > room.maxOccupancy) {
                          return (
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md flex items-center gap-2 mt-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                Guest count ({guestCount}) exceeds room capacity ({room.maxOccupancy})
                              </p>
                            </div>
                          );
                        }
                        
                        if (bookingType === "group" && selectedRoomIds.length > 0) {
                          const totalCapacity = rooms?.filter(r => selectedRoomIds.includes(r.id))
                            .reduce((sum, r) => sum + (r.maxOccupancy || 2), 0) || 0;
                          if (guestCount > totalCapacity) {
                            return (
                              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md flex items-center gap-2 mt-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                  Guest count ({guestCount}) exceeds total capacity ({totalCapacity}) for selected rooms
                                </p>
                              </div>
                            );
                          }
                        }
                        
                        return null;
                      })()}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Price Per Night (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Leave empty for room price"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? e.target.value : null)}
                            data-testid="input-booking-custom-price"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Override room price with a custom rate
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="advanceAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advance Payment (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Enter amount"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value || "")}
                              data-testid="input-booking-advance"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="advancePaymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advance Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "cash"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-advance-method">
                                <SelectValue placeholder="Payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking Source</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "Walk-in"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-booking-source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Walk-in">Walk-in</SelectItem>
                            <SelectItem value="Online">Online</SelectItem>
                            <SelectItem value="Booking.com">Booking.com</SelectItem>
                            <SelectItem value="MMT">MMT (MakeMyTrip)</SelectItem>
                            <SelectItem value="Airbnb">Airbnb</SelectItem>
                            <SelectItem value="OTA">OTA (Other)</SelectItem>
                            <SelectItem value="Travel Agent">Travel Agent</SelectItem>
                            <SelectItem value="Others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("source") === "Travel Agent" && (
                    <FormField
                      control={form.control}
                      name="travelAgentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Travel Agent</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value ? String(field.value) : undefined}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-travel-agent">
                                <SelectValue placeholder="Select travel agent" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {travelAgents?.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id.toString()}>
                                  {agent.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              if (!selectedPropertyId) {
                                toast({
                                  title: "Property Required",
                                  description: "Please select a property first before creating a travel agent",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setIsAddAgentDialogOpen(true);
                            }}
                            className="mt-2"
                            data-testid="button-add-travel-agent"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Create New Agent
                          </Button>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="mealPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Plan</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "EP"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-booking-meal-plan">
                              <SelectValue placeholder="Select meal plan" />
                            </SelectTrigger>
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
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requirements..."
                          value={field.value || ""}
                          onChange={field.onChange}
                          data-testid="input-booking-requests"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={
                      createMutation.isPending || 
                      (getRoomsForBookingType(bookingType, { isEditMode: false }).length === 0 && roomAvailability) ||
                      (bookingType === "group" && selectedRoomIds.length === 0)
                    } 
                    data-testid="button-submit-booking"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Booking"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all" data-testid="tab-all-bookings">
            All <Badge variant="secondary" className="ml-2">{bookingCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active-bookings">
            Active <Badge variant="secondary" className="ml-2">{bookingCounts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed-bookings">
            Completed <Badge variant="secondary" className="ml-2">{bookingCounts.completed}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled-bookings">
            Cancelled <Badge variant="secondary" className="ml-2">{bookingCounts.cancelled}</Badge>
          </TabsTrigger>
          <TabsTrigger value="no_show" data-testid="tab-no-show-bookings">
            No Show {bookingCounts.no_show > 0 && <Badge variant="secondary" className="ml-2">{bookingCounts.no_show}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {!filteredBookings || filteredBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Calendar className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-semibold">{searchQuery ? "No bookings found" : "No bookings yet"}</h3>
                <p className="text-muted-foreground max-w-md">
                  {searchQuery ? "Try adjusting your search query" : "Create your first booking to get started"}
                </p>
              </div>
            </Card>
          ) : (
            <div>
              <div className="flex justify-end gap-1 mb-1">
                <button
                  onClick={() => bookingTableRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
                  className="flex items-center justify-center w-8 h-8 rounded border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Scroll left"
                  data-testid="btn-table-scroll-left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => bookingTableRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
                  className="flex items-center justify-center w-8 h-8 rounded border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Scroll right"
                  data-testid="btn-table-scroll-right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            <div ref={bookingTableRef} className="border rounded-lg overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Guest</TableHead>
                    <TableHead className="font-semibold">Property</TableHead>
                    <TableHead className="font-semibold">Room</TableHead>
                    <TableHead className="font-semibold">Check-in</TableHead>
                    <TableHead className="font-semibold">Check-out</TableHead>
                    <TableHead className="font-semibold">Guests</TableHead>
                    <TableHead className="font-semibold">Meal Plan</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Advance</TableHead>
                    <TableHead className="font-semibold">Source</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const property = propertyMap.get(booking.propertyId);
                    const guest = booking.guestId ? guestMap.get(booking.guestId) : undefined;
                    const room = booking.roomId ? roomMap.get(booking.roomId) : undefined;
                    
                    const isGroupBooking = booking.roomIds && booking.roomIds.length > 0;
                    const groupRooms = isGroupBooking && booking.roomIds
                      ? rooms?.filter((r) => booking.roomIds?.includes(r.id)) || []
                      : [];
                    
                    const roomDisplay = isGroupBooking && groupRooms.length > 0
                      ? groupRooms.map(r => `${r.roomNumber}`).join(", ")
                      : room ? room.roomNumber : "TBA";

                    const mealPlanDisplay = {
                      "EP": "EP (Room Only)",
                      "CP": "CP (with Breakfast)",
                      "MAP": "MAP (Half Board)",
                      "AP": "AP (Full Board)"
                    }[booking.mealPlan || "EP"] || booking.mealPlan;

                    return (
                      <TableRow key={booking.id} className="hover-elevate h-12" data-testid={`row-booking-${booking.id}`}>
                        <TableCell className="font-medium py-2" data-testid={`text-guest-${booking.id}`}>
                          <div className="flex items-center gap-2">
                            <div className="text-sm">
                              {guest?.fullName || "Unknown Guest"}
                              <div className="text-xs text-muted-foreground">{guest?.phone}</div>
                              {booking.specialRequests && (
                                <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1" title={booking.specialRequests} data-testid={`text-special-req-${booking.id}`}>
                                  <span>★</span>
                                  <span className="truncate max-w-[140px]">{booking.specialRequests}</span>
                                </div>
                              )}
                            </div>
                            {guest?.phone && (
                              <a 
                                href={`tel:${guest.phone}`} 
                                className="p-1 rounded hover-elevate bg-primary/10 text-primary shrink-0"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Call ${guest.fullName}`}
                                data-testid={`button-call-${booking.id}`}
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-sm" data-testid={`text-property-${booking.id}`}>
                          {property?.name || "Unknown"}
                          {booking.isGroupBooking && (
                            <Badge variant="secondary" className="ml-1 text-xs bg-blue-500 text-white">Group</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono py-2 text-sm" data-testid={`text-room-${booking.id}`}>
                          {roomDisplay}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-2 text-sm" data-testid={`text-checkin-${booking.id}`}>
                          {format(new Date(booking.checkInDate), "dd MMM")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-2 text-sm" data-testid={`text-checkout-${booking.id}`}>
                          {format(new Date(booking.checkOutDate), "dd MMM")}
                        </TableCell>
                        <TableCell className="text-center py-2 text-sm" data-testid={`text-guests-${booking.id}`}>
                          {booking.numberOfGuests}
                        </TableCell>
                        <TableCell className="font-medium py-2 text-xs" data-testid={`text-meal-plan-${booking.id}`}>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {mealPlanDisplay}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-semibold py-2 text-sm" data-testid={`text-amount-${booking.id}`}>
                          {booking.totalAmount && booking.totalAmount !== "0" ? `₹${booking.totalAmount}` : "₹-"}
                        </TableCell>
                        <TableCell className="py-2 text-sm" data-testid={`text-advance-${booking.id}`}>
                          {booking.advanceAmount && parseFloat(booking.advanceAmount) > 0 ? (
                            <span className="flex items-center gap-1">
                              <span className="font-mono text-green-600">₹{booking.advanceAmount}</span>
                              {(booking as any).advancePaymentMethod && (
                                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded">
                                  {(booking as any).advancePaymentMethod === "cash" ? "Cash" : "UPI"}
                                </span>
                              )}
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="py-2 text-sm" data-testid={`text-source-${booking.id}`}>
                          <Badge variant="outline" className="text-xs">
                            {normalizeSource(booking.source)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[booking.status as keyof typeof statusColors]} text-xs`} data-testid={`badge-status-${booking.id}`}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Status Change Dropdown - Always visible */}
                            <Select
                              value={booking.status}
                              onValueChange={(newStatus) => handleStatusChange(booking, newStatus)}
                            >
                              <SelectTrigger className="w-[110px] h-8 text-xs" data-testid={`select-status-${booking.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="checked-in">Checked In</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                {(booking.status === "pending" || booking.status === "confirmed" || booking.status === "pending_advance") && (
                                  <SelectItem value="no_show">No Show</SelectItem>
                                )}
                                {booking.status === "no_show" && (
                                  <SelectItem value="no_show" disabled>No Show</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            
                            {/* Payment Actions - Fixed width container for consistent layout */}
                            <div className="flex items-center gap-1 min-w-[160px] justify-end">
                              {booking.status === "pending_advance" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => sendAdvancePaymentMutation.mutate({ bookingId: booking.id })}
                                    disabled={sendAdvancePaymentMutation.isPending}
                                    title="Resend payment link"
                                    data-testid={`button-resend-payment-${booking.id}`}
                                  >
                                    <CreditCard className="h-3.5 w-3.5 mr-1" />
                                    Resend
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => confirmAdvancePaymentMutation.mutate({ bookingId: booking.id })}
                                    disabled={confirmAdvancePaymentMutation.isPending}
                                    title="Confirm payment received"
                                    data-testid={`button-confirm-payment-${booking.id}`}
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                    Confirm
                                  </Button>
                                </>
                              )}
                              
                              {booking.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => sendAdvancePaymentMutation.mutate({ bookingId: booking.id })}
                                  disabled={sendAdvancePaymentMutation.isPending}
                                  title="Send payment link"
                                  data-testid={`button-send-payment-${booking.id}`}
                                >
                                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                                  Pay Link
                                </Button>
                              )}
                            </div>
                            
                            {/* Icon Actions - Consistent for all */}
                            <div className="flex items-center border-l pl-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => sendCheckinLinkMutation.mutate({ bookingId: booking.id })}
                                disabled={sendCheckinLinkMutation.isPending || booking.status === "checked-in" || booking.status === "checked-out"}
                                title={booking.status === "checked-in" || booking.status === "checked-out" ? "Guest already checked in" : "Send self check-in link via WhatsApp"}
                                data-testid={`button-checkin-link-${booking.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    disabled={resendWaMutation.isPending}
                                    title="Send WhatsApp message"
                                    data-testid={`button-wa-menu-${booking.id}`}
                                  >
                                    <MessageSquare className="h-4 w-4 text-green-600" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel className="text-xs">Send via WhatsApp</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => resendWaMutation.mutate({ bookingId: booking.id, type: "confirmation" })}
                                    data-testid={`btn-wa-confirmation-${booking.id}`}
                                  >
                                    Booking Confirmation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => resendWaMutation.mutate({ bookingId: booking.id, type: "payment" })}
                                    data-testid={`btn-wa-payment-${booking.id}`}
                                  >
                                    Payment Request
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => resendWaMutation.mutate({ bookingId: booking.id, type: "checkin" })}
                                    data-testid={`btn-wa-checkin-${booking.id}`}
                                  >
                                    Check-in Link
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleEditBooking(booking)}
                                title="Edit Booking"
                                data-testid={`button-edit-booking-${booking.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setDeleteBookingId(booking.id);
                                  setDeleteDialogOpen(true);
                                }}
                                title="Delete Booking"
                                data-testid={`button-delete-booking-${booking.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-4 py-3 border-t bg-muted/20 transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, bookingsResponse?.total ?? 0)} of {bookingsResponse?.total ?? 0} bookings
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || isFetching}
                    className="px-3 py-1.5 text-sm rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-prev-page"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || isFetching}
                    className="px-3 py-1.5 text-sm rounded-md border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-next-page"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guest Check-in QR Code</DialogTitle>
            <DialogDescription>
              Share this QR code with your guest for self check-in
            </DialogDescription>
          </DialogHeader>
          {qrBookingId && (() => {
            const booking = bookings?.find(b => b.id === qrBookingId);
            const guest = guests?.find(g => g.id === booking?.guestId);
            const property = properties?.find(p => p.id === booking?.propertyId);
            if (booking && guest && property) {
              return (
                <BookingQRCode
                  bookingId={booking.id}
                  guestName={guest.fullName}
                  checkInDate={format(new Date(booking.checkInDate), "PPP")}
                  checkOutDate={format(new Date(booking.checkOutDate), "PPP")}
                  propertyName={property.name}
                />
              );
            }
            return null;
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-booking">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this booking from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBookingId && deleteBookingMutation.mutate(deleteBookingId)}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete"
            >
              {deleteBookingMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancellation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-cancel-booking">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              {(() => {
                const booking = bookings?.find(b => b.id === cancelBookingId);
                const advanceAmount = parseFloat(booking?.advanceAmount || "0");
                if (advanceAmount > 0) {
                  return `This booking has an advance payment of ₹${advanceAmount}. Choose how to handle the refund.`;
                }
                return "Confirm the cancellation of this booking.";
              })()}
            </DialogDescription>
          </DialogHeader>
          
          {(() => {
            const booking = bookings?.find(b => b.id === cancelBookingId);
            const advanceAmount = parseFloat(booking?.advanceAmount || "0");
            const guest = guests?.find(g => g.id === booking?.guestId);
            
            return (
              <div className="space-y-4 py-4">
                {/* Guest Info */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{guest?.fullName || "Guest"}</p>
                  <p className="text-sm text-muted-foreground">
                    Booking #{booking?.id} | Advance: ₹{advanceAmount}
                  </p>
                </div>

                {advanceAmount > 0 && (
                  <>
                    {/* Refund Type Selection */}
                    <div className="space-y-3">
                      <Label className="font-medium">Refund Type</Label>
                      
                      {/* Full Refund */}
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          cancellationType === "full_refund" 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setCancellationType("full_refund");
                          setRefundAmount(String(advanceAmount));
                          setCancellationCharges("0");
                        }}
                        data-testid="option-full-refund"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            cancellationType === "full_refund" ? "border-primary bg-primary" : "border-muted-foreground"
                          }`} />
                          <span className="font-medium">Full Refund</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-6">
                          Return entire ₹{advanceAmount} to customer
                        </p>
                      </div>

                      {/* Partial Refund */}
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          cancellationType === "partial_refund" 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setCancellationType("partial_refund");
                        }}
                        data-testid="option-partial-refund"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            cancellationType === "partial_refund" ? "border-primary bg-primary" : "border-muted-foreground"
                          }`} />
                          <span className="font-medium">Partial Refund</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-6">
                          Deduct cancellation charges, refund remaining
                        </p>
                        {cancellationType === "partial_refund" && (
                          <div className="mt-3 ml-6 space-y-2">
                            <div>
                              <Label className="text-xs">Cancellation Charges (₹)</Label>
                              <Input
                                type="number"
                                value={cancellationCharges}
                                onChange={(e) => {
                                  const charges = parseFloat(e.target.value) || 0;
                                  setCancellationCharges(e.target.value);
                                  setRefundAmount(String(Math.max(0, advanceAmount - charges)));
                                }}
                                placeholder="Enter charges"
                                className="h-8"
                                data-testid="input-cancellation-charges"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Refund Amount (₹)</Label>
                              <Input
                                type="number"
                                value={refundAmount}
                                readOnly
                                className="h-8 bg-muted"
                                data-testid="input-refund-amount"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* No Refund */}
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          cancellationType === "no_refund" 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setCancellationType("no_refund");
                          setCancellationCharges(String(advanceAmount));
                          setRefundAmount("0");
                        }}
                        data-testid="option-no-refund"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            cancellationType === "no_refund" ? "border-primary bg-primary" : "border-muted-foreground"
                          }`} />
                          <span className="font-medium">No Refund</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-6">
                          Keep entire ₹{advanceAmount} as cancellation income
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Cancellation Reason */}
                <div>
                  <Label>Cancellation Reason (Optional)</Label>
                  <Textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Enter reason for cancellation..."
                    className="mt-1"
                    data-testid="input-cancellation-reason"
                  />
                </div>

                {/* P&L Summary */}
                {advanceAmount > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
                    <p className="font-medium">P&L Impact:</p>
                    {parseFloat(refundAmount) > 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        → Refund Expense: ₹{refundAmount}
                      </p>
                    )}
                    {parseFloat(cancellationCharges) > 0 && (
                      <p className="text-green-600 dark:text-green-400">
                        → Cancellation Income: ₹{cancellationCharges}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCancelDialogOpen(false)}
              data-testid="button-cancel-cancellation"
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!cancelBookingId) return;
                cancelBookingMutation.mutate({
                  bookingId: cancelBookingId,
                  cancellationType,
                  cancellationCharges: parseFloat(cancellationCharges) || 0,
                  refundAmount: parseFloat(refundAmount) || 0,
                  cancellationReason,
                });
              }}
              disabled={cancelBookingMutation.isPending}
              data-testid="button-confirm-cancellation"
            >
              {cancelBookingMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── No Show Dialog ── */}
      <Dialog open={noShowDialogOpen} onOpenChange={(open) => {
        setNoShowDialogOpen(open);
        if (!open) { setNoShowBookingId(null); setNoShowChargeType("full_charge"); setNoShowCharges(""); setNoShowNotes(""); }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-no-show">
          <DialogHeader>
            <DialogTitle>Mark as No Show</DialogTitle>
            <DialogDescription>
              {(() => {
                const booking = bookings?.find(b => b.id === noShowBookingId);
                const guest = guests?.find(g => g.id === booking?.guestId);
                const advance = parseFloat(booking?.advanceAmount || "0");
                return `"${guest?.fullName || "Guest"}" did not arrive. ${advance > 0 ? `Advance paid: ₹${advance}` : "No advance was collected."}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const booking = bookings?.find(b => b.id === noShowBookingId);
            const advanceAmount = parseFloat(booking?.advanceAmount || "0");
            const guest = guests?.find(g => g.id === booking?.guestId);

            return (
              <div className="space-y-4 py-2">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{guest?.fullName || "Guest"}</p>
                  <p className="text-sm text-muted-foreground">
                    Booking #{booking?.id} · Check-in: {booking ? format(new Date(booking.checkInDate), "dd MMM yyyy") : "—"} · Advance: ₹{advanceAmount}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">No-Show Charge Policy</Label>

                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${noShowChargeType === "full_charge" ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : "border-border hover:border-purple-300"}`}
                    onClick={() => { setNoShowChargeType("full_charge"); setNoShowCharges(String(advanceAmount)); }}
                    data-testid="option-full-charge"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${noShowChargeType === "full_charge" ? "border-purple-600 bg-purple-600" : "border-muted-foreground"}`} />
                      <span className="font-medium">Full Charge</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">Keep entire advance ₹{advanceAmount} — standard Booking.com no-show policy</p>
                  </div>

                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${noShowChargeType === "partial_charge" ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : "border-border hover:border-purple-300"}`}
                    onClick={() => setNoShowChargeType("partial_charge")}
                    data-testid="option-partial-charge"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${noShowChargeType === "partial_charge" ? "border-purple-600 bg-purple-600" : "border-muted-foreground"}`} />
                      <span className="font-medium">Partial Charge</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">Keep part of the advance, refund the rest</p>
                    {noShowChargeType === "partial_charge" && (
                      <div className="mt-3 ml-6 space-y-2">
                        <Label className="text-xs">No-Show Charge Amount (₹)</Label>
                        <Input
                          type="number"
                          value={noShowCharges}
                          onChange={(e) => setNoShowCharges(e.target.value)}
                          placeholder={`Max ₹${advanceAmount}`}
                          className="h-8"
                          data-testid="input-no-show-charges"
                        />
                        {advanceAmount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Refund to guest: ₹{Math.max(0, advanceAmount - (parseFloat(noShowCharges) || 0)).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${noShowChargeType === "no_charge" ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : "border-border hover:border-purple-300"}`}
                    onClick={() => { setNoShowChargeType("no_charge"); setNoShowCharges("0"); }}
                    data-testid="option-no-charge"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${noShowChargeType === "no_charge" ? "border-purple-600 bg-purple-600" : "border-muted-foreground"}`} />
                      <span className="font-medium">No Charge</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">Refund full advance ₹{advanceAmount} to guest</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Notes (optional)</Label>
                  <Input
                    value={noShowNotes}
                    onChange={(e) => setNoShowNotes(e.target.value)}
                    placeholder="e.g. Guest called to say they're not coming"
                    data-testid="input-no-show-notes"
                  />
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-1">Reminder: also report on Booking.com</p>
                  <p>After saving here, go to your Booking.com extranet → Reservations → find the booking → Mark as No Show, so Booking.com charges the guest and does not penalise your property score.</p>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNoShowDialogOpen(false)} data-testid="button-cancel-no-show">
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                if (!noShowBookingId) return;
                noShowMutation.mutate({
                  bookingId: noShowBookingId,
                  chargeType: noShowChargeType,
                  noShowCharges: parseFloat(noShowCharges) || 0,
                  noShowNotes,
                });
              }}
              disabled={noShowMutation.isPending}
              data-testid="button-confirm-no-show"
            >
              {noShowMutation.isPending ? "Recording..." : "Confirm No Show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Travel Agent Dialog */}
      <Dialog open={isAddAgentDialogOpen} onOpenChange={setIsAddAgentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Travel Agent</DialogTitle>
            <DialogDescription>
              Create a new travel agent for {selectedPropertyId ? properties?.find(p => p.id === selectedPropertyId)?.name : "this property"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="agent-name">Agent Name *</Label>
              <Input
                id="agent-name"
                value={newAgentData.name}
                onChange={(e) => setNewAgentData({ ...newAgentData, name: e.target.value })}
                placeholder="Enter agent name"
                data-testid="input-agent-name"
              />
            </div>
            <div>
              <Label htmlFor="agent-contact">Contact Person</Label>
              <Input
                id="agent-contact"
                value={newAgentData.contactPerson}
                onChange={(e) => setNewAgentData({ ...newAgentData, contactPerson: e.target.value })}
                placeholder="Enter contact person name"
                data-testid="input-agent-contact"
              />
            </div>
            <div>
              <Label htmlFor="agent-phone">Phone</Label>
              <Input
                id="agent-phone"
                value={newAgentData.phone}
                onChange={(e) => setNewAgentData({ ...newAgentData, phone: e.target.value })}
                placeholder="Enter phone number"
                data-testid="input-agent-phone"
              />
            </div>
            <div>
              <Label htmlFor="agent-email">Email</Label>
              <Input
                id="agent-email"
                type="email"
                value={newAgentData.email}
                onChange={(e) => setNewAgentData({ ...newAgentData, email: e.target.value })}
                placeholder="Enter email address"
                data-testid="input-agent-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAgentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newAgentData.name) {
                  toast({
                    title: "Error",
                    description: "Agent name is required",
                    variant: "destructive",
                  });
                  return;
                }
                if (!selectedPropertyId) {
                  toast({
                    title: "Error",
                    description: "Please select a property in the booking form first",
                    variant: "destructive",
                  });
                  return;
                }
                createTravelAgentMutation.mutate({
                  ...newAgentData,
                  propertyId: selectedPropertyId,
                });
              }}
              disabled={createTravelAgentMutation.isPending}
              data-testid="button-submit-agent"
            >
              {createTravelAgentMutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingBooking(null);
            editForm.reset();
            setEditBookingType("single");
            setEditSelectedRoomIds([]);
            setEditSelectedPropertyId(undefined);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>

          {/* Room Stays — shown only for OTA / multi-room AioSell bookings */}
          {editingBooking?.source?.startsWith("aiosell-") && editingBookingRoomStays && editingBookingRoomStays.length > 0 && (
            <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-950/20 space-y-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                OTA Room Stays ({editingBookingRoomStays.length} room{editingBookingRoomStays.length !== 1 ? "s" : ""})
              </p>
              <div className="space-y-1">
                {editingBookingRoomStays.map((stay, idx) => (
                  <div key={stay.id} className="flex items-center justify-between text-xs bg-white dark:bg-background rounded px-2 py-1.5 border" data-testid={`room-stay-${stay.id}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-muted-foreground">#{idx + 1}</span>
                      <span>{stay.roomType || stay.aiosellRoomCode || "Room"}</span>
                      {stay.mealPlan && stay.mealPlan !== "none" && (
                        <span className="text-muted-foreground">· {stay.mealPlan}</span>
                      )}
                      {stay.adults !== null && (
                        <span className="text-muted-foreground">· {stay.adults}A{stay.children ? `+${stay.children}C` : ""}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {stay.amount && (
                        <span className="font-medium">₹{parseFloat(stay.amount).toLocaleString("en-IN")}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={stay.status === "confirmed"
                          ? "border-green-500 text-green-700 dark:text-green-400 text-[10px] px-1.5 py-0"
                          : "border-amber-500 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0"
                        }
                      >
                        {stay.status === "confirmed"
                          ? (stay.roomId ? (rooms?.find(r => r.id === stay.roomId)?.roomNumber ?? "Assigned") : "Assigned")
                          : "TBS"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pb-4">

              {/* Property selector for room allocation */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Property</label>
                <Select
                  value={editSelectedPropertyId?.toString() || ""}
                  onValueChange={(val) => {
                    const propId = parseInt(val);
                    setEditSelectedPropertyId(propId);
                    editForm.setValue("propertyId", propId);
                    editForm.setValue("roomId", undefined);
                  }}
                >
                  <SelectTrigger data-testid="select-edit-property">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={editBookingType} onValueChange={(value) => setEditBookingType(value as "single" | "group" | "dormitory")} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="single" data-testid="tab-edit-single-room">Single Room</TabsTrigger>
                  <TabsTrigger value="dormitory" data-testid="tab-edit-dormitory">Dormitory</TabsTrigger>
                  <TabsTrigger value="group" data-testid="tab-edit-group-booking">Group Booking</TabsTrigger>
                </TabsList>
                <TabsContent value="single" className="mt-4">
                  <FormField
                    control={editForm.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            const roomId = parseInt(value);
                            field.onChange(roomId);
                            const selectedRoom = rooms?.find(r => r.id === roomId);
                            if (selectedRoom) {
                              editForm.setValue("propertyId", selectedRoom.propertyId);
                              setEditSelectedPropertyId(selectedRoom.propertyId);
                            }
                          }}
                          value={field.value ? field.value.toString() : undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-booking-room">
                              <SelectValue placeholder={editSelectedPropertyId ? "Select room" : "Select a property first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* Show ALL non-dormitory rooms: available ones selectable, conflicted ones disabled with reason */}
                            {(() => {
                              const availableRooms = getRoomsForBookingType("single", { isEditMode: true, propertyId: editSelectedPropertyId });
                              const currentRoom = editingBooking?.roomId ? rooms?.find(r => r.id === editingBooking.roomId) : null;

                              // Also collect unavailable (conflicted) rooms for this property
                              const allPropertyRooms = rooms?.filter(r =>
                                r.roomCategory !== "dormitory" &&
                                (!editSelectedPropertyId || r.propertyId === editSelectedPropertyId)
                              ) ?? [];
                              const conflictMap = new Map(
                                (editRoomAvailability ?? [])
                                  .filter(a => a.available === 0 && a.conflictBookingId)
                                  .map(a => [a.roomId, a])
                              );
                              const unavailableRooms = allPropertyRooms.filter(r =>
                                !availableRooms.find(a => a.id === r.id) &&
                                r.id !== currentRoom?.id
                              );

                              const roomsToShow = [
                                ...(currentRoom && !availableRooms.find(r => r.id === currentRoom.id) ? [currentRoom] : []),
                                ...availableRooms,
                              ];

                              if (roomsToShow.length === 0 && unavailableRooms.length === 0) {
                                const dormRoomsExist = editSelectedPropertyId
                                  ? rooms?.some(r => r.propertyId === editSelectedPropertyId && r.roomCategory === "dormitory")
                                  : false;
                                return (
                                  <div className="px-3 py-6 text-center text-sm text-muted-foreground space-y-2">
                                    <p>No single rooms available for this property.</p>
                                    {dormRoomsExist && (
                                      <p className="font-medium text-primary cursor-pointer" onClick={() => setEditBookingType("dormitory")}>
                                        Switch to Dormitory tab
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <>
                                  {roomsToShow.map((room) => {
                                    const property = properties?.find(p => p.id === room.propertyId);
                                    const isCurrentRoom = editingBooking?.roomId === room.id;
                                    const roomDescription = room.roomType || "Standard";
                                    return (
                                      <SelectItem key={room.id} value={room.id.toString()}>
                                        {property?.name} - Room {room.roomNumber} ({roomDescription}) - ₹{room.pricePerNight}/night
                                        {isCurrentRoom && " (Current)"}
                                      </SelectItem>
                                    );
                                  })}
                                  {unavailableRooms.length > 0 && (
                                    <>
                                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                                        Occupied / Unavailable
                                      </div>
                                      {unavailableRooms.map((room) => {
                                        const property = properties?.find(p => p.id === room.propertyId);
                                        const conflict = conflictMap.get(room.id);
                                        const roomDescription = room.roomType || "Standard";
                                        const conflictLabel = conflict
                                          ? `Booked ${conflict.conflictCheckIn ? String(conflict.conflictCheckIn).slice(0, 10) : ''} – ${conflict.conflictCheckOut ? String(conflict.conflictCheckOut).slice(0, 10) : ''}`
                                          : "Unavailable";
                                        return (
                                          <SelectItem
                                            key={room.id}
                                            value={room.id.toString()}
                                            disabled
                                            className="opacity-50 text-muted-foreground"
                                          >
                                            Room {room.roomNumber} ({roomDescription}) — {conflictLabel}
                                          </SelectItem>
                                        );
                                      })}
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* DORMITORY TAB - For editing dorm bed bookings */}
                <TabsContent value="dormitory" className="mt-4">
                  <FormField
                    control={editForm.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dormitory Room</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            const roomId = parseInt(value);
                            field.onChange(roomId);
                            const selectedRoom = rooms?.find(r => r.id === roomId);
                            if (selectedRoom) {
                              editForm.setValue("propertyId", selectedRoom.propertyId);
                            }
                          }}
                          value={field.value ? field.value.toString() : undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-dormitory-room">
                              <SelectValue placeholder="Select dormitory room" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(() => {
                              const dormRooms = getRoomsForBookingType("dormitory", { isEditMode: true, propertyId: editSelectedPropertyId });
                              if (dormRooms.length === 0) {
                                const singleRoomsExist = editSelectedPropertyId
                                  ? rooms?.some(r => r.propertyId === editSelectedPropertyId && r.roomCategory !== "dormitory")
                                  : false;
                                return (
                                  <div className="px-3 py-6 text-center text-sm text-muted-foreground space-y-2">
                                    <p>No dormitory rooms available for this property.</p>
                                    {singleRoomsExist && (
                                      <p className="font-medium text-primary cursor-pointer" onClick={() => setEditBookingType("single")}>
                                        → Switch to Single Room tab
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return dormRooms.map((room) => {
                                const property = properties?.find(p => p.id === room.propertyId);
                                const isCurrentRoom = editingBooking?.roomId === room.id;
                                return (
                                  <SelectItem key={room.id} value={room.id.toString()}>
                                    {property?.name} - Room {room.roomNumber} (Dormitory) - ₹{room.pricePerNight}/bed/night
                                    {isCurrentRoom && " (Current)"}
                                  </SelectItem>
                                );
                              });
                            })()}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Note: Bed selection for edit mode can be added later with bed inventory API */}
                </TabsContent>

                <TabsContent value="group" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <FormLabel>Select Rooms for Group Booking</FormLabel>
                      <Badge variant="secondary" data-testid="badge-edit-selected-rooms">
                        {editSelectedRoomIds.length} room{editSelectedRoomIds.length !== 1 ? 's' : ''} selected
                      </Badge>
                    </div>
                    <div className="border border-border rounded-md max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-muted sticky top-0">
                          <tr className="border-b border-border">
                            <th className="p-2 text-left text-xs font-medium">
                              <input
                                type="checkbox"
                                checked={editSelectedRoomIds.length === getRoomsForBookingType("group", { isEditMode: true, propertyId: editSelectedPropertyId, includeRoomIds: editingBooking?.roomIds || [] }).length && getRoomsForBookingType("group", { isEditMode: true, propertyId: editSelectedPropertyId, includeRoomIds: editingBooking?.roomIds || [] }).length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditSelectedRoomIds(getRoomsForBookingType("group", { isEditMode: true, propertyId: editSelectedPropertyId, includeRoomIds: editingBooking?.roomIds || [] }).map(r => r.id));
                                  } else {
                                    setEditSelectedRoomIds([]);
                                  }
                                }}
                                data-testid="checkbox-edit-select-all-rooms"
                              />
                            </th>
                            <th className="p-2 text-left text-xs font-medium">Property</th>
                            <th className="p-2 text-left text-xs font-medium">Room</th>
                            <th className="p-2 text-left text-xs font-medium">Type</th>
                            <th className="p-2 text-left text-xs font-medium">Price/Night</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getRoomsForBookingType("group", { isEditMode: true, propertyId: editSelectedPropertyId, includeRoomIds: editingBooking?.roomIds || [] }).map((room) => {
                            const property = properties?.find(p => p.id === room.propertyId);
                            const isSelected = editSelectedRoomIds.includes(room.id);
                            const roomDescription = room.roomType || "Standard";
                            const priceText = `₹${room.pricePerNight}/night`;
                            return (
                              <tr 
                                key={room.id} 
                                className={`border-b border-border hover-elevate cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
                                onClick={() => {
                                  if (isSelected) {
                                    setEditSelectedRoomIds(editSelectedRoomIds.filter(id => id !== room.id));
                                  } else {
                                    setEditSelectedRoomIds([...editSelectedRoomIds, room.id]);
                                  }
                                }}
                                data-testid={`row-edit-room-${room.id}`}
                              >
                                <td className="p-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      if (e.target.checked) {
                                        setEditSelectedRoomIds([...editSelectedRoomIds, room.id]);
                                      } else {
                                        setEditSelectedRoomIds(editSelectedRoomIds.filter(id => id !== room.id));
                                      }
                                    }}
                                    data-testid={`checkbox-edit-room-${room.id}`}
                                  />
                                </td>
                                <td className="p-2 text-sm">{property?.name}</td>
                                <td className="p-2 text-sm font-mono font-semibold">{room.roomNumber}</td>
                                <td className="p-2 text-sm text-muted-foreground">{roomDescription}</td>
                                <td className="p-2 text-sm font-medium">{priceText}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {editSelectedRoomIds.length > 0 && (() => {
                      const selectedRooms = rooms?.filter(r => editSelectedRoomIds.includes(r.id)) || [];
                      const roomsTotal = selectedRooms.reduce((sum, r) => sum + parseFloat(r.pricePerNight.toString()), 0);
                      const cp = editWatchedCustomPrice ? parseFloat(String(editWatchedCustomPrice)) : null;
                      const displayPrice = cp && cp > 0 ? cp : roomsTotal;
                      const isCustom = cp && cp > 0;
                      return (
                        <div className="p-3 bg-muted/50 rounded-md text-sm">
                          <p className="font-medium">Group Booking Summary:</p>
                          <p className="text-muted-foreground">
                            {editSelectedRoomIds.length} rooms selected • Total: ₹{displayPrice}/night
                            {isCustom && <span className="ml-1 text-blue-600 dark:text-blue-400">(custom price)</span>}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>
              </Tabs>

              {/* No Rooms Available Warning */}
              {(() => {
                const availableRooms = getRoomsForBookingType(editBookingType, { isEditMode: true, propertyId: editSelectedPropertyId });
                const hasNoRooms = availableRooms.length === 0 && editRoomAvailability;
                const isCurrentRoomUnavailable = editingBooking?.roomId && 
                  !availableRooms.find(r => r.id === editingBooking.roomId) &&
                  editRoomAvailability;
                
                if (hasNoRooms) {
                  return (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2" data-testid="warning-no-rooms">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">No Rooms Available</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          All rooms are booked for the selected dates. Please change the check-in/check-out dates or try a different room type.
                        </p>
                      </div>
                    </div>
                  );
                }
                
                if (isCurrentRoomUnavailable) {
                  return (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2" data-testid="warning-room-conflict">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Room Conflict Detected</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          The current room is not available for the new dates. Please select a different room from the list above.
                        </p>
                      </div>
                    </div>
                  );
                }
                
                return null;
              })()}
              
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold text-sm mb-3">Booking Dates</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="checkInDate"
                    render={({ field }) => {
                      const formatDateForInput = (date: Date | string | null | undefined): string => {
                        if (!date) return "";
                        try {
                          const d = date instanceof Date ? date : new Date(date);
                          if (isNaN(d.getTime())) return "";
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          return `${year}-${month}-${day}`;
                        } catch {
                          return "";
                        }
                      };
                      return (
                        <FormItem>
                          <FormLabel>Check-in Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={formatDateForInput(field.value)}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                              data-testid="input-edit-booking-checkin"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={editForm.control}
                    name="checkOutDate"
                    render={({ field }) => {
                      const formatDateForInput = (date: Date | string | null | undefined): string => {
                        if (!date) return "";
                        try {
                          const d = date instanceof Date ? date : new Date(date);
                          if (isNaN(d.getTime())) return "";
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          return `${year}-${month}-${day}`;
                        } catch {
                          return "";
                        }
                      };
                      return (
                        <FormItem>
                          <FormLabel>Check-out Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={formatDateForInput(field.value)}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                              data-testid="input-edit-booking-checkout"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold text-sm mb-3">Guest Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="guestName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guest Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter guest name"
                            value={field.value || ""}
                            onChange={field.onChange}
                            data-testid="input-edit-guest-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="guestPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guest Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter phone number"
                            value={field.value || ""}
                            onChange={field.onChange}
                            data-testid="input-edit-guest-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="guestWhatsappPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          WhatsApp Number
                          <span className="text-xs text-muted-foreground font-normal">(if different)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter WhatsApp number"
                            value={field.value || ""}
                            onChange={field.onChange}
                            data-testid="input-edit-guest-whatsapp"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold text-sm mb-3">Booking Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "pending"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-booking-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="checked-in">Checked In</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="numberOfGuests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Guests</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                field.onChange(val === "" ? "" : parseInt(val));
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value === "" || parseInt(e.target.value) < 1) {
                                field.onChange(1);
                              }
                            }}
                            data-testid="input-edit-booking-guests"
                          />
                        </FormControl>
                        {/* Guest Capacity Warning for Edit Form */}
                        {(() => {
                          const guestCount = field.value || 0;
                          const roomId = editForm.watch("roomId");
                          const room = rooms?.find(r => r.id === roomId);
                          
                          if (editBookingType === "single" && room && guestCount > room.maxOccupancy) {
                            return (
                              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md flex items-center gap-2 mt-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                  Guest count ({guestCount}) exceeds room capacity ({room.maxOccupancy})
                                </p>
                              </div>
                            );
                          }
                          
                          if (editBookingType === "group" && editSelectedRoomIds.length > 0) {
                            const totalCapacity = rooms?.filter(r => editSelectedRoomIds.includes(r.id))
                              .reduce((sum, r) => sum + (r.maxOccupancy || 2), 0) || 0;
                            if (guestCount > totalCapacity) {
                              return (
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md flex items-center gap-2 mt-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                  <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Guest count ({guestCount}) exceeds total capacity ({totalCapacity}) for selected rooms
                                  </p>
                                </div>
                              );
                            }
                          }
                          
                          return null;
                        })()}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold text-sm mb-3">Pricing & Payments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="customPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Price Per Night (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="Leave empty for room price"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                field.onChange(val === "" ? null : val);
                              }
                            }}
                            data-testid="input-edit-booking-custom-price"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Override room price with a custom rate
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormField
                      control={editForm.control}
                      name="advanceAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advance Payment (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                  field.onChange(val);
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value === "") {
                                  field.onChange("0");
                                }
                              }}
                              data-testid="input-edit-booking-advance"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="advancePaymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Advance Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "cash"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-advance-method">
                                <SelectValue placeholder="Payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold text-sm mb-3">Booking Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking Source</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "walk-in"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-booking-source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Walk-in">Walk-in</SelectItem>
                            <SelectItem value="Online">Online</SelectItem>
                            <SelectItem value="Booking.com">Booking.com</SelectItem>
                            <SelectItem value="MMT">MMT (MakeMyTrip)</SelectItem>
                            <SelectItem value="Airbnb">Airbnb</SelectItem>
                            <SelectItem value="OTA">OTA (Other)</SelectItem>
                            <SelectItem value="Travel Agent">Travel Agent</SelectItem>
                            <SelectItem value="Others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="mealPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Plan</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "EP"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-booking-meal-plan">
                              <SelectValue placeholder="Select meal plan" />
                            </SelectTrigger>
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
                    )}
                  />
                </div>
              </div>
              <FormField
                control={editForm.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requests</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requirements..."
                        value={field.value || ""}
                        onChange={field.onChange}
                        data-testid="input-edit-booking-requests"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={
                    updateBookingMutation.isPending ||
                    (getRoomsForBookingType(editBookingType, { isEditMode: true }).length === 0 && editRoomAvailability) ||
                    (editBookingType === "group" && editSelectedRoomIds.length === 0)
                  } 
                  data-testid="button-submit-edit-booking"
                >
                  {updateBookingMutation.isPending ? "Updating..." : "Update Booking"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout - Bill Summary</DialogTitle>
          </DialogHeader>
          {checkoutBookingId && <CheckoutBillSummary 
            bookingId={checkoutBookingId} 
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            onClose={() => setCheckoutDialogOpen(false)}
          />}
        </DialogContent>
      </Dialog>

      {/* Check-in ID Verification Dialog */}
      <Dialog open={checkinDialogOpen} onOpenChange={(open) => {
        setCheckinDialogOpen(open);
        if (!open) {
          setCheckinBookingId(null);
          setCheckinIdProof(null);
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
              primaryGuestName={(() => {
                const booking = bookings?.find(b => b.id === checkinBookingId);
                const guest = booking ? guests?.find(g => g.id === booking.guestId) : null;
                return guest?.fullName || "";
              })()}
              primaryPhone={(() => {
                const booking = bookings?.find(b => b.id === checkinBookingId);
                const guest = booking ? guests?.find(g => g.id === booking.guestId) : null;
                return guest?.phone || "";
              })()}
              primaryEmail={(() => {
                const booking = bookings?.find(b => b.id === checkinBookingId);
                const guest = booking ? guests?.find(g => g.id === booking.guestId) : null;
                return guest?.email || "";
              })()}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCheckinDialogOpen(false);
                setCheckinBookingId(null);
                setCheckinIdProof(null);
                setCheckinGuestEntries([]);
              }}
              data-testid="button-cancel-checkin"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const hasValidGuest = checkinGuestEntries.some(g => g.guestName && g.idProofFront);
                if (!hasValidGuest) {
                  toast({
                    title: "ID Required",
                    description: "Please upload at least the front ID photo for the primary guest",
                    variant: "destructive",
                  });
                  return;
                }
                
                if (checkinBookingId) {
                  try {
                    const booking = bookings?.find(b => b.id === checkinBookingId);
                    if (!booking) {
                      toast({ title: "Error", description: "Booking not found", variant: "destructive" });
                      return;
                    }

                    const primaryGuest = checkinGuestEntries.find(g => g.isPrimary) || checkinGuestEntries[0];
                    if (primaryGuest) {
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
                    queryClient.invalidateQueries({ queryKey: ["/api/bookings", checkinBookingId, "guests"] });

                    updateStatusMutation.mutate({ 
                      id: checkinBookingId, 
                      status: "checked-in" 
                    });
                    
                    setCheckinDialogOpen(false);
                    setCheckinBookingId(null);
                    setCheckinIdProof(null);
                    setCheckinGuestEntries([]);
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to update guest information",
                      variant: "destructive",
                    });
                  }
                }
              }}
              disabled={!checkinGuestEntries.some(g => g.guestName && g.idProofFront)}
              data-testid="button-confirm-checkin"
            >
              Complete Check-In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Same-Day Checkout Warning Dialog */}
      <AlertDialog open={sameDayWarningOpen} onOpenChange={setSameDayWarningOpen}>
        <AlertDialogContent data-testid="dialog-same-day-warning">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Calendar className="h-5 w-5" />
              Same-Day Checkout Warning
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This guest's checkout date is <span className="font-semibold">{extendCheckoutDate ? format(extendCheckoutDate, "MMM dd, yyyy") : "today"}</span>. 
                  Checking in now means the guest must check out today.
                </p>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    No additional nights will be charged for this stay.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel onClick={() => {
              setSameDayWarningOpen(false);
              setSameDayBookingId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                // Proceed with same-day checkout
                setSameDayWarningOpen(false);
                if (sameDayBookingId) {
                  const booking = bookings?.find(b => b.id === sameDayBookingId);
                  if (booking?.guestId) {
                    const guest = guests?.find(g => g.id === booking.guestId);
                    if (guest?.idProofImage) {
                      updateStatusMutation.mutate({ id: sameDayBookingId, status: "checked-in" });
                    } else {
                      setCheckinBookingId(sameDayBookingId);
                      setCheckinIdProof(null);
                      setCheckinDialogOpen(true);
                    }
                  }
                }
                setSameDayBookingId(null);
              }}
              data-testid="button-proceed-same-day"
            >
              Proceed with Same-Day Checkout
            </Button>
            <Button
              variant="default"
              onClick={() => {
                // Extend checkout to tomorrow
                setSameDayWarningOpen(false);
                if (sameDayBookingId) {
                  const booking = bookings?.find(b => b.id === sameDayBookingId);
                  if (booking) {
                    setEditingBooking(booking);
                    setIsEditDialogOpen(true);
                  }
                }
                setSameDayBookingId(null);
              }}
              data-testid="button-extend-stay"
            >
              Extend Stay (Edit Booking)
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Checkout Bill Summary Component
function CheckoutBillSummary({ 
  bookingId, 
  paymentMethod, 
  setPaymentMethod,
  onClose 
}: { 
  bookingId: number;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [gstOnRooms, setGstOnRooms] = useState<boolean>(true);
  const [gstOnFood, setGstOnFood] = useState<boolean>(false);
  const [includeServiceCharge, setIncludeServiceCharge] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [dueDate, setDueDate] = useState<string>("");
  const [pendingReason, setPendingReason] = useState<string>("");
  const [cashSplit, setCashSplit] = useState<string>("");
  const [onlineSplit, setOnlineSplit] = useState<string>("");

  // Fetch this specific booking by ID (avoids loading the entire paginated list)
  const { data: booking } = useQuery<Booking>({
    queryKey: ["/api/bookings", bookingId],
    enabled: !!bookingId,
  });

  // Fetch related data
  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const { data: rooms } = useQuery<any[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: guests } = useQuery<any[]>({
    queryKey: ["/api/guests"],
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  const { data: extraServices } = useQuery<any[]>({
    queryKey: ["/api/extra-services"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("/api/bookings/checkout", "POST", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: "Checkout completed successfully",
      });
      if (data?.walletWarning) {
        setTimeout(() => {
          toast({ title: "Wallet not updated", description: data.walletWarning, variant: "destructive" });
        }, 500);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process checkout",
        variant: "destructive",
      });
    },
  });

  if (!booking) {
    return <div className="p-4">Loading booking details...</div>;
  }

  const property = properties?.find(p => p.id === booking.propertyId);
  const guest = guests?.find(g => g.id === booking.guestId);

  // Handle both single and group bookings
  const isGroupBooking = booking.isGroupBooking;
  const bookingRooms = isGroupBooking 
    ? rooms?.filter(r => booking.roomIds?.includes(r.id)) || []
    : rooms?.filter(r => r.id === booking.roomId) || [];

  // Filter orders and extras for this booking
  const bookingOrders = orders?.filter(o => o.bookingId === bookingId) || [];
  const bookingExtras = extraServices?.filter(e => e.bookingId === bookingId) || [];

  // Calculate charges
  const checkInDate = new Date(booking.checkInDate);
  const checkOutDate = new Date(booking.checkOutDate);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate room charges for group or single booking
  const roomCharges = isGroupBooking
    ? bookingRooms.reduce((total, room) => {
        const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) / bookingRooms.length : parseFloat(room.pricePerNight);
        return total + (pricePerNight * nights);
      }, 0)
    : (() => {
        const room = bookingRooms[0];
        const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) : (room ? parseFloat(room.pricePerNight) : 0);
        return pricePerNight * nights;
      })();
  
  // Calculate actual price per night for display (considering custom price)
  const displayPricePerNight = isGroupBooking
    ? 0 // For group bookings, don't show individual price per night
    : booking.customPrice 
      ? parseFloat(booking.customPrice)
      : (bookingRooms[0] ? parseFloat(bookingRooms[0].pricePerNight) : 0);

  const foodCharges = bookingOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);
  const extraCharges = bookingExtras.reduce((sum, extra) => sum + parseFloat(extra.amount || "0"), 0);

  const subtotal = roomCharges + foodCharges + extraCharges;
  
  // Apply GST separately on rooms and food
  const gstRate = 5;
  const roomGst = gstOnRooms ? (roomCharges * gstRate) / 100 : 0;
  const foodGst = gstOnFood ? (foodCharges * gstRate) / 100 : 0;
  const gstAmount = roomGst + foodGst;
  const serviceChargeRate = 10;
  const serviceChargeAmount = includeServiceCharge ? (roomCharges * serviceChargeRate) / 100 : 0;
  const totalAmount = subtotal + gstAmount + serviceChargeAmount;

  const advancePaid = parseFloat(booking.advanceAmount || "0");
  const balanceAmount = totalAmount - advancePaid;

  const handleCheckout = () => {
    if (paymentStatus === "paid" && paymentMethod === "split") {
      const cash = parseFloat(cashSplit) || 0;
      const online = parseFloat(onlineSplit) || 0;
      if (cash <= 0 || online <= 0) {
        toast({ title: "Enter both cash and online amounts for split payment", variant: "destructive" });
        return;
      }
      const diff = Math.abs(cash + online - balanceAmount);
      if (diff > 0.01) {
        toast({ title: `Split amounts must add up to ₹${balanceAmount.toFixed(2)}`, variant: "destructive" });
        return;
      }
      checkoutMutation.mutate({
        bookingId,
        cashAmount: cash,
        onlineAmount: online,
        paymentStatus,
        dueDate: null,
        pendingReason: null,
        gstOnRooms,
        gstOnFood,
        includeServiceCharge,
      });
    } else {
      checkoutMutation.mutate({
        bookingId,
        paymentMethod: paymentStatus === "paid" ? paymentMethod : null,
        paymentStatus,
        dueDate: paymentStatus === "pending" && dueDate ? dueDate : null,
        pendingReason: paymentStatus === "pending" ? pendingReason : null,
        gstOnRooms,
        gstOnFood,
        includeServiceCharge,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Guest and Room Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{guest?.fullName}</h3>
            <p className="text-sm text-muted-foreground">{property?.name}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <p className="text-sm font-medium">
                {bookingRooms.length > 0 
                  ? `Room ${bookingRooms.map(r => r.roomNumber).join(', ')}`
                  : "Room TBA"}
              </p>
              {isGroupBooking && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Group Booking
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <span>{format(checkInDate, "PPP")}</span>
          <span className="mx-2">→</span>
          <span>{format(checkOutDate, "PPP")}</span>
        </div>
      </div>

      {/* Checkout Warnings */}
      {(() => {
        const pendingOrders = bookingOrders.filter(o => o.status === 'pending' || o.status === 'preparing');
        const unpaidExtras = bookingExtras.filter(e => !e.isPaid);
        const warnings = [];
        
        if (pendingOrders.length > 0) {
          warnings.push(
            <div key="pending-orders" className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending Food Orders</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingOrders.length} order{pendingOrders.length > 1 ? 's are' : ' is'} still pending or being prepared. 
                  Consider completing these before checkout.
                </p>
              </div>
            </div>
          );
        }
        
        if (unpaidExtras.length > 0) {
          const unpaidTotal = unpaidExtras.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
          warnings.push(
            <div key="unpaid-extras" className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Unpaid Extra Services</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{unpaidTotal.toFixed(2)} in extra services will be added to the final bill.
                </p>
              </div>
            </div>
          );
        }
        
        if (warnings.length > 0) {
          return <div className="space-y-2">{warnings}</div>;
        }
        return null;
      })()}

      {/* Bill Details */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold mb-3">Bill Details</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              {isGroupBooking 
                ? `Room Charges (${bookingRooms.length} rooms × ${nights} nights)`
                : `Room Charges (${nights} × ₹${displayPricePerNight.toFixed(2)})`}
            </span>
            <span className="font-mono" data-testid="text-checkout-room-charges">₹{roomCharges.toFixed(2)}</span>
          </div>
          
          {foodCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span>Food & Beverage ({bookingOrders.length} order{bookingOrders.length !== 1 ? 's' : ''})</span>
              <span className="font-mono" data-testid="text-checkout-food-charges">₹{foodCharges.toFixed(2)}</span>
            </div>
          )}
          
          {extraCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span>Extra Services ({bookingExtras.length} service{bookingExtras.length !== 1 ? 's' : ''})</span>
              <span className="font-mono" data-testid="text-checkout-extra-charges">₹{extraCharges.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
          </div>

          {gstOnRooms && roomGst > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>GST on Room ({gstRate}%)</span>
              <span className="font-mono">₹{roomGst.toFixed(2)}</span>
            </div>
          )}
          
          {gstOnFood && foodGst > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>GST on Food ({gstRate}%)</span>
              <span className="font-mono">₹{foodGst.toFixed(2)}</span>
            </div>
          )}

          {includeServiceCharge && (
            <div className="flex justify-between text-sm">
              <span>Service Charge ({serviceChargeRate}%)</span>
              <span className="font-mono">₹{serviceChargeAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total Amount</span>
              <span className="font-mono text-lg" data-testid="text-checkout-total">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {advancePaid > 0 && (
            <div className="flex justify-between text-sm text-chart-2">
              <span>Advance Paid</span>
              <span className="font-mono" data-testid="text-checkout-advance">-₹{advancePaid.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Balance Due</span>
              <span className="font-mono text-primary" data-testid="text-checkout-balance">₹{balanceAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tax & Charge Options */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-sm">GST & Additional Charges</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="gst-on-rooms"
              checked={gstOnRooms}
              onCheckedChange={(checked) => setGstOnRooms(checked as boolean)}
              data-testid="checkbox-gst-on-rooms"
            />
            <Label htmlFor="gst-on-rooms" className="cursor-pointer font-normal">
              GST on Room Charges (5%)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="gst-on-food"
              checked={gstOnFood}
              onCheckedChange={(checked) => setGstOnFood(checked as boolean)}
              data-testid="checkbox-gst-on-food"
            />
            <Label htmlFor="gst-on-food" className="cursor-pointer font-normal">
              GST on Food Charges (5%)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-service-charge"
              checked={includeServiceCharge}
              onCheckedChange={(checked) => setIncludeServiceCharge(checked as boolean)}
              data-testid="checkbox-include-service-charge"
            />
            <Label htmlFor="include-service-charge" className="cursor-pointer font-normal">
              Include Service Charge (10%)
            </Label>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Status</label>
        <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as "paid" | "pending")}>
          <SelectTrigger data-testid="select-payment-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment Method - Only show when Paid */}
      {paymentStatus === "paid" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setCashSplit(""); setOnlineSplit(""); }}>
              <SelectTrigger data-testid="select-checkout-payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="split">Split (Cash + UPI)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "split" && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Enter split amounts (total must equal ₹{balanceAmount.toFixed(2)})</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Cash (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="0.00"
                    value={cashSplit}
                    onChange={(e) => {
                      setCashSplit(e.target.value);
                      const cash = parseFloat(e.target.value) || 0;
                      const remaining = balanceAmount - cash;
                      setOnlineSplit(remaining > 0 ? remaining.toFixed(2) : "");
                    }}
                    data-testid="input-split-cash"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">UPI / Online (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="0.00"
                    value={onlineSplit}
                    onChange={(e) => {
                      setOnlineSplit(e.target.value);
                      const online = parseFloat(e.target.value) || 0;
                      const remaining = balanceAmount - online;
                      setCashSplit(remaining > 0 ? remaining.toFixed(2) : "");
                    }}
                    data-testid="input-split-online"
                  />
                </div>
              </div>
              {cashSplit && onlineSplit && (
                <p className={`text-xs ${Math.abs((parseFloat(cashSplit)||0) + (parseFloat(onlineSplit)||0) - balanceAmount) < 0.01 ? "text-green-600" : "text-red-500"}`}>
                  Total: ₹{((parseFloat(cashSplit)||0) + (parseFloat(onlineSplit)||0)).toFixed(2)}
                  {Math.abs((parseFloat(cashSplit)||0) + (parseFloat(onlineSplit)||0) - balanceAmount) < 0.01
                    ? " ✓ Matches balance"
                    : ` (needs ₹${balanceAmount.toFixed(2)})`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pending Payment Fields - Only show when Pending */}
      {paymentStatus === "pending" && (
        <div className="space-y-4 border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20">
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date (Optional)</label>
            <input
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              data-testid="input-due-date"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Pending Payment (Optional)</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={pendingReason}
              onChange={(e) => setPendingReason(e.target.value)}
              placeholder="e.g., Monthly billing, Agent payment, etc."
              data-testid="input-pending-reason"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-checkout">
          Cancel
        </Button>
        <Button 
          onClick={handleCheckout} 
          disabled={checkoutMutation.isPending}
          data-testid="button-confirm-checkout"
        >
          {checkoutMutation.isPending ? "Processing..." : `Complete Checkout (₹${balanceAmount.toFixed(2)})`}
        </Button>
      </DialogFooter>
    </div>
  );
}
