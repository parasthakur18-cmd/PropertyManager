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
import { insertPropertyExpenseSchema, type PropertyExpense, type Property } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Receipt, Zap, ShoppingCart, Users, Wrench, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const expenseFormSchema = insertPropertyExpenseSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  propertyId: z.number().min(1, "Property is required"),
  expenseDate: z.string().min(1, "Date is required"),
  category: z.string().min(1, "Category is required"),
});

const EXPENSE_CATEGORIES = [
  { value: "electricity", label: "Electricity", icon: Zap },
  { value: "grocery", label: "Grocery", icon: ShoppingCart },
  { value: "salary", label: "Salary", icon: Users },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
  { value: "supplies", label: "Supplies", icon: Receipt },
  { value: "other", label: "Other", icon: FileText },
];

export default function Expenses() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: expenses = [], isLoading } = useQuery<PropertyExpense[]>({
    queryKey: ["/api/expenses", selectedProperty],
    queryFn: async () => {
      const url = selectedProperty 
        ? `/api/expenses?propertyId=${selectedProperty}`
        : "/api/expenses";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
  });

  const expenseForm = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      propertyId: 0,
      category: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      description: "",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseFormSchema>) => {
      const response = await apiRequest("POST", "/api/expenses", {
        ...data,
        amount: data.amount,
        expenseDate: new Date(data.expenseDate),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsDialogOpen(false);
      expenseForm.reset({
        propertyId: 0,
        category: "",
        amount: "",
        expenseDate: new Date().toISOString().split("T")[0],
        description: "",
      });
      toast({
        title: "Expense recorded",
        description: "Property expense has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record expense",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Expense deleted",
        description: "The expense has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const handleCreateExpense = (data: z.infer<typeof expenseFormSchema>) => {
    createExpenseMutation.mutate(data);
  };

  const getPropertyName = (propertyId: number) => {
    return properties.find(p => p.id === propertyId)?.name || "Unknown";
  };

  const getCategoryIcon = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : Receipt;
  };

  const getCategoryLabel = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => {
    const categoryExpenses = expenses.filter(e => e.category === cat.value);
    const total = categoryExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    return {
      ...cat,
      total,
      count: categoryExpenses.length,
    };
  }).filter(cat => cat.count > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Property Expenses</h1>
            <p className="text-muted-foreground mt-1">Track and manage property operating expenses</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-expense">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
              </DialogHeader>
              <Form {...expenseForm}>
                <form onSubmit={expenseForm.handleSubmit(handleCreateExpense)} className="space-y-4">
                  <FormField
                    control={expenseForm.control}
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
                    control={expenseForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={expenseForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="5000"
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={expenseForm.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-expense-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={expenseForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Optional description" data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createExpenseMutation.isPending} data-testid="button-submit">
                      {createExpenseMutation.isPending ? "Recording..." : "Record Expense"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedProperty === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedProperty(null)}
            data-testid="button-filter-all"
          >
            All Properties
          </Button>
          {properties.map((property) => (
            <Button
              key={property.id}
              variant={selectedProperty === property.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedProperty(property.id)}
              data-testid={`button-filter-property-${property.id}`}
            >
              {property.name}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-total-expenses">
                ₹{totalExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {expensesByCategory.slice(0, 3).map((cat) => {
            const Icon = cat.icon;
            return (
              <Card key={cat.value}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{cat.label}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono" data-testid={`text-category-${cat.value}`}>
                    ₹{cat.total.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{cat.count} expenses</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {expenses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No expenses recorded</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start tracking your property expenses
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenses.slice(0, 20).map((expense) => {
                  const Icon = getCategoryIcon(expense.category);
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                      data-testid={`expense-item-${expense.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-muted rounded-md">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getCategoryLabel(expense.category)}</span>
                            <Badge variant="outline" className="text-xs">
                              {getPropertyName(expense.propertyId)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {expense.description || "No description"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold" data-testid={`text-expense-amount-${expense.id}`}>
                          ₹{parseFloat(expense.amount).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExpenseMutation.mutate(expense.id)}
                          data-testid={`button-delete-${expense.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
