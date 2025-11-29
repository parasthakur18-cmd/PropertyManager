import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Target, TrendingDown, CheckCircle2, AlertCircle } from "lucide-react";

const goalFormSchema = z.object({
  category: z.enum(["reduction", "efficiency", "optimization"]),
  targetReduction: z.coerce.number().min(1),
  timeframe: z.enum(["monthly", "quarterly", "yearly"]),
  description: z.string().optional(),
});

interface SavingsGoal {
  id: string;
  category: string;
  targetReduction: number;
  actualReduction: number;
  timeframe: string;
  startDate: Date;
  progress: number;
  status: "on-track" | "exceeded" | "behind";
  description?: string;
}

export function SavingsGoalTracker({ expenses }: { expenses: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [goals, setGoals] = useState<SavingsGoal[]>([
    {
      id: "1",
      category: "reduction",
      targetReduction: 5000,
      actualReduction: 3200,
      timeframe: "monthly",
      startDate: new Date(),
      progress: 64,
      status: "on-track",
      description: "Reduce utilities and maintenance costs",
    },
  ]);

  const form = useForm({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      category: "reduction",
      targetReduction: 0,
      timeframe: "monthly",
      description: "",
    },
  });

  const handleAddGoal = (data: z.infer<typeof goalFormSchema>) => {
    const newGoal: SavingsGoal = {
      id: Date.now().toString(),
      ...data,
      actualReduction: 0,
      startDate: new Date(),
      progress: 0,
      status: "on-track",
    };
    setGoals([...goals, newGoal]);
    setIsOpen(false);
    form.reset();
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  // Calculate total savings achieved
  const totalSavings = goals.reduce((sum, g) => sum + g.actualReduction, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetReduction, 0);
  const overallProgress = totalTarget > 0 ? (totalSavings / totalTarget) * 100 : 0;

  // Calculate month-over-month savings
  const calculateMoMSavings = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const previousMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;

    const currentExpenses = expenses.filter(e => {
      const expDate = new Date(e.expenseDate);
      return `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, "0")}` === currentMonth;
    }).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const previousExpenses = expenses.filter(e => {
      const expDate = new Date(e.expenseDate);
      return `${expDate.getFullYear()}-${String(expDate.getMonth()).padStart(2, "0")}` === previousMonth;
    }).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    return previousExpenses - currentExpenses;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "exceeded": return "text-green-600";
      case "on-track": return "text-blue-600";
      case "behind": return "text-amber-600";
      default: return "text-muted-foreground";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "exceeded": return "bg-green-50";
      case "on-track": return "bg-blue-50";
      case "behind": return "bg-amber-50";
      default: return "bg-muted";
    }
  };

  const momSavings = calculateMoMSavings();

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Savings Achieved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSavings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Target: ₹{totalTarget.toLocaleString()}</p>
            <Progress value={Math.min(overallProgress, 100)} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Month-over-Month Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${momSavings > 0 ? "text-green-600" : "text-muted-foreground"}`}>
              {momSavings > 0 ? "+" : ""}₹{momSavings.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {momSavings > 0 ? "Great work! Expenses decreased." : "Expenses increased vs last month."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Cost Reduction Goals</CardTitle>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-goal">Add Goal</Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-goal-form">
                <DialogHeader>
                  <DialogTitle>Create Savings Goal</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data: any) => handleAddGoal(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Goal Category</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-goal-category">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="reduction">Cost Reduction</SelectItem>
                              <SelectItem value="efficiency">Efficiency Improvement</SelectItem>
                              <SelectItem value="optimization">Process Optimization</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetReduction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Amount (₹)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="5000" data-testid="input-target-reduction" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timeframe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeframe</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-goal-timeframe">
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
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Reduce utilities by 10%" data-testid="input-goal-description" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" data-testid="button-save-goal">Create Goal</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals yet. Create one to start tracking savings!</p>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`p-4 border rounded-lg ${getStatusBg(goal.status)}`}
                  data-testid={`goal-${goal.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold capitalize">{goal.category.replace("-", " ")}</h3>
                      {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Timeframe: {goal.timeframe}</p>
                    </div>
                    <Badge className={
                      goal.status === "exceeded" ? "bg-green-600" :
                      goal.status === "on-track" ? "bg-blue-600" :
                      "bg-amber-600"
                    }>
                      {goal.progress}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(goal.progress, 100)} className="h-2 mb-2" />
                  <p className={`text-xs font-medium ${getStatusColor(goal.status)}`}>
                    ₹{goal.actualReduction.toLocaleString()} / ₹{goal.targetReduction.toLocaleString()}
                    {" "}
                    {goal.status === "exceeded" && "- Exceeded! 🎉"}
                    {goal.status === "on-track" && "- On track"}
                    {goal.status === "behind" && "- Behind schedule"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="mt-2 w-full"
                    data-testid={`button-delete-goal-${goal.id}`}
                  >
                    Remove Goal
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goal Setting Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Set SMART goals: Specific, Measurable, Achievable, Relevant, Time-bound</li>
            <li>✓ Start with 5-10% reduction targets for achievable goals</li>
            <li>✓ Focus on top 3 expense categories for maximum impact</li>
            <li>✓ Review goals monthly and adjust based on actual results</li>
            <li>✓ Celebrate wins when goals are exceeded!</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
