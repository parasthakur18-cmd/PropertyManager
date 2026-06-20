import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, Hotel, DollarSign, Users, Calendar,
  AlertTriangle, Target, Globe, Lightbulb, BarChart3,
  ArrowUpRight, ArrowDownRight, RefreshCw, Filter,
  Bed, Star, ShieldAlert, Eye, Calculator,
  CheckCircle2, XCircle, Plus, Save, Pencil, ChevronDown, ChevronUp,
  Zap, Clock, Package, AlertCircle, Building2, Sparkles, Network,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const pct = (n: number) => `${(n || 0).toFixed(1)}%`;
const num2 = (n: number) => (n || 0).toFixed(2);
const nf = (n: number) => (n || 0).toLocaleString("en-IN");

const CHART_COLORS = ["#1E3A5F", "#2BB6A8", "#F2B705", "#E05C5C", "#8B5CF6", "#059669", "#D97706", "#0EA5E9"];

function growth(val: number | null | undefined) {
  if (val === null || val === undefined) return null;
  const positive = val >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(val).toFixed(1)}%
    </span>
  );
}

// ─── Date Preset Builder ───────────────────────────────────────────────────────

type Preset = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "financialYear" | "custom";

function buildDateRange(preset: Preset, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { startDate: fmt(today), endDate: fmt(today) };
    case "yesterday": {
      const y = new Date(today); y.setDate(today.getDate() - 1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case "last7": {
      const s = new Date(today); s.setDate(today.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "last30": {
      const s = new Date(today); s.setDate(today.getDate() - 29);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "thisMonth": {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "lastMonth": {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: fmt(s), endDate: fmt(e) };
    }
    case "thisQuarter": {
      const q = Math.floor(today.getMonth() / 3);
      const s = new Date(today.getFullYear(), q * 3, 1);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "thisYear": {
      const s = new Date(today.getFullYear(), 0, 1);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "financialYear": {
      const fy = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      const s = new Date(fy, 3, 1);
      return { startDate: fmt(s), endDate: fmt(today) };
    }
    case "custom":
      return { startDate: customStart || fmt(today), endDate: customEnd || fmt(today) };
    default:
      return { startDate: fmt(today), endDate: fmt(today) };
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  title: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
  trend?: number | null;
  loading?: boolean;
}

function KpiCard({ title, value, sub, icon, color = "blue", trend, loading }: KpiProps) {
  if (loading) return <Card><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold mt-0.5 truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
            {trend !== undefined && trend !== null && (
              <div className="mt-1">{growth(trend)}</div>
            )}
          </div>
          {icon && (
            <div className={`p-2 rounded-lg shrink-0 ml-2 bg-${color}-50 dark:bg-${color}-950`}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Global Filter Bar ────────────────────────────────────────────────────────

interface FilterState {
  preset: Preset;
  startDate: string;
  endDate: string;
  propertyIds: string;
}

function PropertyMultiSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const { data: properties = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/properties"],
    staleTime: 300000,
  });

  const selected: number[] = value ? value.split(",").map(Number).filter(Boolean) : [];

  const toggle = (id: number) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(next.join(","));
  };

  const label =
    selected.length === 0
      ? "All Properties"
      : selected.length === 1
      ? (properties.find((p) => p.id === selected[0])?.name ?? `Property ${selected[0]}`)
      : `${selected.length} properties`;

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-md border bg-background text-xs font-medium hover:bg-muted/50 transition-colors min-w-[160px] justify-between"
        data-testid="filter-property-select"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-56 bg-popover border rounded-md shadow-lg py-1 max-h-64 overflow-y-auto">
            <button
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 ${selected.length === 0 ? "font-semibold text-primary" : ""}`}
              onClick={() => { onChange(""); setOpen(false); }}
            >
              <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${selected.length === 0 ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                {selected.length === 0 && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
              </div>
              All Properties
            </button>
            <div className="border-t my-1" />
            {properties.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 ${checked ? "font-medium" : ""}`}
                  onClick={() => toggle(p.id)}
                >
                  <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                    {checked && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function GlobalFilters({ filters, onChange }: { filters: FilterState; onChange: (f: FilterState) => void }) {
  const today = new Date().toISOString().split("T")[0];

  const handlePreset = (preset: Preset) => {
    const range = buildDateRange(preset, filters.startDate, filters.endDate);
    onChange({ ...filters, preset, ...range });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={filters.preset} onValueChange={(v) => handlePreset(v as Preset)}>
        <SelectTrigger className="w-[150px] h-8 text-xs" data-testid="filter-preset">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="last7">Last 7 Days</SelectItem>
          <SelectItem value="last30">Last 30 Days</SelectItem>
          <SelectItem value="thisMonth">This Month</SelectItem>
          <SelectItem value="lastMonth">Last Month</SelectItem>
          <SelectItem value="thisQuarter">This Quarter</SelectItem>
          <SelectItem value="thisYear">This Year</SelectItem>
          <SelectItem value="financialYear">Financial Year</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {filters.preset === "custom" && (
        <>
          <Input
            type="date"
            value={filters.startDate}
            max={filters.endDate}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            className="w-[140px] h-8 text-xs"
            data-testid="filter-start-date"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={filters.endDate}
            min={filters.startDate}
            max={today}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            className="w-[140px] h-8 text-xs"
            data-testid="filter-end-date"
          />
        </>
      )}

      {filters.preset !== "custom" && (
        <span className="text-xs text-muted-foreground">
          {filters.startDate} → {filters.endDate}
        </span>
      )}

      <PropertyMultiSelect
        value={filters.propertyIds}
        onChange={(v) => onChange({ ...filters, propertyIds: v })}
      />
    </div>
  );
}

// ─── Query Helper ─────────────────────────────────────────────────────────────

function buildQP(filters: FilterState, extra?: Record<string, string>) {
  const p: Record<string, string> = {
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
  if (filters.propertyIds.trim()) p.propertyIds = filters.propertyIds.trim();
  if (extra) Object.assign(p, extra);
  return "?" + new URLSearchParams(p).toString();
}

// ─── Dashboard 1: Executive ───────────────────────────────────────────────────

function ExecutiveDashboard({ filters }: { filters: FilterState }) {
  const qp = buildQP(filters);
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/owner/dashboard", qp], queryFn: () => fetch(`/api/owner/dashboard${qp}`).then((r) => r.json()) });
  const { data: insights } = useQuery<any>({ queryKey: ["/api/owner/insights", qp], queryFn: () => fetch(`/api/owner/insights${qp}`).then((r) => r.json()) });

  const d = data || {};
  const rev = d.revenue || {};
  const bk = d.bookings || {};
  const rm = d.rooms || {};
  const perf = d.performance || {};
  const leakage = d.leakage || {};
  const forecast = d.forecast || {};

  const sourceData = [
    { name: "OTA", value: rev.ota || 0 },
    { name: "Walk-in", value: rev.walkIn || 0 },
    { name: "Website", value: rev.website || 0 },
    { name: "Corporate", value: rev.corporate || 0 },
    { name: "Direct", value: rev.direct || 0 },
  ].filter((d) => d.value > 0);

  const revBreakdown = [
    { name: "Room", value: rev.room || 0 },
    { name: "Food", value: rev.food || 0 },
    { name: "Other", value: rev.other || 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Revenue KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard loading={isLoading} title="Total Revenue" value={INR(rev.total)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} color="blue" />
          <KpiCard loading={isLoading} title="Room Revenue" value={INR(rev.room)} icon={<Hotel className="h-4 w-4 text-teal-600" />} color="teal" />
          <KpiCard loading={isLoading} title="Food Revenue" value={INR(rev.food)} icon={<DollarSign className="h-4 w-4 text-amber-600" />} color="yellow" />
          <KpiCard loading={isLoading} title="Other Revenue" value={INR(rev.other)} icon={<Star className="h-4 w-4 text-purple-600" />} color="purple" />
        </div>
      </div>

      {/* Booking Status */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bookings</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiCard loading={isLoading} title="Total Bookings" value={nf(bk.total)} icon={<Calendar className="h-4 w-4 text-blue-600" />} />
          <KpiCard loading={isLoading} title="Checked In" value={nf(bk.checkedIn)} icon={<ArrowUpRight className="h-4 w-4 text-teal-600" />} />
          <KpiCard loading={isLoading} title="Checked Out" value={nf(bk.checkedOut)} icon={<ArrowDownRight className="h-4 w-4 text-green-600" />} />
          <KpiCard loading={isLoading} title="Cancelled" value={nf(bk.cancelled)} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} />
          <KpiCard loading={isLoading} title="No Show" value={nf(bk.noShow)} icon={<ShieldAlert className="h-4 w-4 text-orange-500" />} />
        </div>
      </div>

      {/* Room Inventory */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Room Inventory</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard loading={isLoading} title="Total Rooms" value={nf(rm.total)} icon={<Bed className="h-4 w-4 text-blue-600" />} />
          <KpiCard loading={isLoading} title="Occupied Nights" value={nf(rm.occupiedNights)} icon={<Bed className="h-4 w-4 text-teal-600" />} />
          <KpiCard loading={isLoading} title="Available Nights" value={nf(rm.availableNights)} icon={<Bed className="h-4 w-4 text-gray-500" />} />
          <KpiCard loading={isLoading} title="Unsold Nights" value={nf(rm.unsoldNights)} sub={rm.availableNights > 0 ? `${((rm.unsoldNights / rm.availableNights) * 100).toFixed(1)}% vacancy` : ""} icon={<Bed className="h-4 w-4 text-red-400" />} />
        </div>
      </div>

      {/* Performance */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Performance Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard loading={isLoading} title="ARR / ADR" value={INR(perf.arr)} sub="per occupied night" icon={<TrendingUp className="h-4 w-4 text-teal-600" />} />
          <KpiCard loading={isLoading} title="Occupancy %" value={pct(perf.occupancyPct)} icon={<BarChart3 className="h-4 w-4 text-blue-600" />} />
          <KpiCard loading={isLoading} title="RevPAR" value={INR(perf.revpar)} sub="revenue per avail. room" icon={<TrendingUp className="h-4 w-4 text-purple-600" />} />
          <KpiCard loading={isLoading} title="Total Bookings" value={nf(bk.total)} icon={<Users className="h-4 w-4 text-amber-600" />} />
        </div>
      </div>

      {/* Source & Leakage */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard loading={isLoading} title="OTA Revenue" value={INR(rev.ota)} icon={<Globe className="h-4 w-4 text-blue-600" />} />
        <KpiCard loading={isLoading} title="Walk-in Revenue" value={INR(rev.walkIn)} icon={<Users className="h-4 w-4 text-teal-600" />} />
        <KpiCard loading={isLoading} title="Outstanding" value={INR(leakage.outstanding)} icon={<AlertTriangle className="h-4 w-4 text-orange-500" />} />
        <KpiCard loading={isLoading} title="Cancellation Loss" value={INR(leakage.cancelledRevenue)} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
      </div>

      {/* Forecast */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard loading={isLoading} title="Forecast Revenue" value={INR(forecast.forecastRevenue)} sub={`${forecast.daysElapsed} of ${forecast.totalDays} days elapsed`} icon={<Target className="h-4 w-4 text-green-600" />} />
        <KpiCard loading={isLoading} title="Daily Run Rate" value={INR(forecast.dailyRunRate)} icon={<TrendingUp className="h-4 w-4 text-teal-600" />} />
        <KpiCard loading={isLoading} title="Potential Unsold Loss" value={INR(leakage.potentialUnsoldLoss)} sub={`${nf(rm.unsoldNights)} unsold × ARR`} icon={<ShieldAlert className="h-4 w-4 text-red-500" />} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={revBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {revBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => INR(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || sourceData.length === 0 ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => INR(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v: any) => INR(Number(v))} />
                  <Bar dataKey="value" fill="#2BB6A8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights?.insights?.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              Owner AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.insights.map((ins: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Dashboard 2: Property Scorecard ─────────────────────────────────────────

function PropertyScorecard({ filters }: { filters: FilterState }) {
  const qp = buildQP(filters);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/property-performance", qp],
    queryFn: () => fetch(`/api/owner/property-performance${qp}`).then((r) => r.json()),
  });

  const props: any[] = data?.properties || [];
  const rankings = data?.rankings || {};

  const revenueChartData = props.map((p: any) => ({
    name: p.propertyName?.split(" ")[0],
    Room: p.revenue?.room || 0,
    Food: p.revenue?.food || 0,
    Other: p.revenue?.other || 0,
  }));

  return (
    <div className="space-y-5">
      {/* Rankings */}
      {!isLoading && props.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Highest Revenue", value: rankings.highestRevenue },
            { label: "Highest ARR", value: rankings.highestArr },
            { label: "Highest Occupancy", value: rankings.highestOccupancy },
            { label: "Highest RevPAR", value: rankings.highestRevpar },
            { label: "Highest Food Rev", value: rankings.highestFood },
            { label: "Highest Walk-in", value: rankings.highestWalkIn },
          ].map((r) => (
            <Card key={r.label} className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className="text-sm font-bold mt-0.5 truncate">{r.value || "-"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Revenue by Property</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => INR(Number(v))} />
                <Legend />
                <Bar dataKey="Room" stackId="a" fill="#1E3A5F" />
                <Bar dataKey="Food" stackId="a" fill="#2BB6A8" />
                <Bar dataKey="Other" stackId="a" fill="#F2B705" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Property Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Property-wise Scorecard</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Total Rev</TableHead>
                  <TableHead className="text-right">Room Rev</TableHead>
                  <TableHead className="text-right">Food Rev</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Guest Nights</TableHead>
                  <TableHead className="text-right">Rooms</TableHead>
                  <TableHead className="text-right">Occ. Nights</TableHead>
                  <TableHead className="text-right">Occupancy %</TableHead>
                  <TableHead className="text-right">ARR</TableHead>
                  <TableHead className="text-right">RevPAR</TableHead>
                  <TableHead className="text-right">Avg Stay</TableHead>
                  <TableHead className="text-right">OTA Rev</TableHead>
                  <TableHead className="text-right">Walk-in Rev</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Cancelled Rev</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      {Array(16).fill(0).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : props.map((p: any) => (
                  <TableRow key={p.propertyId} className="text-xs hover:bg-muted/30">
                    <TableCell className="font-medium whitespace-nowrap">{p.propertyName}</TableCell>
                    <TableCell className="text-right font-semibold">{INR(p.revenue?.total)}</TableCell>
                    <TableCell className="text-right">{INR(p.revenue?.room)}</TableCell>
                    <TableCell className="text-right">{INR(p.revenue?.food)}</TableCell>
                    <TableCell className="text-right">{p.bookings}</TableCell>
                    <TableCell className="text-right">{p.guestNights}</TableCell>
                    <TableCell className="text-right">{p.totalRooms}</TableCell>
                    <TableCell className="text-right">{p.rooms?.occupiedNights}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.rooms?.occupancyPct >= 70 ? "default" : p.rooms?.occupancyPct >= 40 ? "secondary" : "destructive"} className="text-xs">
                        {pct(p.rooms?.occupancyPct)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{INR(p.performance?.arr)}</TableCell>
                    <TableCell className="text-right">{INR(p.performance?.revpar)}</TableCell>
                    <TableCell className="text-right">{num2(p.performance?.avgStay)} N</TableCell>
                    <TableCell className="text-right">{INR(p.revenue?.ota)}</TableCell>
                    <TableCell className="text-right">{INR(p.revenue?.walkIn)}</TableCell>
                    <TableCell className="text-right text-orange-600">{INR(p.revenue?.outstanding)}</TableCell>
                    <TableCell className="text-right text-red-600">{INR(p.revenue?.cancelled)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Dashboard 3: Monthly Sales ───────────────────────────────────────────────

function MonthlySalesDashboard({ filters }: { filters: FilterState }) {
  const qp = buildQP(filters);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/monthly-sales", qp],
    queryFn: () => fetch(`/api/owner/monthly-sales${qp}`).then((r) => r.json()),
  });

  const months: any[] = data?.months || [];

  return (
    <div className="space-y-5">
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Trend (₹)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={months}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => INR(Number(v))} />
                  <Legend />
                  <Area type="monotone" dataKey="roomRevenue" stackId="1" name="Room" stroke="#1E3A5F" fill="#1E3A5F" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="foodRevenue" stackId="1" name="Food" stroke="#2BB6A8" fill="#2BB6A8" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="otherRevenue" stackId="1" name="Other" stroke="#F2B705" fill="#F2B705" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Occupancy % Trend</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={months}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                  <Line type="monotone" dataKey="occupancyPct" name="Occupancy %" stroke="#2BB6A8" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OTA vs Walk-in trend */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">OTA vs Walk-in Revenue Trend</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => INR(Number(v))} />
                <Legend />
                <Bar dataKey="otaRevenue" name="OTA" fill="#1E3A5F" radius={[2, 2, 0, 0]} />
                <Bar dataKey="walkInRevenue" name="Walk-in" fill="#2BB6A8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Month-wise Sales Summary</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Room</TableHead>
                  <TableHead className="text-right">Food</TableHead>
                  <TableHead className="text-right">OTA</TableHead>
                  <TableHead className="text-right">Walk-in</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Guest Nights</TableHead>
                  <TableHead className="text-right">Occupancy</TableHead>
                  <TableHead className="text-right">ARR</TableHead>
                  <TableHead className="text-right">MoM Growth</TableHead>
                  <TableHead className="text-right">YoY Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>{Array(12).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : months.map((m: any) => (
                  <TableRow key={m.month} className="text-xs hover:bg-muted/30">
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-right font-semibold">{INR(m.totalRevenue)}</TableCell>
                    <TableCell className="text-right">{INR(m.roomRevenue)}</TableCell>
                    <TableCell className="text-right">{INR(m.foodRevenue)}</TableCell>
                    <TableCell className="text-right">{INR(m.otaRevenue)}</TableCell>
                    <TableCell className="text-right">{INR(m.walkInRevenue)}</TableCell>
                    <TableCell className="text-right">{m.bookings}</TableCell>
                    <TableCell className="text-right">{m.guestNights}</TableCell>
                    <TableCell className="text-right">{pct(m.occupancyPct)}</TableCell>
                    <TableCell className="text-right">{INR(m.arr)}</TableCell>
                    <TableCell className="text-right">{m.momGrowth !== null ? growth(m.momGrowth) : "-"}</TableCell>
                    <TableCell className="text-right">{m.yoyGrowth !== null ? growth(m.yoyGrowth) : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Dashboard 4: OTA vs Walk-in ─────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  ota: "OTA (All)",
  walk_in: "Walk-in",
  website: "Website",
  corporate: "Corporate",
  direct: "Direct",
};

function OtaAnalyticsDashboard({ filters }: { filters: FilterState }) {
  const qp = buildQP(filters);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/ota-analysis", qp],
    queryFn: () => fetch(`/api/owner/ota-analysis${qp}`).then((r) => r.json()),
  });

  const sources: any[] = data?.sources || [];
  const categories = data?.categories || {};
  const rankings = data?.rankings || {};

  const categoryChart = Object.entries(categories).map(([k, v]: any) => ({
    name: SOURCE_LABELS[k] || k,
    Revenue: v.revenue,
    Bookings: v.bookings,
  }));

  return (
    <div className="space-y-5">
      {/* Rankings */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Highest Revenue Source", value: rankings.highestRevenue },
            { label: "Highest ARR Source", value: rankings.highestArr },
            { label: "Highest Net Revenue Source", value: rankings.highestNetRevenue },
          ].map((r) => (
            <Card key={r.label} className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className="text-sm font-bold mt-0.5 capitalize">{r.value || "-"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(categories).map(([k, v]: any, i) => (
          <KpiCard
            key={k}
            loading={isLoading}
            title={SOURCE_LABELS[k] || k}
            value={INR(v.revenue)}
            sub={`${v.bookings} bookings`}
            icon={<Globe className="h-4 w-4" style={{ color: CHART_COLORS[i] }} />}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Category</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={categoryChart} dataKey="Revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => INR(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Bookings by Category</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Bookings" fill="#2BB6A8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Source Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Source-wise Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Source</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Room Nights</TableHead>
                  <TableHead className="text-right">ARR</TableHead>
                  <TableHead className="text-right">Avg Stay</TableHead>
                  <TableHead className="text-right">Rev Share %</TableHead>
                  <TableHead className="text-right">Booking Share %</TableHead>
                  <TableHead className="text-right">Net Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? [1, 2, 3].map((i) => (
                  <TableRow key={i}>{Array(10).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                )) : sources.map((s: any) => (
                  <TableRow key={s.source} className="text-xs hover:bg-muted/30">
                    <TableCell className="font-medium capitalize">{s.source}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{SOURCE_LABELS[s.category] || s.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{s.bookings}</TableCell>
                    <TableCell className="text-right font-semibold">{INR(s.revenue)}</TableCell>
                    <TableCell className="text-right">{s.roomNights}</TableCell>
                    <TableCell className="text-right">{INR(s.arr)}</TableCell>
                    <TableCell className="text-right">{num2(s.avgStay)} N</TableCell>
                    <TableCell className="text-right">{pct(s.revenueSharePct)}</TableCell>
                    <TableCell className="text-right">{pct(s.bookingSharePct)}</TableCell>
                    <TableCell className="text-right">{INR(s.netRevenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        * OTA commission amounts are not stored in the database. Net Revenue = Gross Revenue (commission tracking is a planned enhancement).
      </p>
    </div>
  );
}

// ─── Dashboard 5: Revenue Leakage ─────────────────────────────────────────────

function RevenueLeakageDashboard({ filters }: { filters: FilterState }) {
  const qp = buildQP(filters);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/revenue-leakage", qp],
    queryFn: () => fetch(`/api/owner/revenue-leakage${qp}`).then((r) => r.json()),
  });

  const d = data || {};
  const cancelled = d.cancelled || {};
  const noShow = d.noShow || {};
  const outstanding = d.outstanding || {};
  const ghost = d.ghostCheckIns || [];
  const neverIn = d.neverCheckedIn || [];
  const unsold = d.unsoldInventory || {};

  const agingData = outstanding.aging
    ? [
        { name: "0–7 Days", value: outstanding.aging.d0_7 },
        { name: "8–15 Days", value: outstanding.aging.d8_15 },
        { name: "16–30 Days", value: outstanding.aging.d16_30 },
        { name: "30+ Days", value: outstanding.aging.d30plus },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Total Leakage Banner */}
      {!isLoading && d.totalLeakage > 0 && (
        <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <span className="font-bold text-red-800 dark:text-red-400">Total Revenue at Risk</span>
          </div>
          <p className="text-3xl font-bold text-red-700 dark:text-red-300">{INR(d.totalLeakage)}</p>
          <p className="text-xs text-red-600 mt-1">
            Cancellations ({INR(cancelled.totalRevenue)}) + No-shows ({INR(noShow.totalRevenue)}) + Outstanding ({INR(outstanding.total)})
          </p>
        </div>
      )}

      {/* Section A — Cancellations */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Section A — Cancelled Revenue
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <KpiCard loading={isLoading} title="Cancelled Bookings" value={nf(cancelled.count)} icon={<AlertTriangle className="h-4 w-4 text-orange-500" />} />
          <KpiCard loading={isLoading} title="Revenue Lost" value={INR(cancelled.totalRevenue)} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
        </div>
        {cancelled.byProperty?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {cancelled.byProperty.map((p: any) => (
              <Card key={p.propertyId} className="border-orange-100">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground truncate">{p.propertyName}</p>
                  <p className="text-sm font-bold text-orange-600">{INR(p.revenue)}</p>
                  <p className="text-xs text-muted-foreground">{p.count} cancellation{p.count !== 1 ? "s" : ""}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Section B — No Shows */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-500" />
          Section B — No-Show Revenue
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <KpiCard loading={isLoading} title="No-Show Count" value={nf(noShow.count)} icon={<ShieldAlert className="h-4 w-4 text-red-500" />} />
          <KpiCard loading={isLoading} title="Revenue Lost" value={INR(noShow.totalRevenue)} icon={<TrendingDown className="h-4 w-4 text-red-600" />} />
        </div>
      </div>

      <Separator />

      {/* Section C — Outstanding */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-orange-500" />
          Section C — Outstanding Collections
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <KpiCard loading={isLoading} title="Total Outstanding" value={INR(outstanding.total)} icon={<DollarSign className="h-4 w-4 text-orange-600" />} />
          <KpiCard loading={isLoading} title="0–7 Days" value={INR(outstanding.aging?.d0_7)} />
          <KpiCard loading={isLoading} title="8–15 Days" value={INR(outstanding.aging?.d8_15)} />
          <KpiCard loading={isLoading} title="16–30 Days" value={INR(outstanding.aging?.d16_30)} />
        </div>
        {outstanding.aging?.d30plus > 0 && (
          <div className="mb-3">
            <KpiCard loading={isLoading} title="30+ Days (Critical)" value={INR(outstanding.aging?.d30plus)} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} />
          </div>
        )}

        {/* Aging Chart */}
        {agingData.some((a) => a.value > 0) && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding Aging Report</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={agingData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => INR(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: any) => INR(Number(v))} />
                  <Bar dataKey="value" fill="#E05C5C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Outstanding by property */}
        {outstanding.byProperty?.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
            {outstanding.byProperty.map((p: any) => (
              <Card key={p.propertyId} className="border-orange-100">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground truncate">{p.propertyName}</p>
                  <p className="text-sm font-bold text-orange-600">{INR(p.outstanding)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Section D — Ghost Check-ins */}
      {ghost.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-500" />
            Section D — Checked-in But Never Checked Out ({ghost.length})
          </h3>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Expected Out</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ghost.map((g: any) => (
                      <TableRow key={g.bookingId} className="text-xs">
                        <TableCell>#{g.bookingId}</TableCell>
                        <TableCell>{g.propertyId}</TableCell>
                        <TableCell>{g.checkInDate}</TableCell>
                        <TableCell className="text-red-600">{g.checkOutDate}</TableCell>
                        <TableCell className="text-right">{INR(g.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section E — Never Checked In */}
      {neverIn.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Section E — Confirmed But Never Checked In ({neverIn.length})
          </h3>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Expected Check-in</TableHead>
                      <TableHead>Expected Out</TableHead>
                      <TableHead className="text-right">Potential Loss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {neverIn.map((n: any) => (
                      <TableRow key={n.bookingId} className="text-xs">
                        <TableCell>#{n.bookingId}</TableCell>
                        <TableCell>{n.propertyId}</TableCell>
                        <TableCell className="text-amber-600">{n.checkInDate}</TableCell>
                        <TableCell>{n.checkOutDate}</TableCell>
                        <TableCell className="text-right">{INR(n.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Section F — Unsold Inventory */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bed className="h-4 w-4 text-gray-500" />
          Section F — Unsold Inventory Analysis
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <KpiCard loading={isLoading} title="Total Unsold Nights" value={nf(unsold.totalUnsoldNights)} />
          <KpiCard loading={isLoading} title="Avg ARR" value={INR(unsold.avgArr)} />
          <KpiCard loading={isLoading} title="Potential Revenue Loss" value={INR(unsold.totalPotentialLoss)} sub="Unsold Nights × ARR" icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Property</TableHead>
                    <TableHead className="text-right">Total Rooms</TableHead>
                    <TableHead className="text-right">Avail. Nights</TableHead>
                    <TableHead className="text-right">Occupied Nights</TableHead>
                    <TableHead className="text-right">Unsold Nights</TableHead>
                    <TableHead className="text-right">Occupancy %</TableHead>
                    <TableHead className="text-right">ARR</TableHead>
                    <TableHead className="text-right">Potential Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? [1, 2].map((i) => (
                    <TableRow key={i}>{Array(8).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  )) : (unsold.properties || []).map((p: any) => (
                    <TableRow key={p.propertyId} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-medium">{p.propertyName}</TableCell>
                      <TableCell className="text-right">{p.totalRooms}</TableCell>
                      <TableCell className="text-right">{p.availableNights}</TableCell>
                      <TableCell className="text-right">{p.occupiedNights}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{p.unsoldNights}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.occupancyPct >= 70 ? "default" : p.occupancyPct >= 40 ? "secondary" : "destructive"} className="text-xs">
                          {pct(p.occupancyPct)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{INR(p.arr)}</TableCell>
                      <TableCell className="text-right text-red-600">{INR(p.potentialRevenueLoss)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Dashboard 6: Daily Snapshot ─────────────────────────────────────────────

function DailySnapshot({ filters }: { filters: FilterState }) {
  const qp = filters.propertyIds ? `?propertyIds=${filters.propertyIds}` : "";
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/owner/daily-snapshot", qp],
    queryFn: () => fetch(`/api/owner/daily-snapshot${qp}`).then((r) => r.json()),
    refetchInterval: 5 * 60 * 1000,
  });

  const d = data || {};
  const yesterday = d.yesterday || {};
  const today = d.today || {};
  const month = d.thisMonth || {};
  const forecast = d.forecast || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Live Daily Snapshot</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      {/* Yesterday */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Yesterday
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiCard loading={isLoading} title="Total Revenue" value={INR(yesterday.revenue)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} />
          <KpiCard loading={isLoading} title="Room Revenue" value={INR(yesterday.roomRevenue)} icon={<Hotel className="h-4 w-4 text-teal-600" />} />
          <KpiCard loading={isLoading} title="Food Revenue" value={INR(yesterday.foodRevenue)} icon={<DollarSign className="h-4 w-4 text-amber-600" />} />
          <KpiCard loading={isLoading} title="Bookings" value={nf(yesterday.bookings)} icon={<Calendar className="h-4 w-4 text-purple-600" />} />
          <KpiCard loading={isLoading} title="ARR" value={INR(yesterday.arr)} sub="per occupied night" icon={<TrendingUp className="h-4 w-4 text-green-600" />} />
        </div>
      </div>

      {/* Today */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-teal-600" /> Today
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard loading={isLoading} title="Expected Check-ins" value={nf(today.expectedCheckIns)} icon={<ArrowUpRight className="h-4 w-4 text-green-600" />} />
          <KpiCard loading={isLoading} title="Expected Check-outs" value={nf(today.expectedCheckOuts)} icon={<ArrowDownRight className="h-4 w-4 text-blue-600" />} />
          <KpiCard loading={isLoading} title="Pending Payments" value={INR(today.pendingPayments)} icon={<AlertTriangle className="h-4 w-4 text-orange-500" />} />
        </div>
      </div>

      {/* This Month */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" /> This Month ({month.daysElapsed} of {month.daysInMonth} days)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard loading={isLoading} title="Month Revenue" value={INR(month.revenue)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} />
          <KpiCard loading={isLoading} title="Room Revenue" value={INR(month.roomRevenue)} icon={<Hotel className="h-4 w-4 text-teal-600" />} />
          <KpiCard loading={isLoading} title="Food Revenue" value={INR(month.foodRevenue)} icon={<DollarSign className="h-4 w-4 text-amber-600" />} />
          <KpiCard loading={isLoading} title="Daily Run Rate" value={INR(forecast.dailyRunRate)} sub="per day average" icon={<TrendingUp className="h-4 w-4 text-green-600" />} />
        </div>
      </div>

      {/* Forecast */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Month-End Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-24 w-full" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Month Revenue So Far</p>
                <p className="text-xl font-bold">{INR(month.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projected Month-End</p>
                <p className="text-xl font-bold text-primary">{INR(forecast.forecastMonthEnd)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days Remaining</p>
                <p className="text-xl font-bold">{forecast.daysRemaining}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Daily Run Rate</p>
                <p className="text-xl font-bold">{INR(forecast.dailyRunRate)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Dashboard 7: Revenue Forecast Calculator ─────────────────────────────────

function ForecastCalculator({ filters }: { filters: FilterState }) {
  const [rooms, setRooms] = useState("20");
  const [arr, setArr] = useState("3000");
  const [days, setDays] = useState("30");
  const [submitted, setSubmitted] = useState(false);

  const qp = `?totalRooms=${rooms}&arr=${arr}&days=${days}`;
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/owner/revenue-forecast", qp],
    queryFn: () => fetch(`/api/owner/revenue-forecast${qp}`).then((r) => r.json()),
    enabled: submitted,
  });

  const scenarios: any[] = data?.scenarios || [];

  const handleCalculate = () => {
    setSubmitted(true);
    if (submitted) refetch();
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> Revenue Forecast Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <Label className="text-sm">Total Rooms</Label>
              <Input type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} placeholder="e.g. 20" data-testid="input-total-rooms" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">ARR / ADR (₹ per night)</Label>
              <Input type="number" value={arr} onChange={(e) => setArr(e.target.value)} placeholder="e.g. 3000" data-testid="input-arr" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Number of Days</Label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="e.g. 30" data-testid="input-days" />
            </div>
          </div>
          <Button onClick={handleCalculate} className="w-full sm:w-auto" data-testid="button-calculate">
            Calculate Revenue Forecast
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Formula: Rooms × Occupancy % × ARR × Days
          </p>
        </CardContent>
      </Card>

      {submitted && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Scenarios</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-4">
                  {scenarios.map((s: any) => (
                    <Card key={s.occupancyPct} className={`text-center ${s.occupancyPct >= 70 ? "border-green-300 bg-green-50 dark:bg-green-950/20" : s.occupancyPct >= 50 ? "border-blue-200" : "border-gray-200"}`}>
                      <CardContent className="p-3">
                        <p className="text-lg font-bold">{s.occupancyPct.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">{s.occupiedRooms} rooms</p>
                        <p className="text-sm font-semibold mt-1">{INR(s.expectedRevenue)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scenarios}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="occupancyPct" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: any) => INR(Number(v))}
                      labelFormatter={(l) => `${l}% Occupancy`}
                    />
                    <Bar dataKey="expectedRevenue" name="Expected Revenue" radius={[4, 4, 0, 0]}>
                      {scenarios.map((s: any, i) => (
                        <Cell key={i} fill={s.occupancyPct >= 70 ? "#059669" : s.occupancyPct >= 50 ? "#2BB6A8" : "#1E3A5F"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── CEO Summary Dashboard ────────────────────────────────────────────────────

function CeoSummaryDashboard({ filters }: { filters: FilterState }) {
  const params = new URLSearchParams({ propertyIds: filters.propertyIds });
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/ceo-summary", filters.propertyIds],
    queryFn: () => fetch(`/api/owner/ceo-summary?${params}`).then((r) => r.json()),
    staleTime: 60000,
  });

  const siQP = buildQP(filters);
  const { data: si } = useQuery<any>({
    queryKey: ["/api/owner/source-intelligence", filters],
    queryFn: () => fetch(`/api/owner/source-intelligence?${siQP}`).then((r) => r.json()),
    staleTime: 60000,
  });

  const INR_compact = (v: number) => {
    if (!v) return "₹0";
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v.toFixed(0)}`;
  };

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
      ))}
    </div>
  );

  const d = data || {};
  const todayVsYday = d.yesterday > 0 ? ((d.today - d.yesterday) / d.yesterday) * 100 : null;
  const ach = d.targetAchievement;

  const kpis = [
    { title: "Today's Revenue", value: INR_compact(d.today), sub: d.yesterday ? `vs ₹${(d.yesterday / 1000).toFixed(0)}K yesterday` : undefined, trend: todayVsYday, icon: <DollarSign className="h-4 w-4 text-emerald-600" />, color: "emerald" },
    { title: "Month to Date", value: INR_compact(d.monthToDate), sub: d.monthTarget ? `Target: ${INR_compact(d.monthTarget)}` : undefined, icon: <TrendingUp className="h-4 w-4 text-blue-600" />, color: "blue" },
    { title: "Target Achievement", value: ach !== null ? `${ach}%` : "No target", sub: ach !== null ? (ach >= 100 ? "🎯 On track" : ach >= 80 ? "⚠️ Close" : "❌ Behind") : "Set targets to track", icon: <Target className="h-4 w-4 text-violet-600" />, color: "violet" },
    { title: "Occupancy (MTD)", value: `${(d.occupancy || 0).toFixed(1)}%`, sub: `ARR ${INR_compact(d.arr)}`, icon: <Bed className="h-4 w-4 text-teal-600" />, color: "teal" },
    { title: "RevPAR", value: INR_compact(d.revpar), sub: "Revenue per available room", icon: <Hotel className="h-4 w-4 text-indigo-600" />, color: "indigo" },
    { title: "Outstanding", value: INR_compact(d.outstanding), sub: "Uncollected bills", icon: <AlertTriangle className="h-4 w-4 text-amber-600" />, color: "amber" },
    { title: "Revenue Opportunity", value: INR_compact(d.opportunity), sub: "Unsold room nights (MTD)", icon: <Lightbulb className="h-4 w-4 text-orange-600" />, color: "orange" },
    { title: "Pending Bills", value: INR_compact(d.leakage), sub: "Not yet paid", icon: <Clock className="h-4 w-4 text-red-600" />, color: "red" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        <h2 className="font-semibold text-lg">CEO Snapshot — Live Business Health</h2>
        <Badge variant="outline" className="text-xs">Month to Date</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.title} {...k} />
        ))}
      </div>

      {/* Target gauge */}
      {ach !== null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Monthly Revenue Target Progress</span>
              <span className="text-sm font-bold">{ach}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${ach >= 100 ? "bg-emerald-500" : ach >= 80 ? "bg-amber-400" : "bg-red-500"}`}
                style={{ width: `${Math.min(ach, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>₹0</span>
              <span>{INR_compact(d.monthTarget || 0)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Intelligence Strip */}
      {si && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Business Intelligence</span>
            <Badge variant="outline" className="text-xs">Period Snapshot</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Top Revenue Source */}
            {si.dependencyRisk?.topSource && (
              <Card className="border-l-4 border-l-teal-500">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Top Revenue Source</p>
                  <p className="text-base font-bold mt-0.5">{si.dependencyRisk.topSource.label}</p>
                  <p className="text-xs text-muted-foreground">{si.dependencyRisk.topSource.share.toFixed(1)}% of total revenue</p>
                </CardContent>
              </Card>
            )}
            {/* Channel Risk */}
            {si.dependencyRisk && (
              <Card className={`border-l-4 ${si.dependencyRisk.level === "high" ? "border-l-red-500" : si.dependencyRisk.level === "moderate" ? "border-l-amber-500" : "border-l-emerald-500"}`}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Channel Dependency Risk</p>
                  <p className={`text-base font-bold mt-0.5 flex items-center gap-1 ${si.dependencyRisk.level === "high" ? "text-red-600" : si.dependencyRisk.level === "moderate" ? "text-amber-600" : "text-emerald-600"}`}>
                    {si.dependencyRisk.level === "high" ? "🔴 High Risk" : si.dependencyRisk.level === "moderate" ? "🟡 Moderate" : "🟢 Healthy"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {si.dependencyRisk.level === "high" ? "One channel dominates" : si.dependencyRisk.level === "moderate" ? "Revenue concentrated" : "Well diversified"}
                  </p>
                </CardContent>
              </Card>
            )}
            {/* Best Travel Agent */}
            {si.topAgents?.length > 0 && (
              <Card className="border-l-4 border-l-violet-500">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Best Travel Agent</p>
                  <p className="text-base font-bold mt-0.5 truncate">{si.topAgents[0].name}</p>
                  <p className="text-xs text-muted-foreground">{INR_compact(si.topAgents[0].revenue)} · {si.topAgents[0].revenueSharePct.toFixed(1)}% share</p>
                </CardContent>
              </Card>
            )}
          </div>
          {/* TA concentration warning */}
          {si.dependencyRisk?.top3TAShare > 70 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Top 3 travel agents contribute <strong>{si.dependencyRisk.top3TAShare.toFixed(0)}%</strong> of agent revenue. Consider diversifying your agent network.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Property Targets Tab ─────────────────────────────────────────────────────

function PropertyTargetsTab({ filters }: { filters: FilterState }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editing, setEditing] = useState<Record<number, any>>({});

  const params = new URLSearchParams({ propertyIds: filters.propertyIds, month: String(month), year: String(year) });
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/targets", filters.propertyIds, month, year],
    queryFn: () => fetch(`/api/owner/targets?${params}`).then((r) => r.json()),
    staleTime: 60000,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/owner/targets", payload),
    onSuccess: () => {
      toast({ title: "Target saved" });
      qc.invalidateQueries({ queryKey: ["/api/owner/targets"] });
      qc.invalidateQueries({ queryKey: ["/api/owner/ceo-summary"] });
      setEditing({});
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const startEdit = (prop: any) => {
    setEditing((e) => ({
      ...e,
      [prop.propertyId]: {
        revenue: prop.targets.revenue || "",
        occupancy: prop.targets.occupancy || "",
        arr: prop.targets.arr || "",
        food: prop.targets.food || "",
      },
    }));
  };

  const saveTarget = (prop: any) => {
    const e = editing[prop.propertyId];
    saveMutation.mutate({
      propertyId: prop.propertyId, month, year,
      revenueTarget: Number(e.revenue), occupancyTarget: Number(e.occupancy),
      arrTarget: Number(e.arr), foodRevenueTarget: Number(e.food),
    });
  };

  const AchBadge = ({ pct }: { pct: number | null }) => {
    if (pct === null) return <Badge variant="outline" className="text-xs">No target</Badge>;
    const cls = pct >= 100 ? "bg-emerald-100 text-emerald-800" : pct >= 80 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
    return <Badge className={`text-xs ${cls}`}>{pct}%</Badge>;
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-violet-600" />
          <h2 className="font-semibold text-lg">Property Targets vs Actuals</h2>
        </div>
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>)}</div>
      ) : (
        <div className="space-y-4">
          {(data?.properties || []).map((prop: any) => {
            const e = editing[prop.propertyId];
            const isEditing = !!e;
            return (
              <Card key={prop.propertyId} className="overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {prop.propertyName}
                  </CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => isEditing ? saveTarget(prop) : startEdit(prop)} disabled={saveMutation.isPending}>
                    {isEditing ? <><Save className="h-3 w-3 mr-1" />Save</> : <><Pencil className="h-3 w-3 mr-1" />Set Target</>}
                  </Button>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: "revenue", label: "Revenue Target", actual: prop.actuals.revenue, target: prop.targets.revenue, fmt: INR, pct: prop.achievement.revenue },
                      { key: "occupancy", label: "Occupancy %", actual: prop.actuals.occupancy, target: prop.targets.occupancy, fmt: (v: number) => `${v.toFixed(1)}%`, pct: prop.achievement.occupancy },
                      { key: "arr", label: "ARR Target", actual: prop.actuals.arr, target: prop.targets.arr, fmt: INR, pct: prop.achievement.arr },
                      { key: "food", label: "Food Revenue", actual: prop.actuals.food, target: prop.targets.food, fmt: INR, pct: prop.achievement.food },
                    ].map(({ key, label, actual, target, fmt, pct }) => (
                      <div key={key} className="p-3 rounded-lg bg-muted/40 space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{label}</p>
                        {isEditing ? (
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={e[key] || ""}
                            onChange={(ev) => setEditing((prev) => ({ ...prev, [prop.propertyId]: { ...prev[prop.propertyId], [key]: ev.target.value } }))}
                            placeholder={`Target ${key}`}
                          />
                        ) : (
                          <p className="text-sm font-bold">{target ? fmt(target) : <span className="text-muted-foreground text-xs">Not set</span>}</p>
                        )}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs text-muted-foreground">Actual: {fmt(actual)}</span>
                          <AchBadge pct={pct} />
                        </div>
                        {target > 0 && (
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                            <div className={`h-full rounded-full ${(pct || 0) >= 100 ? "bg-emerald-500" : (pct || 0) >= 80 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${Math.min(pct || 0, 100)}%` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(data?.properties || []).length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No properties found. Check property access.</CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── OTA + Commission Analytics Tab ──────────────────────────────────────────

function OtaPlusCommissionTab({ filters }: { filters: FilterState }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editRule, setEditRule] = useState<{ sourceName: string; commissionPct: string } | null>(null);

  const params = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate, propertyIds: filters.propertyIds });

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/ota-with-commissions", filters.startDate, filters.endDate, filters.propertyIds],
    queryFn: () => fetch(`/api/owner/ota-with-commissions?${params}`).then((r) => r.json()),
    staleTime: 60000,
  });

  const { data: rules } = useQuery<any[]>({
    queryKey: ["/api/owner/ota-commissions"],
    queryFn: () => fetch("/api/owner/ota-commissions").then((r) => r.json()),
    staleTime: 120000,
  });

  const saveRule = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/owner/ota-commissions", payload),
    onSuccess: () => {
      toast({ title: "Commission rule saved" });
      qc.invalidateQueries({ queryKey: ["/api/owner/ota-commissions"] });
      qc.invalidateQueries({ queryKey: ["/api/owner/ota-with-commissions"] });
      setEditRule(null);
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const rows = data?.rows || [];
  const totals = data?.totals || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-blue-600" />
        <h2 className="font-semibold text-lg">OTA Analytics + Commission Tracking</h2>
      </div>

      {/* Commission Rules Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4" /> OTA Commission Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {(rules || []).map((rule: any) => (
              <div key={rule.id} className="p-2 border rounded-lg space-y-1">
                <p className="text-xs font-medium capitalize">{rule.sourceName}</p>
                {editRule?.sourceName === rule.sourceName ? (
                  <div className="flex gap-1">
                    <Input type="number" className="h-6 text-xs w-16" value={editRule.commissionPct} onChange={(e) => setEditRule({ ...editRule, commissionPct: e.target.value })} />
                    <Button size="sm" className="h-6 px-1" onClick={() => saveRule.mutate({ sourceName: editRule.sourceName, commissionPct: Number(editRule.commissionPct) })}>
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{rule.commissionPct}%</Badge>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setEditRule({ sourceName: rule.sourceName, commissionPct: String(rule.commissionPct) })}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {/* Add new rule */}
            <div className="p-2 border border-dashed rounded-lg">
              {editRule?.sourceName === "__new__" ? (
                <div className="space-y-1">
                  <Input className="h-6 text-xs" placeholder="OTA name" value={editRule.commissionPct === "" ? "" : ""} onChange={(e) => setEditRule({ sourceName: e.target.value, commissionPct: editRule.commissionPct })} />
                  <div className="flex gap-1">
                    <Input type="number" className="h-6 text-xs w-16" placeholder="%" value={editRule.commissionPct} onChange={(e) => setEditRule({ ...editRule, commissionPct: e.target.value })} />
                    <Button size="sm" className="h-6 px-1" onClick={() => saveRule.mutate({ sourceName: editRule.sourceName, commissionPct: Number(editRule.commissionPct) })}>
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-full w-full text-xs text-muted-foreground" onClick={() => setEditRule({ sourceName: "__new__", commissionPct: "" })}>
                  <Plus className="h-3 w-3 mr-1" /> Add OTA
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="OTA Gross Revenue" value={INR(totals.otaRevenue)} loading={isLoading} icon={<Globe className="h-4 w-4 text-blue-600" />} color="blue" />
        <KpiCard title="Total Commission Paid" value={INR(totals.otaCommission)} sub="Fees to OTAs" loading={isLoading} icon={<DollarSign className="h-4 w-4 text-red-600" />} color="red" />
        <KpiCard title="Net OTA Revenue" value={INR(totals.netOtaRevenue)} sub="After commission" loading={isLoading} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} color="emerald" />
        <KpiCard title="Effective Margin" value={totals.otaRevenue > 0 ? `${((totals.netOtaRevenue / totals.otaRevenue) * 100).toFixed(1)}%` : "—"} sub="Net / Gross" loading={isLoading} icon={<Target className="h-4 w-4 text-violet-600" />} color="violet" />
      </div>

      {/* Per-OTA breakdown table */}
      {isLoading ? <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card> : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No OTA bookings in this period.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Per-OTA Breakdown</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OTA</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Gross Revenue</TableHead>
                    <TableHead className="text-right">Commission %</TableHead>
                    <TableHead className="text-right">Commission ₹</TableHead>
                    <TableHead className="text-right">Net Revenue</TableHead>
                    <TableHead className="text-right">Profit %</TableHead>
                    <TableHead className="text-right">ARR</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: any) => {
                    const profitPct = r.grossRevenue > 0 ? (r.netRevenue / r.grossRevenue) * 100 : 0;
                    return (
                      <TableRow key={r.source}>
                        <TableCell className="font-medium capitalize">{r.source || "Unknown"}</TableCell>
                        <TableCell className="text-right">{r.bookings}</TableCell>
                        <TableCell className="text-right">{INR(r.grossRevenue)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`text-xs ${r.commissionPct >= 18 ? "border-red-300 text-red-700" : "border-green-300 text-green-700"}`}>{r.commissionPct}%</Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600">{INR(r.commissionAmount)}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">{INR(r.netRevenue)}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={`text-xs ${profitPct >= 85 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : profitPct >= 75 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"} border-0`}>
                            {profitPct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{INR(r.arr)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs">{r.revenueShare.toFixed(1)}%</span>
                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${r.revenueShare}%` }} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Room Inventory Certification Tab ────────────────────────────────────────

function RoomCertificationTab({ filters }: { filters: FilterState }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const now = new Date();
  const [notes, setNotes] = useState<Record<number, string>>({});

  const params = new URLSearchParams({ propertyIds: filters.propertyIds });
  const { data, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/owner/inventory-certification", filters.propertyIds],
    queryFn: () => fetch(`/api/owner/inventory-certification?${params}`).then((r) => r.json()),
    staleTime: 60000,
  });

  const certMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/owner/inventory-certification", payload),
    onSuccess: () => {
      toast({ title: "Room inventory certified ✓" });
      qc.invalidateQueries({ queryKey: ["/api/owner/inventory-certification"] });
    },
    onError: () => toast({ title: "Certification failed", variant: "destructive" }),
  });

  const certify = (prop: any) => {
    certMutation.mutate({
      propertyId: prop.propertyId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      activeRooms: prop.activeRooms,
      outOfOrderRooms: prop.outOfOrderRooms,
      saleableRooms: prop.saleableRooms,
      notes: notes[prop.propertyId] || "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-teal-600" />
        <h2 className="font-semibold text-lg">Room Inventory Certification</h2>
        <Badge variant="outline" className="text-xs">{now.toLocaleString("en", { month: "long" })} {now.getFullYear()}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">Certify the correct number of saleable rooms for each property this month. Alerts you when room count changes since last certification.</p>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)}</div>
      ) : (
        <div className="space-y-3">
          {(data || []).map((prop: any) => (
            <Card key={prop.propertyId} className={`border-l-4 ${prop.certifiedThisMonth && !prop.alert ? "border-l-emerald-500" : prop.alert ? "border-l-amber-500" : "border-l-muted"}`}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{prop.propertyName}</h3>
                      {prop.certifiedThisMonth ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Certified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>
                      )}
                    </div>
                    {prop.alert && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        {prop.alert}
                      </div>
                    )}
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                      {[
                        { label: "Configured", value: prop.configuredRooms },
                        { label: "Active", value: prop.activeRooms },
                        { label: "Out of Order", value: prop.outOfOrderRooms },
                        { label: "Saleable", value: prop.saleableRooms, highlight: true },
                        { label: "Certified (last)", value: prop.certSaleableRooms ?? "—" },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} className={`p-2 rounded bg-muted/40 ${highlight ? "bg-teal-50 dark:bg-teal-950" : ""}`}>
                          <p className="text-muted-foreground">{label}</p>
                          <p className={`font-bold text-sm ${highlight ? "text-teal-700 dark:text-teal-300" : ""}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {prop.certifiedThisMonth && prop.certifiedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last certified: {new Date(prop.certifiedAt).toLocaleString()}
                      </p>
                    )}
                    <div className="flex gap-2 items-center">
                      <Input
                        className="h-7 text-xs flex-1"
                        placeholder="Optional certification notes..."
                        value={notes[prop.propertyId] || ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [prop.propertyId]: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => certify(prop)}
                    disabled={certMutation.isPending}
                    variant={prop.certifiedThisMonth && !prop.alert ? "outline" : "default"}
                    className="shrink-0"
                    size="sm"
                    data-testid={`certify-${prop.propertyId}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {prop.certifiedThisMonth ? "Re-certify" : "Certify Inventory"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Revenue Opportunity Dashboard ────────────────────────────────────────────

function RevenueOpportunityTab({ filters }: { filters: FilterState }) {
  const params = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate, propertyIds: filters.propertyIds });
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/revenue-opportunity", filters.startDate, filters.endDate, filters.propertyIds],
    queryFn: () => fetch(`/api/owner/revenue-opportunity?${params}`).then((r) => r.json()),
    staleTime: 60000,
  });

  const rows: any[] = data?.rows || [];
  const summary = data?.summary || {};

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "critical") return <Badge className="bg-red-100 text-red-800 text-xs">Critical</Badge>;
    if (status === "warning") return <Badge className="bg-amber-100 text-amber-800 text-xs">Warning</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-800 text-xs">Healthy</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-orange-500" />
        <h2 className="font-semibold text-lg">Revenue Opportunity Dashboard</h2>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total Unsold Nights" value={`${(summary.totalUnsoldNights || 0).toLocaleString()}`} sub="Room nights not sold" loading={isLoading} icon={<Bed className="h-4 w-4 text-blue-600" />} color="blue" />
        <KpiCard title="Revenue Opportunity" value={INR(summary.totalOpportunity)} sub="At current ARR" loading={isLoading} icon={<DollarSign className="h-4 w-4 text-orange-600" />} color="orange" />
        <KpiCard title="Critical Properties" value={`${summary.criticalCount || 0}`} sub="<30% occupancy" loading={isLoading} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} color="red" />
        <KpiCard title="Period" value={`${summary.days || 0} days`} sub={`${filters.startDate} → ${filters.endDate}`} loading={isLoading} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} color="blue" />
      </div>

      {/* Property rows */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>)}</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No data in this period.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r: any) => (
            <Card key={r.propertyId} className={`border-l-4 ${r.status === "critical" ? "border-l-red-500" : r.status === "warning" ? "border-l-amber-500" : "border-l-emerald-500"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{r.propertyName}</h3>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                      {[
                        { label: "Total Rooms", value: r.totalRooms },
                        { label: "Available Nights", value: r.availableNights },
                        { label: "Occupied", value: r.occupiedNights },
                        { label: "Unsold", value: r.unsoldNights, highlight: true },
                        { label: "ARR", value: INR(r.arr) },
                        { label: "Opportunity", value: INR(r.potentialRevenueLoss), highlight: true },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} className={`p-2 rounded bg-muted/40 ${highlight ? "bg-orange-50 dark:bg-orange-950" : ""}`}>
                          <p className="text-muted-foreground">{label}</p>
                          <p className={`font-bold text-sm ${highlight ? "text-orange-700 dark:text-orange-300" : ""}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Occupancy bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span className="font-medium">{r.occupancyPct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${r.status === "critical" ? "bg-red-500" : r.status === "warning" ? "bg-amber-400" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(r.occupancyPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {!isLoading && rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Occupancy vs Opportunity (by Property)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="propertyName" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any, name: string) => name === "occupancyPct" ? `${Number(v).toFixed(1)}%` : INR(Number(v))} />
                <Legend />
                <Bar yAxisId="left" dataKey="occupancyPct" name="Occupancy %" fill="#2BB6A8" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="potentialRevenueLoss" name="Opportunity ₹" fill="#F2B705" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Action Center Tab ────────────────────────────────────────────────────────

function ActionCenterTab({ filters }: { filters: FilterState }) {
  const params = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate, propertyIds: filters.propertyIds });
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/action-center", filters.startDate, filters.endDate, filters.propertyIds],
    queryFn: () => fetch(`/api/owner/action-center?${params}`).then((r) => r.json()),
    staleTime: 60000,
  });

  const actions: any[] = data?.actions || [];
  const summary = data?.summary || {};

  const PriorityBadge = ({ p }: { p: string }) => {
    if (p === "critical") return <Badge className="bg-red-100 text-red-800 text-xs font-bold">🔴 Critical</Badge>;
    if (p === "high") return <Badge className="bg-amber-100 text-amber-800 text-xs font-bold">🟡 High</Badge>;
    return <Badge className="bg-blue-100 text-blue-800 text-xs font-bold">🔵 Medium</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        <h2 className="font-semibold text-lg">Owner Action Center</h2>
        <Badge variant="outline" className="text-xs">AI-powered recommendations</Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.critical || 0}</p>
            <p className="text-xs text-muted-foreground">Critical Actions</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.high || 0}</p>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{summary.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total Actions</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>)}</div>
      ) : actions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="font-semibold text-emerald-700">All good! No critical actions required.</p>
            <p className="text-sm text-muted-foreground">Try a wider date range or check back tomorrow.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {actions.map((a: any, i: number) => (
            <Card key={i} className={`border-l-4 ${a.priority === "critical" ? "border-l-red-500" : a.priority === "high" ? "border-l-amber-500" : "border-l-blue-400"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge p={a.priority} />
                    <span className="text-xs text-muted-foreground">{a.property}</span>
                  </div>
                  <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                    Expected gain: {a.expectedGain}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold">{a.issue}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.impact}</p>
                </div>
                <div className="p-2 rounded bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200 flex items-start gap-1">
                    <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                    {a.suggestedAction}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Source Intelligence Tab ──────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  ota: "#2BB6A8", walk_in: "#F2B705", direct: "#1E3A5F", travel_agent: "#8B5CF6",
  group: "#EC4899", corporate: "#F97316", website: "#06B6D4", other: "#94A3B8",
};

function SourceIntelligenceTab({ filters }: { filters: FilterState }) {
  const qp = buildQP(filters);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBrief, setAiBrief] = useState<string | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/source-intelligence", filters],
    queryFn: () => fetch(`/api/owner/source-intelligence?${qp}`).then(r => r.json()),
    staleTime: 60000,
  });

  const fmt = (n: number) => `₹${(n / 100000).toFixed(1)}L`;
  const fmtN = (n: number) => n.toLocaleString("en-IN");

  const handleAiBrief = async () => {
    if (!data) return;
    setAiLoading(true); setAiBrief(null);
    try {
      const topSources = (data.sources || []).slice(0, 5).map((s: any) =>
        `${s.label}: ₹${(s.revenue/1000).toFixed(0)}K (${s.revenueSharePct.toFixed(1)}%), ${s.roomNights} nights, ARR ₹${s.arr.toFixed(0)}`
      ).join("\n");
      const topAgents = (data.topAgents || []).slice(0, 5).map((a: any) =>
        `${a.name}: ₹${(a.revenue/1000).toFixed(0)}K, ${a.bookings} bookings`
      ).join("\n");
      const prompt = `You are a hotel business analyst. Analyze this booking source intelligence and provide a concise executive brief (5-8 bullet points) with actionable recommendations.\n\nPeriod: ${filters.startDate} to ${filters.endDate}\nTotal Revenue: ${fmt(data.totals?.revenue || 0)}\nTotal Bookings: ${data.totals?.bookings || 0}\nTotal Room Nights: ${data.totals?.roomNights || 0}\n\nSource Breakdown:\n${topSources}\n\nTop Travel Agents:\n${topAgents}\n\nGroup Bookings: ${data.groupStats?.bookings || 0} bookings, ${fmt(data.groupStats?.revenue || 0)} revenue (${data.groupStats?.revenueSharePct?.toFixed(1) || 0}% of total)\n\nProvide: 1) What is driving the business 2) Key gaps/opportunities 3) 3-4 specific action recommendations. Be direct and data-driven.`;
      const res = await fetch("/api/pms-analytics-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: prompt }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const json = await res.json();
      setAiBrief(json.response || "Could not generate brief.");
    } catch {
      setAiBrief("Could not generate AI brief. Please try again.");
    } finally { setAiLoading(false); }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading source intelligence...</div>;
  if (!data) return <div className="p-8 text-center text-muted-foreground">No data available.</div>;

  const sources: any[] = data.sources || [];
  const topAgents: any[] = data.topAgents || [];
  const totals = data.totals || { revenue: 0, bookings: 0, roomNights: 0 };
  const groupStats = data.groupStats || {};

  const pieData = sources.map(s => ({ name: s.label, value: s.revenue, color: SOURCE_COLORS[s.category] || "#94A3B8" }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Booking Source Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Where is your revenue actually coming from?</p>
        </div>
        <Button onClick={handleAiBrief} disabled={aiLoading} className="gap-2" data-testid="button-ai-brief">
          <Sparkles className="h-4 w-4" />
          {aiLoading ? "Generating..." : "AI Executive Brief"}
        </Button>
      </div>

      {/* AI Brief output */}
      {aiBrief && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />AI Executive Brief
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{aiBrief}</div>
          </CardContent>
        </Card>
      )}

      {/* Source Dependency Risk Meter */}
      {data.dependencyRisk && (
        <Card className={`border-l-4 ${data.dependencyRisk.level === "high" ? "border-l-red-500 bg-red-50/40 dark:bg-red-950/10" : data.dependencyRisk.level === "moderate" ? "border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/10" : "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10"}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {data.dependencyRisk.level === "high" ? "🔴" : data.dependencyRisk.level === "moderate" ? "🟡" : "🟢"}
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    Source Dependency Risk:&nbsp;
                    <span className={data.dependencyRisk.level === "high" ? "text-red-700" : data.dependencyRisk.level === "moderate" ? "text-amber-700" : "text-emerald-700"}>
                      {data.dependencyRisk.level === "high" ? "High" : data.dependencyRisk.level === "moderate" ? "Moderate" : "Healthy"}
                    </span>
                  </p>
                  {data.dependencyRisk.topSource && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <strong>{data.dependencyRisk.topSource.label}</strong> is your top channel at&nbsp;
                      <strong>{data.dependencyRisk.topSource.share.toFixed(1)}%</strong> of revenue.&nbsp;
                      {data.dependencyRisk.level === "high"
                        ? "High channel concentration — consider diversifying."
                        : data.dependencyRisk.level === "moderate"
                        ? "Moderate concentration — grow secondary channels."
                        : "Good channel diversification."}
                    </p>
                  )}
                </div>
              </div>
              {/* Visual share bars */}
              <div className="flex-1 min-w-[180px] space-y-1.5">
                {sources.slice(0, 4).map((s: any) => (
                  <div key={s.category} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: SOURCE_COLORS[s.category] || "#94A3B8" }} />
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, s.revenueSharePct)}%`, backgroundColor: SOURCE_COLORS[s.category] || "#94A3B8" }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{s.revenueSharePct.toFixed(0)}%</span>
                    <span className="text-xs text-muted-foreground w-20 truncate">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: fmt(totals.revenue), sub: `${fmtN(totals.bookings)} bookings`, icon: <DollarSign className="h-4 w-4" /> },
          { label: "Room Nights", value: fmtN(totals.roomNights), sub: "across all sources", icon: <Bed className="h-4 w-4" /> },
          { label: "Group Revenue", value: fmt(groupStats.revenue || 0), sub: `${groupStats.bookings || 0} group bookings`, icon: <Users className="h-4 w-4" /> },
          { label: "Group Share", value: `${(groupStats.revenueSharePct || 0).toFixed(1)}%`, sub: "of total revenue", icon: <BarChart3 className="h-4 w-4" /> },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold mt-1">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">{k.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Contribution Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Source Contribution Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">Nights</TableHead>
                  <TableHead className="text-xs text-right">ARR</TableHead>
                  <TableHead className="text-xs text-right">Bookings</TableHead>
                  <TableHead className="text-xs text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map(s => (
                  <TableRow key={s.category}>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: SOURCE_COLORS[s.category] || "#94A3B8" }} />
                        <span className="text-xs font-medium">{s.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(s.revenue)}</TableCell>
                    <TableCell className="text-xs text-right">{fmtN(s.roomNights)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹{fmtN(Math.round(s.arr))}</TableCell>
                    <TableCell className="text-xs text-right">{s.bookings}</TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, s.revenueSharePct)}%`, backgroundColor: SOURCE_COLORS[s.category] || "#94A3B8" }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{s.revenueSharePct.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sources.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">No data for this period</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Revenue by Source Pie */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Revenue Mix</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {pieData.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                        <span className="text-muted-foreground truncate max-w-[100px]">{e.name}</span>
                      </div>
                      <span className="font-medium">{fmt(e.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Travel Agents */}
      {topAgents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Top Travel Agents
              {data.dependencyRisk?.top3TAShare > 0 && (
                <Badge variant="outline" className="text-xs ml-auto font-normal">
                  Top 3 = {data.dependencyRisk.top3TAShare.toFixed(0)}% of agent revenue
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Agent Name</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">Nights</TableHead>
                  <TableHead className="text-xs text-right">Bookings</TableHead>
                  <TableHead className="text-xs text-right">ARR</TableHead>
                  <TableHead className="text-xs text-right">Share</TableHead>
                  <TableHead className="text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAgents.map((a, i) => {
                  const isInactive = a.daysSinceLastBooking != null && a.daysSinceLastBooking > 45;
                  const isSlow    = !isInactive && a.daysSinceLastBooking != null && a.daysSinceLastBooking > 30;
                  const isTopVal  = i < 3;
                  return (
                    <TableRow key={a.id} className={isInactive ? "opacity-60" : ""}>
                      <TableCell className="text-xs text-muted-foreground py-2">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium py-2">
                        <div className="flex flex-col gap-0.5">
                          <span>{a.name}</span>
                          {a.lastBookingDate && (
                            <span className="text-[10px] text-muted-foreground">
                              Last: {new Date(a.lastBookingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right py-2 font-mono">{fmt(a.revenue)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{fmtN(a.roomNights)}</TableCell>
                      <TableCell className="text-xs text-right py-2">{a.bookings}</TableCell>
                      <TableCell className="text-xs text-right py-2 font-mono">₹{fmtN(Math.round(a.arr))}</TableCell>
                      <TableCell className="text-xs text-right py-2">
                        <Badge variant="secondary" className="text-xs">{a.revenueSharePct.toFixed(1)}%</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right py-2">
                        {isInactive ? (
                          <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-0">
                            🔴 {a.daysSinceLastBooking}d inactive
                          </Badge>
                        ) : isSlow ? (
                          <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-0">
                            🟡 Slow ({a.daysSinceLastBooking}d)
                          </Badge>
                        ) : isTopVal ? (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0">
                            ⭐ High Value
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Active</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Group Booking Intelligence */}
      {groupStats.bookings > 0 && (
        <Card className="border-pink-200 dark:border-pink-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-pink-600">
              <Users className="h-4 w-4" />Group Booking Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Group Revenue", value: fmt(groupStats.revenue) },
                { label: "Group Room Nights", value: fmtN(groupStats.roomNights) },
                { label: "Group ARR", value: `₹${fmtN(Math.round(groupStats.arr))}` },
                { label: "Revenue Contribution", value: `${(groupStats.revenueSharePct || 0).toFixed(1)}%` },
              ].map(k => (
                <div key={k.label} className="text-center p-3 rounded-lg bg-pink-50 dark:bg-pink-950/20">
                  <p className="text-lg font-bold text-pink-700 dark:text-pink-300">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.substring(0, 7) + "-01";

  const [filters, setFilters] = useState<FilterState>({
    preset: "thisMonth",
    startDate: monthStart,
    endDate: today,
    propertyIds: "",
  });

  const [activeTab, setActiveTab] = useState("executive");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Owner Business Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive analytics for property owners — read-only, separate from operational reports.
          </p>
        </div>
      </div>

      {/* Global Filters */}
      <GlobalFilters filters={filters} onChange={setFilters} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="ceo" className="text-xs" data-testid="tab-ceo">
            🏠 CEO Summary
          </TabsTrigger>
          <TabsTrigger value="executive" className="text-xs" data-testid="tab-executive">
            Executive
          </TabsTrigger>
          <TabsTrigger value="scorecard" className="text-xs" data-testid="tab-scorecard">
            Property Scorecard
          </TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs" data-testid="tab-monthly">
            Monthly Sales
          </TabsTrigger>
          <TabsTrigger value="ota" className="text-xs" data-testid="tab-ota">
            OTA vs Walk-in
          </TabsTrigger>
          <TabsTrigger value="otaplus" className="text-xs" data-testid="tab-otaplus">
            OTA + Commission
          </TabsTrigger>
          <TabsTrigger value="leakage" className="text-xs" data-testid="tab-leakage">
            Revenue Leakage
          </TabsTrigger>
          <TabsTrigger value="snapshot" className="text-xs" data-testid="tab-snapshot">
            Daily Snapshot
          </TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs" data-testid="tab-forecast">
            Forecast Calculator
          </TabsTrigger>
          <TabsTrigger value="targets" className="text-xs" data-testid="tab-targets">
            🎯 Targets
          </TabsTrigger>
          <TabsTrigger value="rooms" className="text-xs" data-testid="tab-rooms">
            🏨 Room Cert.
          </TabsTrigger>
          <TabsTrigger value="opportunity" className="text-xs" data-testid="tab-opportunity">
            💡 Opportunity
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs" data-testid="tab-actions">
            ⚡ Action Center
          </TabsTrigger>
          <TabsTrigger value="source-intel" className="text-xs" data-testid="tab-source-intel">
            <Network className="h-3 w-3 mr-1" />Source Intel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ceo"><CeoSummaryDashboard filters={filters} /></TabsContent>
        <TabsContent value="executive"><ExecutiveDashboard filters={filters} /></TabsContent>
        <TabsContent value="scorecard"><PropertyScorecard filters={filters} /></TabsContent>
        <TabsContent value="monthly"><MonthlySalesDashboard filters={filters} /></TabsContent>
        <TabsContent value="ota"><OtaAnalyticsDashboard filters={filters} /></TabsContent>
        <TabsContent value="otaplus"><OtaPlusCommissionTab filters={filters} /></TabsContent>
        <TabsContent value="leakage"><RevenueLeakageDashboard filters={filters} /></TabsContent>
        <TabsContent value="snapshot"><DailySnapshot filters={filters} /></TabsContent>
        <TabsContent value="forecast"><ForecastCalculator filters={filters} /></TabsContent>
        <TabsContent value="targets"><PropertyTargetsTab filters={filters} /></TabsContent>
        <TabsContent value="rooms"><RoomCertificationTab filters={filters} /></TabsContent>
        <TabsContent value="opportunity"><RevenueOpportunityTab filters={filters} /></TabsContent>
        <TabsContent value="actions"><ActionCenterTab filters={filters} /></TabsContent>
        <TabsContent value="source-intel"><SourceIntelligenceTab filters={filters} /></TabsContent>
      </Tabs>
    </div>
  );
}
