import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileBarChart, Printer, IndianRupee, Banknote, Smartphone, CreditCard, Utensils, ShoppingBag, BedDouble } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Property } from "@shared/schema";

interface ZReport {
  propertyId: number;
  date: string;
  totals: { paidOrders: number; allOrders: number; unpaidOrders: number; gross: number };
  byMode: Record<string, { count: number; gross: number }>;
  byPayment: Record<string, { count: number; gross: number }>;
  topItems: { name: string; qty: number; gross: number }[];
  firstOrder: string | null;
  lastOrder: string | null;
}

const MODE_META: Record<string, { label: string; icon: any; cls: string }> = {
  "dine-in": { label: "Dine-in", icon: Utensils, cls: "text-emerald-600" },
  takeaway: { label: "Takeaway", icon: ShoppingBag, cls: "text-orange-600" },
  room: { label: "Room Service", icon: BedDouble, cls: "text-sky-600" },
};

const PAY_META: Record<string, { label: string; icon: any }> = {
  cash: { label: "Cash", icon: Banknote },
  upi: { label: "UPI", icon: Smartphone },
  card: { label: "Card", icon: CreditCard },
  unspecified: { label: "Other", icon: IndianRupee },
};

function inr(n: number) {
  return `₹${n.toFixed(2)}`;
}

export default function ZReport() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const { data: properties } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const propertyIdNum = useMemo(() => {
    if (selectedPropertyId) return Number(selectedPropertyId);
    return properties?.[0]?.id ?? null;
  }, [selectedPropertyId, properties]);

  const { data, isLoading } = useQuery<ZReport>({
    queryKey: ["/api/reports/z-report", propertyIdNum, date],
    enabled: !!propertyIdNum && !!date,
    queryFn: async () => {
      const res = await fetch(`/api/reports/z-report?propertyId=${propertyIdNum}&date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load Z-report");
      return res.json();
    },
  });

  const propertyName = properties?.find((p) => p.id === propertyIdNum)?.name || "";

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" data-testid="text-zreport-title">
            <FileBarChart className="h-7 w-7 text-primary" /> Z-Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">End-of-shift summary for cash drawer reconciliation</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
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
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" data-testid="input-zreport-date" />
          <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center space-y-1">
        <h1 className="text-xl font-bold">{propertyName}</h1>
        <p className="text-sm">Z-Report — {format(new Date(date), "EEE, dd MMM yyyy")}</p>
        <p className="text-xs text-muted-foreground">Generated {format(new Date(), "dd MMM yyyy HH:mm")}</p>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          {/* Top summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Gross Revenue" value={inr(data.totals.gross)} accent />
            <Stat label="Paid Orders" value={String(data.totals.paidOrders)} />
            <Stat label="Unpaid / Open" value={String(data.totals.unpaidOrders)} muted />
            <Stat label="Total Orders" value={String(data.totals.allOrders)} muted />
          </div>

          <div className="text-xs text-muted-foreground">
            {data.firstOrder && data.lastOrder ? (
              <>First order at <strong>{format(new Date(data.firstOrder), "h:mm a")}</strong>, last at <strong>{format(new Date(data.lastOrder), "h:mm a")}</strong></>
            ) : (
              "No paid orders for this date."
            )}
          </div>

          {/* By mode + by payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Sales by Mode</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(data.byMode).length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  Object.entries(data.byMode).map(([mode, v]) => {
                    const meta = MODE_META[mode] || { label: mode, icon: Utensils, cls: "" };
                    const Icon = meta.icon;
                    return (
                      <div key={mode} className="flex items-center justify-between py-1.5 border-b last:border-0" data-testid={`row-mode-${mode}`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${meta.cls}`} />
                          <span className="font-medium">{meta.label}</span>
                          <Badge variant="outline" className="text-xs">{v.count}</Badge>
                        </div>
                        <span className="font-mono font-semibold">{inr(v.gross)}</span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Cash Drawer (by Payment Method)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(data.byPayment).length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  Object.entries(data.byPayment).map(([pm, v]) => {
                    const meta = PAY_META[pm] || { label: pm, icon: IndianRupee };
                    const Icon = meta.icon;
                    return (
                      <div key={pm} className="flex items-center justify-between py-1.5 border-b last:border-0" data-testid={`row-payment-${pm}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-medium">{meta.label}</span>
                          <Badge variant="outline" className="text-xs">{v.count}</Badge>
                        </div>
                        <span className="font-mono font-semibold">{inr(v.gross)}</span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top items */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Top Items</CardTitle></CardHeader>
            <CardContent>
              {data.topItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items sold.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Item</th>
                        <th className="py-2 pr-3 text-right">Qty</th>
                        <th className="py-2 pr-3 text-right">Gross</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topItems.map((it, i) => (
                        <tr key={it.name} className="border-b last:border-0" data-testid={`row-topitem-${i}`}>
                          <td className="py-1.5 pr-3 text-muted-foreground">{i + 1}</td>
                          <td className="py-1.5 pr-3 font-medium">{it.name}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{it.qty}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{inr(it.gross)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <Card className={accent ? "border-primary border-2" : ""}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${accent ? "text-primary" : muted ? "text-muted-foreground" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
