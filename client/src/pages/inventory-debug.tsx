import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Bug, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, Info, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQuery as usePropsQuery } from "@tanstack/react-query";

interface PropertyBasic { id: number; name: string; }

function fmtTime(s: string | null | undefined) {
  if (!s) return "—";
  try { return format(new Date(s), "dd MMM HH:mm:ss"); } catch { return s; }
}

function StatusBadge({ status }: { status: string }) {
  if (status === "SYNCED") return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-mono">✓ SYNCED</Badge>;
  if (status === "MISMATCH") return <Badge className="bg-red-100 text-red-800 border border-red-200 text-xs font-mono">✗ MISMATCH</Badge>;
  if (status === "NEVER_PUSHED") return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-mono">⏳ NEVER_PUSHED</Badge>;
  return <Badge variant="outline" className="text-xs font-mono">{status}</Badge>;
}

function MappingAuditCard({ mapping }: { mapping: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 text-left">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-mono text-sm font-semibold">{mapping.aiosellRoomCode}</span>
          <Badge variant="outline" className="text-xs">{mapping.hostezeeRoomType}</Badge>
          {mapping.isDormitory && <Badge className="text-xs bg-purple-100 text-purple-800">🛏 Dormitory</Badge>}
          <Badge variant="outline" className={`text-xs ${mapping.matchStatus === "OK" ? "text-emerald-600" : "text-red-600"}`}>{mapping.matchStatus}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">Capacity: {mapping.totalCapacity} {mapping.isDormitory ? "beds" : "rooms"}</span>
      </button>
      {open && (
        <div className="px-4 py-3 text-sm space-y-2 border-t">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div><span className="text-muted-foreground">Mapping ID:</span> <code>{mapping.mappingId}</code></div>
            <div><span className="text-muted-foreground">Aiosell Room ID:</span> <code>{mapping.aiosellRoomId || "—"}</code></div>
            <div><span className="text-muted-foreground">Active Rooms:</span> <code>{mapping.activeRoomCount}</code></div>
            <div><span className="text-muted-foreground">Blocked Rooms:</span> <code>{mapping.blockedRooms.length}</code></div>
          </div>
          {mapping.matchedRooms.length > 0 && (
            <div>
              <p className="font-medium text-xs text-muted-foreground mb-1">Matched Hostezee Rooms:</p>
              <div className="space-y-1">
                {mapping.matchedRooms.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-xs font-mono bg-muted/30 px-2 py-1 rounded">
                    <span className="text-muted-foreground">#{r.id}</span>
                    <span>{r.roomNumber}</span>
                    <span className="text-muted-foreground">{r.roomType}</span>
                    {r.roomCategory === "dormitory" && <span className="text-purple-600">🛏 {r.totalBeds} beds</span>}
                    <Badge variant="outline" className={`text-[10px] ml-auto ${r.status === "available" ? "text-emerald-600" : "text-red-600"}`}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DateRow({ day }: { day: any }) {
  const [open, setOpen] = useState(false);
  const hasMismatch = day.mappings.some((m: any) => m.status === "MISMATCH");
  const hasNeverPushed = day.mappings.some((m: any) => m.status === "NEVER_PUSHED");

  return (
    <div className={`border rounded-lg overflow-hidden mb-2 ${hasMismatch ? "border-red-300 dark:border-red-700" : hasNeverPushed ? "border-amber-300" : "border-emerald-200"}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40">
        {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
        <span className="font-mono text-sm font-semibold w-28">{day.date}</span>
        <StatusBadge status={day.dayStatus} />
        <div className="ml-auto flex gap-2 flex-wrap">
          {day.mappings.map((m: any) => (
            <span key={m.roomCode} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${m.status === "MISMATCH" ? "bg-red-100 text-red-700" : m.status === "NEVER_PUSHED" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              {m.roomCode.split("-").slice(-2).join("-")}: H{m.hostezee?.available ?? "?"}
              {m.lastPushed && m.status === "MISMATCH" ? ` LP${m.lastPushed.available}` : ""}
            </span>
          ))}
        </div>
      </button>
      {open && (
        <div className="border-t divide-y">
          {day.mappings.map((m: any) => (
            <div key={m.roomCode} className={`px-4 py-3 text-xs ${m.status === "MISMATCH" ? "bg-red-50 dark:bg-red-900/10" : m.status === "NEVER_PUSHED" ? "bg-amber-50 dark:bg-amber-900/10" : "bg-muted/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                <code className="font-semibold">{m.roomCode}</code>
                <StatusBadge status={m.status} />
                {m.stopSell && <Badge className="text-[10px] bg-slate-200 text-slate-700">🚫 Stop-Sell</Badge>}
                {m.isDormitory && <Badge className="text-[10px] bg-purple-100 text-purple-700">Dormitory</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                  <p className="text-muted-foreground mb-0.5">Hostezee (now)</p>
                  <p className="text-lg font-bold text-blue-700">{m.hostezee?.available ?? "—"}</p>
                  {m.isDormitory
                    ? <p className="text-muted-foreground mt-0.5">{m.hostezee?.occupied ?? 0} of {m.hostezee?.totalBeds} beds occupied</p>
                    : <p className="text-muted-foreground mt-0.5">{m.hostezee?.bookedRooms ?? 0} of {m.hostezee?.totalRooms} rooms booked</p>}
                </div>
                <div className={`rounded p-2 ${m.status === "MISMATCH" ? "bg-red-50 dark:bg-red-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}`}>
                  <p className="text-muted-foreground mb-0.5">Last Pushed (LP)</p>
                  {m.lastPushed
                    ? <>
                        <p className={`text-lg font-bold ${m.status === "MISMATCH" ? "text-red-700" : "text-emerald-700"}`}>{m.lastPushed.available}</p>
                        <p className="text-muted-foreground mt-0.5">{fmtTime(m.lastPushed.pushTime)}</p>
                        <p className="text-muted-foreground">Log #{m.lastPushed.logId}</p>
                      </>
                    : <p className="text-amber-600 font-medium">Never pushed</p>}
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <p className="text-muted-foreground mb-0.5">Difference</p>
                  {m.difference !== null
                    ? <p className={`text-lg font-bold ${Math.abs(m.difference) > 0 ? "text-red-600" : "text-emerald-600"}`}>{m.difference > 0 ? `+${m.difference}` : m.difference}</p>
                    : <p className="text-muted-foreground">—</p>}
                  <p className="text-muted-foreground mt-0.5">Aiosell Live: no GET API</p>
                </div>
              </div>
              {m.bookingsContributing?.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Bookings contributing to occupancy ({m.bookingsContributing.length}):</p>
                  <div className="space-y-1">
                    {m.bookingsContributing.map((b: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 font-mono bg-white dark:bg-muted/40 border rounded px-2 py-1">
                        <span className="text-muted-foreground">#{b.bookingId}</span>
                        <span className="font-semibold truncate max-w-[120px]">{b.guestName}</span>
                        <Badge variant="outline" className="text-[9px]">{b.source || "direct"}</Badge>
                        <Badge variant="outline" className="text-[9px]">{b.type}</Badge>
                        {b.externalId && <span className="text-muted-foreground text-[9px]">ext:{b.externalId}</span>}
                        <span className="ml-auto">{b.beds} bed{b.beds !== 1 ? "s" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {m.perRoomBreakdown?.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-muted-foreground mb-1">Per-room bed breakdown:</p>
                  <div className="flex flex-wrap gap-2">
                    {m.perRoomBreakdown.map((r: any) => (
                      <div key={r.roomId} className="bg-white dark:bg-muted/40 border rounded px-2 py-1 text-[10px] font-mono">
                        Room {r.roomNumber}: {r.bedsBooked}/{r.capacity} beds used
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InventoryDebug() {
  const today = new Date().toISOString().split("T")[0];
  const plus13 = new Date(); plus13.setDate(plus13.getDate() + 13);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(plus13.toISOString().split("T")[0]);
  const [fetchKey, setFetchKey] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "MISMATCH" | "NEVER_PUSHED">("ALL");

  const { data: properties } = usePropsQuery<PropertyBasic[]>({
    queryKey: ["/api/properties"],
  });

  const propId = selectedPropertyId || String(properties?.[0]?.id || "");

  const { data, isLoading, isFetching, error } = useQuery<any>({
    queryKey: ["/api/admin/inventory/debug", propId, fromDate, toDate, fetchKey],
    queryFn: async () => {
      if (!propId) return null;
      const r = await fetch(`/api/admin/inventory/debug/${propId}?from=${fromDate}&to=${toDate}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: !!propId,
    staleTime: 0,
  });

  function downloadJSON() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `inventory-audit-property${propId}-${today}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const filteredDays = data?.inventoryAudit?.filter((d: any) => {
    if (filter === "ALL") return true;
    return d.dayStatus === filter;
  }) || [];

  const mismatchDays = data?.inventoryAudit?.filter((d: any) => d.dayStatus === "MISMATCH") || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Bug className="w-6 h-6 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold">Inventory Debug Audit</h1>
          <p className="text-sm text-muted-foreground">Full breakdown: Hostezee calculation vs last-pushed vs Aiosell Live</p>
        </div>
        <div className="ml-auto flex gap-2">
          {data && <Button variant="outline" size="sm" onClick={downloadJSON} className="gap-1.5"><Download className="w-3.5 h-3.5" />Download JSON</Button>}
          <Button size="sm" variant="outline" onClick={() => setFetchKey(k => k + 1)} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Property</Label>
          <Select value={propId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select property" /></SelectTrigger>
            <SelectContent>{properties?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36" />
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => {
            const t = new Date(); t.setDate(t.getDate() + d - 1);
            return <Button key={d} variant="outline" size="sm" className="text-xs" onClick={() => { setFromDate(today); setToDate(t.toISOString().split("T")[0]); }}>{d}d</Button>;
          })}
        </div>
      </div>

      {/* Aiosell Live Note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg px-4 py-3 mb-5 text-sm">
        <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5"><Info className="w-4 h-4" />Why Aiosell Live May Differ from "SYNCED"</p>
        <ol className="list-decimal ml-5 mt-2 space-y-1 text-amber-800 dark:text-amber-300 text-xs">
          <li>OTA bookings arrived through Aiosell <em>after</em> the last Hostezee push. Aiosell subtracts these from the displayed count.</li>
          <li>A push partially applied — Aiosell accepted the request but processed only some ranges (now fixed: each range is a separate API call).</li>
          <li>Aiosell's "Update Rooms" screen may show: <em>what we pushed minus Aiosell's own OTA booking count</em>, not just what we pushed.</li>
        </ol>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" /><span>Running inventory audit…</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{String(error)}</div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Cells", value: data.summary.totalCells, color: "text-foreground", bg: "bg-muted/40" },
              { label: "✓ Synced", value: data.summary.synced, color: "text-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
              { label: "✗ Mismatches", value: data.summary.mismatches, color: "text-red-700", bg: data.summary.mismatches > 0 ? "bg-red-50 dark:bg-red-900/10 border border-red-200" : "bg-muted/40" },
              { label: "⏳ Never Pushed", value: data.summary.neverPushed, color: "text-amber-700", bg: data.summary.neverPushed > 0 ? "bg-amber-50 border border-amber-200" : "bg-muted/40" },
            ].map(card => (
              <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Aiosell Config */}
          <div className="bg-muted/30 rounded-lg px-4 py-3 mb-5 text-xs font-mono grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><span className="text-muted-foreground">Hotel Code:</span> <strong>{data.config.hotelCode}</strong></div>
            <div><span className="text-muted-foreground">PMS Name:</span> <strong>{data.config.pmsName}</strong></div>
            <div><span className="text-muted-foreground">API:</span> <strong>{data.config.apiBaseUrl}</strong></div>
            <div><span className="text-muted-foreground">Last Sync:</span> <strong>{fmtTime(data.config.lastSyncAt)}</strong></div>
            <div><span className="text-muted-foreground">Generated:</span> <strong>{fmtTime(data.generatedAt)}</strong></div>
            <div><span className="text-muted-foreground">Aiosell Live API:</span> <strong className="text-red-600">{data.aiosellLive.available ? "✓ Available" : "✗ No GET endpoint"}</strong></div>
          </div>

          {/* Mismatch Summary */}
          {mismatchDays.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm">
              <p className="font-semibold text-red-800 dark:text-red-300 mb-2">⚠️ {mismatchDays.length} date(s) with mismatches</p>
              <div className="flex flex-wrap gap-2">
                {data.summary.mismatchedRoomCodes.map((code: string) => (
                  <code key={code} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">{code}</code>
                ))}
              </div>
              <p className="text-xs text-red-700 mt-2">These room types have different availability in Hostezee vs what was last pushed. Go to <strong>Inventory Reconciliation</strong> → <strong>Sync All Rooms (Next 90 Days)</strong> to correct.</p>
            </div>
          )}

          {/* Mapping Audit */}
          <div className="mb-6">
            <h2 className="text-base font-semibold mb-3">Room Mapping Audit ({data.mappingAudit.length} mappings)</h2>
            <div className="space-y-2">
              {data.mappingAudit.map((m: any) => <MappingAuditCard key={m.mappingId} mapping={m} />)}
            </div>
          </div>

          {/* Inventory Per Date */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-base font-semibold">Per-Date Inventory Audit</h2>
              <div className="flex gap-1.5 ml-auto">
                {(["ALL", "MISMATCH", "NEVER_PUSHED"] as const).map(f => (
                  <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setFilter(f)}>
                    {f} {f !== "ALL" ? `(${data.inventoryAudit.filter((d: any) => d.dayStatus === f).length})` : `(${data.inventoryAudit.length})`}
                  </Button>
                ))}
              </div>
            </div>
            {filteredDays.length === 0
              ? <div className="text-center py-10 text-muted-foreground text-sm">No dates matching filter.</div>
              : filteredDays.map((d: any) => <DateRow key={d.date} day={d} />)
            }
          </div>

          {/* Recent Push Logs */}
          <div className="mb-6">
            <h2 className="text-base font-semibold mb-3">Recent Inventory Push Logs (last 20)</h2>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">Log ID</th>
                    <th className="text-left py-2 px-3 font-medium">Push Time</th>
                    <th className="text-center py-2 px-3 font-medium">Status</th>
                    <th className="text-center py-2 px-3 font-medium">Ranges</th>
                    <th className="text-left py-2 px-3 font-medium">Aiosell Response</th>
                    <th className="text-left py-2 px-3 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recentPushLogs.map((log: any) => (
                    <tr key={log.id} className={log.status === "success" ? "bg-emerald-50/30" : "bg-red-50/30"}>
                      <td className="py-2 px-3 font-mono">#{log.id}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{fmtTime(log.pushTime)}</td>
                      <td className="py-2 px-3 text-center">
                        {log.status === "success"
                          ? <span className="text-emerald-600 font-semibold">✓ success</span>
                          : <span className="text-red-600 font-semibold">✗ {log.status}</span>}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{log.rangesInPayload ?? "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground truncate max-w-[200px]">{log.aiosellResponse || "—"}</td>
                      <td className="py-2 px-3 text-red-600 truncate max-w-[200px]">{log.errorMessage || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
