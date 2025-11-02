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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { StaffSalary, SalaryAdvance } from "@shared/schema";

const salaryFormSchema = z.object({
  userId: z.string().min(1, "User is required"),
  propertyId: z.number().optional(),
  grossSalary: z.string().min(1, "Gross salary is required"),
  deductions: z.string().optional(),
  netSalary: z.string().min(1, "Net salary is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  status: z.enum(["pending", "paid"]).default("pending"),
  notes: z.string().optional(),
});

export default function SalariesPage() {
  const [activeTab, setActiveTab] = useState("salaries");
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: salaries = [], isLoading: salariesLoading } = useQuery<StaffSalary[]>({
    queryKey: ["/api/salaries"],
  });

  const { data: advances = [], isLoading: advancesLoading } = useQuery<SalaryAdvance[]>({
    queryKey: ["/api/advances"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
  });

  const salaryForm = useForm<z.infer<typeof salaryFormSchema>>({
    resolver: zodResolver(salaryFormSchema),
    defaultValues: {
      userId: "",
      grossSalary: "",
      deductions: "0",
      netSalary: "",
      periodStart: "",
      periodEnd: "",
      status: "pending",
      notes: "",
    },
  });

  const createSalaryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof salaryFormSchema>) => {
      return await apiRequest("POST", "/api/salaries", {
        userId: data.userId,
        propertyId: data.propertyId,
        grossSalary: parseFloat(data.grossSalary),
        deductions: parseFloat(data.deductions || "0"),
        netSalary: parseFloat(data.netSalary),
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        status: data.status,
        notes: data.notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      toast({ title: "Success", description: "Salary record created successfully" });
      setIsSalaryDialogOpen(false);
      salaryForm.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create salary record", 
        variant: "destructive" 
      });
    },
  });

  const handleCreateSalary = (data: z.infer<typeof salaryFormSchema>) => {
    createSalaryMutation.mutate(data);
  };

  const totalSalaryAmount = salaries.reduce(
    (sum, s) => sum + parseFloat(s.netSalary || "0"),
    0
  );

  const pendingSalaries = salaries.filter((s) => s.status === "pending");
  const pendingAdvances = advances.filter((a) => a.repaymentStatus === "pending");
  const totalAdvancesAmount = advances.reduce(
    (sum, a) => sum + parseFloat(a.amount || "0"),
    0
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            HR Salary Management
          </h1>
          <p className="text-muted-foreground">
            Manage staff salaries, advances, and payments
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Salaries</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-salaries">
              ₹{totalSalaryAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {salaries.length} salary records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Salaries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-salaries">
              {pendingSalaries.length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advances</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-advances">
              ₹{totalAdvancesAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {advances.length} advance records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Advances</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-advances">
              {pendingAdvances.length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting repayment</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="salaries" data-testid="tab-salaries">
              Salaries
            </TabsTrigger>
            <TabsTrigger value="advances" data-testid="tab-advances">
              Advances
            </TabsTrigger>
          </TabsList>
          <Button 
            onClick={() => setIsSalaryDialogOpen(true)}
            data-testid="button-add-salary"
          >
            <Plus className="mr-2 h-4 w-4" />
            {activeTab === "salaries" ? "Add Salary" : "Add Advance"}
          </Button>
        </div>

        <TabsContent value="salaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salary Records</CardTitle>
            </CardHeader>
            <CardContent>
              {salariesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading salaries...
                </div>
              ) : salaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No salary records found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Staff Member</th>
                        <th className="text-left p-2">Period</th>
                        <th className="text-right p-2">Gross Salary</th>
                        <th className="text-right p-2">Deductions</th>
                        <th className="text-right p-2">Net Salary</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaries.map((salary) => {
                        const user = users.find((u: any) => u.id === salary.userId);
                        return (
                          <tr
                            key={salary.id}
                            className="border-b hover-elevate"
                            data-testid={`row-salary-${salary.id}`}
                          >
                            <td className="p-2">
                              {user?.fullName || salary.userId}
                            </td>
                            <td className="p-2">
                              {format(new Date(salary.periodStart), "MMM yyyy")}
                            </td>
                            <td className="text-right p-2">
                              ₹{parseFloat(salary.grossSalary).toLocaleString()}
                            </td>
                            <td className="text-right p-2">
                              ₹{parseFloat(salary.deductions).toLocaleString()}
                            </td>
                            <td className="text-right p-2 font-semibold">
                              ₹{parseFloat(salary.netSalary).toLocaleString()}
                            </td>
                            <td className="p-2">
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
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-view-salary-${salary.id}`}
                              >
                                View
                              </Button>
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

        <TabsContent value="advances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salary Advances</CardTitle>
            </CardHeader>
            <CardContent>
              {advancesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading advances...
                </div>
              ) : advances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No advance records found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Staff Member</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-right p-2">Amount</th>
                        <th className="text-left p-2">Reason</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advances.map((advance) => {
                        const user = users.find((u: any) => u.id === advance.userId);
                        return (
                          <tr
                            key={advance.id}
                            className="border-b hover-elevate"
                            data-testid={`row-advance-${advance.id}`}
                          >
                            <td className="p-2">
                              {user?.fullName || advance.userId}
                            </td>
                            <td className="p-2">
                              {format(new Date(advance.advanceDate), "dd MMM yyyy")}
                            </td>
                            <td className="text-right p-2 font-semibold">
                              ₹{parseFloat(advance.amount).toLocaleString()}
                            </td>
                            <td className="p-2">{advance.reason || "-"}</td>
                            <td className="p-2">
                              <Badge
                                variant={
                                  advance.repaymentStatus === "deducted"
                                    ? "default"
                                    : advance.repaymentStatus === "pending"
                                    ? "secondary"
                                    : "destructive"
                                }
                                data-testid={`badge-status-${advance.id}`}
                              >
                                {advance.repaymentStatus}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-view-advance-${advance.id}`}
                              >
                                View
                              </Button>
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
      </Tabs>

      <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Salary Record</DialogTitle>
          </DialogHeader>
          <Form {...salaryForm}>
            <form onSubmit={salaryForm.handleSubmit(handleCreateSalary)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={salaryForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user">
                            <SelectValue placeholder="Select user" />
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
                  control={salaryForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property: any) => (
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
                  control={salaryForm.control}
                  name="grossSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gross Salary</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="50000" 
                          data-testid="input-gross-salary"
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            const gross = parseFloat(e.target.value) || 0;
                            const deductions = parseFloat(salaryForm.getValues("deductions") || "0");
                            salaryForm.setValue("netSalary", (gross - deductions).toString());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={salaryForm.control}
                  name="deductions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deductions</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="5000" 
                          data-testid="input-deductions"
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            const gross = parseFloat(salaryForm.getValues("grossSalary") || "0");
                            const deductions = parseFloat(e.target.value) || 0;
                            salaryForm.setValue("netSalary", (gross - deductions).toString());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={salaryForm.control}
                  name="netSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Net Salary</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="45000" 
                          data-testid="input-net-salary"
                          readOnly
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={salaryForm.control}
                  name="periodStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period Start</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-period-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={salaryForm.control}
                  name="periodEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period End</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-period-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={salaryForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsSalaryDialogOpen(false);
                    salaryForm.reset();
                  }}
                  data-testid="button-cancel-salary"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSalaryMutation.isPending}
                  data-testid="button-submit-salary"
                >
                  {createSalaryMutation.isPending ? "Creating..." : "Create Salary"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
