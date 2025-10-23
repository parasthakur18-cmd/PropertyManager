import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Receipt, DollarSign, CheckCircle, Clock, Merge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { type Bill, type Booking } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const paymentStatusColors = {
  paid: "bg-chart-5 text-white",
  unpaid: "bg-destructive text-destructive-foreground",
  partial: "bg-amber-500 text-white",
};

export default function Billing() {
  const { toast } = useToast();
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
  const [primaryBookingId, setPrimaryBookingId] = useState<number | null>(null);

  const { data: bills, isLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    select: (bookings) => bookings.filter(b => b.status === "checked-in" || b.status === "confirmed"),
  });

  const mergeBillsMutation = useMutation({
    mutationFn: async (data: { bookingIds: number[]; primaryBookingId: number }) => {
      return await apiRequest("POST", "/api/bills/merge", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({
        title: "Bills merged successfully",
        description: "A consolidated bill has been created",
      });
      setIsMergeDialogOpen(false);
      setSelectedBookingIds([]);
      setPrimaryBookingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error merging bills",
        description: error.message || "Failed to merge bills",
        variant: "destructive",
      });
    },
  });

  const handleBookingToggle = (bookingId: number) => {
    setSelectedBookingIds(prev => {
      const newIds = prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId];
      
      // If we unselect the primary booking, clear it
      if (!newIds.includes(primaryBookingId || 0)) {
        setPrimaryBookingId(null);
      }
      
      return newIds;
    });
  };

  const handleMergeBills = () => {
    if (selectedBookingIds.length < 2) {
      toast({
        title: "Select at least 2 bookings",
        description: "You need to select at least 2 bookings to merge",
        variant: "destructive",
      });
      return;
    }

    if (!primaryBookingId) {
      toast({
        title: "Select primary booking",
        description: "Please select which booking should be the primary one",
        variant: "destructive",
      });
      return;
    }

    mergeBillsMutation.mutate({
      bookingIds: selectedBookingIds,
      primaryBookingId,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const totalRevenue = bills?.reduce((sum, bill) => sum + parseFloat(bill.totalAmount), 0) || 0;
  const paidBills = bills?.filter((bill) => bill.paymentStatus === "paid").length || 0;
  const unpaidBills = bills?.filter((bill) => bill.paymentStatus === "unpaid").length || 0;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-serif">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-1">Track payments and generate invoices</p>
        </div>
        <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-merge-bills">
              <Merge className="h-4 w-4 mr-2" />
              Merge Bills
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Merge Bills</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Select Bookings to Merge</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select at least 2 bookings to create a consolidated bill
                </p>
                <div className="space-y-2">
                  {bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active bookings available for merging
                    </p>
                  ) : (
                    bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center space-x-3 p-3 rounded-md border hover-elevate"
                        data-testid={`merge-booking-${booking.id}`}
                      >
                        <Checkbox
                          id={`booking-${booking.id}`}
                          checked={selectedBookingIds.includes(booking.id)}
                          onCheckedChange={() => handleBookingToggle(booking.id)}
                          data-testid={`checkbox-booking-${booking.id}`}
                        />
                        <Label
                          htmlFor={`booking-${booking.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div>
                            <p className="font-medium">Booking #{booking.id} - Room {booking.roomId}</p>
                            <p className="text-sm text-muted-foreground">
                              ₹{parseFloat(booking.totalAmount || "0").toLocaleString()} • {format(new Date(booking.checkInDate), "MMM d")} - {format(new Date(booking.checkOutDate), "MMM d")}
                            </p>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedBookingIds.length >= 2 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Select Primary Booking</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The consolidated bill will be linked to this booking
                  </p>
                  <RadioGroup
                    value={primaryBookingId?.toString() || ""}
                    onValueChange={(value) => setPrimaryBookingId(parseInt(value))}
                  >
                    {selectedBookingIds.map((bookingId) => {
                      const booking = bookings.find(b => b.id === bookingId);
                      if (!booking) return null;
                      return (
                        <div
                          key={bookingId}
                          className="flex items-center space-x-3 p-3 rounded-md border"
                        >
                          <RadioGroupItem
                            value={bookingId.toString()}
                            id={`primary-${bookingId}`}
                            data-testid={`radio-primary-${bookingId}`}
                          />
                          <Label
                            htmlFor={`primary-${bookingId}`}
                            className="flex-1 cursor-pointer"
                          >
                            Booking #{booking.id} - Room {booking.roomId}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMergeDialogOpen(false);
                    setSelectedBookingIds([]);
                    setPrimaryBookingId(null);
                  }}
                  data-testid="button-cancel-merge"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMergeBills}
                  disabled={selectedBookingIds.length < 2 || !primaryBookingId || mergeBillsMutation.isPending}
                  data-testid="button-confirm-merge"
                >
                  {mergeBillsMutation.isPending ? "Merging..." : "Merge Bills"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="stat-total-revenue">₹{totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Bills</CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="stat-paid-bills">{paidBills}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Bills</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="stat-unpaid-bills">{unpaidBills}</div>
          </CardContent>
        </Card>
      </div>

      {!bills || bills.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Receipt className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-semibold">No bills yet</h3>
            <p className="text-muted-foreground max-w-md">
              Bills will be generated automatically when guests check out
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => (
            <Card key={bill.id} className="hover-elevate" data-testid={`card-bill-${bill.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Invoice #{bill.id}
                      <Badge className={paymentStatusColors[bill.paymentStatus as keyof typeof paymentStatusColors]}>
                        {bill.paymentStatus}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {format(new Date(bill.createdAt!), "PPP")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold font-mono" data-testid={`text-bill-total-${bill.id}`}>₹{bill.totalAmount}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Room Charges</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-room-charges-${bill.id}`}>₹{bill.roomCharges}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Food Charges</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-food-charges-${bill.id}`}>₹{bill.foodCharges}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Extra Services</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-extra-charges-${bill.id}`}>₹{bill.extraCharges}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Subtotal</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-subtotal-${bill.id}`}>₹{bill.subtotal}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">GST ({bill.gstRate}%)</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-gst-${bill.id}`}>₹{bill.gstAmount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Service Charge ({bill.serviceChargeRate}%)</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-service-charge-${bill.id}`}>₹{bill.serviceChargeAmount}</p>
                  </div>
                  {bill.paymentMethod && (
                    <div>
                      <p className="text-muted-foreground mb-1">Payment Method</p>
                      <p className="font-semibold capitalize">{bill.paymentMethod}</p>
                    </div>
                  )}
                  {bill.paidAt && (
                    <div>
                      <p className="text-muted-foreground mb-1">Paid On</p>
                      <p className="font-semibold">{format(new Date(bill.paidAt), "PPP")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
