import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, TrendingDown, Users, AlertCircle, Plus, CreditCard, Check, History, ChevronDown, ChevronUp, Download, FileSpreadsheet } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function SalariesPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().split('T')[0].slice(0, 7); // YYYY-MM format
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [advanceStaffId, setAdvanceStaffId] = useState<string>("");
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [advanceReason, setAdvanceReason] = useState("");
  const [advanceType, setAdvanceType] = useState<string>("regular");
  
  // Payment dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentStaffId, setPaymentStaffId] = useState<number | null>(null);
  const [paymentStaffName, setPaymentStaffName] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentMaxAmount, setPaymentMaxAmount] = useState<number>(0);
  
  // Payment history state
  const [expandedPaymentHistory, setExpandedPaymentHistory] = useState<number | null>(null);
  
  const { toast } = useToast();

  // Parse selected month to get start and end dates
  const [year, month] = selectedMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = endOfMonth(startDate);

  // Fetch user to get properties
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Set default property - ensure it's a number and wait for user data
  // Note: currentUser may be { user: {...}, verificationStatus: "..." } structure
  const userData = (currentUser as any)?.user || currentUser;
  const firstPropertyId = userData?.assignedPropertyIds?.[0];
  const effectivePropertyId = selectedPropertyId || (firstPropertyId ? parseInt(String(firstPropertyId), 10) : null);
  

  // Fetch detailed staff salaries - only when we have a valid property ID
  const { data: salaries = [], isLoading, error } = useQuery({
    queryKey: ["/api/staff-salaries/detailed", effectivePropertyId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!effectivePropertyId) return [];
      const response = await fetch(
        `/api/staff-salaries/detailed?propertyId=${effectivePropertyId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        if (response.status === 403) {
          toast({ title: "Error", description: "You don't have access to this property", variant: "destructive" });
        }
        throw new Error("Failed to fetch salary details");
      }
      const data = await response.json();
      return data;
    },
    enabled: !!effectivePropertyId && !userLoading,
  });
  
  // Use effectivePropertyId or fallback for display purposes
  const propertyId = effectivePropertyId || 1;

  // Fetch payment history for expanded staff member
  const { data: paymentHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/salary-payments", expandedPaymentHistory],
    queryFn: async () => {
      if (!expandedPaymentHistory) return [];
      const response = await fetch(
        `/api/salary-payments?staffMemberId=${expandedPaymentHistory}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch payment history");
      return response.json();
    },
    enabled: !!expandedPaymentHistory,
  });

  // Mutation to add salary advance
  const addAdvanceMutation = useMutation({
    mutationFn: async (data: { staffMemberId: number; amount: number; advanceDate: string; reason: string; advanceType: string }) => {
      return await apiRequest("/api/salary-advances", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-salaries/detailed"] });
      setIsAdvanceDialogOpen(false);
      setAdvanceStaffId("");
      setAdvanceAmount("");
      setAdvanceDate(new Date().toISOString().split('T')[0]);
      setAdvanceReason("");
      setAdvanceType("regular");
      toast({
        title: "Success",
        description: "Salary advance recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record salary advance",
        variant: "destructive",
      });
    },
  });

  const handleAddAdvance = () => {
    if (!advanceStaffId || !advanceAmount) {
      toast({
        title: "Error",
        description: "Please select a staff member and enter an amount",
        variant: "destructive",
      });
      return;
    }
    addAdvanceMutation.mutate({
      staffMemberId: parseInt(advanceStaffId),
      amount: parseFloat(advanceAmount),
      advanceDate: advanceDate,
      reason: advanceReason,
      advanceType: advanceType,
    });
  };

  // Mutation to record salary payment
  const recordPaymentMutation = useMutation({
    mutationFn: async (data: { staffMemberId: number; amount: number; paymentDate: string; paymentMethod: string; notes: string; periodStart: string; periodEnd: string }) => {
      return await apiRequest("/api/salary-payments", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-salaries/detailed"] });
      setIsPaymentDialogOpen(false);
      setPaymentStaffId(null);
      setPaymentStaffName("");
      setPaymentAmount("");
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod("cash");
      setPaymentNotes("");
      toast({
        title: "Success",
        description: "Salary payment recorded successfully",
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

  const openPaymentDialog = (staff: any) => {
    setPaymentStaffId(staff.staffId);
    setPaymentStaffName(staff.staffName);
    setPaymentAmount(staff.totalPayable.toFixed(2));
    setPaymentMaxAmount(staff.totalPayable);
    setIsPaymentDialogOpen(true);
  };

  const handleRecordPayment = () => {
    if (!paymentStaffId || !paymentAmount) {
      toast({
        title: "Error",
        description: "Please enter a payment amount",
        variant: "destructive",
      });
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Payment amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    recordPaymentMutation.mutate({
      staffMemberId: paymentStaffId,
      amount: amount,
      paymentDate: paymentDate,
      paymentMethod: paymentMethod,
      notes: paymentNotes,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    });
  };

  // Calculate totals including carry-forward
  const totals = {
    totalBaseSalary: salaries.reduce((sum: number, s: any) => sum + (s.baseSalary || 0), 0),
    totalDeductions: salaries.reduce((sum: number, s: any) => sum + (s.attendanceDeductions || 0), 0),
    totalAdvances: salaries.reduce((sum: number, s: any) => sum + (s.totalAdvances || 0), 0),
    totalPreviousPending: salaries.reduce((sum: number, s: any) => sum + (s.previousPending || 0), 0),
    totalPayable: salaries.reduce((sum: number, s: any) => sum + (s.totalPayable || 0), 0),
    totalPaymentsMade: salaries.reduce((sum: number, s: any) => sum + (s.paymentsMade || 0), 0),
  };

  // Export salary report as CSV
  const exportSalaryReport = () => {
    if (salaries.length === 0) {
      toast({ title: "No data", description: "No salary data to export", variant: "destructive" });
      return;
    }

    const headers = [
      "Staff Name",
      "Job Title",
      "Base Salary",
      "Present Days",
      "Absent Days",
      "Leave Days",
      "Half Days",
      "Attendance Deductions",
      "Regular Advances",
      "Extra Advances",
      "Total Advances",
      "Previous Pending",
      "Current Month Gross",
      "Payments Made",
      "Total Payable",
      "Status"
    ];

    const rows = salaries.map((s: any) => [
      s.staffName,
      s.jobTitle,
      s.baseSalary,
      s.presentDays,
      s.absentDays,
      s.leaveDays || 0,
      s.halfDays || 0,
      s.attendanceDeductions,
      s.regularAdvances || 0,
      s.extraAdvances || 0,
      s.totalAdvances,
      s.previousPending || 0,
      s.currentMonthGross || 0,
      s.paymentsMade || 0,
      s.totalPayable,
      s.status
    ]);

    // Add totals row
    rows.push([
      "TOTAL",
      "",
      totals.totalBaseSalary,
      "",
      "",
      "",
      "",
      totals.totalDeductions,
      "",
      "",
      totals.totalAdvances,
      totals.totalPreviousPending,
      "",
      totals.totalPaymentsMade,
      totals.totalPayable,
      ""
    ]);

    const csvContent = [
      `Salary Report - ${format(startDate, 'MMMM yyyy')}`,
      "",
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Salary_Report_${format(startDate, 'yyyy_MM')}.csv`;
    link.click();

    toast({
      title: "Export Complete",
      description: `Salary report for ${format(startDate, 'MMMM yyyy')} downloaded`,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold" data-testid="text-page-title">
              Staff Salary Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete salary breakdown with attendance deductions and advances
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportSalaryReport} data-testid="button-export-report">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            
            <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-advance">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Advance
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Salary Advance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="advance-staff">Staff Member</Label>
                  <Select value={advanceStaffId} onValueChange={setAdvanceStaffId}>
                    <SelectTrigger data-testid="select-advance-staff">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {salaries.map((staff: any) => (
                        <SelectItem key={staff.staffId} value={String(staff.staffId)}>
                          {staff.staffName} - {staff.jobTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="advance-amount">Amount (₹)</Label>
                  <Input
                    id="advance-amount"
                    type="number"
                    placeholder="Enter advance amount"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    data-testid="input-advance-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="advance-date">Date</Label>
                  <Input
                    id="advance-date"
                    type="date"
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    data-testid="input-advance-date"
                  />
                </div>
                <div>
                  <Label htmlFor="advance-type">Advance Type</Label>
                  <Select value={advanceType} onValueChange={setAdvanceType}>
                    <SelectTrigger data-testid="select-advance-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular Advance</SelectItem>
                      <SelectItem value="extra">Extra Advance</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Regular: Standard monthly advances. Extra: Additional advances beyond regular.
                  </p>
                </div>
                <div>
                  <Label htmlFor="advance-reason">Reason (Optional)</Label>
                  <Textarea
                    id="advance-reason"
                    placeholder="Enter reason for advance"
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                    data-testid="input-advance-reason"
                  />
                </div>
                <Button 
                  onClick={handleAddAdvance} 
                  disabled={addAdvanceMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-advance"
                >
                  {addAdvanceMutation.isPending ? "Recording..." : "Record Advance"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Payment Dialog */}
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Salary Payment</DialogTitle>
                <DialogDescription>
                  Record payment for {paymentStaffName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">Staff Member</p>
                  <p className="font-semibold">{paymentStaffName}</p>
                  <p className="text-sm text-muted-foreground mt-2">Total Payable</p>
                  <p className="font-semibold text-lg text-green-600">₹{paymentMaxAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <Label htmlFor="payment-amount">Payment Amount (₹)</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    placeholder="Enter payment amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={paymentMaxAmount}
                    data-testid="input-payment-amount"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can pay full or partial amount
                  </p>
                </div>
                <div>
                  <Label htmlFor="payment-date">Payment Date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    data-testid="input-payment-date"
                  />
                </div>
                <div>
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment-notes">Notes (Optional)</Label>
                  <Textarea
                    id="payment-notes"
                    placeholder="Enter any notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    data-testid="input-payment-notes"
                  />
                </div>
                <Button 
                  onClick={handleRecordPayment} 
                  disabled={recordPaymentMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-payment"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Month & Property Selection */}
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="month-select">Select Month</Label>
            <Input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              data-testid="input-month-select"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">{format(startDate, "MMMM yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Base Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold" data-testid="text-total-base-salary">
              ₹{totals.totalBaseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">{salaries.length} staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Deductions</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600" data-testid="text-total-deductions">
              -₹{totals.totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Absences & half-days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Advances</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600" data-testid="text-total-advances">
              -₹{totals.totalAdvances.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Previous Pending</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600" data-testid="text-total-previous-pending">
              ₹{totals.totalPreviousPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Carry forward</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600" data-testid="text-total-payments">
              ₹{totals.totalPaymentsMade.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Already paid</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-700 dark:text-green-400" data-testid="text-total-payable">
              ₹{totals.totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">To be paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards" data-testid="tab-cards-view">
            Staff Cards
          </TabsTrigger>
          <TabsTrigger value="table" data-testid="tab-table-view">
            Detailed Table
          </TabsTrigger>
        </TabsList>

        {/* Cards View */}
        <TabsContent value="cards" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading salary data...</div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-700">Failed to load salary data. Please try again.</p>
              </CardContent>
            </Card>
          ) : salaries.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12 text-muted-foreground">
                No staff members found for this property
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {salaries.map((staff: any) => (
                <Card key={staff.staffId} className="hover-elevate" data-testid={`card-staff-${staff.staffId}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{staff.staffName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{staff.jobTitle}</p>
                      </div>
                      <Badge
                        variant={
                          staff.status === 'paid'
                            ? 'default'
                            : staff.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                        data-testid={`badge-status-${staff.staffId}`}
                      >
                        {staff.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Salary Breakdown */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                      <div>
                        <p className="text-xs text-muted-foreground">Base Salary</p>
                        <p className="font-semibold">
                          ₹{staff.baseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Daily Rate</p>
                        <p className="font-semibold">
                          ₹{staff.dailyRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Attendance Summary */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Attendance</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-green-50 rounded">
                          <p className="text-sm font-bold text-green-700">{staff.presentDays}</p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                        <div className="p-2 bg-red-50 rounded">
                          <p className="text-sm font-bold text-red-700">{staff.absentDays}</p>
                          <p className="text-xs text-muted-foreground">Absent</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-sm font-bold text-blue-700">{staff.leaveDays}</p>
                          <p className="text-xs text-muted-foreground">Leave</p>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded">
                          <p className="text-sm font-bold text-yellow-700">{staff.halfDays}</p>
                          <p className="text-xs text-muted-foreground">Half-day</p>
                        </div>
                      </div>
                    </div>

                    {/* Deductions & Advances */}
                    <div className="space-y-2 pb-4 border-b">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Attendance Deductions</p>
                        <p className="font-semibold text-red-600">
                          -₹{(staff.attendanceDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      {staff.advances && staff.advances.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Advances This Month ({staff.advances.length})</p>
                          {staff.advances.map((adv: any) => (
                            <div key={adv.id} className="ml-2 text-xs flex justify-between items-center gap-2">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Badge variant={adv.type === 'extra' ? 'destructive' : 'outline'} className="text-xs px-1 py-0">
                                  {adv.type === 'extra' ? 'Extra' : 'Regular'}
                                </Badge>
                                {adv.reason || 'Advance'} - {format(new Date(adv.date), 'MMM dd')}
                              </span>
                              <span className="text-orange-600 font-medium">₹{adv.amount.toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-4 text-xs">
                          <span>Regular: ₹{(staff.regularAdvances || 0).toLocaleString('en-IN')}</span>
                          <span className="text-red-600">Extra: ₹{(staff.extraAdvances || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <p className="font-semibold text-orange-600">
                          -₹{(staff.totalAdvances || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>

                    {/* Carry Forward & Payments */}
                    <div className="space-y-2 pb-4 border-b">
                      {staff.previousPending > 0 && (
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-blue-600 font-medium">Previous Pending (Carry Forward)</p>
                          <p className="font-semibold text-blue-600">
                            +₹{(staff.previousPending || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Current Month Gross</p>
                        <p className="font-semibold">
                          ₹{(staff.currentMonthGross || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      {staff.paymentsMade > 0 && (
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-purple-600 font-medium">Already Paid This Month</p>
                          <p className="font-semibold text-purple-600">
                            -₹{(staff.paymentsMade || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Final Salary (Highlighted) */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">TOTAL PAYABLE</p>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-400" data-testid={`text-final-salary-${staff.staffId}`}>
                        ₹{(staff.totalPayable || staff.finalSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {staff.previousPending > 0 && `Previous: ₹${(staff.previousPending || 0).toLocaleString('en-IN')} + `}
                        Current: ₹{(staff.currentMonthNet || 0).toLocaleString('en-IN')}
                        {staff.paymentsMade > 0 && ` - Paid: ₹${(staff.paymentsMade || 0).toLocaleString('en-IN')}`}
                      </p>
                      
                      {/* Pay Button */}
                      {staff.totalPayable > 0 && (
                        <Button 
                          onClick={() => openPaymentDialog(staff)}
                          className="w-full mt-4"
                          data-testid={`button-pay-salary-${staff.staffId}`}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Salary
                        </Button>
                      )}
                      {staff.totalPayable <= 0 && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                          <Check className="h-5 w-5" />
                          <span className="font-semibold">Fully Paid</span>
                        </div>
                      )}
                    </div>

                    {/* Payment History */}
                    <Collapsible 
                      open={expandedPaymentHistory === staff.staffId}
                      onOpenChange={(open) => setExpandedPaymentHistory(open ? staff.staffId : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full mt-2" data-testid={`button-history-${staff.staffId}`}>
                          <History className="h-4 w-4 mr-2" />
                          Payment History
                          {expandedPaymentHistory === staff.staffId ? (
                            <ChevronUp className="h-4 w-4 ml-auto" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-auto" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                          {historyLoading ? (
                            <p className="text-sm text-muted-foreground text-center">Loading...</p>
                          ) : paymentHistory.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center">No payment records found</p>
                          ) : (
                            paymentHistory.map((payment: any) => (
                              <div key={payment.id} className="flex justify-between items-center p-2 bg-background rounded border">
                                <div>
                                  <p className="text-sm font-medium">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM dd, yyyy') : 'N/A'}
                                    {payment.paymentMethod && ` • ${payment.paymentMethod.replace('_', ' ')}`}
                                  </p>
                                  {payment.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="bg-green-50 text-green-600">
                                  Paid
                                </Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Salary Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : salaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No staff members found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-semibold">Name</th>
                        <th className="text-left p-3 font-semibold">Job Title</th>
                        <th className="text-right p-3 font-semibold">Base Salary</th>
                        <th className="text-center p-3 font-semibold">Present</th>
                        <th className="text-center p-3 font-semibold">Absent</th>
                        <th className="text-right p-3 font-semibold">Deductions</th>
                        <th className="text-right p-3 font-semibold">Advances</th>
                        <th className="text-right p-3 font-semibold text-green-600">Final Salary</th>
                        <th className="text-center p-3 font-semibold">Status</th>
                        <th className="text-center p-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaries.map((staff: any) => (
                        <tr key={staff.staffId} className="border-b hover-elevate" data-testid={`row-staff-${staff.staffId}`}>
                          <td className="p-3 font-medium">{staff.staffName}</td>
                          <td className="p-3 text-muted-foreground">{staff.jobTitle}</td>
                          <td className="text-right p-3 font-semibold">
                            ₹{staff.baseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="outline" className="bg-green-50">{staff.presentDays}</Badge>
                          </td>
                          <td className="text-center p-3">
                            <Badge variant="destructive">{staff.absentDays}</Badge>
                          </td>
                          <td className="text-right p-3 text-red-600 font-semibold">
                            -₹{staff.attendanceDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-right p-3 text-orange-600 font-semibold">
                            -₹{staff.totalAdvances.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-right p-3 text-green-700 font-bold text-base">
                            ₹{staff.finalSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="text-center p-3">
                            <Badge
                              variant={
                                staff.status === 'paid'
                                  ? 'default'
                                  : staff.status === 'pending'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {staff.status}
                            </Badge>
                          </td>
                          <td className="text-center p-3">
                            {staff.totalPayable > 0 ? (
                              <Button 
                                size="sm"
                                onClick={() => openPaymentDialog(staff)}
                                data-testid={`button-pay-table-${staff.staffId}`}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Pay
                              </Button>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-muted/50 font-bold border-t-2">
                        <td colSpan={2} className="p-3">
                          TOTAL
                        </td>
                        <td className="text-right p-3">
                          ₹{totals.totalBaseSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td colSpan={2} className="text-center p-3">—</td>
                        <td className="text-right p-3 text-red-600">
                          -₹{totals.totalDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-right p-3 text-orange-600">
                          -₹{totals.totalAdvances.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-right p-3 text-green-700 text-base">
                          ₹{totals.totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td />
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
