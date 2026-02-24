import { useState } from "react";
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
import { AlertCircle, CheckCircle, Trash2, Plus, RefreshCw, Settings, Link2, ArrowUpDown, Calendar, Activity, Loader2, Wifi, WifiOff, Hotel, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePropertyFilter } from "@/hooks/usePropertyFilter";

interface AiosellConfig {
  id: number;
  propertyId: number;
  hotelCode: string;
  pmsName: string;
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

function SettingsTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [hotelCode, setHotelCode] = useState("");
  const [pmsName, setPmsName] = useState("hostezee");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://live.aiosell.com");
  const [isSandbox, setIsSandbox] = useState(true);
  const [initialized, setInitialized] = useState(false);

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
    setIsSandbox(config.isSandbox ?? true);
    setInitialized(true);
  }

  const saveConfig = useMutation({
    mutationFn: async () => {
      if (!hotelCode.trim()) throw new Error("Hotel Code is required");
      return apiRequest("/api/aiosell/config", "POST", { propertyId, hotelCode: hotelCode.trim(), pmsName, apiBaseUrl, isSandbox });
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
                <span>{config.isActive ? "Connected" : "Inactive"} — Hotel Code: <strong>{config.hotelCode}</strong></span>
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
              <p className="text-xs text-muted-foreground">Your PMS identifier registered with AioSell</p>
            </div>
            <div className="space-y-2">
              <Label>API Base URL</Label>
              <Input data-testid="input-api-url" value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Sandbox Mode</Label>
                <p className="text-xs text-muted-foreground">Enable for testing with sandbox credentials</p>
              </div>
              <Switch data-testid="switch-sandbox" checked={isSandbox} onCheckedChange={setIsSandbox} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
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
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
              <Link2 className="h-4 w-4 flex-shrink-0" />
              {`${window.location.origin}/api/aiosell/reservation`}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Provide this URL to AioSell during integration setup. This endpoint receives new bookings, modifications, and cancellations from OTA platforms.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RoomMappingTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [newMappings, setNewMappings] = useState<{ hostezeeRoomType: string; aiosellRoomCode: string }[]>([]);

  const { data: roomTypes = [] } = useQuery<string[]>({
    queryKey: ["/api/rooms/types", propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/types?propertyId=${propertyId}`);
      return res.json();
    },
    enabled: !!propertyId,
  });

  const { data: mappings = [], isLoading } = useQuery<RoomMapping[]>({
    queryKey: ["/api/aiosell/room-mappings", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/room-mappings?propertyId=${propertyId}`);
      return res.json();
    },
    enabled: !!propertyId,
  });

  const saveMappings = useMutation({
    mutationFn: async (allMappings: { hostezeeRoomType: string; aiosellRoomCode: string }[]) => {
      return apiRequest("/api/aiosell/room-mappings", "POST", { propertyId, mappings: allMappings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/room-mappings"] });
      setNewMappings([]);
      toast({ title: "Room mappings saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const existingMappingData = mappings.map(m => ({ hostezeeRoomType: m.hostezeeRoomType, aiosellRoomCode: m.aiosellRoomCode }));
  const allMappings = [...existingMappingData, ...newMappings];

  const addMapping = () => setNewMappings([...newMappings, { hostezeeRoomType: "", aiosellRoomCode: "" }]);

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
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg" data-testid={`row-room-mapping-${index}`}>
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
                    <Label className="text-xs text-muted-foreground">AioSell Room Code</Label>
                    <Input data-testid={`input-aiosell-code-${index}`} value={mapping.aiosellRoomCode} onChange={e => updateMapping(index, "aiosellRoomCode", e.target.value)} placeholder="e.g. SUITE, EXECUTIVE" />
                  </div>
                  <Button variant="ghost" size="icon" className="mt-5" onClick={() => removeMapping(index)} data-testid={`button-remove-mapping-${index}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {newMappings.length > 0 && (
                <Button data-testid="button-save-mappings" className="mt-4" onClick={() => saveMappings.mutate(allMappings)} disabled={saveMappings.isPending}>
                  {saveMappings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save All Mappings
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RatePlansTab({ propertyId }: { propertyId: number }) {
  const { toast } = useToast();
  const [newPlans, setNewPlans] = useState<{ roomMappingId: number; ratePlanName: string; ratePlanCode: string; baseRate: string; occupancy: string }[]>([]);

  const { data: mappings = [] } = useQuery<RoomMapping[]>({
    queryKey: ["/api/aiosell/room-mappings", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/room-mappings?propertyId=${propertyId}`);
      return res.json();
    },
    enabled: !!propertyId,
  });

  const { data: ratePlans = [], isLoading } = useQuery<RatePlan[]>({
    queryKey: ["/api/aiosell/rate-plans", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/rate-plans?propertyId=${propertyId}`);
      return res.json();
    },
    enabled: !!propertyId,
  });

  const savePlans = useMutation({
    mutationFn: async (plans: any[]) => {
      return apiRequest("/api/aiosell/rate-plans", "POST", { propertyId, ratePlans: plans });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/rate-plans"] });
      setNewPlans([]);
      toast({ title: "Rate plans saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const existingData = ratePlans.map(rp => ({
    roomMappingId: rp.roomMappingId,
    ratePlanName: rp.ratePlanName,
    ratePlanCode: rp.ratePlanCode,
    baseRate: rp.baseRate || "",
    occupancy: rp.occupancy,
  }));
  const allPlans = [...existingData, ...newPlans];

  const addPlan = () => setNewPlans([...newPlans, { roomMappingId: 0, ratePlanName: "", ratePlanCode: "", baseRate: "", occupancy: "single" }]);

  const removeFromNew = (i: number) => setNewPlans(newPlans.filter((_, idx) => idx !== i));

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
              <CardDescription>Define rate plans for each room type to push pricing to OTAs</CardDescription>
            </div>
            <Button data-testid="button-add-rate-plan" size="sm" onClick={addPlan}><Plus className="h-4 w-4 mr-1" /> Add Rate Plan</Button>
          </div>
        </CardHeader>
        <CardContent>
          {allPlans.length === 0 ? (
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
                {allPlans.map((plan, index) => {
                  const isNew = index >= existingData.length;
                  const newIndex = index - existingData.length;
                  return (
                    <TableRow key={index} data-testid={`row-rate-plan-${index}`}>
                      <TableCell>
                        <Select
                          value={plan.roomMappingId ? String(plan.roomMappingId) : ""}
                          onValueChange={v => {
                            if (isNew) {
                              const updated = [...newPlans];
                              updated[newIndex].roomMappingId = parseInt(v);
                              setNewPlans(updated);
                            }
                          }}
                          disabled={!isNew}
                        >
                          <SelectTrigger data-testid={`select-room-mapping-${index}`}><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {mappings.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.hostezeeRoomType} ({m.aiosellRoomCode})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input data-testid={`input-rate-plan-name-${index}`} value={plan.ratePlanName} onChange={e => {
                          if (isNew) { const u = [...newPlans]; u[newIndex].ratePlanName = e.target.value; setNewPlans(u); }
                        }} placeholder="Standard Single" disabled={!isNew} />
                      </TableCell>
                      <TableCell>
                        <Input data-testid={`input-rate-plan-code-${index}`} value={plan.ratePlanCode} onChange={e => {
                          if (isNew) { const u = [...newPlans]; u[newIndex].ratePlanCode = e.target.value; setNewPlans(u); }
                        }} placeholder="SUITE-S-101" disabled={!isNew} />
                      </TableCell>
                      <TableCell>
                        <Input data-testid={`input-base-rate-${index}`} type="number" value={plan.baseRate} onChange={e => {
                          if (isNew) { const u = [...newPlans]; u[newIndex].baseRate = e.target.value; setNewPlans(u); }
                        }} placeholder="0" disabled={!isNew} />
                      </TableCell>
                      <TableCell>
                        <Select value={plan.occupancy} onValueChange={v => {
                          if (isNew) { const u = [...newPlans]; u[newIndex].occupancy = v; setNewPlans(u); }
                        }} disabled={!isNew}>
                          <SelectTrigger data-testid={`select-occupancy-${index}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                            <SelectItem value="triple">Triple</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isNew && <Button variant="ghost" size="icon" onClick={() => removeFromNew(newIndex)} data-testid={`button-remove-plan-${index}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {newPlans.length > 0 && (
            <Button data-testid="button-save-rate-plans" className="mt-4" onClick={() => savePlans.mutate(allPlans)} disabled={savePlans.isPending}>
              {savePlans.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save All Rate Plans
            </Button>
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

  const { data: mappings = [] } = useQuery<RoomMapping[]>({
    queryKey: ["/api/aiosell/room-mappings", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/room-mappings?propertyId=${propertyId}`);
      return res.json();
    },
    enabled: !!propertyId,
  });

  const { data: ratePlans = [] } = useQuery<RatePlan[]>({
    queryKey: ["/api/aiosell/rate-plans", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/rate-plans?propertyId=${propertyId}`);
      return res.json();
    },
    enabled: !!propertyId,
  });

  const [rateValues, setRateValues] = useState<Record<string, string>>({});

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
      if (rates.length === 0) throw new Error("Set at least one rate");
      return apiRequest("/api/aiosell/push-rates", "POST", {
        propertyId,
        updates: [{ startDate, endDate, rates }],
      });
    },
    onSuccess: (data: any) => {
      toast({ title: data.success ? "Rates pushed successfully" : "Push failed", description: data.message, variant: data.success ? "default" : "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/sync-logs"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

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
                <TableHead>Room</TableHead>
                <TableHead>Rate Plan</TableHead>
                <TableHead>Occupancy</TableHead>
                <TableHead>Base Rate</TableHead>
                <TableHead>Rate to Push</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratePlans.map(rp => {
                const mapping = mappings.find(m => m.id === rp.roomMappingId);
                return (
                  <TableRow key={rp.id} data-testid={`row-push-rate-${rp.id}`}>
                    <TableCell>{mapping?.hostezeeRoomType || "—"} <span className="text-muted-foreground text-xs">({mapping?.aiosellRoomCode})</span></TableCell>
                    <TableCell>{rp.ratePlanName}</TableCell>
                    <TableCell><Badge variant="outline">{rp.occupancy}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{rp.baseRate || "—"}</TableCell>
                    <TableCell>
                      <Input
                        data-testid={`input-push-rate-${rp.id}`}
                        type="number"
                        className="w-28"
                        placeholder={rp.baseRate || "0"}
                        value={rateValues[rp.ratePlanCode] || ""}
                        onChange={e => setRateValues({ ...rateValues, [rp.ratePlanCode]: e.target.value })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Button data-testid="button-push-rates" onClick={() => pushRatesMutation.mutate()} disabled={pushRatesMutation.isPending}>
            {pushRatesMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Push Rates to All OTAs
          </Button>
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

  const { data: mappings = [] } = useQuery<RoomMapping[]>({
    queryKey: ["/api/aiosell/room-mappings", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/room-mappings?propertyId=${propertyId}`);
      return res.json();
    },
    enabled: !!propertyId,
  });

  const [inventoryValues, setInventoryValues] = useState<Record<string, string>>({});

  const pushInventoryMutation = useMutation({
    mutationFn: async () => {
      const rooms = mappings
        .filter(m => inventoryValues[m.aiosellRoomCode])
        .map(m => ({
          roomCode: m.aiosellRoomCode,
          available: parseInt(inventoryValues[m.aiosellRoomCode] || "0"),
        }));
      if (rooms.length === 0) throw new Error("Set at least one inventory count");
      return apiRequest("/api/aiosell/push-inventory", "POST", {
        propertyId,
        updates: [{ startDate, endDate, rooms }],
      });
    },
    onSuccess: (data: any) => {
      toast({ title: data.success ? "Inventory pushed" : "Push failed", description: data.message, variant: data.success ? "default" : "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/aiosell/sync-logs"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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
                <TableHead>Available Rooms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(m => (
                <TableRow key={m.id} data-testid={`row-inventory-${m.id}`}>
                  <TableCell className="font-medium">{m.hostezeeRoomType}</TableCell>
                  <TableCell><Badge variant="outline">{m.aiosellRoomCode}</Badge></TableCell>
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
              ))}
            </TableBody>
          </Table>

          <Button data-testid="button-push-inventory" onClick={() => pushInventoryMutation.mutate()} disabled={pushInventoryMutation.isPending}>
            {pushInventoryMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Push Inventory to All OTAs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SyncLogsTab({ propertyId }: { propertyId: number }) {
  const { data: logs = [], isLoading, refetch } = useQuery<SyncLog[]>({
    queryKey: ["/api/aiosell/sync-logs", { propertyId }],
    queryFn: async () => {
      const res = await fetch(`/api/aiosell/sync-logs?propertyId=${propertyId}`);
      return res.json();
    },
    enabled: !!propertyId,
  });

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
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id} data-testid={`row-sync-log-${log.id}`}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{getSyncTypeLabel(log.syncType)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.direction === "inbound" ? "Incoming" : "Outgoing"}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.errorMessage || (log.responsePayload ? JSON.stringify(log.responsePayload).slice(0, 100) : "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
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
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid grid-cols-5 w-full" data-testid="tabs-channel-manager">
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
            <TabsTrigger value="room-mapping" data-testid="tab-room-mapping">Room Mapping</TabsTrigger>
            <TabsTrigger value="rate-plans" data-testid="tab-rate-plans">Rate Plans</TabsTrigger>
            <TabsTrigger value="push" data-testid="tab-push">Push Rates & Inventory</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">Sync Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="settings"><SettingsTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="room-mapping"><RoomMappingTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="rate-plans"><RatePlansTab propertyId={propertyId} /></TabsContent>
          <TabsContent value="push">
            <div className="space-y-6">
              <PushRatesTab propertyId={propertyId} />
              <InventoryTab propertyId={propertyId} />
            </div>
          </TabsContent>
          <TabsContent value="logs"><SyncLogsTab propertyId={propertyId} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
