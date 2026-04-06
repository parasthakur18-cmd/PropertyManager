import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Wallet, CreditCard, Banknote, ArrowUpRight, ArrowDownRight, Clock, Lock, RefreshCw, AlertTriangle, CheckCircle2, Download, Eye, Trash2, Pencil, ArrowLeftRight, Building2, TrendingUp, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import type { Property, Wallet as WalletType, WalletTransaction, DailyClosing, PropertyTransfer } from "@shared/schema";

const walletFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["cash", "upi"]),
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super-admin";
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "transfers" | "closings" | "reports">("overview");
  const [reportStartDate, setReportStartDate] = useState<string>(new Date(new Date().setDate(1)).toISOString().split("T")[0]);
  const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpeningBalanceDialogOpen, setIsOpeningBalanceDialogOpen] = useState(false);
  const [openingBalances, setOpeningBalances] = useState<Record<number, string>>({});
  const [txWalletFilter, setTxWalletFilter] = useState<string>("all");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");
  const [txSourceFilter, setTxSourceFilter] = useState<string>("all");
  const [txSearch, setTxSearch] = useState<string>("");
  const [showAllPropertiesSummary, setShowAllPropertiesSummary] = useState(true);
  const [summaryAsOfDate, setSummaryAsOfDate] = useState<string>("");

  // Transfer & Top-up state
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isTopupDialogOpen, setIsTopupDialogOpen] = useState(false);
  const [transferSourceWallet, setTransferSourceWallet] = useState<WalletType | null>(null);
  const [topupTargetWallet, setTopupTargetWallet] = useState<WalletType | null>(null);
  const [transferToPropertyId, setTransferToPropertyId] = useState<string>("");
  const [transferToWalletId, setTransferToWalletId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferNote, setTransferNote] = useState<string>("");
  const [topupAmount, setTopupAmount] = useState<string>("");
  const [topupNote, setTopupNote] = useState<string>("");
  const [topupDate, setTopupDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Correct Transaction state
  const [correctTxDialog, setCorrectTxDialog] = useState<{ open: boolean; tx: WalletTransaction | null }>({ open: false, tx: null });
  const [correctReason, setCorrectReason] = useState("");
  const [correctNewWalletId, setCorrectNewWalletId] = useState<string>("");

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Wallets of the selected "transfer-to" property (for transfer modal)
  const { data: toPropertyWallets = [] } = useQuery<WalletType[]>({
    queryKey: ["/api/wallets", parseInt(transferToPropertyId) || 0],
    queryFn: async () => {
      if (!transferToPropertyId) return [];
      const r = await fetch(`/api/wallets?propertyId=${transferToPropertyId}`);
      if (!r.ok) throw new Error("Failed to fetch wallets");
      return r.json();
    },
    enabled: !!transferToPropertyId,
  });

  // Transfers for current property
  const { data: transfers = [] } = useQuery<PropertyTransfer[]>({
    queryKey: ["/api/transfers", selectedProperty],
    queryFn: async () => {
      if (!selectedProperty) return [];
      const r = await fetch(`/api/transfers?propertyId=${selectedProperty}`);
      if (!r.ok) throw new Error("Failed to fetch transfers");
      return r.json();
    },
    enabled: !!selectedProperty,
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

  const { data: allPropertiesSummary, isLoading: allSummaryLoading } = useQuery<{
    properties: { propertyId: number; propertyName: string; cashTotal: string; upiTotal: string; grandTotal: string; wallets: { id: number; name: string; type: string; balance: string }[] }[];
    totals: { cash: string; upi: string; grand: string };
    asOfDate: string | null;
  }>({
    queryKey: ["/api/wallets/all-properties-summary", summaryAsOfDate],
    queryFn: async () => {
      const url = summaryAsOfDate
        ? `/api/wallets/all-properties-summary?asOfDate=${summaryAsOfDate}`
        : "/api/wallets/all-properties-summary";
      const r = await fetch(url);
      if (!r.ok) throw new Error("Failed to fetch summary");
      return r.json();
    },
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
      type: "upi" as const,
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
        description: "Default payment accounts (Cash, UPI) have been created.",
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

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!transferSourceWallet || !selectedProperty) throw new Error("No source wallet selected");
      const r = await apiRequest("/api/transfers", "POST", {
        fromPropertyId: selectedProperty,
        toPropertyId: parseInt(transferToPropertyId),
        fromWalletId: transferSourceWallet.id,
        toWalletId: parseInt(transferToWalletId),
        amount: parseFloat(transferAmount),
        referenceNote: transferNote || null,
      });
      if (!r.ok) {
        const body = await r.json();
        const err: any = new Error(body.message || "Transfer failed");
        err.code = body.code;
        err.available = body.available;
        throw err;
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers", selectedProperty] });
      setIsTransferDialogOpen(false);
      setTransferSourceWallet(null);
      setTransferToPropertyId("");
      setTransferToWalletId("");
      setTransferAmount("");
      setTransferNote("");
      toast({ title: "Transfer complete", description: `₹${parseFloat(transferAmount).toLocaleString()} transferred successfully.` });
    },
    onError: (error: any) => {
      toast({
        title: error.code === "INSUFFICIENT_BALANCE" ? "Insufficient Balance" : "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const topupMutation = useMutation({
    mutationFn: async () => {
      if (!topupTargetWallet || !selectedProperty) throw new Error("No wallet selected");
      const r = await apiRequest(`/api/wallets/${topupTargetWallet.id}/topup`, "POST", {
        propertyId: selectedProperty,
        amount: parseFloat(topupAmount),
        referenceNote: topupNote || null,
        transactionDate: topupDate,
      });
      if (!r.ok) { const b = await r.json(); throw new Error(b.message || "Top-up failed"); }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions", selectedProperty] });
      setIsTopupDialogOpen(false);
      setTopupTargetWallet(null);
      setTopupAmount("");
      setTopupNote("");
      toast({ title: "Funds added", description: `₹${parseFloat(topupAmount).toLocaleString()} added as external funding.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reverseTransferMutation = useMutation({
    mutationFn: async (transferId: number) => {
      const r = await apiRequest(`/api/transfers/${transferId}/reverse`, "POST", {});
      if (!r.ok) { const b = await r.json(); throw new Error(b.message || "Reversal failed"); }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers", selectedProperty] });
      toast({ title: "Transfer reversed", description: "The transfer has been reversed and funds restored." });
    },
    onError: (error: any) => {
      toast({ title: "Reversal failed", description: error.message, variant: "destructive" });
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

  const setOpeningBalanceMutation = useMutation({
    mutationFn: async (balances: Record<number, number>) => {
      const promises = Object.entries(balances).map(async ([walletId, amount]) => {
        if (amount > 0) {
          const response = await apiRequest(`/api/wallets/${walletId}/opening-balance`, "POST", {
            propertyId: selectedProperty,
            amount,
            description: `Opening balance set on ${format(new Date(), "dd MMM yyyy")}`,
          });
          return response.json();
        }
        return null;
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions", selectedProperty] });
      setIsOpeningBalanceDialogOpen(false);
      setOpeningBalances({});
      toast({
        title: "Opening balances set",
        description: "Wallet opening balances have been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set opening balances",
        variant: "destructive",
      });
    },
  });

  const correctTransactionMutation = useMutation({
    mutationFn: async ({ txId, reason, newWalletId }: { txId: number; reason: string; newWalletId: number | null }) => {
      const res = await apiRequest(`/api/wallet-transactions/${txId}/reverse`, "POST", { reason, newWalletId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet-transactions", selectedProperty] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets/all-properties-summary"] });
      setCorrectTxDialog({ open: false, tx: null });
      setCorrectReason("");
      setCorrectNewWalletId("");
      toast({ title: "Transaction corrected", description: "The reversal entry and re-credit have been recorded in the ledger." });
    },
    onError: (error: any) => {
      toast({ title: "Correction failed", description: error.message || "Could not reverse transaction", variant: "destructive" });
    },
  });

  const handleOpenOpeningBalanceDialog = () => {
    const balances: Record<number, string> = {};
    wallets.forEach(w => {
      balances[w.id] = "";
    });
    setOpeningBalances(balances);
    setIsOpeningBalanceDialogOpen(true);
  };

  const handleSetOpeningBalances = () => {
    const numericBalances: Record<number, number> = {};
    Object.entries(openingBalances).forEach(([id, value]) => {
      const amount = parseFloat(value || "0");
      if (amount > 0) {
        numericBalances[parseInt(id)] = amount;
      }
    });
    
    if (Object.keys(numericBalances).length === 0) {
      toast({ title: "Please enter at least one opening balance", variant: "destructive" });
      return;
    }
    
    setOpeningBalanceMutation.mutate(numericBalances);
  };

  const handleEditWallet = (wallet: WalletType) => {
    setEditingWallet(wallet);
    walletForm.reset({
      name: wallet.name,
      type: (wallet.type === 'bank' || wallet.type === 'upi' ? 'upi' : wallet.type) as "cash" | "upi",
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
      case "upi":
      case "bank": return CreditCard;
      default: return CreditCard;
    }
  };

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case "cash": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "upi":
      case "bank": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "booking_payment": return "Room Payment";
      case "food_order_payment": return "Food Order";
      case "advance_payment": return "Advance";
      case "expense": return "Expense";
      case "vendor_payment": return "Vendor";
      case "salary_payment": return "Salary";
      case "cancellation_charge": return "Cancellation";
      case "refund": return "Refund";
      case "manual": return "Manual Entry";
      case "extra_service_payment": return "Extra Service";
      case "internal_transfer": return "Property Transfer";
      case "external_funding": return "External Funding";
      case "opening_balance": return "Opening Balance";
      default: return source?.replace(/_/g, " ") || "Other";
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "booking_payment": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "food_order_payment": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "advance_payment": return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      case "expense": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "vendor_payment": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "salary_payment": return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "cancellation_charge": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "refund": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "manual": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "extra_service_payment": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "internal_transfer": return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200";
      case "external_funding": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      default: return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
    }
  };

  const getRefFromDescription = (desc: string | null, sourceId: number | null) => {
    if (!desc) return sourceId ? `#${sourceId}` : "";
    const match = desc.match(/#(\d+)/);
    if (match) return `#${match[1]}`;
    return sourceId ? `#${sourceId}` : "";
  };

  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || "0"), 0);
  const cashBalance = wallets.filter(w => w.type === "cash").reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || "0"), 0);
  const upiBalance = wallets.filter(w => w.type === "upi" || w.type === "bank").reduce((sum, w) => sum + parseFloat(w.currentBalance?.toString() || "0"), 0);

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
            value={selectedProperty?.toString() || "all"}
            onValueChange={(v) => setSelectedProperty(v === "all" ? null : parseInt(v))}
            data-testid="select-property"
          >
            <SelectTrigger className="w-[220px]" data-testid="select-property-trigger">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* All-Properties Balance Summary */}
      <Card data-testid="card-all-properties-summary">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {selectedProperty
                  ? `${properties.find(p => p.id === selectedProperty)?.name ?? "Property"} — Balance`
                  : "All Properties Balance"}
              </CardTitle>
              {summaryAsOfDate && (
                <Badge variant="secondary" className="text-xs">
                  As of {format(new Date(summaryAsOfDate + "T00:00:00"), "dd MMM yyyy")}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Balance on date:</Label>
                <Input
                  type="date"
                  value={summaryAsOfDate}
                  onChange={e => setSummaryAsOfDate(e.target.value)}
                  className="h-8 w-[150px] text-sm"
                  max={new Date().toISOString().split("T")[0]}
                  data-testid="input-summary-date"
                />
                {summaryAsOfDate && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setSummaryAsOfDate("")}>
                    Clear
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAllPropertiesSummary(v => !v)}>
                {showAllPropertiesSummary ? "Hide" : "Show"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showAllPropertiesSummary && (
          <CardContent className="pt-0">
            {allSummaryLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !allPropertiesSummary || allPropertiesSummary.properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No properties with wallets found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-all-properties-balance">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Property</th>
                      <th className="text-right py-2 px-3 font-medium">
                        <span className="flex items-center justify-end gap-1"><Banknote className="h-3.5 w-3.5 text-green-500" />Cash</span>
                      </th>
                      <th className="text-right py-2 px-3 font-medium">
                        <span className="flex items-center justify-end gap-1"><CreditCard className="h-3.5 w-3.5 text-purple-500" />UPI</span>
                      </th>
                      <th className="text-right py-2 pl-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPropertiesSummary.properties
                      .filter(p => !selectedProperty || p.propertyId === selectedProperty)
                      .map(p => (
                      <tr
                        key={p.propertyId}
                        className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedProperty(p.propertyId)}
                        data-testid={`row-property-balance-${p.propertyId}`}
                      >
                        <td className="py-2.5 pr-4 font-medium text-primary hover:underline">{p.propertyName}</td>
                        <td className="py-2.5 px-3 text-right text-green-700 dark:text-green-400 font-mono">
                          ₹{parseFloat(p.cashTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-purple-700 dark:text-purple-400 font-mono">
                          ₹{parseFloat(p.upiTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-semibold font-mono">
                          ₹{parseFloat(p.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const visibleRows = allPropertiesSummary.properties.filter(p => !selectedProperty || p.propertyId === selectedProperty);
                      const footerCash = visibleRows.reduce((s, p) => s + parseFloat(p.cashTotal), 0);
                      const footerUpi = visibleRows.reduce((s, p) => s + parseFloat(p.upiTotal), 0);
                      const footerGrand = footerCash + footerUpi;
                      return (
                        <tr className="border-t-2 bg-muted/20">
                          <td className="py-2.5 pr-4 font-bold text-sm">{selectedProperty ? "Total" : "Grand Total"}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-green-700 dark:text-green-400 font-mono text-sm">
                            ₹{footerCash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-purple-700 dark:text-purple-400 font-mono text-sm">
                            ₹{footerUpi.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-bold font-mono text-base text-primary">
                            ₹{footerGrand.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
                <p className="text-xs text-muted-foreground mt-2">
                  {summaryAsOfDate
                    ? `Balances as of end of ${format(new Date(summaryAsOfDate + "T00:00:00"), "dd MMM yyyy")}. `
                    : "Live current balances. "}
                  Cash = physical cash on hand · UPI = bank / digital accounts.
                  {!selectedProperty && " Click a row to drill into that property."}
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {!selectedProperty ? (
        <Card className="p-8 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Select a Specific Property</h3>
          <p className="text-muted-foreground">Choose a property from the dropdown above to add wallets, record transactions, and view detailed statements.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            {wallets.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleOpenOpeningBalanceDialog}
                data-testid="button-set-opening-balance"
              >
                <Banknote className="h-4 w-4 mr-2" />
                Set Opening Balance
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="overview" data-testid="tab-overview">Wallets</TabsTrigger>
              <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
              <TabsTrigger value="transfers" data-testid="tab-transfers">Transfers</TabsTrigger>
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
                  <p className="text-muted-foreground mb-4">Click "Initialize Default Wallets" to create Cash and UPI accounts</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wallets.map((wallet) => {
                    const Icon = getWalletIcon(wallet.type);
                    return (
                      <Card
                        key={wallet.id}
                        className="relative cursor-pointer hover:shadow-md transition-shadow"
                        data-testid={`card-wallet-${wallet.id}`}
                        onClick={() => {
                          setTxWalletFilter(String(wallet.id));
                          setActiveTab("transactions");
                        }}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5" />
                              <CardTitle className="text-lg">{wallet.name}</CardTitle>
                            </div>
                            <Badge className={getWalletTypeColor(wallet.type)}>
                              {wallet.type === 'bank' ? 'UPI' : wallet.type.toUpperCase()}
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
                              <p className="text-xs text-muted-foreground mt-1 text-teal-600 font-medium">Tap to view transactions →</p>
                            </div>
                            {(wallet.type === "upi" || wallet.type === "bank") && wallet.upiId && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">ID: </span>
                                <span>{wallet.upiId}</span>
                              </div>
                            )}
                            <div className="flex gap-2 pt-2 flex-wrap">
                              <Button 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); handleAddTransaction(wallet); }}
                                data-testid={`button-add-transaction-${wallet.id}`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Record
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTopupTargetWallet(wallet);
                                  setTopupAmount("");
                                  setTopupNote("");
                                  setTopupDate(new Date().toISOString().split("T")[0]);
                                  setIsTopupDialogOpen(true);
                                }}
                                data-testid={`button-topup-wallet-${wallet.id}`}
                                title="Add external funds (owner/investor)"
                              >
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Add Funds
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferSourceWallet(wallet);
                                  setTransferToPropertyId("");
                                  setTransferToWalletId("");
                                  setTransferAmount("");
                                  setTransferNote("");
                                  setIsTransferDialogOpen(true);
                                }}
                                data-testid={`button-transfer-wallet-${wallet.id}`}
                                title="Transfer funds to another property"
                              >
                                <ArrowLeftRight className="h-4 w-4 mr-1" />
                                Transfer
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => { e.stopPropagation(); handleEditWallet(wallet); }}
                                data-testid={`button-edit-wallet-${wallet.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!wallet.isDefault && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={(e) => { e.stopPropagation(); deleteWalletMutation.mutate(wallet.id); }}
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
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select value={txWalletFilter} onValueChange={setTxWalletFilter}>
                      <SelectTrigger className="w-44" data-testid="select-tx-wallet-filter">
                        <SelectValue placeholder="All Wallets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Wallets</SelectItem>
                        {wallets.map(w => (
                          <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                      <SelectTrigger className="w-36" data-testid="select-tx-type-filter">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="credit">Money In</SelectItem>
                        <SelectItem value="debit">Money Out</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={txSourceFilter ?? "all"} onValueChange={v => setTxSourceFilter(v)}>
                      <SelectTrigger className="w-44" data-testid="select-tx-source-filter">
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="booking_payment">Room Payment</SelectItem>
                        <SelectItem value="food_order_payment">Food Order</SelectItem>
                        <SelectItem value="advance_payment">Advance</SelectItem>
                        <SelectItem value="extra_service_payment">Extra Service</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="vendor_payment">Vendor</SelectItem>
                        <SelectItem value="salary_payment">Salary</SelectItem>
                        <SelectItem value="manual">Manual Entry</SelectItem>
                      </SelectContent>
                    </Select>

                    <input
                      type="text"
                      placeholder="Search by name, ref no..."
                      value={txSearch}
                      onChange={e => setTxSearch(e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-52"
                      data-testid="input-tx-search"
                    />

                    {(txWalletFilter !== "all" || txTypeFilter !== "all" || txSourceFilter !== "all" || txSearch) && (
                      <button
                        onClick={() => { setTxWalletFilter("all"); setTxTypeFilter("all"); setTxSourceFilter("all"); setTxSearch(""); }}
                        className="text-sm text-muted-foreground underline self-center"
                        data-testid="button-clear-tx-filters"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>

                  {/* Transaction list */}
                  {transactionsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12" />
                      ))}
                    </div>
                  ) : (() => {
                    const filtered = transactions.filter(tx => {
                      if (txWalletFilter !== "all" && String(tx.walletId) !== txWalletFilter) return false;
                      if (txTypeFilter !== "all" && tx.transactionType !== txTypeFilter) return false;
                      if (txSourceFilter !== "all" && tx.source !== txSourceFilter) return false;
                      if (txSearch && !(tx.description || tx.source || "").toLowerCase().includes(txSearch.toLowerCase())) return false;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          No transactions match your filters
                        </div>
                      );
                    }

                    return (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {filtered.map((tx) => {
                            const wallet = wallets.find(w => w.id === tx.walletId);
                            return (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                data-testid={`row-transaction-${tx.id}`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`p-2 rounded-full shrink-0 ${tx.transactionType === "credit" ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                                    {tx.transactionType === "credit" ? (
                                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${getSourceColor(tx.source)}`}>
                                        {getSourceLabel(tx.source)}
                                      </span>
                                      {getRefFromDescription(tx.description, tx.sourceId) && (
                                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                                          Ref {getRefFromDescription(tx.description, tx.sourceId)}
                                        </span>
                                      )}
                                      {tx.referenceNumber && (
                                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                                          UTR: {tx.referenceNumber}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-medium text-sm truncate mt-0.5">{tx.description || tx.source}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {wallet?.name} • {format(new Date(tx.transactionDate), "dd MMM yyyy, HH:mm")}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <p className={`font-bold ${tx.transactionType === "credit" ? "text-green-600" : "text-red-600"}`}>
                                      {tx.transactionType === "credit" ? "+" : "-"}₹{parseFloat(tx.amount?.toString() || "0").toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Bal: ₹{parseFloat(tx.balanceAfter?.toString() || "0").toLocaleString()}
                                    </p>
                                    {(tx as any).isReversal && (
                                      <span className="text-xs text-orange-500 font-medium">Reversal</span>
                                    )}
                                  </div>
                                  {isAdmin && !((tx as any).isReversal) && tx.transactionType === "credit" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-orange-600"
                                      title="Correct this transaction"
                                      onClick={() => {
                                        setCorrectTxDialog({ open: true, tx });
                                        setCorrectReason("");
                                        setCorrectNewWalletId("");
                                      }}
                                      data-testid={`button-correct-tx-${tx.id}`}
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transfers" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Property Transfers</CardTitle>
                      <CardDescription>Internal fund movements between properties — not counted in P&L</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {transfers.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>No transfers recorded yet.</p>
                      <p className="text-sm mt-1">Use the "Transfer" button on a wallet card to move funds between properties.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground text-xs uppercase">
                            <th className="text-left py-2 pr-4">Date</th>
                            <th className="text-left py-2 pr-4">Direction</th>
                            <th className="text-left py-2 pr-4">Other Property</th>
                            <th className="text-left py-2 pr-4">Type</th>
                            <th className="text-right py-2 pr-4">Amount</th>
                            <th className="text-left py-2 pr-4">Note</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-right py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transfers.map((t) => {
                            const isOut = t.fromPropertyId === selectedProperty;
                            const otherPropertyId = isOut ? t.toPropertyId : t.fromPropertyId;
                            const otherProperty = properties.find(p => p.id === otherPropertyId);
                            return (
                              <tr key={t.id} className="border-b hover:bg-muted/30" data-testid={`row-transfer-${t.id}`}>
                                <td className="py-2 pr-4 text-muted-foreground">
                                  {t.createdAt ? format(new Date(t.createdAt), "dd MMM yyyy") : "—"}
                                </td>
                                <td className="py-2 pr-4">
                                  {isOut ? (
                                    <span className="flex items-center gap-1 text-red-600 font-medium">
                                      <ArrowUpRight className="h-4 w-4" /> Sent
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                      <ArrowDownRight className="h-4 w-4" /> Received
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 pr-4">
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-muted-foreground" />
                                    {otherProperty?.name || `Property #${otherPropertyId}`}
                                  </span>
                                </td>
                                <td className="py-2 pr-4">
                                  <Badge variant="outline" className="text-xs capitalize">{t.walletType}</Badge>
                                </td>
                                <td className="py-2 pr-4 text-right font-mono font-semibold">
                                  <span className={isOut ? "text-red-600" : "text-emerald-600"}>
                                    {isOut ? "−" : "+"}₹{parseFloat(t.amount.toString()).toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-muted-foreground max-w-[180px] truncate">
                                  {t.referenceNote || "—"}
                                </td>
                                <td className="py-2 pr-4">
                                  {t.status === "reversed" ? (
                                    <Badge variant="secondary" className="text-xs">Reversed</Badge>
                                  ) : (
                                    <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Completed</Badge>
                                  )}
                                </td>
                                <td className="py-2 text-right">
                                  {t.status === "completed" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        if (confirm(`Reverse transfer of ₹${parseFloat(t.amount.toString()).toLocaleString()}? This will restore funds to the original wallet.`)) {
                                          reverseTransferMutation.mutate(t.id);
                                        }
                                      }}
                                      disabled={reverseTransferMutation.isPending}
                                      data-testid={`button-reverse-transfer-${t.id}`}
                                    >
                                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                      Reverse
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
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

                  <Separator />

                  {/* Income Breakdown by Source */}
                  <div>
                    <h4 className="font-semibold mb-1">Income & Expense Breakdown</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Summary for {reportStartDate} to {reportEndDate} — grouped by source type and payment account
                    </p>
                    {(() => {
                      const start = new Date(reportStartDate);
                      start.setHours(0,0,0,0);
                      const end = new Date(reportEndDate);
                      end.setHours(23,59,59,999);

                      const inRange = transactions.filter(tx => {
                        const d = new Date(tx.transactionDate);
                        return d >= start && d <= end;
                      });

                      const sources = Array.from(new Set(inRange.map(tx => tx.source))).sort();

                      if (inRange.length === 0) {
                        return <p className="text-sm text-muted-foreground">No transactions in this date range.</p>;
                      }

                      const walletCols = wallets.filter(w =>
                        inRange.some(tx => tx.walletId === w.id)
                      );

                      const getAmt = (source: string, walletId: number, type: "credit" | "debit") =>
                        inRange
                          .filter(tx => tx.source === source && tx.walletId === walletId && tx.transactionType === type)
                          .reduce((s, tx) => s + parseFloat(tx.amount?.toString() || "0"), 0);

                      const getRowTotal = (source: string, type: "credit" | "debit") =>
                        inRange
                          .filter(tx => tx.source === source && tx.transactionType === type)
                          .reduce((s, tx) => s + parseFloat(tx.amount?.toString() || "0"), 0);

                      const getColTotal = (walletId: number, type: "credit" | "debit") =>
                        inRange
                          .filter(tx => tx.walletId === walletId && tx.transactionType === type)
                          .reduce((s, tx) => s + parseFloat(tx.amount?.toString() || "0"), 0);

                      const grandTotal = (type: "credit" | "debit") =>
                        inRange.filter(tx => tx.transactionType === type)
                          .reduce((s, tx) => s + parseFloat(tx.amount?.toString() || "0"), 0);

                      return (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/60 border-b">
                                <th className="text-left px-3 py-2 font-medium">Source</th>
                                {walletCols.map(w => (
                                  <th key={w.id} className="text-right px-3 py-2 font-medium" colSpan={2}>
                                    {w.name}
                                  </th>
                                ))}
                                <th className="text-right px-3 py-2 font-medium" colSpan={2}>Total</th>
                              </tr>
                              <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                                <th className="px-3 py-1"></th>
                                {walletCols.map(w => (
                                  <Fragment key={w.id}>
                                    <th className="text-right px-3 py-1 text-green-600">In</th>
                                    <th className="text-right px-3 py-1 text-red-500">Out</th>
                                  </Fragment>
                                ))}
                                <th className="text-right px-3 py-1 text-green-600">In</th>
                                <th className="text-right px-3 py-1 text-red-500">Out</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sources.map((source, i) => (
                                <tr key={source} className={`border-b ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                                  <td className="px-3 py-2">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getSourceColor(source)}`}>
                                      {getSourceLabel(source)}
                                    </span>
                                  </td>
                                  {walletCols.map(w => (
                                    <Fragment key={w.id}>
                                      <td className="text-right px-3 py-2 text-green-600 font-mono text-xs">
                                        {getAmt(source, w.id, "credit") > 0 ? `₹${getAmt(source, w.id, "credit").toLocaleString()}` : "—"}
                                      </td>
                                      <td className="text-right px-3 py-2 text-red-500 font-mono text-xs">
                                        {getAmt(source, w.id, "debit") > 0 ? `₹${getAmt(source, w.id, "debit").toLocaleString()}` : "—"}
                                      </td>
                                    </Fragment>
                                  ))}
                                  <td className="text-right px-3 py-2 font-semibold text-green-600 font-mono text-xs">
                                    {getRowTotal(source, "credit") > 0 ? `₹${getRowTotal(source, "credit").toLocaleString()}` : "—"}
                                  </td>
                                  <td className="text-right px-3 py-2 font-semibold text-red-500 font-mono text-xs">
                                    {getRowTotal(source, "debit") > 0 ? `₹${getRowTotal(source, "debit").toLocaleString()}` : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-muted/60 font-bold border-t-2">
                                <td className="px-3 py-2 text-sm">Total</td>
                                {walletCols.map(w => (
                                  <Fragment key={w.id}>
                                    <td className="text-right px-3 py-2 text-green-600 font-mono text-xs">
                                      {getColTotal(w.id, "credit") > 0 ? `₹${getColTotal(w.id, "credit").toLocaleString()}` : "—"}
                                    </td>
                                    <td className="text-right px-3 py-2 text-red-500 font-mono text-xs">
                                      {getColTotal(w.id, "debit") > 0 ? `₹${getColTotal(w.id, "debit").toLocaleString()}` : "—"}
                                    </td>
                                  </Fragment>
                                ))}
                                <td className="text-right px-3 py-2 text-green-600 font-mono text-xs">₹{grandTotal("credit").toLocaleString()}</td>
                                <td className="text-right px-3 py-2 text-red-500 font-mono text-xs">₹{grandTotal("debit").toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      );
                    })()}
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {walletForm.watch("type") === "upi" && (
                <FormField
                  control={walletForm.control}
                  name="upiId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account / UPI ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Account number or UPI ID" {...field} data-testid="input-upi-id" />
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

      {/* ── TRANSFER DIALOG ── */}
      <Dialog open={isTransferDialogOpen} onOpenChange={(o) => { if (!o) setIsTransferDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]" data-testid="dialog-transfer-funds">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Transfer Funds to Another Property
            </DialogTitle>
            <DialogDescription>
              Only same-type wallets (Cash→Cash, UPI→UPI). Transfers are balance movements — not income or expense.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            {/* Source */}
            <div className="rounded-lg border p-3 bg-muted/40">
              <p className="text-xs text-muted-foreground mb-1">From wallet</p>
              <p className="font-semibold">{transferSourceWallet?.name} — {properties.find(p => p.id === selectedProperty)?.name}</p>
              <p className="text-sm text-muted-foreground">
                Available: <span className="font-mono font-medium text-foreground">₹{parseFloat(transferSourceWallet?.currentBalance?.toString() || "0").toLocaleString()}</span>
                {" "}({transferSourceWallet?.type === "cash" ? "Cash" : "UPI/Bank"})
              </p>
            </div>

            {/* Destination property */}
            <div className="space-y-1.5">
              <Label>To Property</Label>
              <Select value={transferToPropertyId} onValueChange={(v) => { setTransferToPropertyId(v); setTransferToWalletId(""); }}>
                <SelectTrigger data-testid="select-transfer-to-property">
                  <SelectValue placeholder="Select property..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.filter(p => p.id !== selectedProperty).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination wallet */}
            {transferToPropertyId && (
              <div className="space-y-1.5">
                <Label>To Wallet</Label>
                <Select value={transferToWalletId} onValueChange={setTransferToWalletId}>
                  <SelectTrigger data-testid="select-transfer-to-wallet">
                    <SelectValue placeholder="Select wallet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {toPropertyWallets
                      .filter(w => {
                        const srcType = transferSourceWallet?.type === "cash" ? "cash" : "upi";
                        const dstType = w.type === "cash" ? "cash" : "upi";
                        return srcType === dstType;
                      })
                      .map(w => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name} (₹{parseFloat(w.currentBalance?.toString() || "0").toLocaleString()})
                        </SelectItem>
                      ))
                    }
                    {toPropertyWallets.filter(w => {
                      const srcType = transferSourceWallet?.type === "cash" ? "cash" : "upi";
                      const dstType = w.type === "cash" ? "cash" : "upi";
                      return srcType === dstType;
                    }).length === 0 && (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No matching {transferSourceWallet?.type === "cash" ? "Cash" : "UPI/Bank"} wallet in that property
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Enter amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                data-testid="input-transfer-amount"
              />
              {(() => {
                const srcBal = parseFloat(transferSourceWallet?.currentBalance?.toString() || "0");
                const amt = parseFloat(transferAmount || "0");
                if (srcBal <= 0) return (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                      This wallet has no available funds. Add funds first, then transfer.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      onClick={() => {
                        setIsTransferDialogOpen(false);
                        setTopupTargetWallet(transferSourceWallet);
                        setTopupAmount("");
                        setTopupNote("");
                        setTopupDate(new Date().toISOString().split("T")[0]);
                        setIsTopupDialogOpen(true);
                      }}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Add Funds to {transferSourceWallet?.name}
                    </Button>
                  </div>
                );
                if (transferAmount && amt > srcBal) return (
                  <p className="text-xs text-destructive">
                    Exceeds available balance. Maximum ₹{srcBal.toLocaleString()}
                  </p>
                );
                return null;
              })()}
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label>Reference Note (optional)</Label>
              <Input
                placeholder="e.g. Emergency cover for March salary"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                data-testid="input-transfer-note"
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)} disabled={transferMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => transferMutation.mutate()}
              disabled={(() => {
                const srcBal = parseFloat(transferSourceWallet?.currentBalance?.toString() || "0");
                const amt = parseFloat(transferAmount || "0");
                return (
                  transferMutation.isPending ||
                  !transferToPropertyId ||
                  !transferToWalletId ||
                  !transferAmount ||
                  amt <= 0 ||
                  srcBal <= 0 ||
                  amt > srcBal
                );
              })()}
              data-testid="button-confirm-transfer"
            >
              {transferMutation.isPending ? "Transferring..." : `Transfer ₹${transferAmount ? parseFloat(transferAmount).toLocaleString() : "0"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD FUNDS (TOP-UP) DIALOG ── */}
      <Dialog open={isTopupDialogOpen} onOpenChange={(o) => { if (!o) setIsTopupDialogOpen(false); }}>
        <DialogContent className="sm:max-w-sm" data-testid="dialog-add-funds">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Add External Funds
            </DialogTitle>
            <DialogDescription>
              Record owner or investor capital injection into this wallet. This appears as "External Funding" — excluded from P&L revenue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-3 bg-muted/40">
              <p className="text-xs text-muted-foreground mb-1">Adding to</p>
              <p className="font-semibold">{topupTargetWallet?.name}</p>
              <p className="text-sm text-muted-foreground">
                Current balance: <span className="font-mono font-medium text-foreground">₹{parseFloat(topupTargetWallet?.currentBalance?.toString() || "0").toLocaleString()}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="Enter amount"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                data-testid="input-topup-amount"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={topupDate}
                onChange={(e) => setTopupDate(e.target.value)}
                data-testid="input-topup-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input
                placeholder="e.g. Owner capital injection — March 2026"
                value={topupNote}
                onChange={(e) => setTopupNote(e.target.value)}
                data-testid="input-topup-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTopupDialogOpen(false)} disabled={topupMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => topupMutation.mutate()}
              disabled={topupMutation.isPending || !topupAmount || parseFloat(topupAmount) <= 0}
              data-testid="button-confirm-topup"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {topupMutation.isPending ? "Adding..." : `Add ₹${topupAmount ? parseFloat(topupAmount).toLocaleString() : "0"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpeningBalanceDialogOpen} onOpenChange={setIsOpeningBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Opening Balance</DialogTitle>
            <DialogDescription>
              Set the opening balance for each wallet. This will record a credit transaction to bring the wallet to your desired starting balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Enter the amount you want to <strong>add</strong> to each wallet as opening balance. Leave empty or 0 to skip a wallet.
              </p>
            </div>
            {wallets.map((wallet) => {
              const Icon = getWalletIcon(wallet.type);
              return (
                <div key={wallet.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{wallet.name}</span>
                    <Badge className={getWalletTypeColor(wallet.type)} variant="secondary">
                      {wallet.type === 'bank' ? 'UPI' : wallet.type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground ml-auto">
                      Current: ₹{parseFloat(wallet.currentBalance?.toString() || "0").toLocaleString()}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter opening balance amount"
                    value={openingBalances[wallet.id] || ""}
                    onChange={(e) => setOpeningBalances(prev => ({
                      ...prev,
                      [wallet.id]: e.target.value
                    }))}
                    data-testid={`input-opening-balance-${wallet.id}`}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpeningBalanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSetOpeningBalances}
              disabled={setOpeningBalanceMutation.isPending}
              data-testid="button-save-opening-balance"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Set Opening Balances
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Correct Transaction Dialog */}
      <Dialog open={correctTxDialog.open} onOpenChange={(o) => { if (!o) setCorrectTxDialog({ open: false, tx: null }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              Correct Transaction
            </DialogTitle>
            <DialogDescription>
              This creates a reversal debit on the original wallet and optionally a re-credit on the correct wallet. The full history is preserved.
            </DialogDescription>
          </DialogHeader>
          {correctTxDialog.tx && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/40 text-sm space-y-1">
                <p className="font-medium">{correctTxDialog.tx.description || correctTxDialog.tx.source}</p>
                <p className="text-muted-foreground">
                  {wallets.find(w => w.id === correctTxDialog.tx?.walletId)?.name} •{" "}
                  <span className="text-green-600 font-semibold">
                    +₹{parseFloat(correctTxDialog.tx.amount?.toString() || "0").toLocaleString()}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Tx #{correctTxDialog.tx.id} • {format(new Date(correctTxDialog.tx.transactionDate), "dd MMM yyyy")}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Reason for correction <span className="text-red-500">*</span></Label>
                <Input
                  value={correctReason}
                  onChange={e => setCorrectReason(e.target.value)}
                  placeholder="e.g. Wrong payment mode — should be UPI not Cash"
                  data-testid="input-correct-reason"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Move amount to correct wallet (optional)</Label>
                <Select value={correctNewWalletId} onValueChange={setCorrectNewWalletId}>
                  <SelectTrigger data-testid="select-correct-wallet">
                    <SelectValue placeholder="Select wallet to re-credit (leave blank to just reverse)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Just reverse, no re-credit —</SelectItem>
                    {wallets
                      .filter(w => w.id !== correctTxDialog.tx?.walletId)
                      .map(w => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {w.name} ({w.type.toUpperCase()}) · ₹{parseFloat(w.currentBalance?.toString() || "0").toLocaleString()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  If the money went to the wrong wallet, select the correct one and the amount will be moved there.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectTxDialog({ open: false, tx: null })}>Cancel</Button>
            <Button
              variant="default"
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!correctReason.trim() || correctTransactionMutation.isPending}
              onClick={() => {
                if (!correctTxDialog.tx) return;
                correctTransactionMutation.mutate({
                  txId: correctTxDialog.tx.id,
                  reason: correctReason,
                  newWalletId: correctNewWalletId && correctNewWalletId !== "none" ? parseInt(correctNewWalletId) : null,
                });
              }}
              data-testid="button-confirm-correct-tx"
            >
              {correctTransactionMutation.isPending ? "Processing..." : "Confirm Correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
