import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertTriangle,
  Play,
  Power,
  RefreshCw,
  Save,
  Trash2,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Property { id: number; name: string; }
interface PricingConfig {
  id: number;
  propertyId: number;
  autoPricingEnabled: boolean;
  emergencyStop: boolean;
  occupancyEnabled: boolean;
  demandEnabled: boolean;
  dayEnabled: boolean;
  festivalEnabled: boolean;
  otaPushEnabled: boolean;
  directBookingEnabled: boolean;
  enforceMinMax: boolean;
  thresholdEnabled: boolean;
  thresholdPercent: string;
  updateFrequencyMinutes: number;
  preset: string;
  festivalDates: Array<{ name: string; date: string; uplift: number }>;
  lastRunAt: string | null;
  lastChangeAt: string | null;
  lastChangeReason: string | null;
}
interface RoomSetting {
  roomId: number;
  roomNumber: string;
  roomType: string;
  pricePerNight: string;
  minPrice: string | null;
  maxPrice: string | null;
  manualOverride: boolean;
  manualPrice: string | null;
}
interface HistoryRow {
  id: number;
  roomId: number;
  forDate: string;
  basePrice: string;
  oldPrice: string | null;
  newPrice: string;
  reasons: string[];
  source: string;
  otaPushed: boolean;
  otaPushError: string | null;
  createdAt: string;
}

export default function DynamicPricingPage() {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState<number | null>(null);

  const { data: properties = [] } = useQuery<Property[]>({ queryKey: ["/api/properties"] });

  // Auto-select first property
  if (properties.length > 0 && propertyId === null) {
    setPropertyId(properties[0].id);
  }

  const configKey = ["/api/pricing/config", propertyId];
  const { data: config, isLoading: configLoading } = useQuery<PricingConfig>({
    queryKey: configKey,
    enabled: propertyId !== null,
  });

  const roomsKey = ["/api/pricing/rooms", propertyId];
  const { data: roomSettings = [] } = useQuery<RoomSetting[]>({
    queryKey: roomsKey,
    enabled: propertyId !== null,
  });

  const historyKey = ["/api/pricing/history", propertyId];
  const { data: history = [] } = useQuery<HistoryRow[]>({
    queryKey: historyKey,
    enabled: propertyId !== null,
  });

  const updateConfig = useMutation({
    mutationFn: async (patch: Partial<PricingConfig>) => {
      return await apiRequest("PATCH", `/api/pricing/config/${propertyId}`, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKey });
      toast({ title: "Saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  const applyPreset = useMutation({
    mutationFn: async (preset: string) => {
      return await apiRequest("POST", `/api/pricing/config/${propertyId}/preset`, { preset });
    },
    onSuccess: (_d, preset) => {
      queryClient.invalidateQueries({ queryKey: configKey });
      toast({ title: `Applied ${preset} preset` });
    },
  });

  const emergencyStop = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/pricing/emergency-stop`, { propertyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKey });
      toast({ title: "🛑 EMERGENCY STOP — all dynamic changes halted", variant: "destructive" });
    },
  });

  const clearEmergencyStop = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/pricing/clear-emergency-stop`, { propertyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKey });
      toast({ title: "Emergency stop cleared" });
    },
  });

  const runNow = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/pricing/run-now/${propertyId}`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: configKey });
      queryClient.invalidateQueries({ queryKey: historyKey });
      toast({
        title: "Pricing cycle complete",
        description: `Changes: ${data?.changesApplied ?? 0} • Errors: ${data?.errors ?? 0}`,
      });
    },
    onError: (e: any) => toast({ title: "Run failed", description: e?.message, variant: "destructive" }),
  });

  const updateRoom = useMutation({
    mutationFn: async ({ roomId, patch }: { roomId: number; patch: any }) => {
      return await apiRequest("PATCH", `/api/pricing/rooms/${roomId}`, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomsKey });
      toast({ title: "Room saved" });
    },
  });

  const setFestivals = (next: PricingConfig["festivalDates"]) => {
    updateConfig.mutate({ festivalDates: next });
  };

  if (configLoading || !config) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const masterOn = config.autoPricingEnabled && !config.emergencyStop;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-dynamic-pricing">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" /> Dynamic Pricing
          </h1>
          <p className="text-sm text-muted-foreground">Flight-style pricing controls. Add-on layer — never touches your booking flow.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={propertyId?.toString() || ""} onValueChange={(v) => setPropertyId(Number(v))}>
            <SelectTrigger className="w-56" data-testid="select-property">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Emergency banner */}
      {config.emergencyStop && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <div className="font-bold">EMERGENCY STOP IS ACTIVE</div>
                <div className="text-sm">No price changes, cron updates, or OTA pushes will run for this property.</div>
              </div>
            </div>
            <Button variant="outline" onClick={() => clearEmergencyStop.mutate()} data-testid="button-clear-emergency-stop">
              Clear Emergency Stop
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Auto Pricing</div>
            <Badge variant={masterOn ? "default" : "secondary"} className="mt-1" data-testid="badge-status">
              {config.emergencyStop ? "EMERGENCY STOP" : config.autoPricingEnabled ? "ON" : "OFF"}
            </Badge>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Last Run</div>
            <div className="font-medium" data-testid="text-last-run">
              {config.lastRunAt ? format(new Date(config.lastRunAt), "MMM d, HH:mm") : "Never"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Last Price Change</div>
            <div className="font-medium" data-testid="text-last-change">
              {config.lastChangeAt ? format(new Date(config.lastChangeAt), "MMM d, HH:mm") : "Never"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Reason</div>
            <div className="font-medium truncate" title={config.lastChangeReason || ""}>
              {config.lastChangeReason || "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Master Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Master Control</CardTitle>
          <CardDescription>One switch turns everything on or off.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-md border">
            <div>
              <Label className="text-base font-semibold">Auto Pricing</Label>
              <p className="text-xs text-muted-foreground">When OFF: no cron updates, no price changes, no OTA pushes.</p>
            </div>
            <Switch
              checked={config.autoPricingEnabled}
              disabled={config.emergencyStop}
              onCheckedChange={(v) => updateConfig.mutate({ autoPricingEnabled: v })}
              data-testid="switch-auto-pricing"
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={config.emergencyStop} data-testid="button-emergency-stop">
                <Power className="h-4 w-4 mr-2" /> STOP ALL DYNAMIC CHANGES
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Activate Emergency Stop?</AlertDialogTitle>
                <AlertDialogDescription>
                  This immediately disables ALL dynamic pricing for this property — overriding every other toggle.
                  Cron updates, price changes, and OTA pushes will halt instantly. Existing prices remain unchanged.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => emergencyStop.mutate()} className="bg-destructive">
                  Yes, STOP everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => runNow.mutate()}
            disabled={runNow.isPending || config.emergencyStop}
            data-testid="button-run-now"
          >
            {runNow.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Run Cycle Now (test)
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="factors">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="factors" data-testid="tab-factors">Factors</TabsTrigger>
          <TabsTrigger value="safety" data-testid="tab-safety">Safety</TabsTrigger>
          <TabsTrigger value="presets" data-testid="tab-presets">Presets</TabsTrigger>
          <TabsTrigger value="rooms" data-testid="tab-rooms">Rooms</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        {/* FACTORS */}
        <TabsContent value="factors">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Factor Toggles</CardTitle>
              <CardDescription>Each switch independently enables/disables one pricing factor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow label="Occupancy-based pricing" desc="Adjusts based on rooms booked vs. available."
                checked={config.occupancyEnabled} onChange={(v) => updateConfig.mutate({ occupancyEnabled: v })} testId="switch-occupancy" />
              <ToggleRow label="Demand-based pricing" desc="Reacts to fast booking pace (last 24h)."
                checked={config.demandEnabled} onChange={(v) => updateConfig.mutate({ demandEnabled: v })} testId="switch-demand" />
              <ToggleRow label="Day / weekend pricing" desc="+20% on Saturdays and Sundays."
                checked={config.dayEnabled} onChange={(v) => updateConfig.mutate({ dayEnabled: v })} testId="switch-day" />
              <ToggleRow label="Festival pricing" desc="Applies uplift on configured festival dates."
                checked={config.festivalEnabled} onChange={(v) => updateConfig.mutate({ festivalEnabled: v })} testId="switch-festival" />
              <Separator />
              <ToggleRow label="OTA price push (Aiosell)" desc="Push computed prices to channel manager."
                checked={config.otaPushEnabled} onChange={(v) => updateConfig.mutate({ otaPushEnabled: v })} testId="switch-ota" />
              <ToggleRow label="Direct booking dynamic pricing"
                desc="Reserved for future integration. Booking flow is currently never modified — this flag is stored only."
                checked={config.directBookingEnabled} onChange={(v) => updateConfig.mutate({ directBookingEnabled: v })} testId="switch-direct" />

              {/* Festival editor */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-semibold">Festival Dates</Label>
                  <Button size="sm" variant="outline" onClick={() => setFestivals([...config.festivalDates, { name: "", date: "", uplift: 0.30 }])} data-testid="button-add-festival">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {config.festivalDates.length === 0 && <p className="text-xs text-muted-foreground">No festival dates configured.</p>}
                  {config.festivalDates.map((f, i) => (
                    <div key={i} className="flex gap-2 items-center" data-testid={`row-festival-${i}`}>
                      <Input placeholder="Name (e.g. Diwali)" value={f.name}
                        onChange={(e) => { const next = [...config.festivalDates]; next[i] = { ...f, name: e.target.value }; setFestivals(next); }} />
                      <Input type="date" value={f.date}
                        onChange={(e) => { const next = [...config.festivalDates]; next[i] = { ...f, date: e.target.value }; setFestivals(next); }} />
                      <div className="flex items-center gap-1">
                        <Input type="number" step="0.05" min="0" max="2" className="w-20"
                          value={f.uplift}
                          onChange={(e) => { const next = [...config.festivalDates]; next[i] = { ...f, uplift: Number(e.target.value) || 0 }; setFestivals(next); }} />
                        <span className="text-xs text-muted-foreground">×</span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setFestivals(config.festivalDates.filter((_, j) => j !== i))} data-testid={`button-remove-festival-${i}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Uplift is the fractional increase. e.g. 0.30 = +30%.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAFETY */}
        <TabsContent value="safety">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Safety Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow label="Enforce min/max prices" desc="Clamp computed price within each room's configured floor and ceiling."
                checked={config.enforceMinMax} onChange={(v) => updateConfig.mutate({ enforceMinMax: v })} testId="switch-enforce-minmax" />
              <ToggleRow label="Update threshold" desc="Only apply changes greater than the threshold below."
                checked={config.thresholdEnabled} onChange={(v) => updateConfig.mutate({ thresholdEnabled: v })} testId="switch-threshold" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="threshold">Threshold (%)</Label>
                  <Input id="threshold" type="number" step="0.5" min="0" max="50"
                    value={config.thresholdPercent}
                    onChange={(e) => updateConfig.mutate({ thresholdPercent: e.target.value })}
                    data-testid="input-threshold" />
                </div>
                <div>
                  <Label htmlFor="freq">Update Frequency (min)</Label>
                  <Input id="freq" type="number" step="5" min="5" max="240"
                    value={config.updateFrequencyMinutes}
                    onChange={(e) => updateConfig.mutate({ updateFrequencyMinutes: Math.max(5, Number(e.target.value) || 30) })}
                    data-testid="input-frequency" />
                  <p className="text-xs text-muted-foreground mt-1">Recommended: 15–30 min.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRESETS */}
        <TabsContent value="presets">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preset Modes</CardTitle>
              <CardDescription>One click sets a recommended bundle of rule values. Current preset: <Badge>{config.preset}</Badge></CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PresetCard name="Conservative" desc="Occupancy + day + festival only. 8% threshold. Hourly updates. OTA push OFF." onClick={() => applyPreset.mutate("conservative")} testId="button-preset-conservative" />
              <PresetCard name="Balanced" desc="All factors. 5% threshold. 30-min updates. OTA push ON." onClick={() => applyPreset.mutate("balanced")} testId="button-preset-balanced" />
              <PresetCard name="Aggressive" desc="All factors incl. direct booking. 3% threshold. 15-min updates." onClick={() => applyPreset.mutate("aggressive")} testId="button-preset-aggressive" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROOMS */}
        <TabsContent value="rooms">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-Room Min / Max & Manual Override</CardTitle>
              <CardDescription>Floor/ceiling for each room. Manual price overrides dynamic engine entirely.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Base ₹</TableHead>
                      <TableHead>Min ₹</TableHead>
                      <TableHead>Max ₹</TableHead>
                      <TableHead>Manual</TableHead>
                      <TableHead>Manual ₹</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roomSettings.map((r) => (
                      <RoomRow key={r.roomId} room={r} onSave={(patch) => updateRoom.mutate({ roomId: r.roomId, patch })} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Price Changes</CardTitle>
              <CardDescription>Last 50 changes for this property.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>For Date</TableHead>
                      <TableHead>Old → New</TableHead>
                      <TableHead>Reasons</TableHead>
                      <TableHead>OTA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No changes recorded yet.</TableCell></TableRow>
                    )}
                    {history.map((h) => {
                      const room = roomSettings.find(r => r.roomId === h.roomId);
                      const oldP = h.oldPrice ? parseFloat(h.oldPrice) : null;
                      const newP = parseFloat(h.newPrice);
                      const up = oldP !== null && newP > oldP;
                      return (
                        <TableRow key={h.id} data-testid={`row-history-${h.id}`}>
                          <TableCell className="text-xs">{format(new Date(h.createdAt), "MMM d HH:mm")}</TableCell>
                          <TableCell>{room?.roomNumber || `#${h.roomId}`}</TableCell>
                          <TableCell>{h.forDate}</TableCell>
                          <TableCell className={up ? "text-green-600" : "text-orange-600"}>
                            {oldP !== null ? `₹${oldP} → ` : ""}<strong>₹{newP}</strong>
                          </TableCell>
                          <TableCell className="text-xs max-w-xs">{h.reasons.join(" • ")}</TableCell>
                          <TableCell>
                            {h.otaPushed ? <Badge variant="default">Pushed</Badge> :
                              h.otaPushError ? <Badge variant="destructive" title={h.otaPushError}>Failed</Badge> :
                              <Badge variant="secondary">—</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange, testId }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md border">
      <div className="pr-4">
        <Label className="font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} />
    </div>
  );
}

function PresetCard({ name, desc, onClick, testId }: { name: string; desc: string; onClick: () => void; testId: string }) {
  return (
    <Card className="hover:border-primary cursor-pointer transition-colors" onClick={onClick} data-testid={testId}>
      <CardContent className="p-4 space-y-2">
        <div className="font-bold">{name}</div>
        <p className="text-xs text-muted-foreground">{desc}</p>
        <Button size="sm" variant="outline" className="w-full mt-2">Apply</Button>
      </CardContent>
    </Card>
  );
}

function RoomRow({ room, onSave }: { room: RoomSetting; onSave: (patch: any) => void }) {
  const [minPrice, setMinPrice] = useState(room.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(room.maxPrice || "");
  const [manualOverride, setManualOverride] = useState(room.manualOverride);
  const [manualPrice, setManualPrice] = useState(room.manualPrice || "");

  const dirty = minPrice !== (room.minPrice || "") ||
    maxPrice !== (room.maxPrice || "") ||
    manualOverride !== room.manualOverride ||
    manualPrice !== (room.manualPrice || "");

  return (
    <TableRow data-testid={`row-room-${room.roomId}`}>
      <TableCell className="font-medium">{room.roomNumber}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{room.roomType}</TableCell>
      <TableCell>₹{parseFloat(room.pricePerNight).toFixed(0)}</TableCell>
      <TableCell><Input type="number" className="w-24" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} data-testid={`input-min-${room.roomId}`} /></TableCell>
      <TableCell><Input type="number" className="w-24" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} data-testid={`input-max-${room.roomId}`} /></TableCell>
      <TableCell><Switch checked={manualOverride} onCheckedChange={setManualOverride} data-testid={`switch-manual-${room.roomId}`} /></TableCell>
      <TableCell><Input type="number" className="w-24" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} disabled={!manualOverride} data-testid={`input-manual-${room.roomId}`} /></TableCell>
      <TableCell>
        <Button size="sm" disabled={!dirty} onClick={() => onSave({
          minPrice: minPrice || null,
          maxPrice: maxPrice || null,
          manualOverride,
          manualPrice: manualPrice || null,
        })} data-testid={`button-save-room-${room.roomId}`}>
          <Save className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
