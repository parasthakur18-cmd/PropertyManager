import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type PropertyLease, type Property } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, IndianRupee, Calendar, CreditCard, Edit, ChevronDown, History, Download, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const leaseFormSchema = z.object({
  propertyId: z.number().min(1, "Property is required"),
  landlordName: z.string().min(1, "Landlord name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  leaseDurationYears: z.string().optional(),
  baseYearlyAmount: z.string().min(1, "Base yearly amount is required"),
  yearlyIncrementType: z.string().optional(),
  yearlyIncrementValue: z.string().optional(),
  notes: z.string().optional(),
});

const paymentFormSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

const editAmountFormSchema = z.object({
  totalAmount: z.string().min(1, "Amount is required"),
});

const overrideFormSchema = z.object({
  currentYearAmount: z.string().min(1, "Amount is required"),
  reason: z.string().min(1, "Reason is required"),
});

function LeasePaymentHistory({ leaseId, isExpanded, onToggle }: { leaseId: number; isExpanded: boolean; onToggle: () => void }) {
  const { data: payments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/leases", leaseId, "payments"],
    enabled: isExpanded,
  });

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between"
          data-testid={`button-toggle-history-${leaseId}`}
        >
          <span className="flex items-center">
            <History className="h-4 w-4 mr-2" />
            Payment History
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-2">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-2">No payments recorded</div>
        ) : (
          <div className="space-y-2">
            {payments.map((payment: any) => (
              <div key={payment.id} className="text-sm border rounded-md p-2 bg-muted/50" data-testid={`payment-item-${payment.id}`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    ₹{parseFloat(payment.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(payment.paymentDate), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {payment.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 
                     payment.paymentMethod === 'check' ? 'Check' : 
                     payment.paymentMethod === 'online' ? 'Online' : 'Cash'}
                  </Badge>
                  {payment.notes && (
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {payment.notes}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Leases() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLeaseDialogOpen, setIsLeaseDialogOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<number | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditAmountDialogOpen, setIsEditAmountDialogOpen] = useState(false);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [leaseToEdit, setLeaseToEdit] = useState<PropertyLease | null>(null);
  const [leaseForSummary, setLeaseForSummary] = useState<number | null>(null);
  const [expandedLeases, setExpandedLeases] = useState<Set<number>>(new Set());

  // Toggle expanded state for payment history
  const toggleLeaseExpanded = (leaseId: number) => {
    setExpandedLeases(prev => {
      const next = new Set(prev);
      if (next.has(leaseId)) {
        next.delete(leaseId);
      } else {
        next.add(leaseId);
      }
      return next;
    });
  };

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: leases = [], isLoading } = useQuery<PropertyLease[]>({
    queryKey: ["/api/leases"],
  });

  const { data: leaseWithPayments } = useQuery<any>({
    queryKey: ["/api/leases", selectedLease],
    enabled: !!selectedLease,
  });

  const leaseForm = useForm({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      propertyId: 0,
      landlordName: "",
      startDate: "",
      endDate: "",
      leaseDurationYears: "",
      baseYearlyAmount: "",
      yearlyIncrementType: "percentage",
      yearlyIncrementValue: "",
      notes: "",
    },
  });

  const overrideForm = useForm({
    resolver: zodResolver(overrideFormSchema),
    defaultValues: {
      currentYearAmount: "",
      reason: "",
    },
  });

  // Query for lease summary when viewing details
  const { data: leaseSummary, isLoading: isSummaryLoading } = useQuery<any>({
    queryKey: ["/api/leases", leaseForSummary, "summary"],
    enabled: !!leaseForSummary,
  });

  const paymentForm = useForm({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "bank_transfer",
      notes: "",
    },
  });

  const editAmountForm = useForm({
    resolver: zodResolver(editAmountFormSchema),
    defaultValues: {
      totalAmount: "",
    },
  });

  const createLeaseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof leaseFormSchema>) => {
      const response = await apiRequest("/api/leases", "POST", {
        propertyId: data.propertyId,
        totalAmount: data.baseYearlyAmount,
        baseYearlyAmount: data.baseYearlyAmount,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        leaseDurationYears: data.leaseDurationYears ? parseInt(data.leaseDurationYears) : null,
        yearlyIncrementType: data.yearlyIncrementType || null,
        yearlyIncrementValue: data.yearlyIncrementValue || null,
        landlordName: data.landlordName,
        notes: data.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      setIsLeaseDialogOpen(false);
      leaseForm.reset();
      toast({
        title: "Lease created",
        description: "Property lease has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lease",
        variant: "destructive",
      });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async (data: z.infer<typeof overrideFormSchema>) => {
      if (!leaseToEdit) throw new Error("No lease selected");
      const response = await apiRequest(`/api/leases/${leaseToEdit.id}/override`, "POST", {
        currentYearAmount: parseFloat(data.currentYearAmount),
        reason: data.reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leases", leaseToEdit?.id, "summary"] });
      setIsOverrideDialogOpen(false);
      setLeaseToEdit(null);
      overrideForm.reset();
      toast({
        title: "Override applied",
        description: "Lease amount has been overridden successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to override lease amount",
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof paymentFormSchema>) => {
      const response = await apiRequest(`/api/leases/${selectedLease}/payments`, "POST", {
        ...data,
        amount: data.amount,
        paymentDate: data.paymentDate,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leases", selectedLease] });
      setIsPaymentDialogOpen(false);
      paymentForm.reset({
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "bank_transfer",
        notes: "",
      });
      toast({
        title: "Payment recorded",
        description: "Lease payment has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const editAmountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editAmountFormSchema>) => {
      if (!leaseToEdit) throw new Error("No lease selected");
      const response = await apiRequest(`/api/leases/${leaseToEdit.id}/amount`, "PATCH", {
        totalAmount: data.totalAmount,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      setIsEditAmountDialogOpen(false);
      setLeaseToEdit(null);
      editAmountForm.reset();
      toast({
        title: "Amount updated",
        description: "Lease amount has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lease amount",
        variant: "destructive",
      });
    },
  });

  const handleCreateLease = (data: z.infer<typeof leaseFormSchema>) => {
    createLeaseMutation.mutate(data);
  };

  const handleCreatePayment = (data: z.infer<typeof paymentFormSchema>) => {
    createPaymentMutation.mutate(data);
  };

  const handleEditAmount = (data: z.infer<typeof editAmountFormSchema>) => {
    editAmountMutation.mutate(data);
  };

  const handleOverride = (data: z.infer<typeof overrideFormSchema>) => {
    overrideMutation.mutate(data);
  };

  const openEditAmountDialog = (lease: PropertyLease) => {
    setLeaseToEdit(lease);
    editAmountForm.reset({ totalAmount: lease.totalAmount || "" });
    setIsEditAmountDialogOpen(true);
  };

  const openOverrideDialog = (lease: PropertyLease) => {
    setLeaseToEdit(lease);
    overrideForm.reset({ 
      currentYearAmount: lease.currentYearAmount || lease.baseYearlyAmount || lease.totalAmount || "", 
      reason: "" 
    });
    setIsOverrideDialogOpen(true);
  };

  const openSummaryDialog = (leaseId: number) => {
    setLeaseForSummary(leaseId);
    setIsSummaryDialogOpen(true);
  };

  const downloadLedger = async (leaseId: number) => {
    try {
      const response = await fetch(`/api/leases/${leaseId}/export`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to download');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lease_ledger_${leaseId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Downloaded",
        description: "Lease ledger has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download ledger",
        variant: "destructive",
      });
    }
  };

  const getPropertyName = (propertyId: number) => {
    return properties.find(p => p.id === propertyId)?.name || "Unknown";
  };

  const calculateBalance = (lease: any) => {
    return lease.pendingBalance || 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading leases...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Property Leases</h1>
            <p className="text-muted-foreground mt-1">Manage property lease agreements and payments</p>
          </div>
          <Dialog open={isLeaseDialogOpen} onOpenChange={setIsLeaseDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lease">
                <Plus className="h-4 w-4 mr-2" />
                Add Lease
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Lease</DialogTitle>
              </DialogHeader>
              <Form {...leaseForm}>
                <form onSubmit={leaseForm.handleSubmit(handleCreateLease)} className="space-y-4">
                  <FormField
                    control={leaseForm.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-property">
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {properties.map((property) => (
                              <SelectItem key={property.id} value={property.id.toString()}>
                                {property.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={leaseForm.control}
                    name="landlordName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Landlord Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Property landlord name" data-testid="input-landlord-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={leaseForm.control}
                      name="baseYearlyAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Yearly Amount</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="1200000"
                              data-testid="input-base-yearly-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={leaseForm.control}
                      name="leaseDurationYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Years)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="5"
                              data-testid="input-lease-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={leaseForm.control}
                      name="yearlyIncrementType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yearly Increment Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-increment-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={leaseForm.control}
                      name="yearlyIncrementValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Increment Value</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder={leaseForm.watch("yearlyIncrementType") === "percentage" ? "10" : "50000"}
                              data-testid="input-increment-value"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={leaseForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={leaseForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={leaseForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Optional lease notes" data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsLeaseDialogOpen(false)}
                      data-testid="button-cancel-lease"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLeaseMutation.isPending} data-testid="button-submit-lease">
                      {createLeaseMutation.isPending ? "Creating..." : "Create Lease"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {leases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IndianRupee className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leases yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start by adding a property lease agreement
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leases.map((lease: any) => {
              const baseAmount = parseFloat(lease.baseYearlyAmount || lease.totalAmount || "0");
              const carryForward = parseFloat(lease.carryForwardAmount || "0");
              
              return (
                <Card key={lease.id} className="hover-elevate" data-testid={`card-lease-${lease.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{getPropertyName(lease.propertyId)}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{lease.landlordName || "No landlord"}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" data-testid={`badge-lease-status-${lease.id}`}>
                          {lease.endDate && new Date(lease.endDate) < new Date() ? "Expired" : "Active"}
                        </Badge>
                        {lease.isOverridden && (
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-overridden-${lease.id}`}>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overridden
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Base Yearly Amount</span>
                        <span className="font-mono font-semibold" data-testid={`text-base-amount-${lease.id}`}>
                          ₹{baseAmount.toLocaleString()}
                        </span>
                      </div>
                      {lease.yearlyIncrementValue && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Yearly Increment
                          </span>
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            {lease.yearlyIncrementType === 'percentage' 
                              ? `${lease.yearlyIncrementValue}%` 
                              : `₹${parseFloat(lease.yearlyIncrementValue).toLocaleString()}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Paid</span>
                        <span className="font-mono text-green-600 dark:text-green-400" data-testid={`text-total-paid-${lease.id}`}>
                          ₹{(lease.totalPaid || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">Pending Balance</span>
                        <span className="font-mono text-orange-600 dark:text-orange-400" data-testid={`text-balance-${lease.id}`}>
                          ₹{calculateBalance(lease).toLocaleString()}
                        </span>
                      </div>
                      {carryForward > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Carry Forward</span>
                          <span className="font-mono text-red-600 dark:text-red-400" data-testid={`text-carry-forward-${lease.id}`}>
                            ₹{carryForward.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Period</span>
                        <span className="text-sm font-medium">
                          {lease.startDate ? format(new Date(lease.startDate), "MMM d, yyyy") : "N/A"} - {lease.endDate ? format(new Date(lease.endDate), "MMM d, yyyy") : "Ongoing"}
                        </span>
                      </div>
                      {lease.leaseDurationYears && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">{lease.leaseDurationYears} years</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLease(lease.id);
                            setIsPaymentDialogOpen(true);
                          }}
                          data-testid={`button-record-payment-${lease.id}`}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Payment
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSummaryDialog(lease.id)}
                          data-testid={`button-view-summary-${lease.id}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Summary
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadLedger(lease.id)}
                          data-testid={`button-download-ledger-${lease.id}`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Ledger
                        </Button>
                        {(user?.role === 'admin' || user?.role === 'manager') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openOverrideDialog(lease)}
                            data-testid={`button-override-${lease.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Override
                          </Button>
                        )}
                      </div>
                    </div>

                    <LeasePaymentHistory leaseId={lease.id} isExpanded={expandedLeases.has(lease.id)} onToggle={() => toggleLeaseExpanded(lease.id)} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Lease Payment</DialogTitle>
            </DialogHeader>
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(handleCreatePayment)} className="space-y-4">
                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="100000"
                          data-testid="input-payment-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-payment-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="online">Online Payment</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Optional payment notes" data-testid="input-payment-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPaymentDialogOpen(false)}
                    data-testid="button-cancel-payment"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPaymentMutation.isPending} data-testid="button-submit-payment">
                    {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditAmountDialogOpen} onOpenChange={setIsEditAmountDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Lease Amount</DialogTitle>
            </DialogHeader>
            <Form {...editAmountForm}>
              <form onSubmit={editAmountForm.handleSubmit(handleEditAmount)} className="space-y-4">
                <FormField
                  control={editAmountForm.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Lease Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="500000"
                          data-testid="input-edit-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditAmountDialogOpen(false);
                      setLeaseToEdit(null);
                    }}
                    data-testid="button-cancel-edit-amount"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editAmountMutation.isPending} data-testid="button-submit-edit-amount">
                    {editAmountMutation.isPending ? "Updating..." : "Update Amount"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override Current Year Amount</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Override the auto-calculated yearly lease amount. This will be logged in the lease history.
            </p>
            <Form {...overrideForm}>
              <form onSubmit={overrideForm.handleSubmit(handleOverride)} className="space-y-4">
                <FormField
                  control={overrideForm.control}
                  name="currentYearAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Current Year Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="1500000"
                          data-testid="input-override-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={overrideForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Override</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g., Negotiated new terms with landlord"
                          data-testid="input-override-reason"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsOverrideDialogOpen(false);
                      setLeaseToEdit(null);
                    }}
                    data-testid="button-cancel-override"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={overrideMutation.isPending} data-testid="button-submit-override">
                    {overrideMutation.isPending ? "Applying..." : "Apply Override"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isSummaryDialogOpen} onOpenChange={(open) => {
          setIsSummaryDialogOpen(open);
          if (!open) setLeaseForSummary(null);
        }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Lease Payment Summary</DialogTitle>
            </DialogHeader>
            {isSummaryLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading summary...</div>
            ) : leaseSummary ? (
              <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Lease Value</p>
                    <p className="text-xl font-semibold font-mono">₹{parseFloat(leaseSummary.summary.totalLeaseValue).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Current Year Amount</p>
                    <p className="text-xl font-semibold font-mono">₹{parseFloat(leaseSummary.summary.currentYearAmount).toLocaleString()}</p>
                    {leaseSummary.summary.isOverridden && (
                      <Badge variant="secondary" className="mt-1 text-xs">Overridden</Badge>
                    )}
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Monthly Amount</p>
                    <p className="text-xl font-semibold font-mono">₹{parseFloat(leaseSummary.summary.monthlyAmount).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-xl font-semibold font-mono text-green-600 dark:text-green-400">₹{parseFloat(leaseSummary.summary.totalPaid).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{leaseSummary.summary.paymentsCount} payments</p>
                  </div>
                  <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                    <p className="text-sm text-muted-foreground">Current Pending</p>
                    <p className="text-xl font-semibold font-mono text-orange-600 dark:text-orange-400">₹{parseFloat(leaseSummary.summary.currentPending).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <p className="text-sm text-muted-foreground">Carry Forward</p>
                    <p className="text-xl font-semibold font-mono text-red-600 dark:text-red-400">₹{parseFloat(leaseSummary.summary.carryForward).toLocaleString()}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Lease Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{leaseSummary.summary.leaseDurationYears} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Elapsed:</span>
                      <span>{leaseSummary.summary.elapsedYears} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Till Date:</span>
                      <span className="font-mono">₹{parseFloat(leaseSummary.summary.expectedTillDate).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {leaseSummary.history && leaseSummary.history.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Change History</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {leaseSummary.history.map((h: any) => (
                        <div key={h.id} className="text-sm p-2 bg-muted/50 rounded">
                          <div className="flex justify-between">
                            <Badge variant="outline">{h.changeType}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(h.createdAt), "MMM d, yyyy HH:mm")}
                            </span>
                          </div>
                          {h.fieldChanged && (
                            <p className="text-xs mt-1">
                              <span className="text-muted-foreground">{h.fieldChanged}:</span> {h.oldValue} → {h.newValue}
                            </p>
                          )}
                          {h.changeReason && (
                            <p className="text-xs text-muted-foreground mt-1">Reason: {h.changeReason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => leaseForSummary && downloadLedger(leaseForSummary)}
                    data-testid="button-download-from-summary"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Ledger
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsSummaryDialogOpen(false)}
                    data-testid="button-close-summary"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No summary available</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
