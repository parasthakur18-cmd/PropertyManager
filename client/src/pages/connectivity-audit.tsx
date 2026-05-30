import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, AlertCircle, RefreshCw, Play,
  Zap, Search, Building2, ChevronDown, ChevronUp,
  Wifi, WifiOff, Activity, Clock, DollarSign, Database,
  Wrench, Link, ListChecks, Loader2, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RatePlan { id: number; ratePlanCode: string; ratePlanName: string; baseRate: string | null; occupancy: string | null; roomMappingId: number; }
interface AiosellMapping { id: number; aiosellRoomCode: string; aiosellRoomId: string | null; hostezeeRoomType: string; }
interface RoomAuditEntry {
  roomId: number; roomNumber: string; roomType: string; roomCategory: string;
  propertyId: number; propertyName: string; configId: number | null; hotelCode: string | null;
  aiosellConfigured: boolean;
  mapping: { id: number; aiosellRoomCode: string; aiosellRoomId: string | null; hostezeeRoomType: string; } | null;
  inventoryMappingFound: boolean; ratePlans: RatePlan[]; rateMappingFound: boolean;
  lastInventoryPush: { time: string | null; status: string | null; payload: any; response: any; errorMessage: string | null } | null;
  lastRatePush: { time: string | null; status: string | null; payload: any; response: any; errorMessage: string | null } | null;
  connectionStatus: "fully_connected" | "partially_connected" | "not_connected";
  statusReasons: string[];
}
interface PropertyConfig { mappings: AiosellMapping[]; ratePlans: RatePlan[]; configId: number; }
interface TestResult { payload: any; response: any; success: boolean; }

// ── Small helpers ─────────────────────────────────────────────────────────────

function normalizeType(s: string) { return s.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim(); }

function StatusBadge({ status }: { status: RoomAuditEntry["connectionStatus"] }) {
  if (status === "fully_connected") return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 gap-1.5 px-3 py-1 shrink-0"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />🟢 Fully Connected</Badge>;
  if (status === "partially_connected") return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 gap-1.5 px-3 py-1 shrink-0"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" />🟡 Partially Connected</Badge>;
  return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 gap-1.5 px-3 py-1 shrink-0"><span className="inline-block w-2 h-2 rounded-full bg-red-500" />🔴 Not Connected</Badge>;
}

function PushIcon({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs italic">Never pushed</span>;
  if (status === "success") return <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-500 inline" />;
  return <AlertCircle className="w-4 h-4 text-amber-500 inline" />;
}

function YesNo({ yes }: { yes: boolean }) {
  return yes ? <span className="text-emerald-600 font-semibold text-sm">✅ YES</span> : <span className="text-red-500 font-semibold text-sm">❌ NO</span>;
}

function Ts({ time }: { time?: string | null }) {
  if (!time) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono text-xs">{format(new Date(time), "dd MMM yyyy HH:mm:ss")}</span>;
}

function Mono({ children }: { children?: string | null }) {
  if (!children) return <span className="text-muted-foreground text-sm">—</span>;
  return <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
}

function JsonBox({ data, label }: { data: any; label: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{label}</p>
      <pre className="text-xs bg-slate-950 text-green-300 rounded-lg p-3 overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function InlineTestResult({ result, label }: { result: TestResult; label: string }) {
  return (
    <div className={`rounded-lg p-3 text-sm ${result.success ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"}`}>
      <div className={`flex items-center gap-2 font-semibold mb-2 ${result.success ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
        {result.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {label}: {result.success ? "SUCCESS" : "FAILED"}
      </div>
      {result.response?.message && <p className="text-xs opacity-80 mb-2">{result.response.message}</p>}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View payload & response</summary>
        <div className="mt-2 space-y-2">
          <JsonBox data={result.payload} label="Payload" />
          <JsonBox data={result.response} label="Response" />
        </div>
      </details>
    </div>
  );
}

// ── Issue Diagnosis ───────────────────────────────────────────────────────────

interface Issue { label: string; detail: string; fix: string; type: "room" | "rate" | "push"; }

function diagnoseIssues(entry: RoomAuditEntry): Issue[] {
  const issues: Issue[] = [];
  if (!entry.aiosellConfigured) {
    issues.push({ label: "Aiosell Not Configured", detail: "This property has no Aiosell connection set up.", fix: "Go to Channel Manager → Settings to add your Aiosell credentials.", type: "room" });
    return issues;
  }
  if (!entry.inventoryMappingFound) {
    issues.push({ label: "Missing Room Mapping", detail: "No Aiosell room code is linked to this room type.", fix: "Connect this room to an existing Aiosell room type or enter the codes manually.", type: "room" });
  } else {
    if (!entry.mapping?.aiosellRoomId) {
      issues.push({ label: "Missing Aiosell Room ID", detail: "The mapping exists but the numeric Aiosell Room ID is not set.", fix: "Update the mapping with the numeric Room ID from Aiosell.", type: "room" });
    }
    if (entry.lastInventoryPush?.status === "failed" || entry.lastInventoryPush?.status === "error") {
      issues.push({ label: "Last Inventory Push Failed", detail: entry.lastInventoryPush.errorMessage || "Inventory push returned an error from Aiosell.", fix: "Check the error details and run a test push to see the exact Aiosell response.", type: "push" });
    }
  }
  if (!entry.rateMappingFound) {
    issues.push({ label: "Missing Rate Plan", detail: "No rate plans are configured for this room. OTAs cannot receive rates.", fix: "Connect a rate plan by selecting from existing plans or entering a new one.", type: "rate" });
  } else if (entry.lastRatePush?.status === "failed" || entry.lastRatePush?.status === "error") {
    issues.push({ label: "Last Rate Push Failed", detail: entry.lastRatePush.errorMessage || "Rate push returned an error from Aiosell.", fix: "Check the error details and run a test push to see the exact Aiosell response.", type: "push" });
  }
  return issues;
}

// ── Connect Room Dialog ───────────────────────────────────────────────────────

function ConnectRoomDialog({
  entry, open, onClose, onSuccess,
}: { entry: RoomAuditEntry; open: boolean; onClose: () => void; onSuccess: () => void; }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"select" | "manual">("select");
  const [selectedMappingId, setSelectedMappingId] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualId, setManualId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  const { data: propConfig, isLoading: configLoading } = useQuery<PropertyConfig>({
    queryKey: ["/api/aiosell/connectivity-audit/property-config", entry.propertyId],
    queryFn: async () => {
      const r = await apiRequest(`/api/aiosell/connectivity-audit/property-config?propertyId=${entry.propertyId}`, "GET");
      return r.json();
    },
    enabled: open,
  });

  const existingMappings = propConfig?.mappings ?? [];
  const selectedMapping = existingMappings.find(m => String(m.id) === selectedMappingId);

  async function handleSave() {
    const aiosellRoomCode = tab === "select" ? selectedMapping?.aiosellRoomCode : manualCode.trim();
    const aiosellRoomId = tab === "select" ? selectedMapping?.aiosellRoomId : manualId.trim();
    if (!aiosellRoomCode) { toast({ title: "Room code is required", variant: "destructive" }); return; }

    setSaving(true); setTestResult(null);
    try {
      const saveRes = await apiRequest("/api/aiosell/connectivity-audit/fix-room-mapping", "POST", {
        propertyId: entry.propertyId,
        roomId: entry.roomId,
        roomType: entry.roomType,
        aiosellRoomCode,
        aiosellRoomId: aiosellRoomId || null,
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.message || "Save failed");
      toast({ title: "✅ Room mapping saved" });

      // Auto-run inventory test
      setTestRunning(true);
      const mappingId = saveData.mapping?.id;
      if (mappingId) {
        const testRes = await apiRequest("/api/aiosell/connectivity-audit/test-inventory", "POST", {
          propertyId: entry.propertyId, mappingId,
        });
        const testData = await testRes.json();
        setTestResult(testData);
        if (testData.success) onSuccess();
      }
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); setTestRunning(false); }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link className="w-5 h-5 text-primary" />Connect Room to Aiosell</DialogTitle>
          <p className="text-sm text-muted-foreground">Room {entry.roomNumber} · {entry.roomType} · {entry.propertyName}</p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="select" className="flex-1">🔍 Select Existing Aiosell Room</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">✏️ Enter Manually</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4 pt-2">
            {configLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" />Loading Aiosell rooms…</div>
            ) : existingMappings.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No Aiosell room mappings configured for this property yet.<br />
                <span className="text-xs">Go to Channel Manager → Room Mapping to add them, or use Manual entry.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Choose which Aiosell room type this room belongs to:</Label>
                <Select value={selectedMappingId} onValueChange={setSelectedMappingId}>
                  <SelectTrigger data-testid="select-aiosell-mapping">
                    <SelectValue placeholder="Select Aiosell room type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingMappings.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.hostezeeRoomType} → {m.aiosellRoomCode}{m.aiosellRoomId ? ` (ID: ${m.aiosellRoomId})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMapping && (
                  <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1.5">
                    <p><span className="text-muted-foreground">Room Code:</span> <Mono>{selectedMapping.aiosellRoomCode}</Mono></p>
                    <p><span className="text-muted-foreground">Aiosell Room ID:</span> <Mono>{selectedMapping.aiosellRoomId}</Mono></p>
                    <p><span className="text-muted-foreground">Hostezee Type:</span> <span className="font-medium">{selectedMapping.hostezeeRoomType}</span></p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Enter the Aiosell codes directly. You can find these in your Aiosell dashboard.</p>
            <div className="space-y-3">
              <div>
                <Label>Aiosell Room Code <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. 4-bed-male-dormitory" value={manualCode} onChange={e => setManualCode(e.target.value)} className="mt-1 font-mono" data-testid="input-room-code" />
                <p className="text-xs text-muted-foreground mt-1">The string room code from Aiosell (required)</p>
              </div>
              <div>
                <Label>Aiosell Room ID <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input placeholder="e.g. 1555907304" value={manualId} onChange={e => setManualId(e.target.value)} className="mt-1 font-mono" data-testid="input-room-id" />
                <p className="text-xs text-muted-foreground mt-1">Numeric ID from Aiosell (recommended for reliable matching)</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {testResult && (
          <div className="mt-2">
            <InlineTestResult result={testResult} label="📦 Inventory Push Test" />
            {testResult.success && <p className="text-emerald-600 text-sm mt-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Room mapping is live and working!</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || testRunning || (tab === "select" && !selectedMappingId) || (tab === "manual" && !manualCode.trim())} data-testid="btn-save-mapping">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : testRunning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Testing…</> : <><ArrowRight className="w-4 h-4 mr-2" />Save & Test</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Connect Rate Plan Dialog ──────────────────────────────────────────────────

function ConnectRatePlanDialog({
  entry, open, onClose, onSuccess,
}: { entry: RoomAuditEntry; open: boolean; onClose: () => void; onSuccess: () => void; }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"select" | "manual">("select");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [occupancy, setOccupancy] = useState("single");
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  const { data: propConfig, isLoading: configLoading } = useQuery<PropertyConfig>({
    queryKey: ["/api/aiosell/connectivity-audit/property-config", entry.propertyId],
    queryFn: async () => {
      const r = await apiRequest(`/api/aiosell/connectivity-audit/property-config?propertyId=${entry.propertyId}`, "GET");
      return r.json();
    },
    enabled: open,
  });

  const existingPlans = propConfig?.ratePlans ?? [];
  const selectedPlan = existingPlans.find(p => String(p.id) === selectedPlanId);

  async function handleSave() {
    const mappingId = entry.mapping?.id;
    if (!mappingId) { toast({ title: "No room mapping found. Connect the room first.", variant: "destructive" }); return; }

    let ratePlanCode: string, ratePlanName: string, baseRate: string, occ: string;
    if (tab === "select") {
      if (!selectedPlan) { toast({ title: "Select a rate plan", variant: "destructive" }); return; }
      ratePlanCode = selectedPlan.ratePlanCode; ratePlanName = selectedPlan.ratePlanName;
      baseRate = selectedPlan.baseRate || ""; occ = selectedPlan.occupancy || "single";
    } else {
      if (!code.trim() || !name.trim()) { toast({ title: "Rate Plan Code and Name are required", variant: "destructive" }); return; }
      ratePlanCode = code.trim(); ratePlanName = name.trim(); baseRate = rate; occ = occupancy;
    }

    setSaving(true); setTestResult(null);
    try {
      const saveRes = await apiRequest("/api/aiosell/connectivity-audit/fix-rate-plan", "POST", {
        propertyId: entry.propertyId, mappingId, ratePlanCode, ratePlanName,
        baseRate: baseRate || null, occupancy: occ,
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.message || "Save failed");
      toast({ title: "✅ Rate plan saved" });

      // Auto-run rate push test
      setTestRunning(true);
      const testRes = await apiRequest("/api/aiosell/connectivity-audit/test-rate", "POST", {
        propertyId: entry.propertyId, mappingId, ratePlanId: saveData.ratePlan?.id,
      });
      const testData = await testRes.json();
      setTestResult(testData);
      if (testData.success) onSuccess();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); setTestRunning(false); }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" />Connect Rate Plan</DialogTitle>
          <p className="text-sm text-muted-foreground">Room {entry.roomNumber} · {entry.roomType} · {entry.propertyName}</p>
          {entry.mapping && <p className="text-xs text-muted-foreground">Mapping: <Mono>{entry.mapping.aiosellRoomCode}</Mono></p>}
        </DialogHeader>

        {!entry.mapping && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
            ⚠️ This room has no inventory mapping yet. Connect the room first, then add a rate plan.
          </div>
        )}

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="select" className="flex-1">🔍 Copy from Existing</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">✏️ Enter Manually</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Copy a rate plan that's already configured for another room on this property.</p>
            {configLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" />Loading rate plans…</div>
            ) : existingPlans.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No rate plans configured yet. Use Manual entry.
              </div>
            ) : (
              <>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger data-testid="select-rate-plan">
                    <SelectValue placeholder="Select a rate plan to copy…" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingPlans.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.ratePlanName} — {p.ratePlanCode} {p.baseRate ? `(₹${p.baseRate})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPlan && (
                  <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1.5">
                    <p><span className="text-muted-foreground">Code:</span> <Mono>{selectedPlan.ratePlanCode}</Mono></p>
                    <p><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedPlan.ratePlanName}</span></p>
                    <p><span className="text-muted-foreground">Base Rate:</span> <span className="font-semibold">₹{selectedPlan.baseRate || "—"}</span></p>
                    <p><span className="text-muted-foreground">Occupancy:</span> <span className="capitalize">{selectedPlan.occupancy || "single"}</span></p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Enter the rate plan details. You can find rate plan codes in your Aiosell dashboard.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Rate Plan Code <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. STANDARD" value={code} onChange={e => setCode(e.target.value)} className="mt-1 font-mono" data-testid="input-rate-code" />
              </div>
              <div className="col-span-2">
                <Label>Rate Plan Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Standard room" value={name} onChange={e => setName(e.target.value)} className="mt-1" data-testid="input-rate-name" />
              </div>
              <div>
                <Label>Base Rate (₹)</Label>
                <Input placeholder="e.g. 2500" type="number" value={rate} onChange={e => setRate(e.target.value)} className="mt-1" data-testid="input-base-rate" />
              </div>
              <div>
                <Label>Occupancy</Label>
                <Select value={occupancy} onValueChange={setOccupancy}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="triple">Triple</SelectItem>
                    <SelectItem value="quad">Quad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {testResult && (
          <div className="mt-2">
            <InlineTestResult result={testResult} label="💰 Rate Push Test" />
            {testResult.success && <p className="text-emerald-600 text-sm mt-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Rate plan is live and pushing to OTAs!</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || testRunning || !entry.mapping} data-testid="btn-save-rate-plan">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : testRunning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Testing…</> : <><ArrowRight className="w-4 h-4 mr-2" />Save & Test</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Fix Panel ─────────────────────────────────────────────────────────────────

function FixPanel({ entry, onRefresh }: { entry: RoomAuditEntry; onRefresh: () => void }) {
  const { toast } = useToast();
  const [connectRoomOpen, setConnectRoomOpen] = useState(false);
  const [connectRateOpen, setConnectRateOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [inlineResults, setInlineResults] = useState<{ inv?: TestResult; rate?: TestResult }>({});

  if (entry.connectionStatus === "fully_connected") return null;

  const issues = diagnoseIssues(entry);
  if (issues.length === 0) return null;

  async function runFullTest() {
    setRunning("full"); setInlineResults({});
    const results: typeof inlineResults = {};
    try {
      if (entry.mapping) {
        const ir = await apiRequest("/api/aiosell/connectivity-audit/test-inventory", "POST", { propertyId: entry.propertyId, mappingId: entry.mapping.id });
        results.inv = await ir.json();
        if (entry.ratePlans.length > 0) {
          const rr = await apiRequest("/api/aiosell/connectivity-audit/test-rate", "POST", { propertyId: entry.propertyId, mappingId: entry.mapping.id, ratePlanId: entry.ratePlans[0].id });
          results.rate = await rr.json();
        }
      }
    } catch (err: any) {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    }
    setInlineResults(results);
    setRunning(null);
    onRefresh();
  }

  return (
    <>
      <div className="border-t mt-3 pt-4 space-y-4">
        {/* Issue + Fix list */}
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm">Fix Issues</span>
          <span className="text-xs text-muted-foreground">({issues.length} issue{issues.length !== 1 ? "s" : ""} found)</span>
        </div>

        <div className="space-y-3">
          {issues.map((issue, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  {issue.type === "push" ? <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  {issue.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{issue.detail}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">💡 {issue.fix}</p>
              </div>
              <div className="flex gap-2 flex-wrap shrink-0">
                {issue.type === "room" && entry.aiosellConfigured && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => setConnectRoomOpen(true)} data-testid={`btn-connect-room-${entry.roomId}`}>
                    <Link className="w-3.5 h-3.5" />Connect Room
                  </Button>
                )}
                {issue.type === "rate" && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => setConnectRateOpen(true)} data-testid={`btn-connect-rate-${entry.roomId}`}>
                    <DollarSign className="w-3.5 h-3.5" />Connect Rate Plan
                  </Button>
                )}
                {issue.type === "push" && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={runFullTest} disabled={running === "full"} data-testid={`btn-retest-${entry.roomId}`}>
                    {running === "full" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Re-Test
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick action bar */}
        <div className="flex flex-wrap gap-2">
          {entry.aiosellConfigured && !entry.inventoryMappingFound && (
            <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setConnectRoomOpen(true)}>
              <Link className="w-3.5 h-3.5" />Connect Room to Aiosell
            </Button>
          )}
          {entry.inventoryMappingFound && !entry.rateMappingFound && (
            <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setConnectRateOpen(true)}>
              <DollarSign className="w-3.5 h-3.5" />Add Rate Plan
            </Button>
          )}
          {entry.inventoryMappingFound && entry.rateMappingFound && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={runFullTest} disabled={running === "full"}>
              {running === "full" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5" />}
              Run Full Test (Inventory + Rate)
            </Button>
          )}
        </div>

        {/* Inline test results */}
        {(inlineResults.inv || inlineResults.rate) && (
          <div className="space-y-2">
            {inlineResults.inv && <InlineTestResult result={inlineResults.inv} label="📦 Inventory Push" />}
            {inlineResults.rate && <InlineTestResult result={inlineResults.rate} label="💰 Rate Push" />}
            {inlineResults.inv?.success && inlineResults.rate?.success && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />This room is now fully connected and syncing to all OTAs!
              </div>
            )}
          </div>
        )}
      </div>

      <ConnectRoomDialog entry={entry} open={connectRoomOpen} onClose={() => setConnectRoomOpen(false)} onSuccess={() => { setConnectRoomOpen(false); onRefresh(); }} />
      <ConnectRatePlanDialog entry={entry} open={connectRateOpen} onClose={() => setConnectRateOpen(false)} onSuccess={() => { setConnectRateOpen(false); onRefresh(); }} />
    </>
  );
}

// ── Room Card ─────────────────────────────────────────────────────────────────

function RoomCard({ entry, onRefresh, onTestInventory, onTestRate, onVerify }: {
  entry: RoomAuditEntry; onRefresh: () => void;
  onTestInventory: (e: RoomAuditEntry) => void;
  onTestRate: (e: RoomAuditEntry, rp: RatePlan) => void;
  onVerify: (e: RoomAuditEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBroken = entry.connectionStatus !== "fully_connected";
  const borderColor = entry.connectionStatus === "fully_connected" ? "border-l-emerald-500" : entry.connectionStatus === "partially_connected" ? "border-l-amber-500" : "border-l-red-500";

  return (
    <Card className={`border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base">{entry.propertyName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold text-primary">Room {entry.roomNumber}</span>
              <Badge variant="outline" className="text-xs capitalize">{entry.roomType}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>Local ID: <code className="font-semibold text-foreground">#{entry.roomId}</code></span>
              {entry.mapping?.aiosellRoomId && <span>Aiosell ID: <code className="font-semibold text-foreground">{entry.mapping.aiosellRoomId}</code></span>}
              {entry.mapping?.aiosellRoomCode && <span>Room Code: <code className="font-semibold text-foreground">{entry.mapping.aiosellRoomCode}</code></span>}
              {entry.hotelCode && <span>Hotel: <code className="font-semibold text-foreground">{entry.hotelCode}</code></span>}
            </div>
          </div>
          <StatusBadge status={entry.connectionStatus} />
        </div>

        {entry.statusReasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.statusReasons.map((r, i) => (
              <span key={i} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded px-2 py-0.5 border border-red-200 dark:border-red-800">⚠ {r}</span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Database className="w-4 h-4" />, label: "Inventory Mapping", value: <YesNo yes={entry.inventoryMappingFound} /> },
            { icon: <DollarSign className="w-4 h-4" />, label: "Rate Mapping", value: <YesNo yes={entry.rateMappingFound} /> },
            { icon: <Activity className="w-4 h-4" />, label: "Last Inv Push", value: <PushIcon status={entry.lastInventoryPush?.status} /> },
            { icon: <Activity className="w-4 h-4" />, label: "Last Rate Push", value: <PushIcon status={entry.lastRatePush?.status} /> },
          ].map(t => (
            <div key={t.label} className="bg-muted/40 rounded-lg p-3 text-center">
              <span className="text-muted-foreground flex justify-center mb-1">{t.icon}</span>
              <p className="text-xs text-muted-foreground mb-1">{t.label}</p>
              {t.value}
            </div>
          ))}
        </div>

        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide details" : "Show full details & last push data"}
        </button>

        {expanded && (
          <div className="space-y-5 border-t pt-4">
            <Section title="📦 Inventory Connection" icon={<Database className="w-4 h-4" />}>
              <Row label="Inventory Mapping"><YesNo yes={entry.inventoryMappingFound} /></Row>
              <Row label="Aiosell Room Code"><Mono>{entry.mapping?.aiosellRoomCode}</Mono></Row>
              <Row label="Aiosell Room ID"><Mono>{entry.mapping?.aiosellRoomId}</Mono></Row>
              <Row label="Last Push"><Ts time={entry.lastInventoryPush?.time?.toString()} /></Row>
              <Row label="Last Push Status">
                {entry.lastInventoryPush ? <span className={`font-semibold text-sm ${entry.lastInventoryPush.status === "success" ? "text-emerald-600" : "text-red-500"}`}>{entry.lastInventoryPush.status?.toUpperCase()}</span> : <span className="text-muted-foreground text-sm">Never</span>}
              </Row>
              {entry.lastInventoryPush?.errorMessage && <Row label="Error"><span className="text-red-500 text-xs">{entry.lastInventoryPush.errorMessage}</span></Row>}
            </Section>

            <Section title="💰 Rate Connection" icon={<DollarSign className="w-4 h-4" />}>
              <Row label="Rate Mapping"><YesNo yes={entry.rateMappingFound} /></Row>
              {entry.ratePlans.length === 0
                ? <Row label="Rate Plans"><span className="text-muted-foreground text-sm">None configured</span></Row>
                : entry.ratePlans.map(rp => (
                  <div key={rp.id} className="bg-muted/30 rounded-lg p-2.5 space-y-1">
                    <Row label="Code"><Mono>{rp.ratePlanCode}</Mono></Row>
                    <Row label="Name"><span className="text-sm font-medium">{rp.ratePlanName}</span></Row>
                    <Row label="Base Rate"><span className="font-semibold text-sm">₹{rp.baseRate || "—"}</span></Row>
                  </div>
                ))}
              <Row label="Last Push"><Ts time={entry.lastRatePush?.time?.toString()} /></Row>
              <Row label="Last Push Status">
                {entry.lastRatePush ? <span className={`font-semibold text-sm ${entry.lastRatePush.status === "success" ? "text-emerald-600" : "text-red-500"}`}>{entry.lastRatePush.status?.toUpperCase()}</span> : <span className="text-muted-foreground text-sm">Never</span>}
              </Row>
              {entry.lastRatePush?.errorMessage && <Row label="Error"><span className="text-red-500 text-xs">{entry.lastRatePush.errorMessage}</span></Row>}
            </Section>

            {entry.lastInventoryPush?.payload && (
              <Section title="📤 Last Inventory Push" icon={<Clock className="w-4 h-4" />}>
                <JsonBox data={entry.lastInventoryPush.payload} label="Payload" />
                {entry.lastInventoryPush.response && <JsonBox data={entry.lastInventoryPush.response} label="Aiosell Response" />}
              </Section>
            )}
            {entry.lastRatePush?.payload && (
              <Section title="📤 Last Rate Push" icon={<Clock className="w-4 h-4" />}>
                <JsonBox data={entry.lastRatePush.payload} label="Payload" />
                {entry.lastRatePush.response && <JsonBox data={entry.lastRatePush.response} label="Aiosell Response" />}
              </Section>
            )}
          </div>
        )}

        {/* Test action buttons */}
        <div className="flex flex-wrap gap-2 pt-1 border-t">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={!entry.inventoryMappingFound} onClick={() => onTestInventory(entry)}>
            <Play className="w-3.5 h-3.5" />Test Inventory Push
          </Button>
          {entry.ratePlans.length > 0
            ? entry.ratePlans.map(rp => (
              <Button key={rp.id} size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onTestRate(entry, rp)}>
                <DollarSign className="w-3.5 h-3.5" />Test Rate: {rp.ratePlanName}
              </Button>
            ))
            : <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled><DollarSign className="w-3.5 h-3.5" />Test Rate Push</Button>
          }
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={!entry.aiosellConfigured} onClick={() => onVerify(entry)}>
            <Search className="w-3.5 h-3.5" />Verify Mapping
          </Button>
        </div>

        {/* Fix Panel — only for broken rooms */}
        {isBroken && <FixPanel entry={entry} onRefresh={onRefresh} />}
      </CardContent>
    </Card>
  );
}

// ── Section / Row helpers ─────────────────────────────────────────────────────

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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConnectivityAudit() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<"all" | RoomAuditEntry["connectionStatus"]>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [testResult, setTestResult] = useState<{ title: string; data: any } | null>(null);

  const { data: entries = [], isLoading, refetch, isFetching } = useQuery<RoomAuditEntry[]>({
    queryKey: ["/api/aiosell/connectivity-audit"],
    refetchOnWindowFocus: false,
  });

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

  async function handleTestInventory(entry: RoomAuditEntry) {
    if (!entry.mapping) return;
    try {
      const res = await apiRequest("/api/aiosell/connectivity-audit/test-inventory", "POST", { propertyId: entry.propertyId, mappingId: entry.mapping.id });
      const data = await res.json();
      setTestResult({ title: `Inventory Push — Room ${entry.roomNumber} (${entry.propertyName})`, data });
      toast({ title: data.success ? "✅ Inventory push succeeded" : "❌ Inventory push failed", variant: data.success ? "default" : "destructive" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { refetch(); }
  }

  async function handleTestRate(entry: RoomAuditEntry, rp: RatePlan) {
    if (!entry.mapping) return;
    try {
      const res = await apiRequest("/api/aiosell/connectivity-audit/test-rate", "POST", { propertyId: entry.propertyId, mappingId: entry.mapping.id, ratePlanId: rp.id });
      const data = await res.json();
      setTestResult({ title: `Rate Push — ${rp.ratePlanName} · Room ${entry.roomNumber} (${entry.propertyName})`, data });
      toast({ title: data.success ? "✅ Rate push succeeded" : "❌ Rate push failed", variant: data.success ? "default" : "destructive" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { refetch(); }
  }

  async function handleVerify(entry: RoomAuditEntry) {
    try {
      const res = await apiRequest("/api/aiosell/connectivity-audit/verify-mapping", "POST", { propertyId: entry.propertyId });
      const data = await res.json();
      setTestResult({ title: `Verify Mapping — ${entry.propertyName}`, data });
      toast({ title: data.connectionResult?.success ? "✅ Aiosell connection verified" : "⚠️ Connection issue", variant: data.connectionResult?.success ? "default" : "destructive" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wifi className="w-6 h-6 text-primary" />Connectivity Audit</h1>
          <p className="text-sm text-muted-foreground mt-1">Settings → Channel Manager → Connectivity Audit · Real-time Aiosell connection health for every room</p>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching} variant="outline" className="gap-2" data-testid="btn-refresh-audit">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Rooms", count: counts.all, icon: <Building2 className="w-5 h-5" />, color: "text-foreground", bg: "bg-muted/40" },
          { label: "🟢 Fully Connected", count: counts.fully_connected, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
          { label: "🟡 Partial", count: counts.partially_connected, icon: <AlertCircle className="w-5 h-5" />, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10" },
          { label: "🔴 Not Connected", count: counts.not_connected, icon: <WifiOff className="w-5 h-5" />, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/10" },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-4 flex items-center gap-3`}>
            <span className={item.color}>{item.icon}</span>
            <div><p className={`text-2xl font-bold ${item.color}`}>{item.count}</p><p className="text-xs text-muted-foreground leading-tight">{item.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="w-56" data-testid="filter-status"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses ({counts.all})</SelectItem>
            <SelectItem value="fully_connected">🟢 Fully Connected ({counts.fully_connected})</SelectItem>
            <SelectItem value="partially_connected">🟡 Partial ({counts.partially_connected})</SelectItem>
            <SelectItem value="not_connected">🔴 Not Connected ({counts.not_connected})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-64" data-testid="filter-property"><SelectValue placeholder="Filter by property" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterStatus !== "all" || filterProperty !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterProperty("all"); }}>Clear filters</Button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <RefreshCw className="w-8 h-8 animate-spin" /><p>Loading connectivity data…</p>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No rooms match the current filters</p>
          <p className="text-sm mt-1">Try changing the status or property filter</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map(entry => (
          <RoomCard key={entry.roomId} entry={entry} onRefresh={() => refetch()} onTestInventory={handleTestInventory} onTestRate={handleTestRate} onVerify={handleVerify} />
        ))}
      </div>

      {/* Test Result Dialog */}
      <Dialog open={!!testResult} onOpenChange={open => !open && setTestResult(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />{testResult?.title}</DialogTitle>
          </DialogHeader>
          {testResult && (() => {
            const d = testResult.data;
            if ("payload" in d && "response" in d) {
              return (
                <div className="space-y-4">
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${d.success ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}>
                    {d.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span className="font-semibold">{d.success ? "SUCCESS — Aiosell accepted the request" : "FAILED — Aiosell rejected the request"}</span>
                  </div>
                  {d.response?.message && <div className="bg-muted/50 rounded-lg p-3 text-sm"><span className="font-semibold">Aiosell Message: </span>{d.response.message}</div>}
                  <JsonBox data={d.payload} label="Payload Sent to Aiosell" />
                  <JsonBox data={d.response} label="Exact Aiosell Response" />
                </div>
              );
            }
            return (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 p-3 rounded-lg ${d.connectionResult?.success ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"}`}>
                  {d.connectionResult?.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span className="font-semibold">{d.connectionResult?.success ? "Connection OK" : "Connection Failed"}</span>
                  {d.connectionResult?.message && <span className="text-sm opacity-80">— {d.connectionResult.message}</span>}
                </div>
                <JsonBox data={d.config} label="Aiosell Configuration" />
                <JsonBox data={d.mappings} label="Room Mappings" />
                <JsonBox data={d.ratePlans} label="Rate Plans" />
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
