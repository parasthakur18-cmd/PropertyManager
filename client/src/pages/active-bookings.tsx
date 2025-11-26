import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Hotel, User, Calendar, IndianRupee, UtensilsCrossed, LogOut, Phone, Search, Plus, Trash2, AlertCircle, Coffee, FileText, Download, Eye, QrCode, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { BookingQRCode } from "@/components/BookingQRCode";

interface ActiveBooking {
  id: number;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  numberOfGuests: number;
  specialRequests: string | null;
  advanceAmount: string;
  customPrice: string | null;
  isGroupBooking: boolean;
  roomIds: number[] | null;
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
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [paymentStatus, setPaymentStatus] = useState<string>("paid");
  const [dueDate, setDueDate] = useState<string>("");
  const [pendingReason, setPendingReason] = useState<string>("");
  const [discountType, setDiscountType] = useState<string>("none");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [discountAppliesTo, setDiscountAppliesTo] = useState<string>("total");
  const [includeGst, setIncludeGst] = useState<boolean>(false);
  const [includeServiceCharge, setIncludeServiceCharge] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualCharges, setManualCharges] = useState<Array<{ name: string; amount: string }>>([
    { name: "", amount: "" }
  ]);
  const [cashAmount, setCashAmount] = useState<string>("");
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [qrCodeSheetOpen, setQrCodeSheetOpen] = useState(false);
  const [qrCodeBooking, setQrCodeBooking] = useState<ActiveBooking | null>(null);
  const [preBillSent, setPreBillSent] = useState(false);
  const [preBillStatus, setPreBillStatus] = useState<string>("pending"); // pending, approved, rejected
  const [skipPreBill, setSkipPreBill] = useState(false); // Allow staff to skip pre-bill and checkout directly
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const [upiPaymentLink, setUpiPaymentLink] = useState<string | null>(null);
  const [showUpiLink, setShowUpiLink] = useState(false);
  const [autoCompletingCheckout, setAutoCompletingCheckout] = useState(false);

  // Fetch pre-bill status when checkout dialog opens
  const { data: currentPreBill } = useQuery<{ id: number; status: string } | null>({
    queryKey: ["/api/prebill/booking", checkoutDialog.booking?.id],
    enabled: !!(checkoutDialog.open && checkoutDialog.booking?.id),
  });

  // Poll bill status when payment link is sent - to detect when payment is completed
  const { data: currentBill } = useQuery<{ paymentStatus: string; id: number } | null>({
    queryKey: ["/api/bills/booking", checkoutDialog.booking?.id],
    enabled: !!(checkoutDialog.open && checkoutDialog.booking?.id && paymentLinkSent && !autoCompletingCheckout),
    refetchInterval: 5000, // Poll every 5 seconds when waiting for payment
  });

  // Update pre-bill status when it changes
  useEffect(() => {
    if (currentPreBill) {
      setPreBillStatus(currentPreBill.status);
      if (currentPreBill.status === "approved") {
        setPreBillSent(true);
      }
    }
  }, [currentPreBill]);

  // Auto-complete checkout when payment is confirmed via webhook
  useEffect(() => {
    if (currentBill && currentBill.paymentStatus === "paid" && paymentLinkSent && !autoCompletingCheckout && checkoutDialog.booking) {
      setAutoCompletingCheckout(true);
      toast({
        title: "Payment Confirmed ✓",
        description: "Payment received! Completing checkout automatically...",
      });
      
      // Auto-trigger checkout after a short delay
      setTimeout(() => {
        checkoutMutation.mutate({
          bookingId: checkoutDialog.booking!.id,
          paymentMethod: paymentMethod,
          paymentStatus: "paid",
          discountType: discountType === "none" ? undefined : discountType,
          discountValue: discountType === "none" || !discountValue ? undefined : parseFloat(discountValue),
          discountAppliesTo: discountType === "none" ? undefined : discountAppliesTo,
          includeGst,
          includeServiceCharge,
          manualCharges,
        });
      }, 1000);
    }
  }, [currentBill, paymentLinkSent, autoCompletingCheckout, checkoutDialog.booking]);

  // Reset checkout states when dialog closes
  useEffect(() => {
    if (!checkoutDialog.open) {
      setPreBillSent(false);
      setPreBillStatus("pending");
      setSkipPreBill(false);
      setPaymentLinkSent(false);
      setPaymentMethod("card");
      setPaymentStatus("paid");
      setAutoCompletingCheckout(false);
      setCashAmount("");
    }
  }, [checkoutDialog.open]);

  const { data: activeBookings, isLoading } = useQuery<ActiveBooking[]>({
    queryKey: ["/api/bookings/active"],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Query for all unmerged café orders
  const { data: cafeOrders, isLoading: isLoadingCafeOrders, refetch: refetchCafeOrders } = useQuery<any[]>({
    queryKey: ["/api/orders/unmerged-cafe"],
    enabled: mergeDialogOpen,
    refetchOnWindowFocus: false,
  });

  // Filter bookings based on search query
  const filteredBookings = activeBookings?.filter((booking) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    // For group bookings, search across all rooms
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
      // Refetch pre-bill status
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

  // Generate UPI payment link when UPI is selected
  const generateUpiLink = async () => {
    if (paymentMethod === "upi" && checkoutDialog.booking) {
      const breakdown = calculateTotalWithCharges(
        checkoutDialog.booking, 
        includeGst, 
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
        const result = await apiRequest("/api/payment-link/generate", "POST", {
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
    mutationFn: async ({ bookingId, paymentMethod, paymentStatus, dueDate, pendingReason, discountType, discountValue, discountAppliesTo, includeGst, includeServiceCharge, manualCharges }: { 
      bookingId: number; 
      paymentMethod?: string;
      paymentStatus: string;
      dueDate?: string;
      pendingReason?: string;
      discountType?: string;
      discountValue?: number;
      discountAppliesTo?: string;
      includeGst: boolean;
      includeServiceCharge: boolean;
      manualCharges: Array<{ name: string; amount: string }>;
    }) => {
      // If UPI is selected, generate payment link instead of immediate checkout
      if (paymentStatus === "paid" && paymentMethod === "upi") {
        const link = await generateUpiLink();
        if (!link) throw new Error("Failed to generate UPI link");
        // Return special response to indicate UPI link generation
        return { upiLink: link };
      }
      
      return await apiRequest("/api/bookings/checkout", "POST", { 
        bookingId, 
        paymentMethod: paymentStatus === "paid" ? paymentMethod : null,
        paymentStatus,
        dueDate: paymentStatus === "pending" ? dueDate : null,
        pendingReason: paymentStatus === "pending" ? pendingReason : null,
        discountType: discountType === "none" ? null : discountType,
        discountValue: discountType === "none" ? null : discountValue,
        discountAppliesTo: discountType === "none" ? null : discountAppliesTo,
        includeGst,
        includeServiceCharge,
        manualCharges: manualCharges.filter(c => c.name && c.amount && parseFloat(c.amount) > 0),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills/pending"] });
      toast({
        title: "Checkout Successful",
        description: "Guest has been checked out and bill has been generated",
      });
      setCheckoutDialog({ open: false, booking: null });
      setPaymentMethod("cash");
      setPaymentStatus("paid");
      setDueDate("");
      setPendingReason("");
      setDiscountType("none");
      setDiscountValue("");
      setDiscountAppliesTo("total");
      setIncludeGst(false); // Reset to false (0% default)
      setIncludeServiceCharge(false); // Reset to false (0% default)
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

  const mergeCafeOrdersMutation = useMutation({
    mutationFn: async ({ orderIds, bookingId }: { orderIds: number[]; bookingId: number }) => {
      return await apiRequest("/api/orders/merge-to-booking", "PATCH", { orderIds, bookingId });
    },
    onSuccess: async () => {
      // Force refetch to get fresh data
      await queryClient.refetchQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/unmerged-cafe"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      // Update the checkout dialog with fresh booking data
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
      includeGst, 
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
    
    if (!preBillSent) {
      toast({
        title: "Pre-Bill Required",
        description: "Please send pre-bill to customer first for verification",
        variant: "destructive",
      });
      return;
    }
    
    // Check for pending food orders
    const pendingOrders = checkoutDialog.booking.orders.filter(order => 
      order.status === "pending" || order.status === "preparing" || order.status === "ready"
    );
    
    if (pendingOrders.length > 0) {
      toast({
        title: "Checkout Not Allowed",
        description: `${pendingOrders.length} food order(s) are still pending. Please complete or cancel them before checkout.`,
        variant: "destructive",
      });
      return;
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
      includeGst,
      includeServiceCharge,
      manualCharges,
    });
  };

  // Calculate discount amount in real-time
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

  // Calculate total amount with optional GST/Service Charge and manual charges
  const calculateTotalWithCharges = (booking: ActiveBooking, includeGst: boolean, includeServiceCharge: boolean, charges: Array<{ name: string; amount: string }>) => {
    // GST and Service Charge apply ONLY to ROOM charges, NOT to food or manual charges
    const roomCharges = parseFloat(booking.charges.roomCharges);
    const foodCharges = parseFloat(booking.charges.foodCharges);
    const manualAmount = charges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    // Calculate GST and Service Charge amounts (on ROOM charges only)
    const gstAmount = includeGst ? roomCharges * 0.05 : 0;
    const serviceChargeAmount = includeServiceCharge ? roomCharges * 0.10 : 0;
    
    // Calculate subtotal and total
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
  
  // Add new charge entry
  const addManualCharge = () => {
    setManualCharges([...manualCharges, { name: "", amount: "" }]);
  };
  
  // Remove charge entry
  const removeManualCharge = (index: number) => {
    if (manualCharges.length === 1) return; // Keep at least one entry
    setManualCharges(manualCharges.filter((_, i) => i !== index));
  };
  
  // Update charge entry
  const updateManualCharge = (index: number, field: "name" | "amount", value: string) => {
    const updated = [...manualCharges];
    updated[index][field] = value;
    setManualCharges(updated);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Loading active bookings...</div>
      </div>
    );
  }

  if (!activeBookings || activeBookings.length === 0) {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <Hotel className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Active Bookings</h2>
        <p className="text-muted-foreground text-center">
          There are no guests currently checked in. Active bookings will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="heading-active-bookings">
              Active Bookings
            </h1>
            <p className="text-muted-foreground mt-1">
              {activeBookings?.length || 0} {activeBookings?.length === 1 ? "guest" : "guests"} currently checked in
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Input
            placeholder="Search by guest name, room number, or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
            data-testid="input-search-active-bookings"
          />
        </div>
      </div>

      <div className="pb-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBookings?.map((booking) => (
            <Card key={booking.id} className="flex flex-col" data-testid={`card-active-booking-${booking.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`text-guest-name-${booking.id}`}>
                      {booking.guest.fullName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      <span className="truncate">{booking.guest.phone}</span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {booking.isGroupBooking ? (
                      <>
                        <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
                          Group Booking
                        </Badge>
                        <Badge variant="default" data-testid={`badge-room-${booking.id}`} className="text-xs">
                          {booking.rooms && booking.rooms.length > 0
                            ? booking.rooms.map(r => r.roomNumber).join(", ")
                            : "Multiple Rooms"}
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="default" data-testid={`badge-room-${booking.id}`}>
                        Room {booking.room?.roomNumber || "TBA"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hotel className="h-4 w-4" />
                    <span>{booking.property.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {booking.nightsStayed} {booking.nightsStayed === 1 ? "night" : "nights"} stayed
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>
                      {booking.numberOfGuests} {booking.numberOfGuests === 1 ? "guest" : "guests"}
                    </span>
                  </div>
                  {booking.guest.idProofImage && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={booking.guest.idProofImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs flex items-center gap-1"
                        data-testid={`link-view-id-${booking.id}`}
                      >
                        <Eye className="h-3 w-3" />
                        View ID Proof
                      </a>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Room Charges</span>
                    <span className="font-medium">₹{booking.charges.roomCharges}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Food Charges</span>
                    <span className="font-medium">₹{booking.charges.foodCharges}</span>
                  </div>
                  {parseFloat(booking.charges.extraCharges) > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Extra Services</span>
                        <span className="font-medium">₹{booking.charges.extraCharges}</span>
                      </div>
                      {booking.extraServices && booking.extraServices.length > 0 && (
                        <div className="ml-4 space-y-1">
                          {booking.extraServices.map((extra) => (
                            <div key={extra.id} className="flex justify-between text-xs text-muted-foreground">
                              <span>• {extra.serviceName}</span>
                              <span className="font-mono">₹{extra.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-bold text-lg" data-testid={`text-total-${booking.id}`}>
                      ₹{booking.charges.totalAmount}
                    </span>
                  </div>
                  {parseFloat(booking.charges.advancePaid) > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Advance Paid</span>
                        <span className="text-green-600">-₹{booking.charges.advancePaid}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Balance Due</span>
                        <span className="text-destructive">₹{booking.charges.balanceAmount}</span>
                      </div>
                    </>
                  )}
                </div>

                {booking.orders.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Recent Orders ({booking.orders.length})
                      </span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-auto">
                      {booking.orders.slice(0, 3).map((order) => (
                        <div
                          key={`booking-${booking.id}-order-${order.id}`}
                          className="text-xs bg-muted/50 rounded p-2"
                          data-testid={`order-${order.id}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <Badge variant="secondary" className="text-xs mb-1">
                                {order.status}
                              </Badge>
                              <div className="text-muted-foreground truncate">
                                {Array.isArray(order.items)
                                  ? order.items.map((item: any) => item.name).join(", ")
                                  : "Order items"}
                              </div>
                            </div>
                            <span className="font-medium whitespace-nowrap">₹{order.totalAmount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-3">
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={() => setCheckoutDialog({ open: true, booking })}
                    data-testid={`button-checkout-${booking.id}`}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Checkout Guest
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={checkoutDialog.open} onOpenChange={(open) => setCheckoutDialog({ open, booking: null })}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-checkout">
          <DialogHeader>
            <DialogTitle>Checkout Guest</DialogTitle>
          </DialogHeader>

          {checkoutDialog.booking && (
            <div className="space-y-4">
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="font-medium">{checkoutDialog.booking.guest.fullName}</span>
                    {checkoutDialog.booking.isGroupBooking && (
                      <Badge variant="secondary" className="ml-2 bg-blue-500 text-white text-xs">
                        Group Booking
                      </Badge>
                    )}
                    {checkoutDialog.booking.guest.idProofImage && (
                      <div className="mt-1">
                        <a
                          href={checkoutDialog.booking.guest.idProofImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs flex items-center gap-1"
                          data-testid="link-view-id-checkout"
                        >
                          <FileText className="h-3 w-3" />
                          View Guest ID Proof
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {checkoutDialog.booking.isGroupBooking && checkoutDialog.booking.rooms ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Rooms: </span>
                        <span className="font-medium">
                          {checkoutDialog.booking.rooms.map(r => r.roomNumber).join(", ")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Room {checkoutDialog.booking.room?.roomNumber || "TBA"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Check-in Date</span>
                  <span>{format(new Date(checkoutDialog.booking.checkInDate), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Nights Stayed</span>
                  <span>{checkoutDialog.booking.nightsStayed} nights</span>
                </div>
              </div>

              {/* Detailed Bill Breakdown */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                <h3 className="font-semibold text-sm">Bill Breakdown</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Room Charges ({checkoutDialog.booking.nightsStayed} nights)</span>
                    <span className="font-medium">₹{checkoutDialog.booking.charges.roomCharges}</span>
                  </div>
                  
                  {checkoutDialog.booking.orders && checkoutDialog.booking.orders.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium pt-2 border-t">
                        <span>Food Orders</span>
                        <span>₹{checkoutDialog.booking.charges.foodCharges}</span>
                      </div>
                      <div className="ml-4 space-y-3 text-xs">
                        {checkoutDialog.booking.orders.map((order) => (
                          <div key={order.id} className="space-y-1 pb-2 border-b last:border-0">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Order #{order.id}</span>
                              <Badge variant="secondary" className="text-xs">{order.status}</Badge>
                            </div>
                            {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-muted-foreground">
                                <span>{item.quantity}x {item.name}</span>
                                <span className="font-mono">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium pt-1">
                              <span>Order Total</span>
                              <span className="font-mono">₹{order.totalAmount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {checkoutDialog.booking.extraServices && checkoutDialog.booking.extraServices.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Extra Services</span>
                        <span>₹{checkoutDialog.booking.charges.extraCharges}</span>
                      </div>
                      <div className="ml-4 space-y-1">
                        {checkoutDialog.booking.extraServices.map((extra) => (
                          <div key={extra.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>• {extra.serviceName}</span>
                            <span className="font-mono">₹{extra.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                {manualCharges.some(c => c.amount && parseFloat(c.amount) > 0) && (
                  <>
                    {manualCharges.filter(c => c.amount && parseFloat(c.amount) > 0).map((charge, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {charge.name || "Additional Charge"}
                        </span>
                        <span className="font-medium">+₹{parseFloat(charge.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                )}
                {(() => {
                  const breakdown = calculateTotalWithCharges(
                    checkoutDialog.booking, 
                    includeGst, 
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

                  return (
                    <>
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Subtotal</span>
                        <span>₹{breakdown.subtotal.toFixed(2)}</span>
                      </div>
                      
                      {includeGst && breakdown.gstAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">GST (5% on room charges only)</span>
                          <span className="font-medium" data-testid="text-gst-amount">+₹{breakdown.gstAmount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      {includeServiceCharge && breakdown.serviceChargeAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Service Charge (10% on room charges only)</span>
                          <span className="font-medium" data-testid="text-service-charge-amount">+₹{breakdown.serviceChargeAmount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total Amount</span>
                        <span data-testid="text-checkout-total">₹{breakdown.grandTotal.toFixed(2)}</span>
                      </div>
                      
                      {discountAmt > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Discount {discountType === "percentage" ? `(${discountValue}%)` : "(Fixed)"}
                            </span>
                            <span className="text-green-600">-₹{discountAmt.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Amount After Discount</span>
                            <span>₹{finalTotal.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {advancePaid > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Advance Paid</span>
                            <span className="text-green-600">-₹{checkoutDialog.booking.charges.advancePaid}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-destructive">
                            <span>Balance Due</span>
                            <span>₹{balanceDue.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount-type">Discount Type</Label>
                <Select value={discountType} onValueChange={(value) => {
                  setDiscountType(value);
                  if (value === "none") setDiscountValue("");
                }}>
                  <SelectTrigger id="discount-type" data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Discount</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {discountType !== "none" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="discount-applies-to">Apply Discount To</Label>
                    <Select value={discountAppliesTo} onValueChange={setDiscountAppliesTo}>
                      <SelectTrigger id="discount-applies-to" data-testid="select-discount-applies-to">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">Total Bill</SelectItem>
                        <SelectItem value="room">Room Charges Only</SelectItem>
                        <SelectItem value="food">Food Charges Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount-value">
                      Discount {discountType === "percentage" ? "Percentage" : "Amount"}
                    </Label>
                    <Input
                      id="discount-value"
                      type="number"
                      step={discountType === "percentage" ? "0.01" : "1"}
                      min="0"
                      max={discountType === "percentage" ? "100" : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === "percentage" ? "Enter percentage (e.g., 10)" : "Enter amount (e.g., 500)"}
                      data-testid="input-discount-value"
                    />
                  </div>
                </>
              )}

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">Additional Charges</h3>
                  <div className="flex gap-2">
                    <Sheet open={mergeDialogOpen} onOpenChange={(open) => {
                      setMergeDialogOpen(open);
                      if (open) {
                        refetchCafeOrders();
                      }
                    }}>
                      <SheetTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          data-testid="button-merge-cafe-bill"
                        >
                          <Coffee className="h-4 w-4 mr-1" />
                          Merge Café Bill
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle>Merge Café Orders</SheetTitle>
                          <SheetDescription>
                            Browse all unmerged café orders and add them to this bill
                          </SheetDescription>
                        </SheetHeader>
                        <div className="mt-6 space-y-4">
                          {isLoadingCafeOrders && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Loading café orders...
                            </p>
                          )}

                          {cafeOrders && cafeOrders.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-sm font-medium">{cafeOrders.length} unmerged café order(s)</p>
                              {cafeOrders.map((order: any) => (
                                <Card
                                  key={order.id}
                                  className="p-4"
                                  data-testid={`card-cafe-order-${order.id}`}
                                >
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-start gap-3">
                                      <div className="flex-1">
                                        <p className="font-medium">{order.customerName || "Walk-in Customer"}</p>
                                        {order.customerPhone && (
                                          <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                                        )}
                                        <div className="flex gap-2 mt-1">
                                          <Badge variant={order.status === "delivered" ? "default" : order.status === "pending" ? "secondary" : "outline"}>
                                            {order.status}
                                          </Badge>
                                          <Badge variant="secondary">₹{order.totalAmount}</Badge>
                                        </div>
                                      </div>
                                    </div>
                                    {Array.isArray(order.items) && (
                                      <div className="text-sm text-muted-foreground">
                                        {order.items.map((item: any) => `${item.quantity}x ${item.name}`).join(", ")}
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      className="w-full"
                                      onClick={() => handleMergeSingleOrder(order.id)}
                                      disabled={mergeCafeOrdersMutation.isPending}
                                      data-testid={`button-merge-order-${order.id}`}
                                    >
                                      {mergeCafeOrdersMutation.isPending ? "Merging..." : "Merge to Bill"}
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}

                          {cafeOrders && cafeOrders.length === 0 && !isLoadingCafeOrders && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No unmerged café orders found
                            </p>
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addManualCharge}
                      data-testid="button-add-charge"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Charge
                    </Button>
                  </div>
                </div>
                
                {checkoutDialog.booking && (() => {
                  const pendingOrders = checkoutDialog.booking.orders.filter(order => 
                    order.status === "pending" || order.status === "preparing" || order.status === "ready"
                  );
                  
                  if (pendingOrders.length > 0) {
                    return (
                      <Alert variant="destructive" data-testid="alert-pending-orders">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {pendingOrders.length} food order(s) are still pending. Please complete or cancel them before checkout.
                        </AlertDescription>
                      </Alert>
                    );
                  }
                  return null;
                })()}
                
                <div className="space-y-3">
                  {manualCharges.map((charge, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          type="text"
                          value={charge.name}
                          onChange={(e) => updateManualCharge(index, "name", e.target.value)}
                          placeholder="e.g., Damages, Late checkout"
                          data-testid={`input-charge-name-${index}`}
                        />
                      </div>
                      <div className="w-32 space-y-2">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={charge.amount}
                          onChange={(e) => updateManualCharge(index, "amount", e.target.value)}
                          placeholder="Amount"
                          data-testid={`input-charge-amount-${index}`}
                        />
                      </div>
                      {manualCharges.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => removeManualCharge(index)}
                          data-testid={`button-remove-charge-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-gst" 
                    checked={includeGst}
                    onCheckedChange={(checked) => setIncludeGst(checked as boolean)}
                    data-testid="checkbox-include-gst"
                  />
                  <Label htmlFor="include-gst" className="cursor-pointer font-normal">
                    Include GST (5%)
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

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="payment-status">Payment Status *</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger id="payment-status" data-testid="select-payment-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid (Payment Collected)</SelectItem>
                      <SelectItem value="pending">Pending (To be collected later)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {paymentStatus === "paid" 
                      ? "Payment has been collected from the guest" 
                      : "Payment will be collected later (useful for travel agents with credit terms)"}
                  </p>
                </div>

                {paymentStatus === "paid" && checkoutDialog.booking && (() => {
                  const breakdown = calculateTotalWithCharges(checkoutDialog.booking, includeGst, includeServiceCharge, manualCharges);
                  const discountAmt = calculateDiscount(breakdown.grandTotal, discountType, discountValue);
                  const totalBill = breakdown.grandTotal - discountAmt;
                  const cashPaid = cashAmount ? parseFloat(cashAmount) : 0;
                  const remaining = Math.max(0, totalBill - cashPaid);
                  
                  return (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                      <div className="space-y-2">
                        <Label htmlFor="cash-amount">Cash Received</Label>
                        <Input
                          id="cash-amount"
                          type="number"
                          placeholder="0"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          data-testid="input-cash-amount"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Bill Total:</span>
                          <span className="font-medium">₹{totalBill.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cash Paid:</span>
                          <span className="font-medium">₹{cashPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                          <span>Remaining Balance:</span>
                          <span className={remaining > 0 ? "text-orange-600" : "text-green-600"}>
                            ₹{remaining.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {remaining > 0 && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              if (!checkoutDialog.booking) return;
                              const booking = checkoutDialog.booking;
                              // Read directly from input element to get the actual value entered
                              const inputElement = document.getElementById("cash-amount") as HTMLInputElement;
                              const inputValue = inputElement?.value?.trim() || "";
                              const finalCashPaid = inputValue ? parseFloat(inputValue) : 0;
                              console.log(`[Send Payment Link] DOM input value="${inputValue}" -> finalCashPaid=${finalCashPaid}, remaining=${remaining}, totalBill=${totalBill}`);
                              const billDetails = {
                                bookingId: booking.id,
                                guestName: booking.guest.fullName,
                                guestPhone: booking.guest.phone,
                                roomNumber: booking.isGroupBooking && booking.rooms ? booking.rooms.map(r => r.roomNumber).join(", ") : booking.room?.roomNumber,
                                roomCharges: breakdown.roomCharges,
                                foodCharges: breakdown.foodCharges,
                                gstAmount: breakdown.gstAmount,
                                serviceChargeAmount: breakdown.serviceChargeAmount,
                                subtotal: breakdown.subtotal,
                                discountAmount: discountAmt,
                                totalAmount: totalBill,
                                balanceAmount: remaining,
                                balanceDue: remaining,
                                advancePaid: finalCashPaid,
                              };
                              console.log(`[Send Payment Link] Sending billDetails:`, billDetails);
                              paymentLinkMutation.mutate({ bookingId: booking.id, billDetails });
                            }}
                            disabled={paymentLinkMutation.isPending}
                            data-testid="button-send-payment-link-balance"
                          >
                            {paymentLinkMutation.isPending ? "Sending..." : "Send Payment Link"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {paymentStatus === "pending" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="due-date">Due Date (Optional)</Label>
                      <input
                        id="due-date"
                        type="date"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        data-testid="input-due-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pending-reason">Reason for Pending Payment (Optional)</Label>
                      <input
                        id="pending-reason"
                        type="text"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="e.g., Travel agent - monthly billing"
                        value={pendingReason}
                        onChange={(e) => setPendingReason(e.target.value)}
                        data-testid="input-pending-reason"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 flex flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setCheckoutDialog({ open: false, booking: null });
                setPreBillSent(false);
                setSkipPreBill(false);
              }}
              disabled={checkoutMutation.isPending || sendPreBillMutation.isPending}
              data-testid="button-cancel-checkout"
            >
              Cancel
            </Button>

            {/* Send Pre-Bill Button - Show only in pending state, before sent */}
            {preBillStatus === "pending" && !preBillSent && !skipPreBill && (
              <Button
                onClick={handleSendPreBill}
                disabled={sendPreBillMutation.isPending}
                variant="outline"
                data-testid="button-send-prebill"
                className="flex-1"
              >
                {sendPreBillMutation.isPending ? "Sending..." : "Send Pre-Bill via WhatsApp"}
              </Button>
            )}
            
            {/* Send Payment Link Button - Always visible unless already sent */}
            {!paymentLinkSent && !skipPreBill && preBillStatus !== "approved" && (
              <Button
                onClick={() => {
                  if (!checkoutDialog.booking) return;
                  if (paymentMethod !== "card" && paymentMethod !== "upi") {
                    toast({
                      title: "Invalid Payment Method",
                      description: "Please change payment method to 'Card' or 'UPI' to send payment link",
                      variant: "destructive",
                    });
                    return;
                  }
                  const booking = checkoutDialog.booking;
                  const breakdown = calculateTotalWithCharges(booking, includeGst, includeServiceCharge, manualCharges);
                  const discountAmt = calculateDiscount(breakdown.grandTotal, discountType, discountValue);
                  const finalTotal = breakdown.grandTotal - discountAmt;
                  const advancePaid = parseFloat(booking.charges.advancePaid);
                  const balanceDue = finalTotal - advancePaid;
                  const billDetails = {
                    bookingId: booking.id,
                    guestName: booking.guest.fullName,
                    guestPhone: booking.guest.phone,
                    roomNumber: booking.isGroupBooking && booking.rooms ? booking.rooms.map(r => r.roomNumber).join(", ") : booking.room?.roomNumber,
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
                  paymentLinkMutation.mutate({ bookingId: booking.id, billDetails });
                }}
                disabled={paymentLinkMutation.isPending || (paymentMethod !== "card" && paymentMethod !== "upi")}
                variant={paymentMethod !== "card" && paymentMethod !== "upi" ? "secondary" : "outline"}
                data-testid="button-send-payment-link"
                className="flex-1"
                title={paymentMethod !== "card" && paymentMethod !== "upi" ? "Payment links only work with Card or UPI. Please change payment method above." : "Send payment link via RazorPay"}
              >
                {paymentLinkMutation.isPending ? "Sending..." : "Send Payment Link"}
              </Button>
            )}
            
            {/* Skip & Checkout Button - Only in pending state, before sent */}
            {preBillStatus === "pending" && !preBillSent && !skipPreBill && (
              <Button
                onClick={() => setSkipPreBill(true)}
                variant="outline"
                data-testid="button-skip-prebill"
                className="flex-1"
              >
                Skip & Checkout
              </Button>
            )}

            {/* Pre-Bill Sent Status - Show when sent but not approved */}
            {(preBillStatus === "sent" || preBillSent) && preBillStatus !== "approved" && (
              <>
                <div className="flex items-center gap-2 text-blue-600 text-sm font-medium flex-1 justify-center px-3 py-2 border border-blue-200 rounded-md bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
                  <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Pre-Bill Sent ✓ Waiting for Approval...</span>
                </div>
                <Button
                  onClick={() => approveBillMutation.mutate(currentPreBill?.id || 0)}
                  disabled={approveBillMutation.isPending}
                  variant="default"
                  data-testid="button-mark-approved"
                  className="flex-1"
                >
                  {approveBillMutation.isPending ? "Marking..." : "Mark as Approved & Proceed"}
                </Button>
              </>
            )}

            {/* Pre-Bill Approved Status */}
            {preBillStatus === "approved" && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium flex-1 justify-center">
                <Check className="h-4 w-4" />
                <span>Pre-Bill Approved ✓</span>
              </div>
            )}

            {/* Payment Link Sent Status */}
            {paymentLinkSent && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium flex-1 justify-center px-3 py-2 border border-green-200 rounded-md bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span>Payment Link Sent ✓ Awaiting Payment</span>
              </div>
            )}

            {/* Complete Checkout Button - Show when ready */}
            {(skipPreBill || preBillStatus === "approved" || paymentLinkSent) && (
              <Button
                onClick={handleCheckout}
                disabled={checkoutMutation.isPending}
                data-testid="button-confirm-checkout"
                className="flex-1"
              >
                {checkoutMutation.isPending ? "Processing..." : "Complete Checkout"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
