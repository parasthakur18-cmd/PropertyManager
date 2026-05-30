import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Play, Zap, Search,
  Building2, ChevronDown, ChevronUp, Wifi, WifiOff, Activity,
  Clock, DollarSign, Database
} from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RatePlan {
  id: number;
  ratePlanCode: string;
  ratePlanName: string;
  baseRate: string | null;
  occupancy: string | null;
}

interface RoomAuditEntry {
  roomId: number;
  roomNumber: string;
  roomType: string;
  roomCategory: string;
  propertyId: number;
  propertyName: string;
  configId: number | null;
  hotelCode: string | null;
  aiosellConfigured: boolean;
  mapping: {
    id: number;
    aiosellRoomCode: string;
    aiosellRoomId: string | null;
    hostezeeRoomType: string;
  } | null;
  inventoryMappingFound: boolean;
  ratePlans: RatePlan[];
  rateMappingFound: boolean;
  lastInventoryPush: { time: string | null; status: string | null; payload: any; response: any; errorMessage: string | null } | null;
  lastRatePush: { time: string | null; status: string | null; payload: any; response: any; errorMessage: string | null } | null;
  connectionStatus: "fully_connected" | "partially_connected" | "not_connected";
  statusReasons: string[];
}

interface TestResult {
  payload: any;
  response: any;
  success: boolean;
}

interface VerifyResult {
  connectionResult: { success: boolean; message?: string };
  config: any;
  mappings: any[];
  ratePlans: any[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RoomAuditEntry["connectionStatus"] }) {
  if (status === "fully_connected") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 gap-1.5 px-3 py-1">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        🟢 Fully Connected
      </Badge>
    );
  }
  if (status === "partially_connected") {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 gap-1.5 px-3 py-1">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
        🟡 Partially Connected
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 gap-1.5 px-3 py-1">
      <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
      🔴 Not Connected
    </Badge>
  );
}

function PushStatusIcon({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">Never pushed</span>;
  if (status === "success") return <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500 inline" />;
  return <AlertCircle className="w-4 h-4 text-amber-500 inline" />;
}

function YesNo({ yes }: { yes: boolean }) {
  return yes
    ? <span className="text-emerald-600 font-semibold">✅ YES</span>
    : <span className="text-red-500 font-semibold">❌ NO</span>;
}

function Ts({ time }: { time: string | null | undefined }) {
  if (!time) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono text-xs">{format(new Date(time), "dd MMM yyyy HH:mm:ss")}</span>;
}

function JsonBox({ data, label }: { data: any; label: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{label}</p>
      <pre className="text-xs bg-slate-950 text-green-300 rounded-lg p-3 overflow-auto max-h-60 leading-relaxed whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ── Room Card ─────────────────────────────────────────────────────────────────

function RoomCard({
  entry,
  onTestInventory,
  onTestRate,
  onVerify,
}: {
  entry: RoomAuditEntry;
  onTestInventory: (e: RoomAuditEntry) => void;
  onTestRate: (e: RoomAuditEntry, rp: RatePlan) => void;
  onVerify: (e: RoomAuditEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const borderColor =
    entry.connectionStatus === "fully_connected"
      ? "border-l-emerald-500"
      : entry.connectionStatus === "partially_connected"
      ? "border-l-amber-500"
      : "border-l-red-500";

  return (
    <Card className={`border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base">{entry.propertyName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold text-primary">Room {entry.roomNumber}</span>
              <Badge variant="outline" className="text-xs capitalize">{entry.roomType}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>Local ID: <span className="font-mono font-semibold text-foreground">#{entry.roomId}</span></span>
              {entry.mapping?.aiosellRoomId && (
                <span>Aiosell ID: <span className="font-mono font-semibold text-foreground">{entry.mapping.aiosellRoomId}</span></span>
              )}
              {entry.mapping?.aiosellRoomCode && (
                <span>Room Code: <span className="font-mono font-semibold text-foreground">{entry.mapping.aiosellRoomCode}</span></span>
              )}
              {entry.hotelCode && (
                <span>Hotel: <span className="font-mono font-semibold text-foreground">{entry.hotelCode}</span></span>
              )}
            </div>
          </div>
          <StatusBadge status={entry.connectionStatus} />
        </div>

        {/* Status reasons */}
        {entry.statusReasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.statusReasons.map((r, i) => (
              <span key={i} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded px-2 py-0.5 border border-red-200 dark:border-red-800">
                ⚠ {r}
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Quick status grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <Database className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mb-1">Inventory Mapping</p>
            <YesNo yes={entry.inventoryMappingFound} />
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mb-1">Rate Mapping</p>
            <YesNo yes={entry.rateMappingFound} />
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <Activity className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mb-1">Last Inv Push</p>
            <PushStatusIcon status={entry.lastInventoryPush?.status} />
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <Activity className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mb-1">Last Rate Push</p>
            <PushStatusIcon status={entry.lastRatePush?.status} />
          </div>
        </div>

        {/* Expand/collapse details */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          data-testid={`toggle-details-${entry.roomId}`}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide details" : "Show full details"}
        </button>

        {expanded && (
          <div className="space-y-5 border-t pt-4">
            {/* INVENTORY CONNECTION */}
            <Section title="📦 Inventory Connection" icon={<Database className="w-4 h-4" />}>
              <Row label="Inventory Mapping Found"><YesNo yes={entry.inventoryMappingFound} /></Row>
              <Row label="Aiosell Room Code"><Mono>{entry.mapping?.aiosellRoomCode}</Mono></Row>
              <Row label="Aiosell Room ID"><Mono>{entry.mapping?.aiosellRoomId}</Mono></Row>
              <Row label="Last Inventory Push"><Ts time={entry.lastInventoryPush?.time?.toString()} /></Row>
              <Row label="Last Inventory Push Status">
                {entry.lastInventoryPush ? (
                  <span className={`font-semibold text-sm ${entry.lastInventoryPush.status === "success" ? "text-emerald-600" : "text-red-500"}`}>
                    {entry.lastInventoryPush.status?.toUpperCase()}
                  </span>
                ) : <span className="text-muted-foreground text-sm">Never pushed</span>}
              </Row>
              {entry.lastInventoryPush?.errorMessage && (
                <Row label="Error"><span className="text-red-500 text-xs">{entry.lastInventoryPush.errorMessage}</span></Row>
              )}
            </Section>

            {/* RATE CONNECTION */}
            <Section title="💰 Rate Connection" icon={<DollarSign className="w-4 h-4" />}>
              <Row label="Rate Mapping Found"><YesNo yes={entry.rateMappingFound} /></Row>
              {entry.ratePlans.length === 0 ? (
                <Row label="Rate Plans"><span className="text-muted-foreground text-sm">None configured</span></Row>
              ) : entry.ratePlans.map(rp => (
                <div key={rp.id} className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                  <Row label="Rate Plan ID"><Mono>{rp.ratePlanCode}</Mono></Row>
                  <Row label="Rate Plan Name"><span className="font-medium text-sm">{rp.ratePlanName}</span></Row>
                  <Row label="Occupancy"><span className="capitalize text-sm">{rp.occupancy || "—"}</span></Row>
                  <Row label="Base Rate"><span className="font-semibold text-sm">₹{rp.baseRate || "—"}</span></Row>
                </div>
              ))}
              <Row label="Last Rate Push"><Ts time={entry.lastRatePush?.time?.toString()} /></Row>
              <Row label="Last Rate Push Status">
                {entry.lastRatePush ? (
                  <span className={`font-semibold text-sm ${entry.lastRatePush.status === "success" ? "text-emerald-600" : "text-red-500"}`}>
                    {entry.lastRatePush.status?.toUpperCase()}
                  </span>
                ) : <span className="text-muted-foreground text-sm">Never pushed</span>}
              </Row>
              {entry.lastRatePush?.errorMessage && (
                <Row label="Error"><span className="text-red-500 text-xs">{entry.lastRatePush.errorMessage}</span></Row>
              )}
            </Section>

            {/* CHANNEL MAPPINGS */}
            <Section title="🌐 Channel Mappings" icon={<Wifi className="w-4 h-4" />}>
              <p className="text-xs text-muted-foreground mb-3">
                OTA channel IDs (Booking.com, Hostelworld, etc.) are configured directly in the Aiosell dashboard.
                Hostezee sends inventory and rates via Aiosell Room Code — Aiosell distributes to all connected OTAs.
              </p>
              <Row label="Aiosell Room Code (all OTAs)"><Mono>{entry.mapping?.aiosellRoomCode}</Mono></Row>
              <Row label="Aiosell Room ID"><Mono>{entry.mapping?.aiosellRoomId}</Mono></Row>
              {entry.ratePlans.map(rp => (
                <Row key={rp.id} label={`Rate Plan: ${rp.ratePlanName}`}><Mono>{rp.ratePlanCode}</Mono></Row>
              ))}
            </Section>

            {/* Last push payloads */}
            {entry.lastInventoryPush?.payload && (
              <Section title="📤 Last Inventory Push Details" icon={<Clock className="w-4 h-4" />}>
                <JsonBox data={entry.lastInventoryPush.payload} label="Payload Sent" />
                {entry.lastInventoryPush.response && (
                  <JsonBox data={entry.lastInventoryPush.response} label="Aiosell Response" />
                )}
              </Section>
            )}

            {entry.lastRatePush?.payload && (
              <Section title="📤 Last Rate Push Details" icon={<Clock className="w-4 h-4" />}>
                <JsonBox data={entry.lastRatePush.payload} label="Payload Sent" />
                {entry.lastRatePush.response && (
                  <JsonBox data={entry.lastRatePush.response} label="Aiosell Response" />
                )}
              </Section>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1 border-t">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            disabled={!entry.inventoryMappingFound}
            onClick={() => onTestInventory(entry)}
            data-testid={`btn-test-inventory-${entry.roomId}`}
          >
            <Play className="w-3.5 h-3.5" />
            Test Inventory Push
          </Button>

          {entry.ratePlans.length > 0 ? (
            entry.ratePlans.map(rp => (
              <Button
                key={rp.id}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => onTestRate(entry, rp)}
                data-testid={`btn-test-rate-${entry.roomId}-${rp.id}`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Test Rate: {rp.ratePlanName}
              </Button>
            ))
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled>
              <DollarSign className="w-3.5 h-3.5" />
              Test Rate Push
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            disabled={!entry.aiosellConfigured}
            onClick={() => onVerify(entry)}
            data-testid={`btn-verify-${entry.roomId}`}
          >
            <Search className="w-3.5 h-3.5" />
            Verify Mapping
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-1.5">{icon}{title}</h4>
      <div className="space-y-1.5 pl-1">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0 min-w-[160px]">{label}</span>
      <span className="text-right">{children ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

function Mono({ children }: { children?: string | null }) {
  if (!children) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{children}</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConnectivityAudit() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<"all" | RoomAuditEntry["connectionStatus"]>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [testResult, setTestResult] = useState<{ title: string; data: TestResult | VerifyResult } | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const { data: entries = [], isLoading, refetch, isFetching } = useQuery<RoomAuditEntry[]>({
    queryKey: ["/api/aiosell/connectivity-audit"],
    refetchOnWindowFocus: false,
  });

  // Derive filter options
  const properties = Array.from(new Map(entries.map(e => [e.propertyId, e.propertyName])).entries());
  const counts = {
    all: entries.length,
    fully_connected: entries.filter(e => e.connectionStatus === "fully_connected").length,
    partially_connected: entries.filter(e => e.connectionStatus === "partially_connected").length,
    not_connected: entries.filter(e => e.connectionStatus === "not_connected").length,
  };

  const filtered = entries.filter(e => {
    if (filterStatus !== "all" && e.connectionStatus !== filterStatus) return false;
    if (filterProperty !== "all" && String(e.propertyId) !== filterProperty) return false;
    return true;
  });

  // ── Actions ──

  async function handleTestInventory(entry: RoomAuditEntry) {
    if (!entry.mapping) return;
    const key = `inv-${entry.roomId}`;
    setLoadingAction(key);
    try {
      const res = await apiRequest("/api/aiosell/connectivity-audit/test-inventory", "POST", {
        propertyId: entry.propertyId,
        mappingId: entry.mapping.id,
      });
      const data = await res.json();
      setTestResult({ title: `Inventory Push — Room ${entry.roomNumber} (${entry.propertyName})`, data });
      if (data.success) toast({ title: "✅ Inventory push succeeded" });
      else toast({ title: "❌ Inventory push failed", description: data.response?.message || "See details below", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
      refetch();
    }
  }

  async function handleTestRate(entry: RoomAuditEntry, rp: RatePlan) {
    if (!entry.mapping) return;
    const key = `rate-${entry.roomId}-${rp.id}`;
    setLoadingAction(key);
    try {
      const res = await apiRequest("/api/aiosell/connectivity-audit/test-rate", "POST", {
        propertyId: entry.propertyId,
        mappingId: entry.mapping.id,
        ratePlanId: rp.id,
      });
      const data = await res.json();
      setTestResult({ title: `Rate Push — ${rp.ratePlanName} · Room ${entry.roomNumber} (${entry.propertyName})`, data });
      if (data.success) toast({ title: "✅ Rate push succeeded" });
      else toast({ title: "❌ Rate push failed", description: data.response?.message || "See details below", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
      refetch();
    }
  }

  async function handleVerify(entry: RoomAuditEntry) {
    const key = `verify-${entry.propertyId}`;
    setLoadingAction(key);
    try {
      const res = await apiRequest("/api/aiosell/connectivity-audit/verify-mapping", "POST", {
        propertyId: entry.propertyId,
      });
      const data = await res.json();
      setTestResult({ title: `Verify Mapping — ${entry.propertyName}`, data });
      if (data.connectionResult?.success) toast({ title: "✅ Aiosell connection verified" });
      else toast({ title: "⚠️ Connection issue", description: data.connectionResult?.message, variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  }

  // ── Render ──

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wifi className="w-6 h-6 text-primary" />
            Connectivity Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Settings → Channel Manager → Connectivity Audit &nbsp;·&nbsp; Real-time Aiosell connection health for every room
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          className="gap-2"
          data-testid="btn-refresh-audit"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Rooms", count: counts.all, icon: <Building2 className="w-5 h-5" />, color: "text-foreground", bg: "bg-muted/40" },
          { label: "🟢 Fully Connected", count: counts.fully_connected, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
          { label: "🟡 Partial", count: counts.partially_connected, icon: <AlertCircle className="w-5 h-5" />, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10" },
          { label: "🔴 Not Connected", count: counts.not_connected, icon: <WifiOff className="w-5 h-5" />, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/10" },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-4 flex items-center gap-3`}>
            <span className={item.color}>{item.icon}</span>
            <div>
              <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
              <p className="text-xs text-muted-foreground leading-tight">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="w-52" data-testid="filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses ({counts.all})</SelectItem>
            <SelectItem value="fully_connected">🟢 Fully Connected ({counts.fully_connected})</SelectItem>
            <SelectItem value="partially_connected">🟡 Partial ({counts.partially_connected})</SelectItem>
            <SelectItem value="not_connected">🔴 Not Connected ({counts.not_connected})</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-60" data-testid="filter-property">
            <SelectValue placeholder="Filter by property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map(([id, name]) => (
              <SelectItem key={id} value={String(id)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterStatus !== "all" || filterProperty !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterProperty("all"); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p>Loading connectivity data…</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No rooms match the current filters</p>
          <p className="text-sm mt-1">Try changing the status or property filter</p>
        </div>
      )}

      {/* Room cards */}
      <div className="space-y-4">
        {filtered.map(entry => (
          <RoomCard
            key={entry.roomId}
            entry={entry}
            onTestInventory={handleTestInventory}
            onTestRate={handleTestRate}
            onVerify={handleVerify}
          />
        ))}
      </div>

      {/* Test Result Dialog */}
      <Dialog open={!!testResult} onOpenChange={open => !open && setTestResult(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              {testResult?.title}
            </DialogTitle>
          </DialogHeader>

          {testResult && (() => {
            const d = testResult.data as any;
            // Test result (inventory or rate)
            if ("payload" in d && "response" in d) {
              return (
                <div className="space-y-4">
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${d.success ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}>
                    {d.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span className="font-semibold">{d.success ? "SUCCESS — Aiosell accepted the request" : "FAILED — Aiosell rejected the request"}</span>
                  </div>
                  {d.response?.message && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <span className="font-semibold">Aiosell Message: </span>{d.response.message}
                    </div>
                  )}
                  <JsonBox data={d.payload} label="Payload Sent to Aiosell" />
                  <JsonBox data={d.response} label="Exact Aiosell Response" />
                </div>
              );
            }
            // Verify result
            const v = d as VerifyResult;
            return (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 p-3 rounded-lg ${v.connectionResult.success ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}>
                  {v.connectionResult.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="font-semibold">{v.connectionResult.success ? "Connection OK" : "Connection Failed"}</span>
                  {v.connectionResult.message && <span className="text-sm opacity-80">— {v.connectionResult.message}</span>}
                </div>
                <JsonBox data={v.config} label="Aiosell Configuration" />
                <JsonBox data={v.mappings} label="Room Mappings" />
                <JsonBox data={v.ratePlans} label="Rate Plans" />
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
