import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Target, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ExpenseCategory, PropertyExpense } from "@shared/schema";

interface BudgetAlert {
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  status: "normal" | "warning" | "critical";
}

const budgetFormSchema = z.object({
  categoryId: z.number().min(1),
  budgetAmount: z.coerce.number().min(1),
  period: z.enum(["monthly", "quarterly", "yearly"]),
});

export function BudgetPlanning({
  expenses,
  categories,
  propertyId,
}: {
  expenses: PropertyExpense[];
  categories: ExpenseCategory[];
  propertyId: number | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({ resolver: zodResolver(budgetFormSchema), defaultValues: { period: "monthly" } });

  // Analyze budget vs spending
  const budgetAlerts: BudgetAlert[] = categories.map((cat) => {
    const categoryExpenses = expenses.filter((e) => e.categoryId === cat.id);
    const spentAmount = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    // Mock budget for demo - in real app, fetch from database
    const budgetAmount = spentAmount * 1.2; // Budget is 120% of average spending
    const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
    
    let status: "normal" | "warning" | "critical" = "normal";
    if (percentage >= 90) status = "critical";
    else if (percentage >= 70) status = "warning";

    return { categoryName: cat.name, budgetAmount, spentAmount, percentage, status };
  }).filter(b => b.spentAmount > 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "text-destructive";
      case "warning": return "text-amber-600";
      default: return "text-green-600";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "critical": return "bg-red-100";
      case "warning": return "bg-amber-100";
      default: return "bg-green-100";
    }
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
                <Button size="sm">Set Budget</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Category Budget</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form className="space-y-4">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full border rounded px-3 py-2">
                              <option value="">Select Category</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                          </FormControl>
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
                            <Input {...field} type="number" placeholder="50000" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="button" className="w-full" onClick={() => setIsOpen(false)}>Save Budget</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">Set spending limits for each expense category and get alerts</p>

          {budgetAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add expenses to see budget status</p>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetAlerts.map((alert, idx) => (
                <div key={idx} className={`p-4 border rounded-lg ${getStatusBg(alert.status)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className={`font-semibold ${getStatusColor(alert.status)}`}>{alert.categoryName}</h3>
                      <p className="text-sm text-muted-foreground">
                        ₹{alert.spentAmount.toLocaleString()} / ₹{alert.budgetAmount.toLocaleString()}
                      </p>
                    </div>
                    <Badge className={alert.status === "critical" ? "bg-destructive" : alert.status === "warning" ? "bg-amber-600" : "bg-green-600"}>
                      {alert.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(alert.percentage, 100)} className="h-2" />
                  
                  {alert.status !== "normal" && (
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      <span>
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
