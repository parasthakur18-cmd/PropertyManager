import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Hotel, User, Calendar, DollarSign, UtensilsCrossed, LogOut, Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface ActiveBooking {
  id: number;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  numberOfGuests: number;
  specialRequests: string | null;
  advanceAmount: string;
  customPrice: string | null;
  guest: {
    id: number;
    fullName: string;
    email: string | null;
    phone: string;
  };
  room: {
    id: number;
    roomNumber: string;
    type: string;
    pricePerNight: string;
  };
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
  const [discountType, setDiscountType] = useState<string>("none");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [includeGst, setIncludeGst] = useState<boolean>(false); // Changed default from true to false
  const [includeServiceCharge, setIncludeServiceCharge] = useState<boolean>(false); // Changed default from true to false
  const [searchQuery, setSearchQuery] = useState("");

  const { data: activeBookings, isLoading } = useQuery<ActiveBooking[]>({
    queryKey: ["/api/bookings/active"],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Filter bookings based on search query
  const filteredBookings = activeBookings?.filter((booking) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.guest.fullName.toLowerCase().includes(query) ||
      booking.room.roomNumber.toLowerCase().includes(query) ||
      booking.id.toString().includes(query) ||
      booking.guest.phone.includes(query)
    );
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ bookingId, paymentMethod, discountType, discountValue, includeGst, includeServiceCharge }: { 
      bookingId: number; 
      paymentMethod: string;
      discountType?: string;
      discountValue?: number;
      includeGst: boolean;
      includeServiceCharge: boolean;
    }) => {
      return await apiRequest("POST", "/api/bookings/checkout", { 
        bookingId, 
        paymentMethod,
        discountType: discountType === "none" ? null : discountType,
        discountValue: discountType === "none" ? null : discountValue,
        includeGst,
        includeServiceCharge,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Checkout Successful",
        description: "Guest has been checked out and bill has been generated",
      });
      setCheckoutDialog({ open: false, booking: null });
      setPaymentMethod("cash");
      setDiscountType("none");
      setDiscountValue("");
      setIncludeGst(false); // Reset to false (0% default)
      setIncludeServiceCharge(false); // Reset to false (0% default)
    },
    onError: (error: any) => {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to checkout guest",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    if (!checkoutDialog.booking) return;
    checkoutMutation.mutate({
      bookingId: checkoutDialog.booking.id,
      paymentMethod,
      discountType: discountType === "none" ? undefined : discountType,
      discountValue: discountType === "none" || !discountValue ? undefined : parseFloat(discountValue),
      includeGst,
      includeServiceCharge,
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

  // Calculate total amount with optional GST/Service Charge
  const calculateTotalWithCharges = (booking: ActiveBooking, includeGst: boolean, includeServiceCharge: boolean) => {
    // The server sends charges with subtotal only (no GST/Service by default)
    // We apply GST (5%) and Service Charge (10%) based on checkbox selections
    const subtotal = parseFloat(booking.charges.subtotal);
    
    let calculatedTotal = subtotal;
    
    if (includeGst) {
      calculatedTotal = calculatedTotal * 1.05; // Apply 5% GST
    }
    
    if (includeServiceCharge) {
      calculatedTotal = calculatedTotal * 1.10; // Apply 10% Service Charge
    }
    
    return calculatedTotal;
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
                  <Badge variant="default" data-testid={`badge-room-${booking.id}`}>
                    Room {booking.room.roomNumber}
                  </Badge>
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
                <div className="flex justify-between">
                  <span className="font-medium">{checkoutDialog.booking.guest.fullName}</span>
                  <span className="text-muted-foreground">Room {checkoutDialog.booking.room.roomNumber}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Check-in Date</span>
                  <span>{format(new Date(checkoutDialog.booking.checkInDate), "MMM dd, yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Nights Stayed</span>
                  <span>{checkoutDialog.booking.nightsStayed} nights</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total Amount</span>
                  <span data-testid="text-checkout-total">
                    ₹{calculateTotalWithCharges(checkoutDialog.booking, includeGst, includeServiceCharge).toFixed(2)}
                  </span>
                </div>
                {(() => {
                  const calculatedTotal = calculateTotalWithCharges(checkoutDialog.booking, includeGst, includeServiceCharge);
                  const discountAmt = calculateDiscount(
                    calculatedTotal,
                    discountType,
                    discountValue
                  );
                  const finalTotal = calculatedTotal - discountAmt;
                  const advancePaid = parseFloat(checkoutDialog.booking.charges.advancePaid);
                  const balanceDue = finalTotal - advancePaid;

                  return (
                    <>
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
              )}

              <div className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method" data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutDialog({ open: false, booking: null })}
              disabled={checkoutMutation.isPending}
              data-testid="button-cancel-checkout"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending}
              data-testid="button-confirm-checkout"
            >
              {checkoutMutation.isPending ? "Processing..." : "Complete Checkout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
