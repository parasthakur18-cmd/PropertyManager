import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { Property } from "@shared/schema";
import { serviceTypeLabels } from "@/pages/addons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  IndianRupee, TrendingUp, CheckCircle2, Clock, Package, CalendarDays,
} from "lucide-react";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmt = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}K`
    : `₹${n.toFixed(0)}`;

interface RevenueData {
  summary: { totalEarned: number; totalCollected: number; totalPending: number; totalCount: number };
  byMonth: { month: string; monthNum: number; total: number; collected: number; pending: number; count: number }[];
  byDay: { day: number; total: number; collected: number; count: number }[];
  byServiceType: { serviceType: string; total: number; collected: number; pending: number; count: number }[];
  year: number;
  month: number;
}

export default function ServicesReport() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const { data: properties = [] } = useQuery<Property[]>({ queryKey: ["/api/properties"] });

  const availableProperties = properties.filter((p) => {
    if (user?.role === "admin") return true;
    return (user?.assignedPropertyIds || []).includes(String(p.id));
  });

  const queryKey = [
    "/api/extra-services/revenue",
    selectedPropertyId,
    selectedYear,
    selectedMonth,
  ];

  const { data, isLoading } = useQuery<RevenueData>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPropertyId !== "all") params.set("propertyId", selectedPropertyId);
      params.set("year", String(selectedYear));
      params.set("month", String(selectedMonth));
      const res = await fetch(`/api/extra-services/revenue?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  const summaryCards = [
    {
      title: "Total Services Revenue",
      value: data ? fmt(data.summary.totalEarned) : "—",
      sub: `${data?.summary.totalCount ?? 0} services`,
      icon: <IndianRupee className="h-5 w-5 text-blue-600" />,
      color: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Already Collected",
      value: data ? fmt(data.summary.totalCollected) : "—",
      sub: "Paid at time of service",
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      color: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Pending (On-Bill)",
      value: data ? fmt(data.summary.totalPending) : "—",
      sub: "Will be collected at checkout",
      icon: <Clock className="h-5 w-5 text-orange-600" />,
      color: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      title: `Best Month (${selectedYear})`,
      value: data
        ? (() => {
            const best = [...(data.byMonth || [])].sort((a, b) => b.total - a.total)[0];
            return best && best.total > 0 ? `${best.month} — ${fmt(best.total)}` : "No data";
          })()
        : "—",
      sub: "Highest earning month",
      icon: <TrendingUp className="h-5 w-5 text-purple-600" />,
      color: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            Services Revenue Report
          </h1>
          <p className="text-sm text-muted-foreground">Earnings from all extra services across properties</p>
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
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={card.color}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.title}</p>
                  <p className="text-2xl font-bold mt-1" data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    {isLoading ? <Skeleton className="h-8 w-24" /> : card.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20">{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Monthly Earnings — {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.byMonth ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `₹${value.toFixed(0)}`,
                    name === "collected" ? "Collected" : "Pending",
                  ]}
                />
                <Legend />
                <Bar dataKey="collected" name="Collected" fill="#16a34a" radius={[4,4,0,0]} />
                <Bar dataKey="pending" name="Pending" fill="#f97316" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              By Service Type
              <span className="text-muted-foreground font-normal text-sm ml-2">— all time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
            ) : !data?.byServiceType?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No services recorded yet</p>
            ) : (
              <div className="space-y-2">
                {data.byServiceType.map((row) => {
                  const label = serviceTypeLabels[row.serviceType] || row.serviceType;
                  const pct = data.summary.totalEarned > 0 ? (row.total / data.summary.totalEarned) * 100 : 0;
                  return (
                    <div key={row.serviceType} className="space-y-1" data-testid={`row-service-${row.serviceType}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{label}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{row.count} bookings</Badge>
                          <span className="font-semibold">₹{row.total.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex text-xs text-muted-foreground gap-3">
                        <span className="text-green-600">Collected: ₹{row.collected.toFixed(0)}</span>
                        <span className="text-orange-500">Pending: ₹{row.pending.toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Day-wise Breakdown
              <span className="text-muted-foreground font-normal text-sm ml-2">
                — {FULL_MONTHS[selectedMonth - 1]} {selectedYear}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-8 w-full"/>)}</div>
            ) : !data?.byDay?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No services recorded in {FULL_MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            ) : (
              <div className="overflow-y-auto max-h-72">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left pb-2 font-medium">Date</th>
                      <th className="text-right pb-2 font-medium">Services</th>
                      <th className="text-right pb-2 font-medium">Collected</th>
                      <th className="text-right pb-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byDay.map((row) => (
                      <tr key={row.day} className="border-b last:border-0 hover:bg-muted/30" data-testid={`row-day-${row.day}`}>
                        <td className="py-2 font-medium">
                          {String(row.day).padStart(2,"0")} {MONTH_NAMES[selectedMonth - 1]}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">{row.count}</td>
                        <td className="py-2 text-right text-green-600">₹{row.collected.toFixed(0)}</td>
                        <td className="py-2 text-right font-semibold">₹{row.total.toFixed(0)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/20 font-bold text-sm">
                      <td className="py-2 pl-1">Total</td>
                      <td className="py-2 text-right">{data.byDay.reduce((s,r)=>s+r.count,0)}</td>
                      <td className="py-2 text-right text-green-600">
                        ₹{data.byDay.reduce((s,r)=>s+r.collected,0).toFixed(0)}
                      </td>
                      <td className="py-2 text-right">
                        ₹{data.byDay.reduce((s,r)=>s+r.total,0).toFixed(0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
