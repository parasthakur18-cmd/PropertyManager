import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVendorSchema, insertVendorTransactionSchema, type Vendor, type VendorTransaction, type Property, type ExpenseCategory } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Store, IndianRupee, CreditCard, Wallet, Phone, Mail, MapPin, Trash2, Pencil, Building2, ArrowUpCircle, ArrowDownCircle, History, Eye, Banknote, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

const vendorFormSchema = insertVendorSchema.extend({
  propertyId: z.number().min(1, "Property is required"),
  name: z.string().min(1, "Vendor name is required"),
});

const transactionFormSchema = z.object({
  transactionType: z.enum(["credit", "payment"]),
  amount: z.string().min(1, "Amount is required"),
  transactionDate: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  invoiceNumber: z.string().optional(),
  paymentMethod: z.string().optional(),
  referenceNumber: z.string().optional(),
  expenseCategoryId: z.number().optional(),
  propertyId: z.number(),
});

type VendorWithBalance = Vendor & {
  totalCredit: number;
  totalPayment: number;
  outstandingBalance: number;
  transactionCount: number;
};

export default function Vendors() {
  const { toast } = useToast();
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorWithBalance | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [transactionType, setTransactionType] = useState<"credit" | "payment">("credit");

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expense-categories"],
  });

  const { data: vendors = [], isLoading } = useQuery<VendorWithBalance[]>({
    queryKey: ["/api/vendors", selectedProperty],
    queryFn: async () => {
      if (!selectedProperty) return [];
      const response = await fetch(`/api/vendors?propertyId=${selectedProperty}`);
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    },
    enabled: !!selectedProperty,
  });

  const { data: vendorTransactions = [], isLoading: transactionsLoading } = useQuery<VendorTransaction[]>({
    queryKey: ["/api/vendors", selectedVendor?.id, "transactions"],
    queryFn: async () => {
      if (!selectedVendor) return [];
      const response = await fetch(`/api/vendors/${selectedVendor.id}/transactions`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!selectedVendor,
  });

  // Fetch wallets to show available balances
  const { data: wallets = [] } = useQuery<Array<{id: number; name: string; type: string; currentBalance: string}>>({
    queryKey: ["/api/wallets", selectedProperty],
    queryFn: async () => {
      if (!selectedProperty) return [];
      const response = await fetch(`/api/wallets?propertyId=${selectedProperty}`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedProperty,
  });

  // Helper to get wallet balance by payment method type
  const getWalletBalance = (method: string): number => {
    const lowerMethod = (method || '').toLowerCase();
    let walletType = 'cash';
    if (lowerMethod.includes('bank') || lowerMethod.includes('cheque') || lowerMethod.includes('transfer')) walletType = 'bank';
    else if (lowerMethod.includes('upi')) walletType = 'upi';
    const wallet = wallets.find(w => w.type === walletType);
    return wallet ? parseFloat(wallet.currentBalance || '0') : 0;
  };

  const vendorForm = useForm({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      propertyId: selectedProperty || 0,
      name: "",
      phone: "",
      email: "",
      address: "",
      category: "",
      gstNumber: "",
      bankDetails: "",
      notes: "",
    },
  });

  const transactionForm = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transactionType: "credit" as const,
      amount: "",
      transactionDate: new Date().toISOString().split("T")[0],
      description: "",
      invoiceNumber: "",
      paymentMethod: "",
      referenceNumber: "",
      expenseCategoryId: undefined,
      propertyId: selectedProperty || 0,
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof vendorFormSchema>) => {
      const response = await apiRequest("/api/vendors", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsVendorDialogOpen(false);
      vendorForm.reset();
      toast({
        title: "Vendor added",
        description: "Vendor has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add vendor",
        variant: "destructive",
      });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Vendor> }) => {
      const response = await apiRequest(`/api/vendors/${id}`, "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsVendorDialogOpen(false);
      setEditingVendor(null);
      vendorForm.reset();
      toast({
        title: "Vendor updated",
        description: "Vendor has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vendor",
        variant: "destructive",
      });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/vendors/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Vendor deleted",
        description: "Vendor has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendor",
        variant: "destructive",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transactionFormSchema>) => {
      if (!selectedVendor) throw new Error("No vendor selected");
      const response = await apiRequest(`/api/vendors/${selectedVendor.id}/transactions`, "POST", {
        ...data,
        amount: data.amount,
        transactionDate: new Date(data.transactionDate).toISOString(),
        propertyId: selectedProperty,
        vendorName: selectedVendor.name,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", selectedVendor?.id, "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/summary"] });
      setIsTransactionDialogOpen(false);
      transactionForm.reset({
        transactionType: "credit",
        amount: "",
        transactionDate: new Date().toISOString().split("T")[0],
        description: "",
        invoiceNumber: "",
        paymentMethod: "",
        referenceNumber: "",
        propertyId: selectedProperty || 0,
      });
      toast({
        title: transactionType === "credit" ? "Credit recorded" : "Payment recorded",
        description: transactionType === "payment" 
          ? "Payment has been recorded and wallet updated." 
          : "Transaction has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record transaction",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/vendor-transactions/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", selectedVendor?.id, "transactions"] });
      toast({
        title: "Transaction deleted",
        description: "Transaction has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    vendorForm.reset({
      propertyId: vendor.propertyId,
      name: vendor.name,
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      category: vendor.category || "",
      gstNumber: vendor.gstNumber || "",
      bankDetails: vendor.bankDetails || "",
      notes: vendor.notes || "",
    });
    setIsVendorDialogOpen(true);
  };

  const handleAddTransaction = (vendor: VendorWithBalance, type: "credit" | "payment") => {
    setSelectedVendor(vendor);
    setTransactionType(type);
    transactionForm.reset({
      transactionType: type,
      amount: "",
      transactionDate: new Date().toISOString().split("T")[0],
      description: "",
      invoiceNumber: "",
      paymentMethod: type === "payment" ? "" : undefined,
      referenceNumber: "",
      propertyId: selectedProperty || 0,
    });
    setIsTransactionDialogOpen(true);
  };

  const handleViewDetails = (vendor: VendorWithBalance) => {
    setSelectedVendor(vendor);
    setIsDetailDialogOpen(true);
  };

  const totalOutstanding = vendors.reduce((sum, v) => sum + v.outstandingBalance, 0);
  const totalCredit = vendors.reduce((sum, v) => sum + v.totalCredit, 0);
  const totalPayments = vendors.reduce((sum, v) => sum + v.totalPayment, 0);

  const vendorCategories = ["Grocery", "Supplies", "Maintenance", "Laundry", "Kitchen", "Beverages", "Other"];
  const paymentMethods = ["Cash", "Bank Transfer", "UPI", "Cheque", "Other"];

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Store className="h-6 w-6" />
            Vendor Management
          </h1>
          <p className="text-muted-foreground">Track vendor credits, payments, and outstanding amounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedProperty?.toString() || ""}
            onValueChange={(value) => setSelectedProperty(parseInt(value))}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-property">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              if (!selectedProperty) {
                toast({
                  title: "Select a property",
                  description: "Please select a property first to add a vendor.",
                  variant: "destructive",
                });
                return;
              }
              setEditingVendor(null);
              vendorForm.reset({
                propertyId: selectedProperty || 0,
                name: "",
                phone: "",
                email: "",
                address: "",
                category: "",
                gstNumber: "",
                bankDetails: "",
                notes: "",
              });
              setIsVendorDialogOpen(true);
            }}
            data-testid="button-add-vendor"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </div>

      {!selectedProperty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Property</h3>
            <p className="text-muted-foreground">Choose a property to view and manage vendors</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                <IndianRupee className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-total-outstanding">
                  {totalOutstanding.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
                <p className="text-xs text-muted-foreground">Amount payable to vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
                <CreditCard className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600" data-testid="text-total-credit">
                  {totalCredit.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
                <p className="text-xs text-muted-foreground">Total purchases on credit</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <Wallet className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-total-paid">
                  {totalPayments.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
                <p className="text-xs text-muted-foreground">Total payments made</p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Vendors Yet</h3>
                <p className="text-muted-foreground mb-4">Add your first vendor to start tracking credit purchases</p>
                <Button onClick={() => setIsVendorDialogOpen(true)} data-testid="button-add-first-vendor">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((vendor) => (
                <Card key={vendor.id} className="hover-elevate" data-testid={`card-vendor-${vendor.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate" data-testid={`text-vendor-name-${vendor.id}`}>
                          {vendor.name}
                        </CardTitle>
                        {vendor.category && (
                          <Badge variant="secondary" className="mt-1" data-testid={`badge-vendor-category-${vendor.id}`}>
                            {vendor.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewDetails(vendor)}
                          data-testid={`button-view-vendor-${vendor.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditVendor(vendor)}
                          data-testid={`button-edit-vendor-${vendor.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteVendorMutation.mutate(vendor.id)}
                          data-testid={`button-delete-vendor-${vendor.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {vendor.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Credit</span>
                        <span className="font-mono text-orange-600" data-testid={`text-vendor-credit-${vendor.id}`}>
                          {vendor.totalCredit.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Paid</span>
                        <span className="font-mono text-green-600" data-testid={`text-vendor-paid-${vendor.id}`}>
                          {vendor.totalPayment.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Outstanding</span>
                        <span 
                          className={`font-mono ${vendor.outstandingBalance > 0 ? 'text-destructive' : 'text-green-600'}`}
                          data-testid={`text-vendor-outstanding-${vendor.id}`}
                        >
                          {vendor.outstandingBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTransaction(vendor, "credit")}
                        data-testid={`button-add-credit-${vendor.id}`}
                      >
                        <ArrowUpCircle className="h-4 w-4 mr-1 text-orange-500" />
                        Credit
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTransaction(vendor, "payment")}
                        data-testid={`button-add-payment-${vendor.id}`}
                      >
                        <ArrowDownCircle className="h-4 w-4 mr-1 text-green-500" />
                        Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
            <DialogDescription>
              {editingVendor ? "Update vendor details" : "Add a new vendor to track credit purchases"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh] pr-4">
          <Form {...vendorForm}>
            <form
              onSubmit={vendorForm.handleSubmit((data) => {
                if (editingVendor) {
                  updateVendorMutation.mutate({ id: editingVendor.id, data });
                } else {
                  createVendorMutation.mutate(data);
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={vendorForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vendor name" {...field} data-testid="input-vendor-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={vendorForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} data-testid="input-vendor-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={vendorForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor-category">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendorCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={vendorForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} data-testid="input-vendor-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={vendorForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Vendor address" {...field} data-testid="input-vendor-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={vendorForm.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number</FormLabel>
                    <FormControl>
                      <Input placeholder="GST number (optional)" {...field} data-testid="input-vendor-gst" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={vendorForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes" {...field} data-testid="input-vendor-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
                data-testid="button-save-vendor"
              >
                {editingVendor ? "Update Vendor" : "Add Vendor"}
              </Button>
            </form>
          </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {transactionType === "credit" ? "Record Credit Purchase" : "Record Payment"}
            </DialogTitle>
            <DialogDescription>
              {transactionType === "credit" 
                ? `Add a credit purchase from ${selectedVendor?.name}`
                : `Record a payment to ${selectedVendor?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...transactionForm}>
            <form
              onSubmit={transactionForm.handleSubmit((data) => {
                createTransactionMutation.mutate({
                  ...data,
                  transactionType,
                });
              })}
              className="space-y-4"
            >
              <FormField
                control={transactionForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter amount"
                        {...field}
                        data-testid="input-transaction-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transactionForm.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-transaction-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {transactionType === "credit" && (
                <FormField
                  control={transactionForm.control}
                  name="expenseCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Category</FormLabel>
                      <Select
                        value={field.value?.toString() || ""}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={transactionForm.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{transactionType === "credit" ? "Invoice Number" : "Receipt Number"}</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} data-testid="input-invoice-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {transactionType === "payment" && (
                <FormField
                  control={transactionForm.control}
                  name="paymentMethod"
                  render={({ field }) => {
                    const paymentAmount = parseFloat(transactionForm.watch("amount") || "0");
                    const selectedBalance = getWalletBalance(field.value || "cash");
                    const isInsufficient = paymentAmount > selectedBalance && paymentAmount > 0;
                    
                    return (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">
                              <div className="flex items-center justify-between w-full gap-4">
                                <div className="flex items-center gap-2">
                                  <Banknote className="h-4 w-4" />
                                  <span>Cash</span>
                                </div>
                                <span className={`text-xs ${getWalletBalance('cash') < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  ₹{getWalletBalance('cash').toLocaleString('en-IN')}
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Bank Transfer">
                              <div className="flex items-center justify-between w-full gap-4">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  <span>Bank Transfer</span>
                                </div>
                                <span className={`text-xs ${getWalletBalance('bank') < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  ₹{getWalletBalance('bank').toLocaleString('en-IN')}
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="UPI">
                              <div className="flex items-center justify-between w-full gap-4">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  <span>UPI</span>
                                </div>
                                <span className={`text-xs ${getWalletBalance('upi') < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  ₹{getWalletBalance('upi').toLocaleString('en-IN')}
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Cheque">
                              <div className="flex items-center justify-between w-full gap-4">
                                <div className="flex items-center gap-2">
                                  <Wallet className="h-4 w-4" />
                                  <span>Cheque</span>
                                </div>
                                <span className={`text-xs ${getWalletBalance('cheque') < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  ₹{getWalletBalance('bank').toLocaleString('en-IN')}
                                </span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {isInsufficient && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-yellow-700 dark:text-yellow-400">
                                <p className="font-medium">Insufficient balance!</p>
                                <p>Available: ₹{selectedBalance.toLocaleString('en-IN')} | Paying: ₹{paymentAmount.toLocaleString('en-IN')}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

              <FormField
                control={transactionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add details about this transaction" {...field} data-testid="input-transaction-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createTransactionMutation.isPending}
                data-testid="button-save-transaction"
              >
                {transactionType === "credit" ? "Record Credit" : "Record Payment"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              {selectedVendor?.name}
            </DialogTitle>
            <DialogDescription>
              View vendor details and transaction history
            </DialogDescription>
          </DialogHeader>
          
          {selectedVendor && (
            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total Credit</div>
                    <div className="text-lg font-bold text-orange-600">
                      {selectedVendor.totalCredit.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total Paid</div>
                    <div className="text-lg font-bold text-green-600">
                      {selectedVendor.totalPayment.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </div>
                  </CardContent>
                </Card>
                <Card className="col-span-2">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Outstanding Balance</div>
                    <div className={`text-2xl font-bold ${selectedVendor.outstandingBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {selectedVendor.outstandingBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                {selectedVendor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedVendor.phone}</span>
                  </div>
                )}
                {selectedVendor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedVendor.email}</span>
                  </div>
                )}
                {selectedVendor.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedVendor.address}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Transaction History
                </h4>
                <ScrollArea className="h-[300px]">
                  {transactionsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : vendorTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendorTransactions.map((transaction) => (
                          <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                            <TableCell className="text-sm">
                              {format(new Date(transaction.transactionDate), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.transactionType === "credit" ? "destructive" : "default"}>
                                {transaction.transactionType === "credit" ? "Credit" : "Payment"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {transaction.description || transaction.invoiceNumber || "-"}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${
                              transaction.transactionType === "credit" ? "text-orange-600" : "text-green-600"
                            }`}>
                              {transaction.transactionType === "credit" ? "+" : "-"}
                              {parseFloat(transaction.amount.toString()).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                                data-testid={`button-delete-transaction-${transaction.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
