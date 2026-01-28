import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Property, Booking, Room, Guest, TravelAgent, Bill, Order } from "@shared/schema";
import { TrendingUp, TrendingDown, Receipt, IndianRupee, Download } from "lucide-react";
import { format } from "date-fns";

export default function Financials() {
  const currentYear = new Date().getFullYear();
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const { toast } = useToast();

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Fetch all data needed for export
  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: guests } = useQuery<Guest[]>({
    queryKey: ["/api/guests"],
  });

  const { data: travelAgents } = useQuery<TravelAgent[]>({
    queryKey: ["/api/travel-agents"],
  });

  const { data: bills } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: financials, isLoading } = useQuery<any>({
    queryKey: ["/api/financials", selectedProperty, startDate, endDate],
    queryFn: async () => {
      if (!selectedProperty) return null;
      const url = `/api/financials/${selectedProperty}?startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch financials");
      return response.json();
    },
    enabled: !!selectedProperty,
  });

  const getPropertyName = (propertyId: number) => {
    return properties.find(p => p.id === propertyId)?.name || "Unknown";
  };

  // Export all bookings to CSV with complete financial data (Admin-only)
  const exportToCSV = () => {
    if (!bookings || bookings.length === 0) {
      toast({
        title: "No Data",
        description: "There are no bookings to export",
        variant: "destructive",
      });
      return;
    }

    // CSV Headers - comprehensive booking and financial data
    const headers = [
      "Booking ID",
      "Created Date",
      "Property Name",
      "Room Number(s)",
      "Room Type",
      "Room Category",
      "Booking Type",
      "Beds Booked",
      "Guest Name",
      "Guest Phone",
      "Guest Email",
      "Check-in Date",
      "Check-out Date",
      "Nights",
      "Status",
      "Number of Guests",
      "Source",
      "Travel Agent",
      "Meal Plan",
      "Base Room Price/Night",
      "Custom Price/Night",
      "Room Charges (Total)",
      "Food Charges",
      "Extra Charges",
      "Subtotal",
      "GST Rate (%)",
      "GST Amount",
      "Service Charge Rate (%)",
      "Service Charge Amount",
      "Discount Amount",
      "Total Bill Amount",
      "Advance Paid",
      "Balance Due",
      "Payment Status",
      "Payment Method",
      "Special Requests",
      "Created By",
    ];

    // Build CSV rows
    const rows = bookings.map((booking) => {
      const property = properties?.find(p => p.id === booking.propertyId);
      const guest = guests?.find(g => g.id === booking.guestId);
      const agent = travelAgents?.find(a => a.id === booking.travelAgentId);
      const bill = bills?.find(b => b.bookingId === booking.id);
      
      // Handle both single and group bookings
      let roomNumbers = "";
      let roomType = "";
      let roomCategory = "";
      let basePrice = "0";
      
      if (booking.isGroupBooking && booking.roomIds) {
        const bookingRooms = rooms?.filter(r => booking.roomIds?.includes(r.id)) || [];
        roomNumbers = bookingRooms.map(r => r.roomNumber).join(", ");
        roomType = bookingRooms.map(r => r.roomType || "Standard").join(", ");
        roomCategory = bookingRooms.map(r => r.roomCategory).join(", ");
        basePrice = bookingRooms.map(r => r.pricePerNight).join(", ");
      } else {
        const room = rooms?.find(r => r.id === booking.roomId);
        roomNumbers = room?.roomNumber || "";
        roomType = room?.roomType || "Standard";
        roomCategory = room?.roomCategory || "";
        basePrice = room?.pricePerNight || "0";
      }
      
      // Calculate nights
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Get bill details
      const roomCharges = bill ? parseFloat(bill.roomCharges) : 0;
      const foodCharges = bill ? parseFloat(bill.foodCharges) : 0;
      const extraCharges = bill ? parseFloat(bill.extraCharges) : 0;
      const subtotal = bill ? parseFloat(bill.subtotal) : 0;
      const gstRate = bill ? parseFloat(bill.gstRate) : 0;
      const gstAmount = bill ? parseFloat(bill.gstAmount) : 0;
      const serviceChargeRate = bill ? parseFloat(bill.serviceChargeRate) : 0;
      const serviceChargeAmount = bill ? parseFloat(bill.serviceChargeAmount) : 0;
      const discountAmount = bill ? parseFloat(bill.discountAmount || "0") : 0;
      const totalBillAmount = bill ? parseFloat(bill.totalAmount) : parseFloat(booking.totalAmount || "0");
      const advancePaid = bill ? parseFloat(bill.advancePaid) : parseFloat(booking.advanceAmount || "0");
      const balanceDue = bill ? parseFloat(bill.balanceAmount) : totalBillAmount - advancePaid;
      const paymentStatus = bill?.paymentStatus || (booking.status === "checked-out" ? "unpaid" : "pending");
      const paymentMethod = bill?.paymentMethod || "";
      
      // Booking type
      const bookingType = booking.bedsBooked 
        ? "Dormitory" 
        : booking.isGroupBooking 
          ? "Group Booking" 
          : "Single Room";
      
      return [
        booking.id,
        booking.createdAt ? format(new Date(booking.createdAt), "yyyy-MM-dd HH:mm") : "",
        property?.name || "",
        roomNumbers,
        roomType,
        roomCategory,
        bookingType,
        booking.bedsBooked || "",
        guest?.fullName || "",
        guest?.phone || "",
        guest?.email || "",
        format(checkIn, "yyyy-MM-dd HH:mm"),
        format(checkOut, "yyyy-MM-dd HH:mm"),
        nights,
        booking.status,
        booking.numberOfGuests,
        booking.source || "Walk-in",
        agent?.name || "",
        booking.mealPlan || "EP",
        basePrice,
        booking.customPrice || "",
        roomCharges.toFixed(2),
        foodCharges.toFixed(2),
        extraCharges.toFixed(2),
        subtotal.toFixed(2),
        gstRate.toFixed(2),
        gstAmount.toFixed(2),
        serviceChargeRate.toFixed(2),
        serviceChargeAmount.toFixed(2),
        discountAmount.toFixed(2),
        totalBillAmount.toFixed(2),
        advancePaid.toFixed(2),
        balanceDue.toFixed(2),
        paymentStatus,
        paymentMethod,
        (booking.specialRequests || "").replace(/[\n\r]/g, " "),
        booking.createdBy || "",
      ];
    });

    // Create CSV content
    const csvContent = [headers, ...rows]
      .map((row) => row.map(cell => `"${cell}"`).join(","))
      .join("\n");
    
    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hostezee-bookings-financial-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Successful",
      description: `${bookings.length} bookings with complete financial data exported`,
    });
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Financial Reports</h1>
            <p className="text-muted-foreground mt-1">View profit & loss statements by property</p>
          </div>
          <Button 
            onClick={exportToCSV}
            variant="default"
            data-testid="button-export-financial-data"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Complete Data
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Property</Label>
                <Select
                  onValueChange={(value) => setSelectedProperty(parseInt(value))}
                  value={selectedProperty?.toString()}
                >
                  <SelectTrigger data-testid="select-property">
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
                  setEndDate(now.toISOString().split("T")[0]);
                }}
                data-testid="button-this-month"
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  setStartDate(`${now.getFullYear()}-01-01`);
                  setEndDate(now.toISOString().split("T")[0]);
                }}
                data-testid="button-this-year"
              >
                This Year
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const lastYear = now.getFullYear() - 1;
                  setStartDate(`${lastYear}-01-01`);
                  setEndDate(`${lastYear}-12-31`);
                }}
                data-testid="button-last-year"
              >
                Last Year
              </Button>
            </div>
          </CardContent>
        </Card>

        {!selectedProperty ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IndianRupee className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a property</h3>
              <p className="text-muted-foreground text-center">
                Choose a property from the filter above to view its financial report
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading financial data...</div>
          </div>
        ) : financials ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-total-revenue">
                    ₹{financials.totalRevenue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">From bookings & services</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400" data-testid="text-total-expenses">
                    ₹{financials.totalExpenses.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Lease + Operating costs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                    {financials.netProfit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold font-mono ${
                      financials.netProfit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                    data-testid="text-net-profit"
                  >
                    ₹{financials.netProfit.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Revenue - Expenses</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold font-mono ${
                      parseFloat(financials.profitMargin) >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                    data-testid="text-profit-margin"
                  >
                    {financials.profitMargin}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Profit / Revenue</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Income Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Bookings & Services</span>
                    <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                      ₹{financials.totalRevenue.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Lease Payments</span>
                    <span className="font-mono font-semibold" data-testid="text-lease-payments">
                      ₹{financials.totalLeasePayments.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Operating Expenses</span>
                    <span className="font-mono font-semibold" data-testid="text-operating-expenses">
                      ₹{financials.totalOtherExpenses.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {financials.expensesByCategory && financials.expensesByCategory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Operating Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {financials.expensesByCategory.map((cat: any) => (
                      <div
                        key={cat.category}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`category-expense-${cat.category}`}
                      >
                        <span className="font-medium capitalize">{cat.category}</span>
                        <span className="font-mono font-semibold">
                          ₹{cat.total.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
