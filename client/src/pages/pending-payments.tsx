import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, isAfter, parseISO, isBefore } from "date-fns";
import { Clock, AlertTriangle, CheckCircle, User, Download, Building2 } from "lucide-react";
import { PropertyScopePicker } from "@/components/property-scope-picker";
import { useAuth } from "@/hooks/useAuth";
import type { Property } from "@shared/schema";

interface PendingBill {
  id: number;
  bookingId: number;
  guestId: number;
  guestName: string;
  guestPhone: string | null;
  agentName: string | null;
  travelAgentId: number | null;
  totalAmount: string;
  balanceAmount: string;
  dueDate: string | null;
  pendingReason: string | null;
  createdAt: string;
  propertyId?: number;
}

export default function PendingPayments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedBill, setSelectedBill] = useState<PendingBill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: pendingBills = [], isLoading } = useQuery<PendingBill[]>({
    queryKey: ["/api/bills/pending", selectedPropertyId],
    queryFn: async () => {
      const url = selectedPropertyId 
        ? `/api/bills/pending?propertyId=${selectedPropertyId}`
        : "/api/bills/pending";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch pending bills");
      return response.json();
    },
  });

  // Filter properties based on user's assigned properties
  const availableProperties = useMemo(() => {
    return properties?.filter(p => {
      if (user?.role === 'super_admin') return true;
      return user?.assignedPropertyIds?.includes(String(p.id));
    }) || [];
  }, [properties, user]);

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ billId, paymentMethod }: { billId: number; paymentMethod: string }) => {
      return await apiRequest(`/api/bills/${billId}/mark-paid`, "POST", { paymentMethod });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      toast({
        title: "Payment Recorded",
        description: "Bill has been marked as paid successfully.",
      });
      setSelectedBill(null);
      setPaymentMethod("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to mark bill as paid",
      });
    },
  });

  const handleMarkAsPaid = () => {
    if (!selectedBill || !paymentMethod) return;
    markAsPaidMutation.mutate({ billId: selectedBill.id, paymentMethod });
  };

  // Calculate summary statistics
  const totalOutstanding = pendingBills.reduce(
    (sum, bill) => sum + parseFloat(bill.balanceAmount),
    0
  );

  const overdueCount = pendingBills.filter((bill) => {
    if (!bill.dueDate) return false;
    return isBefore(parseISO(bill.dueDate), new Date());
  }).length;

  // Group by travel agent
  const agentGroups = pendingBills.reduce((groups, bill) => {
    const agentKey = bill.agentName || "Direct/Walk-in";
    if (!groups[agentKey]) {
      groups[agentKey] = {
        bills: [],
        total: 0,
      };
    }
    groups[agentKey].bills.push(bill);
    groups[agentKey].total += parseFloat(bill.balanceAmount);
    return groups;
  }, {} as Record<string, { bills: PendingBill[]; total: number }>);

  // Get unique agent names for filter
  const agentNames = ["all", ...Object.keys(agentGroups).sort()];

  // Filter bills by selected agent
  const filteredBills =
    filterAgent === "all"
      ? pendingBills
      : pendingBills.filter((bill) => (bill.agentName || "Direct/Walk-in") === filterAgent);

  // Check if bill is overdue
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isBefore(parseISO(dueDate), new Date());
  };

  // Export pending payments as CSV
  const handleExportCSV = () => {
    const headers = ["Guest Name", "Phone", "Travel Agent", "Total Amount", "Balance Due", "Due Date", "Status"];
    const rows = filteredBills.map(bill => [
      bill.guestName,
      bill.guestPhone || "N/A",
      bill.agentName || "Direct/Walk-in",
      `₹${bill.totalAmount}`,
      `₹${bill.balanceAmount}`,
      bill.dueDate ? format(parseISO(bill.dueDate), "yyyy-MM-dd") : "N/A",
      isOverdue(bill.dueDate) ? "Overdue" : "Pending"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendor-pending-payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Vendor pending payment ledger downloaded successfully.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading pending payments...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold" data-testid="text-page-title">Pending Payments</h1>
          <p className="text-xs md:text-sm text-muted-foreground" data-testid="text-page-description">
            Track and manage outstanding payments from guests and travel agents
          </p>
        </div>
        <Button 
          onClick={handleExportCSV} 
          variant="outline" 
          className="gap-2"
          data-testid="button-export-ledger"
        >
          <Download className="h-4 w-4" />
          Export Ledger
        </Button>
      </div>

      {/* Property Filter */}
      {availableProperties.length > 1 && (
        <div className="mb-4">
          <PropertyScopePicker
            availableProperties={availableProperties}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <span className="text-muted-foreground">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-outstanding">
              ₹{totalOutstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingBills.length} pending {pendingBills.length === 1 ? "bill" : "bills"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-overdue-count">
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-agent-count">
              {Object.keys(agentGroups).length}
            </div>
            <p className="text-xs text-muted-foreground">
              With pending payments
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Pending Bills</CardTitle>
              <CardDescription>Outstanding payments awaiting collection</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="agent-filter">Filter by Agent:</Label>
              <Select value={filterAgent} onValueChange={setFilterAgent}>
                <SelectTrigger className="w-[200px]" id="agent-filter" data-testid="select-filter-agent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agentNames.map((agent) => (
                    <SelectItem key={agent} value={agent}>
                      {agent === "all" ? "All Agents" : agent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-pending-bills">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="text-lg font-medium">No pending payments</p>
              <p className="text-sm">All bills have been paid!</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Travel Agent</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => (
                    <TableRow key={bill.id} data-testid={`row-pending-bill-${bill.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium" data-testid={`text-guest-name-${bill.id}`}>
                              {bill.guestName}
                            </div>
                            {bill.guestPhone && (
                              <div className="text-xs text-muted-foreground">
                                {bill.guestPhone}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-agent-${bill.id}`}>
                        {bill.agentName ? (
                          <Badge variant="outline">{bill.agentName}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Direct/Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-amount-${bill.id}`}>
                          ₹{parseFloat(bill.balanceAmount).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-due-date-${bill.id}`}>
                        {bill.dueDate ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(bill.dueDate), "dd MMM yyyy")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-reason-${bill.id}`}>
                        {bill.pendingReason ? (
                          <span className="text-sm">{bill.pendingReason}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isOverdue(bill.dueDate) ? (
                          <Badge variant="destructive" data-testid={`badge-status-${bill.id}`}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-status-${bill.id}`}>
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => setSelectedBill(bill)}
                          data-testid={`button-mark-paid-${bill.id}`}
                        >
                          Mark as Paid
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent-wise Summary */}
      {Object.keys(agentGroups).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Agent-wise Summary</CardTitle>
            <CardDescription>Pending payments grouped by travel agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(agentGroups)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([agentName, data]) => (
                  <div
                    key={agentName}
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`card-agent-summary-${agentName.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{agentName}</div>
                        <div className="text-sm text-muted-foreground">
                          {data.bills.length} pending {data.bills.length === 1 ? "bill" : "bills"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        ₹{data.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark as Paid Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={(open) => !open && setSelectedBill(null)}>
        <DialogContent data-testid="dialog-mark-paid">
          <DialogHeader>
            <DialogTitle>Mark Payment as Received</DialogTitle>
            <DialogDescription>
              Record payment received from {selectedBill?.guestName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Guest</div>
                <div className="font-medium">{selectedBill?.guestName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Amount Due</div>
                <div className="font-medium">
                  ₹{parseFloat(selectedBill?.balanceAmount || "0").toFixed(2)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method" data-testid="select-payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedBill(null);
                setPaymentMethod("");
              }}
              data-testid="button-cancel-mark-paid"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              disabled={!paymentMethod || markAsPaidMutation.isPending}
              data-testid="button-confirm-mark-paid"
            >
              {markAsPaidMutation.isPending ? "Recording..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
