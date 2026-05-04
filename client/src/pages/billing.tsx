import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Receipt, CheckCircle, Clock, Merge, Eye, Printer, IndianRupee, DollarSign, Search, Building2, MessageCircle, Share2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Bill, type Booking, type Guest, type Room, type Property, type Order } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const paymentStatusColors = {
  paid: "bg-chart-5 text-white",
  unpaid: "bg-destructive text-destructive-foreground",
  partial: "bg-amber-500 text-white",
};

interface ExtraService {
  id: number;
  serviceName: string;
  amount: string;
  bookingId: number;
}

interface BillDetails extends Bill {
  guest: Guest;
  booking: Booking & {
    room: Room | null;
    rooms?: Room[]; // For group bookings
    property: Property | null;
  };
  orders: Order[];
  extraServices: ExtraService[];
}

export default function Billing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);
  const [primaryBookingId, setPrimaryBookingId] = useState<number | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending">("all");
  const [agentFilter, setAgentFilter] = useState<number | "all">("all");
  const [propertyFilter, setPropertyFilter] = useState<number | "all">("all");
  const [searchText, setSearchText] = useState("");
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [billToMarkPaid, setBillToMarkPaid] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [waDialogBill, setWaDialogBill] = useState<Bill | null>(null);
  const [waCustomPhone, setWaCustomPhone] = useState("");
  const [sharingBillId, setSharingBillId] = useState<number | null>(null);

  const { data: bills, isLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  // Load ALL bookings (not just active ones) for bill filtering
  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  // Active bookings for merge dialog only
  const activeBookings = allBookings.filter(b => b.status === "checked-in" || b.status === "confirmed");

  const { data: travelAgents = [] } = useQuery<any[]>({
    queryKey: ["/api/travel-agents"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: billDetails } = useQuery<BillDetails>({
    queryKey: [`/api/bills/${selectedBillId}/details`],
    enabled: !!selectedBillId && detailDialogOpen,
    staleTime: 0, // Always refetch to ensure latest data
  });

  const mergeBillsMutation = useMutation({
    mutationFn: async (data: { bookingIds: number[]; primaryBookingId: number }) => {
      return await apiRequest("/api/bills/merge", "POST", data);
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

  const markAsPaidMutation = useMutation({
    mutationFn: async (data: { billId: number; paymentMethod: string }) => {
      const res = await apiRequest(`/api/bills/${data.billId}/mark-paid`, "POST", { paymentMethod: data.paymentMethod });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({
        title: "Payment recorded",
        description: "Bill marked as paid successfully",
      });
      if (data?.walletWarning) {
        setTimeout(() => {
          toast({ title: "Wallet not updated", description: data.walletWarning, variant: "destructive" });
        }, 500);
      }
      setMarkPaidDialogOpen(false);
      setBillToMarkPaid(null);
      setPaymentMethod("cash");
    },
    onError: (error: any) => {
      toast({
        title: "Error updating bill",
        description: error.message || "Failed to mark bill as paid",
        variant: "destructive",
      });
    },
  });

  // Fetch guest contact info when the WA dialog opens (for pre-filling the phone)
  const { data: waContactInfo, isFetching: waContactLoading } = useQuery<{ guestName: string; phone: string }>({
    queryKey: [`/api/bills/${waDialogBill?.id}/contact`],
    enabled: !!waDialogBill,
    staleTime: 60_000,
  });

  // Pre-fill phone when contact loads and field is still empty
  useEffect(() => {
    if (waContactInfo?.phone && !waCustomPhone) {
      setWaCustomPhone(waContactInfo.phone);
    }
  }, [waContactInfo]);

  const sendBillWhatsappMutation = useMutation({
    mutationFn: async ({ billId, phoneNumber }: { billId: number; phoneNumber: string }) => {
      return await apiRequest(`/api/bills/${billId}/send-whatsapp`, "POST", { phoneNumber });
    },
    onSuccess: (_data, { billId }) => {
      const bill = bills?.find(b => b.id === billId);
      const guestName = (bill as any)?.guestName || "Guest";
      toast({
        title: "Bill Sent via WhatsApp",
        description: `Bill link sent to ${waCustomPhone || guestName} successfully.`,
      });
      setWaDialogBill(null);
      setWaCustomPhone("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Bill",
        description: error.message || "Could not send bill via WhatsApp. Check the phone number.",
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

  const handlePrint = () => {
    window.print();
  };

  const handleViewDetails = (billId: number) => {
    setSelectedBillId(billId);
    setDetailDialogOpen(true);
  };

  const billsWithProperty = useMemo(() => {
    return (bills || []).map(bill => {
      const booking = allBookings.find(b => b.id === bill.bookingId);
      return { ...bill, _propertyId: booking?.propertyId || null };
    });
  }, [bills, allBookings]);

  const getBillBalance = (bill: Bill) => {
    const balance = parseFloat(bill.balanceAmount || "0");
    if (balance > 0) return balance;
    return Math.max(0, parseFloat(bill.totalAmount || "0") - parseFloat(bill.advancePaid || "0"));
  };

  const isBillPending = (bill: Bill) => {
    return getBillBalance(bill) > 0 && bill.paymentStatus !== "paid";
  };

  const totalRevenue = billsWithProperty.filter(bill => bill.paymentStatus === "paid").reduce((sum, bill) => sum + parseFloat(bill.totalAmount), 0) || 0;
  
  const pendingReceivables = billsWithProperty.filter(isBillPending).reduce((sum, bill) => sum + getBillBalance(bill), 0);
  
  const paidBills = billsWithProperty.filter((bill) => bill.paymentStatus === "paid").length || 0;
  const pendingBills = billsWithProperty.filter(isBillPending).length || 0;

  const filteredBills = useMemo(() => {
    return billsWithProperty.filter(bill => {
      if (paymentFilter === "paid" && bill.paymentStatus !== "paid") return false;
      if (paymentFilter === "pending" && !isBillPending(bill)) return false;

      if (propertyFilter !== "all" && bill._propertyId !== propertyFilter) return false;

      if (agentFilter !== "all") {
        const booking = allBookings.find(b => b.id === bill.bookingId);
        if (booking?.travelAgentId !== agentFilter) return false;
      }

      if (searchText.trim()) {
        const q = searchText.toLowerCase().trim();
        const guestName = ((bill as any).guestName || "").toLowerCase();
        const invoiceId = `#${bill.id}`;
        const bookingId = `#${bill.bookingId}`;
        if (!guestName.includes(q) && !invoiceId.includes(q) && !bookingId.includes(q)) return false;
      }

      return true;
    });
  }, [billsWithProperty, paymentFilter, propertyFilter, agentFilter, searchText, allBookings]);

  const agentsToShow = travelAgents || [];

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
                  {activeBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active bookings available for merging
                    </p>
                  ) : (
                    activeBookings.map((booking) => (
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
                      const booking = activeBookings.find((b: any) => b.id === bookingId);
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

      <div className={`grid grid-cols-1 gap-6 mb-8 ${user?.role === 'admin' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {user?.role === 'admin' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <span className="text-chart-5">₹</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono" data-testid="stat-total-revenue">₹{totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Receivables</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-amber-600" data-testid="stat-unpaid-bills">₹{pendingReceivables.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{pendingBills} pending bill{pendingBills !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <Tabs value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as "all" | "paid" | "pending")}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-bills">
                All Bills ({bills?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="paid" data-testid="tab-paid-bills">
                Paid ({paidBills})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending-bills">
                Pending ({pendingBills})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {properties.length > 1 && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select 
                value={propertyFilter === "all" ? "all" : propertyFilter.toString()} 
                onValueChange={(value) => setPropertyFilter(value === "all" ? "all" : parseInt(value))}
              >
                <SelectTrigger className="w-[200px]" data-testid="select-property-filter">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map(prop => (
                    <SelectItem key={prop.id} value={prop.id.toString()}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {agentsToShow.length > 0 && (
            <div className="flex items-center gap-2">
              <Select 
                value={agentFilter === "all" ? "all" : agentFilter.toString()} 
                onValueChange={(value) => setAgentFilter(value === "all" ? "all" : parseInt(value))}
              >
                <SelectTrigger className="w-[200px]" data-testid="select-agent-filter">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agentsToShow.map(agent => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name, invoice # or booking #"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
            data-testid="input-bill-search"
          />
        </div>
      </div>

      {!filteredBills || filteredBills.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Receipt className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-semibold">
              {paymentFilter === "all" ? "No bills yet" : `No ${paymentFilter} bills`}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {paymentFilter === "all" 
                ? "Bills will be generated automatically when guests check out"
                : `No bills with ${paymentFilter} status found`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBills.map((bill) => (
            <Card key={bill.id} className="hover-elevate" data-testid={`card-bill-${bill.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {(bill as any).guestName || `Invoice #${bill.id}`}
                      <Badge className={paymentStatusColors[bill.paymentStatus as keyof typeof paymentStatusColors]}>
                        {bill.paymentStatus}
                      </Badge>
                      {((bill as any).mergedBookingIds && (bill as any).mergedBookingIds.length > 0) && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <Merge className="h-3 w-3 mr-1" />
                          Merged Bill
                        </Badge>
                      )}
                      {(() => {
                        const prop = properties.find(p => p.id === (bill as any)._propertyId);
                        return prop && properties.length > 1 ? (
                          <Badge variant="outline">
                            <Building2 className="h-3 w-3 mr-1" />
                            {prop.name}
                          </Badge>
                        ) : null;
                      })()}
                      {(() => {
                        const booking = allBookings.find(b => b.id === bill.bookingId);
                        const agent = booking?.travelAgentId ? travelAgents.find(a => a.id === booking.travelAgentId) : null;
                        return agent ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Agent: {agent.name}
                          </Badge>
                        ) : null;
                      })()}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {format(new Date(bill.createdAt!), "PPP")} • Invoice #{bill.id}
                    </p>
                    {((bill as any).mergedBookingIds && (bill as any).mergedBookingIds.length > 0) && (
                      <p className="text-xs text-purple-600 mt-2 font-medium">
                        Merged Bookings: #{(bill as any).mergedBookingIds.join(', #')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Bill Amount</p>
                    <p className="text-2xl font-bold font-mono" data-testid={`text-bill-total-${bill.id}`}>₹{parseFloat(bill.totalAmount || "0").toFixed(2)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground mb-1">Room Charges</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-room-charges-${bill.id}`}>₹{parseFloat(bill.roomCharges || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Food Charges</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-food-charges-${bill.id}`}>₹{parseFloat(bill.foodCharges || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Extra Services</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-extra-charges-${bill.id}`}>₹{parseFloat(bill.extraCharges || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Subtotal</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-subtotal-${bill.id}`}>₹{parseFloat(bill.subtotal || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">GST ({parseFloat(bill.gstRate || "0")}%)</p>
                    <p className="font-semibold font-mono" data-testid={`text-bill-gst-${bill.id}`}>₹{parseFloat(bill.gstAmount || "0").toFixed(2)}</p>
                  </div>
                  {bill.includeServiceCharge && (
                    <div>
                      <p className="text-muted-foreground mb-1">Service Charge ({bill.serviceChargeRate}%)</p>
                      <p className="font-semibold font-mono" data-testid={`text-bill-service-charge-${bill.id}`}>₹{parseFloat(bill.serviceChargeAmount || "0").toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground mb-1">Advance Paid</p>
                    <p className="font-semibold font-mono text-green-600" data-testid={`text-bill-advance-${bill.id}`}>
                      ₹{parseFloat(String((bill as any).totalAdvance || bill.advancePaid || "0")).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Balance Due</p>
                    <p className="font-semibold font-mono text-orange-600" data-testid={`text-bill-balance-${bill.id}`}>
                      ₹{(() => {
                        if (bill.paymentStatus === "paid") return "0.00";
                        const stored = parseFloat(String(bill.balanceAmount || "0"));
                        if (stored > 0) return stored.toFixed(2);
                        return Math.max(0, parseFloat(String(bill.totalAmount || "0")) - parseFloat(String((bill as any).totalAdvance || bill.advancePaid || "0"))).toFixed(2);
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Amount Collected</p>
                    <p className="font-semibold font-mono text-green-600" data-testid={`text-bill-collected-${bill.id}`}>
                      ₹{(() => {
                        const total = parseFloat(String(bill.totalAmount || "0"));
                        const advance = parseFloat(String((bill as any).totalAdvance || bill.advancePaid || "0"));
                        if (bill.paymentStatus === "paid") return total.toFixed(2);
                        return advance.toFixed(2);
                      })()}
                    </p>
                  </div>
                  {/* Payment Method/Split Payment Display */}
                  {bill.paymentMethods && Array.isArray(bill.paymentMethods) && bill.paymentMethods.length > 0 ? (
                    <div className="col-span-2">
                      <p className="text-muted-foreground mb-1">Payment Breakdown</p>
                      <div className="flex flex-wrap gap-2">
                        {(bill.paymentMethods as Array<{method: string, amount: number}>).map((pm, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className={pm.method === "cash" ? "bg-green-50 border-green-200 text-green-700" : "bg-blue-50 border-blue-200 text-blue-700"}
                          >
                            {pm.method === "cash" ? "Cash" : "Online"}: ₹{Number(pm.amount).toFixed(2)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : bill.paymentMethod ? (
                    <div>
                      <p className="text-muted-foreground mb-1">Payment Method</p>
                      <p className="font-semibold capitalize">{bill.paymentMethod}</p>
                    </div>
                  ) : null}
                  {bill.paidAt && (
                    <div>
                      <p className="text-muted-foreground mb-1">Paid On</p>
                      <p className="font-semibold">{format(new Date(bill.paidAt), "PPP")}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 flex-wrap">
                  {bill.paymentStatus === "pending" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setBillToMarkPaid(bill);
                        setMarkPaidDialogOpen(true);
                      }}
                      data-testid={`button-mark-paid-${bill.id}`}
                    >
                      Mark as Paid
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
                    onClick={() => { setWaDialogBill(bill); setWaCustomPhone(""); }}
                    data-testid={`button-send-bill-whatsapp-${bill.id}`}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send via WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20"
                    disabled={sharingBillId === bill.id}
                    data-testid={`button-share-bill-pdf-${bill.id}`}
                    onClick={async () => {
                      setSharingBillId(bill.id);
                      try {
                        const res = await fetch(`/api/bills/${bill.id}/details`, { credentials: "include" });
                        if (!res.ok) throw new Error("Could not load bill details");
                        const d: BillDetails = await res.json();

                        const guestName = d.guest?.fullName ?? "Guest";
                        const guestPhone = d.guest?.phone ?? "";
                        const propertyName = d.booking?.property?.name ?? "Hostezee";
                        const roomLabel = d.booking?.rooms?.length
                          ? `Rooms ${d.booking.rooms.map((r: any) => r.roomNumber).join(", ")}`
                          : d.booking?.room?.roomNumber ?? "TBA";
                        const checkIn = d.booking?.actualCheckInTime
                          ? format(new Date(d.booking.actualCheckInTime), "dd MMM yyyy, h:mm a")
                          : d.booking?.checkInDate ? format(new Date(d.booking.checkInDate), "dd MMM yyyy") : "—";
                        const checkOut = d.booking?.checkOutDate ? format(new Date(d.booking.checkOutDate), "dd MMM yyyy") : "—";

                        const ordersHtml = (d.orders ?? []).filter((o: any) => o.status !== "rejected").map((order: any) => {
                          const items = (typeof order.items === "string" ? JSON.parse(order.items) : order.items ?? []).map((item: any) =>
                            `<tr><td style="padding:3px 8px;color:#555">${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity || 1}</td><td style="padding:3px 8px;text-align:right;color:#555">&#8377;${item.totalPrice || (parseFloat(item.price) * (item.quantity || 1))}</td></tr>`
                          ).join("");
                          return `<tr style="background:#f9f9f9"><td style="padding:6px 8px;font-weight:600" colspan="2">Order #${order.id}</td></tr>${items}<tr><td style="padding:4px 8px;border-top:1px solid #eee;font-weight:600">Order Total</td><td style="padding:4px 8px;border-top:1px solid #eee;text-align:right;font-weight:600">&#8377;${parseFloat(order.totalAmount).toFixed(2)}</td></tr>`;
                        }).join("");

                        const extrasHtml = (d.extraServices ?? []).map((s: any) =>
                          `<tr><td style="padding:3px 8px;color:#555">${s.serviceName}</td><td style="padding:3px 8px;text-align:right;color:#555">&#8377;${parseFloat(s.amount).toFixed(2)}</td></tr>`
                        ).join("");

                        const roomCharges = parseFloat(d.roomCharges || "0");
                        const foodCharges = parseFloat(d.foodCharges || "0");
                        const extraCharges = parseFloat(d.extraCharges || "0");
                        const gstAmount = parseFloat(d.gstAmount || "0");
                        const serviceChargeAmt = parseFloat((d as any).serviceChargeAmount || "0");
                        const discount = parseFloat(d.discountAmount || "0");
                        const totalAmount = parseFloat(d.totalAmount || "0");
                        const advancePaid = parseFloat(d.advanceAmount || "0");
                        const balanceDue = parseFloat(d.balanceAmount || "0");

                        const dateSuffix = format(new Date(), "dd-MMM-yyyy");
                        const guestNameClean = guestName.replace(/\s+/g, "_");
                        const fileName = `Bill_${guestNameClean}_${dateSuffix}.pdf`;

                        const pdfHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#222;background:#fff}.page{width:100%;margin:0;padding:20px 22px}.header{background:#1E3A5F;color:#fff;border-radius:8px 8px 0 0;padding:22px 24px 18px}.header h1{font-size:22px;font-weight:700}.header .tagline{font-size:12px;color:#2BB6A8;margin-top:2px}.header .property{font-size:14px;margin-top:8px;opacity:.9}.bill-meta{background:#f5f8ff;border:1px solid #dde5f5;border-top:none;border-radius:0 0 8px 8px;padding:14px 18px;display:flex;gap:18px;flex-wrap:wrap;margin-bottom:20px}.bill-meta div{min-width:110px}.bill-meta .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}.bill-meta .value{font-size:13px;font-weight:600;color:#1E3A5F}.section{margin-bottom:20px}.section-title{font-size:13px;font-weight:700;color:#1E3A5F;text-transform:uppercase;letter-spacing:.5px;padding:8px 12px;background:#eef3fb;border-left:3px solid #2BB6A8}table{width:100%;border-collapse:collapse}table td{font-size:13px}.summary-table{border:1px solid #e0e7ef;border-radius:6px;overflow:hidden}.summary-table td{padding:8px 12px;border-bottom:1px solid #eef2f8;word-break:break-word}.total-row td{font-size:16px;font-weight:700;background:#1E3A5F;color:#fff;padding:10px 14px}.gst-row td{color:#15803d;font-weight:600;background:#f0fdf4}.discount-row td{color:#dc2626;font-weight:600;background:#fff5f5}.advance-row td{color:#16a34a;font-weight:600;background:#f0fdf4}.balance-row td{color:#dc2626;font-weight:700;background:#fff5f5;font-size:15px}.footer{margin-top:32px;border-top:1px solid #e0e7ef;padding-top:14px;text-align:center;color:#aaa;font-size:11px}</style></head><body><div class="page">
<div class="header"><h1>Hostezee</h1><div class="tagline">Simplify Stays</div><div class="property">${propertyName}</div></div>
<div class="bill-meta">
  <div><div class="label">Guest</div><div class="value">${guestName}</div></div>
  <div><div class="label">Phone</div><div class="value">${guestPhone || "—"}</div></div>
  <div><div class="label">Room</div><div class="value">${roomLabel}</div></div>
  <div><div class="label">Check-in</div><div class="value">${checkIn}</div></div>
  <div><div class="label">Check-out</div><div class="value">${checkOut}</div></div>
  <div><div class="label">Invoice #</div><div class="value">${d.id}</div></div>
</div>
${roomCharges > 0 ? `<div class="section"><div class="section-title">Room Charges</div><table class="summary-table"><tbody><tr><td style="font-weight:600">Room charges</td><td style="text-align:right;font-weight:600">&#8377;${roomCharges.toFixed(2)}</td></tr></tbody></table></div>` : ""}
${ordersHtml ? `<div class="section"><div class="section-title">Food Orders</div><table class="summary-table"><tbody>${ordersHtml}</tbody></table></div>` : ""}
${extrasHtml ? `<div class="section"><div class="section-title">Extra Services</div><table class="summary-table"><tbody>${extrasHtml}</tbody></table></div>` : ""}
<div class="section"><div class="section-title">Bill Summary</div><table class="summary-table"><tbody>
${roomCharges > 0 ? `<tr><td>Room Charges</td><td style="text-align:right">&#8377;${roomCharges.toFixed(2)}</td></tr>` : ""}
${foodCharges > 0 ? `<tr><td>Food Charges</td><td style="text-align:right">&#8377;${foodCharges.toFixed(2)}</td></tr>` : ""}
${extraCharges > 0 ? `<tr><td>Extra Services</td><td style="text-align:right">&#8377;${extraCharges.toFixed(2)}</td></tr>` : ""}
${gstAmount > 0 ? `<tr class="gst-row"><td>GST</td><td style="text-align:right">&#8377;${gstAmount.toFixed(2)}</td></tr>` : ""}
${serviceChargeAmt > 0 ? `<tr class="gst-row"><td>Service Charge</td><td style="text-align:right">&#8377;${serviceChargeAmt.toFixed(2)}</td></tr>` : ""}
${discount > 0 ? `<tr class="discount-row"><td>Discount</td><td style="text-align:right">-&#8377;${discount.toFixed(2)}</td></tr>` : ""}
<tr class="total-row"><td>Grand Total</td><td style="text-align:right">&#8377;${totalAmount.toFixed(2)}</td></tr>
${advancePaid > 0 ? `<tr class="advance-row"><td>Advance Paid</td><td style="text-align:right">-&#8377;${advancePaid.toFixed(2)}</td></tr>` : ""}
${advancePaid > 0 ? `<tr class="balance-row"><td>Balance Due</td><td style="text-align:right">&#8377;${balanceDue.toFixed(2)}</td></tr>` : ""}
</tbody></table></div>
<div class="footer">Generated by Hostezee &bull; ${format(new Date(), "dd MMM yyyy, hh:mm a")} &bull; Thank you for your stay!</div>
</div></body></html>`;

                        const html2pdfLib = (await import('html2pdf.js')).default;
                        const wrapper = document.createElement('div');
                        wrapper.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none;z-index:-1;';
                        const el = document.createElement('div');
                        el.style.cssText = 'width:760px;background:#fff;';
                        el.innerHTML = pdfHtml;
                        wrapper.appendChild(el);
                        document.body.appendChild(wrapper);
                        let pdfBlob: Blob;
                        try {
                          pdfBlob = await html2pdfLib().from(el).set({
                            margin: [8, 8, 8, 8],
                            filename: fileName,
                            html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                          }).outputPdf('blob');
                        } finally {
                          document.body.removeChild(wrapper);
                        }

                        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
                        const canShareFiles = !!(navigator.share && (navigator as any).canShare && (navigator as any).canShare({ files: [file] }));
                        if (canShareFiles) {
                          try {
                            await navigator.share({ files: [file], title: `Bill — ${guestName}` });
                          } catch (shareErr: any) {
                            if (shareErr?.name === 'AbortError') return;
                            const blobUrl = URL.createObjectURL(pdfBlob);
                            const link = document.createElement('a');
                            link.href = blobUrl; link.download = fileName;
                            document.body.appendChild(link); link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(blobUrl);
                            toast({ title: "PDF Downloaded", description: "Share via WhatsApp manually." });
                          }
                        } else {
                          const blobUrl = URL.createObjectURL(pdfBlob);
                          const link = document.createElement('a');
                          link.href = blobUrl; link.download = fileName;
                          document.body.appendChild(link); link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(blobUrl);
                          toast({ title: "PDF Downloaded", description: `Bill saved as "${fileName}"` });
                        }
                      } catch (error: any) {
                        console.error("Share PDF error:", error);
                        toast({ title: "Failed", description: error.message || "Could not generate bill PDF", variant: "destructive" });
                      } finally {
                        setSharingBillId(null);
                      }
                    }}
                  >
                    {sharingBillId === bill.id ? (
                      <><span className="h-4 w-4 mr-2 animate-spin inline-block border-2 border-current border-t-transparent rounded-full" />Generating…</>
                    ) : (
                      <><Share2 className="h-4 w-4 mr-2" />Share PDF</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(bill.id)}
                    data-testid={`button-view-details-${bill.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details & Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Bill Dialog with Print */}
      <Dialog 
        open={detailDialogOpen} 
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) {
            setSelectedBillId(null); // Clear selected bill when closing
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full">
          <DialogHeader className="print:hidden">
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>

          {billDetails && (
            <div ref={printRef} className="space-y-6 print:p-8">
              {/* Header - Property Info */}
              <div className="text-center border-b pb-4 print:border-b-2">
                <h1 className="text-3xl font-bold font-serif">
                  {billDetails.booking?.property?.name || "Hostezee"}
                </h1>
                {billDetails.booking?.property && (
                  <p className="text-muted-foreground mt-1">
                    {billDetails.booking.property.location}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Invoice #{billDetails.id} • {format(new Date(billDetails.createdAt!), "PPP")}
                </p>
              </div>

              {/* Guest & Booking Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Guest Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {billDetails.guest?.fullName}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {billDetails.guest?.phone}</p>
                    {billDetails.guest?.email && (
                      <p><span className="text-muted-foreground">Email:</span> {billDetails.guest.email}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Booking Information</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Room{billDetails.booking?.rooms && billDetails.booking.rooms.length > 1 ? 's' : ''}:</span>{' '}
                      {billDetails.booking?.isGroupBooking && billDetails.booking?.rooms && billDetails.booking.rooms.length > 0 ? (
                        <>
                          {billDetails.booking.rooms.map(r => r.roomNumber).join(', ')} 
                          <Badge variant="outline" className="ml-2">Group Booking</Badge>
                        </>
                      ) : (
                        <>
                          {billDetails.booking?.room?.roomNumber} ({billDetails.booking?.room?.roomType || 'Standard'})
                        </>
                      )}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Check-in:</span>{" "}
                      {billDetails.booking && (
                        billDetails.booking.actualCheckInTime
                          ? format(new Date(billDetails.booking.actualCheckInTime), "PPP, h:mm a")
                          : format(new Date(billDetails.booking.checkInDate), "PPP")
                      )}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Check-out:</span>{" "}
                      {billDetails.booking && format(new Date(billDetails.booking.checkOutDate), "PPP")}
                    </p>
                    <p><span className="text-muted-foreground">Guests:</span> {billDetails.booking?.numberOfGuests}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Bill Breakdown */}
              <div>
                <h3 className="font-semibold mb-4">Charges Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room Charges</span>
                    <span className="font-mono font-semibold">₹{billDetails.roomCharges}</span>
                  </div>
                  
                  {billDetails.orders && billDetails.orders.length > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Food & Beverage</span>
                        <span className="font-mono font-semibold">₹{billDetails.foodCharges}</span>
                      </div>
                      <div className="ml-4 space-y-2">
                        {billDetails.orders.map((order: any) => {
                          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                          return (
                            <div key={order.id} className="space-y-1">
                              <div className="text-xs text-muted-foreground font-medium">
                                Order #{order.id} ({order.status})
                              </div>
                              {items && items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm text-muted-foreground pl-2">
                                  <span>• {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                                  <span className="font-mono">₹{parseFloat(item.price || 0) * (item.quantity || 1)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {parseFloat(billDetails.extraCharges || "0") > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Extra Services</span>
                        <span className="font-mono font-semibold">₹{billDetails.extraCharges}</span>
                      </div>
                      {billDetails.extraServices && billDetails.extraServices.length > 0 && (
                        <div className="ml-4 space-y-1">
                          {billDetails.extraServices.map((extra: any) => (
                            <div key={extra.id} className="flex justify-between text-sm text-muted-foreground">
                              <span>• {extra.serviceName}</span>
                              <span className="font-mono">₹{extra.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <Separator />

                  <div className="flex justify-between font-medium">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{billDetails.subtotal}</span>
                  </div>

                  {(billDetails.gstOnRooms || billDetails.gstOnFood) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GST ({billDetails.gstRate}%)</span>
                      <span className="font-mono">₹{billDetails.gstAmount}</span>
                    </div>
                  )}

                  {billDetails.includeServiceCharge && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service Charge ({billDetails.serviceChargeRate}%)</span>
                      <span className="font-mono">₹{billDetails.serviceChargeAmount}</span>
                    </div>
                  )}

                  {billDetails.discountAmount && parseFloat(billDetails.discountAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">
                        Discount {billDetails.discountType === "percentage" ? `(${billDetails.discountValue}%)` : "(Fixed)"}
                      </span>
                      <span className="font-mono text-green-600">-₹{billDetails.discountAmount}</span>
                    </div>
                  )}

                  <Separator className="border-t-2" />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="font-mono">₹{billDetails.totalAmount}</span>
                  </div>

                  {parseFloat(billDetails.advancePaid || "0") > 0 && (
                    <>
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-green-600 flex items-center gap-1">
                          Advance Received
                          {(billDetails as any).booking?.advancePaymentMethod && (
                            <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded">
                              {(billDetails as any).booking.advancePaymentMethod === "upi" ? "UPI" : "Cash"}
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-green-600">-₹{billDetails.advancePaid}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-destructive">
                        <span>Balance Due</span>
                        <span className="font-mono">₹{billDetails.balanceAmount}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Info */}
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Payment Status</p>
                  <Badge className={paymentStatusColors[billDetails.paymentStatus as keyof typeof paymentStatusColors]}>
                    {billDetails.paymentStatus}
                  </Badge>
                </div>
                {/* Payment Method/Split Payment Display */}
                {billDetails.paymentMethods && Array.isArray(billDetails.paymentMethods) && billDetails.paymentMethods.length > 0 ? (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Payment Breakdown</p>
                    <div className="flex flex-wrap gap-2">
                      {(billDetails.paymentMethods as Array<{method: string, amount: number}>).map((pm, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className={pm.method === "cash" ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300" : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"}
                        >
                          {pm.method === "cash" ? "Cash" : "Online"}: ₹{Number(pm.amount).toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : billDetails.paymentMethod ? (
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-semibold capitalize">{billDetails.paymentMethod}</p>
                  </div>
                ) : null}
                {billDetails.paidAt && (
                  <div>
                    <p className="text-muted-foreground">Paid On</p>
                    <p className="font-semibold">{format(new Date(billDetails.paidAt), "PPP")}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center text-sm text-muted-foreground pt-4 border-t print:border-t-2">
                <p>Thank you for staying with us!</p>
                <p className="mt-1">We hope to serve you again soon.</p>
              </div>

              {/* Print Button - Hidden when printing */}
              <div className="flex justify-end gap-2 print:hidden pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    setSelectedBillId(null);
                  }}
                  data-testid="button-close-details"
                >
                  Close
                </Button>
                <Button
                  onClick={handlePrint}
                  data-testid="button-print-bill"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Bill
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Bill as Paid</DialogTitle>
          </DialogHeader>
          {billToMarkPaid && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Bill #{billToMarkPaid.id}</p>
                <p className="text-2xl font-bold font-mono mt-1">₹{billToMarkPaid.balanceAmount}</p>
                <p className="text-sm text-muted-foreground mt-1">Balance Amount</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger data-testid="select-mark-paid-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMarkPaidDialogOpen(false);
                    setBillToMarkPaid(null);
                    setPaymentMethod("cash");
                  }}
                  data-testid="button-cancel-mark-paid"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (billToMarkPaid) {
                      markAsPaidMutation.mutate({
                        billId: billToMarkPaid.id,
                        paymentMethod,
                      });
                    }
                  }}
                  disabled={markAsPaidMutation.isPending}
                  data-testid="button-confirm-mark-paid"
                >
                  {markAsPaidMutation.isPending ? "Processing..." : "Confirm Payment"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Bill via WhatsApp Dialog */}
      <Dialog open={!!waDialogBill} onOpenChange={(open) => { if (!open) { setWaDialogBill(null); setWaCustomPhone(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Send Bill via WhatsApp
            </DialogTitle>
          </DialogHeader>
          {waDialogBill && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest</span>
                  <span className="font-medium">{(waDialogBill as any).guestName || waContactInfo?.guestName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-mono">#{waDialogBill.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-semibold">₹{parseFloat(waDialogBill.totalAmount || "0").toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-phone">
                  Send to WhatsApp Number
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pre-filled with the guest's registered number. Change it to send to any other number (family member, agent, etc.).
                </p>
                <Input
                  id="wa-phone"
                  type="tel"
                  placeholder={waContactLoading ? "Loading…" : "Enter phone number"}
                  value={waCustomPhone}
                  onChange={(e) => setWaCustomPhone(e.target.value)}
                  disabled={waContactLoading}
                  data-testid="input-wa-phone"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setWaDialogBill(null); setWaCustomPhone(""); }}
                  data-testid="button-cancel-wa-send"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!waCustomPhone.trim() || sendBillWhatsappMutation.isPending}
                  onClick={() => sendBillWhatsappMutation.mutate({ billId: waDialogBill.id, phoneNumber: waCustomPhone.trim() })}
                  data-testid="button-confirm-wa-send"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {sendBillWhatsappMutation.isPending ? "Sending…" : "Send Bill"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
