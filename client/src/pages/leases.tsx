import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type PropertyLease, type Property } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, IndianRupee, Calendar, CreditCard, Edit, ChevronDown, History } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const leaseFormSchema = z.object({
  totalAmount: z.string().min(1, "Amount is required"),
  propertyId: z.number().min(1, "Property is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  landlordName: z.string().min(1, "Landlord name is required"),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // If endDate is provided, check that it's not more than 1 year from startDate
    if (data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const oneYearLater = new Date(startDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      return endDate <= oneYearLater;
    }
    return true;
  },
  {
    message: "Lease end date cannot be more than 1 year from the start date",
    path: ["endDate"],
  }
);

const paymentFormSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

const editAmountFormSchema = z.object({
  totalAmount: z.string().min(1, "Amount is required"),
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
  const [leaseToEdit, setLeaseToEdit] = useState<PropertyLease | null>(null);
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
      totalAmount: "",
      startDate: "",
      endDate: "",
      notes: "",
    },
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
        totalAmount: data.totalAmount,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
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

  const openEditAmountDialog = (lease: PropertyLease) => {
    setLeaseToEdit(lease);
    editAmountForm.reset({ totalAmount: lease.totalAmount });
    setIsEditAmountDialogOpen(true);
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
            <DialogContent className="max-w-2xl">
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

                  <FormField
                    control={leaseForm.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Lease Amount</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="1000000"
                            data-testid="input-total-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
            {leases.map((lease) => {
              const totalAmount = parseFloat(lease.totalAmount);
              
              return (
                <Card key={lease.id} className="hover-elevate" data-testid={`card-lease-${lease.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{getPropertyName(lease.propertyId)}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{lease.landlordName || "No landlord"}</p>
                      </div>
                      <Badge variant="outline" data-testid={`badge-lease-status-${lease.id}`}>
                        {lease.endDate && new Date(lease.endDate) < new Date() ? "Expired" : "Active"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="font-mono font-semibold" data-testid={`text-total-amount-${lease.id}`}>
                          ₹{totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Paid</span>
                        <span className="font-mono text-green-600 dark:text-green-400" data-testid={`text-total-paid-${lease.id}`}>
                          ₹{(lease.totalPaid || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">Remaining Balance</span>
                        <span className="font-mono text-orange-600 dark:text-orange-400" data-testid={`text-balance-${lease.id}`}>
                          ₹{calculateBalance(lease).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Period</span>
                        <span className="text-sm font-medium">
                          {format(new Date(lease.startDate), "MMM d, yyyy")} - {lease.endDate ? format(new Date(lease.endDate), "MMM d, yyyy") : "Ongoing"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedLease(lease.id);
                          setIsPaymentDialogOpen(true);
                        }}
                        data-testid={`button-record-payment-${lease.id}`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Record Payment
                      </Button>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => openEditAmountDialog(lease)}
                          data-testid={`button-edit-amount-${lease.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Amount
                        </Button>
                      )}
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
      </div>
    </div>
  );
}
