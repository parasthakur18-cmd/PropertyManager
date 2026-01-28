import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Check, Building2, Calendar, User, Phone, CreditCard, UtensilsCrossed, Home, Receipt, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface FoodItem {
  name: string;
  quantity: number;
  price: string | number;
  total: number;
}

interface PreBill {
  id: number;
  bookingId: number;
  token: string;
  totalAmount: string;
  balanceDue: string;
  roomNumber: string;
  roomCharges: string;
  foodCharges: string;
  extraCharges: string;
  gstAmount: string;
  discount: string;
  advancePayment: string;
  foodItems: FoodItem[];
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  propertyId: number;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  status: string;
  sentAt: string;
  approvedAt: string | null;
}

export default function GuestPreBill() {
  const { token } = useParams<{ token: string }>();
  const [confirmed, setConfirmed] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const { data: preBill, isLoading, error } = useQuery<PreBill>({
    queryKey: ["/api/public/prebill", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/prebill/${token}`);
      if (!res.ok) throw new Error("Pre-bill not found");
      return res.json();
    },
    enabled: !!token,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/prebill/${token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to confirm");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setConfirmed(true);
      if (data.paymentLinkUrl) {
        setPaymentLink(data.paymentLinkUrl);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-blue-500/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !preBill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-blue-500/10 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle>Bill Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This pre-bill link is invalid or has expired. Please contact the property for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAlreadyConfirmed = preBill.status === 'confirmed' || preBill.status === 'paid';
  const roomCharges = parseFloat(preBill.roomCharges || "0");
  const foodCharges = parseFloat(preBill.foodCharges || "0");
  const extraCharges = parseFloat(preBill.extraCharges || "0");
  const gstAmount = parseFloat(preBill.gstAmount || "0");
  const discount = parseFloat(preBill.discount || "0");
  const advancePayment = parseFloat(preBill.advancePayment || "0");
  const totalAmount = parseFloat(preBill.totalAmount || "0");
  const balanceDue = parseFloat(preBill.balanceDue || "0");
  const foodItems = preBill.foodItems || [];

  if (confirmed || isAlreadyConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500/20 via-background to-green-500/10 p-4">
        <Card className="w-full max-w-md text-center border-2 border-green-500/50 shadow-xl">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                <Check className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">
              {paymentLink ? "Payment Link Sent!" : "Bill Confirmed!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {paymentLink 
                ? "A payment link has been sent to your WhatsApp. Please complete the payment at your convenience."
                : "Thank you for confirming your bill. If there's a balance due, the payment link will be sent to your WhatsApp."}
            </p>
            {paymentLink && (
              <Button asChild className="w-full" data-testid="button-open-payment">
                <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Now
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-blue-500/10 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{preBill.propertyName || "Property"}</CardTitle>
              </div>
              <Badge variant="outline">Pre-Bill</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{preBill.guestName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span>Room {preBill.roomNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(preBill.checkInDate), "dd MMM")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(preBill.checkOutDate), "dd MMM")}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Room Charges ({preBill.nights} nights)</span>
                <span>₹{roomCharges.toFixed(2)}</span>
              </div>
              
              {foodCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Food Charges</span>
                  <span>₹{foodCharges.toFixed(2)}</span>
                </div>
              )}

              {extraCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Extra Services</span>
                  <span>₹{extraCharges.toFixed(2)}</span>
                </div>
              )}

              {gstAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-semibold">
                <span>Total Amount</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>

              {advancePayment > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Advance Paid</span>
                  <span>-₹{advancePayment.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Balance Due</span>
                <span className="text-primary">₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {foodItems.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Food Orders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {foodItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <span>₹{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 border-primary/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Receipt className="h-12 w-12 mx-auto text-primary" />
              <div>
                <p className="font-semibold">Confirm Your Bill</p>
                <p className="text-sm text-muted-foreground">
                  Please review the charges above. If everything looks correct, click the button below to confirm.
                </p>
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                data-testid="button-confirm-prebill"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm & Get Payment Link
                  </>
                )}
              </Button>
              {balanceDue <= 0 && (
                <p className="text-xs text-muted-foreground">
                  No balance due - your bill is fully paid!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Questions about your bill? Contact the property front desk.
        </p>
      </div>
    </div>
  );
}
