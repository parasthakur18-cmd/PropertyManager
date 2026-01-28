import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking, Guest, Room, Property } from "@shared/schema";

interface CheckoutBillSummaryProps {
  bookingId: number;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  onClose: () => void;
}

export function CheckoutBillSummary({ 
  bookingId, 
  paymentMethod, 
  setPaymentMethod,
  onClose 
}: CheckoutBillSummaryProps) {
  const { toast } = useToast();
  const [gstOnRooms, setGstOnRooms] = useState<boolean>(true); // Default ON for room charges
  const [gstOnFood, setGstOnFood] = useState<boolean>(false); // Default OFF for food charges
  const [includeServiceCharge, setIncludeServiceCharge] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [dueDate, setDueDate] = useState<string>("");
  const [pendingReason, setPendingReason] = useState<string>("");

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const booking = bookings?.find(b => b.id === bookingId);

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: guests } = useQuery<Guest[]>({
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
      return await apiRequest("/api/bookings/checkout", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Checkout completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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

  const isGroupBooking = booking.isGroupBooking;
  const bookingRooms = isGroupBooking 
    ? rooms?.filter(r => booking.roomIds?.includes(r.id)) || []
    : rooms?.filter(r => r.id === booking.roomId) || [];

  const bookingOrders = orders?.filter(o => o.bookingId === bookingId) || [];
  const bookingExtras = extraServices?.filter(e => e.bookingId === bookingId) || [];

  const checkInDate = new Date(booking.checkInDate);
  const checkOutDate = new Date(booking.checkOutDate);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
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
  
  const displayPricePerNight = isGroupBooking
    ? 0
    : booking.customPrice 
      ? parseFloat(booking.customPrice)
      : (bookingRooms[0] ? parseFloat(bookingRooms[0].pricePerNight) : 0);

  const foodCharges = bookingOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);
  const extraCharges = bookingExtras.reduce((sum, extra) => sum + parseFloat(extra.amount || "0"), 0);

  const subtotal = roomCharges + foodCharges + extraCharges;
  
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
  };

  return (
    <div className="space-y-6">
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

      {paymentStatus === "paid" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Method</label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger data-testid="select-checkout-payment-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

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
