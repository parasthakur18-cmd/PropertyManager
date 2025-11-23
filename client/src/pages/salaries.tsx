import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

const advanceFormSchema = z.object({
  userId: z.string().min(1, "Staff member is required"),
  amount: z.string().min(1, "Amount is required"),
  advanceDate: z.string().min(1, "Date is required"),
  reason: z.string().optional(),
});

interface SalarySummary {
  id: number;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  grossSalary: number;
  totalAdvances: number;
  pendingSalary: number;
  status: string;
  advancesCount: number;
}

export default function SalariesPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  // Fetch salary summary with pending salary calculation
  const { data: salarySummary = [], isLoading: summaryLoading, refetch } = useQuery<SalarySummary[]>({
    queryKey: ["/api/salaries/summary", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/salaries/summary?startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch salary summary");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const advanceForm = useForm<z.infer<typeof advanceFormSchema>>({
    resolver: zodResolver(advanceFormSchema),
    defaultValues: {
      userId: "",
      amount: "",
      advanceDate: new Date().toISOString().split('T')[0],
      reason: "",
    },
  });

  const createAdvanceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof advanceFormSchema>) => {
      const response = await apiRequest("/api/advances", "POST", {
        userId: data.userId,
        amount: parseFloat(data.amount),
        advanceDate: new Date(data.advanceDate),
        reason: data.reason || undefined,
        repaymentStatus: "pending",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advances"] });
      toast({ title: "Success", description: "Advance recorded successfully" });
      setIsAdvanceDialogOpen(false);
      advanceForm.reset();
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to record advance", 
        variant: "destructive" 
      });
    },
  });

  const handleCreateAdvance = (data: z.infer<typeof advanceFormSchema>) => {
    createAdvanceMutation.mutate(data);
  };

  const totalPendingSalary = salarySummary.reduce((sum, s) => sum + s.pendingSalary, 0);
  const totalGrossSalary = salarySummary.reduce((sum, s) => sum + s.grossSalary, 0);
  const totalAdvances = salarySummary.reduce((sum, s) => sum + s.totalAdvances, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Staff Salary Management
          </h1>
          <p className="text-muted-foreground">
            Track salaries, advances, and pending amounts with date-range filtering
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="summary" data-testid="tab-summary">
              Salary Summary
            </TabsTrigger>
          </TabsList>
          <Button 
            onClick={() => setIsAdvanceDialogOpen(true)}
            data-testid="button-add-advance"
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Advance
          </Button>
        </div>

        <TabsContent value="summary" className="space-y-4">
          {/* Date Range Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Filter by Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="start-date">From Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date">To Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gross Salary</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-gross">
                  ₹{totalGrossSalary.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {salarySummary.length} salary records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Advances</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600" data-testid="text-total-advances-amount">
                  ₹{totalAdvances.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-deducted from salary
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pending Salary</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-total-pending">
                  ₹{totalPendingSalary.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  After advances deducted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff Count</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-staff-count">
                  {salarySummary.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  In selected period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Salary Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Salary Details</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading salary data...
                </div>
              ) : salarySummary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No salary records found for the selected period
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Staff Member</th>
                        <th className="text-left p-3 font-semibold">Period</th>
                        <th className="text-right p-3 font-semibold">Gross Salary</th>
                        <th className="text-right p-3 font-semibold">Total Advances</th>
                        <th className="text-right p-3 font-semibold text-green-600">Pending Salary</th>
                        <th className="text-center p-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salarySummary.map((salary) => (
                        <tr
                          key={salary.id}
                          className="border-b hover-elevate"
                          data-testid={`row-salary-${salary.id}`}
                        >
                          <td className="p-3">{salary.staffName}</td>
                          <td className="p-3 text-muted-foreground">
                            {format(new Date(salary.periodStart), "MMM dd, yyyy")} - {format(new Date(salary.periodEnd), "MMM dd, yyyy")}
                          </td>
                          <td className="text-right p-3 font-semibold">
                            ₹{salary.grossSalary.toLocaleString()}
                          </td>
                          <td className="text-right p-3">
                            <span className="text-orange-600 font-semibold">
                              ₹{salary.totalAdvances.toLocaleString()}
                            </span>
                            {salary.advancesCount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                ({salary.advancesCount} advance{salary.advancesCount > 1 ? 's' : ''})
                              </div>
                            )}
                          </td>
                          <td className="text-right p-3">
                            <span className="text-green-600 font-bold text-base">
                              ₹{salary.pendingSalary.toLocaleString()}
                            </span>
                          </td>
                          <td className="text-center p-3">
                            <Badge
                              variant={
                                salary.status === "paid"
                                  ? "default"
                                  : salary.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                              data-testid={`badge-status-${salary.id}`}
                            >
                              {salary.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Advance Dialog */}
      <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Salary Advance</DialogTitle>
          </DialogHeader>
          <Form {...advanceForm}>
            <form onSubmit={advanceForm.handleSubmit(handleCreateAdvance)} className="space-y-4">
              <FormField
                control={advanceForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-staff">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={advanceForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Amount</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        placeholder="5000" 
                        data-testid="input-advance-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={advanceForm.control}
                name="advanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-advance-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={advanceForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Medical emergency, Personal need" 
                        data-testid="input-reason"
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
                    setIsAdvanceDialogOpen(false);
                    advanceForm.reset();
                  }}
                  data-testid="button-cancel-advance"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createAdvanceMutation.isPending}
                  data-testid="button-submit-advance"
                >
                  {createAdvanceMutation.isPending ? "Recording..." : "Record Advance"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
