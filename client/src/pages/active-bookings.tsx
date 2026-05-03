import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Hotel, User, Calendar, UtensilsCrossed, LogOut, Phone, Search, Plus, Trash2, AlertCircle, Coffee, FileText, Download, QrCode, Check, CheckCircle, Clock, Merge, CreditCard, Wrench, CheckCircle2, Copy, Link2, RotateCcw, Pencil, MessageCircle, MessageSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { format, isBefore, startOfDay } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { SERVICE_TYPES, PAYMENT_METHODS, serviceTypeLabels } from "@/pages/addons";
import { useState, useEffect } from "react";
import { BookingQRCode } from "@/components/BookingQRCode";
import { Users } from "lucide-react";

function GuestIdsButton({ bookingId }: { bookingId: number }) {
  const [open, setOpen] = useState(false);
  const { data: bookingGuestsData } = useQuery<any[]>({
    queryKey: ["/api/bookings", bookingId, "guests"],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}/guests`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-primary hover:underline text-xs flex items-center justify-end gap-1 ml-auto"
        data-testid={`button-view-guest-ids-${bookingId}`}
      >
        <Users className="h-3 w-3" />
        Guest IDs
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guest ID Proofs</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {(!bookingGuestsData || bookingGuestsData.length === 0) ? (
            <p className="text-sm text-muted-foreground">No guest IDs uploaded for this booking yet.</p>
          ) : bookingGuestsData.map((g: any) => (
            <Card key={g.id} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="font-medium text-sm">{g.guestName}</span>
                {g.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
              </div>
              {g.phone && <p className="text-xs text-muted-foreground mb-1">Phone: {g.phone}</p>}
              {g.idProofType && <p className="text-xs text-muted-foreground mb-1">ID Type: {g.idProofType} {g.idProofNumber && `- ${g.idProofNumber}`}</p>}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {g.idProofFront && (
                  <div>
                    <p className="text-xs font-medium mb-1">Front</p>
                    <a href={g.idProofFront} target="_blank" rel="noopener noreferrer">
                      <img src={g.idProofFront} alt="ID Front" className="w-full h-24 object-contain border rounded bg-muted" />
                    </a>
                  </div>
                )}
                {g.idProofBack && (
                  <div>
                    <p className="text-xs font-medium mb-1">Back</p>
                    <a href={g.idProofBack} target="_blank" rel="noopener noreferrer">
                      <img src={g.idProofBack} alt="ID Back" className="w-full h-24 object-contain border rounded bg-muted" />
                    </a>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ActiveBooking {
  id: number;
  checkInDate: string;
  checkOutDate: string;
  actualCheckInTime: string | null;
  status: string;
  numberOfGuests: number;
  specialRequests: string | null;
  advanceAmount: string;
  customPrice: string | null;
  source: string | null;
  isGroupBooking: boolean;
  roomIds: number[] | null;
  dataIssues?: string[];
  guest: {
    id: number;
    fullName: string;
    email: string | null;
    phone: string;
    idProofImage: string | null;
  };
  room: {
    id: number;
    roomNumber: string;
    type: string;
    pricePerNight: string;
  } | null;
  rooms?: Array<{
    id: number;
    roomNumber: string;
    type: string;
    pricePerNight: string;
  }>;
  property: {
    id: number;
    name: string;
    location: string;
  };
  nightsStayed: number;
  orders: Array<{
    id: number;
    items: any;
    totalAmount: string;
    status: string;
    createdAt: string;
    specialInstructions: string | null;
  }>;
  extraServices: Array<{
    id: number;
    serviceName: string;
    amount: string;
    serviceType: string;
    serviceDate: string;
  }>;
  charges: {
    roomCharges: string;
    foodCharges: string;
    extraCharges: string;
    subtotal: string;
    gstAmount: string;
    serviceChargeAmount: string;
    totalAmount: string;
    advancePaid: string;
    balanceAmount: string;
  };
}

export default function ActiveBookings() {
  const { toast } = useToast();
  const [checkoutDialog, setCheckoutDialog] = useState<{ open: boolean; booking: ActiveBooking | null }>({
    open: false,
    booking: null,
  });
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [paymentStatus, setPaymentStatus] = useState<string>("paid");
  const [dueDate, setDueDate] = useState<string>("");
  const [pendingReason, setPendingReason] = useState<string>("");
  const [discountType, setDiscountType] = useState<string>("none");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [discountAppliesTo, setDiscountAppliesTo] = useState<string>("total");
  const [gstOnRooms, setGstOnRooms] = useState<boolean>(true);
  const [gstOnFood, setGstOnFood] = useState<boolean>(false);
  const [includeServiceCharge, setIncludeServiceCharge] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [manualCharges, setManualCharges] = useState<Array<{ name: string; amount: string }>>([
    { name: "", amount: "" }
  ]);
  const [cashAmount, setCashAmount] = useState<string>("");
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedBookingsForMerge, setSelectedBookingsForMerge] = useState<number[]>([]);
  const [primaryBookingForMerge, setPrimaryBookingForMerge] = useState<number | null>(null);
  const [qrCodeSheetOpen, setQrCodeSheetOpen] = useState(false);
  const [qrCodeBooking, setQrCodeBooking] = useState<ActiveBooking | null>(null);
  const [preBillLink, setPreBillLink] = useState<string | null>(null);
  const [preBillLinkCopied, setPreBillLinkCopied] = useState(false);
  const [preBillSent, setPreBillSent] = useState(false);
  const [preBillStatus, setPreBillStatus] = useState<string>("pending");
  const [skipPreBill, setSkipPreBill] = useState(false);
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const [upiPaymentLink, setUpiPaymentLink] = useState<string | null>(null);
  const [showUpiLink, setShowUpiLink] = useState(false);
  const [autoCompletingCheckout, setAutoCompletingCheckout] = useState(false);
  const [extendedStayHandled, setExtendedStayHandled] = useState(false);
  const [extendedStayChoice, setExtendedStayChoice] = useState<"calculated" | "custom" | "skip" | null>(null);
  const [customExtendedAmount, setCustomExtendedAmount] = useState<string>("");
  const [mergedBookingDetails, setMergedBookingDetails] = useState<Array<{
    bookingId: number;
    guestName: string;
    roomNumber: string;
    roomCharges: number;
    advancePaid: number;
    nights: number;
  }> | null>(null);

  // Per-card tab state: bookingId → active tab
  const [cardTabs, setCardTabs] = useState<Record<number, string>>({});
  const getCardTab = (id: number) => cardTabs[id] ?? "overview";
  const setCardTab = (id: number, tab: string) => setCardTabs(prev => ({ ...prev, [id]: tab }));

  const [addServiceDialog, setAddServiceDialog] = useState<{ open: boolean; bookingId: number | null; guestName: string }>({
    open: false, bookingId: null, guestName: ""
  });
  const [svcType, setSvcType] = useState("taxi");
  const [svcName, setSvcName] = useState("");
  const [svcAmount, setSvcAmount] = useState("");
  const [svcDate, setSvcDate] = useState(new Date().toISOString().split("T")[0]);
  const [svcDescription, setSvcDescription] = useState("");
  const [svcCollectNow, setSvcCollectNow] = useState(false);
  const [svcPaymentMethod, setSvcPaymentMethod] = useState("cash");
  const [svcCustomType, setSvcCustomType] = useState("");

  const [editServiceDialog, setEditServiceDialog] = useState<{
    open: boolean;
    service: { id: number; serviceName: string; amount: string; serviceDate: string } | null;
  }>({ open: false, service: null });
  const [editSvcName, setEditSvcName] = useState("");
  const [editSvcAmount, setEditSvcAmount] = useState("");
  const [editSvcDate, setEditSvcDate] = useState("");

  // Inline phone editing + WhatsApp resend
  const [editingPhoneId, setEditingPhoneId] = useState<number | null>(null);
  const [editedPhoneValue, setEditedPhoneValue] = useState("");
  const [resendShowingId, setResendShowingId] = useState<number | null>(null);
  const [resendingType, setResendingType] = useState<string | null>(null);

  // Custom WhatsApp message dialog
  const [customMsgDialog, setCustomMsgDialog] = useState<{ open: boolean; booking: any | null }>({ open: false, booking: null });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customMsgPhone, setCustomMsgPhone] = useState("");

  const updateGuestPhoneMutation = useMutation({
    mutationFn: async ({ guestId, phone }: { guestId: number; phone: string }) =>
      apiRequest(`/api/guests/${guestId}`, "PATCH", { phone }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      toast({ title: "Phone updated", description: `Number saved as ${vars.phone}` });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update", description: error.message || "Could not save phone number", variant: "destructive" });
    },
  });

  const resendWhatsAppMutation = useMutation({
    mutationFn: async ({ bookingId, type }: { bookingId: number; type: string }) => {
      setResendingType(type);
      const res = await apiRequest(`/api/bookings/${bookingId}/resend-whatsapp`, "POST", { type });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Sent", description: data.message || "WhatsApp message sent" });
      setResendingType(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to send", description: error.message || "Could not send WhatsApp", variant: "destructive" });
      setResendingType(null);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_advance":
        return { label: "Awaiting Payment", className: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700" };
      case "confirmed":
        return { label: "Confirmed", className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" };
      case "checked-in":
        return { label: "Checked In", className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700" };
      case "checked-out":
        return { label: "Checked Out", className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700" };
      case "expired":
        return { label: "Expired", className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700" };
      case "cancelled":
        return { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700" };
      default:
        return { label: status, className: "" };
    }
  };

  // Templates for Custom Message dialog
  const { data: waTemplates = [] } = useQuery<{ id: number; name: string; content: string; propertyId: number | null }[]>({
    queryKey: ["/api/message-templates", customMsgDialog.booking?.property?.id ?? "all"],
    queryFn: async () => {
      const pid = customMsgDialog.booking?.property?.id;
      const url = pid ? `/api/message-templates?propertyId=${pid}` : "/api/message-templates";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: customMsgDialog.open,
  });

  function buildWaPreview(content: string, booking: any): string {
    const b = booking;
    const nights = Math.max(1, Math.ceil(
      (new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    ));
    const roomLabel = b.isGroupBooking && b.rooms?.length
      ? b.rooms.map((r: any) => r.roomNumber).join(", ")
      : b.room?.roomNumber ?? "TBA";
    return content
      .replaceAll("{guestName}", b.guest?.fullName ?? "Guest")
      .replaceAll("{propertyName}", b.property?.name ?? "Hostezee")
      .replaceAll("{roomNumber}", roomLabel)
      .replaceAll("{checkIn}", format(new Date(b.checkInDate), "dd MMM yyyy"))
      .replaceAll("{checkOut}", format(new Date(b.checkOutDate), "dd MMM yyyy"))
      .replaceAll("{nights}", String(nights))
      .replaceAll("{phone}", b.property?.contactPhone ?? "");
  }

  const { data: currentPreBill } = useQuery<{ id: number; status: string } | null>({
    queryKey: ["/api/prebill/booking", checkoutDialog.booking?.id],
    enabled: !!(checkoutDialog.open && checkoutDialog.booking?.id),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/prebill/booking/${checkoutDialog.booking?.id}`, { credentials: "include" });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to fetch pre-bill");
        return res.json();
      } catch { return null; }
    },
  });

  const { data: currentBill } = useQuery<{ paymentStatus: string; id: number } | null>({
    queryKey: ["/api/bills/booking", checkoutDialog.booking?.id],
    enabled: !!(checkoutDialog.open && checkoutDialog.booking?.id && paymentLinkSent && !autoCompletingCheckout),
    refetchInterval: 5000,
    queryFn: async () => {
      try {
        const res = await fetch(`/api/bills/booking/${checkoutDialog.booking?.id}`, { credentials: "include" });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to fetch bill");
        return res.json();
      } catch { return null; }
    },
  });

  useEffect(() => {
    if (currentPreBill) {
      setPreBillStatus(currentPreBill.status);
      if (currentPreBill.status === "approved") {
        setPreBillSent(true);
      }
    }
  }, [currentPreBill]);

  useEffect(() => {
    if (currentBill && currentBill.paymentStatus === "paid" && paymentLinkSent && !autoCompletingCheckout && checkoutDialog.booking) {
      setAutoCompletingCheckout(true);
      toast({
        title: "Payment Confirmed ✓",
        description: "Payment received! Completing checkout automatically...",
      });
      
      setTimeout(() => {
        checkoutMutation.mutate({
          bookingId: checkoutDialog.booking!.id,
          paymentMethod: paymentMethod,
          paymentStatus: "paid",
          discountType: discountType === "none" ? undefined : discountType,
          discountValue: discountType === "none" || !discountValue ? undefined : parseFloat(discountValue),
          discountAppliesTo: discountType === "none" ? undefined : discountAppliesTo,
          gstOnRooms,
          gstOnFood,
          includeServiceCharge,
          manualCharges,
        });
      }, 1000);
    }
  }, [currentBill, paymentLinkSent, autoCompletingCheckout, checkoutDialog.booking]);

  useEffect(() => {
    if (!checkoutDialog.open) {
      setPreBillSent(false);
      setPreBillStatus("pending");
      setSkipPreBill(false);
      setPaymentLinkSent(false);
      setPaymentMethod("upi");
      setPaymentStatus("paid");
      setAutoCompletingCheckout(false);
      setCashAmount("");
      setPreBillLink(null);
      setPreBillLinkCopied(false);
    }
  }, [checkoutDialog.open]);

  const { data: activeBookings, isLoading } = useQuery<ActiveBooking[]>({
    queryKey: ["/api/bookings/active"],
    refetchInterval: 30000,
  });

  const { data: properties } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/properties"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: currentUser } = useQuery<{ id: string; role: string; email: string }>({
    queryKey: ["/api/auth/user"],
  });
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super-admin";

  const reopenBookingMutation = useMutation({
    mutationFn: async (bookingId: number) =>
      await apiRequest(`/api/bookings/${bookingId}/reopen`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      toast({ title: "Booking Reopened", description: "Booking has been set back to checked-in. You can now add orders and services." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Reopen", description: error.message || "Unable to reopen booking", variant: "destructive" });
    },
  });

  const { data: cafeOrders, isLoading: isLoadingCafeOrders, refetch: refetchCafeOrders } = useQuery<any[]>({
    queryKey: ["/api/orders/unmerged-cafe"],
    enabled: mergeDialogOpen,
    refetchOnWindowFocus: false,
  });

  const filteredBookings = activeBookings?.filter((booking) => {
    // Property filter
    if (propertyFilter && propertyFilter !== "all") {
      if (String(booking.property?.id) !== propertyFilter) return false;
    }
    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const roomNumberMatch = booking.isGroupBooking && booking.rooms
      ? booking.rooms.some(room => room.roomNumber.toLowerCase().includes(query))
      : booking.room?.roomNumber.toLowerCase().includes(query);
    return (
      booking.guest.fullName.toLowerCase().includes(query) ||
      roomNumberMatch ||
      booking.id.toString().includes(query) ||
      booking.guest.phone.includes(query)
    );
  });

  const todayStart = startOfDay(new Date());
  const activeFilteredBookings = filteredBookings?.filter(b => b.status !== "checked-out") ?? [];
  const checkedOutTodayBookings = filteredBookings?.filter(b => b.status === "checked-out") ?? [];
  const isOverdueBooking = (b: any) =>
    b.status === "checked-in" && isBefore(startOfDay(new Date(b.checkOutDate)), todayStart);

  const sendPreBillMutation = useMutation({
    mutationFn: async ({ bookingId, billDetails }: { bookingId: number; billDetails: any }) => {
      return await apiRequest("/api/send-prebill", "POST", { bookingId, billDetails });
    },
    onSuccess: (data) => {
      setPreBillStatus("sent");
      setPreBillSent(true);
      const guest = checkoutDialog.booking?.guest;
      const phone = guest?.phone || "customer";
      toast({
        title: "Pre-Bill Sent Successfully ✓",
        description: `Bill sent to ${guest?.fullName || 'Guest'} via WhatsApp on ${phone}. Waiting for customer approval...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prebill/booking", checkoutDialog.booking?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Pre-Bill",
        description: error.message || "Unable to send bill via WhatsApp. Please check guest phone number and try again.",
        variant: "destructive",
      });
    },
  });

  const approveBillMutation = useMutation({
    mutationFn: async (preBillId: number) => {
      return await apiRequest("/api/prebill/approve", "POST", { preBillId, bookingId: checkoutDialog.booking?.id });
    },
    onSuccess: () => {
      setPreBillStatus("approved");
      setPreBillSent(true);
      toast({
        title: "Pre-Bill Approved",
        description: "You can now proceed with checkout",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Approve Pre-Bill",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const paymentLinkMutation = useMutation({
    mutationFn: async ({ bookingId, billDetails }: { bookingId: number; billDetails: any }) => {
      return await apiRequest("/api/payment-link/generate", "POST", { bookingId, billDetails });
    },
    onSuccess: (data) => {
      setPaymentLinkSent(true);
      const guest = checkoutDialog.booking?.guest;
      toast({
        title: "Payment Link Sent Successfully ✓",
        description: `Payment link sent to ${guest?.fullName || 'Guest'} via WhatsApp. Awaiting payment confirmation...`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Payment Link",
        description: error.message || "Unable to send payment link via WhatsApp. Please check guest phone number and try again.",
        variant: "destructive",
      });
    },
  });

  const generateUpiLink = async () => {
    if (paymentMethod === "upi" && checkoutDialog.booking) {
      const breakdown = calculateTotalWithCharges(
        checkoutDialog.booking, 
        gstOnRooms,
        gstOnFood,
        includeServiceCharge,
        manualCharges
      );
      const discountAmt = calculateDiscount(
        breakdown.grandTotal,
        discountType,
        discountValue
      );
      const finalTotal = breakdown.grandTotal - discountAmt;
      const advancePaid = parseFloat(checkoutDialog.booking.charges.advancePaid);
      const balanceDue = finalTotal - advancePaid;

      const billDetails = {
        bookingId: checkoutDialog.booking.id,
        guestName: checkoutDialog.booking.guest.fullName,
        guestPhone: checkoutDialog.booking.guest.phone,
        roomNumber: checkoutDialog.booking.isGroupBooking && checkoutDialog.booking.rooms 
          ? checkoutDialog.booking.rooms.map(r => r.roomNumber).join(", ")
          : checkoutDialog.booking.room?.roomNumber,
        roomCharges: breakdown.roomCharges,
        foodCharges: breakdown.foodCharges,
        gstAmount: breakdown.gstAmount,
        serviceChargeAmount: breakdown.serviceChargeAmount,
        subtotal: breakdown.subtotal,
        discountAmount: discountAmt,
        totalAmount: breakdown.grandTotal,
        balanceDue: balanceDue,
        advancePaid: advancePaid,
      };

      try {
        const result: any = await apiRequest("/api/payment-link/generate", "POST", {
          bookingId: checkoutDialog.booking.id,
          billDetails
        });
        setUpiPaymentLink(result.paymentLink);
        setShowUpiLink(true);
        return result.paymentLink;
      } catch (error) {
        toast({
          title: "Failed to Generate UPI Link",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
    return null;
  };

  const checkoutMutation = useMutation({
    mutationFn: async ({ bookingId, paymentMethod, paymentStatus, dueDate, pendingReason, discountType, discountValue, discountAppliesTo, gstOnRooms, gstOnFood, includeServiceCharge, manualCharges, cashAmount, onlineAmount }: { 
      bookingId: number; 
      paymentMethod?: string;
      paymentStatus: string;
      dueDate?: string;
      pendingReason?: string;
      discountType?: string;
      discountValue?: number;
      discountAppliesTo?: string;
      gstOnRooms: boolean;
      gstOnFood: boolean;
      includeServiceCharge: boolean;
      manualCharges: Array<{ name: string; amount: string }>;
      cashAmount?: number;
      onlineAmount?: number;
    }) => {
      const res = await apiRequest("/api/bookings/checkout", "POST", { 
        bookingId, 
        paymentMethod: paymentStatus === "paid" ? paymentMethod : null,
        paymentStatus,
        dueDate: paymentStatus === "pending" ? dueDate : null,
        pendingReason: paymentStatus === "pending" ? pendingReason : null,
        discountType: discountType === "none" ? null : discountType,
        discountValue: discountType === "none" ? null : discountValue,
        discountAppliesTo: discountType === "none" ? null : discountAppliesTo,
        gstOnRooms,
        gstOnFood,
        includeServiceCharge,
        manualCharges: manualCharges.filter(c => c.name && c.amount && parseFloat(c.amount) > 0),
        cashAmount,
        onlineAmount,
      });
      return res.json();
    },
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/summary"] });

      // Build a payment breakdown description
      let paymentDesc = "Guest has been checked out and bill has been generated.";
      if (variables.paymentStatus === "pending") {
        paymentDesc = "Guest checked out. Bill marked as pending — collect from Billing page.";
      } else if (variables.cashAmount && variables.onlineAmount) {
        paymentDesc = `Cash: ₹${Number(variables.cashAmount).toLocaleString("en-IN")}   |   UPI: ₹${Number(variables.onlineAmount).toLocaleString("en-IN")}`;
      } else if (variables.cashAmount && !variables.onlineAmount) {
        paymentDesc = `Cash collected: ₹${Number(variables.cashAmount).toLocaleString("en-IN")}`;
      } else if (variables.paymentMethod === "upi") {
        paymentDesc = "Full payment recorded as UPI.";
      } else if (variables.paymentMethod === "cash") {
        paymentDesc = "Full payment recorded as Cash.";
      }

      toast({
        title: variables.paymentStatus === "pending" ? "Checkout — Bill Pending" : "Checkout Successful ✓",
        description: paymentDesc,
      });
      if (data?.walletWarning) {
        setTimeout(() => {
          toast({ title: "Wallet not updated", description: data.walletWarning, variant: "destructive" });
        }, 500);
      }
      setCheckoutDialog({ open: false, booking: null });
      setPaymentMethod("upi");
      setCashAmount("");
      setPaymentStatus("paid");
      setDueDate("");
      setPendingReason("");
      setDiscountType("none");
      setDiscountValue("");
      setDiscountAppliesTo("total");
      setGstOnRooms(true);
      setGstOnFood(false);
      setIncludeServiceCharge(false);
      setManualCharges([{ name: "", amount: "" }]);
      setPreBillSent(false);
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to checkout guest",
        variant: "destructive",
      });
    },
  });

  const mergeBillsForCheckoutMutation = useMutation({
    mutationFn: async ({ bookingIds, primaryBookingId }: { bookingIds: number[]; primaryBookingId: number }) => {
      return await apiRequest("/api/bills/merge", "POST", { bookingIds, primaryBookingId });
    },
    onSuccess: (mergedBill: any) => {
      const totalAmount = mergedBill?.totalAmount || mergedBill?.total || "0";
      toast({
        title: "Bills Merged Successfully ✓",
        description: `${selectedBookingsForMerge.length} bookings merged. Total: ₹${totalAmount}`,
      });
      setMergeDialogOpen(false);
      setSelectedBookingsForMerge([]);
      setPrimaryBookingForMerge(null);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    },
    onError: (error: any) => {
      toast({
        title: "Merge Failed",
        description: error.message || "Failed to merge bills",
        variant: "destructive",
      });
    },
  });

  const mergeCafeOrdersMutation = useMutation({
    mutationFn: async ({ orderIds, bookingId }: { orderIds: number[]; bookingId: number }) => {
      return await apiRequest("/api/orders/merge-to-booking", "PATCH", { orderIds, bookingId });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/unmerged-cafe"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      const updatedBookings = queryClient.getQueryData<ActiveBooking[]>(["/api/bookings/active"]);
      if (updatedBookings && checkoutDialog.booking) {
        const refreshedBooking = updatedBookings.find(b => b.id === checkoutDialog.booking!.id);
        if (refreshedBooking) {
          setCheckoutDialog({ open: true, booking: refreshedBooking });
        }
      }
      
      toast({
        title: "Order Merged",
        description: "Café order has been added to the bill",
      });
      setMergeDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Merge Failed",
        description: error.message || "Failed to merge café order",
        variant: "destructive",
      });
    },
  });

  const sendAdvancePaymentMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      return await apiRequest(`/api/bookings/${bookingId}/send-advance-payment`, "POST");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
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

  const confirmBookingMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      return await apiRequest(`/api/bookings/${bookingId}/confirm`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Confirmed",
        description: "Booking has been manually confirmed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Confirm",
        description: error.message || "Unable to confirm booking",
        variant: "destructive",
      });
    },
  });

  const confirmAdvancePaymentMutation = useMutation({
    mutationFn: async ({ bookingId }: { bookingId: number }) => {
      return await apiRequest(`/api/bookings/${bookingId}/confirm-advance-payment`, "POST", { sendWhatsApp: true });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Payment Confirmed",
        description: `Advance payment of ₹${data.advanceAmount?.toLocaleString('en-IN') || ''} confirmed. Booking is now active.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Confirm Payment",
        description: error.message || "Unable to confirm advance payment",
        variant: "destructive",
      });
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data: {
      bookingId: number; serviceType: string; serviceName: string;
      amount: string; serviceDate: string; description?: string;
      isPaid?: boolean; paymentMethod?: string;
    }) => {
      return await apiRequest("/api/extra-services", "POST", {
        ...data,
        paymentMethod: data.isPaid ? (data.paymentMethod || "cash") : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/extra-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions"] });
      toast({ title: "Service added", description: "Service has been added to the guest bill" });
      setAddServiceDialog({ open: false, bookingId: null, guestName: "" });
      setSvcName(""); setSvcAmount(""); setSvcDescription(""); setSvcType("taxi");
      setSvcCollectNow(false); setSvcPaymentMethod("cash"); setSvcCustomType("");
      setSvcDate(new Date().toISOString().split("T")[0]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add service", variant: "destructive" });
    },
  });

  const editServiceMutation = useMutation({
    mutationFn: async (data: { id: number; serviceName: string; amount: string; serviceDate: string }) => {
      const { id, ...body } = data;
      return await apiRequest(`/api/extra-services/${id}`, "PATCH", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      toast({ title: "Service updated", description: "Extra service has been updated" });
      setEditServiceDialog({ open: false, service: null });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update service", variant: "destructive" });
    },
  });

  const handleMergeSingleOrder = (orderId: number) => {
    if (!checkoutDialog.booking) return;
    mergeCafeOrdersMutation.mutate({
      orderIds: [orderId],
      bookingId: checkoutDialog.booking.id,
    });
  };

  const handleSendPreBill = () => {
    if (!checkoutDialog.booking) return;
    
    const breakdown = calculateTotalWithCharges(
      checkoutDialog.booking, 
      gstOnRooms,
      gstOnFood,
      includeServiceCharge,
      manualCharges
    );
    const discountAmt = calculateDiscount(
      breakdown.grandTotal,
      discountType,
      discountValue
    );
    const finalTotal = breakdown.grandTotal - discountAmt;
    const advancePaid = parseFloat(checkoutDialog.booking.charges.advancePaid);
    const balanceDue = finalTotal - advancePaid;

    const billDetails = {
      bookingId: checkoutDialog.booking.id,
      guestName: checkoutDialog.booking.guest.fullName,
      guestPhone: checkoutDialog.booking.guest.phone,
      roomNumber: checkoutDialog.booking.isGroupBooking && checkoutDialog.booking.rooms 
        ? checkoutDialog.booking.rooms.map(r => r.roomNumber).join(", ")
        : checkoutDialog.booking.room?.roomNumber,
      roomCharges: breakdown.roomCharges,
      foodCharges: breakdown.foodCharges,
      gstAmount: breakdown.gstAmount,
      serviceChargeAmount: breakdown.serviceChargeAmount,
      subtotal: breakdown.subtotal,
      discountAmount: discountAmt,
      totalAmount: breakdown.grandTotal,
      balanceDue: balanceDue,
      advancePaid: advancePaid,
    };

    sendPreBillMutation.mutate({ bookingId: checkoutDialog.booking.id, billDetails });
  };

  const handleCheckout = () => {
    if (!checkoutDialog.booking) return;
    
    if (!preBillSent && !skipPreBill && !paymentLinkSent) {
      toast({
        title: "Pre-Bill or Payment Link Required",
        description: "Please send pre-bill or payment link to customer first",
        variant: "destructive",
      });
      return;
    }
    
    const pendingOrders = checkoutDialog.booking.orders.filter(order => 
      order.status === "pending" || order.status === "preparing"
    );
    
    if (pendingOrders.length > 0) {
      toast({
        title: "Checkout Not Allowed",
        description: `${pendingOrders.length} food order(s) are still being prepared. Please complete or cancel them before checkout.`,
        variant: "destructive",
      });
      return;
    }
    
    const breakdown = calculateTotalWithCharges(checkoutDialog.booking, gstOnRooms, gstOnFood, includeServiceCharge, manualCharges);
    const discountAmt = calculateDiscount(breakdown.grandTotal, discountType, discountValue);
    const finalTotal = breakdown.grandTotal - discountAmt;
    const advancePaid = parseFloat(checkoutDialog.booking.charges.advancePaid);
    const balanceDue = finalTotal - advancePaid;

    // When UPI is selected with some cash entered, send a split: cash portion + UPI remainder
    let finalCashAmount: number | undefined;
    let finalOnlineAmount: number | undefined;
    if (paymentMethod === "upi" && cashAmount && parseFloat(cashAmount) > 0) {
      finalCashAmount = Math.max(0, parseFloat(cashAmount));
      finalOnlineAmount = Math.max(0, balanceDue - finalCashAmount);
    }
    
    checkoutMutation.mutate({
      bookingId: checkoutDialog.booking.id,
      paymentMethod: paymentStatus === "paid" ? paymentMethod : undefined,
      paymentStatus,
      dueDate: paymentStatus === "pending" && dueDate ? dueDate : undefined,
      pendingReason: paymentStatus === "pending" && pendingReason ? pendingReason : undefined,
      discountType: discountType === "none" ? undefined : discountType,
      discountValue: discountType === "none" || !discountValue ? undefined : parseFloat(discountValue),
      discountAppliesTo: discountType === "none" ? undefined : discountAppliesTo,
      gstOnRooms,
      gstOnFood,
      includeServiceCharge,
      manualCharges,
      cashAmount: finalCashAmount,
      onlineAmount: finalOnlineAmount,
    });
  };

  const calculateDiscount = (totalAmount: number, type: string, value: string) => {
    if (type === "none" || !value) return 0;
    const discountVal = parseFloat(value);
    if (isNaN(discountVal)) return 0;
    
    if (type === "percentage") {
      return (totalAmount * discountVal) / 100;
    } else {
      return discountVal;
    }
  };

  const calculateTotalWithCharges = (booking: ActiveBooking, gstOnRooms: boolean, gstOnFood: boolean, includeServiceCharge: boolean, charges: Array<{ name: string; amount: string }>) => {
    const roomCharges = parseFloat(booking.charges.roomCharges);
    const foodCharges = parseFloat(booking.charges.foodCharges);
    const manualAmount = charges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const roomGst = gstOnRooms ? roomCharges * 0.05 : 0;
    const foodGst = gstOnFood ? foodCharges * 0.05 : 0;
    const gstAmount = roomGst + foodGst;
    const serviceChargeAmount = includeServiceCharge ? roomCharges * 0.10 : 0;
    
    const subtotal = roomCharges + foodCharges + manualAmount;
    const grandTotal = subtotal + gstAmount + serviceChargeAmount;
    
    return {
      subtotal,
      gstAmount,
      serviceChargeAmount,
      grandTotal,
      roomCharges,
      foodCharges,
      manualAmount,
    };
  };
  
  const addManualCharge = () => {
    setManualCharges([...manualCharges, { name: "", amount: "" }]);
  };
  
  const removeManualCharge = (index: number) => {
    if (manualCharges.length === 1) return;
    setManualCharges(manualCharges.filter((_, i) => i !== index));
  };
  
  const updateManualCharge = (index: number, field: string, value: string) => {
    const updated = [...manualCharges];
    updated[index] = { ...updated[index], [field]: value };
    setManualCharges(updated);
  };

  if (isLoading) return <div className="flex items-center justify-center p-8">Loading active bookings...</div>;

  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Hotel className="h-5 w-5 sm:h-6 sm:w-6" />
            Active Bookings
          </h1>
          <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-merge-bills-header">
                <Merge className="h-4 w-4 mr-2" />
                Merge Bills
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Merge Bookings & Create Bill</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-3">Select Bookings to Merge</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select at least 2 bookings to merge into one bill
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {activeBookings && activeBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No active bookings available
                      </p>
                    ) : (
                      activeBookings?.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted"
                        >
                          <Checkbox
                            id={`merge-booking-${booking.id}`}
                            checked={selectedBookingsForMerge.includes(booking.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBookingsForMerge([...selectedBookingsForMerge, booking.id]);
                                if (primaryBookingForMerge === null) {
                                  setPrimaryBookingForMerge(booking.id);
                                }
                              } else {
                                const newIds = selectedBookingsForMerge.filter(id => id !== booking.id);
                                setSelectedBookingsForMerge(newIds);
                                if (primaryBookingForMerge === booking.id) {
                                  setPrimaryBookingForMerge(newIds.length > 0 ? newIds[0] : null);
                                }
                              }
                            }}
                            data-testid={`checkbox-merge-booking-${booking.id}`}
                          />
                          <label
                            htmlFor={`merge-booking-${booking.id}`}
                            className="flex-1 text-sm cursor-pointer"
                          >
                            <p className="font-medium">Booking #{booking.id} - {booking.guest.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              Room {booking.isGroupBooking && booking.rooms ? booking.rooms.map(r => r.roomNumber).join(", ") : booking.room?.roomNumber} • ₹{booking.charges.subtotal}
                            </p>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {selectedBookingsForMerge.length >= 2 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Select Primary Booking</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      The merged bill will be linked to this booking
                    </p>
                    <div className="space-y-2">
                      {selectedBookingsForMerge.map((bookingId) => {
                        const booking = activeBookings?.find(b => b.id === bookingId);
                        if (!booking) return null;
                        return (
                          <div
                            key={bookingId}
                            className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer border ${
                              primaryBookingForMerge === bookingId ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setPrimaryBookingForMerge(bookingId)}
                            data-testid={`radio-primary-merge-${bookingId}`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              primaryBookingForMerge === bookingId ? 'border-primary bg-primary' : 'border-muted-foreground'
                            }`} />
                            <div className="text-sm">
                              <p className="font-medium">Booking #{bookingId} - {booking.guest.fullName}</p>
                              <p className="text-xs text-muted-foreground">₹{booking.charges.subtotal} total</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedBookingsForMerge.length >= 2 && primaryBookingForMerge && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">Merge Summary:</p>
                    <p className="text-blue-800 dark:text-blue-200">
                      {selectedBookingsForMerge.length} bookings will be combined into 1 bill linked to Booking #{primaryBookingForMerge}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMergeDialogOpen(false);
                    setSelectedBookingsForMerge([]);
                    setPrimaryBookingForMerge(null);
                  }}
                  data-testid="button-cancel-merge"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedBookingsForMerge.length >= 2 && primaryBookingForMerge) {
                      mergeBillsForCheckoutMutation.mutate({
                        bookingIds: selectedBookingsForMerge,
                        primaryBookingId: primaryBookingForMerge,
                      });
                    }
                  }}
                  disabled={selectedBookingsForMerge.length < 2 || !primaryBookingForMerge || mergeBillsForCheckoutMutation.isPending}
                  data-testid="button-confirm-merge"
                >
                  {mergeBillsForCheckoutMutation.isPending ? "Merging..." : "Merge Bills"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-2">
          {/* Property Filter */}
          {properties && properties.length > 1 && (
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="h-9 w-[180px]" data-testid="select-property-filter-active">
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
          <div className="relative w-64">
            <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by guest name, room, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-md border border-input bg-background text-sm"
              data-testid="input-search-active-bookings"
            />
          </div>
        </div>
      </div>

      {activeFilteredBookings.length === 0 && checkedOutTodayBookings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No active bookings at the moment
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {activeFilteredBookings.map((booking) => {
            const roomLabel = booking.isGroupBooking && booking.rooms
              ? booking.rooms.map(r => r.roomNumber).join(", ")
              : booking.room?.roomNumber || "TBA";
            const sourceLabel = booking.source?.startsWith("aiosell-")
              ? (booking.source.toLowerCase().includes("booking") ? "Booking.com"
                : booking.source.toLowerCase().includes("mmt") ? "MMT"
                : booking.source.toLowerCase().includes("airbnb") ? "Airbnb"
                : "OTA")
              : (booking.source || "Walk-in");
            const balance = parseFloat(booking.charges.subtotal) - parseFloat(booking.advanceAmount || "0");
            return (
            <Card key={booking.id} data-testid={`card-active-booking-${booking.id}`}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Overdue alert — top strip only (no full-card red border) */}
              {isOverdueBooking(booking) && (
                <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-semibold">
                    Overdue — was due {format(new Date(booking.checkOutDate), "dd MMM")}. Process checkout or extend.
                  </span>
                </div>
              )}
              {booking.dataIssues && booking.dataIssues.length > 0 && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950 border-b border-red-200 px-3 py-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="text-red-700 text-xs">{booking.dataIssues.join(", ")}</span>
                </div>
              )}

              {/* Compact header */}
              <div className="px-3 pt-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm leading-tight">{booking.guest.fullName}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${getStatusBadge(booking.status).className}`}>
                        {getStatusBadge(booking.status).label}
                      </Badge>
                      {isOverdueBooking(booking) && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />Overdue
                        </Badge>
                      )}
                      {booking.isGroupBooking && (
                        <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0 h-4">Group</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-foreground">Room {roomLabel}</span>
                      <span>·</span>
                      <span>{format(new Date(booking.checkInDate), "dd MMM")} → {format(new Date(booking.checkOutDate), "dd MMM")}</span>
                      <span>·</span>
                      <span>{booking.nightsStayed}N · {booking.numberOfGuests} guest{booking.numberOfGuests > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-base leading-tight">₹{parseFloat(booking.charges.subtotal).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                    {parseFloat(booking.advanceAmount) > 0 && (
                      <div className="text-[10px] text-muted-foreground leading-tight">Adv ₹{parseFloat(booking.advanceAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
                    )}
                    {balance > 0 && (
                      <div className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        Balance ₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab strip */}
              <Tabs value={getCardTab(booking.id)} onValueChange={(t) => setCardTab(booking.id, t)}>
                <div className="px-3">
                  <TabsList className="h-7 w-full bg-muted/60 p-0.5">
                    <TabsTrigger value="overview" className="flex-1 text-xs h-6 data-[state=active]:shadow-sm">Details</TabsTrigger>
                    <TabsTrigger value="billing" className="flex-1 text-xs h-6 data-[state=active]:shadow-sm">Billing</TabsTrigger>
                    <TabsTrigger value="services" className="flex-1 text-xs h-6 data-[state=active]:shadow-sm">
                      Services
                      {(booking.orders?.length || 0) + (booking.extraServices?.length || 0) > 0 && (
                        <span className="ml-1 bg-primary/20 text-primary rounded-full text-[9px] px-1 leading-3 py-0.5">
                          {(booking.orders?.length || 0) + (booking.extraServices?.length || 0)}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Details tab */}
                <TabsContent value="overview" className="mt-0 px-3 py-2 space-y-2">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                      {editingPhoneId === booking.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={editedPhoneValue}
                            onChange={e => setEditedPhoneValue(e.target.value)}
                            className="h-6 text-xs px-2 py-0 flex-1"
                            placeholder="Enter phone number"
                            autoFocus
                            data-testid={`input-phone-${booking.id}`}
                          />
                          <Button
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={updateGuestPhoneMutation.isPending}
                            data-testid={`button-save-phone-${booking.id}`}
                            onClick={async () => {
                              if (!editedPhoneValue.trim()) return;
                              await updateGuestPhoneMutation.mutateAsync({ guestId: booking.guest.id, phone: editedPhoneValue.trim() });
                              setEditingPhoneId(null);
                              setResendShowingId(booking.id);
                            }}
                          >
                            {updateGuestPhoneMutation.isPending ? "..." : "Save"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => setEditingPhoneId(null)}
                            data-testid={`button-cancel-phone-${booking.id}`}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="font-medium">{booking.guest.phone}</span>
                          {/* Direct call */}
                          {booking.guest.phone && (
                            <a
                              href={`tel:${booking.guest.phone}`}
                              className="text-muted-foreground hover:text-blue-600 transition-colors"
                              title={`Call ${booking.guest.fullName}`}
                              data-testid={`button-call-${booking.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" />
                            </a>
                          )}
                          <button
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Edit phone number"
                            data-testid={`button-edit-phone-${booking.id}`}
                            onClick={() => {
                              setEditedPhoneValue(booking.guest.phone || "");
                              setEditingPhoneId(booking.id);
                              setResendShowingId(null);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Source: </span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{sourceLabel}</Badge>
                    </div>
                    {booking.guest.email && (
                      <div className="col-span-2 text-muted-foreground truncate">{booking.guest.email}</div>
                    )}
                  </div>
                  {resendShowingId === booking.id && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-medium">Resend WhatsApp template to updated number:</p>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { type: "confirmation", label: "Booking Confirm" },
                          { type: "payment",      label: "Payment Request" },
                          { type: "checkin",      label: "Check-in Link" },
                        ].map(({ type, label }) => (
                          <Button
                            key={type}
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-1.5 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
                            disabled={resendWhatsAppMutation.isPending && resendingType === type}
                            data-testid={`button-resend-wa-${type}-${booking.id}`}
                            onClick={() => resendWhatsAppMutation.mutate({ bookingId: booking.id, type })}
                          >
                            <MessageCircle className="h-3 w-3 mr-1 shrink-0" />
                            {resendWhatsAppMutation.isPending && resendingType === type ? "..." : label}
                          </Button>
                        ))}
                      </div>
                      <button
                        className="text-[10px] text-muted-foreground hover:text-foreground underline"
                        onClick={() => setResendShowingId(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                  {booking.specialRequests && (
                    <div className="flex items-start gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5 text-xs" data-testid={`text-special-requests-${booking.id}`}>
                      <span className="text-amber-600 dark:text-amber-400 font-medium shrink-0">Requests:</span>
                      <span className="text-amber-800 dark:text-amber-200">{booking.specialRequests}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                    {/* Direct WhatsApp chat — opens wa.me immediately */}
                    {(booking.guest?.whatsappPhone || booking.guest?.phone) && (() => {
                      const rawPhone = ((booking.guest.whatsappPhone || booking.guest.phone) || "").replace(/\D/g, "");
                      const waPhone = rawPhone.startsWith("91") ? rawPhone : `91${rawPhone}`;
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 gap-1"
                          data-testid={`button-wa-direct-chat-${booking.id}`}
                          onClick={() => window.open(`https://wa.me/${waPhone}`, "_blank")}
                          title="Open WhatsApp chat with guest"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Chat
                        </Button>
                      );
                    })()}
                    {/* Send template message */}
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-1"
                      data-testid={`button-custom-wa-msg-${booking.id}`}
                      onClick={() => {
                        setCustomMsgPhone((booking.guest.phone || "").replace(/\D/g, ""));
                        setSelectedTemplateId("");
                        setCustomMsgDialog({ open: true, booking });
                      }}
                    >
                      <MessageCircle className="h-3 w-3" />
                      Send Message
                    </Button>
                    <div className="flex items-center gap-3">
                      {booking.guest.idProofImage && (
                        <a
                          href={booking.guest.idProofImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs flex items-center gap-1"
                          data-testid="link-view-id-proof"
                        >
                          <FileText className="h-3 w-3" />
                          View ID
                        </a>
                      )}
                      <GuestIdsButton bookingId={booking.id} />
                    </div>
                  </div>
                </TabsContent>

                {/* Billing tab */}
                <TabsContent value="billing" className="mt-0 px-3 py-2">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Room charges</span>
                      <span className="font-medium">₹{parseFloat(booking.charges.roomCharges).toLocaleString("en-IN")}</span>
                    </div>
                    {parseFloat(booking.charges.foodCharges) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Food orders</span>
                        <span className="font-medium">₹{parseFloat(booking.charges.foodCharges).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {parseFloat(booking.charges.extraCharges) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Extra services</span>
                        <span className="font-medium">₹{parseFloat(booking.charges.extraCharges).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 mt-1 font-semibold">
                      <span>Subtotal</span>
                      <span>₹{parseFloat(booking.charges.subtotal).toLocaleString("en-IN")}</span>
                    </div>
                    {parseFloat(booking.advanceAmount) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Advance paid</span>
                        <span>−₹{parseFloat(booking.advanceAmount).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {balance > 0 && (
                      <div className="flex justify-between text-amber-600 font-semibold">
                        <span>Balance due</span>
                        <span>₹{balance.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Services tab */}
                <TabsContent value="services" className="mt-0 px-3 py-2 space-y-2">
                  {booking.orders && booking.orders.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                        <UtensilsCrossed className="h-3 w-3" /> Food Orders
                      </div>
                      <div className="space-y-0.5">
                        {booking.orders.map((order) => (
                          <div key={order.id} className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Order #{order.id}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{order.status}</Badge>
                              <span className="font-medium">₹{order.totalAmount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {booking.extraServices && booking.extraServices.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                        <Wrench className="h-3 w-3" /> Extra Services
                      </div>
                      <div className="space-y-0.5">
                        {booking.extraServices.map((service) => (
                          <div key={service.id} className="flex justify-between items-center text-xs gap-1">
                            <span className="text-muted-foreground truncate flex-1">{service.serviceName}</span>
                            <span className="font-medium whitespace-nowrap">₹{service.amount}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-primary"
                              data-testid={`button-edit-service-${service.id}`}
                              onClick={() => {
                                setEditServiceDialog({ open: true, service });
                                setEditSvcName(service.serviceName);
                                setEditSvcAmount(service.amount);
                                setEditSvcDate(service.serviceDate ? service.serviceDate.split("T")[0] : new Date().toISOString().split("T")[0]);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!booking.orders?.length && !booking.extraServices?.length && (
                    <p className="text-xs text-muted-foreground text-center py-2">No services added yet</p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Status-specific action rows */}
              {booking.status === "pending_advance" && (
                <div className="px-3 pb-2 pt-1 space-y-1.5 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => sendAdvancePaymentMutation.mutate({ bookingId: booking.id })}
                      disabled={sendAdvancePaymentMutation.isPending}
                      data-testid={`button-resend-payment-${booking.id}`}
                    >
                      <Phone className="h-3.5 w-3.5 mr-1" />
                      {sendAdvancePaymentMutation.isPending ? "Sending..." : "Resend Link"}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => confirmAdvancePaymentMutation.mutate({ bookingId: booking.id })}
                      disabled={confirmAdvancePaymentMutation.isPending}
                      data-testid={`button-confirm-payment-${booking.id}`}
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1" />
                      {confirmAdvancePaymentMutation.isPending ? "Confirming..." : "Payment Received"}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground"
                    onClick={() => confirmBookingMutation.mutate({ bookingId: booking.id })}
                    disabled={confirmBookingMutation.isPending}
                    data-testid={`button-skip-advance-${booking.id}`}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {confirmBookingMutation.isPending ? "..." : "Skip Advance (Walk-in)"}
                  </Button>
                </div>
              )}

              {booking.status === "confirmed" && (
                <div className="px-3 pb-2 pt-1 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => sendAdvancePaymentMutation.mutate({ bookingId: booking.id })}
                    disabled={sendAdvancePaymentMutation.isPending}
                    data-testid={`button-send-payment-${booking.id}`}
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1" />
                    {sendAdvancePaymentMutation.isPending ? "Sending..." : "Send Payment Link"}
                  </Button>
                </div>
              )}

              {/* Primary action buttons - Checkout is dominant; Service is secondary */}
              <div className="px-3 pb-3 pt-1.5 flex flex-col sm:flex-row gap-2 border-t mt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 sm:h-9 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20 sm:w-auto w-full sm:px-3 shrink-0"
                  onClick={() => setAddServiceDialog({ open: true, bookingId: booking.id, guestName: booking.guest.fullName })}
                  data-testid={`button-add-service-${booking.id}`}
                >
                  <Wrench className="h-3.5 w-3.5 mr-1" />
                  Service
                </Button>
                {booking.status !== "checked-out" && (
                  <Button
                    size="sm"
                    className="flex-1 h-9 text-sm font-semibold w-full sm:w-auto shadow-sm"
                    variant="default"
                    onClick={async () => {
                      setMergedBookingDetails(null);
                      try {
                        const billRes = await fetch(`/api/bills/booking/${booking.id}`);
                        if (billRes.ok) {
                          const bill = await billRes.json();
                          if (bill.mergedBookingIds && bill.mergedBookingIds.length > 0) {
                            const mergedDetails: Array<{
                              bookingId: number;
                              guestName: string;
                              roomNumber: string;
                              roomCharges: number;
                              advancePaid: number;
                              nights: number;
                            }> = [];
                            for (const mergedBookingId of bill.mergedBookingIds) {
                              const bookingRes = await fetch(`/api/bookings/${mergedBookingId}`);
                              if (bookingRes.ok) {
                                const mergedBooking = await bookingRes.json();
                                const checkIn = new Date(mergedBooking.checkInDate);
                                const checkOut = new Date(mergedBooking.checkOutDate);
                                const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
                                let roomCharges = 0;
                                if (mergedBooking.customPrice) {
                                  roomCharges = parseFloat(mergedBooking.customPrice) * nights;
                                } else if (mergedBooking.room) {
                                  roomCharges = parseFloat(mergedBooking.room.pricePerNight || 0) * nights;
                                }
                                mergedDetails.push({
                                  bookingId: mergedBooking.id,
                                  guestName: mergedBooking.guest?.fullName || "Guest",
                                  roomNumber: mergedBooking.room?.roomNumber || "N/A",
                                  roomCharges,
                                  advancePaid: parseFloat(String(mergedBooking.advanceAmount || 0)),
                                  nights
                                });
                              }
                            }
                            setMergedBookingDetails(mergedDetails);
                            const mergedAdvance = parseFloat(String(bill.totalAdvance || bill.advancePaid || 0));
                            const mergedTotal = parseFloat(String(bill.totalAmount || 0));
                            setCheckoutDialog({
                              open: true,
                              booking: {
                                ...booking,
                                charges: {
                                  roomCharges: String(bill.roomCharges || 0),
                                  foodCharges: String(bill.foodCharges || 0),
                                  extraCharges: String(bill.extraCharges || 0),
                                  subtotal: String(bill.subtotal || 0),
                                  gstAmount: String(bill.gstAmount || 0),
                                  serviceChargeAmount: String(bill.serviceChargeAmount || 0),
                                  totalAmount: String(bill.totalAmount || 0),
                                  advancePaid: String(mergedAdvance),
                                  balanceAmount: String(Math.max(0, mergedTotal - mergedAdvance)),
                                }
                              }
                            });
                          } else {
                            setCheckoutDialog({ open: true, booking });
                          }
                        } else {
                          setCheckoutDialog({ open: true, booking });
                        }
                      } catch (err) {
                        setCheckoutDialog({ open: true, booking });
                      }
                    }}
                    data-testid={`button-checkout-${booking.id}`}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" />
                    Checkout
                  </Button>
                )}
                {booking.status === "checked-out" && isAdmin && (
                  <Button
                    size="sm"
                    className="flex-1 h-9 text-sm font-semibold w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                    onClick={() => reopenBookingMutation.mutate(booking.id)}
                    disabled={reopenBookingMutation.isPending}
                    data-testid={`button-reopen-booking-${booking.id}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    {reopenBookingMutation.isPending ? "Reopening..." : "Re-open"}
                  </Button>
                )}
              </div>
            </Card>
          );
          })}
        </div>
      )}

      {checkedOutTodayBookings.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium border-t pt-4">
            <LogOut className="h-4 w-4" />
            Checked Out Today ({checkedOutTodayBookings.length})
          </div>
          <div className="grid gap-4 opacity-70">
            {checkedOutTodayBookings.map((booking) => (
              <Card key={booking.id} data-testid={`card-checked-out-${booking.id}`} className="border-dashed">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{booking.guest.fullName}</span>
                      {booking.room && <span className="text-sm text-muted-foreground">· Room {booking.room.roomNumber}</span>}
                      {booking.rooms && booking.rooms.length > 0 && (
                        <span className="text-sm text-muted-foreground">· Rooms {booking.rooms.map(r => r.roomNumber).join(", ")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-gray-500 border-gray-300">Checked Out</Badge>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-teal-600 border-teal-300 hover:bg-teal-50"
                          onClick={() => reopenBookingMutation.mutate(booking.id)}
                          disabled={reopenBookingMutation.isPending}
                          data-testid={`button-reopen-booking-${booking.id}`}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Re-open
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>Check-in: {format(new Date(booking.checkInDate), "dd MMM")}</span>
                    <span>Bill: ₹{parseFloat(booking.charges.subtotal).toFixed(2)}</span>
                    {parseFloat(booking.charges.advancePaid) > 0 && (
                      <span className="text-green-600">Advance: ₹{booking.charges.advancePaid}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={checkoutDialog.open} onOpenChange={(open) => {
        if (!open) {
          setCheckoutDialog({ open: false, booking: null });
          setCashAmount("");
          setGstOnRooms(true);
          setGstOnFood(false);
          setIncludeServiceCharge(false);
          setManualCharges([{ name: "", amount: "" }]);
          setDiscountType("none");
          setDiscountValue("");
          setPaymentMethod("upi");
          setExtendedStayHandled(false);
          setExtendedStayChoice(null);
          setCustomExtendedAmount("");
          setMergedBookingDetails(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-checkout">
          <DialogHeader>
            <DialogTitle>Checkout - {checkoutDialog.booking?.guest.fullName}</DialogTitle>
          </DialogHeader>

          {checkoutDialog.booking && (() => {
            const booking = checkoutDialog.booking;
            
            // Extended stay detection - compare dates only (ignore time)
            const checkInDate = new Date(booking.checkInDate);
            const originalCheckOutDate = new Date(booking.checkOutDate);
            const today = new Date();
            
            // Normalize all dates to start of day for accurate comparison
            const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const checkoutDateOnly = new Date(originalCheckOutDate.getFullYear(), originalCheckOutDate.getMonth(), originalCheckOutDate.getDate());
            
            const bookedNights = booking.nightsStayed;
            
            // Extended stay is only when today is AFTER the scheduled checkout date
            // If today is Jan 7 and checkout is Jan 7, extraNights = 0
            // If today is Jan 8 and checkout was Jan 7, extraNights = 1
            const daysPastCheckout = Math.floor((todayDateOnly.getTime() - checkoutDateOnly.getTime()) / (1000 * 60 * 60 * 24));
            const extraNights = Math.max(0, daysPastCheckout);
            const actualNights = bookedNights + extraNights;
            
            // Calculate room rate per night from actual booking charges (accounts for custom pricing)
            const baseRoomChargesForRate = parseFloat(booking.charges.roomCharges) || 0;
            const roomRate = bookedNights > 0 ? baseRoomChargesForRate / bookedNights : 0;
            
            const calculatedExtendedAmount = extraNights * roomRate;
            
            // Check for booking conflicts during extended stay period
            const currentRoomIds = booking.isGroupBooking && booking.roomIds 
              ? booking.roomIds 
              : booking.room ? [booking.room.id] : [];
            
            const conflictingBookings = activeBookings?.filter(otherBooking => {
              if (otherBooking.id === booking.id) return false;
              
              const otherRoomIds = otherBooking.isGroupBooking && otherBooking.roomIds
                ? otherBooking.roomIds
                : otherBooking.room ? [otherBooking.room.id] : [];
              
              // Check if any room overlaps
              const hasRoomOverlap = currentRoomIds.some(roomId => otherRoomIds.includes(roomId));
              if (!hasRoomOverlap) return false;
              
              // Check if the other booking's check-in is during our extended period
              const otherCheckIn = new Date(otherBooking.checkInDate);
              const extendedPeriodStart = new Date(booking.checkOutDate);
              
              return otherCheckIn >= extendedPeriodStart && otherCheckIn <= today;
            }) || [];
            
            // Determine extended stay charges to add
            let extendedStayCharges = 0;
            if (extraNights > 0 && extendedStayHandled) {
              if (extendedStayChoice === "calculated") {
                extendedStayCharges = calculatedExtendedAmount;
              } else if (extendedStayChoice === "custom") {
                extendedStayCharges = parseFloat(customExtendedAmount) || 0;
              }
              // "skip" means 0
            }
            
            const baseRoomCharges = parseFloat(booking.charges.roomCharges) || 0;
            const roomCharges = baseRoomCharges + extendedStayCharges;
            const foodCharges = parseFloat(booking.charges.foodCharges) || 0;
            const extraCharges = parseFloat(booking.charges.extraCharges) || 0;
            
            const manualChargesTotal = manualCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            const subtotal = roomCharges + foodCharges + extraCharges + manualChargesTotal;
            
            const roomGstRate = 5;
            const foodGstRate = 5;
            const serviceChargeRate = 10;
            
            const roomGst = gstOnRooms ? (roomCharges * roomGstRate / 100) : 0;
            const foodGst = gstOnFood ? (foodCharges * foodGstRate / 100) : 0;
            const totalGst = roomGst + foodGst;
            
            const serviceCharge = includeServiceCharge ? (subtotal * serviceChargeRate / 100) : 0;
            
            let discount = 0;
            if (discountType === "percentage" && discountValue) {
              discount = (subtotal + totalGst + serviceCharge) * (parseFloat(discountValue) / 100);
            } else if (discountType === "fixed" && discountValue) {
              discount = parseFloat(discountValue) || 0;
            }
            
            const grandTotal = subtotal + totalGst + serviceCharge - discount;
            const advancePaid = parseFloat(booking.charges.advancePaid) || 0;
            const cashPaid = parseFloat(cashAmount) || 0;
            const remainingBalance = grandTotal - advancePaid - cashPaid;

            return (
              <div className="space-y-4">
                {/* Room Conflict Warning */}
                {extraNights > 0 && conflictingBookings.length > 0 && (
                  <Alert className="border-red-400 bg-red-50 dark:bg-red-900/20" data-testid="alert-booking-conflict">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 dark:text-red-300">
                      <div className="font-semibold mb-2">Booking Conflict Detected!</div>
                      <div className="text-sm space-y-2">
                        <p>The following booking(s) overlap with this guest's extended stay:</p>
                        {conflictingBookings.map(conflict => (
                          <div key={conflict.id} className="bg-red-100 dark:bg-red-900/40 p-2 rounded-md">
                            <div className="font-medium">{conflict.guest.fullName}</div>
                            <div className="text-xs">
                              Room: {conflict.isGroupBooking && conflict.rooms 
                                ? conflict.rooms.map(r => r.roomNumber).join(", ") 
                                : conflict.room?.roomNumber}
                            </div>
                            <div className="text-xs">
                              Check-in: {format(new Date(conflict.checkInDate), "dd MMM yyyy")}
                            </div>
                          </div>
                        ))}
                        <p className="mt-2 font-medium">Please arrange alternative accommodation for the conflicting guest(s).</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Extended Stay Alert */}
                {extraNights > 0 && !extendedStayHandled && (
                  <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-900/20" data-testid="alert-extended-stay">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 dark:text-orange-300">
                      <div className="font-semibold mb-2">Extended Stay Detected</div>
                      <div className="text-sm space-y-1 mb-3">
                        <div>Original Booking: {bookedNights} night(s)</div>
                        <div>Actual Stay: {actualNights} night(s)</div>
                        <div className="font-semibold">Extra Nights: {extraNights} night(s)</div>
                        <div className="mt-2">Room Rate: ₹{roomRate.toFixed(2)}/night</div>
                        <div className="font-bold text-lg">Calculated Amount: ₹{calculatedExtendedAmount.toFixed(2)}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setExtendedStayChoice("calculated");
                            setExtendedStayHandled(true);
                          }}
                          data-testid="button-accept-extended"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Add ₹{calculatedExtendedAmount.toFixed(2)} for Extended Stay
                        </Button>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Custom amount"
                            value={customExtendedAmount}
                            onChange={(e) => setCustomExtendedAmount(e.target.value)}
                            className="flex-1"
                            data-testid="input-custom-extended"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (customExtendedAmount) {
                                setExtendedStayChoice("custom");
                                setExtendedStayHandled(true);
                              }
                            }}
                            disabled={!customExtendedAmount}
                            data-testid="button-custom-extended"
                          >
                            Add Custom
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-muted-foreground"
                          onClick={() => {
                            setExtendedStayChoice("skip");
                            setExtendedStayHandled(true);
                          }}
                          data-testid="button-skip-extended"
                        >
                          No Extra Charge (Complimentary)
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Extended Stay Applied Badge */}
                {extraNights > 0 && extendedStayHandled && extendedStayChoice !== "skip" && extendedStayCharges > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 p-3 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Extended Stay: +{extraNights} nights added</span>
                    </div>
                    <span className="font-bold text-green-700 dark:text-green-400">+₹{extendedStayCharges.toFixed(2)}</span>
                  </div>
                )}

                <div className="bg-muted/50 p-3 rounded-md space-y-2 text-sm">
                  <div className="font-semibold text-base mb-2">
                    Bill Breakdown
                    {mergedBookingDetails && mergedBookingDetails.length > 1 && (
                      <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                        (Merged Bill - {mergedBookingDetails.length} rooms)
                      </span>
                    )}
                  </div>
                  
                  {/* Room-by-room breakdown for merged bills */}
                  {mergedBookingDetails && mergedBookingDetails.length > 1 && (
                    <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Room-wise Charges:</div>
                      {mergedBookingDetails.map((detail) => (
                        <div key={detail.bookingId} className="flex justify-between text-xs py-1 border-b border-blue-100 dark:border-blue-800 last:border-0">
                          <span className="text-blue-600 dark:text-blue-400">
                            Room {detail.roomNumber} ({detail.guestName}) - {detail.nights} night{detail.nights > 1 ? "s" : ""}
                          </span>
                          <span className="font-mono text-blue-700 dark:text-blue-300">₹{detail.roomCharges.toFixed(2)}</span>
                        </div>
                      ))}
                      {mergedBookingDetails.some(d => d.advancePaid > 0) && (
                        <>
                          <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mt-2 mb-1">Advance Payments:</div>
                          {mergedBookingDetails.filter(d => d.advancePaid > 0).map((detail) => (
                            <div key={`adv-${detail.bookingId}`} className="flex justify-between text-xs py-1 border-b border-blue-100 dark:border-blue-800 last:border-0">
                              <span className="text-green-600 dark:text-green-400">
                                Room {detail.roomNumber} ({detail.guestName})
                              </span>
                              <span className="font-mono text-green-700 dark:text-green-300">₹{detail.advancePaid.toFixed(2)}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Room Charges ({bookedNights}{extraNights > 0 && extendedStayHandled && extendedStayChoice !== "skip" ? ` + ${extraNights} extended` : ""} nights):
                    </span>
                    <span className="font-mono">₹{roomCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Food Orders:</span>
                    <span className="font-mono">₹{foodCharges.toFixed(2)}</span>
                  </div>
                  {extraCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Extra Services:</span>
                      <span className="font-mono">₹{extraCharges.toFixed(2)}</span>
                    </div>
                  )}
                  {manualChargesTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Additional Charges:</span>
                      <span className="font-mono">₹{manualChargesTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                  </div>
                  
                  {gstOnRooms && roomGst > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>GST on Room ({roomGstRate}%):</span>
                      <span className="font-mono">₹{roomGst.toFixed(2)}</span>
                    </div>
                  )}
                  {gstOnFood && foodGst > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>GST on Food ({foodGstRate}%):</span>
                      <span className="font-mono">₹{foodGst.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {includeServiceCharge && (
                    <div className="flex justify-between text-blue-600">
                      <span>Service Charge ({serviceChargeRate}%):</span>
                      <span className="font-mono">₹{serviceCharge.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span className="font-mono">-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{grandTotal.toFixed(2)}</span>
                  </div>
                  
                  {advancePaid > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Advance Paid:</span>
                      <span className="font-mono">-₹{advancePaid.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`border-t pt-2 flex justify-between font-bold text-lg ${advancePaid > 0 ? 'text-destructive' : 'text-orange-600'}`}>
                    <span>Balance Due:</span>
                    <span className="font-mono">₹{Math.max(0, grandTotal - advancePaid).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">GST Options</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gst-on-rooms"
                        checked={gstOnRooms}
                        onCheckedChange={(checked) => setGstOnRooms(checked as boolean)}
                        data-testid="checkbox-gst-on-rooms"
                      />
                      <Label htmlFor="gst-on-rooms" className="text-sm cursor-pointer">
                        GST on Rooms (5%)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="gst-on-food"
                        checked={gstOnFood}
                        onCheckedChange={(checked) => setGstOnFood(checked as boolean)}
                        data-testid="checkbox-gst-on-food"
                      />
                      <Label htmlFor="gst-on-food" className="text-sm cursor-pointer">
                        GST on Food (5%)
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-service-charge"
                      checked={includeServiceCharge}
                      onCheckedChange={(checked) => setIncludeServiceCharge(checked as boolean)}
                      data-testid="checkbox-include-service-charge"
                    />
                    <Label htmlFor="include-service-charge" className="text-sm cursor-pointer">
                      Include Service Charge (10%)
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Add Extra Items</Label>
                  {manualCharges.map((charge, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Item name"
                        value={charge.name}
                        onChange={(e) => {
                          const updated = [...manualCharges];
                          updated[index].name = e.target.value;
                          setManualCharges(updated);
                        }}
                        className="flex-1"
                        data-testid={`input-extra-item-name-${index}`}
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={charge.amount}
                        onChange={(e) => {
                          const updated = [...manualCharges];
                          updated[index].amount = e.target.value;
                          setManualCharges(updated);
                        }}
                        className="w-24"
                        data-testid={`input-extra-item-amount-${index}`}
                      />
                      {manualCharges.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setManualCharges(manualCharges.filter((_, i) => i !== index))}
                          data-testid={`button-remove-extra-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManualCharges([...manualCharges, { name: "", amount: "" }])}
                    data-testid="button-add-extra-item"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Discount Type</Label>
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger data-testid="select-discount-type">
                        <SelectValue placeholder="No discount" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Discount</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {discountType !== "none" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {discountType === "percentage" ? "Discount %" : "Discount ₹"}
                      </Label>
                      <Input
                        type="number"
                        placeholder={discountType === "percentage" ? "10" : "500"}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        data-testid="input-discount-value"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(val) => { setPaymentMethod(val); setCashAmount(""); }}>
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "upi" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cash Received (optional)</Label>
                    <Input
                      id="cash-amount"
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Enter cash amount if any"
                      data-testid="input-cash-received"
                    />
                    <p className="text-xs text-muted-foreground">Enter cash collected from guest — remaining will be the UPI amount due.</p>
                  </div>
                )}

                <div className="bg-primary/10 p-3 rounded-md">
                  <div className="flex justify-between gap-4 items-center">
                    <span className="font-semibold">
                      {paymentMethod === "upi" && parseFloat(cashAmount || "0") > 0
                        ? "UPI Amount Due:"
                        : "Balance Due:"}
                    </span>
                    <span className={`font-mono text-xl font-bold whitespace-nowrap ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      ₹{Math.max(0, remainingBalance).toFixed(2)}
                    </span>
                  </div>
                  {paymentMethod === "upi" && parseFloat(cashAmount || "0") > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cash: ₹{parseFloat(cashAmount || "0").toLocaleString()} + Bank: ₹{Math.max(0, remainingBalance).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Payment Status - Mark as Paid or Pending */}
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <Label className="text-sm font-medium">Bill Status</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={paymentStatus === "paid" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setPaymentStatus("paid")}
                      data-testid="button-status-paid"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Paid
                    </Button>
                    <Button
                      type="button"
                      variant={paymentStatus === "pending" ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => setPaymentStatus("pending")}
                      data-testid="button-status-pending"
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Pending
                    </Button>
                  </div>
                  
                  {paymentStatus === "pending" && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Due Date (Optional)</Label>
                          <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            data-testid="input-due-date"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Pending Amount</Label>
                          <div className="h-9 flex items-center px-3 bg-orange-100 dark:bg-orange-900/30 rounded-md text-orange-700 dark:text-orange-300 font-mono font-semibold">
                            ₹{Math.max(0, remainingBalance).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Reason for Pending (Optional)</Label>
                        <Select value={pendingReason} onValueChange={setPendingReason}>
                          <SelectTrigger data-testid="select-pending-reason">
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corporate_billing">Corporate Billing</SelectItem>
                            <SelectItem value="travel_agent">Travel Agent Settlement</SelectItem>
                            <SelectItem value="payment_pending">Payment Processing</SelectItem>
                            <SelectItem value="partial_payment">Partial Payment Received</SelectItem>
                            <SelectItem value="dispute">Dispute / Clarification</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-xs text-orange-700 dark:text-orange-300 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>Guest will be checked out and bill will be marked as pending. You can collect payment later from the Billing page.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Download Bill PDF */}
                  <Button
                    variant="outline"
                    className="w-full border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/20"
                    data-testid="button-download-bill-checkout"
                    onClick={async () => {
                      try {
                        const b = booking;
                        const roomLabel = b.isGroupBooking && b.rooms?.length
                          ? `Rooms ${b.rooms.map((r: any) => r.roomNumber).join(", ")}`
                          : b.room?.roomNumber ?? "TBA";
                        const propertyName = b.property?.name ?? "Hostezee";
                        const checkIn = b.actualCheckInTime
                          ? format(new Date(b.actualCheckInTime), "dd MMM yyyy, h:mm a")
                          : format(new Date(b.checkInDate), "dd MMM yyyy");
                        const checkOut = format(new Date(b.checkOutDate), "dd MMM yyyy");

                        const ordersHtml = (b.orders ?? []).filter((o: any) => o.status !== "rejected").map((order: any) => {
                          const items = (order.items ?? []).map((item: any) =>
                            `<tr><td style="padding:3px 8px;color:#555">${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity || 1}</td><td style="padding:3px 8px;text-align:right;color:#555">&#8377;${item.totalPrice || (item.price * (item.quantity || 1))}</td></tr>`
                          ).join("");
                          return `
                            <tr style="background:#f9f9f9">
                              <td style="padding:6px 8px;font-weight:600" colspan="2">Order #${order.id} <span style="font-size:11px;color:#888;font-weight:400">(${order.status})</span></td>
                            </tr>
                            ${items}
                            <tr><td style="padding:4px 8px;border-top:1px solid #eee;font-weight:600">Order Total</td><td style="padding:4px 8px;border-top:1px solid #eee;text-align:right;font-weight:600">&#8377;${parseFloat(order.totalAmount).toFixed(2)}</td></tr>`;
                        }).join("");

                        const extrasHtml = (b.extraServices ?? []).map((s: any) =>
                          `<tr><td style="padding:3px 8px;color:#555">${s.serviceName}${s.serviceDate ? ` <span style="font-size:11px;color:#888">(${format(new Date(s.serviceDate), "dd MMM")})</span>` : ""}</td><td style="padding:3px 8px;text-align:right;color:#555">&#8377;${parseFloat(s.amount).toFixed(2)}</td></tr>`
                        ).join("");

                        const manualHtml = manualCharges.filter(c => c.name && parseFloat(c.amount) > 0).map(c =>
                          `<tr><td style="padding:3px 8px;color:#555">${c.name}</td><td style="padding:3px 8px;text-align:right;color:#555">&#8377;${parseFloat(c.amount).toFixed(2)}</td></tr>`
                        ).join("");

                        const guestNameClean = b.guest.fullName.replace(/\s+/g, "_");
                        const dateSuffix = format(new Date(), "dd-MMM-yyyy");
                        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
                          <title>Bill_${guestNameClean}_${dateSuffix}</title>
                          <style>
                          * { box-sizing: border-box; margin: 0; padding: 0; }
                          body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #fff; }
                          .page { max-width: 680px; margin: 0 auto; padding: 32px 28px; }
                          @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .page { max-width: 100%; padding: 16px 20px; }
                            @page { margin: 10mm; size: A4 portrait; }
                          }
                          .header { background: #1E3A5F; color: #fff; border-radius: 8px 8px 0 0; padding: 22px 24px 18px; }
                          .header h1 { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
                          .header .tagline { font-size: 12px; color: #2BB6A8; margin-top: 2px; }
                          .header .property { font-size: 14px; margin-top: 8px; opacity: 0.9; }
                          .bill-meta { background: #f5f8ff; border: 1px solid #dde5f5; border-top: none; border-radius: 0 0 8px 8px; padding: 16px 24px; display: flex; gap: 32px; flex-wrap: wrap; margin-bottom: 24px; }
                          .bill-meta div { min-width: 140px; }
                          .bill-meta .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
                          .bill-meta .value { font-size: 13px; font-weight: 600; color: #1E3A5F; }
                          .section { margin-bottom: 20px; }
                          .section-title { font-size: 13px; font-weight: 700; color: #1E3A5F; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; background: #eef3fb; border-left: 3px solid #2BB6A8; margin-bottom: 0; }
                          table { width: 100%; border-collapse: collapse; }
                          table td { font-size: 13px; }
                          .summary-table { border: 1px solid #e0e7ef; border-radius: 6px; overflow: hidden; }
                          .summary-table tr:last-child td { border-bottom: none; }
                          .summary-table td { padding: 8px 14px; border-bottom: 1px solid #eef2f8; }
                          .total-row td { font-size: 16px; font-weight: 700; background: #1E3A5F; color: #fff; padding: 10px 14px; }
                          .gst-row td { color: #15803d; font-weight: 600; background: #f0fdf4; }
                          .discount-row td { color: #dc2626; font-weight: 600; background: #fff5f5; }
                          .advance-row td { color: #16a34a; font-weight: 600; background: #f0fdf4; }
                          .balance-row td { color: #dc2626; font-weight: 700; background: #fff5f5; font-size: 15px; }
                          .footer { margin-top: 32px; border-top: 1px solid #e0e7ef; padding-top: 14px; text-align: center; color: #aaa; font-size: 11px; }
                        </style></head><body><div class="page">
                          <div class="header">
                            <h1>Hostezee</h1>
                            <div class="tagline">Simplify Stays</div>
                            <div class="property">${propertyName}</div>
                          </div>
                          <div class="bill-meta">
                            <div><div class="label">Guest</div><div class="value">${b.guest.fullName}</div></div>
                            <div><div class="label">Phone</div><div class="value">${b.guest.phone ?? "-"}</div></div>
                            <div><div class="label">Room</div><div class="value">${roomLabel}</div></div>
                            <div><div class="label">Check-in</div><div class="value">${checkIn}</div></div>
                            <div><div class="label">Check-out</div><div class="value">${checkOut}</div></div>
                            <div><div class="label">Nights</div><div class="value">${actualNights}</div></div>
                            <div><div class="label">Guests</div><div class="value">${b.numberOfGuests ?? 1}</div></div>
                            <div><div class="label">Source</div><div class="value">${(() => { const s = b.source ?? ""; if (s.startsWith("aiosell-")) { const c = s.replace("aiosell-","").toLowerCase(); return c.includes("booking") ? "Booking.com" : c.includes("mmt") ? "MMT" : c.includes("airbnb") ? "Airbnb" : "OTA"; } return s || "Direct"; })()}</div></div>
                          </div>

                          <div class="section">
                            <div class="section-title">Room Charges</div>
                            <table class="summary-table"><tbody>
                              ${(b.isGroupBooking && b.rooms?.length ? b.rooms : b.room ? [b.room] : []).map((r: any) =>
                                `<tr><td>${r.roomNumber ? `Room ${r.roomNumber}` : "Room"} ${r.roomType ? `(${r.roomType})` : ""}</td><td style="text-align:right">&#8377;${(parseFloat(b.charges.roomCharges) / Math.max(1, b.rooms?.length || 1)).toFixed(2)}/night</td></tr>`
                              ).join("")}
                              <tr><td style="font-weight:600">${actualNights} night(s)${extendedStayCharges > 0 ? ` incl. ${extraNights} extended` : ""}</td><td style="text-align:right;font-weight:600">&#8377;${roomCharges.toFixed(2)}</td></tr>
                            </tbody></table>
                          </div>

                          ${(b.orders ?? []).filter((o: any) => o.status !== "rejected").length > 0 ? `
                          <div class="section">
                            <div class="section-title">Food Orders</div>
                            <table class="summary-table"><tbody>
                              ${ordersHtml}
                              <tr style="background:#f0f7ff"><td style="padding:6px 8px;font-weight:700">Total Food Charges</td><td style="padding:6px 8px;text-align:right;font-weight:700">&#8377;${foodCharges.toFixed(2)}</td></tr>
                            </tbody></table>
                          </div>` : ""}

                          ${(b.extraServices ?? []).length > 0 ? `
                          <div class="section">
                            <div class="section-title">Extra Services</div>
                            <table class="summary-table"><tbody>
                              ${extrasHtml}
                              <tr style="background:#f0f7ff"><td style="padding:6px 8px;font-weight:700">Total Extra Services</td><td style="padding:6px 8px;text-align:right;font-weight:700">&#8377;${extraCharges.toFixed(2)}</td></tr>
                            </tbody></table>
                          </div>` : ""}

                          ${manualHtml ? `
                          <div class="section">
                            <div class="section-title">Additional Charges</div>
                            <table class="summary-table"><tbody>
                              ${manualHtml}
                              <tr style="background:#f0f7ff"><td style="padding:6px 8px;font-weight:700">Total Additional</td><td style="padding:6px 8px;text-align:right;font-weight:700">&#8377;${manualChargesTotal.toFixed(2)}</td></tr>
                            </tbody></table>
                          </div>` : ""}

                          <div class="section">
                            <div class="section-title">Bill Summary</div>
                            <table class="summary-table"><tbody>
                              <tr><td>Room Charges</td><td style="text-align:right">&#8377;${roomCharges.toFixed(2)}</td></tr>
                              ${foodCharges > 0 ? `<tr><td>Food Charges</td><td style="text-align:right">&#8377;${foodCharges.toFixed(2)}</td></tr>` : ""}
                              ${extraCharges > 0 ? `<tr><td>Extra Services</td><td style="text-align:right">&#8377;${extraCharges.toFixed(2)}</td></tr>` : ""}
                              ${manualChargesTotal > 0 ? `<tr><td>Additional Charges</td><td style="text-align:right">&#8377;${manualChargesTotal.toFixed(2)}</td></tr>` : ""}
                              <tr><td style="font-weight:600;border-top:1px solid #ddd;padding-top:8px">Subtotal</td><td style="text-align:right;font-weight:600;border-top:1px solid #ddd;padding-top:8px">&#8377;${subtotal.toFixed(2)}</td></tr>
                              ${roomGst > 0 ? `<tr class="gst-row"><td>GST on Rooms (${roomGstRate}%)</td><td style="text-align:right">&#8377;${roomGst.toFixed(2)}</td></tr>` : ""}
                              ${foodGst > 0 ? `<tr class="gst-row"><td>GST on Food (${foodGstRate}%)</td><td style="text-align:right">&#8377;${foodGst.toFixed(2)}</td></tr>` : ""}
                              ${serviceCharge > 0 ? `<tr class="gst-row"><td>Service Charge (${serviceChargeRate}%)</td><td style="text-align:right">&#8377;${serviceCharge.toFixed(2)}</td></tr>` : ""}
                              ${discount > 0 ? `<tr class="discount-row"><td>Discount</td><td style="text-align:right">-&#8377;${discount.toFixed(2)}</td></tr>` : ""}
                              <tr class="total-row"><td>Grand Total</td><td style="text-align:right">&#8377;${grandTotal.toFixed(2)}</td></tr>
                              ${advancePaid > 0 ? `<tr class="advance-row"><td>Advance Paid</td><td style="text-align:right">-&#8377;${advancePaid.toFixed(2)}</td></tr>` : ""}
                              ${advancePaid > 0 ? `<tr class="balance-row"><td>Balance Due</td><td style="text-align:right">&#8377;${Math.max(0, grandTotal - advancePaid).toFixed(2)}</td></tr>` : ""}
                            </tbody></table>
                          </div>

                          <div class="footer">Generated by Hostezee &bull; ${format(new Date(), "dd MMM yyyy, hh:mm a")} &bull; Thank you for your stay!</div>
                        </div></body></html>`;

                        // Generate real PDF using html2pdf.js
                        const html2pdfLib = (await import('html2pdf.js')).default;
                        const el = document.createElement('div');
                        el.innerHTML = html;
                        el.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;z-index:-999;';
                        document.body.appendChild(el);
                        try {
                          await html2pdfLib().from(el).set({
                            margin: [8, 8, 8, 8],
                            filename: `Bill_${guestNameClean}_${dateSuffix}.pdf`,
                            html2canvas: { scale: 2, useCORS: true, logging: false },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                          }).save();
                        } finally {
                          document.body.removeChild(el);
                        }
                      } catch (error) {
                        console.error("PDF download error:", error);
                        toast({ title: "Error", description: "Failed to generate bill PDF", variant: "destructive" });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Bill PDF
                  </Button>

                  {/* Send Bill PDF on WhatsApp */}
                  <Button
                    className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                    data-testid="button-send-bill-pdf-whatsapp"
                    onClick={async () => {
                      const b = booking;
                      const phone = (b.guest?.whatsappPhone || b.guest?.phone || "").replace(/\D/g, "");
                      if (!phone) {
                        toast({ title: "No phone number", description: "Guest has no phone number on file.", variant: "destructive" });
                        return;
                      }
                      try {
                        const roomLabel = b.isGroupBooking && b.rooms?.length
                          ? `Rooms ${b.rooms.map((r: any) => r.roomNumber).join(", ")}`
                          : b.room?.roomNumber ?? "TBA";
                        const propertyName = b.property?.name ?? "Hostezee";
                        const checkIn = b.actualCheckInTime
                          ? format(new Date(b.actualCheckInTime), "dd MMM yyyy, h:mm a")
                          : format(new Date(b.checkInDate), "dd MMM yyyy");
                        const checkOut = format(new Date(b.checkOutDate), "dd MMM yyyy");

                        const ordersHtml = (b.orders ?? []).filter((o: any) => o.status !== "rejected").map((order: any) => {
                          const items = (order.items ?? []).map((item: any) =>
                            `<tr><td style="padding:3px 8px;color:#555">${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity || 1}</td><td style="padding:3px 8px;text-align:right;color:#555">&#8377;${item.totalPrice || (item.price * (item.quantity || 1))}</td></tr>`
                          ).join("");
                          return `<tr style="background:#f9f9f9"><td style="padding:6px 8px;font-weight:600" colspan="2">Order #${order.id}</td></tr>${items}<tr><td style="padding:4px 8px;border-top:1px solid #eee;font-weight:600">Order Total</td><td style="padding:4px 8px;border-top:1px solid #eee;text-align:right;font-weight:600">&#8377;${parseFloat(order.totalAmount).toFixed(2)}</td></tr>`;
                        }).join("");
                        const extrasHtml = (b.extraServices ?? []).map((s: any) =>
                          `<tr><td style="padding:3px 8px;color:#555">${s.serviceName}</td><td style="padding:3px 8px;text-align:right;color:#555">&#8377;${parseFloat(s.amount).toFixed(2)}</td></tr>`
                        ).join("");
                        const manualHtml2 = manualCharges.filter(c => c.name && parseFloat(c.amount) > 0).map(c =>
                          `<tr><td style="padding:3px 8px;color:#555">${c.name}</td><td style="padding:3px 8px;text-align:right;color:#555">&#8377;${parseFloat(c.amount).toFixed(2)}</td></tr>`
                        ).join("");
                        const guestNameClean2 = b.guest.fullName.replace(/\s+/g, "_");
                        const dateSuffix2 = format(new Date(), "dd-MMM-yyyy");
                        const fileName = `Bill_${guestNameClean2}_${dateSuffix2}.pdf`;

                        const pdfHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#222;background:#fff}.page{max-width:680px;margin:0 auto;padding:32px 28px}.header{background:#1E3A5F;color:#fff;border-radius:8px 8px 0 0;padding:22px 24px 18px}.header h1{font-size:22px;font-weight:700}.header .tagline{font-size:12px;color:#2BB6A8;margin-top:2px}.header .property{font-size:14px;margin-top:8px;opacity:.9}.bill-meta{background:#f5f8ff;border:1px solid #dde5f5;border-top:none;border-radius:0 0 8px 8px;padding:16px 24px;display:flex;gap:32px;flex-wrap:wrap;margin-bottom:24px}.bill-meta div{min-width:140px}.bill-meta .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}.bill-meta .value{font-size:13px;font-weight:600;color:#1E3A5F}.section{margin-bottom:20px}.section-title{font-size:13px;font-weight:700;color:#1E3A5F;text-transform:uppercase;letter-spacing:.5px;padding:8px 12px;background:#eef3fb;border-left:3px solid #2BB6A8}table{width:100%;border-collapse:collapse}table td{font-size:13px}.summary-table{border:1px solid #e0e7ef;border-radius:6px;overflow:hidden}.summary-table td{padding:8px 14px;border-bottom:1px solid #eef2f8}.total-row td{font-size:16px;font-weight:700;background:#1E3A5F;color:#fff;padding:10px 14px}.gst-row td{color:#15803d;font-weight:600;background:#f0fdf4}.discount-row td{color:#dc2626;font-weight:600;background:#fff5f5}.advance-row td{color:#16a34a;font-weight:600;background:#f0fdf4}.balance-row td{color:#dc2626;font-weight:700;background:#fff5f5;font-size:15px}.footer{margin-top:32px;border-top:1px solid #e0e7ef;padding-top:14px;text-align:center;color:#aaa;font-size:11px}</style></head><body><div class="page"><div class="header"><h1>Hostezee</h1><div class="tagline">Simplify Stays</div><div class="property">${propertyName}</div></div><div class="bill-meta"><div><div class="label">Guest</div><div class="value">${b.guest.fullName}</div></div><div><div class="label">Phone</div><div class="value">${b.guest.phone ?? "-"}</div></div><div><div class="label">Room</div><div class="value">${roomLabel}</div></div><div><div class="label">Check-in</div><div class="value">${checkIn}</div></div><div><div class="label">Check-out</div><div class="value">${checkOut}</div></div><div><div class="label">Nights</div><div class="value">${actualNights}</div></div></div><div class="section"><div class="section-title">Room Charges</div><table class="summary-table"><tbody><tr><td style="font-weight:600">${actualNights} night(s)</td><td style="text-align:right;font-weight:600">&#8377;${roomCharges.toFixed(2)}</td></tr></tbody></table></div>${(b.orders ?? []).filter((o: any) => o.status !== "rejected").length > 0 ? `<div class="section"><div class="section-title">Food Orders</div><table class="summary-table"><tbody>${ordersHtml}</tbody></table></div>` : ""}${(b.extraServices ?? []).length > 0 ? `<div class="section"><div class="section-title">Extra Services</div><table class="summary-table"><tbody>${extrasHtml}</tbody></table></div>` : ""}${manualHtml2 ? `<div class="section"><div class="section-title">Additional Charges</div><table class="summary-table"><tbody>${manualHtml2}</tbody></table></div>` : ""}<div class="section"><div class="section-title">Bill Summary</div><table class="summary-table"><tbody><tr><td>Room Charges</td><td style="text-align:right">&#8377;${roomCharges.toFixed(2)}</td></tr>${foodCharges > 0 ? `<tr><td>Food Charges</td><td style="text-align:right">&#8377;${foodCharges.toFixed(2)}</td></tr>` : ""}${extraCharges > 0 ? `<tr><td>Extra Services</td><td style="text-align:right">&#8377;${extraCharges.toFixed(2)}</td></tr>` : ""}${manualChargesTotal > 0 ? `<tr><td>Additional</td><td style="text-align:right">&#8377;${manualChargesTotal.toFixed(2)}</td></tr>` : ""}${roomGst > 0 ? `<tr class="gst-row"><td>GST on Rooms</td><td style="text-align:right">&#8377;${roomGst.toFixed(2)}</td></tr>` : ""}${foodGst > 0 ? `<tr class="gst-row"><td>GST on Food</td><td style="text-align:right">&#8377;${foodGst.toFixed(2)}</td></tr>` : ""}${serviceCharge > 0 ? `<tr class="gst-row"><td>Service Charge</td><td style="text-align:right">&#8377;${serviceCharge.toFixed(2)}</td></tr>` : ""}${discount > 0 ? `<tr class="discount-row"><td>Discount</td><td style="text-align:right">-&#8377;${discount.toFixed(2)}</td></tr>` : ""}<tr class="total-row"><td>Grand Total</td><td style="text-align:right">&#8377;${grandTotal.toFixed(2)}</td></tr>${advancePaid > 0 ? `<tr class="advance-row"><td>Advance Paid</td><td style="text-align:right">-&#8377;${advancePaid.toFixed(2)}</td></tr>` : ""}${advancePaid > 0 ? `<tr class="balance-row"><td>Balance Due</td><td style="text-align:right">&#8377;${Math.max(0, grandTotal - advancePaid).toFixed(2)}</td></tr>` : ""}</tbody></table></div><div class="footer">Generated by Hostezee &bull; ${format(new Date(), "dd MMM yyyy, hh:mm a")} &bull; Thank you for your stay!</div></div></body></html>`;

                        const html2pdfLib = (await import('html2pdf.js')).default;
                        const el = document.createElement('div');
                        el.innerHTML = pdfHtml;
                        el.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;z-index:-999;';
                        document.body.appendChild(el);
                        let pdfBlob: Blob;
                        try {
                          pdfBlob = await html2pdfLib().from(el).set({
                            margin: [8, 8, 8, 8],
                            filename: fileName,
                            html2canvas: { scale: 2, useCORS: true, logging: false },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                          }).outputPdf('blob');
                        } finally {
                          document.body.removeChild(el);
                        }

                        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
                        const waPhone = phone.startsWith("91") ? phone : `91${phone}`;

                        // Mobile: use Web Share API to share directly to WhatsApp
                        if (navigator.share && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
                          await navigator.share({ files: [file], title: `Bill — ${b.guest.fullName}` });
                        } else {
                          // Desktop: download PDF first, then open WhatsApp so user can attach it
                          const blobUrl = URL.createObjectURL(pdfBlob);
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          link.download = fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(blobUrl);
                          setTimeout(() => window.open(`https://wa.me/${waPhone}`, "_blank"), 800);
                          toast({ title: "PDF Downloaded", description: `Bill PDF saved as "${fileName}". WhatsApp is opening — attach the PDF to send.`, duration: 6000 });
                        }
                      } catch (error: any) {
                        console.error("Send PDF WA error:", error);
                        toast({ title: "Failed", description: error.message || "Could not generate bill PDF", variant: "destructive" });
                      }
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Bill PDF on WhatsApp
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/whatsapp/send-prebill', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              bookingId: booking.id,
                              phoneNumber: booking.guest.phone,
                              guestName: booking.guest.fullName,
                              billTotal: grandTotal,
                              roomCharges, foodCharges, extraCharges,
                              gstAmount: totalGst,
                              serviceCharge,
                              discount,
                              advancePayment: advancePaid + cashPaid,
                              balanceDue: Math.max(0, remainingBalance)
                            })
                          });
                          if (!res.ok) {
                            const error = await res.json();
                            throw new Error(error.message || 'Failed to send pre-bill');
                          }
                          const data = await res.json();
                          setPreBillLink(data.preBillLink || null);
                          setPreBillLinkCopied(false);
                          toast({ title: "Pre-bill sent", description: "Guest will receive the bill link on WhatsApp" });
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message || "Failed to send pre-bill", variant: "destructive" });
                        }
                      }}
                      data-testid="button-send-prebill"
                    >
                      Send Pre-Bill
                    </Button>
                    
                    {remainingBalance > 0 && (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/whatsapp/send-payment-link', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                amount: remainingBalance,
                                guestName: booking.guest.fullName,
                                guestPhone: booking.guest.phone,
                                guestEmail: booking.guest.email,
                                bookingId: booking.id,
                                roomCharges: roomCharges,
                                foodCharges: foodCharges,
                                cashReceived: advancePaid + cashPaid
                              })
                            });
                            if (!res.ok) {
                              const error = await res.json();
                              throw new Error(error.message || 'Failed to send payment link');
                            }
                            toast({ title: "Success", description: "Payment link sent via WhatsApp" });
                          } catch (error: any) {
                            toast({ title: "Error", description: error.message || "Failed to send payment link", variant: "destructive" });
                          }
                        }}
                        data-testid="button-send-payment-link"
                      >
                        Send Payment Link
                      </Button>
                    )}
                  </div>

                  {preBillLink && (
                    <div className="rounded-md border border-teal-200 bg-teal-50 dark:bg-teal-950/20 dark:border-teal-800 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
                        <Link2 className="h-3.5 w-3.5" />
                        Pre-bill link (send to guest)
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-xs text-muted-foreground truncate font-mono">{preBillLink}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 shrink-0"
                          data-testid="button-copy-prebill-link"
                          onClick={() => {
                            navigator.clipboard.writeText(preBillLink);
                            setPreBillLinkCopied(true);
                            setTimeout(() => setPreBillLinkCopied(false), 2000);
                          }}
                        >
                          {preBillLinkCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCheckoutDialog({ open: false, booking: null })}
                      data-testid="button-cancel-checkout"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      variant={paymentStatus === "pending" ? "secondary" : "default"}
                      onClick={async () => {
                        try {
                          // Compute split amounts when UPI + cash
                          const splitCash = paymentMethod === "upi" && cashPaid > 0 ? cashPaid : undefined;
                          const splitOnline = paymentMethod === "upi" && cashPaid > 0 ? Math.max(0, remainingBalance) : undefined;

                          const checkoutResult2 = await (await apiRequest("/api/bookings/checkout", "POST", {
                            bookingId: booking.id,
                            paymentMethod: paymentStatus === "paid" ? paymentMethod : null,
                            paymentStatus: paymentStatus,
                            dueDate: paymentStatus === "pending" && dueDate ? dueDate : null,
                            pendingReason: paymentStatus === "pending" && pendingReason ? pendingReason : null,
                            gstOnRooms,
                            gstOnFood,
                            includeServiceCharge,
                            discountType: discountType === "none" ? null : discountType,
                            discountValue: discountType === "none" ? null : parseFloat(discountValue),
                            manualCharges: manualCharges.filter(c => c.name && c.amount && parseFloat(c.amount) > 0),
                            cashAmount: splitCash,
                            onlineAmount: splitOnline,
                          })).json();
                          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/bills/pending"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/wallets/summary"] });
                          setCheckoutDialog({ open: false, booking: null });
                          setCashAmount("");
                          setGstOnRooms(true);
                          setGstOnFood(false);
                          setIncludeServiceCharge(false);
                          setManualCharges([{ name: "", amount: "" }]);
                          setDiscountType("none");
                          setDiscountValue("");
                          setPaymentStatus("paid");
                          setDueDate("");
                          setPendingReason("");

                          // Build payment breakdown for the toast
                          let toastDesc = "Checkout completed successfully.";
                          if (paymentStatus === "pending") {
                            toastDesc = `Guest checked out. ₹${Math.max(0, remainingBalance).toFixed(2)} pending — collect from Billing page.`;
                          } else if (splitCash && splitOnline) {
                            toastDesc = `Cash: ₹${splitCash.toLocaleString("en-IN")}   |   UPI: ₹${splitOnline.toLocaleString("en-IN")}`;
                          } else if (paymentMethod === "upi") {
                            toastDesc = "Full payment recorded as UPI.";
                          } else if (paymentMethod === "cash") {
                            toastDesc = "Full payment recorded as Cash.";
                          }
                          toast({ 
                            title: paymentStatus === "pending" ? "Checkout — Bill Pending" : "Checkout Successful ✓", 
                            description: toastDesc,
                          });
                          if (checkoutResult2?.walletWarning) {
                            setTimeout(() => {
                              toast({ title: "Wallet not updated", description: checkoutResult2.walletWarning, variant: "destructive" });
                            }, 500);
                          }
                        } catch (error: any) {
                          const errorMsg = error.message || "Checkout failed";
                          if (errorMsg.includes("Checkout not allowed") || errorMsg.includes("pending")) {
                            toast({ 
                              title: "Cannot Checkout", 
                              description: errorMsg.includes("food order") 
                                ? "Complete all pending food orders before checkout. Go to Orders and mark orders as completed."
                                : errorMsg,
                              variant: "destructive"
                            });
                          } else {
                            toast({ title: "Error", description: errorMsg, variant: "destructive" });
                          }
                        }
                      }}
                      data-testid="button-complete-checkout"
                    >
                      {paymentStatus === "pending" ? (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Checkout with Pending Bill
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Complete Checkout
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>


      <Dialog open={addServiceDialog.open} onOpenChange={(open) => {
        if (!open) {
          setAddServiceDialog({ open: false, bookingId: null, guestName: "" });
          setSvcName(""); setSvcAmount(""); setSvcDescription(""); setSvcType("taxi");
          setSvcCollectNow(false); setSvcPaymentMethod("cash"); setSvcCustomType("");
          setSvcDate(new Date().toISOString().split("T")[0]);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-add-service">
          <DialogHeader>
            <DialogTitle>
              Add Service — {addServiceDialog.guestName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="svc-type">Service Type</Label>
              <Select value={svcType} onValueChange={(v) => {
                setSvcType(v);
                setSvcCustomType("");
                const label = SERVICE_TYPES.find(t => t.value === v)?.label || "";
                setSvcName(v !== "other" ? label : "");
              }}>
                <SelectTrigger id="svc-type" data-testid="select-svc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {svcType === "other" && (
              <div className="space-y-1">
                <Label>Custom Type Name</Label>
                <Input
                  placeholder="e.g., Bike Rental, Spa"
                  value={svcCustomType}
                  onChange={(e) => {
                    setSvcCustomType(e.target.value);
                    setSvcName(e.target.value);
                  }}
                  data-testid="input-svc-custom-type"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="svc-name">Service Name / Description</Label>
              <Input
                id="svc-name"
                placeholder="e.g., Airport pickup at 6PM"
                value={svcName}
                onChange={(e) => setSvcName(e.target.value)}
                data-testid="input-svc-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="svc-amount">Amount (₹)</Label>
                <Input
                  id="svc-amount"
                  type="number"
                  placeholder="500"
                  value={svcAmount}
                  onChange={(e) => setSvcAmount(e.target.value)}
                  data-testid="input-svc-amount"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="svc-date">Service Date</Label>
                <Input
                  id="svc-date"
                  type="date"
                  value={svcDate}
                  onChange={(e) => setSvcDate(e.target.value)}
                  data-testid="input-svc-date"
                />
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Collect Payment Now</p>
                  <p className="text-xs text-muted-foreground">Guest is paying for this service right now</p>
                </div>
                <Switch
                  checked={svcCollectNow}
                  onCheckedChange={setSvcCollectNow}
                  data-testid="switch-svc-collect-now"
                />
              </div>
              {svcCollectNow && (
                <div className="space-y-1">
                  <Label>Payment Method</Label>
                  <Select value={svcPaymentMethod} onValueChange={setSvcPaymentMethod}>
                    <SelectTrigger data-testid="select-svc-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Will be recorded to wallet immediately</p>
                </div>
              )}
              {!svcCollectNow && (
                <p className="text-xs text-muted-foreground">
                  Service will be added to the final bill at checkout
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAddServiceDialog({ open: false, bookingId: null, guestName: "" })}
                data-testid="button-cancel-add-service"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (!addServiceDialog.bookingId || !svcAmount || !svcName) {
                    toast({ title: "Missing fields", description: "Please fill in service name and amount", variant: "destructive" });
                    return;
                  }
                  addServiceMutation.mutate({
                    bookingId: addServiceDialog.bookingId,
                    serviceType: svcType === "other" ? (svcCustomType || "other") : svcType,
                    serviceName: svcName,
                    amount: svcAmount,
                    serviceDate: svcDate,
                    description: svcDescription || undefined,
                    isPaid: svcCollectNow,
                    paymentMethod: svcCollectNow ? svcPaymentMethod : undefined,
                  });
                }}
                disabled={addServiceMutation.isPending}
                data-testid="button-confirm-add-service"
              >
                {addServiceMutation.isPending ? "Adding..." : svcCollectNow ? "Add & Collect" : "Add to Bill"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={editServiceDialog.open} onOpenChange={(open) => {
        if (!open) setEditServiceDialog({ open: false, service: null });
      }}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-service">
          <DialogHeader>
            <DialogTitle>Edit Extra Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-svc-name">Service Name</Label>
              <Input
                id="edit-svc-name"
                placeholder="e.g., Heater Charges"
                value={editSvcName}
                onChange={(e) => setEditSvcName(e.target.value)}
                data-testid="input-edit-svc-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-svc-amount">Amount (₹)</Label>
                <Input
                  id="edit-svc-amount"
                  type="number"
                  placeholder="500"
                  value={editSvcAmount}
                  onChange={(e) => setEditSvcAmount(e.target.value)}
                  data-testid="input-edit-svc-amount"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-svc-date">Service Date</Label>
                <Input
                  id="edit-svc-date"
                  type="date"
                  value={editSvcDate}
                  onChange={(e) => setEditSvcDate(e.target.value)}
                  data-testid="input-edit-svc-date"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditServiceDialog({ open: false, service: null })}
                data-testid="button-cancel-edit-service"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (!editServiceDialog.service || !editSvcAmount || !editSvcName) {
                    toast({ title: "Missing fields", description: "Please fill in service name and amount", variant: "destructive" });
                    return;
                  }
                  editServiceMutation.mutate({
                    id: editServiceDialog.service.id,
                    serviceName: editSvcName,
                    amount: editSvcAmount,
                    serviceDate: editSvcDate,
                  });
                }}
                disabled={editServiceMutation.isPending}
                data-testid="button-confirm-edit-service"
              >
                {editServiceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom WhatsApp Message Dialog */}
      <Dialog open={customMsgDialog.open} onOpenChange={open => {
        if (!open) setCustomMsgDialog({ open: false, booking: null });
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              Send Custom WhatsApp Message
            </DialogTitle>
          </DialogHeader>
          {customMsgDialog.booking && (() => {
            const b = customMsgDialog.booking;
            const selectedTpl = waTemplates.find(t => String(t.id) === selectedTemplateId);
            const preview = selectedTpl ? buildWaPreview(selectedTpl.content, b) : null;
            return (
              <div className="space-y-4 py-1">
                <div className="space-y-1.5">
                  <Label className="text-sm">Guest</Label>
                  <p className="text-sm font-medium">{b.guest?.fullName} — {b.isGroupBooking && b.rooms?.length ? `Rooms ${b.rooms.map((r: any) => r.roomNumber).join(", ")}` : b.room?.roomNumber ?? "TBA"}</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      value={customMsgPhone}
                      onChange={e => setCustomMsgPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit number"
                      className="font-mono"
                      data-testid="input-custom-msg-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Choose a Template</Label>
                  {waTemplates.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                      No templates found for this property.{" "}
                      <a href="/whatsapp-templates" className="underline text-primary">Create one here</a>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {waTemplates.slice(0, 3).map(t => {
                        const isSelected = selectedTemplateId === String(t.id);
                        const shortPreview = t.content.replace(/\{\{[^}]+\}\}/g, "…").slice(0, 80);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            data-testid={`template-card-${t.id}`}
                            onClick={() => setSelectedTemplateId(String(t.id))}
                            className={`w-full text-left rounded-lg border-2 px-3 py-2.5 transition-all ${
                              isSelected
                                ? "border-[#25D366] bg-[#25D366]/5 dark:bg-[#25D366]/10"
                                : "border-border hover:border-[#25D366]/50 hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium leading-tight">{t.name}</span>
                              {isSelected && (
                                <span className="flex-shrink-0 h-4 w-4 rounded-full bg-[#25D366] flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 text-white" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{shortPreview}{t.content.length > 80 ? "…" : ""}</p>
                          </button>
                        );
                      })}
                      {waTemplates.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing 3 of {waTemplates.length} templates.{" "}
                          <a href="/whatsapp-templates" className="underline text-primary">Manage templates</a>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {preview && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Message Preview</Label>
                    <div className="rounded-lg bg-[#e9fbe9] dark:bg-[#1a3a1a] border border-[#25D366]/30 p-3 max-h-52 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{preview}</pre>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setCustomMsgDialog({ open: false, booking: null })}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                    disabled={!selectedTpl || !customMsgPhone}
                    data-testid="button-open-custom-msg-wa"
                    onClick={() => {
                      if (!selectedTpl || !customMsgPhone || !preview) return;
                      const waPhone = customMsgPhone.startsWith("91") ? customMsgPhone : `91${customMsgPhone}`;
                      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(preview)}`, "_blank");
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    Open in WhatsApp
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
