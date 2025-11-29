import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertyExpenseSchema, insertExpenseCategorySchema, type PropertyExpense, type Property, type ExpenseCategory } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Receipt, Settings, Trash2, Pencil, BarChart3, Lightbulb, Target, Zap, TrendingUp, AlertTriangle, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseTrends } from "@/components/expense-trends";
import { ExpenseInsights } from "@/components/expense-insights";
import { BudgetPlanning } from "@/components/budget-planning";
import { CostEfficiency } from "@/components/cost-efficiency";
import { SmartForecasting } from "@/components/smart-forecasting";
import { ComparisonReports } from "@/components/comparison-reports";
import { SavingsGoalTracker } from "@/components/savings-goal-tracker";
import { AnomalyDetection } from "@/components/anomaly-detection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const expenseFormSchema = insertPropertyExpenseSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  propertyId: z.number().min(1, "Property is required"),
  expenseDate: z.string().min(1, "Date is required"),
  categoryId: z.number().min(1, "Category is required"),
});

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  keywords: z.string().optional(),
  propertyId: z.number().nullable(),
  isDefault: z.boolean(),
});

export default function Expenses() {
  const { toast } = useToast();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "insights" | "budget" | "efficiency" | "forecast" | "comparison" | "savings" | "anomalies">("overview");

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expense-categories"],
  });

  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ["/api/rooms"],
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
      categoryId: 0,
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      description: "",
    },
  });

  const categoryForm = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      keywords: "",
      propertyId: null,
      isDefault: false,
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseFormSchema>) => {
      const response = await apiRequest("/api/expenses", "POST", {
        ...data,
        amount: data.amount,
        expenseDate: data.expenseDate,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/expenses" 
      });
      setIsExpenseDialogOpen(false);
      expenseForm.reset({
        propertyId: 0,
        categoryId: 0,
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
      await apiRequest(`/api/expenses/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/expenses" 
      });
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

  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categoryFormSchema>) => {
      const keywordsArray = data.keywords 
        ? data.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : [];
      
      const response = await apiRequest("/api/expense-categories", "POST", {
        name: data.name,
        description: data.description || null,
        keywords: keywordsArray,
        propertyId: data.propertyId,
        isDefault: false,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: "Category created",
        description: "New expense category has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof categoryFormSchema> }) => {
      const keywordsArray = data.keywords 
        ? data.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : [];
      
      const response = await apiRequest(`/api/expense-categories/${id}`, "PATCH", {
        name: data.name,
        description: data.description || null,
        keywords: keywordsArray,
        propertyId: data.propertyId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: "Category updated",
        description: "Expense category has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/expense-categories/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      toast({
        title: "Category deleted",
        description: "Expense category has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const handleCreateExpense = (data: z.infer<typeof expenseFormSchema>) => {
    createExpenseMutation.mutate(data);
  };

  const handleSaveCategory = (data: z.infer<typeof categoryFormSchema>) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      keywords: category.keywords?.join(', ') || "",
      propertyId: category.propertyId || null,
      isDefault: category.isDefault,
    });
    setIsCategoryDialogOpen(true);
  };

  const handleAddNewCategory = () => {
    setEditingCategory(null);
    categoryForm.reset({
      name: "",
      description: "",
      keywords: "",
      propertyId: null,
      isDefault: false,
    });
    setIsCategoryDialogOpen(true);
  };

  const getPropertyName = (propertyId: number) => {
    return properties.find(p => p.id === propertyId)?.name || "Unknown";
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Uncategorized";
    return categories.find(c => c.id === categoryId)?.name || "Unknown";
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  const expensesByCategory = categories.map(cat => {
    const categoryExpenses = expenses.filter(e => e.categoryId === cat.id);
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Property Expenses</h1>
            <p className="text-muted-foreground mt-1">Track and manage property operating expenses</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleAddNewCategory} data-testid="button-manage-categories">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Categories
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] flex flex-col" data-testid="dialog-category-form">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Edit Category" : "Create New Category"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory 
                      ? "Update the expense category details" 
                      : "Create a custom expense category for better organization"}
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1">
                <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit(handleSaveCategory)} className="space-y-4">
                    <FormField
                      control={categoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Insurance, Taxes, etc." data-testid="input-category-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={categoryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="Brief description" data-testid="input-category-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={categoryForm.control}
                      name="keywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Keywords (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""} 
                              placeholder="Enter comma-separated keywords for auto-categorization, e.g., insurance, policy, premium" 
                              data-testid="input-category-keywords"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            These keywords will help automatically categorize bank transactions in the future
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCategoryDialogOpen(false);
                          setEditingCategory(null);
                        }}
                        data-testid="button-cancel-category"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                        data-testid="button-save-category"
                      >
                        {(createCategoryMutation.isPending || updateCategoryMutation.isPending) 
                          ? "Saving..." 
                          : editingCategory ? "Update Category" : "Create Category"}
                      </Button>
                    </div>
                  </form>
                </Form>

                  {categories.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                      <h3 className="text-sm font-medium mb-3">Existing Categories</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {categoriesLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                          </div>
                        ) : (
                          categories.map((cat) => (
                            <div
                              key={cat.id}
                              className="flex items-center justify-between p-2 border rounded-md hover-elevate"
                              data-testid={`category-item-${cat.id}`}
                            >
                              <div>
                                <div className="font-medium">{cat.name}</div>
                                {cat.description && (
                                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                                )}
                                {cat.isDefault && (
                                  <Badge variant="secondary" className="text-xs mt-1">Default</Badge>
                                )}
                              </div>
                              {!cat.isDefault && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCategory(cat)}
                                    data-testid={`button-edit-${cat.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteCategoryMutation.mutate(cat.id)}
                                    data-testid={`button-delete-${cat.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-expense">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-expense-form">
                <DialogHeader>
                  <DialogTitle>Record Expense</DialogTitle>
                  <DialogDescription>
                    Add a new property expense to your tracking
                  </DialogDescription>
                </DialogHeader>
                <Form {...expenseForm}>
                  <form onSubmit={expenseForm.handleSubmit(handleCreateExpense)} className="space-y-4">
                    <FormField
                      control={expenseForm.control}
                      name="propertyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-property">
                                <SelectValue placeholder="Select a property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {properties.map((prop) => (
                                <SelectItem key={prop.id} value={prop.id.toString()}>
                                  {prop.name}
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
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select a category" />
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

                    <FormField
                      control={expenseForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-amount" />
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
                            <Input {...field} type="date" data-testid="input-date" />
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
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} placeholder="Add notes about this expense" data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsExpenseDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createExpenseMutation.isPending}
                        data-testid="button-submit"
                      >
                        {createExpenseMutation.isPending ? "Recording..." : "Record Expense"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedProperty === null ? "default" : "outline"}
              onClick={() => setSelectedProperty(null)}
              data-testid="button-all-properties"
            >
              All Properties
            </Button>
            {properties.map((prop) => (
              <Button
                key={prop.id}
                variant={selectedProperty === prop.id ? "default" : "outline"}
                onClick={() => setSelectedProperty(prop.id)}
                data-testid={`button-property-${prop.id}`}
              >
                {prop.name}
              </Button>
            ))}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-9 min-w-full">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-1 text-xs">
                <BarChart3 className="w-3 h-3" />
                <span className="hidden sm:inline">Trends</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-1 text-xs">
                <Lightbulb className="w-3 h-3" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
              <TabsTrigger value="efficiency" className="flex items-center gap-1 text-xs">
                <Zap className="w-3 h-3" />
                <span className="hidden sm:inline">Efficiency</span>
              </TabsTrigger>
              <TabsTrigger value="forecast" className="flex items-center gap-1 text-xs">
                <TrendingUp className="w-3 h-3" />
                <span className="hidden sm:inline">Forecast</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs">
                <span className="hidden sm:inline">Compare</span>
                <span className="sm:hidden">Cmp</span>
              </TabsTrigger>
              <TabsTrigger value="savings" className="flex items-center gap-1 text-xs">
                <Award className="w-3 h-3" />
                <span className="hidden sm:inline">Savings</span>
              </TabsTrigger>
              <TabsTrigger value="anomalies" className="flex items-center gap-1 text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden sm:inline">Anomalies</span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="flex items-center gap-1 text-xs">
                <Target className="w-3 h-3" />
                <span className="hidden sm:inline">Budget</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {totalExpenses > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Expense Summary</span>
                    <span className="text-2xl" data-testid="text-total-expenses">₹{totalExpenses.toLocaleString()}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {expensesByCategory.map((cat) => (
                      <div
                        key={cat.id}
                        className="p-3 border rounded-lg"
                        data-testid={`expense-summary-${cat.id}`}
                      >
                        <p className="text-sm font-medium">{cat.name}</p>
                        <p className="text-lg font-semibold" data-testid={`text-category-total-${cat.id}`}>
                          ₹{cat.total.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cat.count} transaction{cat.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {expenses.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenses.slice().reverse().map((expense) => (
                      <div
                        key={expense.id}
                        className="p-3 border rounded-lg"
                        data-testid={`expense-item-${expense.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-muted rounded-md shrink-0">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{getCategoryName(expense.categoryId)}</span>
                              <Badge variant="outline" className="text-xs">
                                {getPropertyName(expense.propertyId)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {expense.description || "No description"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(expense.expenseDate), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t">
                          <span className="font-mono font-semibold text-base" data-testid={`text-expense-amount-${expense.id}`}>
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
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-8 text-center">
                  <p className="text-muted-foreground">No expenses recorded yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <ExpenseTrends expenses={expenses} />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <ExpenseInsights expenses={expenses} categories={categories} />
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-6">
            <CostEfficiency expenses={expenses} bookings={bookings} rooms={rooms} />
          </TabsContent>

          <TabsContent value="forecast" className="space-y-6">
            <SmartForecasting expenses={expenses} />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <ComparisonReports expenses={expenses} />
          </TabsContent>

          <TabsContent value="savings" className="space-y-6">
            <SavingsGoalTracker expenses={expenses} />
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-6">
            <AnomalyDetection expenses={expenses} />
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <BudgetPlanning expenses={expenses} categories={categories} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
