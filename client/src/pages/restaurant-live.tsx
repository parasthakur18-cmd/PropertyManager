import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Clock, IndianRupee, ReceiptText, CheckCircle2, Banknote, Smartphone, CreditCard, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Order, RestaurantTable, Property, TableReservation } from "@shared/schema";
import { formatDistanceToNowStrict, format } from "date-fns";

type PayMethod = "cash" | "upi" | "card" | "split" | "room";

interface TableState {
  table: RestaurantTable;
  openOrders: Order[];
  total: number;
  itemCount: number;
  oldestAt: Date | null;
  customerNames: string[];
}

function normaliseTableName(s: string | null | undefined) {
  return String(s ?? "").trim().toLowerCase();
}

export default function RestaurantLive() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [settleTable, setSettleTable] = useState<TableState | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [splitCashAmount, setSplitCashAmount] = useState("");
  const [splitUpiAmount, setSplitUpiAmount] = useState("");
  const [chargeToRoom, setChargeToRoom] = useState(false);

  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const { data: tables, isLoading: tablesLoading } = useQuery<RestaurantTable[]>({
    queryKey: ["/api/restaurant-tables"],
  });
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 10_000,
  });

  // Auto-pick first property
  const propertyIdNum = useMemo(() => {
    if (selectedPropertyId) return Number(selectedPropertyId);
    return properties?.[0]?.id ?? null;
  }, [selectedPropertyId, properties]);

  // Upcoming reservations for the next 3 hours — used to flag tables that
  // are about to be occupied so floor staff don't seat walk-ins on them.
  const nowIso = useMemo(() => new Date().toISOString(), []);
  const soonIso = useMemo(() => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), []);
  const { data: upcomingReservations } = useQuery<TableReservation[]>({
    queryKey: ["/api/table-reservations", propertyIdNum, "live", nowIso],
    enabled: !!propertyIdNum,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await fetch(
        `/api/table-reservations?propertyId=${propertyIdNum}&from=${encodeURIComponent(nowIso)}&to=${encodeURIComponent(soonIso)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const reservationByTableId = useMemo(() => {
    const m = new Map<number, TableReservation>();
    (upcomingReservations || [])
      .filter((r) => r.status === "booked" && r.tableId != null)
      .forEach((r) => {
        const existing = m.get(r.tableId!);
        if (!existing || new Date(r.reservationAt) < new Date(existing.reservationAt)) {
          m.set(r.tableId!, r);
        }
      });
    return m;
  }, [upcomingReservations]);

  // Build per-table snapshot
  const tableStates: TableState[] = useMemo(() => {
    if (!tables || !orders || !propertyIdNum) return [];
    const propTables = tables.filter((t) => t.propertyId === propertyIdNum && t.isActive !== false);
    return propTables.map((table) => {
      const open = orders.filter((o) => {
        if (o.orderType !== "restaurant") return false;
        if (o.propertyId !== propertyIdNum) return false;
        if ((o as any).isTest) return false;
        if (o.paymentStatus === "paid") return false;
        if (o.status === "cancelled") return false;
        return normaliseTableName(o.tableNumber) === normaliseTableName(table.name);
      });
      const total = open.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
      const itemCount = open.reduce((s, o) => {
        const items = (o.items as any[]) ?? [];
        return s + items.reduce((n, it) => n + (Number(it.quantity) || 1), 0);
      }, 0);
      const oldestAt = open.length
        ? open
            .map((o) => new Date(o.createdAt as any))
            .sort((a, b) => a.getTime() - b.getTime())[0]
        : null;
      const customerNames = Array.from(
        new Set(open.map((o) => (o.customerName || "Guest").trim()).filter(Boolean))
      );
      return { table, openOrders: open, total, itemCount, oldestAt, customerNames };
    });
  }, [tables, orders, propertyIdNum]);

  const occupiedCount = tableStates.filter((t) => t.openOrders.length > 0).length;
  const totalRevenueOpen = tableStates.reduce((s, t) => s + t.total, 0);

  // Settle: mark every open order on the table as delivered + paid.
  // Sequential (so wallet writes happen one-by-one and are deterministic),
  // but resilient — if one leg fails we keep the partial result and tell
  // the user exactly which order failed instead of leaving them guessing.
  const settleMutation = useMutation({
    mutationFn: async ({ orderIds, method }: { orderIds: number[]; method: PayMethod }) => {
      const settled: number[] = [];
      const warnings: string[] = [];
      for (const id of orderIds) {
        try {
          const res = await apiRequest(`/api/orders/${id}/status`, "PATCH", {
            status: "delivered",
            paymentMethod: method,
          });
          const body = await res.json();
          settled.push(id);
          if (body?.walletWarning) warnings.push(`#${id}: ${body.walletWarning}`);
        } catch (err: any) {
          const failedId = id;
          const remaining = orderIds.filter((x) => !settled.includes(x) && x !== failedId);
          // Throw enriched so onError can tell the user exactly what happened.
          const e: any = new Error(err?.message || "Network error");
          e.settled = settled;
          e.failedId = failedId;
          e.remaining = remaining;
          throw e;
        }
      }
      return { settled, warnings };
    },
    onSuccess: ({ settled, warnings }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Table settled",
        description: `${settled.length} order${settled.length > 1 ? "s" : ""} marked paid (${payMethod.toUpperCase()})`,
      });
      if (warnings.length) {
        setTimeout(() => {
          toast({ title: "Wallet not updated", description: warnings.join(" · "), variant: "destructive" });
        }, 400);
      }
      setSettleTable(null);
    },
    onError: (err: any) => {
      // Always refresh so the UI shows what actually got paid.
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      const settled: number[] = err?.settled ?? [];
      const failedId: number | undefined = err?.failedId;
      const remaining: number[] = err?.remaining ?? [];
      if (settled.length) {
        toast({
          title: "Partial settle — fix needed",
          description:
            `${settled.length} order${settled.length > 1 ? "s" : ""} paid. ` +
            `Order #${failedId} failed (${err?.message}). ` +
            (remaining.length ? `${remaining.length} still open. ` : "") +
            `Re-tap "Generate Bill & Settle" to retry the rest.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Settle failed", description: err?.message ?? "Unknown error", variant: "destructive" });
      }
    },
  });

  const isLoading = tablesLoading || ordersLoading;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="heading-live-tables">
            Live Tables
          </h1>
          <p className="text-sm text-muted-foreground">
            Open orders by table — tap to settle and free the table
          </p>
        </div>
        <Select
          value={propertyIdNum?.toString() ?? ""}
          onValueChange={(v) => setSelectedPropertyId(v)}
        >
          <SelectTrigger className="w-[260px]" data-testid="select-property">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {properties?.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card data-testid="summary-occupied">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Occupied</p>
            <p className="text-2xl font-bold">
              {occupiedCount}<span className="text-sm font-normal text-muted-foreground">/{tableStates.length}</span>
            </p>
          </CardContent>
        </Card>
        <Card data-testid="summary-open-revenue">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open Revenue</p>
            <p className="text-2xl font-bold">₹{totalRevenueOpen.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card data-testid="summary-free">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Free Tables</p>
            <p className="text-2xl font-bold text-emerald-600">
              {tableStates.length - occupiedCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tables grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : tableStates.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No tables for this property yet. Add tables in <b>Tables &amp; QR</b>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tableStates.map((ts) => {
            const occupied = ts.openOrders.length > 0;
            return (
              <Card
                key={ts.table.id}
                className={`hover-elevate transition-all ${
                  occupied
                    ? "border-amber-400/70 bg-amber-50/40 dark:bg-amber-950/10"
                    : "border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-950/10"
                }`}
                data-testid={`card-table-${ts.table.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{ts.table.name}</CardTitle>
                    <Badge
                      variant={occupied ? "default" : "outline"}
                      className={occupied ? "bg-amber-600" : "text-emerald-700 border-emerald-400"}
                      data-testid={`badge-status-${ts.table.id}`}
                    >
                      {occupied ? "Occupied" : "Free"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Users className="h-3 w-3" /> {ts.table.capacity ?? 4} seats
                    {ts.table.location ? <span>· {ts.table.location}</span> : null}
                  </p>
                  {(() => {
                    const r = reservationByTableId.get(ts.table.id);
                    if (!r) return null;
                    return (
                      <div
                        className="mt-2 rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 text-xs flex items-center gap-1 text-blue-800 dark:text-blue-200"
                        data-testid={`badge-reservation-${ts.table.id}`}
                      >
                        <Clock className="h-3 w-3" />
                        <span className="font-semibold">{format(new Date(r.reservationAt), "h:mm a")}</span>
                        <span className="truncate">· {r.guestName} (party {r.partySize})</span>
                      </div>
                    );
                  })()}
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {occupied ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ReceiptText className="h-3 w-3" /> {ts.openOrders.length} order
                          {ts.openOrders.length > 1 ? "s" : ""} · {ts.itemCount} items
                        </span>
                      </div>
                      <div className="text-xl font-bold flex items-center" data-testid={`text-total-${ts.table.id}`}>
                        <IndianRupee className="h-4 w-4" />
                        {ts.total.toFixed(0)}
                      </div>
                      {ts.customerNames.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          👤 {ts.customerNames.join(", ")}
                        </p>
                      )}
                      {ts.oldestAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNowStrict(ts.oldestAt, { addSuffix: true })}
                        </p>
                      )}
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          setPayMethod("cash");
                          setSettleTable(ts);
                        }}
                        data-testid={`button-settle-${ts.table.id}`}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Generate Bill &amp; Settle
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-3 text-center italic">
                      No open orders
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Settle dialog */}
      <Dialog open={!!settleTable} onOpenChange={(o) => !o && setSettleTable(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-settle">
          <DialogHeader>
            <DialogTitle>Settle {settleTable?.table.name}</DialogTitle>
            <DialogDescription>
              Consolidate all open orders on this table into one bill and mark it paid.
            </DialogDescription>
          </DialogHeader>

          {settleTable && (
            <div className="space-y-4 py-2">
              {/* Order list */}
              <div className="border rounded max-h-56 overflow-auto divide-y">
                {settleTable.openOrders.map((o) => {
                  const items = (o.items as any[]) ?? [];
                  return (
                    <div key={o.id} className="p-2 text-sm" data-testid={`bill-row-${o.id}`}>
                      <div className="flex justify-between font-medium">
                        <span>#{o.id} · {o.customerName || "Guest"}</span>
                        <span>₹{Number(o.totalAmount ?? 0).toFixed(0)}</span>
                      </div>
                      <ul className="text-xs text-muted-foreground ml-2 mt-1 list-disc list-inside">
                        {items.map((it: any, idx: number) => (
                          <li key={idx}>
                            {it.quantity}× {it.name}
                            {it.price ? ` — ₹${Number(it.price).toFixed(0)}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Grand Total</span>
                <span data-testid="text-grand-total">₹{settleTable.total.toFixed(0)}</span>
              </div>

              {/* Payment method picker */}
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "cash", label: "Cash", icon: Banknote },
                    { key: "upi", label: "UPI", icon: Smartphone },
                    { key: "split", label: "Split", icon: CreditCard },
                  ] as { key: PayMethod; label: string; icon: any }[]
                ).map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    type="button"
                    variant={payMethod === key ? "default" : "outline"}
                    onClick={() => setPayMethod(key)}
                    data-testid={`button-pay-${key}`}
                  >
                    <Icon className="h-4 w-4 mr-1" /> {label}
                  </Button>
                ))}
              </div>

              {payMethod === "split" && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Cash (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={splitCashAmount}
                        onChange={(e) => setSplitCashAmount(e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        data-testid="input-split-cash"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">UPI (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={splitUpiAmount}
                        onChange={(e) => setSplitUpiAmount(e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        data-testid="input-split-upi"
                      />
                    </div>
                  </div>
                </div>
              )}

              {payMethod === "room" && (
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <input
                    id="charge-to-room"
                    type="checkbox"
                    checked={chargeToRoom}
                    onChange={(e) => setChargeToRoom(e.target.checked)}
                    data-testid="checkbox-charge-to-room"
                  />
                  <label htmlFor="charge-to-room" className="text-sm">
                    Add this bill to room
                  </label>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleTable(null)} data-testid="button-cancel-settle">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!settleTable) return;
                const total = Number(settleTable.total || 0);
                settleMutation.mutate({
                  orderIds: settleTable.openOrders.map((o) => o.id),
                  method: payMethod,
                  ...(payMethod === "split"
                    ? {
                        cashAmount: Number(splitCashAmount || 0) || total,
                        upiAmount: Number(splitUpiAmount || 0),
                      }
                    : {}),
                  ...(payMethod === "room" ? { chargeToRoom } : {}),
                });
              }}
              disabled={settleMutation.isPending || !settleTable?.openOrders.length}
              data-testid="button-confirm-settle"
            >
              {settleMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Settling…</>
              ) : (
                <>Confirm ₹{settleTable?.total.toFixed(0) ?? "0"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
