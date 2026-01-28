import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Download, Calendar, TrendingUp, Users, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface Booking {
  id: number;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount: string | null;
  advanceAmount: string;
  customPrice: string | null;
  source: string;
  mealPlan: string;
  propertyId: number;
  guest: {
    fullName: string;
  };
  room: {
    roomNumber: string;
    pricePerNight: string;
  };
  property: {
    name: string;
  };
}

export default function BookingAnalytics() {
  const [dateRange, setDateRange] = useState<string>("last-30");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/with-details"],
  });

  const { data: properties } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (dateRange) {
      case "today":
        start = startOfDay(now);
        break;
      case "last-7":
        start = startOfDay(subDays(now, 6)); // Today + 6 days back = 7 days
        break;
      case "last-30":
        start = startOfDay(subDays(now, 29)); // Today + 29 days back = 30 days
        break;
      case "custom":
        if (!customStartDate || !customEndDate) {
          return null; // Invalid custom range
        }
        start = startOfDay(new Date(customStartDate));
        end = endOfDay(new Date(customEndDate));
        break;
      default:
        start = startOfDay(subDays(now, 29));
    }

    return { start, end };
  };

  const dateRangeObj = getDateRange();
  const isCustomRangeIncomplete = dateRange === "custom" && (!customStartDate || !customEndDate);

  // Filter bookings by date and property
  const filteredBookings = bookings?.filter((booking) => {
    if (!dateRangeObj) return false;
    
    const checkInDate = new Date(booking.checkInDate);
    const isInDateRange = checkInDate >= dateRangeObj.start && checkInDate <= dateRangeObj.end;
    const isInProperty = selectedProperty === "all" || booking.propertyId === parseInt(selectedProperty);
    
    return isInDateRange && isInProperty;
  }) || [];

  // Calculate analytics
  const analyticsBySource = filteredBookings.reduce((acc, booking) => {
    const source = booking.source || "walk-in";
    if (!acc[source]) {
      acc[source] = { count: 0, revenue: 0 };
    }
    acc[source].count++;
    
    // Calculate revenue
    if (booking.totalAmount) {
      acc[source].revenue += parseFloat(booking.totalAmount);
    } else {
      // Estimate from room charges if totalAmount not available
      const nights = Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
      const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) : parseFloat(booking.room.pricePerNight);
      acc[source].revenue += pricePerNight * nights;
    }
    
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const analyticsByMealPlan = filteredBookings.reduce((acc, booking) => {
    const mealPlan = booking.mealPlan || "EP";
    if (!acc[mealPlan]) {
      acc[mealPlan] = { count: 0 };
    }
    acc[mealPlan].count++;
    return acc;
  }, {} as Record<string, { count: number }>);

  // Calculate totals
  const totalBookings = filteredBookings.length;
  const totalRevenue = Object.values(analyticsBySource).reduce((sum, data) => sum + data.revenue, 0);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredBookings.length === 0) return;

    const headers = [
      "Booking ID",
      "Guest Name",
      "Property",
      "Room",
      "Check-in Date",
      "Check-out Date",
      "Source",
      "Meal Plan",
      "Status",
      "Revenue",
    ];

    const rows = filteredBookings.map((booking) => {
      const nights = Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
      const pricePerNight = booking.customPrice ? parseFloat(booking.customPrice) : parseFloat(booking.room.pricePerNight);
      const revenue = booking.totalAmount ? parseFloat(booking.totalAmount) : pricePerNight * nights;
      
      return [
        booking.id,
        booking.guest.fullName,
        booking.property.name,
        booking.room.roomNumber,
        format(new Date(booking.checkInDate), "yyyy-MM-dd"),
        format(new Date(booking.checkOutDate), "yyyy-MM-dd"),
        booking.source || "walk-in",
        booking.mealPlan || "EP",
        booking.status,
        revenue.toFixed(2),
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sourceLabels: Record<string, string> = {
    "walk-in": "Walk-in",
    "phone": "Phone",
    "online": "Online",
    "self-generated": "Self Generated",
    "booking.com": "Booking.com",
    "airbnb": "Airbnb",
    "ota": "OTA (Other)",
  };

  const mealPlanLabels: Record<string, string> = {
    "EP": "EP - Room Only",
    "CP": "CP - Room + Breakfast",
    "MAP": "MAP - Breakfast + Dinner",
    "AP": "AP - All Meals",
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Booking Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Analyze booking sources, meal plans, and revenue trends
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last-7">Last 7 days</SelectItem>
                  <SelectItem value="last-30">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </>
            )}

            <div>
              <Label>Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger data-testid="select-property-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isCustomRangeIncomplete && (
            <p className="text-sm text-destructive mt-2">
              Please select both start and end dates for custom range
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-bookings">{totalBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dateRange === "today" ? "Today" : dateRange === "last-7" ? "Last 7 days" : dateRange === "last-30" ? "Last 30 days" : "Custom range"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-total-revenue">
              ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average: ₹{totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : "0.00"} per booking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Source</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-top-source">
              {Object.keys(analyticsBySource).length > 0
                ? sourceLabels[Object.entries(analyticsBySource).sort((a, b) => b[1].count - a[1].count)[0][0]]
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Most bookings from this channel
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Booking Source</CardTitle>
            <CardDescription>Total revenue from each booking channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analyticsBySource)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([source, data]) => {
                  const percentage = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={source} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{sourceLabels[source] || source}</span>
                          <Badge variant="outline" className="text-xs">
                            {data.count} booking{data.count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <span className="text-sm font-mono font-medium">
                          ₹{data.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}% of total revenue
                      </p>
                    </div>
                  );
                })}
              {Object.keys(analyticsBySource).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No booking data available for this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meal Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Meal Plan Distribution</CardTitle>
            <CardDescription>Booking count by meal plan type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analyticsByMealPlan)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([mealPlan, data]) => {
                  const percentage = totalBookings > 0 ? (data.count / totalBookings) * 100 : 0;
                  return (
                    <div key={mealPlan} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{mealPlanLabels[mealPlan] || mealPlan}</span>
                        </div>
                        <Badge variant="outline">
                          {data.count} booking{data.count !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-chart-2 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}% of total bookings
                      </p>
                    </div>
                  );
                })}
              {Object.keys(analyticsByMealPlan).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No booking data available for this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={exportToCSV}
          disabled={isCustomRangeIncomplete || filteredBookings.length === 0}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </Button>
      </div>
    </div>
  );
}
