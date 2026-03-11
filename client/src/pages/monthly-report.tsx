import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import type { Property } from "@shared/schema";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  BedDouble, UtensilsCrossed, Package, IndianRupee,
  TrendingUp, TrendingDown, CalendarDays, ShoppingBag,
  ArrowDownRight, Banknote,
} from "lucide-react";

const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K`
  : `₹${Math.round(n).toLocaleString()}`;

const COLORS = ["#1E3A5F", "#2BB6A8", "#F2B705", "#e05c3a", "#8b5cf6"];

interface MonthlyData {
  month: string;
  year: number;
  monthNum: number;
  revenue: {
    roomRevenue: number;
    foodRevenueBilled: number;
    servicesRevenueBilled: number;
    totalBilled: number;
    foodOrdersTotal: number;
    extrasTotal: number;
    extrasCollected: number;
    extrasPending: number;
    advanceCollected: number;
  };
  bookings: { newBookings: number; checkouts: number; paidBills: number };
  expenses: { total: number; byCategory: { category: string; total: number }[] };
  netIncome: number;
}

export default function MonthlyReport() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data: properties = [] } = useQuery<Property[]>({ queryKey: ["/api/properties"] });

  const availableProperties = properties.filter((p) => {
    if (user?.role === "admin") return true;
    return (user?.assignedPropertyIds || []).includes(String(p.id));
  });

  const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const { data, isLoading } = useQuery<MonthlyData>({
    queryKey: ["/api/monthly-income", selectedPropertyId, monthStr],
    queryFn: async () => {
      const params = new URLSearchParams({ month: monthStr });
      if (selectedPropertyId !== "all") params.set("propertyId", selectedPropertyId);
      const res = await fetch(`/api/monthly-income?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  const r = data?.revenue;
  const totalIncome = r?.totalBilled ?? 0;
  const totalExpenses = data?.expenses.total ?? 0;
  const netProfit = data?.netIncome ?? 0;
  const isProfitable = netProfit >= 0;

  const incomeBreakdown = r ? [
    { name: "Rooms", value: r.roomRevenue, icon: <BedDouble className="h-4 w-4" />, color: COLORS[0] },
    { name: "Food & Restaurant", value: r.foodRevenueBilled, icon: <UtensilsCrossed className="h-4 w-4" />, color: COLORS[1] },
    { name: "Extra Services", value: r.servicesRevenueBilled, icon: <Package className="h-4 w-4" />, color: COLORS[2] },
  ] : [];

  const pieData = incomeBreakdown.filter((d) => d.value > 0);

  const barData = [
    { name: "Room Revenue", amount: r?.roomRevenue ?? 0, fill: COLORS[0] },
    { name: "Food Revenue", amount: r?.foodRevenueBilled ?? 0, fill: COLORS[1] },
    { name: "Services", amount: r?.servicesRevenueBilled ?? 0, fill: COLORS[2] },
    { name: "Expenses", amount: totalExpenses, fill: "#ef4444" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-blue-700" />
            Monthly Income Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Full breakdown: Rooms · Food · Services · Expenses for {FULL_MONTHS[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-44" data-testid="select-property">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {availableProperties.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-28" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-36" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FULL_MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Income (Billed)",
            value: fmt(totalIncome),
            sub: `${data?.bookings.paidBills ?? 0} settled checkouts`,
            icon: <IndianRupee className="h-5 w-5 text-blue-600" />,
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Total Expenses",
            value: fmt(totalExpenses),
            sub: `${data?.expenses.byCategory.length ?? 0} categories`,
            icon: <ArrowDownRight className="h-5 w-5 text-red-500" />,
            bg: "bg-red-50 dark:bg-red-950/30",
          },
          {
            label: "Net Profit / Loss",
            value: fmt(Math.abs(netProfit)),
            sub: isProfitable ? "Profit this month" : "Loss this month",
            icon: isProfitable
              ? <TrendingUp className="h-5 w-5 text-green-600" />
              : <TrendingDown className="h-5 w-5 text-red-600" />,
            bg: isProfitable ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30",
            valueColor: isProfitable ? "text-green-600" : "text-red-600",
          },
          {
            label: "Advances Collected",
            value: fmt(r?.advanceCollected ?? 0),
            sub: `${data?.bookings.newBookings ?? 0} new bookings`,
            icon: <Banknote className="h-5 w-5 text-purple-600" />,
            bg: "bg-purple-50 dark:bg-purple-950/30",
          },
        ].map((card) => (
          <Card key={card.label} className={card.bg}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{card.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className={`text-2xl font-bold mt-1 ${(card as any).valueColor || ""}`}>{card.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20 ml-2 shrink-0">{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <div className="space-y-4">
                {incomeBreakdown.map((item) => {
                  const pct = totalIncome > 0 ? (item.value / totalIncome) * 100 : 0;
                  return (
                    <div key={item.name} data-testid={`income-row-${item.name.toLowerCase().replace(/\s+/g,"-")}`}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 font-medium">
                          <span style={{ color: item.color }}>{item.icon}</span>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{pct.toFixed(1)}%</span>
                          <span className="font-bold">{fmt(item.value)}</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
                {totalIncome === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No settled checkouts in this month</p>
                )}
                {totalIncome > 0 && (
                  <div className="pt-3 border-t flex items-center justify-between font-bold">
                    <span>Total Billed Income</span>
                    <span className="text-blue-700">{fmt(totalIncome)}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar chart comparing all categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip formatter={(v: number) => [`₹${Math.round(v).toLocaleString()}`, ""]} />
                  <Bar dataKey="amount" radius={[4,4,0,0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Extra Services detail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              Extra Services This Month
              <span className="text-xs font-normal text-muted-foreground">(by service date)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-32 w-full" /> : (
              <div className="space-y-3">
                {[
                  { label: "Total Services Added", value: r?.extrasTotal ?? 0, color: "text-foreground" },
                  { label: "Already Collected", value: r?.extrasCollected ?? 0, color: "text-green-600" },
                  { label: "Pending (on final bill)", value: r?.extrasPending ?? 0, color: "text-orange-500" },
                  { label: "Included in Billed Revenue", value: r?.servicesRevenueBilled ?? 0, color: "text-blue-600" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={`font-semibold ${row.color}`}>{fmt(row.value)}</span>
                  </div>
                ))}
                <Separator />
                <p className="text-xs text-muted-foreground">
                  "Included in Billed Revenue" is what appeared in settled checkouts this month.
                  "Already Collected" is cash/UPI collected at time of service.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Expenses Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-8 w-full"/>)}</div>
            ) : !data?.expenses.byCategory.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded this month</p>
            ) : (
              <div className="space-y-2">
                {data.expenses.byCategory
                  .sort((a, b) => b.total - a.total)
                  .map((row) => {
                    const pct = totalExpenses > 0 ? (row.total / totalExpenses) * 100 : 0;
                    return (
                      <div key={row.category}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize font-medium">{row.category}</span>
                          <span className="font-semibold text-red-600">{fmt(row.total)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                <div className="pt-2 border-t flex items-center justify-between font-bold text-sm">
                  <span>Total Expenses</span>
                  <span className="text-red-600">{fmt(totalExpenses)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Booking Activity — {FULL_MONTHS[selectedMonth - 1]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "New Bookings", value: data?.bookings.newBookings ?? 0, color: "text-blue-600" },
              { label: "Checkouts", value: data?.bookings.checkouts ?? 0, color: "text-teal-600" },
              { label: "Bills Settled", value: data?.bookings.paidBills ?? 0, color: "text-green-600" },
            ].map((stat) => (
              <div key={stat.label} className="border rounded-lg p-4 text-center">
                {isLoading
                  ? <Skeleton className="h-8 w-12 mx-auto" />
                  : <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                }
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
