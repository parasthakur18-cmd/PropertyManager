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
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
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
  const [preBillStatus, setPreBillStatus] = useState<string>("pending");
  const [skipPreBill, setSkipPreBill] = useState(false);
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const [upiPaymentLink, setUpiPaymentLink] = useState<string | null>(null);
  const [showUpiLink, setShowUpiLink] = useState(false);
  const [autoCompletingCheckout, setAutoCompletingCheckout] = useState(false);

  const { data: currentPreBill } = useQuery<{ id: number; status: string } | null>({
    queryKey: ["/api/prebill/booking", checkoutDialog.booking?.id],
    enabled: !!(checkoutDialog.open && checkoutDialog.booking?.id),
  });

  const { data: currentBill } = useQuery<{ paymentStatus: string; id: number } | null>({
    queryKey: ["/api/bills/booking", checkoutDialog.booking?.id],
    enabled: !!(checkoutDialog.open && checkoutDialog.booking?.id && paymentLinkSent && !autoCompletingCheckout),
    refetchInterval: 5000,
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
          includeGst,
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
      setPaymentMethod("cash");
      setPaymentStatus("paid");
      setAutoCompletingCheckout(false);
      setCashAmount("");
    }
  }, [checkoutDialog.open]);

  const { data: activeBookings, isLoading } = useQuery<ActiveBooking[]>({
    queryKey: ["/api/bookings/active"],
    refetchInterval: 30000,
  });

  const { data: cafeOrders, isLoading: isLoadingCafeOrders, refetch: refetchCafeOrders } = useQuery<any[]>({
    queryKey: ["/api/orders/unmerged-cafe"],
    enabled: mergeDialogOpen,
    refetchOnWindowFocus: false,
  });

  const filteredBookings = activeBookings?.filter((booking) => {
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
    mutationFn: async ({ bookingId, paymentMethod, paymentStatus, dueDate, pendingReason, discountType, discountValue, discountAppliesTo, includeGst, includeServiceCharge, manualCharges, cashAmount, onlineAmount }: { 
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
      cashAmount?: number;
      onlineAmount?: number;
    }) => {
      if (paymentStatus === "paid" && paymentMethod === "upi") {
        const link = await generateUpiLink();
        if (!link) throw new Error("Failed to generate UPI link");
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
        cashAmount,
        onlineAmount,
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
      setIncludeGst(false);
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
    
    const breakdown = calculateTotalWithCharges(checkoutDialog.booking, includeGst, includeServiceCharge, manualCharges);
    const discountAmt = calculateDiscount(breakdown.grandTotal, discountType, discountValue);
    const finalTotal = breakdown.grandTotal - discountAmt;
    const advancePaid = parseFloat(checkoutDialog.booking.charges.advancePaid);
    const balanceDue = finalTotal - advancePaid;
    
    const cashInput = document.getElementById("cash-amount") as HTMLInputElement;
    const parsedCash = cashInput?.value ? parseFloat(cashInput.value) : (cashAmount ? parseFloat(cashAmount) : 0);
    const finalCashAmount = Math.max(0, parsedCash);
    const finalOnlineAmount = Math.max(0, balanceDue - finalCashAmount);
    
    console.log(`[Checkout] Balance Due: ${balanceDue}, Cash: ${finalCashAmount}, Online: ${finalOnlineAmount}`);
    
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
      cashAmount: finalCashAmount > 0 ? finalCashAmount : undefined,
      onlineAmount: finalOnlineAmount > 0 ? finalOnlineAmount : undefined,
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

  const calculateTotalWithCharges = (booking: ActiveBooking, includeGst: boolean, includeServiceCharge: boolean, charges: Array<{ name: string; amount: string }>) => {
    const roomCharges = parseFloat(booking.charges.roomCharges);
    const foodCharges = parseFloat(booking.charges.foodCharges);
    const manualAmount = charges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const gstAmount = includeGst ? roomCharges * 0.05 : 0;
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Hotel className="h-8 w-8" />
          Active Bookings
        </h1>
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

      {filteredBookings && filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No active bookings at the moment
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBookings?.map((booking) => (
            <Card key={booking.id} data-testid={`card-active-booking-${booking.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <CardTitle>{booking.guest.fullName}</CardTitle>
                      {booking.isGroupBooking && (
                        <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
                          Group
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {booking.guest.phone}
                      </span>
                      {booking.guest.email && <span>{booking.guest.email}</span>}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {booking.guest.idProofImage && (
                      <a
                        href={booking.guest.idProofImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs flex items-center justify-end gap-1"
                        data-testid="link-view-id-proof"
                      >
                        <FileText className="h-3 w-3" />
                        View ID Proof
                      </a>
                    )}
                    <Badge variant="outline" className="block text-right">
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Room</span>
                    <div className="font-semibold">
                      {booking.isGroupBooking && booking.rooms
                        ? booking.rooms.map(r => r.roomNumber).join(", ")
                        : booking.room?.roomNumber || "TBA"}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-in</span>
                    <div className="font-semibold">{format(new Date(booking.checkInDate), "MMM dd")}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nights</span>
                    <div className="font-semibold">{booking.nightsStayed}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
                  <div>
                    <span className="text-muted-foreground">Room Charges</span>
                    <div className="font-semibold">₹{booking.charges.roomCharges}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Food Orders</span>
                    <div className="font-semibold">₹{booking.charges.foodCharges}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Extra Services</span>
                    <div className="font-semibold">₹{booking.charges.extraCharges}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Bill</span>
                    <div className="font-bold text-lg">₹{parseFloat(booking.charges.subtotal).toFixed(2)}</div>
                  </div>
                </div>

                {booking.orders && booking.orders.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-sm font-semibold mb-2">Food Orders</div>
                    <div className="space-y-1">
                      {booking.orders.map((order) => (
                        <div key={order.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Order #{order.id}</span>
                          <Badge variant="secondary" className="text-xs">{order.status}</Badge>
                          <span className="font-medium whitespace-nowrap">₹{order.totalAmount}</span>
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
      )}

      <Dialog open={checkoutDialog.open} onOpenChange={(open) => {
        if (!open) {
          setCheckoutDialog({ open: false, booking: null });
          setCashAmount("");
          setIncludeGst(false);
          setIncludeServiceCharge(false);
          setManualCharges([{ name: "", amount: "" }]);
          setDiscountType("none");
          setDiscountValue("");
          setPaymentMethod("cash");
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-checkout">
          <DialogHeader>
            <DialogTitle>Checkout - {checkoutDialog.booking?.guest.fullName}</DialogTitle>
          </DialogHeader>

          {checkoutDialog.booking && (() => {
            const booking = checkoutDialog.booking;
            const roomCharges = parseFloat(booking.charges.roomCharges) || 0;
            const foodCharges = parseFloat(booking.charges.foodCharges) || 0;
            const extraCharges = parseFloat(booking.charges.extraCharges) || 0;
            
            const manualChargesTotal = manualCharges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            const subtotal = roomCharges + foodCharges + extraCharges + manualChargesTotal;
            
            const roomGstRate = 12;
            const foodGstRate = 5;
            const serviceChargeRate = 10;
            
            const roomGst = includeGst ? (roomCharges * roomGstRate / 100) : 0;
            const foodGst = includeGst ? (foodCharges * foodGstRate / 100) : 0;
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
                <div className="bg-muted/50 p-3 rounded-md space-y-2 text-sm">
                  <div className="font-semibold text-base mb-2">Bill Breakdown</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room Charges ({booking.nightsStayed} nights):</span>
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
                  
                  {includeGst && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>GST on Room ({roomGstRate}%):</span>
                        <span className="font-mono">₹{roomGst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>GST on Food ({foodGstRate}%):</span>
                        <span className="font-mono">₹{foodGst.toFixed(2)}</span>
                      </div>
                    </>
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
                    <div className="flex justify-between text-muted-foreground">
                      <span>Advance Paid:</span>
                      <span className="font-mono">-₹{advancePaid.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-gst"
                      checked={includeGst}
                      onCheckedChange={(checked) => setIncludeGst(checked as boolean)}
                      data-testid="checkbox-include-gst"
                    />
                    <Label htmlFor="include-gst" className="text-sm cursor-pointer">
                      Include GST
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-service-charge"
                      checked={includeServiceCharge}
                      onCheckedChange={(checked) => setIncludeServiceCharge(checked as boolean)}
                      data-testid="checkbox-include-service-charge"
                    />
                    <Label htmlFor="include-service-charge" className="text-sm cursor-pointer">
                      Include Service Charge
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="split">Split Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cash Received</Label>
                    <Input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="0"
                      data-testid="input-cash-received"
                    />
                  </div>
                </div>

                <div className="bg-primary/10 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Balance Due:</span>
                    <span className={`font-mono text-xl font-bold ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      ₹{Math.max(0, remainingBalance).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
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
                              discount
                            })
                          });
                          if (!res.ok) {
                            const error = await res.json();
                            throw new Error(error.message || 'Failed to send pre-bill');
                          }
                          toast({ title: "Success", description: "Pre-bill sent via WhatsApp" });
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
                                bookingId: booking.id
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
                      onClick={async () => {
                        try {
                          await apiRequest("/api/bookings/checkout", "POST", {
                            bookingId: booking.id,
                            paymentMethod: paymentMethod,
                            paymentStatus: remainingBalance <= 0 ? "paid" : "pending",
                            includeGst,
                            includeServiceCharge,
                            gstAmount: totalGst,
                            serviceChargeAmount: serviceCharge,
                            discountType: discountType === "none" ? null : discountType,
                            discountValue: discountType === "none" ? null : parseFloat(discountValue),
                            manualCharges: manualCharges.filter(c => c.name && c.amount && parseFloat(c.amount) > 0),
                            cashReceived: cashPaid,
                            remainingBalance: Math.max(0, remainingBalance),
                            totalAmount: grandTotal
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                          setCheckoutDialog({ open: false, booking: null });
                          setCashAmount("");
                          setIncludeGst(false);
                          setIncludeServiceCharge(false);
                          setManualCharges([{ name: "", amount: "" }]);
                          setDiscountType("none");
                          setDiscountValue("");
                          toast({ title: "Success", description: "Checkout completed successfully" });
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
                      <Check className="h-4 w-4 mr-2" />
                      Complete Checkout
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
