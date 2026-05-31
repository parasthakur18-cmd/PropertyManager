import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Property } from "@shared/schema";
import { AlertCircle, CheckCircle, Trash2, Plus, RefreshCw, Settings, Link2, ArrowUpDown, Calendar, Activity, Loader2, Wifi, WifiOff, Hotel, DollarSign, TestTube2, Download, ChevronDown, ChevronLeft, ChevronRight, IndianRupee, MessageSquare, Send, Phone, ShieldCheck, ChevronUp, FileDown, BrainCircuit, Sparkles, Copy, Package, BarChart2, Scale, XCircle, Bot, Zap, BadgeCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AiosellConfig {
  id: number;
  propertyId: number;
  hotelCode: string;
  pmsName: string;
  hasPassword: boolean;
  apiBaseUrl: string;
  isActive: boolean;
  isSandbox: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RoomMapping {
  id: number;
  configId: number;
  propertyId: number;
  hostezeeRoomType: string;
  aiosellRoomCode: string;
  aiosellRoomId: string | null;
  createdAt: string;
}

interface RatePlan {
  id: number;
  configId: number;
  propertyId: number;
  roomMappingId: number;
  ratePlanName: string;
  ratePlanCode: string;
  baseRate: string | null;
  occupancy: string;
  createdAt: string;
}

// ── Audit types ──────────────────────────────────────────────────────────────
interface AuditCheckType {
  label: string;
  value: string | number | boolean | null;
  status: "pass" | "warn" | "fail" | "info";
  detail: string;
}

interface AuditSectionType {
  name: string;
  key: string;
  status: "healthy" | "attention" | "critical";
  score: number;
  maxScore: number;
  checks: AuditCheckType[];
}

interface AuditReportType {
  id?: number;
  propertyId: number;
  propertyName: string;
  hotelCode: string | null;
  generatedAt: string;
  durationMs: number;
  healthScore: number;
  overallStatus: "healthy" | "attention" | "critical";
  sections: AuditSectionType[];
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
}

interface StoredAuditRow {
  id: number;
  propertyId: number;
  healthScore: number;
  overallStatus: string;
  createdAt: string;
  reportData: AuditReportType;
}

// ── Audit helpers ─────────────────────────────────────────────────────────────
function statusColor(status: AuditSectionType["status"] | string) {
  if (status === "healthy") return "text-emerald-600 dark:text-emerald-400";
  if (status === "attention") return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function statusBg(status: AuditSectionType["status"] | string) {
  if (status === "healthy") return "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800";
  if (status === "attention") return "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800";
  return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
}

function checkStatusIcon(status: AuditCheckType["status"]) {
  if (status === "pass") return <span className="text-emerald-500">✅</span>;
  if (status === "warn") return <span className="text-amber-500">⚠️</span>;
  if (status === "fail") return <span className="text-red-500">❌</span>;
  return <span className="text-muted-foreground">ℹ️</span>;
}

const SECTION_EMOJI: Record<string, string> = {
  configuration: "⚙️",
  roomMapping: "🔗",
  inventorySync: "📦",
  ratePlans: "💰",
  syncLogs: "📋",
  otaStatus: "🌐",
};

// ── Health Score Ring (SVG) ───────────────────────────────────────────────────
function HealthRing({ score, status }: { score: number; status: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const stroke = status === "healthy" ? "#10b981" : status === "attention" ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg width={110} height={110} className="-rotate-90">
        <circle cx={55} cy={55} r={r} fill="none" stroke="currentColor" strokeWidth={10}
          className="text-muted-foreground/20" />
        <circle cx={55} cy={55} r={r} fill="none" stroke={stroke} strokeWidth={10}
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${statusColor(status)}`}>{score}%</span>
        <span className="text-[10px] text-muted-foreground capitalize font-medium">{status}</span>
      </div>
    </div>
  );
}

// ── Audit Section Card ────────────────────────────────────────────────────────
function AuditSectionCard({ section }: { section: AuditSectionType }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-lg overflow-hidden ${statusBg(section.status)}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{SECTION_EMOJI[section.key] || "🔧"}</span>
          <span className="font-medium text-sm truncate">{section.name}</span>
          <Badge variant="outline" className={`text-xs shrink-0 ${statusColor(section.status)} border-current`}>
            {section.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-xs text-muted-foreground">{section.score}/{section.maxScore}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-current/10 divide-y divide-current/10">
          {section.checks.map((c, i) => (
            <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm bg-background/60">
              <span className="mt-0.5 shrink-0">{checkStatusIcon(c.status)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.label}</span>
                  {c.value !== null && c.value !== undefined && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {String(c.value)}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Audit Report Modal ────────────────────────────────────────────────────────
function AuditReportModal({
  report,
  open,
  onClose,
  propertyId,
}: {
  report: AuditReportType | null;
  open: boolean;
  onClose: () => void;
  propertyId: number;
}) {
  const { data: history = [] } = useQuery<StoredAuditRow[]>({
    queryKey: ["/api/aiosell/audit/history", propertyId],
    queryFn: async () => {
      const r = await fetch(`/api/aiosell/audit/history?propertyId=${propertyId}`, { credentials: "include" });
      return r.json();
    },
    enabled: open && !!propertyId,
    staleTime: 30000,
  });

  function exportJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aiosell-audit-${report.propertyName.replace(/\s+/g, "-").toLowerCase()}-${new Date(report.generatedAt).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!report) return null;

  const hasCritical = report.criticalIssues.length > 0;
  const hasWarnings = report.warnings.length > 0;
  const hasRecs = report.recommendations.length > 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl w-full p-0" data-testid="dialog-audit-report">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                Property Health Report
              </DialogTitle>
              <DialogDescription className="mt-1">
                {report.propertyName}
                {report.hotelCode ? ` · Hotel code: ${report.hotelCode}` : ""}
              </DialogDescription>
            </div>
            <div className="shrink-0">
              <HealthRing score={report.healthScore} status={report.overallStatus} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-muted-foreground">
              Generated {new Date(report.generatedAt).toLocaleString()} · {report.durationMs}ms
            </span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={exportJson} data-testid="button-export-audit">
              <FileDown className="h-3.5 w-3.5 mr-1.5" />Export JSON
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="px-6 py-4 space-y-4">

            {/* Score overview strip */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {report.sections.map(sec => (
                <div key={sec.key}
                  className={`rounded-lg border px-2 py-2 text-center ${statusBg(sec.status)}`}>
                  <div className="text-base">{SECTION_EMOJI[sec.key] || "🔧"}</div>
                  <div className={`text-xs font-semibold ${statusColor(sec.status)}`}>
                    {sec.score}/{sec.maxScore}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                    {sec.name.split(" ")[0]}
                  </div>
                </div>
              ))}
            </div>

            {/* Critical issues */}
            {hasCritical && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  {report.criticalIssues.length} Critical Issue{report.criticalIssues.length !== 1 ? "s" : ""}
                </p>
                <ul className="space-y-1">
                  {report.criticalIssues.map((issue, i) => (
                    <li key={i} className="text-sm text-red-800 dark:text-red-300 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">•</span>{issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {hasWarnings && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  {report.warnings.length} Warning{report.warnings.length !== 1 ? "s" : ""}
                </p>
                <ul className="space-y-1">
                  {report.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">•</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {hasRecs && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 mb-2">
                  💡 {report.recommendations.length} Recommendation{report.recommendations.length !== 1 ? "s" : ""}
                </p>
                <ul className="space-y-1">
                  {report.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">•</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!hasCritical && !hasWarnings && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 p-4 text-center">
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  ✅ No critical issues or warnings — property is healthy!
                </p>
              </div>
            )}

            {/* Section details */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Section Details</p>
              <div className="space-y-2">
                {report.sections.map(sec => (
                  <AuditSectionCard key={sec.key} section={sec} />
                ))}
              </div>
            </div>

            {/* History */}
            {history.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Past Audits</p>
                <div className="flex flex-wrap gap-2">
                  {history.slice(0, 6).map(row => (
                    <div key={row.id}
                      className={`rounded border px-2.5 py-1.5 text-xs flex flex-col items-center ${statusBg(row.overallStatus)}`}>
                      <span className={`font-bold text-sm ${statusColor(row.overallStatus)}`}>{row.healthScore}%</span>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Verify Property Button ────────────────────────────────────────────────────
function VerifyPropertyButton({ propertyId, propertyName }: { propertyId: number; propertyName?: string }) {
  const { toast } = useToast();
  const [report, setReport] = useState<AuditReportType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/aiosell/audit", "POST", { propertyId });
      return res.json() as Promise<AuditReportType>;
    },
    onSuccess: (data) => {
      setReport(data);
      setModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/audit/history", propertyId] });
    },
    onError: (err: any) => {
      toast({ title: "Audit failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => auditMutation.mutate()}
        disabled={auditMutation.isPending}
        data-testid="button-verify-property"
        className="gap-1.5"
      >
        {auditMutation.isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Auditing…</>
        ) : (
          <><ShieldCheck className="h-4 w-4" />Verify Property</>
        )}
      </Button>
      <AuditReportModal
        report={report}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        propertyId={propertyId}
      />
    </>
  );
}

interface SyncLog {
  id: number;
  configId: number;
  propertyId: number;
  syncType: string;
  direction: string;
  status: string;
  requestPayload: any;
  responsePayload: any;
  errorMessage: string | null;
  createdAt: string;
}

type ConnectionStatus = "connected" | "partial" | "disconnected";

interface VerifyCheck {
  name: string;
  label: string;
  status: "pass" | "fail";
  detail: string;
}

interface MappingVerification {
  mappingId: number;
  hostezeeRoomType: string;
  aiosellRoomCode: string;
  aiosellRoomId: string | null;
  ratePlanCount: number;
  checks: {
    mappingExists:     VerifyCheck;
    roomCodeValid:     VerifyCheck;
    everPushed:        VerifyCheck;
    lastPushSucceeded: VerifyCheck;
    pushedWithin24h:   VerifyCheck;
  };
  lastInventoryPush: {
    at: string;
    status: string;
    errorMessage: string | null;
    hoursSince: number;
  } | null;
  connectionStatus: ConnectionStatus;
  statusLabel: "Connected" | "Partially Connected" | "Not Connected";
  failedChecks: string[];
}

interface PropertyVerification {
  propertyId: number;
  propertyName: string;
  hotelCode: string | null;
  aiosellConfigured: boolean;
  configId: number | null;
  mappings: MappingVerification[];
  summary: {
    totalMappings: number;
    connected: number;
    partial: number;
    disconnected: number;
    lastSuccessfulPushAt: string | null;
    hoursSinceLastPush: number | null;
  };
  overallStatus: ConnectionStatus;
  generatedAt: string;
}

function ConnStatusBadge({ status, label }: { status: ConnectionStatus; label: string }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700" data-testid="badge-conn-connected">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {label}
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700" data-testid="badge-conn-partial">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700" data-testid="badge-conn-disconnected">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      {label}
    </span>
  );
}

function CheckRow({ check }: { check: VerifyCheck }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      {check.status === "pass"
        ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
        : <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
      }
      <div>
        <span className={check.status === "pass" ? "text-muted-foreground" : "text-foreground font-medium"}>
          {check.label}
        </span>
        {check.status === "fail" && (
          <p className="text-muted-foreground mt-0.5">{check.detail}</p>
        )}
      </div>
    </div>
  );
}

function ConnectionHealthPanel({ propertyId }: { propertyId: number }) {
  const { data: verification, isLoading, refetch, isFetching } = useQuery<PropertyVerification>({
    queryKey: ["/api/aiosell/verify", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/verify?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load verification data");
      return res.json();
    },
    enabled: !!propertyId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking connection health…
        </CardContent>
      </Card>
    );
  }

  if (!verification) return null;

  const { summary, mappings, overallStatus, generatedAt } = verification;
  const generatedDate = new Date(generatedAt);

  return (
    <Card className={
      overallStatus === "connected"
        ? "border-emerald-200 dark:border-emerald-800"
        : overallStatus === "partial"
          ? "border-amber-200 dark:border-amber-800"
          : "border-red-200 dark:border-red-800"
    } data-testid="card-connection-health">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Connection Health</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {summary.totalMappings} mapping{summary.totalMappings !== 1 ? "s" : ""} · checked {generatedDate.toLocaleTimeString()}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnStatusBadge status={overallStatus} label={
              overallStatus === "connected" ? "Connected"
                : overallStatus === "partial" ? "Partially Connected"
                  : "Not Connected"
            } />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-health">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {summary.lastSuccessfulPushAt && (
          <div className="text-xs text-muted-foreground mt-1 pl-8">
            Last successful inventory push: <span className="font-medium">{new Date(summary.lastSuccessfulPushAt).toLocaleString()}</span>
            {summary.hoursSinceLastPush !== null && (
              <span className={`ml-1 ${summary.hoursSinceLastPush > 24 ? "text-amber-600 dark:text-amber-400 font-medium" : ""}`}>
                ({summary.hoursSinceLastPush}h ago)
              </span>
            )}
          </div>
        )}
        {!summary.lastSuccessfulPushAt && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-1 pl-8 font-medium">
            No successful inventory push on record for this property
          </div>
        )}
      </CardHeader>

      {mappings.length > 0 && (
        <CardContent className="pt-0 space-y-3">
          {mappings.map(m => (
            <div
              key={m.mappingId}
              className={`rounded-lg border p-3 ${
                m.connectionStatus === "connected"
                  ? "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10"
                  : m.connectionStatus === "partial"
                    ? "border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10"
                    : "border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10"
              }`}
              data-testid={`card-mapping-health-${m.mappingId}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{m.hostezeeRoomType}</span>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">{m.aiosellRoomCode || <em className="not-italic text-red-500">no code</em>}</span>
                  {m.ratePlanCount === 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">· no rate plans</span>
                  )}
                </div>
                <ConnStatusBadge status={m.connectionStatus} label={m.statusLabel} />
              </div>

              <div className="space-y-1.5">
                {Object.values(m.checks).map(check => (
                  <CheckRow key={check.name} check={check} />
                ))}
              </div>

              {m.lastInventoryPush && (
                <div className={`mt-2 text-xs px-2 py-1 rounded ${m.lastInventoryPush.status === "success" ? "bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}>
                  Last push: {m.lastInventoryPush.status} · {new Date(m.lastInventoryPush.at).toLocaleString()}
                  {m.lastInventoryPush.errorMessage && <span className="block">{m.lastInventoryPush.errorMessage}</span>}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      )}

      {mappings.length === 0 && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">No room mappings configured. Add a mapping below to connect this property to AioSell.</p>
        </CardContent>
      )}
    </Card>
  );
}

function SyncExistingBookingsSection({ config }: { config: AiosellConfig | null | undefined }) {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split("T")[0]; });
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : "https://hostezee.in"}/api/aiosell/reservation`;
  const hotelCode = config?.hotelCode || "(your hotel code)";

  const emailSubject = `Request: Resend all reservations to PMS webhook`;
  const emailBody = `Hi AioSell Support,

Please resend all reservations for our property to our PMS webhook endpoint.

Hotel Code: ${hotelCode}
From Date: ${fromDate}
To Date: ${toDate}
Webhook URL: ${webhookUrl}

Please trigger a resend of all bookings (including pending future reservations) in the above date range to the webhook URL above.

Thank you.`;

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailBody);
      setCopied(true);
      toast({ title: "Copied!", description: "Email template copied to clipboard." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Copy failed", description: "Please select and copy the text manually.", variant: "destructive" });
    }
  };

  const openEmail = () => {
    window.open(`mailto:support@aiosell.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`, "_blank");
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold mb-1">Sync Existing Bookings from Booking.com</h4>
        <p className="text-xs text-muted-foreground">
          AioSell uses a <strong>push-only</strong> model — bookings flow from Booking.com → AioSell → your webhook automatically. There is no API to pull them manually.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          To get bookings already in your Booking.com dashboard, you need to ask AioSell to <strong>resend them</strong> to your webhook. Use the ready-made email below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">From Date</Label>
          <Input type="date" className="h-8 text-xs" value={fromDate} onChange={e => setFromDate(e.target.value)} data-testid="input-resend-from" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To Date</Label>
          <Input type="date" className="h-8 text-xs" value={toDate} onChange={e => setToDate(e.target.value)} data-testid="input-resend-to" />
        </div>
      </div>

      <div className="rounded-md border bg-muted/40 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Email to: support@aiosell.com</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={copyEmail} data-testid="button-copy-email">
              {copied ? <CheckCircle className="h-3 w-3 mr-1 text-green-600" /> : <Download className="h-3 w-3 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={openEmail} data-testid="button-open-email">
              <Link2 className="h-3 w-3 mr-1" />
              Open Mail
            </Button>
          </div>
        </div>
        <pre className="text-xs whitespace-pre-wrap text-foreground/80 font-mono leading-relaxed">{emailBody}</pre>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2">
        <Wifi className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-blue-700 dark:text-blue-300">Your webhook URL (share this with AioSell):</span>
          <div className="mt-0.5 font-mono break-all">{webhookUrl}</div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [hotelCode, setHotelCode] = useState("");
  const [pmsName, setPmsName] = useState("hostezee");
  const [pmsPassword, setPmsPassword] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://live.aiosell.com");
  const [isSandbox, setIsSandbox] = useState(false);

  const { data: config, isLoading } = useQuery<AiosellConfig | null>({
    queryKey: ["/api/aiosell/config", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/config?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
    enabled: !!propertyId,
  });

  useEffect(() => {
    setHotelCode(config?.hotelCode || "");
    setPmsName(config?.pmsName || "hostezee");
    setPmsPassword("");
    setApiBaseUrl(config?.apiBaseUrl || "https://live.aiosell.com");
    setIsSandbox(config?.isSandbox ?? false);
  }, [propertyId, config]);

  const saveConfig = useMutation({
    mutationFn: async () => {
      if (!hotelCode.trim()) throw new Error("Hotel Code is required");
      return apiRequest("/api/aiosell/config", "POST", { propertyId, hotelCode: hotelCode.trim(), pmsName, pmsPassword: pmsPassword || undefined, apiBaseUrl, isSandbox });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/test-connection"] });
      toast({ title: "Configuration saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const testConn = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/aiosell/test-connection", "POST", { propertyId });
      const text = await response.text();
      try { return JSON.parse(text); } catch { throw new Error("Server returned an unexpected response. Please redeploy and try again."); }
    },
    onSuccess: (data: any) => {
      toast({ title: data.success ? "Connection successful" : "Connection failed", description: data.message, variant: data.success ? "default" : "destructive" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const testWebhook = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/aiosell/test-webhook", "POST", { propertyId });
      const text = await response.text();
      try { return JSON.parse(text); } catch { throw new Error("Server returned an unexpected response. Please redeploy and try again."); }
    },
    onSuccess: (data: any) => {
      toast({ title: data.success ? "Test Booking Created!" : "Test Failed", description: data.message, variant: data.success ? "default" : "destructive" });
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fillSandboxCredentials = () => {
    setHotelCode("SANDBOX-PMS");
    setPmsName("aiosell");
    setPmsPassword("AIOsell@123");
    setApiBaseUrl("https://live.aiosell.com");
    setIsSandbox(true);
    toast({ title: "Sandbox credentials filled", description: "Click Save Configuration to apply." });
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const isConfigured = !!config;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AioSell Configuration
          </CardTitle>
          <CardDescription>Connect your property to AioSell channel manager to distribute inventory across OTA platforms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConfigured && (
            <Alert className={config.isActive ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"}>
              <AlertDescription className="flex items-center gap-2">
                {config.isActive ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-yellow-600" />}
                <span>
                  Config saved — Hotel Code: <strong>{config.hotelCode}</strong>{!config.isActive && <span className="text-yellow-600 ml-1">(Inactive)</span>}
                  {config.isSandbox && <Badge variant="outline" className="ml-2 text-amber-600 border-amber-400 text-xs">Sandbox</Badge>}
                </span>
                {config.lastSyncAt && <span className="ml-auto text-xs text-muted-foreground">Last sync: {new Date(config.lastSyncAt).toLocaleString()}</span>}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hotel Code</Label>
              <Input data-testid="input-hotel-code" placeholder="e.g. SANDBOX-PMS" value={hotelCode} onChange={e => setHotelCode(e.target.value)} />
              <p className="text-xs text-muted-foreground">Your hotel code provided by AioSell</p>
            </div>
            <div className="space-y-2">
              <Label>PMS Name</Label>
              <Input data-testid="input-pms-name" placeholder="hostezee" value={pmsName} onChange={e => setPmsName(e.target.value)} />
              <p className="text-xs text-muted-foreground">Your PMS identifier registered with AioSell (used in API URL and auth)</p>
            </div>
            <div className="space-y-2">
              <Label>PMS Password</Label>
              <Input data-testid="input-pms-password" type="password" placeholder={config?.hasPassword ? "Password saved — enter to change" : "Enter PMS password (required)"} value={pmsPassword} onChange={e => setPmsPassword(e.target.value)} />
              {config && !config.hasPassword && (
                <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  No password saved — AioSell will reject all pushes. Enter the PMS password provided by AioSell and save.
                </p>
              )}
              {config?.hasPassword && !pmsPassword && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Password saved — leave blank to keep existing
                </p>
              )}
              {!config && <p className="text-xs text-muted-foreground">API password provided by AioSell</p>}
            </div>
            <div className="space-y-2">
              <Label>API Base URL</Label>
              <Input data-testid="input-api-url" value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">Default: https://live.aiosell.com</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Button data-testid="button-save-config" onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending || !hotelCode.trim()}>
              {saveConfig.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Configuration
            </Button>
            {isConfigured && (
              <Button data-testid="button-test-connection" variant="outline" onClick={() => testConn.mutate()} disabled={testConn.isPending}>
                {testConn.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                Test Connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook Endpoint</CardTitle>
            <CardDescription>AioSell will send reservation updates to this URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
              <Link2 className="h-4 w-4 flex-shrink-0" />
              {`${window.location.origin}/api/aiosell/reservation`}
            </div>
            <p className="text-xs text-muted-foreground">Provide this URL to AioSell during integration setup. This endpoint receives new bookings, modifications, and cancellations from OTA platforms.</p>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Test Incoming Booking</h4>
              <p className="text-xs text-muted-foreground mb-3">Simulate an OTA booking arriving via the webhook. This creates a real test booking (check-in today, 2-night stay) for this property. After clicking, go to Bookings and select this property to see it.</p>
              <Button
                data-testid="button-test-webhook"
                variant="outline"
                onClick={() => testWebhook.mutate()}
                disabled={testWebhook.isPending}
              >
                {testWebhook.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube2 className="h-4 w-4 mr-2" />}
                Send Test Booking
              </Button>
            </div>

            <div className="border-t pt-4 space-y-3">
              <SyncExistingBookingsSection config={config} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RoomMappingTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [newMappings, setNewMappings] = useState<{ hostezeeRoomType: string; aiosellRoomCode: string; aiosellRoomId: string }[]>([]);

  const { data: config } = useQuery<AiosellConfig | null>({
    queryKey: ["/api/aiosell/config", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/config?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!propertyId,
  });

  const { data: roomTypes = [] } = useQuery<string[]>({
    queryKey: ["/api/rooms/types", propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/types?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId && !!config,
  });

  const { data: mappings = [], isLoading } = useQuery<RoomMapping[]>({
    queryKey: ["/api/aiosell/room-mappings", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/room-mappings?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId && !!config,
  });

  const saveMappings = useMutation({
    mutationFn: async (allMappings: { hostezeeRoomType: string; aiosellRoomCode: string; aiosellRoomId?: string }[]) => {
      return apiRequest("/api/aiosell/room-mappings", "POST", { propertyId, mappings: allMappings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/room-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/verify", { propertyId }] });
      setNewMappings([]);
      toast({ title: "Room mappings saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!config) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          AioSell is not configured for this property yet. Please go to the <strong>Settings</strong> tab first and save your Hotel Code and PMS Name.
        </AlertDescription>
      </Alert>
    );
  }

  const existingMappingData = mappings.map(m => ({ hostezeeRoomType: m.hostezeeRoomType, aiosellRoomCode: m.aiosellRoomCode, aiosellRoomId: m.aiosellRoomId || "" }));
  const allMappings = [...existingMappingData, ...newMappings];

  const addMapping = () => setNewMappings([...newMappings, { hostezeeRoomType: "", aiosellRoomCode: "", aiosellRoomId: "" }]);

  const updateMapping = (index: number, field: string, value: string) => {
    const isExisting = index < existingMappingData.length;
    if (isExisting) {
      const updated = [...existingMappingData];
      (updated[index] as any)[field] = value;
      saveMappings.mutate([...updated, ...newMappings]);
    } else {
      const newIndex = index - existingMappingData.length;
      const updated = [...newMappings];
      (updated[newIndex] as any)[field] = value;
      setNewMappings(updated);
    }
  };

  const removeMapping = (index: number) => {
    const isExisting = index < existingMappingData.length;
    if (isExisting) {
      const updated = existingMappingData.filter((_, i) => i !== index);
      saveMappings.mutate([...updated, ...newMappings]);
    } else {
      const newIndex = index - existingMappingData.length;
      setNewMappings(newMappings.filter((_, i) => i !== newIndex));
    }
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <ConnectionHealthPanel propertyId={propertyId} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Hotel className="h-5 w-5" /> Room Mapping</CardTitle>
              <CardDescription>Map your Hostezee room types to AioSell room codes</CardDescription>
            </div>
            <Button data-testid="button-add-room-mapping" size="sm" onClick={addMapping}><Plus className="h-4 w-4 mr-1" /> Add Mapping</Button>
          </div>
        </CardHeader>
        <CardContent>
          {allMappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Hotel className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No room mappings yet. Add a mapping to connect your room types to AioSell.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allMappings.map((mapping, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3" data-testid={`row-room-mapping-${index}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Hostezee Room Type</Label>
                      <Input
                        data-testid={`input-room-type-${index}`}
                        value={mapping.hostezeeRoomType}
                        onChange={e => updateMapping(index, "hostezeeRoomType", e.target.value)}
                        placeholder="e.g. Queen Room with Balcony"
                        list={`room-types-datalist-${index}`}
                      />
                      {roomTypes.length > 0 && (
                        <datalist id={`room-types-datalist-${index}`}>
                          {roomTypes.map(t => <option key={t} value={t} />)}
                        </datalist>
                      )}
                    </div>
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-5" />
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">AioSell Room Code <span className="text-muted-foreground">(string)</span></Label>
                      <Input data-testid={`input-aiosell-code-${index}`} value={mapping.aiosellRoomCode} onChange={e => updateMapping(index, "aiosellRoomCode", e.target.value)} placeholder="e.g. SUITE, EXECUTIVE" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">AioSell Room ID <span className="text-muted-foreground">(numeric, optional)</span></Label>
                      <Input data-testid={`input-aiosell-room-id-${index}`} value={(mapping as any).aiosellRoomId || ""} onChange={e => updateMapping(index, "aiosellRoomId", e.target.value)} placeholder="e.g. 12345" />
                    </div>
                    <Button variant="ghost" size="icon" className="mt-5" onClick={() => removeMapping(index)} data-testid={`button-remove-mapping-${index}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {((mapping as any).aiosellRoomId) && (
                    <p className="text-xs text-muted-foreground pl-1">Webhook will match by Room ID first, then fall back to Room Code.</p>
                  )}
                </div>
              ))}
              <Button data-testid="button-save-mappings" className="mt-4" onClick={() => saveMappings.mutate(allMappings)} disabled={saveMappings.isPending}>
                {saveMappings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save All Mappings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type PlanRow = { roomMappingId: number; ratePlanName: string; ratePlanCode: string; baseRate: string; occupancy: string };

function RatePlansTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [editedPlans, setEditedPlans] = useState<PlanRow[] | null>(null);

  const { data: config } = useQuery<AiosellConfig | null>({
    queryKey: ["/api/aiosell/config", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/config?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!propertyId,
  });

  const { data: mappings = [] } = useQuery<RoomMapping[]>({
    queryKey: ["/api/aiosell/room-mappings", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/room-mappings?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId && !!config,
  });

  const { data: ratePlans = [], isLoading } = useQuery<RatePlan[]>({
    queryKey: ["/api/aiosell/rate-plans", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/rate-plans?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId && !!config,
  });

  if (!config) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          AioSell is not configured for this property yet. Please go to the <strong>Settings</strong> tab first and save your Hotel Code and PMS Name.
        </AlertDescription>
      </Alert>
    );
  }

  const savePlans = useMutation({
    mutationFn: async (plans: PlanRow[]) => {
      return apiRequest("/api/aiosell/rate-plans", "POST", { propertyId, ratePlans: plans });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/rate-plans"] });
      setEditedPlans(null);
      toast({ title: "Rate plans saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fromDB: PlanRow[] = ratePlans.map(rp => ({
    roomMappingId: rp.roomMappingId,
    ratePlanName: rp.ratePlanName,
    ratePlanCode: rp.ratePlanCode,
    baseRate: rp.baseRate || "",
    occupancy: rp.occupancy,
  }));

  const plans = editedPlans ?? fromDB;
  const isDirty = editedPlans !== null;

  const updatePlan = (index: number, field: keyof PlanRow, value: string | number) => {
    const base = editedPlans ?? fromDB;
    const updated = base.map((p, i) => i === index ? { ...p, [field]: value } : p);
    setEditedPlans(updated);
  };

  const addPlan = () => {
    const base = editedPlans ?? fromDB;
    setEditedPlans([...base, { roomMappingId: 0, ratePlanName: "", ratePlanCode: "", baseRate: "", occupancy: "single" }]);
  };

  const removePlan = (index: number) => {
    const base = editedPlans ?? fromDB;
    setEditedPlans(base.filter((_, i) => i !== index));
  };

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (mappings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          <ArrowUpDown className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Please set up room mappings first before configuring rate plans.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Rate Plans</CardTitle>
              <CardDescription>Define rate plans for each room type to push pricing to OTAs. You can edit any row to fix room assignments.</CardDescription>
            </div>
            <Button data-testid="button-add-rate-plan" size="sm" onClick={addPlan}><Plus className="h-4 w-4 mr-1" /> Add Rate Plan</Button>
          </div>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No rate plans configured yet. Add rate plans to start pushing rates to OTAs.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Type</TableHead>
                  <TableHead>Rate Plan Name</TableHead>
                  <TableHead>Rate Plan Code</TableHead>
                  <TableHead>Base Rate</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan, index) => {
                  const isMissingRoom = !plan.roomMappingId || !mappings.find(m => m.id === plan.roomMappingId);
                  return (
                  <TableRow key={index} data-testid={`row-rate-plan-${index}`} className={isMissingRoom ? "bg-red-50 dark:bg-red-950/20" : ""}>
                    <TableCell>
                      {isMissingRoom && <span className="block text-xs text-red-600 font-medium mb-1">⚠ Select a room</span>}
                      <Select
                        value={plan.roomMappingId ? String(plan.roomMappingId) : ""}
                        onValueChange={v => updatePlan(index, "roomMappingId", parseInt(v))}
                      >
                        <SelectTrigger data-testid={`select-room-mapping-${index}`}><SelectValue placeholder="Select room" /></SelectTrigger>
                        <SelectContent>
                          {mappings.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.hostezeeRoomType} ({m.aiosellRoomCode})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input data-testid={`input-rate-plan-name-${index}`} value={plan.ratePlanName} onChange={e => updatePlan(index, "ratePlanName", e.target.value)} placeholder="Standard Single" />
                    </TableCell>
                    <TableCell>
                      <Input data-testid={`input-rate-plan-code-${index}`} value={plan.ratePlanCode} onChange={e => updatePlan(index, "ratePlanCode", e.target.value)} placeholder="SUITE-S-101" />
                    </TableCell>
                    <TableCell>
                      <Input data-testid={`input-base-rate-${index}`} type="number" value={plan.baseRate} onChange={e => updatePlan(index, "baseRate", e.target.value)} placeholder="0" />
                    </TableCell>
                    <TableCell>
                      <Select value={plan.occupancy} onValueChange={v => updatePlan(index, "occupancy", v)}>
                        <SelectTrigger data-testid={`select-occupancy-${index}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="double">Double</SelectItem>
                          <SelectItem value="triple">Triple</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removePlan(index)} data-testid={`button-remove-plan-${index}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {(isDirty || plans.length > 0) && (
            <div className="mt-4 flex items-center gap-3">
              <Button data-testid="button-save-rate-plans" onClick={() => savePlans.mutate(plans)} disabled={savePlans.isPending}>
                {savePlans.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save All Rate Plans
              </Button>
              {isDirty && (
                <Button variant="ghost" size="sm" onClick={() => setEditedPlans(null)}>Discard Changes</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PushRatesTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const endDefault = new Date();
  endDefault.setDate(endDefault.getDate() + 30);
  const [endDate, setEndDate] = useState(endDefault.toISOString().split("T")[0]);
  const [lastPushResult, setLastPushResult] = useState<{ success: boolean; message?: string } | null>(null);

  const { data: config } = useQuery<AiosellConfig | null>({
    queryKey: ["/api/aiosell/config", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/config?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!propertyId,
  });

  const { data: mappings = [] } = useQuery<RoomMapping[]>({
    queryKey: ["/api/aiosell/room-mappings", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/room-mappings?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId && !!config,
  });

  const { data: ratePlans = [] } = useQuery<RatePlan[]>({
    queryKey: ["/api/aiosell/rate-plans", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/rate-plans?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId && !!config,
  });

  const { data: latestRates = {} } = useQuery<Record<string, { rate: number; pushedAt: string | null; startDate: string; endDate: string }>>({
    queryKey: ["/api/aiosell/latest-rates", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/latest-rates?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId && !!config,
  });

  const { data: allRooms = [] } = useQuery<{ id: number; roomType: string; totalBeds: number }[]>({
    queryKey: ["/api/rooms", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/rooms?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId,
  });

  const getRoomCount = (roomType: string | undefined) => {
    if (!roomType) return 0;
    const matching = allRooms.filter(r => r.roomType === roomType);
    const isDorm = matching.some(r => (r.totalBeds || 1) > 1);
    if (isDorm) return matching.reduce((sum, r) => sum + (r.totalBeds || 1), 0);
    return matching.length;
  };

  const [rateValues, setRateValues] = useState<Record<string, string>>({});
  const [pushingSinglePlan, setPushingSinglePlan] = useState<string | null>(null);

  const humanizeAiosellError = (msg: string | undefined) => {
    if (!msg) return "Unknown error from AioSell";
    if (msg.toLowerCase().includes("authentication required"))
      return "AioSell rejected the credentials — your hotel code is not yet linked to the Hostezee PMS on AioSell's side. Contact AioSell support and ask them to link your hotel code to PMS name \"hostezee\".";
    return msg;
  };

  const doApiPush = async (rates: { roomCode: string; rate: number; rateplanCode: string }[]) => {
    if (rates.length === 0) throw new Error("Set at least one rate");
    if (endDate < startDate) throw new Error(`End date (${endDate}) is before start date (${startDate}). Please fix the date range.`);
    const res = await apiRequest("/api/aiosell/push-rates", "POST", {
      propertyId,
      updates: [{ startDate, endDate, rates }],
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error("Server returned an unexpected response. Please redeploy and try again."); }
  };

  const onPushSuccess = (data: any) => {
    const msg = humanizeAiosellError(data.message);
    setLastPushResult({ success: data.success, message: msg });
    toast({ title: data.success ? "Rates pushed successfully" : "Push failed", description: msg, variant: data.success ? "default" : "destructive" });
    queryClient.invalidateQueries({ queryKey: ["/api/aiosell/sync-logs"] });
    if (data.success) queryClient.invalidateQueries({ queryKey: ["/api/aiosell/latest-rates", { propertyId }] });
  };

  const pushRatesMutation = useMutation({
    mutationFn: async () => {
      const withRate = ratePlans.filter(rp => rateValues[rp.ratePlanCode]);
      const unlinked = withRate.filter(rp => !mappings.find(m => m.id === rp.roomMappingId));
      if (unlinked.length > 0 && unlinked.length === withRate.length) {
        throw new Error(`All rate plans are missing a room assignment. Go to the Rate Plans tab and select a room for each plan (the ones highlighted in red).`);
      }
      if (unlinked.length > 0) {
        toast({ title: "Some plans skipped", description: `${unlinked.length} rate plan(s) have no room assigned and were skipped. Fix them in the Rate Plans tab.`, variant: "destructive" });
      }
      const rates = withRate
        .filter(rp => mappings.find(m => m.id === rp.roomMappingId))
        .map(rp => {
          const mapping = mappings.find(m => m.id === rp.roomMappingId)!;
          return {
            roomCode: mapping.aiosellRoomCode,
            roomId: mapping.aiosellRoomId || null,
            rate: parseFloat(rateValues[rp.ratePlanCode] || rp.baseRate || "0"),
            rateplanCode: rp.ratePlanCode,
          };
        });
      return doApiPush(rates);
    },
    onSuccess: onPushSuccess,
    onError: (e: any) => {
      setLastPushResult({ success: false, message: e.message });
      toast({ title: "Push Error", description: e.message, variant: "destructive" });
    },
  });

  const pushSingleRate = async (rp: RatePlan) => {
    const mapping = mappings.find(m => m.id === rp.roomMappingId);
    if (!mapping) { toast({ title: "Room not linked", description: "Link this room in the Rate Plans tab first.", variant: "destructive" }); return; }
    const lastPushed = latestRates[String(rp.id)];
    const rawValue = rateValues[rp.ratePlanCode];
    const rateToUse = rawValue ? parseFloat(rawValue) : (lastPushed ? lastPushed.rate : parseFloat(rp.baseRate || "0"));
    if (!rateToUse || isNaN(rateToUse)) { toast({ title: "No rate set", description: "Enter a rate in the input field first.", variant: "destructive" }); return; }
    setPushingSinglePlan(rp.ratePlanCode);
    try {
      const data = await doApiPush([{ roomCode: mapping.aiosellRoomCode, roomId: mapping.aiosellRoomId || null, rate: rateToUse, rateplanCode: rp.ratePlanCode }]);
      onPushSuccess(data);
    } catch (e: any) {
      toast({ title: "Push Error", description: e.message, variant: "destructive" });
    } finally {
      setPushingSinglePlan(null);
    }
  };

  if (!config) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          AioSell is not configured for this property yet. Please go to the <strong>Settings</strong> tab first and save your Hotel Code and PMS Name.
        </AlertDescription>
      </Alert>
    );
  }

  if (ratePlans.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Set up rate plans first before pushing rates to OTAs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Push Rates to OTAs</CardTitle>
          <CardDescription>Set rates for a date range and push them to all connected OTA platforms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input data-testid="input-rate-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input data-testid="input-rate-end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Type</TableHead>
                <TableHead>AioSell Code</TableHead>
                <TableHead>Rate Plan</TableHead>
                <TableHead>Occupancy</TableHead>
                <TableHead>Room Count</TableHead>
                <TableHead>Last Pushed Rate</TableHead>
                <TableHead>Rate to Push</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratePlans.map(rp => {
                const mapping = mappings.find(m => m.id === rp.roomMappingId);
                const roomCount = getRoomCount(mapping?.hostezeeRoomType);
                const matchingRooms = allRooms.filter(r => r.roomType === mapping?.hostezeeRoomType);
                const isDorm = matchingRooms.some(r => (r.totalBeds || 1) > 1);
                const lastPushed = latestRates[String(rp.id)];
                const newRate = parseFloat(rateValues[rp.ratePlanCode] || "");
                const hasChange = lastPushed && !isNaN(newRate) && newRate !== lastPushed.rate;
                return (
                  <TableRow key={rp.id} data-testid={`row-push-rate-${rp.id}`}>
                    <TableCell className="font-medium">{mapping?.hostezeeRoomType || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {mapping ? (
                        <Badge variant="secondary" className="font-mono text-xs">{mapping.aiosellRoomCode}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not linked — fix in Rate Plans tab</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{rp.ratePlanName}</div>
                      <div className="text-xs text-muted-foreground">{rp.ratePlanCode}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{rp.occupancy}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roomCount}</Badge>
                      {isDorm && <span className="ml-1 text-xs text-muted-foreground">beds</span>}
                    </TableCell>
                    <TableCell>
                      {lastPushed ? (
                        <div>
                          <div className="font-semibold text-[#1E3A5F] dark:text-[#2BB6A8]">
                            ₹{lastPushed.rate.toLocaleString("en-IN")}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {lastPushed.pushedAt ? format(new Date(lastPushed.pushedAt), "dd MMM, HH:mm") : "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {lastPushed.startDate} → {lastPushed.endDate}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not pushed yet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Input
                          data-testid={`input-push-rate-${rp.id}`}
                          type="number"
                          className={`w-28 ${hasChange ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
                          placeholder={lastPushed ? String(lastPushed.rate) : (rp.baseRate || "0")}
                          value={rateValues[rp.ratePlanCode] || ""}
                          onChange={e => setRateValues({ ...rateValues, [rp.ratePlanCode]: e.target.value })}
                        />
                        {hasChange && (
                          <span className="text-xs text-amber-600 font-medium">
                            {lastPushed.rate} → {newRate}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        data-testid={`button-push-single-rate-${rp.id}`}
                        size="sm"
                        variant="outline"
                        className="whitespace-nowrap text-xs"
                        disabled={pushingSinglePlan === rp.ratePlanCode || pushRatesMutation.isPending}
                        onClick={() => { setLastPushResult(null); pushSingleRate(rp); }}
                      >
                        {pushingSinglePlan === rp.ratePlanCode
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <RefreshCw className="h-3 w-3 mr-1" />}
                        {pushingSinglePlan === rp.ratePlanCode ? "Pushing…" : "Push This"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center gap-3 flex-wrap">
            <Button data-testid="button-push-rates" onClick={() => { setLastPushResult(null); pushRatesMutation.mutate(); }} disabled={pushRatesMutation.isPending}>
              {pushRatesMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Push Rates to All OTAs
            </Button>
            {lastPushResult && (
              <div className={`flex items-center gap-2 text-sm font-medium ${lastPushResult.success ? "text-green-600" : "text-red-600"}`} data-testid="text-push-rates-result">
                {lastPushResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{lastPushResult.success ? "Rates pushed successfully" : `Push failed: ${lastPushResult.message || "Unknown error"}`}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const endDefault = new Date();
  endDefault.setDate(endDefault.getDate() + 90);
  const [endDate, setEndDate] = useState(endDefault.toISOString().split("T")[0]);
  const [lastPushResult, setLastPushResult] = useState<{ success: boolean; message?: string } | null>(null);

  const { data: mappings = [] } = useQuery<RoomMapping[]>({
    queryKey: ["/api/aiosell/room-mappings", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/room-mappings?propertyId=${propertyId}`);
      return res.json();
    },
    enabled: !!propertyId,
  });

  const { data: allRooms = [] } = useQuery<{ id: number; roomType: string; totalBeds: number }[]>({
    queryKey: ["/api/rooms", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/rooms?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId,
  });

  const normaliseRoomType = (s: string) =>
    s.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

  const getRoomCount = (roomType: string) => {
    const normType = normaliseRoomType(roomType);
    const matching = allRooms.filter(r => {
      const normRoom = normaliseRoomType(r.roomType || "");
      return normRoom === normType || normRoom.includes(normType) || normType.includes(normRoom);
    });
    const isDorm = matching.some(r => (r.totalBeds || 1) > 1);
    if (isDorm) return matching.reduce((sum, r) => sum + (r.totalBeds || 1), 0);
    return matching.length;
  };

  const [inventoryValues, setInventoryValues] = useState<Record<string, string>>({});
  const [pushingSingleInventory, setPushingSingleInventory] = useState<string | null>(null);
  const [forceSyncResult, setForceSyncResult] = useState<{ success: boolean; message?: string } | null>(null);

  const forceSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/aiosell/force-sync", "POST", { propertyId });
      return res.json();
    },
    onSuccess: (data: any) => {
      setForceSyncResult({ success: data.success !== false, message: data.message });
      toast({ title: data.success !== false ? "Sync triggered" : "Sync failed", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/sync-logs"] });
    },
    onError: (e: any) => {
      setForceSyncResult({ success: false, message: e.message });
      toast({ title: "Sync Error", description: e.message, variant: "destructive" });
    },
  });

  const pushInventoryMutation = useMutation({
    mutationFn: async () => {
      const rooms = mappings
        .filter(m => inventoryValues[m.aiosellRoomCode])
        .map(m => {
          const entry: { roomCode: string; available: number; roomId?: string } = {
            roomCode: m.aiosellRoomCode,
            available: parseInt(inventoryValues[m.aiosellRoomCode] || "0"),
          };
          if (m.aiosellRoomId) entry.roomId = m.aiosellRoomId;
          return entry;
        });
      if (rooms.length === 0) throw new Error("Set at least one inventory count");
      const res = await apiRequest("/api/aiosell/push-inventory", "POST", {
        propertyId,
        updates: [{ startDate, endDate, rooms }],
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setLastPushResult({ success: data.success, message: data.message });
      toast({ title: data.success ? "Inventory pushed" : "Push failed", description: data.message, variant: data.success ? "default" : "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/sync-logs"] });
    },
    onError: (e: any) => {
      setLastPushResult({ success: false, message: e.message });
      toast({ title: "Push Error", description: e.message, variant: "destructive" });
    },
  });

  const pushSingleInventory = async (m: typeof mappings[0]) => {
    const val = inventoryValues[m.aiosellRoomCode];
    if (!val && val !== "0") {
      toast({ title: "Enter a value", description: `Set the available rooms count for ${m.hostezeeRoomType} first.`, variant: "destructive" });
      return;
    }
    setPushingSingleInventory(m.aiosellRoomCode);
    try {
      const entry: { roomCode: string; available: number; roomId?: string } = {
        roomCode: m.aiosellRoomCode,
        available: parseInt(val || "0"),
      };
      if (m.aiosellRoomId) entry.roomId = m.aiosellRoomId;
      const res = await apiRequest("/api/aiosell/push-inventory", "POST", {
        propertyId,
        updates: [{ startDate, endDate, rooms: [entry] }],
      });
      const data = await res.json();
      toast({ title: data.success ? "Inventory pushed" : "Push failed", description: data.success ? `${m.hostezeeRoomType} inventory updated on OTAs.` : data.message, variant: data.success ? "default" : "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/sync-logs"] });
    } catch (e: any) {
      toast({ title: "Push Error", description: e.message, variant: "destructive" });
    } finally {
      setPushingSingleInventory(null);
    }
  };

  if (mappings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Set up room mappings first before managing inventory.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Push Inventory</CardTitle>
          <CardDescription>Update room availability across all OTA platforms for a date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-teal-900 dark:text-teal-100">Auto-Calculate &amp; Push (90 days)</p>
              <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">Reads live bookings from Hostezee, calculates exact availability, and pushes to AioSell for the next 90 days. Same calculation that fires automatically on every new booking.</p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                data-testid="button-force-sync"
                onClick={() => { setForceSyncResult(null); forceSyncMutation.mutate(); }}
                disabled={forceSyncMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {forceSyncMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Force Sync Now
              </Button>
              {forceSyncResult && (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${forceSyncResult.success ? "text-teal-700 dark:text-teal-300" : "text-red-600"}`} data-testid="text-force-sync-result">
                  {forceSyncResult.success ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{forceSyncResult.message}</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or push a custom count manually</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input data-testid="input-inv-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date (default 90 days)</Label>
              <Input data-testid="input-inv-end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Type</TableHead>
                <TableHead>AioSell Code</TableHead>
                <TableHead>Room Count</TableHead>
                <TableHead>Available Rooms</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(m => {
                const roomCount = getRoomCount(m.hostezeeRoomType);
                const matchingRooms = allRooms.filter(r => r.roomType === m.hostezeeRoomType);
                const isDorm = matchingRooms.some(r => (r.totalBeds || 1) > 1);
                const isPushingThis = pushingSingleInventory === m.aiosellRoomCode;
                return (
                  <TableRow key={m.id} data-testid={`row-inventory-${m.id}`}>
                    <TableCell className="font-medium">{m.hostezeeRoomType}</TableCell>
                    <TableCell><Badge variant="outline">{m.aiosellRoomCode}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roomCount}</Badge>
                      {isDorm && <span className="ml-1 text-xs text-muted-foreground">beds</span>}
                    </TableCell>
                    <TableCell>
                      <Input
                        data-testid={`input-inventory-${m.id}`}
                        type="number"
                        className="w-28"
                        placeholder="0"
                        value={inventoryValues[m.aiosellRoomCode] || ""}
                        onChange={e => setInventoryValues({ ...inventoryValues, [m.aiosellRoomCode]: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPushingThis || !!pushingSingleInventory || pushInventoryMutation.isPending}
                        onClick={() => pushSingleInventory(m)}
                        data-testid={`button-push-inventory-single-${m.id}`}
                      >
                        {isPushingThis
                          ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Pushing…</>
                          : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Push This</>
                        }
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center gap-3 flex-wrap">
            <Button data-testid="button-push-inventory" onClick={() => { setLastPushResult(null); pushInventoryMutation.mutate(); }} disabled={pushInventoryMutation.isPending}>
              {pushInventoryMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Push Inventory to All OTAs
            </Button>
            {lastPushResult && (
              <div className={`flex items-center gap-2 text-sm font-medium ${lastPushResult.success ? "text-green-600" : "text-red-600"}`} data-testid="text-push-inventory-result">
                {lastPushResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{lastPushResult.success ? "Inventory pushed successfully" : `Push failed: ${lastPushResult.message || "Unknown error"}`}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface InventoryCalendarDay { date: string; available: number; booked: number; blocked: number; total: number; stopSell?: boolean; }
interface InventoryCalendarRoomType { roomCode: string; hostezeeRoomType: string; totalRooms: number; rate: number | null; days: InventoryCalendarDay[]; isDormitory?: boolean; }
interface InventoryCalendarResponse { dates: string[]; roomTypes: InventoryCalendarRoomType[]; }

const CELL_W = 60; // px per date column
const ROW_H = 52;  // px per room-type row

function InventoryCalendarTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 29); return d.toISOString().split("T")[0]; });
  const gridRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery<InventoryCalendarResponse>({
    queryKey: ["/api/aiosell/inventory-calendar", { propertyId, from: fromDate, to: toDate }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/inventory-calendar?propertyId=${propertyId}&from=${fromDate}&to=${toDate}`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    enabled: !!propertyId,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/aiosell/push-inventory", "POST", { propertyId, autoSync: true });
      return res.json();
    },
    onSuccess: (d: any) => {
      toast({ title: d.success ? "Synced to Booking.com" : "Sync failed", description: d.message, variant: d.success ? "default" : "destructive" });
      refetch();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const shiftDays = (n: number) => {
    const f = new Date(fromDate); f.setDate(f.getDate() + n);
    const t = new Date(toDate); t.setDate(t.getDate() + n);
    setFromDate(f.toISOString().split("T")[0]);
    setToDate(t.toISOString().split("T")[0]);
  };

  const cellColor = (available: number, total: number) => {
    if (total === 0) return "bg-slate-100 dark:bg-slate-800 text-slate-400";
    if (available === 0) return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300";
    const pct = available / total;
    if (pct <= 0.3) return "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300";
    return "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300";
  };

  if (!data && isLoading) {
    return (
      <Card><CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" /><p className="text-muted-foreground">Loading inventory…</p></CardContent></Card>
    );
  }

  if (!data || data.roomTypes.length === 0) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No room mappings found. Set up room mappings first.</p>
      </CardContent></Card>
    );
  }

  const dates = data.dates;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" className="w-36 h-8 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} data-testid="input-cal-from" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" className="w-36 h-8 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} data-testid="input-cal-to" />
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading} data-testid="button-refresh-cal">
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => shiftDays(-7)} title="Previous 7 days" data-testid="button-cal-prev"><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => { setFromDate(today); const d = new Date(); d.setDate(d.getDate() + 29); setToDate(d.toISOString().split("T")[0]); }} className="text-xs px-2">Today</Button>
              <Button size="sm" variant="outline" onClick={() => shiftDays(7)} title="Next 7 days" data-testid="button-cal-next"><ChevronRight className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} data-testid="button-sync-cal" className="ml-auto">
              {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Sync to Booking.com
            </Button>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 dark:bg-green-700 inline-block" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-700 inline-block" /> Limited (≤30%)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-700 inline-block" /> Sold out</span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <div className="flex">
            {/* Frozen left column — room type labels */}
            <div className="flex-shrink-0 border-r bg-white dark:bg-card" style={{ width: 160 }}>
              {/* Header spacer */}
              <div className="border-b bg-slate-50 dark:bg-muted/20 flex items-center px-3" style={{ height: 44 }}>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Room Type</span>
              </div>
              {data.roomTypes.map(rt => (
                <div key={rt.roomCode} className="border-b px-3 flex flex-col justify-center" style={{ height: ROW_H }}>
                  <span className="font-semibold text-sm truncate">{rt.hostezeeRoomType}</span>
                  <span className="text-xs text-muted-foreground">{rt.roomCode} · {rt.totalRooms} {rt.isDormitory ? "bed" : "room"}{rt.totalRooms !== 1 ? "s" : ""}</span>
                  {rt.rate && (
                    <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-0.5 mt-0.5">
                      <IndianRupee className="h-2.5 w-2.5" />{rt.rate.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              ))}
              {/* Summary row label */}
              <div className="border-t-2 px-3 flex flex-col justify-center bg-slate-50 dark:bg-muted/30" style={{ height: ROW_H }}>
                <span className="font-semibold text-sm">Occupancy</span>
                <span className="text-xs text-muted-foreground">OTA view</span>
              </div>
            </div>

            {/* Scrollable date grid */}
            <div ref={gridRef} className="flex-1 overflow-x-auto">
              <div style={{ minWidth: dates.length * CELL_W }}>
                {/* Date header row */}
                <div className="flex border-b bg-slate-50 dark:bg-muted/20" style={{ height: 44 }}>
                  {dates.map(dateStr => {
                    const d = parseISO(dateStr);
                    const isToday = dateStr === today;
                    const isSun = d.getDay() === 0;
                    const isSat = d.getDay() === 6;
                    return (
                      <div
                        key={dateStr}
                        className={`border-r flex-shrink-0 flex flex-col items-center justify-center text-center ${isToday ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}
                        style={{ width: CELL_W }}
                      >
                        <span className={`text-xs font-medium ${isToday ? "text-blue-600 dark:text-blue-400" : isSun || isSat ? "text-rose-500 dark:text-rose-400" : "text-muted-foreground"}`}>
                          {format(d, "EEE")}
                        </span>
                        <span className={`text-sm font-bold leading-none mt-0.5 ${isToday ? "text-blue-600 dark:text-blue-400" : ""}`}>
                          {format(d, "d")}
                        </span>
                        <span className="text-xs text-muted-foreground leading-none">{format(d, "MMM")}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Room type rows */}
                {data.roomTypes.map(rt => (
                  <div key={rt.roomCode} className="flex border-b" style={{ height: ROW_H }}>
                    {rt.days.map(day => {
                      const isToday = day.date === today;
                      const unitLabel = rt.isDormitory ? "beds" : "rooms";
                      return (
                        <div
                          key={day.date}
                          className={`border-r flex-shrink-0 flex flex-col items-center justify-center cursor-default transition-colors ${isToday ? "ring-1 ring-inset ring-blue-300 dark:ring-blue-700" : ""} ${day.stopSell ? "bg-slate-800 text-slate-100" : cellColor(day.available, day.total)}`}
                          style={{ width: CELL_W }}
                          title={`${rt.hostezeeRoomType} · ${day.date}\nAvailable: ${day.available} / ${day.total} ${unitLabel}\nBooked: ${day.booked}${day.blocked ? ` · Blocked: ${day.blocked}` : ""}${day.stopSell ? "\n⛔ Stop-sell active" : ""}`}
                          data-testid={`inv-cell-${rt.roomCode}-${day.date}`}
                        >
                          {day.stopSell ? (
                            <span className="text-xs font-bold text-red-400">⛔ STOP</span>
                          ) : (
                            <>
                              <span className="text-lg font-bold leading-none">{day.available}</span>
                              <span className="text-xs opacity-70 leading-none mt-0.5">/ {day.total}</span>
                              {day.booked > 0 && (
                                <span className="text-xs opacity-60 leading-none mt-0.5">{day.booked} bkd</span>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Summary row — total available across all mapped room types + occupancy % */}
                {(() => {
                  return (
                    <div className="flex bg-slate-50 dark:bg-muted/30 border-t-2">
                      {dates.map(dateStr => {
                        const isToday = dateStr === today;
                        const totAvail = data.roomTypes.reduce((s, rt) => {
                          const d = rt.days.find(d => d.date === dateStr);
                          return s + (d?.available ?? 0);
                        }, 0);
                        const totCap = data.roomTypes.reduce((s, rt) => {
                          const d = rt.days.find(d => d.date === dateStr);
                          return s + (d?.total ?? 0);
                        }, 0);
                        const occ = totCap > 0 ? Math.round(((totCap - totAvail) / totCap) * 100) : 0;
                        return (
                          <div
                            key={dateStr}
                            className={`border-r flex-shrink-0 flex flex-col items-center justify-center text-center ${isToday ? "bg-blue-50 dark:bg-blue-950/40" : ""}`}
                            style={{ width: CELL_W, height: ROW_H }}
                            title={`${dateStr}: ${totAvail} available, ${occ}% occupied`}
                          >
                            <span className={`text-xs font-bold ${occ >= 80 ? "text-red-600 dark:text-red-400" : occ >= 50 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>{occ}%</span>
                            <span className="text-xs text-muted-foreground leading-none mt-0.5">{totAvail} avail</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const KNOWN_TEMPLATES = [
  { id: "28769", name: "✅ Check-in Message (to guest)", hint: "Vars: {{1}}=propertyName, {{2}}=guestName, {{3}}=foodOrderLink", varCount: 3 },
  { id: "28770", name: "✅ OTA Booking Alert (to staff)", hint: "Vars: {{1}}=propertyName, {{2}}=guestName", varCount: 2 },
  { id: "custom", name: "Custom WID…", hint: "Enter any template WID and variables manually", varCount: 0 },
];

function WhatsAppTestTab() {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState("28769");
  const [customWid, setCustomWid] = useState("");
  const [phone, setPhone] = useState("");
  const [variables, setVariables] = useState<string[]>(["", "", "", "", ""]);
  const [result, setResult] = useState<any>(null);

  const selected = KNOWN_TEMPLATES.find(t => t.id === templateId) || KNOWN_TEMPLATES[0];
  const effectiveWid = templateId === "custom" ? customWid : templateId;

  const testMutation = useMutation({
    mutationFn: async () => {
      const vars = variables.filter(v => v.trim() !== "");
      return await apiRequest("/api/whatsapp/test", "POST", {
        phone: phone.trim(),
        templateId: effectiveWid,
        variables: vars,
      });
    },
    onSuccess: async (res) => {
      const data = await res.json();
      setResult(data);
      if (data.success) {
        toast({ title: "✅ WhatsApp Sent", description: `Message delivered to ${data.sentTo}` });
      } else {
        toast({ title: "❌ Send Failed", description: data.error || data.message, variant: "destructive" });
      }
    },
    onError: (err: any) => {
      setResult({ success: false, error: err.message });
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateVar = (i: number, val: string) => {
    const next = [...variables];
    next[i] = val;
    setVariables(next);
  };

  return (
    <div className="space-y-6 p-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-green-600" />
            WhatsApp Template Tester
          </CardTitle>
          <CardDescription>
            Send a test WhatsApp message using any template WID directly from PMS. Uses your AUTHKEY_API_KEY.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={(v) => { setTemplateId(v); setResult(null); }}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KNOWN_TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} {t.id !== "custom" ? `(WID ${t.id})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{selected.hint}</p>
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Number</Label>
              <Input
                placeholder="9876543210 (10 digits, India)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                data-testid="input-phone"
              />
              <p className="text-xs text-muted-foreground">Enter without +91 or country code</p>
            </div>
          </div>

          {templateId === "custom" && (
            <div className="space-y-1">
              <Label>Custom WID (Template ID)</Label>
              <Input
                placeholder="e.g. 28769"
                value={customWid}
                onChange={e => setCustomWid(e.target.value)}
                data-testid="input-custom-wid"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Variables (leave blank to skip)</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Variable {i + 1} {`{{${i + 1}}}`}</Label>
                  <Input
                    placeholder={`Value for {{${i + 1}}}`}
                    value={variables[i] || ""}
                    onChange={e => updateVar(i, e.target.value)}
                    data-testid={`input-var-${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !phone.trim() || !effectiveWid.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-send-test"
          >
            {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send Test Message
          </Button>

          {result && (
            <div className={`rounded-lg border p-4 ${result.success ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800" : "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800"}`}>
              <p className="font-medium text-sm flex items-center gap-2 mb-2">
                {result.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                {result.success ? "Message Sent Successfully" : "Send Failed"}
              </p>
              <div className="space-y-1 text-xs font-mono text-muted-foreground">
                {result.sentTo && <p><span className="font-semibold">To:</span> {result.sentTo}</p>}
                {result.templateId && <p><span className="font-semibold">WID:</span> {result.templateId}</p>}
                {result.message && <p><span className="font-semibold">API response:</span> {result.message}</p>}
                {result.error && <p className="text-red-600"><span className="font-semibold">Error:</span> {result.error}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Known Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WID</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Variables</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {KNOWN_TEMPLATES.filter(t => t.id !== "custom").map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-semibold">{t.id}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.hint}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SyncLogsTab({ propertyId }: { propertyId: number }) {
  const { data: logs = [], isLoading, refetch } = useQuery<SyncLog[]>({
    queryKey: ["/api/aiosell/sync-logs", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/sync-logs?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId,
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Success</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      case "error": return <Badge variant="destructive">Error</Badge>;
      case "received": return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Received</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      inventory_push: "Inventory Push",
      rate_push: "Rate Push",
      inventory_restrictions_push: "Inventory Restrictions",
      rate_restrictions_push: "Rate Restrictions",
      noshow_push: "No-Show Update",
      connection_test: "Connection Test",
      reservation_book: "New Reservation",
      reservation_modify: "Reservation Modified",
      reservation_cancel: "Reservation Cancelled",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Sync Logs</CardTitle>
              <CardDescription>View all synchronization activity between Hostezee and AioSell</CardDescription>
            </div>
            <Button data-testid="button-refresh-logs" variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Auto-Sync logs are created automatically whenever a booking is created, updated, or cancelled. Manual Push logs appear when you use the Push Rates or Push Inventory tabs. These are separate entries — a "Success" auto-sync log does not mean your manual push succeeded. <strong>Click any row to see the full request and response details.</strong>
          </div>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No sync activity yet. Push rates or inventory to see logs here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AioSell Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <>
                    <TableRow
                      key={log.id}
                      data-testid={`row-sync-log-${log.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <TableCell className="text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{getSyncTypeLabel(log.syncType)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.direction === "inbound" ? "Incoming" : "Outgoing"}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px]">
                        <div className="flex items-center gap-1">
                          <span className="truncate">
                            {log.errorMessage || (log.responsePayload ? JSON.stringify(log.responsePayload) : "—")}
                          </span>
                          <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${expandedId === log.id ? "rotate-180" : ""}`} />
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === log.id && (
                      <TableRow key={`${log.id}-detail`} className="bg-muted/30">
                        <TableCell colSpan={5} className="py-3 px-4">
                          <div className="space-y-3 text-xs font-mono">
                            {log.requestPayload && (
                              <div>
                                <div className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Request sent to AioSell</div>
                                <pre className="bg-background rounded border p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] max-h-[200px] overflow-y-auto">
                                  {JSON.stringify(log.requestPayload, null, 2)}
                                </pre>
                              </div>
                            )}
                            {(log.responsePayload || log.errorMessage) && (
                              <div>
                                <div className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1">AioSell Response</div>
                                <pre className={`rounded border p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] max-h-[120px] overflow-y-auto ${log.status === "success" ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
                                  {log.errorMessage || JSON.stringify(log.responsePayload, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── OTA End-to-End Test ───────────────────────────────────────────────────────
type OtaStatus = "pass" | "warn" | "fail" | "info";

interface OtaFlowResult {
  status: OtaStatus;
  detail: string;
  [key: string]: unknown;
}

interface OtaTestResult {
  testedAt: string;
  propertyId: number;
  inventoryFlow: OtaFlowResult & {
    lastSuccessAt: string | null;
    pushCount: number;
    failCount7d: number;
    hoursSince: number | null;
  };
  rateFlow: OtaFlowResult & {
    ratePlanCount: number;
    lastRatePushAt: string | null;
    ratePushCount: number;
    hoursSince: number | null;
  };
  reservationImport: OtaFlowResult & {
    lastOtaBookingAt: string | null;
    lastOtaBookingSource: string | null;
    totalOtaBookings: number;
    lastReservLogAt: string | null;
  };
  webhook: OtaFlowResult & {
    webhookSecretConfigured: boolean;
    lastInboundAt: string | null;
    inboundCount: number;
    lastEventType: string | null;
    webhookPath: string;
  };
}

interface InventoryConsistencyResult {
  status: "pass" | "warning" | "fail";
  datesChecked: number;
  mismatches: number;
  mismatchDetails: { roomType: string; date: string; hostezee: number; aiosell: number }[];
  checkedAt: string;
  fromCache: boolean;
  hasPushData: boolean;
  note: string;
}

interface ReconRoomResult {
  roomType: string;
  isDormitory: boolean;
  totalInventory: number;
  otaBookings: { count: number; breakdown: Record<string, number> };
  offlineBookings: { count: number; breakdown: Record<string, number> };
  blockedRooms: number;
  availableInventory: number;
  balanced: boolean;
}
interface ReconciliationResult {
  date: string;
  propertyId: number;
  overallStatus: "pass" | "warning" | "fail";
  reconciliation: ReconRoomResult[];
  checkedAt: string;
  fromCache: boolean;
}

// ── Source display config ──────────────────────────────────────────────────────
const OTA_LABELS: Record<string, string> = {
  bookingCom: "Booking.com", agoda: "Agoda", mmt: "MMT", goibibo: "Goibibo",
  expedia: "Expedia", airbnb: "Airbnb", otaOther: "OTA",
};
const OFFLINE_LABELS: Record<string, string> = {
  walkIn: "Walk-in", phone: "Phone", whatsapp: "WhatsApp", directWebsite: "Direct/Website",
  reception: "Reception", corporate: "Corporate", travelAgent: "Travel Agent",
  direct: "Direct", other: "Other",
};
const OTA_COLORS: Record<string, string> = {
  bookingCom: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  agoda: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  mmt: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  goibibo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  expedia: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  airbnb: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  otaOther: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};
const OFFLINE_COLORS: Record<string, string> = {
  walkIn: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  phone: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  whatsapp: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  directWebsite: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  direct: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  reception: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  corporate: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  travelAgent: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function SourceBadge({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {label}
      <span className="font-bold">{count}</span>
    </span>
  );
}

function ReconciliationCard({ room }: { room: ReconRoomResult }) {
  const unit = room.isDormitory ? "beds" : "rooms";
  const formulaLHS = room.totalInventory;
  const formulaRHS = `${room.otaBookings.count} + ${room.offlineBookings.count} + ${room.blockedRooms} + ${room.availableInventory}`;
  const formulaOk = room.balanced;

  return (
    <Card className={`border-l-4 ${formulaOk ? "border-l-emerald-500" : "border-l-red-500"}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{room.roomType}</CardTitle>
            {room.isDormitory && <span className="text-[10px] text-muted-foreground">Dormitory · beds</span>}
          </div>
          {formulaOk
            ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5"><CheckCircle className="h-3 w-3" />PASS</span>
            : <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5"><XCircle className="h-3 w-3" />FAIL</span>}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Formula strip */}
        <div className={`rounded-md px-3 py-2 text-xs font-mono font-medium ${formulaOk ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300" : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"}`}>
          {formulaLHS} {formulaOk ? "=" : "≠"} {formulaRHS}
          <span className="ml-2 font-sans font-normal text-[10px] opacity-70">
            (total {formulaOk ? "=" : "≠"} OTA + Offline + Blocked + Available)
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Total Inventory</span>
            <span className="font-bold text-sm">{room.totalInventory} {unit}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Blocked Rooms</span>
            <span className={`font-semibold text-sm ${room.blockedRooms > 0 ? "text-orange-600 dark:text-orange-400" : ""}`}>{room.blockedRooms}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">OTA Bookings</span>
            <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">{room.otaBookings.count}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Available</span>
            <span className={`font-bold text-sm ${room.availableInventory < 0 ? "text-red-600 dark:text-red-400" : room.availableInventory === 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
              {room.availableInventory}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Offline Bookings</span>
            <span className="font-semibold text-sm text-violet-700 dark:text-violet-400">{room.offlineBookings.count}</span>
          </div>
        </div>

        {/* Source badges */}
        {(Object.keys(room.otaBookings.breakdown).length > 0 || Object.keys(room.offlineBookings.breakdown).length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.entries(room.otaBookings.breakdown).map(([k, v]) => (
              <SourceBadge key={k} label={OTA_LABELS[k] || k} color={OTA_COLORS[k] || OTA_COLORS.otaOther} count={v} />
            ))}
            {Object.entries(room.offlineBookings.breakdown).map(([k, v]) => (
              <SourceBadge key={k} label={OFFLINE_LABELS[k] || k} color={OFFLINE_COLORS[k] || OFFLINE_COLORS.other} count={v} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InventoryReconciliationTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = async (dateVal?: string) => {
    const d = dateVal ?? date;
    setIsRunning(true);
    try {
      const res = await fetch(`/api/inventory/reconciliation?propertyId=${propertyId}&date=${d}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err: any) {
      toast({ title: "Reconciliation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const passCount = result?.reconciliation.filter(r => r.balanced).length ?? 0;
  const failCount = result?.reconciliation.filter(r => !r.balanced).length ?? 0;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2"><Scale className="h-4 w-4 text-teal-600" />Inventory Reconciliation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">See exactly how room availability is calculated for any date — OTA, offline, blocked, and free inventory all in one view.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="date"
            value={date}
            max={new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0]}
            onChange={e => { setDate(e.target.value); setResult(null); }}
            data-testid="input-recon-date"
            className="rounded-md border bg-background text-sm px-3 py-1.5 h-9 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => run()}
            disabled={isRunning || !date}
            data-testid="button-run-reconciliation"
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors h-9"
          >
            {isRunning ? <><Loader2 className="h-4 w-4 animate-spin" />Running…</> : <><Scale className="h-4 w-4" />Run</>}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {result && (
        <div className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${
          result.overallStatus === "pass"
            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
            : result.overallStatus === "warning"
              ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
              : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
        }`}>
          <div className="flex items-center gap-2">
            {result.overallStatus === "pass"
              ? <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
            <span className={`text-sm font-bold uppercase tracking-wide ${result.overallStatus === "pass" ? "text-emerald-700 dark:text-emerald-400" : result.overallStatus === "warning" ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"}`}>
              {result.overallStatus === "pass" ? "All Balanced" : result.overallStatus === "warning" ? "Minor Issues" : "Imbalanced"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs ml-2">
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">{passCount} PASS</span>
            {failCount > 0 && <span className="text-red-700 dark:text-red-400 font-medium">{failCount} FAIL</span>}
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {format(parseISO(result.date), "dd MMM yyyy")}
            {result.fromCache && <span className="ml-1.5 bg-muted text-[10px] px-1.5 py-0.5 rounded-full">cached</span>}
          </span>
        </div>
      )}

      {/* Cards grid */}
      {result && result.reconciliation.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {result.reconciliation.map(r => <ReconciliationCard key={r.roomType} room={r} />)}
        </div>
      )}

      {/* Empty state */}
      {!result && !isRunning && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
          <Scale className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Pick a date and click Run</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Breakdown shows OTA + Offline + Blocked + Available for each room type</p>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Formula</p>
        <p className="text-xs text-muted-foreground font-mono">Total Inventory = OTA Bookings + Offline Bookings + Blocked Rooms + Available</p>
        <p className="text-[10px] text-muted-foreground mt-1">🟢 PASS — formula balances (available ≥ 0)&nbsp;&nbsp;·&nbsp;&nbsp;🔴 FAIL — more bookings/blocks than rooms (available &lt; 0)</p>
      </div>
    </div>
  );
}

function otaStatusColor(s: OtaStatus) {
  if (s === "pass") return "text-emerald-600 dark:text-emerald-400";
  if (s === "warn") return "text-amber-600 dark:text-amber-400";
  if (s === "fail") return "text-red-600 dark:text-red-400";
  return "text-blue-600 dark:text-blue-400";
}
function otaStatusBg(s: OtaStatus) {
  if (s === "pass") return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800";
  if (s === "warn") return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800";
  if (s === "fail") return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
  return "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800";
}
function OtaStatusIcon({ s }: { s: OtaStatus }) {
  if (s === "pass") return <CheckCircle className="h-5 w-5 text-emerald-500" />;
  if (s === "warn") return <AlertCircle className="h-5 w-5 text-amber-500" />;
  if (s === "fail") return <AlertCircle className="h-5 w-5 text-red-500" />;
  return <Activity className="h-5 w-5 text-blue-500" />;
}
function OtaBadge({ s }: { s: OtaStatus }) {
  const map: Record<OtaStatus, string> = {
    pass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    warn: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    fail: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  };
  const label: Record<OtaStatus, string> = { pass: "PASS", warn: "WARN", fail: "FAIL", info: "INFO" };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[s]}`}>{label[s]}</span>
  );
}

function FlowNode({ label, emoji, status }: { label: string; emoji: string; status?: OtaStatus }) {
  const border = status ? otaStatusBg(status) : "bg-muted border-border";
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border px-3 py-2 min-w-[90px] text-center ${border}`}>
      <span className="text-lg">{emoji}</span>
      <span className="text-xs font-semibold mt-0.5 leading-tight">{label}</span>
      {status && <OtaBadge s={status} />}
    </div>
  );
}

function FlowArrow({ status, label }: { status?: OtaStatus; label?: string }) {
  const color = status === "pass" ? "border-emerald-400" : status === "warn" ? "border-amber-400" : status === "fail" ? "border-red-400" : "border-muted-foreground/30";
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-w-[32px]">
      <div className={`w-full border-t-2 border-dashed ${color}`} />
      {label && <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{label}</span>}
    </div>
  );
}

function OtaTestTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [result, setResult] = useState<OtaTestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [consistency, setConsistency] = useState<InventoryConsistencyResult | null>(null);
  const [isRunningConsistency, setIsRunningConsistency] = useState(false);

  const runTest = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(`/api/aiosell/ota-test?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err: any) {
      toast({ title: "E2E Test failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const runConsistencyCheck = async () => {
    setIsRunningConsistency(true);
    try {
      const res = await fetch(`/api/aiosell/inventory-consistency?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      setConsistency(await res.json());
    } catch (err: any) {
      toast({ title: "Consistency check failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRunningConsistency(false);
    }
  };

  const fmtTs = (ts: string | null) =>
    ts ? format(parseISO(ts), "dd MMM yyyy HH:mm") : "Never";

  const overall: OtaStatus | null = result
    ? (["fail", "warn", "info", "pass"] as OtaStatus[]).find(s =>
        [result.inventoryFlow.status, result.rateFlow.status, result.reservationImport.status, result.webhook.status].includes(s),
      ) ?? "pass"
    : null;

  return (
    <div className="space-y-4 py-2">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TestTube2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            End-to-End OTA Test
          </CardTitle>
          <CardDescription>
            Verifies all 4 communication legs of the OTA distribution chain using historical data. No live API calls — read-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Flow diagram */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outbound Flow (Inventory &amp; Rates)</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <FlowNode label="Hostezee" emoji="🏨" status={result ? (result.inventoryFlow.status === "pass" && result.rateFlow.status === "pass" ? "pass" : result.inventoryFlow.status === "fail" || result.rateFlow.status === "fail" ? "fail" : "warn") : undefined} />
              <FlowArrow status={result?.inventoryFlow.status} label="inventory" />
              <FlowNode label="AioSell" emoji="📡" status={result ? result.inventoryFlow.status : undefined} />
              <FlowArrow status={result?.rateFlow.status} label="rates" />
              <FlowNode label="OTAs" emoji="🌐" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">Inbound Flow (Reservations)</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <FlowNode label="OTAs" emoji="🌐" />
              <FlowArrow status={result?.reservationImport.status} label="booking" />
              <FlowNode label="AioSell" emoji="📡" status={result?.webhook.status} />
              <FlowArrow status={result?.webhook.status} label="webhook" />
              <FlowNode label="Hostezee" emoji="🏨" status={result?.webhook.status} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runTest}
              disabled={isRunning}
              data-testid="button-run-ota-test"
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              {isRunning
                ? <><Loader2 className="h-4 w-4 animate-spin" />Running test…</>
                : <><TestTube2 className="h-4 w-4" />Run E2E Test</>}
            </button>
            {result && (
              <span className="text-xs text-muted-foreground">
                Tested {format(parseISO(result.testedAt), "dd MMM HH:mm")}
                {overall && <> · Overall: <span className={`font-semibold ${otaStatusColor(overall)}`}>{overall.toUpperCase()}</span></>}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test result cards */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Inventory Flow */}
          <Card className={`border ${otaStatusBg(result.inventoryFlow.status)}`}>
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <OtaStatusIcon s={result.inventoryFlow.status} />
                  Inventory Flow
                </CardTitle>
                <OtaBadge s={result.inventoryFlow.status} />
              </div>
              <CardDescription className="text-xs">Hostezee → AioSell (outbound)</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Last Push</span>
                <span className="font-medium text-xs">{fmtTs(result.inventoryFlow.lastSuccessAt)}</span>
              </div>
              {result.inventoryFlow.hoursSince !== null && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground text-xs">Freshness</span>
                  <span className="font-medium text-xs">{result.inventoryFlow.hoursSince}h ago</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Push Count</span>
                <span className="font-medium text-xs">{result.inventoryFlow.pushCount}</span>
              </div>
              {result.inventoryFlow.failCount7d > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground text-xs">Failures (7d)</span>
                  <span className="font-medium text-xs text-red-600">{result.inventoryFlow.failCount7d}</span>
                </div>
              )}
              <p className={`text-xs mt-1 ${otaStatusColor(result.inventoryFlow.status)}`}>{result.inventoryFlow.detail}</p>
            </CardContent>
          </Card>

          {/* 2. Rate Flow */}
          <Card className={`border ${otaStatusBg(result.rateFlow.status)}`}>
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <OtaStatusIcon s={result.rateFlow.status} />
                  Rate Flow
                </CardTitle>
                <OtaBadge s={result.rateFlow.status} />
              </div>
              <CardDescription className="text-xs">Hostezee → AioSell → OTAs</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Rate Plans</span>
                <span className="font-medium text-xs">{result.rateFlow.ratePlanCount}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Last Rate Push</span>
                <span className="font-medium text-xs">{fmtTs(result.rateFlow.lastRatePushAt)}</span>
              </div>
              {result.rateFlow.hoursSince !== null && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground text-xs">Freshness</span>
                  <span className="font-medium text-xs">{result.rateFlow.hoursSince}h ago</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Push Count</span>
                <span className="font-medium text-xs">{result.rateFlow.ratePushCount}</span>
              </div>
              <p className={`text-xs mt-1 ${otaStatusColor(result.rateFlow.status)}`}>{result.rateFlow.detail}</p>
            </CardContent>
          </Card>

          {/* 3. Reservation Import */}
          <Card className={`border ${otaStatusBg(result.reservationImport.status)}`}>
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <OtaStatusIcon s={result.reservationImport.status} />
                  Reservation Import
                </CardTitle>
                <OtaBadge s={result.reservationImport.status} />
              </div>
              <CardDescription className="text-xs">OTA → AioSell → Hostezee (inbound)</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Total OTA Bookings</span>
                <span className="font-medium text-xs">{result.reservationImport.totalOtaBookings}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Last OTA Booking</span>
                <span className="font-medium text-xs">{fmtTs(result.reservationImport.lastOtaBookingAt)}</span>
              </div>
              {result.reservationImport.lastOtaBookingSource && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground text-xs">Booking Source</span>
                  <span className="font-medium text-xs">{result.reservationImport.lastOtaBookingSource}</span>
                </div>
              )}
              <p className={`text-xs mt-1 ${otaStatusColor(result.reservationImport.status)}`}>{result.reservationImport.detail}</p>
            </CardContent>
          </Card>

          {/* 4. Webhook Connection */}
          <Card className={`border ${otaStatusBg(result.webhook.status)}`}>
            <CardHeader className="pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <OtaStatusIcon s={result.webhook.status} />
                  Webhook Connection
                </CardTitle>
                <OtaBadge s={result.webhook.status} />
              </div>
              <CardDescription className="text-xs">AioSell → Hostezee (inbound events)</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Events Received</span>
                <span className="font-medium text-xs">{result.webhook.inboundCount}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Last Event</span>
                <span className="font-medium text-xs">{fmtTs(result.webhook.lastInboundAt)}</span>
              </div>
              {result.webhook.lastEventType && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground text-xs">Event Type</span>
                  <span className="font-medium text-xs">{result.webhook.lastEventType}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">Webhook Path</span>
                <span className="font-medium text-xs font-mono">{result.webhook.webhookPath}</span>
              </div>
              <p className={`text-xs mt-1 ${otaStatusColor(result.webhook.status)}`}>{result.webhook.detail}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Inventory Consistency Test ───────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Inventory Consistency Test
          </CardTitle>
          <CardDescription>
            Compares Hostezee live availability against the last push sent to AioSell, day-by-day for the next 30 days. Identifies mismatches before they affect OTA bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={runConsistencyCheck}
              disabled={isRunningConsistency}
              data-testid="button-run-consistency-check"
              className="inline-flex items-center gap-2 rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              {isRunningConsistency
                ? <><Loader2 className="h-4 w-4 animate-spin" />Checking…</>
                : <><BarChart2 className="h-4 w-4" />Run Consistency Check</>}
            </button>
            {consistency && (
              <span className="text-xs text-muted-foreground">
                Checked {format(parseISO(consistency.checkedAt), "dd MMM HH:mm")}
                {consistency.fromCache && <span className="ml-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-full">cached</span>}
              </span>
            )}
          </div>

          {consistency && (
            <div className="space-y-3">
              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-center">
                  <div className="text-lg font-bold">{consistency.datesChecked}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Dates Checked</div>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-center">
                  <div className={`text-lg font-bold ${consistency.mismatches === 0 ? "text-emerald-600 dark:text-emerald-400" : consistency.mismatches <= 5 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {consistency.mismatches}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Mismatches</div>
                </div>
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-center">
                  <div className={`text-lg font-bold ${consistency.status === "pass" ? "text-emerald-600 dark:text-emerald-400" : consistency.status === "warning" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {consistency.status === "pass" ? "🟢" : consistency.status === "warning" ? "🟡" : "🔴"}
                  </div>
                  <div className={`text-xs font-bold mt-0.5 ${consistency.status === "pass" ? "text-emerald-600 dark:text-emerald-400" : consistency.status === "warning" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {consistency.status.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Summary banner */}
              <div className={`rounded-md px-3 py-2 text-sm font-medium ${
                consistency.status === "pass"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                  : consistency.status === "warning"
                    ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
                    : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
              }`}>
                {consistency.status === "pass"
                  ? "Hostezee and AioSell inventory are fully synchronized."
                  : consistency.status === "warning"
                    ? "Minor inventory inconsistencies detected. Review mismatches and push a fresh inventory update."
                    : "Inventory mismatch detected. OTA availability may be inaccurate. Push inventory immediately."}
              </div>

              {/* OTA Health contribution */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  OTA Health contribution:&nbsp;
                  <span className={`font-semibold ${consistency.status === "pass" ? "text-emerald-600 dark:text-emerald-400" : consistency.status === "fail" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    {consistency.status === "pass" ? "+10 pts" : consistency.status === "fail" ? "−10 pts" : "0 pts"}
                  </span>
                </span>
                <span className="text-[10px] opacity-60">· {consistency.note}</span>
              </div>

              {/* Mismatch table */}
              {consistency.mismatchDetails.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mismatch Details</p>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs py-2">Room Type</TableHead>
                          <TableHead className="text-xs py-2">Date</TableHead>
                          <TableHead className="text-xs py-2 text-right">Hostezee</TableHead>
                          <TableHead className="text-xs py-2 text-right">AioSell</TableHead>
                          <TableHead className="text-xs py-2 text-right">Gap</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consistency.mismatchDetails.map((m, i) => (
                          <TableRow key={i} data-testid={`row-mismatch-${i}`}>
                            <TableCell className="text-xs py-1.5 font-medium">{m.roomType}</TableCell>
                            <TableCell className="text-xs py-1.5 font-mono">
                              {format(parseISO(m.date), "dd-MMM")}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right">{m.hostezee}</TableCell>
                            <TableCell className="text-xs py-1.5 text-right">{m.aiosell}</TableCell>
                            <TableCell className={`text-xs py-1.5 text-right font-semibold ${m.hostezee > m.aiosell ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                              {m.hostezee > m.aiosell ? `+${m.hostezee - m.aiosell}` : `${m.hostezee - m.aiosell}`}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {consistency.mismatches > consistency.mismatchDetails.length && (
                    <p className="text-xs text-muted-foreground">Showing first {consistency.mismatchDetails.length} of {consistency.mismatches} mismatches.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── AI Investigator ───────────────────────────────────────────────────────────
interface InvestigatorResult {
  status: "critical" | "warning" | "healthy";
  rootCause: string;
  evidence: string[];
  businessImpact: string;
  recommendedFix: string;
  quickActions: { label: string; action: string }[];
  confidenceScore: number;
  summary: string;
  contextUsed: {
    auditScore: number;
    reconciliationChecked: boolean;
    consistencyChecked: boolean;
    syncLogsFetched: number;
  };
  generatedAt: string;
}

const INVESTIGATOR_PRESETS = [
  "Why is inventory different on OTA vs Hostezee?",
  "Why is this room showing unavailable?",
  "Why is OTA inventory stale?",
  "Why are bookings not syncing from OTA?",
  "Is my room mapping correct?",
  "What caused the last sync failure?",
];

function AIInvestigatorTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];
  const [question, setQuestion] = useState(INVESTIGATOR_PRESETS[0]);
  const [roomType, setRoomType] = useState("");
  const [date, setDate] = useState(todayStr);
  const [result, setResult] = useState<InvestigatorResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const investigate = async () => {
    if (!question.trim()) return;
    setIsRunning(true);
    try {
      const res = await apiRequest("/api/ai-investigator", "POST", {
        propertyId,
        question: question.trim(),
        roomType: roomType.trim() || undefined,
        date,
      });
      setResult(await res.json());
    } catch (err: any) {
      toast({ title: "Investigation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const tabMap: Record<string, string> = {
      "sync-inventory":    "push-inventory",
      "open-room-mapping": "room-mapping",
      "open-rate-plans":   "rate-plans",
      "open-sync-logs":    "logs",
      "open-reconciliation": "reconciliation",
    };
    const target = tabMap[action];
    if (target) {
      const btn = document.querySelector(`[data-testid="tab-${target}"]`) as HTMLButtonElement | null;
      if (btn) btn.click();
    }
  };

  const statusConfig = {
    critical: {
      border: "border-red-500",
      bg: "bg-red-50 dark:bg-red-950/30",
      icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
      label: "🔴 Critical",
      labelClass: "text-red-700 dark:text-red-400",
      badgeCls: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700",
    },
    warning: {
      border: "border-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      icon: <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      label: "🟡 Warning",
      labelClass: "text-amber-700 dark:text-amber-400",
      badgeCls: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    },
    healthy: {
      border: "border-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      icon: <BadgeCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      label: "🟢 Healthy",
      labelClass: "text-emerald-700 dark:text-emerald-400",
      badgeCls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
    },
  };

  const quickActionLabels: Record<string, string> = {
    "sync-inventory":    "Run Inventory Sync",
    "open-room-mapping": "Open Room Mapping",
    "open-rate-plans":   "Open Rate Plans",
    "open-sync-logs":    "View Sync Logs",
    "open-reconciliation": "View Reconciliation",
  };

  const sc = result ? (statusConfig[result.status] ?? statusConfig.warning) : null;

  return (
    <div className="space-y-4 p-4">
      {/* Input card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            AI Inventory Investigator
          </CardTitle>
          <CardDescription>
            Ask any inventory or OTA sync question. The AI automatically collects audit data, sync logs, bookings, and room mappings — then explains the root cause in plain English.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset chips */}
          <div className="flex flex-wrap gap-2">
            {INVESTIGATOR_PRESETS.map(q => (
              <button
                key={q}
                onClick={() => setQuestion(q)}
                data-testid={`preset-inv-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  question === q
                    ? "bg-violet-100 border-violet-400 text-violet-800 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-600"
                    : "border-border hover:bg-muted"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Optional filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Room Type (optional)</label>
              <input
                type="text"
                value={roomType}
                onChange={e => setRoomType(e.target.value)}
                placeholder="e.g. Deluxe Room"
                data-testid="input-inv-room-type"
                className="w-full rounded-md border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                data-testid="input-inv-date"
                className="w-full rounded-md border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Question input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Your question</label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={2}
              placeholder="Describe the issue or ask a specific question…"
              data-testid="input-inv-question"
              className="w-full rounded-md border bg-background text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          <button
            onClick={investigate}
            disabled={isRunning || !question.trim()}
            data-testid="button-run-investigation"
            className="inline-flex items-center gap-2 rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 transition-colors"
          >
            {isRunning
              ? <><Loader2 className="h-4 w-4 animate-spin" />Investigating…</>
              : <><Zap className="h-4 w-4" />Run Investigation</>}
          </button>
        </CardContent>
      </Card>

      {/* Result card */}
      {result && sc && (
        <Card className={`border-l-4 ${sc.border}`}>
          <CardHeader className={`rounded-t-xl pb-3 ${sc.bg}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {sc.icon}
                <CardTitle className={`text-base font-bold ${sc.labelClass}`}>
                  Investigation Complete — {sc.label.split(" ").slice(1).join(" ")}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${sc.badgeCls}`}>
                  {sc.label}
                </span>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-background">
                  <BadgeCheck className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Confidence:</span>
                  <span className={`font-bold ${result.confidenceScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : result.confidenceScore >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {result.confidenceScore}%
                  </span>
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{result.summary}</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {/* Root Cause */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> Root Cause
              </h3>
              <p className="text-sm font-medium">{result.rootCause}</p>
            </div>

            {/* Evidence */}
            {result.evidence?.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Evidence
                </h3>
                <ul className="space-y-1">
                  {result.evidence.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                      <span className="text-muted-foreground">{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Business Impact */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Hotel className="h-3.5 w-3.5" /> Business Impact
              </h3>
              <p className="text-sm text-muted-foreground">{result.businessImpact}</p>
            </div>

            {/* Recommended Fix */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Recommended Fix
              </h3>
              <div className="rounded-md bg-muted/40 border px-4 py-3">
                {result.recommendedFix.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i} className="text-sm text-foreground leading-relaxed">{line}</p>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            {result.quickActions?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-violet-500" /> Quick Actions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.quickActions.map((qa, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickAction(qa.action)}
                      data-testid={`qa-btn-${qa.action}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-xs font-medium px-3 py-1.5 transition-colors"
                    >
                      <Zap className="h-3 w-3" />
                      {qa.label || quickActionLabels[qa.action] || qa.action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Context footer */}
            <div className="pt-1 border-t flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>Audit score: <strong>{result.contextUsed.auditScore}%</strong></span>
              <span>Sync logs: <strong>{result.contextUsed.syncLogsFetched}</strong></span>
              <span>Reconciliation: <strong>{result.contextUsed.reconciliationChecked ? "✓" : "—"}</strong></span>
              <span>Consistency: <strong>{result.contextUsed.consistencyChecked ? "✓" : "—"}</strong></span>
              <span className="ml-auto">
                {format(parseISO(result.generatedAt), "dd MMM HH:mm")}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!result && !isRunning && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
          <Bot className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Select a preset or type your question</p>
          <p className="text-xs text-muted-foreground/70 mt-1">AI will auto-collect audit, sync logs, bookings, and mapping data before answering</p>
        </div>
      )}
    </div>
  );
}

// ── AI Auditor ────────────────────────────────────────────────────────────────
interface AiAuditResult {
  propertyName: string;
  healthScore: number;
  overallStatus: string;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  sections: AuditSectionType[];
  aiAnalysis: {
    rootCause: string;
    impact: string;
    priority: string;
    recommendedFix: string;
    summary: string;
  };
  question: string;
  generatedAt: string;
  usedCachedAudit: boolean;
}

const AI_PRESET_QUESTIONS = [
  "What should I fix first?",
  "Why is inventory stale?",
  "Why are rates not syncing?",
  "Which room types are missing rate plans?",
  "Show all critical issues",
  "Why is connectivity failing?",
];

function buildDiagnosticText(result: AiAuditResult): string {
  const statusTag = (s: string) =>
    s === "healthy" ? "PASS" : s === "attention" ? "WARN" : s.toUpperCase();
  const findCheckValue = (sectionName: string, checkLabel: string): string => {
    const sec = result.sections.find(s => s.name === sectionName);
    if (!sec) return "N/A";
    const chk = sec.checks.find(c => c.label === checkLabel);
    return chk ? String(chk.value ?? chk.detail ?? "N/A") : "N/A";
  };
  const SEP  = "=".repeat(52);
  const DASH = "-".repeat(40);
  const now  = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const lines: string[] = [];
  const L = (s = "") => lines.push(s);

  L(SEP); L("HOSTEZEE — DIAGNOSTIC REPORT"); L(SEP);
  L(`Property   : ${result.propertyName}`);
  L(`Health     : ${result.healthScore}%  (${statusTag(result.overallStatus)})`);
  L(`Generated  : ${now}`);
  L();

  L("SECTION SCORES"); L(DASH);
  for (const s of result.sections) {
    L(`${s.name.padEnd(30)} ${`${s.score}/${s.maxScore}`.padStart(6)}  [${statusTag(s.status)}]`);
  }
  L();

  const configSection = result.sections.find(s => s.key === "configuration");
  const mappingSection = result.sections.find(s => s.key === "roomMapping");
  const invSection    = result.sections.find(s => s.key === "inventorySync");
  const rateSection   = result.sections.find(s => s.key === "ratePlans");
  const otaSection    = result.sections.find(s => s.key === "otaStatus");
  const logSection    = result.sections.find(s => s.key === "syncLogs");

  const sectionStatus = (sec?: AuditSectionType) => sec ? `${statusTag(sec.status)}  (${sec.score}/${sec.maxScore})` : "N/A";
  L("CONFIGURATION STATUS"); L(DASH);
  L(`  Property Configuration : ${sectionStatus(configSection)}`);
  L(`  Room Mapping           : ${sectionStatus(mappingSection)}`);
  L(`  Inventory Sync         : ${sectionStatus(invSection)}`);
  L(`  Rate Plans             : ${sectionStatus(rateSection)}`);
  L(`  OTA Status             : ${sectionStatus(otaSection)}`);
  L(`  Sync Logs              : ${sectionStatus(logSection)}`);
  L();

  L("LAST PUSHES"); L(DASH);
  L(`  Last Inventory Push : ${findCheckValue("Inventory Sync", "Last Inventory Push")}`);
  L(`  Last Rate Push      : ${findCheckValue("Rate Plans", "Last Rate Push")}`);
  L();

  if (result.criticalIssues.length) {
    L(`CRITICAL ISSUES  (${result.criticalIssues.length})`); L(DASH);
    result.criticalIssues.forEach(i => L(`  • ${i}`)); L();
  }
  if (result.warnings.length) {
    L(`WARNINGS  (${result.warnings.length})`); L(DASH);
    result.warnings.forEach(w => L(`  • ${w}`)); L();
  }
  if (result.recommendations.length) {
    L("RECOMMENDATIONS"); L(DASH);
    result.recommendations.forEach((r, i) => L(`  ${i + 1}. ${r}`)); L();
  }

  const failedSections = result.sections.filter(s =>
    s.checks.some(c => c.status === "fail" || c.status === "warn"),
  );
  if (failedSections.length) {
    L("ISSUES DETAIL"); L(DASH);
    for (const sec of failedSections) {
      L(`[${sec.name} — ${statusTag(sec.status)} — ${sec.score}/${sec.maxScore}]`);
      sec.checks
        .filter(c => c.status === "fail" || c.status === "warn")
        .forEach(c => L(`  ${c.status === "fail" ? "✗" : "⚠"} ${c.label}: ${c.detail}`));
      L();
    }
  }

  L(SEP); L("Generated by Hostezee AI Auditor · hostezee.in"); L(SEP);
  return lines.join("\n");
}

function AIAuditorTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [question, setQuestion] = useState("What should I fix first?");
  const [result, setResult] = useState<AiAuditResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyReport = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildDiagnosticText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast({ title: "Copied!", description: "Diagnostic report copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Use Ctrl+C on the text area below.", variant: "destructive" });
    }
  };

  const exportPackage = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/aiosell/diagnostic-package?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const slug = (result?.propertyName ?? "property").replace(/\s+/g, "-").toLowerCase();
      a.href     = url;
      a.download = `hostezee-diagnostic-${slug}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/aiosell/ai-audit", "POST", { propertyId, question });
      return res.json() as Promise<AiAuditResult>;
    },
    onSuccess: (data) => setResult(data),
    onError: (err: any) => toast({ title: "AI Audit failed", description: err.message, variant: "destructive" }),
  });

  const priorityClasses = (p: string) => {
    switch ((p || "").toLowerCase()) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800";
      case "high":     return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      case "medium":   return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      default:         return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
  };
  const scoreClasses = (s: number) =>
    s >= 80 ? "text-green-600 dark:text-green-400" :
    s >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-4 py-2">
      {/* Query Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            AI Channel Manager Auditor
          </CardTitle>
          <CardDescription>
            Ask a question about this property's AioSell health. The AI analyzes the latest audit data and explains issues in plain English. Advisory only — it cannot modify anything.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {AI_PRESET_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => setQuestion(q)}
                data-testid={`preset-question-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  question === q
                    ? "bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-600"
                    : "border-border hover:bg-muted"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <textarea
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            placeholder="Or type your own question…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            data-testid="input-ai-question"
          />
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !question.trim()}
            className="gap-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
            data-testid="button-ai-analyze"
          >
            {mutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</>
              : <><Sparkles className="h-4 w-4" />Analyze with AI</>}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyReport}
              className="gap-1.5"
              data-testid="button-copy-diagnostic-report"
            >
              {copied
                ? <><CheckCircle className="h-4 w-4 text-green-600" />Copied!</>
                : <><Copy className="h-4 w-4" />Copy Diagnostic Report</>}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportPackage}
              disabled={isExporting}
              className="gap-1.5"
              data-testid="button-export-diagnostic-package"
            >
              {isExporting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Exporting…</>
                : <><Package className="h-4 w-4" />Export Diagnostic Package</>}
            </Button>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <div className={`text-4xl font-bold ${scoreClasses(result.healthScore)}`}>{result.healthScore}%</div>
                <div className="text-xs text-muted-foreground mt-1">Health Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-4xl font-bold text-red-600 dark:text-red-400">{result.criticalIssues.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Critical Issues</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{result.warnings.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Warnings</div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis card */}
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  AI Analysis
                </CardTitle>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${priorityClasses(result.aiAnalysis.priority)}`}>
                  {result.aiAnalysis.priority} Priority
                </span>
              </div>
              <CardDescription className="text-xs">
                Q: &ldquo;{result.question}&rdquo;
                {result.usedCachedAudit && <span className="ml-2 text-muted-foreground">(used cached audit)</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
                <p className="leading-relaxed">{result.aiAnalysis.summary}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Root Cause</p>
                <p className="leading-relaxed">{result.aiAnalysis.rootCause}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Business Impact</p>
                <p className="leading-relaxed">{result.aiAnalysis.impact}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Recommended Fix</p>
                <p className="leading-relaxed whitespace-pre-line">{result.aiAnalysis.recommendedFix}</p>
              </div>
            </CardContent>
          </Card>

          {/* Critical Issues */}
          {result.criticalIssues.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  Critical Issues ({result.criticalIssues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.criticalIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  Warnings ({result.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <CheckCircle className="h-4 w-4" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-blue-500 font-bold flex-shrink-0">{i + 1}.</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ConnectionHealthCard({ propertyId }: { propertyId: number }) {
  const { data: config } = useQuery<AiosellConfig | null>({
    queryKey: ["/api/aiosell/config", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/config?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!propertyId,
  });

  const { data: mappings = [] } = useQuery<RoomMapping[]>({
    queryKey: ["/api/aiosell/room-mappings", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/room-mappings?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId && !!config,
  });

  const { data: ratePlans = [] } = useQuery<RatePlan[]>({
    queryKey: ["/api/aiosell/rate-plans", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/rate-plans?propertyId=${propertyId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!propertyId && !!config,
  });

  const configOk = !!(config?.hotelCode && config?.pmsName);

  const { data: connTest, isLoading: connTestLoading } = useQuery<{ success: boolean; message: string }>({
    queryKey: ["/api/aiosell/test-connection", propertyId],
    queryFn: async () => {
      const res = await fetch("/api/aiosell/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ propertyId }),
      });
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { success: false, message: "Server returned unexpected response" }; }
    },
    enabled: configOk && !!propertyId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  if (!propertyId) return null;

  const mappingsOk = mappings.length > 0;
  const unlinkedPlans = ratePlans.filter(rp => !mappings.find(m => m.id === rp.roomMappingId));
  const ratePlansOk = ratePlans.length > 0 && unlinkedPlans.length === 0;
  const inventoryReady = configOk && mappingsOk;
  const ratesReady = configOk && mappingsOk && ratePlansOk;
  const authOk = !configOk ? true : connTestLoading ? true : !!connTest?.success;
  const allOk = inventoryReady && ratesReady && authOk;

  const authDetail = () => {
    if (!configOk) return "Requires AioSell config first";
    if (connTestLoading) return "Testing live connection…";
    if (!connTest) return "Could not test — check network";
    if (connTest.success) return "AioSell authentication OK";
    // Show the exact diagnostic from testConnection — it already contains specific guidance
    return connTest.message || "Connection failed";
  };

  const checks = [
    {
      label: "AioSell Config",
      ok: configOk,
      loading: false,
      detail: configOk ? `Hotel: ${config?.hotelCode}` : "Go to Settings tab and save Hotel Code + PMS Name",
    },
    {
      label: "Room Mappings",
      ok: mappingsOk,
      loading: false,
      detail: mappingsOk ? `${mappings.length} room${mappings.length !== 1 ? "s" : ""} mapped to AioSell` : "Go to Room Mapping tab and link your rooms",
    },
    {
      label: "Rate Plans",
      ok: ratePlansOk,
      loading: false,
      detail: !config ? "Requires AioSell config first"
        : ratePlans.length === 0 ? "Go to Rate Plans tab and add rate plans"
        : unlinkedPlans.length > 0 ? `${unlinkedPlans.length} plan${unlinkedPlans.length !== 1 ? "s" : ""} not linked to a room — fix in Rate Plans tab`
        : `${ratePlans.length} plan${ratePlans.length !== 1 ? "s" : ""} linked and ready`,
    },
    {
      label: "AioSell Auth",
      ok: !configOk ? true : connTestLoading ? true : !!connTest?.success,
      loading: configOk && connTestLoading,
      detail: authDetail(),
    },
    {
      label: "Push Inventory",
      ok: inventoryReady,
      loading: false,
      detail: inventoryReady ? "Ready — room availability can be pushed to OTAs" : "Fix issues above first",
    },
    {
      label: "Push Rates",
      ok: ratesReady,
      loading: false,
      detail: ratesReady ? "Ready — rates can be pushed to OTAs" : "Fix issues above first",
    },
  ];

  const statusLabel = allOk && !connTestLoading ? "All systems ready" : !allOk ? "Action required" : "Checking…";
  const statusColor = allOk && !connTestLoading ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    : connTestLoading ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";

  return (
    <Card className={allOk && !connTestLoading ? "border-green-200 dark:border-green-800" : "border-yellow-200 dark:border-yellow-800"} data-testid="card-connection-health">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {allOk && !connTestLoading
            ? <CheckCircle className="h-4 w-4 text-green-500" />
            : connTestLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            : <AlertCircle className="h-4 w-4 text-yellow-500" />}
          Setup Health Check
          <span className={`ml-auto text-xs font-normal px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {checks.map(check => (
            <div key={check.label} className={`rounded-lg border p-3 ${
              check.loading ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
              : check.ok ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                {check.loading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 flex-shrink-0" />
                  : check.ok
                  ? <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                <span className={`text-xs font-semibold ${
                  check.loading ? "text-blue-700 dark:text-blue-400"
                  : check.ok ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
                }`}>{check.label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{check.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChannelManager() {
  const { selectedPropertyId, properties, setSelectedPropertyId, isSuperAdmin } = usePropertyFilter();

  const propertyId = selectedPropertyId || 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Channel Manager</h1>
          <p className="text-muted-foreground">Manage OTA distribution via AioSell</p>
        </div>
        {!!propertyId && (
          <VerifyPropertyButton
            propertyId={propertyId}
            propertyName={properties?.find((p: Property) => p.id === propertyId)?.name}
          />
        )}
      </div>

      {(isSuperAdmin || (properties && properties.length > 1)) && (
        <div className="w-full max-w-xs">
          <Label>Property</Label>
          <Select value={selectedPropertyId ? String(selectedPropertyId) : ""} onValueChange={v => setSelectedPropertyId(v ? parseInt(v) : null)}>
            <SelectTrigger data-testid="select-property"><SelectValue placeholder="Select property" /></SelectTrigger>
            <SelectContent>
              {properties?.map((p: Property) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {!propertyId ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Hotel className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Select a property to manage its channel manager settings</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ConnectionHealthCard propertyId={propertyId} />
          <Tabs defaultValue="settings" className="w-full">
          <TabsList className="flex w-full overflow-x-auto h-auto flex-wrap gap-1 justify-start bg-muted p-1 rounded-lg" data-testid="tabs-channel-manager">
            <TabsTrigger value="settings" data-testid="tab-settings" className="flex-shrink-0">Settings</TabsTrigger>
            <TabsTrigger value="room-mapping" data-testid="tab-room-mapping" className="flex-shrink-0">Room Mapping</TabsTrigger>
            <TabsTrigger value="rate-plans" data-testid="tab-rate-plans" className="flex-shrink-0">Rate Plans</TabsTrigger>
            <TabsTrigger value="inventory-calendar" data-testid="tab-inventory-calendar" className="flex-shrink-0">Inventory Calendar</TabsTrigger>
            <TabsTrigger value="push-rates" data-testid="tab-push-rates" className="flex-shrink-0">Push Rates</TabsTrigger>
            <TabsTrigger value="push-inventory" data-testid="tab-push-inventory" className="flex-shrink-0">Push Inventory</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs" className="flex-shrink-0">Sync Logs</TabsTrigger>
            <TabsTrigger value="whatsapp-test" data-testid="tab-whatsapp-test" className="flex-shrink-0 text-green-700 dark:text-green-400">WhatsApp Test</TabsTrigger>
            <TabsTrigger value="ai-auditor" data-testid="tab-ai-auditor" className="flex-shrink-0 text-purple-700 dark:text-purple-400 gap-1"><BrainCircuit className="h-3.5 w-3.5" />AI Auditor</TabsTrigger>
            <TabsTrigger value="ota-test" data-testid="tab-ota-test" className="flex-shrink-0 text-indigo-700 dark:text-indigo-400 gap-1"><TestTube2 className="h-3.5 w-3.5" />OTA Test</TabsTrigger>
            <TabsTrigger value="reconciliation" data-testid="tab-reconciliation" className="flex-shrink-0 text-teal-700 dark:text-teal-400 gap-1"><Scale className="h-3.5 w-3.5" />Reconciliation</TabsTrigger>
            <TabsTrigger value="ai-investigator" data-testid="tab-ai-investigator" className="flex-shrink-0 text-violet-700 dark:text-violet-400 gap-1"><Bot className="h-3.5 w-3.5" />AI Investigator</TabsTrigger>
          </TabsList>
          <TabsContent value="settings"><SettingsTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="room-mapping"><RoomMappingTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="rate-plans"><RatePlansTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="inventory-calendar"><InventoryCalendarTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="push-rates"><PushRatesTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="push-inventory"><InventoryTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="logs"><SyncLogsTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="whatsapp-test"><WhatsAppTestTab /></TabsContent>
          <TabsContent value="ai-auditor"><AIAuditorTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="ota-test"><OtaTestTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="reconciliation"><InventoryReconciliationTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="ai-investigator"><AIInvestigatorTab propertyId={propertyId} /></TabsContent>
        </Tabs>
        </>
      )}
    </div>
  );
}
