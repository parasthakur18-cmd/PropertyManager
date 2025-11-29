import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ExpenseCategory, PropertyExpense } from "@shared/schema";

interface BudgetAlert {
  categoryName: string;
  categoryId: number;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  status: "normal" | "warning" | "critical";
}

const budgetFormSchema = z.object({
  categoryId: z.coerce.number().min(1),
  budgetAmount: z.coerce.number().min(1),
  period: z.enum(["monthly", "quarterly", "yearly"]),
});

export function BudgetPlanning({
  expenses,
  categories,
}: {
  expenses: PropertyExpense[];
  categories: ExpenseCategory[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({ 
    resolver: zodResolver(budgetFormSchema), 
    defaultValues: { period: "monthly", budgetAmount: 0, categoryId: 0 } 
  });

  // Analyze budget vs spending
  const budgetAlerts: BudgetAlert[] = categories.map((cat) => {
    const categoryExpenses = expenses.filter((e) => e.categoryId === cat.id);
    const spentAmount = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    
    // Mock budget for demo (120% of average spending)
    const budgetAmount = spentAmount > 0 ? spentAmount * 1.2 : 50000;
    const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
    
    let status: "normal" | "warning" | "critical" = "normal";
    if (percentage >= 90) status = "critical";
    else if (percentage >= 70) status = "warning";

    return { 
      categoryName: cat.name, 
      categoryId: cat.id,
      budgetAmount, 
      spentAmount, 
      percentage, 
      status 
    };
  }).filter(b => b.spentAmount > 0).sort((a, b) => b.percentage - a.percentage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "text-destructive";
      case "warning": return "text-amber-600";
      default: return "text-green-600";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "critical": return "bg-red-50";
      case "warning": return "bg-amber-50";
      default: return "bg-green-50";
    }
  };

  const handleSaveBudget = async (data: any) => {
    // In real implementation, save to backend via API
    console.log("Budget to save:", data);
    setIsOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Budget Planning & Alerts
            </CardTitle>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-set-budget">Set Budget</Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-budget-form">
                <DialogHeader>
                  <DialogTitle>Set Category Budget</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSaveBudget)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select value={field.value?.toString() || ""} onValueChange={(val) => field.onChange(parseInt(val))}>
                            <FormControl>
                              <SelectTrigger data-testid="select-budget-category">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id.toString()} data-testid={`option-${cat.id}`}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budgetAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Budget (₹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="50000" data-testid="input-budget-amount" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="period"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-budget-period">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" data-testid="button-save-budget">Save Budget</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">Set spending limits for each expense category and get alerts when approaching limits</p>

          {budgetAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add expenses to see budget status</p>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetAlerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 border rounded-lg ${getStatusBg(alert.status)}`}
                  data-testid={`budget-alert-${alert.categoryId}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className={`font-semibold ${getStatusColor(alert.status)}`}>{alert.categoryName}</h3>
                      <p className="text-sm text-muted-foreground">
                        ₹{alert.spentAmount.toLocaleString()} / ₹{alert.budgetAmount.toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      className={
                        alert.status === "critical" 
                          ? "bg-destructive" 
                          : alert.status === "warning" 
                            ? "bg-amber-600" 
                            : "bg-green-600"
                      }
                      data-testid={`badge-budget-${alert.categoryId}`}
                    >
                      {alert.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(alert.percentage, 100)} className="h-2" />
                  
                  {alert.status !== "normal" && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      <span data-testid={`alert-message-${alert.categoryId}`}>
                        {alert.status === "critical" 
                          ? "Budget limit reached! Review expenses." 
                          : "Approaching budget limit. Monitor spending."}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Set budgets 10-20% above average spending for flexibility</li>
            <li>✓ Review budgets monthly to adjust for seasonal changes</li>
            <li>✓ Yellow alert at 70% helps catch overspending early</li>
            <li>✓ Red alert at 90% indicates critical budget breach</li>
            <li>✓ Compare YTD spending vs budget to track performance</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
