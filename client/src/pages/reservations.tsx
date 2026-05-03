import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CalendarPlus, Phone, Users, Clock, Trash2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Property, RestaurantTable, TableReservation } from "@shared/schema";

type Status = "booked" | "seated" | "completed" | "cancelled" | "no-show";

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  booked: { label: "Booked", cls: "bg-blue-500 text-white" },
  seated: { label: "Seated", cls: "bg-emerald-500 text-white" },
  completed: { label: "Completed", cls: "bg-slate-500 text-white" },
  cancelled: { label: "Cancelled", cls: "bg-rose-500 text-white" },
  "no-show": { label: "No-show", cls: "bg-amber-500 text-white" },
};

export default function Reservations() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [dateOffset, setDateOffset] = useState(0); // 0 = today, 1 = tomorrow, etc.
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    guestName: "",
    phone: "",
    partySize: "2",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "19:30",
    durationMinutes: "90",
    tableId: "any",
    notes: "",
  });

  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const propertyIdNum = useMemo(() => {
    if (selectedPropertyId) return Number(selectedPropertyId);
    return properties?.[0]?.id ?? null;
  }, [selectedPropertyId, properties]);

  const dayDate = useMemo(() => addDays(new Date(), dateOffset), [dateOffset]);
  const fromIso = startOfDay(dayDate).toISOString();
  const toIso = endOfDay(dayDate).toISOString();

  const { data: tables } = useQuery<RestaurantTable[]>({
    queryKey: ["/api/restaurant-tables", propertyIdNum],
    enabled: !!propertyIdNum,
    queryFn: async () => {
      const res = await fetch(`/api/restaurant-tables?propertyId=${propertyIdNum}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load tables");
      return res.json();
    },
  });

  const { data: reservations, isLoading } = useQuery<TableReservation[]>({
    queryKey: ["/api/table-reservations", propertyIdNum, fromIso, toIso],
    enabled: !!propertyIdNum,
    queryFn: async () => {
      const res = await fetch(
        `/api/table-reservations?propertyId=${propertyIdNum}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load reservations");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!propertyIdNum) throw new Error("Pick a property first");
      if (!form.guestName.trim()) throw new Error("Guest name required");
      const reservationAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      return apiRequest("/api/table-reservations", "POST", {
        propertyId: propertyIdNum,
        tableId: form.tableId === "any" ? null : Number(form.tableId),
        guestName: form.guestName.trim(),
        phone: form.phone.trim() || null,
        partySize: Number(form.partySize) || 2,
        reservationAt,
        durationMinutes: Number(form.durationMinutes) || 90,
        status: "booked",
        notes: form.notes.trim() || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Reservation created" });
      queryClient.invalidateQueries({ queryKey: ["/api/table-reservations"] });
      setCreateOpen(false);
      setForm({ ...form, guestName: "", phone: "", notes: "", tableId: "any" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Status }) =>
      apiRequest(`/api/table-reservations/${id}`, "PATCH", { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/table-reservations"] }),
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/table-reservations/${id}`, "DELETE"),
    onSuccess: () => {
      toast({ title: "Reservation deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/table-reservations"] });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const tableNameById = useMemo(() => {
    const m = new Map<number, string>();
    tables?.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [tables]);

  const upcoming = (reservations || []).filter((r) => r.status === "booked");
  const seated = (reservations || []).filter((r) => r.status === "seated");
  const past = (reservations || []).filter((r) => ["completed", "cancelled", "no-show"].includes(r.status));

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" data-testid="text-reservations-title">
            <CalendarPlus className="h-7 w-7 text-primary" /> Table Reservations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-bookings for your restaurant tables — phone/walk-in bookings
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {properties && properties.length > 1 && (
            <Select value={selectedPropertyId || String(propertyIdNum ?? "")} onValueChange={setSelectedPropertyId}>
              <SelectTrigger className="w-56" data-testid="select-property">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setCreateOpen(true)} data-testid="button-new-reservation">
            <CalendarPlus className="h-4 w-4 mr-2" /> New Reservation
          </Button>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 flex-wrap">
        {[0, 1, 2, 3, 4, 5, 6].map((off) => {
          const d = addDays(new Date(), off);
          const isActive = off === dateOffset;
          return (
            <button
              key={off}
              onClick={() => setDateOffset(off)}
              className={`px-3 py-2 rounded-md border text-sm hover-elevate active-elevate-2 ${isActive ? "border-primary bg-primary/10 font-semibold" : "border-border"}`}
              data-testid={`button-day-${off}`}
            >
              {off === 0 ? "Today" : off === 1 ? "Tomorrow" : format(d, "EEE dd")}
            </button>
          );
        })}
      </div>

      {/* Lists */}
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ResColumn title="Upcoming" tone="border-blue-500" items={upcoming}
            tableNameById={tableNameById}
            onAction={(id, status) => updateStatusMutation.mutate({ id, status })}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
          <ResColumn title="Seated" tone="border-emerald-500" items={seated}
            tableNameById={tableNameById}
            onAction={(id, status) => updateStatusMutation.mutate({ id, status })}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
          <ResColumn title="Closed" tone="border-slate-400" items={past}
            tableNameById={tableNameById}
            onAction={(id, status) => updateStatusMutation.mutate({ id, status })}
            onDelete={(id) => deleteMutation.mutate(id)}
            isPast
          />
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
            <DialogDescription>Book a table in advance for a guest.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="r-name">Guest Name *</Label>
              <Input id="r-name" value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} data-testid="input-res-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-phone">Phone</Label>
                <Input id="r-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-res-phone" />
              </div>
              <div>
                <Label htmlFor="r-party">Party Size *</Label>
                <Input id="r-party" type="number" min={1} value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })} data-testid="input-res-party" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="r-date">Date *</Label>
                <Input id="r-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="input-res-date" />
              </div>
              <div>
                <Label htmlFor="r-time">Time *</Label>
                <Input id="r-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} data-testid="input-res-time" />
              </div>
              <div>
                <Label htmlFor="r-dur">Duration (min)</Label>
                <Input id="r-dur" type="number" min={15} step={15} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} data-testid="input-res-duration" />
              </div>
            </div>
            <div>
              <Label htmlFor="r-table">Table</Label>
              <Select value={form.tableId} onValueChange={(v) => setForm({ ...form, tableId: v })}>
                <SelectTrigger id="r-table" data-testid="select-res-table">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any table (assign later)</SelectItem>
                  {tables?.filter((t) => t.isActive !== false).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {/^table\b/i.test(t.name) ? t.name : `Table ${t.name}`} (cap {t.capacity ?? 4})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="r-notes">Notes</Label>
              <Textarea id="r-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Birthday, allergies, special requests…" data-testid="input-res-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} data-testid="button-create-reservation">
              {createMutation.isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResColumn({
  title, tone, items, tableNameById, onAction, onDelete, isPast,
}: {
  title: string;
  tone: string;
  items: TableReservation[];
  tableNameById: Map<number, string>;
  onAction: (id: number, status: Status) => void;
  onDelete: (id: number) => void;
  isPast?: boolean;
}) {
  return (
    <Card className={`border-t-4 ${tone}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No reservations</p>
        ) : (
          items.map((r) => {
            const tableLabel = r.tableId
              ? (tableNameById.get(r.tableId) || `#${r.tableId}`)
              : "Unassigned";
            const meta = STATUS_META[r.status as Status];
            return (
              <div key={r.id} className="border rounded-md p-3 space-y-2 hover-elevate" data-testid={`row-reservation-${r.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.guestName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Users className="h-3 w-3" /> Party of {r.partySize}
                      {r.phone && <><Phone className="h-3 w-3 ml-1" /> {r.phone}</>}
                    </p>
                  </div>
                  <Badge className={`${meta?.cls ?? ""} text-xs border-0`}>{meta?.label ?? r.status}</Badge>
                </div>
                <div className="text-sm flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{format(new Date(r.reservationAt), "EEE dd MMM • h:mm a")}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{tableLabel}</span>
                </div>
                {r.notes && <p className="text-xs text-muted-foreground italic">"{r.notes}"</p>}
                {!isPast && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {r.status === "booked" && (
                      <>
                        <Button size="sm" className="h-7 text-xs" onClick={() => onAction(r.id, "seated")} data-testid={`button-seat-${r.id}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Seat
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction(r.id, "no-show")} data-testid={`button-noshow-${r.id}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />No-show
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction(r.id, "cancelled")} data-testid={`button-cancel-${r.id}`}>
                          <XCircle className="h-3 w-3 mr-1" />Cancel
                        </Button>
                      </>
                    )}
                    {r.status === "seated" && (
                      <Button size="sm" className="h-7 text-xs" onClick={() => onAction(r.id, "completed")} data-testid={`button-complete-${r.id}`}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />Mark complete
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => onDelete(r.id)} data-testid={`button-delete-${r.id}`}>
                    <Trash2 className="h-3 w-3 mr-1" />Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
