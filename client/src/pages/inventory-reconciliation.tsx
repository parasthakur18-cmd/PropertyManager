import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, Zap, Activity,
  Building2, Calendar, Scale, Loader2, Info, WifiOff,
  RotateCcw,
} from "lucide-react";
import { format, parseISO } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DayData {
  date: string;
  hostezeeAvailable: number;
  lastPushedAvailable: number | null;
  mismatch: boolean;
  neverPushed: boolean;
  booked: number;
  total: number;
  stopSell: boolean;
  pushTime: string | null;
}

interface RoomType {
  roomCode: string;
  aiosellRoomId: string | null;
  hostezeeRoomType: string;
  mappingId: number;
  totalRooms: number;
  isDormitory: boolean;
  ratePlans: { id: number; code: string; name: string }[];
  healthStatus: "synced" | "mismatch" | "never_pushed";
  mismatches: number;
  neverPushed: number;
  days: DayData[];
}

interface ReconciliationData {
  dates: string[];
  propertyId: number;
  hotelCode: string;
  lastSync: { time: string | null; status: string | null; errorMessage: string | null; hasFailedRecently: boolean };
  summary: { total: number; synced: number; mismatches: number; neverPushed: number; totalCellMismatches: number };
  roomTypes: RoomType[];
}

interface PropertyBasic { id: number; name: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM HH:mm"); } catch { return d; }
}

function fmtDate(d: string) {
  try { return format(parseISO(d), "dd MMM"); } catch { return d; }
}

function fmtDateFull(d: string) {
  try { return format(parseISO(d), "EEE, dd MMM yyyy"); } catch { return d; }
}

function CellBadge({ day, compact }: { day: DayData; compact?: boolean }) {
  const size = compact ? "text-[10px] px-1 py-0.5" : "text-xs px-1.5 py-1";

  if (day.stopSell) {
    return <span className={`inline-flex items-center justify-center rounded font-mono font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ${size}`} title="Stop-sell restriction active">🚫 0</span>;
  }
  if (day.neverPushed) {
    return <span className={`inline-flex items-center justify-center rounded font-mono font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ${size}`} title={`Hostezee: ${day.hostezeeAvailable} — never pushed to Aiosell`}>
      ⏳ {day.hostezeeAvailable}
    </span>;
  }
  if (day.mismatch) {
    return <span className={`inline-flex flex-col items-center justify-center rounded font-mono font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ${size} min-w-[40px]`}
      title={`Hostezee: ${day.hostezeeAvailable} | Aiosell last pushed: ${day.lastPushedAvailable} — MISMATCH`}>
      H:{day.hostezeeAvailable}<span className="opacity-70 text-[9px]">A:{day.lastPushedAvailable}</span>
    </span>;
  }
  return <span className={`inline-flex items-center justify-center rounded font-mono font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ${size}`}
    title={`Hostezee: ${day.hostezeeAvailable} — Aiosell in sync ✓`}>
    ✓ {day.hostezeeAvailable}
  </span>;
}

function HealthBadge({ status, mismatches }: { status: RoomType["healthStatus"]; mismatches: number }) {
  if (status === "synced") return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 text-xs">🟢 Synced</Badge>;
  if (status === "never_pushed") return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 text-xs">⏳ Never Pushed</Badge>;
  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 text-xs">🔴 {mismatches} Mismatch{mismatches !== 1 ? "es" : ""}</Badge>;
}

// ── Mismatch Detail Row ───────────────────────────────────────────────────────

function MismatchList({ roomTypes, onSyncNow }: { roomTypes: RoomType[]; onSyncNow: () => void }) {
  const mismatched = roomTypes.flatMap(rt =>
    rt.days.filter(d => d.mismatch || d.neverPushed).map(d => ({ rt, d }))
  );
  if (mismatched.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Inventory Mismatches ({mismatched.length} date{mismatched.length !== 1 ? "s" : ""})
      </h3>
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Room Type</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">Hostezee</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">Aiosell (last pushed)</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">OTAs (via Aiosell)</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">Difference</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Last Push</th>
              <th className="text-center py-2 px-3 font-medium text-muted-foreground">Issue</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mismatched.slice(0, 50).map(({ rt, d }, i) => {
              const diff = d.neverPushed ? null : d.hostezeeAvailable - (d.lastPushedAvailable ?? 0);
              const critical = diff !== null && Math.abs(diff) > 1;
              return (
                <tr key={`${rt.roomCode}-${d.date}-${i}`} className={critical ? "bg-red-50 dark:bg-red-900/10" : "bg-amber-50/50 dark:bg-amber-900/10"}>
                  <td className="py-2 px-3">
                    <span className="font-medium">{rt.hostezeeRoomType}</span>
                    <span className="block text-xs text-muted-foreground">{rt.roomCode}</span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">{fmtDateFull(d.date)}</td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{d.hostezeeAvailable}</td>
                  <td className="py-2 px-3 text-center font-mono">
                    {d.neverPushed ? <span className="text-muted-foreground italic text-xs">Never pushed</span> : <span className={d.mismatch ? "text-red-600 font-bold" : "text-emerald-600"}>{d.lastPushedAvailable}</span>}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {d.neverPushed ? <Badge variant="outline" className="text-xs text-amber-600">Unknown</Badge> : d.mismatch ? <Badge variant="outline" className="text-xs text-red-600">Stale</Badge> : <Badge variant="outline" className="text-xs text-emerald-600">Synced</Badge>}
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {diff === null ? <span className="text-amber-600">—</span> : <span className={Math.abs(diff) > 1 ? "text-red-600 font-bold" : "text-amber-600"}>{diff > 0 ? `+${diff}` : diff}</span>}
                  </td>
                  <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(d.pushTime)}</td>
                  <td className="py-2 px-3 text-center">
                    {d.neverPushed
                      ? <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200">Never Synced</Badge>
                      : critical
                        ? <Badge className="text-xs bg-red-100 text-red-800 border-red-200">🔴 Critical</Badge>
                        : <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200">🟡 Warning</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {mismatched.length > 50 && (
          <div className="bg-muted/40 text-center py-2 text-xs text-muted-foreground">Showing 50 of {mismatched.length} mismatches. Use "Sync All" to repair all at once.</div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span><strong>Booking.com, MMT, Hostelworld</strong> and other OTAs receive inventory from <strong>Aiosell</strong>. If the Aiosell value is wrong, clicking <strong>Sync Now</strong> will push the correct Hostezee inventory to Aiosell, which then distributes it to all connected OTAs within minutes.</span>
      </div>
    </div>
  );
}

// ── Room Row in Matrix ────────────────────────────────────────────────────────

function RoomRow({ rt, dates, visibleDates }: { rt: RoomType; dates: string[]; visibleDates: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const dayMap = Object.fromEntries(rt.days.map(d => [d.date, d]));

  return (
    <>
      <tr className="border-b hover:bg-muted/20 transition-colors">
        <td className="py-2 px-3 min-w-[180px] sticky left-0 z-10 bg-background border-r">
          <div>
            <span className="font-medium text-sm">{rt.hostezeeRoomType}</span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <HealthBadge status={rt.healthStatus} mismatches={rt.mismatches} />
            </div>
            <span className="text-xs text-muted-foreground block mt-0.5">{rt.roomCode}{rt.aiosellRoomId ? ` · ID: ${rt.aiosellRoomId}` : ""}</span>
          </div>
        </td>
        {visibleDates.map(date => {
          const d = dayMap[date];
          if (!d) return <td key={date} className="px-1 py-2 text-center"><span className="text-muted-foreground text-xs">—</span></td>;
          return <td key={date} className="px-1 py-2 text-center"><CellBadge day={d} compact /></td>;
        })}
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/10">
          <td colSpan={visibleDates.length + 1} className="px-3 py-3">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div><span className="text-muted-foreground">Total Rooms</span><p className="font-semibold">{rt.totalRooms}</p></div>
              <div><span className="text-muted-foreground">Type</span><p className="font-semibold">{rt.isDormitory ? "Dormitory (beds)" : "Standard"}</p></div>
              <div><span className="text-muted-foreground">Mismatches</span><p className="font-semibold text-red-600">{rt.mismatches}</p></div>
              <div><span className="text-muted-foreground">Never Pushed</span><p className="font-semibold text-amber-600">{rt.neverPushed} days</p></div>
              <div><span className="text-muted-foreground">Rate Plans</span><p className="font-semibold">{rt.ratePlans.length > 0 ? rt.ratePlans.map(r => r.name).join(", ") : "None"}</p></div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryReconciliation() {
  const { toast } = useToast();

  const { data: properties = [] } = useQuery<PropertyBasic[]>({ queryKey: ["/api/properties"] });
  const aiosellProperties = properties.filter(p => (p as any).aiosellEnabled !== false);

  const today = new Date().toISOString().split("T")[0];
  const plus30 = new Date(); plus30.setDate(plus30.getDate() + 29);
  const plus30Str = plus30.toISOString().split("T")[0];

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(plus30Str);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dateWindowStart, setDateWindowStart] = useState(0);
  const WINDOW = 14; // show 14 dates at a time

  const propId = selectedPropertyId ? parseInt(selectedPropertyId) : properties[0]?.id;

  const { data, isLoading, isFetching, refetch } = useQuery<ReconciliationData>({
    queryKey: ["/api/aiosell/inventory-reconciliation", propId, fromDate, toDate],
    queryFn: async () => {
      if (!propId) throw new Error("No property selected");
      const r = await apiRequest(`/api/aiosell/inventory-reconciliation?propertyId=${propId}&from=${fromDate}&to=${toDate}`, "GET");
      return r.json();
    },
    enabled: !!propId,
  });

  // Set first property when data loads
  if (!selectedPropertyId && properties.length > 0 && !propId) {
    setSelectedPropertyId(String(properties[0].id));
  }

  const visibleDates = (data?.dates ?? []).slice(dateWindowStart, dateWindowStart + WINDOW);

  async function syncNow() {
    if (!propId) return;
    setSyncing(true);
    setLastSyncResult(null);
    try {
      const res = await apiRequest("/api/aiosell/inventory-reconciliation/sync-now", "POST", { propertyId: propId });
      const d = await res.json();
      setLastSyncResult({ success: d.success, message: d.success ? `✅ Sync succeeded at ${fmt(d.syncedAt)}` : `❌ Sync failed: ${d.errorMessage || "Unknown error"}` });
      toast({ title: d.success ? "✅ Inventory synced to Aiosell" : "❌ Sync failed", description: d.success ? "All room types pushed for the next 90 days." : d.errorMessage, variant: d.success ? "default" : "destructive" });
      if (d.success) refetch();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
      setLastSyncResult({ success: false, message: `❌ ${err.message}` });
    } finally { setSyncing(false); }
  }

  const s = data?.summary;
  const ls = data?.lastSync;

  return (
    <div className="container mx-auto px-4 py-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />Inventory Reconciliation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare Hostezee availability vs Aiosell last push — detect and repair inventory mismatches that affect Booking.com, MMT, and all OTAs
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button onClick={syncNow} disabled={syncing || !propId} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" data-testid="btn-sync-now">
            {syncing ? <><Loader2 className="w-4 h-4 animate-spin" />Syncing…</> : <><Zap className="w-4 h-4" />Sync Now</>}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div className="w-60">
          <Label className="text-xs text-muted-foreground mb-1 block">Property</Label>
          <Select value={selectedPropertyId || String(properties[0]?.id || "")} onValueChange={setSelectedPropertyId}>
            <SelectTrigger data-testid="select-property"><SelectValue placeholder="Select property…" /></SelectTrigger>
            <SelectContent>{properties.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
          <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setDateWindowStart(0); }} className="w-40" data-testid="input-from-date" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
          <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setDateWindowStart(0); }} className="w-40" data-testid="input-to-date" />
        </div>
        <div className="flex gap-2">
          {[7, 14, 30, 60].map(d => {
            const t = new Date(); t.setDate(t.getDate() + d - 1);
            return <Button key={d} variant="outline" size="sm" className="text-xs" onClick={() => { setFromDate(today); setToDate(t.toISOString().split("T")[0]); setDateWindowStart(0); }}>{d}d</Button>;
          })}
        </div>
      </div>

      {/* Last sync status bar */}
      {ls && (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-2.5 mb-5 text-sm flex-wrap ${ls.hasFailedRecently ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" : ls.status === "success" ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" : "bg-muted border"}`}>
          {ls.status === "success" && !ls.hasFailedRecently ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : ls.hasFailedRecently ? <XCircle className="w-4 h-4 text-red-600 shrink-0" /> : <Activity className="w-4 h-4 text-muted-foreground shrink-0" />}
          <span className="flex-1">
            {ls.time ? <>Last sync: <strong>{fmt(ls.time)}</strong> — <span className={ls.hasFailedRecently ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>{ls.status?.toUpperCase()}</span></> : "No inventory push found for this property yet."}
            {ls.errorMessage && <span className="text-red-600"> · {ls.errorMessage}</span>}
          </span>
          {lastSyncResult && (
            <span className={`font-medium ${lastSyncResult.success ? "text-emerald-700" : "text-red-700"}`}>{lastSyncResult.message}</span>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={syncNow} disabled={syncing}>
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Room Types", value: s.total, icon: <Building2 className="w-4 h-4" />, color: "text-foreground", bg: "bg-muted/40" },
            { label: "🟢 Fully Synced", value: s.synced, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
            { label: "🔴 Room Mismatches", value: s.mismatches, icon: <XCircle className="w-4 h-4" />, color: "text-red-600", bg: s.mismatches > 0 ? "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800" : "bg-muted/40" },
            { label: "⏳ Never Pushed", value: s.neverPushed, icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-600", bg: s.neverPushed > 0 ? "bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800" : "bg-muted/40" },
            { label: "⚠️ Date Mismatches", value: s.totalCellMismatches, icon: <Calendar className="w-4 h-4" />, color: "text-orange-600", bg: s.totalCellMismatches > 0 ? "bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800" : "bg-muted/40" },
          ].map(item => (
            <div key={item.label} className={`${item.bg} rounded-xl p-3 flex items-center gap-2.5`}>
              <span className={item.color}>{item.icon}</span>
              <div><p className={`text-xl font-bold leading-none ${item.color}`}>{item.value}</p><p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.label}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* OTA Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5 mb-5 flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>How OTA inventory works:</strong> Hostezee calculates availability → pushes to Aiosell → Aiosell distributes to Booking.com, MMT, Hostelworld, and all connected OTAs. The matrix below compares Hostezee's current calculation vs what was last pushed to Aiosell. If they differ, click <strong>Sync Now</strong> to push the correct inventory.</span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" /><p>Loading reconciliation data…</p>
        </div>
      )}

      {!isLoading && !data && (
        <div className="text-center py-16 text-muted-foreground">
          <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No Aiosell configuration found for this property</p>
          <p className="text-sm mt-1">Go to Channel Manager → Settings to configure Aiosell</p>
        </div>
      )}

      {/* Matrix */}
      {data && (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-3 flex-wrap text-xs">
            <span className="font-medium text-muted-foreground">Legend:</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-emerald-200" />Synced</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-red-200" />Mismatch (H=Hostezee, A=Aiosell)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-amber-200" />Never Pushed</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-slate-200" />Stop-Sell</span>
          </div>

          {/* Date window nav */}
          {data.dates.length > WINDOW && (
            <div className="flex items-center gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={() => setDateWindowStart(Math.max(0, dateWindowStart - WINDOW))} disabled={dateWindowStart === 0} className="text-xs h-7">← Prev {WINDOW}d</Button>
              <span className="text-xs text-muted-foreground">Showing {fmtDate(visibleDates[0] || "")} – {fmtDate(visibleDates[visibleDates.length - 1] || "")}</span>
              <Button size="sm" variant="outline" onClick={() => setDateWindowStart(Math.min(data.dates.length - WINDOW, dateWindowStart + WINDOW))} disabled={dateWindowStart + WINDOW >= data.dates.length} className="text-xs h-7">Next {WINDOW}d →</Button>
            </div>
          )}

          {/* Scrollable Matrix */}
          <div className="rounded-xl border overflow-x-auto">
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr className="bg-muted/60">
                  <th className="text-left py-2 px-3 font-semibold sticky left-0 z-10 bg-muted/60 border-r min-w-[180px]">Room Type</th>
                  {visibleDates.map(date => {
                    const isToday = date === today;
                    const dow = format(parseISO(date), "EEE");
                    const isWeekend = dow === "Sat" || dow === "Sun";
                    return (
                      <th key={date} className={`text-center py-1.5 px-1 font-medium min-w-[52px] ${isToday ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : isWeekend ? "bg-amber-50 dark:bg-amber-900/10" : ""}`}>
                        <span className="block text-[9px] text-muted-foreground">{dow}</span>
                        <span>{format(parseISO(date), "dd")}</span>
                        <span className="block text-[9px] text-muted-foreground">{format(parseISO(date), "MMM")}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.roomTypes.map(rt => (
                  <RoomRow key={rt.roomCode} rt={rt} dates={data.dates} visibleDates={visibleDates} />
                ))}
                {data.roomTypes.length === 0 && (
                  <tr><td colSpan={WINDOW + 1} className="text-center py-10 text-muted-foreground">No room mappings found for this property. Configure them in Channel Manager → Room Mapping.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bulk Actions */}
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <Button onClick={syncNow} disabled={syncing} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              {syncing ? <><Loader2 className="w-4 h-4 animate-spin" />Syncing all rooms…</> : <><Zap className="w-4 h-4" />Sync All Rooms (Next 90 Days)</>}
            </Button>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />Recalculate
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" />
              Sync Now pushes inventory for all mapped rooms for the next 90 days to Aiosell. Aiosell then distributes to all OTAs.
            </div>
          </div>

          {/* Mismatch Details Table */}
          <MismatchList roomTypes={data.roomTypes} onSyncNow={syncNow} />

          {/* Health Legend */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: "🟢", title: "Fully Synced", desc: "Hostezee availability matches what was last pushed to Aiosell. OTAs are showing the correct inventory.", color: "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10" },
              { icon: "🟡", title: "Warning / Mismatch", desc: "Hostezee shows different availability than what was last pushed. A booking may have occurred after the last sync, or the push may have been skipped.", color: "border-amber-200 bg-amber-50 dark:bg-amber-900/10" },
              { icon: "🔴", title: "Critical", desc: "Inventory difference is greater than 1, or the last push failed. OTAs may be showing wrong availability — Sync Now immediately.", color: "border-red-200 bg-red-50 dark:bg-red-900/10" },
            ].map(h => (
              <div key={h.title} className={`rounded-xl border p-4 ${h.color}`}>
                <p className="font-semibold text-sm mb-1">{h.icon} {h.title}</p>
                <p className="text-xs text-muted-foreground">{h.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
