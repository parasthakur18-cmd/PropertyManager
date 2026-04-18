import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Property } from "@shared/schema";
import { AlertCircle, CheckCircle, Trash2, Plus, RefreshCw, Settings, Link2, ArrowUpDown, Calendar, Activity, Loader2, Wifi, WifiOff, Hotel, DollarSign, TestTube2, Download, ChevronDown, ChevronLeft, ChevronRight, IndianRupee, MessageSquare, Send, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";
import { format, addDays, parseISO } from "date-fns";

interface AiosellConfig {
  id: number;
  propertyId: number;
  hotelCode: string;
  pmsName: string;
  pmsPassword: string | null;
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
  const [initialized, setInitialized] = useState(false);
  const [showSandboxGuide, setShowSandboxGuide] = useState(false);

  const { data: config, isLoading } = useQuery<AiosellConfig | null>({
    queryKey: ["/api/aiosell/config", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/config?propertyId=${propertyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
    enabled: !!propertyId,
  });

  if (config && !initialized) {
    setHotelCode(config.hotelCode || "");
    setPmsName(config.pmsName || "hostezee");
    setApiBaseUrl(config.apiBaseUrl || "https://live.aiosell.com");
    setIsSandbox(config.isSandbox ?? false);
    setInitialized(true);
  }

  const saveConfig = useMutation({
    mutationFn: async () => {
      if (!hotelCode.trim()) throw new Error("Hotel Code is required");
      return apiRequest("/api/aiosell/config", "POST", { propertyId, hotelCode: hotelCode.trim(), pmsName, pmsPassword: pmsPassword || undefined, apiBaseUrl, isSandbox });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/config"] });
      toast({ title: "Configuration saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const testConn = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/aiosell/test-connection", "POST", { propertyId });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: data.success ? "Connection successful" : "Connection failed", description: data.message, variant: data.success ? "default" : "destructive" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const forceSync = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/aiosell/force-sync", "POST", { propertyId });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: data.success ? "Sync pushed!" : "Sync failed", description: data.message, variant: data.success ? "default" : "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/sync-logs"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const testWebhook = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/aiosell/test-webhook", "POST", { propertyId });
      return response.json();
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
      {/* Sandbox Setup Guide */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <TestTube2 className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Sandbox Testing (from AioSell team)</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Use sandbox credentials to test rate/inventory push before going live. Verify updates at{" "}
                  <a href="https://live.aiosell.com" target="_blank" rel="noopener noreferrer" className="underline">live.aiosell.com</a>{" "}
                  (login: <strong>sandboxpms / sandboxpms</strong>).
                </p>
              </div>
            </div>
            <Button
              data-testid="button-show-sandbox-guide"
              variant="outline"
              size="sm"
              className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 flex-shrink-0"
              onClick={() => setShowSandboxGuide(!showSandboxGuide)}
            >
              {showSandboxGuide ? "Hide" : "Show"} Details
            </Button>
          </div>

          {showSandboxGuide && (
            <div className="mt-4 space-y-3 border-t border-amber-200 dark:border-amber-700 pt-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white dark:bg-gray-900 rounded p-2 border border-amber-200 dark:border-amber-700">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">API Credentials</p>
                  <p><span className="text-muted-foreground">PMS Name:</span> <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">aiosell</code></p>
                  <p><span className="text-muted-foreground">Password:</span> <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">AIOsell@123</code></p>
                  <p><span className="text-muted-foreground">Hotel Code:</span> <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">SANDBOX-PMS</code></p>
                  <p><span className="text-muted-foreground">API URL:</span> <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">https://live.aiosell.com</code></p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded p-2 border border-amber-200 dark:border-amber-700">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Room Mapping (Sandbox)</p>
                  <p><span className="text-muted-foreground">Room codes:</span> <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">SUITE</code>, <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">EXECUTIVE</code></p>
                  <p className="mt-1 text-muted-foreground">Rate plans: <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">SUITE-S-101</code>, <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">EXECUTIVE-S-101</code></p>
                  <p className="mt-1 text-muted-foreground text-xs">Map your room types to these codes in Room Mappings tab.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  data-testid="button-fill-sandbox"
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300"
                  onClick={fillSandboxCredentials}
                >
                  Auto-fill Sandbox Credentials
                </Button>
                <p className="text-xs text-amber-600 dark:text-amber-400">Fills the form below with sandbox values — still need to click Save.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                  {config.isActive ? "Connected" : "Inactive"} — Hotel Code: <strong>{config.hotelCode}</strong>
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
              <Input data-testid="input-pms-password" type="password" placeholder="Leave blank to keep existing" value={pmsPassword} onChange={e => setPmsPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground">API password provided by AioSell</p>
            </div>
            <div className="space-y-2">
              <Label>API Base URL</Label>
              <Input data-testid="input-api-url" value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">Default: https://live.aiosell.com</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Sandbox Mode</Label>
                <p className="text-xs text-muted-foreground">Mark this config as sandbox/test (does not change API URL)</p>
              </div>
              <Switch data-testid="switch-sandbox" checked={isSandbox} onCheckedChange={setIsSandbox} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Button data-testid="button-save-config" onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending || !hotelCode.trim()}>
              {saveConfig.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Configuration
            </Button>
            {isConfigured && (
              <>
                <Button data-testid="button-test-connection" variant="outline" onClick={() => testConn.mutate()} disabled={testConn.isPending}>
                  {testConn.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                  Test Connection
                </Button>
                <Button data-testid="button-force-sync" variant="outline" onClick={() => forceSync.mutate()} disabled={forceSync.isPending} className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:text-blue-400">
                  {forceSync.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Force Sync Inventory Now
                </Button>
              </>
            )}
          </div>
          {isConfigured && (
            <p className="text-xs text-muted-foreground">
              "Force Sync" pushes current inventory (next 90 days) for all mapped room types to AioSell right now. Useful for testing or after bulk booking changes.
            </p>
          )}
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
                      {roomTypes.length > 0 ? (
                        <Select value={mapping.hostezeeRoomType} onValueChange={v => updateMapping(index, "hostezeeRoomType", v)}>
                          <SelectTrigger data-testid={`select-room-type-${index}`}><SelectValue placeholder="Select room type" /></SelectTrigger>
                          <SelectContent>
                            {roomTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={mapping.hostezeeRoomType} onChange={e => updateMapping(index, "hostezeeRoomType", e.target.value)} placeholder="Room type name" />
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
                {plans.map((plan, index) => (
                  <TableRow key={index} data-testid={`row-rate-plan-${index}`}>
                    <TableCell>
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
                ))}
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

  const doApiPush = async (rates: { roomCode: string; rate: number; rateplanCode: string }[]) => {
    if (rates.length === 0) throw new Error("Set at least one rate");
    const res = await apiRequest("/api/aiosell/push-rates", "POST", {
      propertyId,
      updates: [{ startDate, endDate, rates }],
    });
    return res.json();
  };

  const onPushSuccess = (data: any) => {
    setLastPushResult({ success: data.success, message: data.message });
    toast({ title: data.success ? "Rates pushed successfully" : "Push failed", description: data.message, variant: data.success ? "default" : "destructive" });
    queryClient.invalidateQueries({ queryKey: ["/api/aiosell/sync-logs"] });
    if (data.success) queryClient.invalidateQueries({ queryKey: ["/api/aiosell/latest-rates", { propertyId }] });
  };

  const pushRatesMutation = useMutation({
    mutationFn: async () => {
      const rates = ratePlans
        .filter(rp => rateValues[rp.ratePlanCode])
        .map(rp => {
          const mapping = mappings.find(m => m.id === rp.roomMappingId);
          return {
            roomCode: mapping?.aiosellRoomCode || "",
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
      const data = await doApiPush([{ roomCode: mapping.aiosellRoomCode, rate: rateToUse, rateplanCode: rp.ratePlanCode }]);
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
  endDefault.setDate(endDefault.getDate() + 30);
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

  const getRoomCount = (roomType: string) => {
    const matching = allRooms.filter(r => r.roomType === roomType);
    const isDorm = matching.some(r => (r.totalBeds || 1) > 1);
    if (isDorm) return matching.reduce((sum, r) => sum + (r.totalBeds || 1), 0);
    return matching.length;
  };

  const [inventoryValues, setInventoryValues] = useState<Record<string, string>>({});

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input data-testid="input-inv-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(m => {
                const roomCount = getRoomCount(m.hostezeeRoomType);
                const matchingRooms = allRooms.filter(r => r.roomType === m.hostezeeRoomType);
                const isDorm = matchingRooms.some(r => (r.totalBeds || 1) > 1);
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

interface InventoryCalendarDay { date: string; available: number; booked: number; blocked: number; total: number; }
interface InventoryCalendarRoomType { roomCode: string; hostezeeRoomType: string; totalRooms: number; rate: number | null; days: InventoryCalendarDay[]; }
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
                  <span className="text-xs text-muted-foreground">{rt.roomCode} · {rt.totalRooms} room{rt.totalRooms !== 1 ? "s" : ""}</span>
                  {rt.rate && (
                    <span className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-0.5 mt-0.5">
                      <IndianRupee className="h-2.5 w-2.5" />{rt.rate.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              ))}
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
                      return (
                        <div
                          key={day.date}
                          className={`border-r flex-shrink-0 flex flex-col items-center justify-center cursor-default transition-colors ${isToday ? "ring-1 ring-inset ring-blue-300 dark:ring-blue-700" : ""} ${cellColor(day.available, day.total)}`}
                          style={{ width: CELL_W }}
                          title={`${rt.hostezeeRoomType} · ${day.date}\nAvailable: ${day.available} / ${day.total}\nBooked: ${day.booked}${day.blocked ? ` · Blocked: ${day.blocked}` : ""}`}
                          data-testid={`inv-cell-${rt.roomCode}-${day.date}`}
                        >
                          <span className="text-lg font-bold leading-none">{day.available}</span>
                          <span className="text-xs opacity-70 leading-none mt-0.5">/ {day.total}</span>
                          {day.booked > 0 && (
                            <span className="text-xs opacity-60 leading-none mt-0.5">{day.booked} booked</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
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

  if (!propertyId) return null;

  const configOk = !!(config?.hotelCode && config?.pmsName);
  const mappingsOk = mappings.length > 0;
  const unlinkedPlans = ratePlans.filter(rp => !mappings.find(m => m.id === rp.roomMappingId));
  const ratePlansOk = ratePlans.length > 0 && unlinkedPlans.length === 0;
  const inventoryReady = configOk && mappingsOk;
  const ratesReady = configOk && mappingsOk && ratePlansOk;
  const allOk = inventoryReady && ratesReady;

  const checks = [
    {
      label: "AioSell Config",
      ok: configOk,
      detail: configOk ? `Hotel: ${config?.hotelCode}` : "Go to Settings tab and save Hotel Code + PMS Name",
    },
    {
      label: "Room Mappings",
      ok: mappingsOk,
      detail: mappingsOk ? `${mappings.length} room${mappings.length !== 1 ? "s" : ""} mapped to AioSell` : "Go to Room Mapping tab and link your rooms",
    },
    {
      label: "Rate Plans",
      ok: ratePlansOk,
      detail: !config ? "Requires AioSell config first"
        : ratePlans.length === 0 ? "Go to Rate Plans tab and add rate plans"
        : unlinkedPlans.length > 0 ? `${unlinkedPlans.length} plan${unlinkedPlans.length !== 1 ? "s" : ""} not linked to a room — fix in Rate Plans tab`
        : `${ratePlans.length} plan${ratePlans.length !== 1 ? "s" : ""} linked and ready`,
    },
    {
      label: "Push Inventory",
      ok: inventoryReady,
      detail: inventoryReady ? "Ready — room availability can be pushed to OTAs" : "Fix issues above first",
    },
    {
      label: "Push Rates",
      ok: ratesReady,
      detail: ratesReady ? "Ready — rates can be pushed to OTAs" : "Fix issues above first",
    },
  ];

  return (
    <Card className={allOk ? "border-green-200 dark:border-green-800" : "border-yellow-200 dark:border-yellow-800"} data-testid="card-connection-health">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {allOk
            ? <CheckCircle className="h-4 w-4 text-green-500" />
            : <AlertCircle className="h-4 w-4 text-yellow-500" />}
          Setup Health Check
          <span className={`ml-auto text-xs font-normal px-2 py-0.5 rounded-full ${allOk ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"}`}>
            {allOk ? "All systems ready" : "Action required"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {checks.map(check => (
            <div key={check.label} className={`rounded-lg border p-3 ${check.ok ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {check.ok
                  ? <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                <span className={`text-xs font-semibold ${check.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>{check.label}</span>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Channel Manager</h1>
          <p className="text-muted-foreground">Manage OTA distribution via AioSell</p>
        </div>
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
          </TabsList>
          <TabsContent value="settings"><SettingsTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="room-mapping"><RoomMappingTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="rate-plans"><RatePlansTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="inventory-calendar"><InventoryCalendarTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="push-rates"><PushRatesTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="push-inventory"><InventoryTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="logs"><SyncLogsTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="whatsapp-test"><WhatsAppTestTab /></TabsContent>
        </Tabs>
        </>
      )}
    </div>
  );
}
