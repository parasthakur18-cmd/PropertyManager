import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Wallet, CreditCard, Building2, Banknote, ArrowUpRight, ArrowDownRight, Clock, Lock, RefreshCw, AlertTriangle, CheckCircle2, Download, Eye, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Property, Wallet as WalletType, WalletTransaction, DailyClosing } from "@shared/schema";

const walletFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["cash", "upi", "bank"]),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
  openingBalance: z.string().default("0"),
  description: z.string().optional(),
});

const transactionFormSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["credit", "debit"]),
  source: z.string().default("manual"),
  description: z.string().optional(),
  referenceNumber: z.string().optional(),
  transactionDate: z.string().default(new Date().toISOString().split("T")[0]),
});

export default function Wallets() {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "closings" | "reports">("overview");
  const [reportStartDate, setReportStartDate] = useState<string>(new Date(new Date().setDate(1)).toISOString().split("T")[0]);
  const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery<WalletType[]>({
    queryKey: ["/api/wallets", selectedProperty],
    queryFn: async () => {
      if (!selectedProperty) return [];
      const response = await fetch(`/api/wallets?propertyId=${selectedProperty}`);
      if (!response.ok) throw new Error("Failed to fetch wallets");
      return response.json();
    },
    enabled: !!selectedProperty,
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/wallet-transactions", selectedProperty],
    queryFn: async () => {
      if (!selectedProperty) return [];
      const response = await fetch(`/api/wallet-transactions?propertyId=${selectedProperty}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    enabled: !!selectedProperty,
  });

  const { data: closings = [] } = useQuery<DailyClosing[]>({
    queryKey: ["/api/daily-closings", selectedProperty],
    queryFn: async () => {
      if (!selectedProperty) return [];
      const response = await fetch(`/api/daily-closings?propertyId=${selectedProperty}`);
      if (!response.ok) throw new Error("Failed to fetch closings");
      return response.json();
    },
    enabled: !!selectedProperty,
  });

  const { data: dayStatus } = useQuery<{ isOpen: boolean; lastClosingDate: string | null }>({
    queryKey: ["/api/daily-closings/status", selectedProperty],
    queryFn: async () => {
      if (!selectedProperty) return { isOpen: true, lastClosingDate: null };
      const response = await fetch(`/api/daily-closings/status?propertyId=${selectedProperty}`);
      if (!response.ok) throw new Error("Failed to fetch day status");
      return response.json();
    },
    enabled: !!selectedProperty,
  });

  const walletForm = useForm({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      name: "",
      type: "bank" as const,
      accountNumber: "",
      ifscCode: "",
      upiId: "",
      openingBalance: "0",
      description: "",
    },
  });

  const transactionForm = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: "",
      type: "credit" as const,
      source: "manual",
      description: "",
      referenceNumber: "",
      transactionDate: new Date().toISOString().split("T")[0],
    },
  });

  const createWalletMutation = useMutation({
    mutationFn: async (data: z.infer<typeof walletFormSchema>) => {
      const response = await apiRequest("/api/wallets", "POST", {
        propertyId: selectedProperty,
        ...data,
        openingBalance: parseFloat(data.openingBalance || "0"),
        currentBalance: parseFloat(data.openingBalance || "0"),
        isActive: true,
        isDefault: false,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      setIsWalletDialogOpen(false);
      walletForm.reset();
      toast({
        title: "Wallet created",
        description: "New payment account has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create wallet",
        variant: "destructive",
      });
    },
  });

  const updateWalletMutation = useMutation({
    mutationFn: async (data: z.infer<typeof walletFormSchema>) => {
      if (!editingWallet) return;
      const response = await apiRequest(`/api/wallets/${editingWallet.id}`, "PATCH", {
        ...data,
        openingBalance: parseFloat(data.openingBalance || "0"),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      setIsWalletDialogOpen(false);
      setEditingWallet(null);
      walletForm.reset();
      toast({
        title: "Wallet updated",
        description: "Payment account has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update wallet",
        variant: "destructive",
      });
    },
  });

  const deleteWalletMutation = useMutation({
    mutationFn: async (walletId: number) => {
      await apiRequest(`/api/wallets/${walletId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      toast({
        title: "Wallet deleted",
        description: "Payment account has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete wallet",
        variant: "destructive",
      });
    },
  });

  const initializeWalletsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/wallets/initialize", "POST", {
        propertyId: selectedProperty,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      toast({
        title: "Wallets initialized",
        description: "Default payment accounts (Cash, UPI, Bank) have been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize wallets",
        variant: "destructive",
      });
    },
  });

  const recordTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof transactionFormSchema>) => {
      if (!selectedWallet) return;
      const endpoint = data.type === "credit" 
        ? `/api/wallets/${selectedWallet.id}/credit`
        : `/api/wallets/${selectedWallet.id}/debit`;
      
      const response = await apiRequest(endpoint, "POST", {
        propertyId: selectedProperty,
        amount: data.amount,
        source: data.source || "manual",
        description: data.description,
        referenceNumber: data.referenceNumber,
        transactionDate: data.transactionDate,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions", selectedProperty] });
      setIsTransactionDialogOpen(false);
      setSelectedWallet(null);
      transactionForm.reset();
      toast({
        title: "Transaction recorded",
        description: "Wallet balance has been updated.",
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

  const closeDayMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/daily-closings/close", "POST", {
        propertyId: selectedProperty,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-closings", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-closings/status", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      setIsCloseDialogOpen(false);
      toast({
        title: "Day closed",
        description: "Daily closing has been completed and balances carried forward.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close day",
        variant: "destructive",
      });
    },
  });

  const handleEditWallet = (wallet: WalletType) => {
    setEditingWallet(wallet);
    walletForm.reset({
      name: wallet.name,
      type: wallet.type as "cash" | "upi" | "bank",
      accountNumber: wallet.accountNumber || "",
      ifscCode: wallet.ifscCode || "",
      upiId: wallet.upiId || "",
      openingBalance: wallet.openingBalance?.toString() || "0",
      description: wallet.description || "",
    });
    setIsWalletDialogOpen(true);
  };

  const handleAddTransaction = (wallet: WalletType) => {
    setSelectedWallet(wallet);
    transactionForm.reset({
      amount: "",
      type: "credit",
      source: "manual",
      description: "",
      referenceNumber: "",
      transactionDate: new Date().toISOString().split("T")[0],
    });
    setIsTransactionDialogOpen(true);
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case "cash": return Banknote;
      case "upi": return CreditCard;
      case "bank": return Building2;
      default: return Wallet;
    }
  };

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case "cash": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "upi": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "bank": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || "0"), 0);
  const cashBalance = wallets.filter(w => w.type === "cash").reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || "0"), 0);
  const upiBalance = wallets.filter(w => w.type === "upi").reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || "0"), 0);
  const bankBalance = wallets.filter(w => w.type === "bank").reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || "0"), 0);

  const todayTransactions = transactions.filter(t => {
    const txDate = new Date(t.transactionDate);
    const today = new Date();
    return txDate.toDateString() === today.toDateString();
  });

  const todayCredits = todayTransactions.filter(t => t.transactionType === "credit").reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);
  const todayDebits = todayTransactions.filter(t => t.transactionType === "debit").reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Wallet Management</h1>
          <p className="text-muted-foreground">Manage payment accounts, track balances, and record transactions</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            value={selectedProperty?.toString() || ""}
            onValueChange={(v) => setSelectedProperty(parseInt(v))}
            data-testid="select-property"
          >
            <SelectTrigger className="w-[200px]" data-testid="select-property-trigger">
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
        </div>
      </div>

      {!selectedProperty ? (
        <Card className="p-8 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Select a Property</h3>
          <p className="text-muted-foreground">Choose a property to manage its payment accounts and wallets</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
                    <p className="text-2xl font-bold" data-testid="text-total-balance">₹{totalBalance.toLocaleString()}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cash</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-cash-balance">₹{cashBalance.toLocaleString()}</p>
                  </div>
                  <Banknote className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">UPI</p>
                    <p className="text-2xl font-bold text-purple-600" data-testid="text-upi-balance">₹{upiBalance.toLocaleString()}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bank</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-bank-balance">₹{bankBalance.toLocaleString()}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Credits</p>
                    <p className="text-xl font-bold text-green-600" data-testid="text-today-credits">₹{todayCredits.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Debits</p>
                    <p className="text-xl font-bold text-red-600" data-testid="text-today-debits">₹{todayDebits.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${dayStatus?.isOpen ? "bg-amber-100 dark:bg-amber-900" : "bg-green-100 dark:bg-green-900"}`}>
                    {dayStatus?.isOpen ? <Clock className="h-5 w-5 text-amber-600" /> : <Lock className="h-5 w-5 text-green-600" />}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Day Status</p>
                    <p className="text-xl font-bold" data-testid="text-day-status">
                      {dayStatus?.isOpen ? "Open" : "Closed"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mismatch Alerts Section */}
          {(() => {
            const alerts: { type: 'warning' | 'error'; message: string }[] = [];
            
            // Check for negative balances
            wallets.forEach(w => {
              const balance = parseFloat(w.currentBalance?.toString() || '0');
              if (balance < 0) {
                alerts.push({ type: 'error', message: `${w.name} has negative balance: ₹${balance.toLocaleString()}` });
              }
            });
            
            // Check if day is not closed (after business hours)
            const currentHour = new Date().getHours();
            if (dayStatus?.isOpen && currentHour >= 22) {
              alerts.push({ type: 'warning', message: 'Day is still open. Consider closing for accurate records.' });
            }
            
            // Check for yesterday's day not closed
            if (dayStatus?.lastClosingDate) {
              const lastClosing = new Date(dayStatus.lastClosingDate);
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              yesterday.setHours(0, 0, 0, 0);
              lastClosing.setHours(0, 0, 0, 0);
              
              if (lastClosing < yesterday) {
                alerts.push({ type: 'warning', message: 'Previous days have not been closed. Please close days in sequence.' });
              }
            }
            
            if (alerts.length === 0) return null;
            
            return (
              <div className="space-y-2" data-testid="wallet-alerts">
                {alerts.map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      alert.type === 'error' 
                        ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' 
                        : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    }`}
                    data-testid={`alert-${alert.type}-${idx}`}
                  >
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${
                      alert.type === 'error' ? 'text-red-600' : 'text-amber-600'
                    }`} />
                    <span className={`text-sm ${
                      alert.type === 'error' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      {alert.message}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="flex flex-wrap gap-2">
            {wallets.length === 0 && (
              <Button 
                onClick={() => initializeWalletsMutation.mutate()} 
                disabled={initializeWalletsMutation.isPending}
                data-testid="button-initialize-wallets"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Initialize Default Wallets
              </Button>
            )}
            <Button 
              onClick={() => { setEditingWallet(null); walletForm.reset(); setIsWalletDialogOpen(true); }}
              data-testid="button-add-wallet"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsCloseDialogOpen(true)}
              disabled={closings.some(c => new Date(c.closingDate).toDateString() === new Date().toDateString())}
              data-testid="button-close-day"
            >
              <Lock className="h-4 w-4 mr-2" />
              Close Day
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="overview" data-testid="tab-overview">Wallets</TabsTrigger>
              <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
              <TabsTrigger value="closings" data-testid="tab-closings">Daily Closings</TabsTrigger>
              <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {walletsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : wallets.length === 0 ? (
                <Card className="p-8 text-center">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Wallets Found</h3>
                  <p className="text-muted-foreground mb-4">Click "Initialize Default Wallets" to create Cash, UPI, and Bank accounts</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wallets.map((wallet) => {
                    const Icon = getWalletIcon(wallet.type);
                    return (
                      <Card key={wallet.id} className="relative" data-testid={`card-wallet-${wallet.id}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5" />
                              <CardTitle className="text-lg">{wallet.name}</CardTitle>
                            </div>
                            <Badge className={getWalletTypeColor(wallet.type)}>
                              {wallet.type.toUpperCase()}
                            </Badge>
                          </div>
                          {wallet.description && (
                            <CardDescription>{wallet.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Current Balance</p>
                              <p className="text-2xl font-bold" data-testid={`text-wallet-balance-${wallet.id}`}>
                                ₹{parseFloat(wallet.currentBalance?.toString() || "0").toLocaleString()}
                              </p>
                            </div>
                            {wallet.type === "bank" && wallet.accountNumber && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">A/C: </span>
                                <span>****{wallet.accountNumber.slice(-4)}</span>
                              </div>
                            )}
                            {wallet.type === "upi" && wallet.upiId && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">UPI: </span>
                                <span>{wallet.upiId}</span>
                              </div>
                            )}
                            <div className="flex gap-2 pt-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleAddTransaction(wallet)}
                                data-testid={`button-add-transaction-${wallet.id}`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Transaction
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleEditWallet(wallet)}
                                data-testid={`button-edit-wallet-${wallet.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!wallet.isDefault && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => deleteWalletMutation.mutate(wallet.id)}
                                  data-testid={`button-delete-wallet-${wallet.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>All wallet transactions for this property</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12" />
                      ))}
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions recorded yet
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {transactions.map((tx) => {
                          const wallet = wallets.find(w => w.id === tx.walletId);
                          return (
                            <div 
                              key={tx.id} 
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              data-testid={`row-transaction-${tx.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${tx.transactionType === "credit" ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                                  {tx.transactionType === "credit" ? (
                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{tx.description || tx.source}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {wallet?.name} • {format(new Date(tx.transactionDate), "dd MMM yyyy, HH:mm")}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-bold ${tx.transactionType === "credit" ? "text-green-600" : "text-red-600"}`}>
                                  {tx.transactionType === "credit" ? "+" : "-"}₹{parseFloat(tx.amount?.toString() || "0").toLocaleString()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Bal: ₹{parseFloat(tx.balanceAfter?.toString() || "0").toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="closings" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Closings</CardTitle>
                  <CardDescription>End-of-day balance snapshots</CardDescription>
                </CardHeader>
                <CardContent>
                  {closings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No daily closings recorded yet. Close the day to create a snapshot.
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {closings.map((closing) => (
                          <div 
                            key={closing.id} 
                            className="p-4 border rounded-lg"
                            data-testid={`row-closing-${closing.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <span className="font-medium">
                                  {format(new Date(closing.closingDate), "dd MMM yyyy")}
                                </span>
                              </div>
                              <Badge variant="outline">
                                {closing.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Revenue</p>
                                <p className="font-medium">₹{parseFloat(closing.totalRevenue?.toString() || "0").toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Collected</p>
                                <p className="font-medium text-green-600">+₹{parseFloat(closing.totalCollected?.toString() || "0").toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Expenses</p>
                                <p className="font-medium text-red-600">-₹{parseFloat(closing.totalExpenses?.toString() || "0").toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="font-bold">₹{parseFloat(closing.totalPendingReceivable?.toString() || "0").toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Reports</CardTitle>
                  <CardDescription>Download Cash Book, Bank Book, and Daily Summary reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      <Input 
                        type="date" 
                        value={reportStartDate} 
                        onChange={(e) => setReportStartDate(e.target.value)}
                        data-testid="input-report-start-date"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date</label>
                      <Input 
                        type="date" 
                        value={reportEndDate} 
                        onChange={(e) => setReportEndDate(e.target.value)}
                        data-testid="input-report-end-date"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Banknote className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Cash Book</h4>
                          <p className="text-sm text-muted-foreground">All cash transactions</p>
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        disabled={isDownloading}
                        onClick={async () => {
                          setIsDownloading(true);
                          try {
                            const response = await fetch(
                              `/api/reports/cash-book?propertyId=${selectedProperty}&startDate=${reportStartDate}&endDate=${reportEndDate}`
                            );
                            const data = await response.json();
                            
                            let csv = "Date,Type,Amount,Description,Reference,Balance After\n";
                            data.transactions.forEach((t: any) => {
                              csv += `${format(new Date(t.transactionDate), "yyyy-MM-dd")},${t.transactionType},${t.amount},"${t.description || ''}",${t.referenceNumber || ''},${t.balanceAfter || ''}\n`;
                            });
                            csv += `\nOpening Balance,${data.openingBalance}\n`;
                            csv += `Closing Balance,${data.closingBalance}\n`;
                            csv += `Total Credits,${data.summary.totalCredits}\n`;
                            csv += `Total Debits,${data.summary.totalDebits}\n`;
                            
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `cash-book-${reportStartDate}-to-${reportEndDate}.csv`;
                            a.click();
                            toast({ title: "Cash Book downloaded successfully" });
                          } catch (error) {
                            toast({ title: "Failed to download report", variant: "destructive" });
                          } finally {
                            setIsDownloading(false);
                          }
                        }}
                        data-testid="button-download-cash-book"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Bank Book</h4>
                          <p className="text-sm text-muted-foreground">All bank transactions</p>
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        disabled={isDownloading}
                        onClick={async () => {
                          setIsDownloading(true);
                          try {
                            const response = await fetch(
                              `/api/reports/bank-book?propertyId=${selectedProperty}&startDate=${reportStartDate}&endDate=${reportEndDate}`
                            );
                            const data = await response.json();
                            
                            let csv = "Date,Type,Amount,Description,Reference,Account,Balance After\n";
                            data.transactions.forEach((t: any) => {
                              csv += `${format(new Date(t.transactionDate), "yyyy-MM-dd")},${t.transactionType},${t.amount},"${t.description || ''}",${t.referenceNumber || ''},${t.walletName || ''},${t.balanceAfter || ''}\n`;
                            });
                            csv += `\nOpening Balance,${data.openingBalance}\n`;
                            csv += `Closing Balance,${data.closingBalance}\n`;
                            csv += `Total Credits,${data.summary.totalCredits}\n`;
                            csv += `Total Debits,${data.summary.totalDebits}\n`;
                            
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `bank-book-${reportStartDate}-to-${reportEndDate}.csv`;
                            a.click();
                            toast({ title: "Bank Book downloaded successfully" });
                          } catch (error) {
                            toast({ title: "Failed to download report", variant: "destructive" });
                          } finally {
                            setIsDownloading(false);
                          }
                        }}
                        data-testid="button-download-bank-book"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Wallet className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Daily Summary</h4>
                          <p className="text-sm text-muted-foreground">Today's wallet status</p>
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        disabled={isDownloading}
                        onClick={async () => {
                          setIsDownloading(true);
                          try {
                            const response = await fetch(
                              `/api/reports/daily-summary?propertyId=${selectedProperty}&date=${reportEndDate}`
                            );
                            const data = await response.json();
                            
                            let csv = "Wallet Name,Type,Current Balance,Day Credits,Day Debits,Transaction Count\n";
                            data.wallets.forEach((w: any) => {
                              csv += `${w.walletName},${w.walletType},${w.currentBalance},${w.dayCredits},${w.dayDebits},${w.transactionCount}\n`;
                            });
                            csv += `\nTotal Credits,${data.totals.totalCredits}\n`;
                            csv += `Total Debits,${data.totals.totalDebits}\n`;
                            csv += `Net Change,${data.totals.netChange}\n`;
                            csv += `Total Balance,${data.totals.totalBalance}\n`;
                            csv += `Day Closed,${data.isDayClosed ? 'Yes' : 'No'}\n`;
                            
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `daily-summary-${reportEndDate}.csv`;
                            a.click();
                            toast({ title: "Daily Summary downloaded successfully" });
                          } catch (error) {
                            toast({ title: "Failed to download report", variant: "destructive" });
                          } finally {
                            setIsDownloading(false);
                          }
                        }}
                        data-testid="button-download-daily-summary"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWallet ? "Edit Wallet" : "Add New Wallet"}</DialogTitle>
            <DialogDescription>
              {editingWallet ? "Update payment account details" : "Create a new payment account"}
            </DialogDescription>
          </DialogHeader>
          <Form {...walletForm}>
            <form 
              onSubmit={walletForm.handleSubmit((data) => {
                if (editingWallet) {
                  updateWalletMutation.mutate(data);
                } else {
                  createWalletMutation.mutate(data);
                }
              })} 
              className="space-y-4"
            >
              <FormField
                control={walletForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., HDFC Savings" {...field} data-testid="input-wallet-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={walletForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-wallet-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank">Bank Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {walletForm.watch("type") === "bank" && (
                <>
                  <FormField
                    control={walletForm.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Account number" {...field} data-testid="input-account-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={walletForm.control}
                    name="ifscCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IFSC Code</FormLabel>
                        <FormControl>
                          <Input placeholder="IFSC code" {...field} data-testid="input-ifsc" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {walletForm.watch("type") === "upi" && (
                <FormField
                  control={walletForm.control}
                  name="upiId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UPI ID</FormLabel>
                      <FormControl>
                        <Input placeholder="name@upi" {...field} data-testid="input-upi-id" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={walletForm.control}
                name="openingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-opening-balance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={walletForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description" {...field} data-testid="input-wallet-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsWalletDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createWalletMutation.isPending || updateWalletMutation.isPending}
                  data-testid="button-save-wallet"
                >
                  {editingWallet ? "Update" : "Create"} Wallet
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Transaction</DialogTitle>
            <DialogDescription>
              Add a credit or debit to {selectedWallet?.name}
            </DialogDescription>
          </DialogHeader>
          <Form {...transactionForm}>
            <form onSubmit={transactionForm.handleSubmit((data) => recordTransactionMutation.mutate(data))} className="space-y-4">
              <FormField
                control={transactionForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transaction-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit">Credit (Money In)</SelectItem>
                        <SelectItem value="debit">Debit (Money Out)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={transactionForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-transaction-amount" />
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
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-transaction-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={transactionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Transaction details" {...field} data-testid="input-transaction-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={transactionForm.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Cheque/UTR number" {...field} data-testid="input-transaction-reference" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={recordTransactionMutation.isPending}
                  data-testid="button-save-transaction"
                >
                  Record Transaction
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Day</DialogTitle>
            <DialogDescription>
              This will lock today's transactions and carry forward all wallet balances to tomorrow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Confirm Day Closing</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Once closed, you cannot add or modify transactions for today. Current balances will become tomorrow's opening balances.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Wallet Balances to Carry Forward:</p>
              {wallets.map((wallet) => (
                <div key={wallet.id} className="flex justify-between text-sm">
                  <span>{wallet.name}</span>
                  <span className="font-medium">₹{parseFloat(wallet.currentBalance?.toString() || "0").toLocaleString()}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>₹{totalBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => closeDayMutation.mutate()} 
              disabled={closeDayMutation.isPending}
              data-testid="button-confirm-close-day"
            >
              <Lock className="h-4 w-4 mr-2" />
              Close Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
