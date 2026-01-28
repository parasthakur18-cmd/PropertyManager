import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Zap, Users, DoorOpen } from "lucide-react";
import { format } from "date-fns";

interface CostMetric {
  label: string;
  value: number;
  unit: string;
  trend?: "up" | "down" | "stable";
  target?: number;
}

interface RoomEfficiency {
  roomId: number;
  roomNumber: string;
  costPerNight: number;
  efficiency: number;
  status: "excellent" | "good" | "fair" | "poor";
}

export function CostEfficiency({ expenses, bookings, rooms }: { expenses: any[]; bookings: any[]; rooms: any[] }) {
  // Calculate cost per guest
  const calculatePerGuestCost = () => {
    if (bookings.length === 0) return 0;
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalGuests = bookings.reduce((sum, b) => sum + (b.numberOfGuests || 1), 0);
    return totalGuests > 0 ? totalExpenses / totalGuests : 0;
  };

  // Calculate cost per booking
  const calculatePerBookingCost = () => {
    if (bookings.length === 0) return 0;
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    return totalExpenses / bookings.length;
  };

  // Calculate cost per room night
  const calculatePerRoomNightCost = () => {
    if (bookings.length === 0) return 0;
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalNights = bookings.reduce((sum, b) => {
      const checkIn = new Date(b.checkInDate);
      const checkOut = new Date(b.checkOutDate);
      const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);
      return sum + nights;
    }, 0);
    return totalNights > 0 ? totalExpenses / totalNights : 0;
  };

  // Calculate room-level efficiency
  const calculateRoomEfficiency = (): RoomEfficiency[] => {
    return rooms.slice(0, 5).map((room) => {
      const roomBookings = bookings.filter(b => b.roomId === room.id || (b.roomIds && b.roomIds.includes(room.id)));
      const roomExpenses = expenses.filter(e => {
        const expDate = new Date(e.expenseDate);
        return roomBookings.some(b => {
          const checkIn = new Date(b.checkInDate);
          const checkOut = new Date(b.checkOutDate);
          return expDate >= checkIn && expDate <= checkOut;
        });
      });

      const totalRoomExpenses = roomExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const totalNights = roomBookings.reduce((sum, b) => {
        const checkIn = new Date(b.checkInDate);
        const checkOut = new Date(b.checkOutDate);
        const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);
        return sum + nights;
      }, 0);

      const costPerNight = totalNights > 0 ? totalRoomExpenses / totalNights : 0;
      const avgRoomPrice = parseFloat(room.pricePerNight || 0);
      const efficiency = avgRoomPrice > 0 ? (avgRoomPrice / (avgRoomPrice + costPerNight)) * 100 : 0;

      let status: "excellent" | "good" | "fair" | "poor" = "excellent";
      if (efficiency < 60) status = "poor";
      else if (efficiency < 75) status = "fair";
      else if (efficiency < 90) status = "good";

      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        costPerNight,
        efficiency,
        status,
      };
    });
  };

  // Calculate category contribution to costs
  const getCategoryContribution = () => {
    const categoryMap: Record<number, number> = {};
    expenses.forEach(e => {
      const catId = e.categoryId;
      categoryMap[catId] = (categoryMap[catId] || 0) + parseFloat(e.amount || 0);
    });

    return Object.entries(categoryMap).map(([catId, amount]) => ({
      categoryId: parseInt(catId),
      amount: amount as number,
    })).sort((a, b) => b.amount - a.amount).slice(0, 5);
  };

  const perGuestCost = calculatePerGuestCost();
  const perBookingCost = calculatePerBookingCost();
  const perRoomNightCost = calculatePerRoomNightCost();
  const roomEfficiency = calculateRoomEfficiency();
  const categoryContribution = getCategoryContribution();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "text-green-600";
      case "good": return "text-blue-600";
      case "fair": return "text-amber-600";
      case "poor": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "excellent": return "bg-green-50";
      case "good": return "bg-blue-50";
      case "fair": return "bg-amber-50";
      case "poor": return "bg-red-50";
      default: return "bg-muted";
    }
  };

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 text-center">
          <p className="text-muted-foreground">No bookings yet. Cost efficiency metrics will appear once you have bookings and expenses.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Cost Per Guest
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{perGuestCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DoorOpen className="w-4 h-4" />
              Cost Per Booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{perBookingCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Operating cost per booking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Cost Per Room Night
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{perRoomNightCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Operating cost per night</p>
          </CardContent>
        </Card>
      </div>

      {/* Room Efficiency Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Room Efficiency Ratings (Top 5)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roomEfficiency.length === 0 ? (
              <p className="text-sm text-muted-foreground">No room data available yet</p>
            ) : (
              roomEfficiency.map((room, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 border rounded-lg ${getStatusBg(room.status)}`}
                  data-testid={`room-efficiency-${room.roomId}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{room.roomNumber}</h3>
                      <p className="text-sm text-muted-foreground">Cost per night: ₹{room.costPerNight.toLocaleString()}</p>
                    </div>
                    <Badge className={`${
                      room.status === "excellent" ? "bg-green-600" :
                      room.status === "good" ? "bg-blue-600" :
                      room.status === "fair" ? "bg-amber-600" :
                      "bg-destructive"
                    }`}>
                      {room.efficiency.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(room.efficiency, 100)} className="h-2" />
                  <p className={`text-xs mt-2 font-medium ${getStatusColor(room.status)}`}>
                    {room.status === "excellent" && "Excellent profitability ratio"}
                    {room.status === "good" && "Good profitability with room for improvement"}
                    {room.status === "fair" && "Fair profitability - monitor expenses"}
                    {room.status === "poor" && "Poor profitability - reduce costs"}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown Chart */}
      {categoryContribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryContribution.map((cat, idx) => {
                const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                const percentage = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Category {cat.categoryId}</span>
                      <span className="font-semibold">₹{cat.amount.toLocaleString()}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of total expenses</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Efficiency Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Target: Keep cost per guest below 15-20% of room rate</li>
            <li>✓ Monitor: Cost per room night should trend downward over time</li>
            <li>✓ Optimize: Focus on top 3 expense categories for cost reduction</li>
            <li>✓ Compare: Track room efficiency to identify underperforming areas</li>
            <li>✓ Plan: Higher operating costs need higher room rates to maintain margins</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
