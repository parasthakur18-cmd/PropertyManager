import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Download, QrCode as QrCodeIcon, Printer, UtensilsCrossed } from "lucide-react";
import QRCodeGenerator from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { RestaurantTable, Property } from "@shared/schema";

type FormState = {
  id?: number;
  name: string;
  capacity: string;
  location: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = { name: "", capacity: "4", location: "", isActive: true };

export default function RestaurantTables() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [qrTable, setQrTable] = useState<RestaurantTable | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });

  // Auto-pick first property
  useEffect(() => {
    if (!selectedPropertyId && properties && properties.length > 0) {
      setSelectedPropertyId(String(properties[0].id));
    }
  }, [properties, selectedPropertyId]);

  const propertyIdNum = selectedPropertyId ? parseInt(selectedPropertyId) : undefined;

  const { data: tables, isLoading } = useQuery<RestaurantTable[]>({
    queryKey: ["/api/restaurant-tables", propertyIdNum],
    queryFn: async () => {
      const url = propertyIdNum != null
        ? `/api/restaurant-tables?propertyId=${propertyIdNum}`
        : `/api/restaurant-tables`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load tables");
      return res.json();
    },
    enabled: propertyIdNum != null,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const payload = {
        propertyId: propertyIdNum,
        name: data.name.trim(),
        capacity: parseInt(data.capacity) || 4,
        location: data.location.trim() || null,
        isActive: data.isActive,
      };
      if (data.id) {
        return await apiRequest(`/api/restaurant-tables/${data.id}`, "PATCH", payload);
      }
      return await apiRequest(`/api/restaurant-tables`, "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant-tables", propertyIdNum] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      toast({ title: form.id ? "Table updated" : "Table created" });
    },
    onError: (err: any) =>
      toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/restaurant-tables/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant-tables", propertyIdNum] });
      setDeleteId(null);
      toast({ title: "Table deleted" });
    },
    onError: (err: any) =>
      toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };
  const openEdit = (t: RestaurantTable) => {
    setForm({
      id: t.id,
      name: t.name,
      capacity: String(t.capacity ?? 4),
      location: t.location ?? "",
      isActive: t.isActive,
    });
    setDialogOpen(true);
  };

  const qrUrl = useMemo(() => {
    if (!qrTable || !propertyIdNum) return "";
    return `${window.location.origin}/customer-menu?property=${propertyIdNum}&table=${encodeURIComponent(qrTable.name)}`;
  }, [qrTable, propertyIdNum]);

  useEffect(() => {
    if (!qrTable || !qrUrl) {
      setQrDataUrl("");
      return;
    }
    QRCodeGenerator.toDataURL(qrUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch((err) => {
        console.error("QR generation failed", err);
        toast({ title: "QR generation failed", description: err.message, variant: "destructive" });
      });
  }, [qrTable, qrUrl, toast]);

  const downloadQR = () => {
    if (!qrDataUrl || !qrTable) return;
    const link = document.createElement("a");
    link.download = `table-${qrTable.name}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const printQR = () => {
    if (!qrDataUrl || !qrTable) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const propName = properties?.find(p => p.id === propertyIdNum)?.name ?? "";
    w.document.write(`
      <html><head><title>Table ${qrTable.name} QR</title>
      <style>
        body { font-family: system-ui; text-align:center; padding:40px; }
        h1 { margin:0 0 8px; font-size:48px; }
        h2 { margin:0 0 24px; color:#666; font-weight:400; }
        img { width:320px; height:320px; }
        p { margin-top:16px; color:#666; }
      </style></head>
      <body>
        <h1>Table ${qrTable.name}</h1>
        <h2>${propName}</h2>
        <img src="${qrDataUrl}" />
        <p>Scan to view menu &amp; order</p>
        <script>setTimeout(()=>{window.print();window.close();},300);</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <QrCodeIcon className="h-6 w-6 text-primary" /> Restaurant Tables &amp; QR
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create dine-in tables, print QR stickers — guests scan to view the menu &amp; place orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[180px]" data-testid="select-property">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties?.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} disabled={!propertyIdNum} data-testid="button-add-table">
            <Plus className="h-4 w-4 mr-1" /> Add Table
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !tables || tables.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <QrCodeIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tables yet</p>
            <p className="text-sm mt-1">Click <b>Add Table</b> to create your first dine-in table.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tables.map((t) => (
            <Card
              key={t.id}
              className={`relative ${!t.isActive ? "opacity-60" : ""}`}
              data-testid={`card-table-${t.id}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span data-testid={`text-table-name-${t.id}`}>{t.name}</span>
                  {!t.isActive && <Badge variant="secondary">Inactive</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Seats {t.capacity ?? "—"}
                  {t.location ? ` · ${t.location}` : ""}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setQrTable(t)}
                    className="flex-1 min-w-0"
                    data-testid={`button-qr-${t.id}`}
                  >
                    <QrCodeIcon className="h-3.5 w-3.5 mr-1" /> QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-w-0"
                    onClick={() => window.open(`/quick-order?property=${propertyIdNum}&table=${encodeURIComponent(t.name)}&step=2&mode=table`, "_blank")}
                    data-testid={`button-staff-order-${t.id}`}
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5 mr-1" /> Order
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => openEdit(t)}
                    data-testid={`button-edit-${t.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-destructive border-destructive/40"
                    onClick={() => setDeleteId(t.id)}
                    data-testid={`button-delete-${t.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-table-form">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Table" : "Add Table"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="t-name">Table name / number *</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. T1, A5, Patio-2"
                data-testid="input-table-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="t-cap">Seats</Label>
                <Input
                  id="t-cap"
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  data-testid="input-table-capacity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-loc">Location (optional)</Label>
                <Input
                  id="t-loc"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Patio, Indoor…"
                  data-testid="input-table-location"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="t-active" className="cursor-pointer">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive tables are hidden from guests</p>
              </div>
              <Switch
                id="t-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                data-testid="switch-table-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name.trim() || saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      <Dialog open={!!qrTable} onOpenChange={(o) => !o && setQrTable(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-qr">
          <DialogHeader>
            <DialogTitle data-testid="text-qr-title">{qrTable?.name} — QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR for ${qrTable?.name}`}
                className="border rounded w-[320px] h-[320px]"
                data-testid="img-qr"
              />
            ) : (
              <div className="w-[320px] h-[320px] flex items-center justify-center text-sm text-muted-foreground border rounded">
                Generating QR…
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center break-all" data-testid="text-qr-url">{qrUrl}</p>
            <div className="flex gap-2 w-full">
              <Button onClick={downloadQR} variant="outline" className="flex-1" data-testid="button-download-qr">
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
              <Button onClick={printQR} className="flex-1" data-testid="button-print-qr">
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this table?</AlertDialogTitle>
            <AlertDialogDescription>
              The QR sticker for this table will stop working. Existing orders are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
