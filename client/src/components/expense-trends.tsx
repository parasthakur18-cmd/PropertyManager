import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface ExpenseTrend {
  month: string;
  monthLabel: string;
  total: number;
  categories: Record<string, number>;
}

interface CategoryTrend {
  name: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export function ExpenseTrends({ expenses }: { expenses: any[] }) {
  // Calculate monthly trends
  const getMonthlyData = () => {
    const monthlyData: Record<string, ExpenseTrend> = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM");
      monthlyData[monthKey] = {
        month: monthKey,
        monthLabel,
        total: 0,
        categories: {},
      };
    }

    // Fill in expense data
    expenses.forEach((exp) => {
      const expDate = new Date(exp.expenseDate);
      const monthKey = format(expDate, "yyyy-MM");
      if (monthlyData[monthKey]) {
        const amount = parseFloat(exp.amount);
        monthlyData[monthKey].total += amount;
        monthlyData[monthKey].categories[exp.categoryId] =
          (monthlyData[monthKey].categories[exp.categoryId] || 0) + amount;
      }
    });

    return Object.values(monthlyData);
  };

  // Calculate category trends
  const getCategoryTrends = (data: ExpenseTrend[]): CategoryTrend[] => {
    const categories: Record<string, { current: number; previous: number }> = {};
    const currentMonth = data[data.length - 1];
    const previousMonth = data[data.length - 2];

    // Current month categories
    Object.entries(currentMonth.categories).forEach(([catId, amount]) => {
      if (!categories[catId]) categories[catId] = { current: 0, previous: 0 };
      categories[catId].current = amount as number;
    });

    // Previous month categories
    if (previousMonth) {
      Object.entries(previousMonth.categories).forEach(([catId, amount]) => {
        if (!categories[catId]) categories[catId] = { current: 0, previous: 0 };
        categories[catId].previous = amount as number;
      });
    }

    return Object.entries(categories).map(([catId, data]) => {
      const change = data.current - data.previous;
      const changePercent = data.previous > 0 ? (change / data.previous) * 100 : 0;
      return {
        name: `Category ${catId}`,
        current: data.current,
        previous: data.previous,
        change,
        changePercent,
      };
    });
  };

  const monthlyData = getMonthlyData();
  const categoryTrends = getCategoryTrends(monthlyData);

  // Get high-alert categories (>20% increase)
  const highAlerts = categoryTrends.filter((cat) => cat.changePercent > 20);

  // Calculate total MoM change
  const currentMonthTotal = monthlyData[monthlyData.length - 1].total;
  const previousMonthTotal = monthlyData[monthlyData.length - 2]?.total || 0;
  const totalChange = currentMonthTotal - previousMonthTotal;
  const totalChangePercent = previousMonthTotal > 0 ? (totalChange / previousMonthTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* MoM Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Month-over-Month Comparison
            {totalChangePercent > 0 ? (
              <TrendingUp className="w-5 h-5 text-destructive" />
            ) : (
              <TrendingDown className="w-5 h-5 text-green-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Month Total</p>
              <p className="text-2xl font-bold">₹{currentMonthTotal.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Previous Month Total</p>
              <p className="text-2xl font-bold">₹{previousMonthTotal.toLocaleString()}</p>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Month Change</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">
                  {totalChangePercent > 0 ? "+" : ""}
                  {totalChangePercent.toFixed(1)}%
                </span>
                <span className={`font-mono ${totalChangePercent > 0 ? "text-destructive" : "text-green-600"}`}>
                  ₹{Math.abs(totalChange).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6-Month Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>6-Month Expense Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" />
              <YAxis />
              <Tooltip
                formatter={(value) => `₹${(value as number).toLocaleString()}`}
                contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none", borderRadius: "6px" }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: "#3b82f6" }}
                name="Total Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alerts for High Increases */}
      {highAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              High Expense Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highAlerts.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{cat.previous.toLocaleString()} → ₹{cat.current.toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    +{cat.changePercent.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Comparison (This Month vs Last Month)</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={categoryTrends.map((cat) => ({
                  name: `Cat ${cat.name.split(" ")[1]}`,
                  "This Month": cat.current,
                  "Last Month": cat.previous,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `₹${(value as number).toLocaleString()}`}
                  contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "none", borderRadius: "6px" }}
                />
                <Legend />
                <Bar dataKey="This Month" fill="#3b82f6" />
                <Bar dataKey="Last Month" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No category data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
