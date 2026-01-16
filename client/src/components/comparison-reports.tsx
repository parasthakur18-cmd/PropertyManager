import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format, subMonths, subYears } from "date-fns";

export function ComparisonReports({ expenses }: { expenses: any[] }) {
  // Calculate month-over-month comparison
  const getMonthComparison = () => {
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const previousMonth = format(subMonths(now, 1), "yyyy-MM");

    const currentExpenses = expenses.filter(e => format(new Date(e.expenseDate), "yyyy-MM") === currentMonth);
    const previousExpenses = expenses.filter(e => format(new Date(e.expenseDate), "yyyy-MM") === previousMonth);

    const currentTotal = currentExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const previousTotal = previousExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const change = currentTotal - previousTotal;
    const changePercent = previousTotal > 0 ? (change / previousTotal) * 100 : 0;

    return {
      currentMonth: format(now, "MMMM"),
      previousMonth: format(subMonths(now, 1), "MMMM"),
      currentTotal,
      previousTotal,
      change,
      changePercent,
    };
  };

  // Calculate year-over-year comparison
  const getYearComparison = () => {
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const lastYearMonth = format(subYears(now, 1), "yyyy-MM");

    const currentExpenses = expenses.filter(e => format(new Date(e.expenseDate), "yyyy-MM") === currentMonth);
    const lastYearExpenses = expenses.filter(e => format(new Date(e.expenseDate), "yyyy-MM") === lastYearMonth);

    const currentTotal = currentExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const lastYearTotal = lastYearExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const change = currentTotal - lastYearTotal;
    const changePercent = lastYearTotal > 0 ? (change / lastYearTotal) * 100 : 0;

    return {
      currentMonth: format(now, "MMMM yyyy"),
      lastYearMonth: format(subYears(now, 1), "MMMM yyyy"),
      currentTotal,
      lastYearTotal,
      change,
      changePercent,
    };
  };

  // Get last 12 months comparison
  const getLast12MonthsComparison = () => {
    const data = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, "yyyy-MM");
      const monthExpenses = expenses.filter(e => format(new Date(e.expenseDate), "yyyy-MM") === monthKey);
      const total = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      data.push({
        month: format(date, "MMM"),
        expenses: total,
        count: monthExpenses.length,
      });
    }

    return data;
  };

  // Compare top categories month-over-month
  const getCategoryComparison = () => {
    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const previousMonth = format(subMonths(now, 1), "yyyy-MM");

    const categoryMap: Record<number, { current: number; previous: number }> = {};

    // Current month
    expenses
      .filter(e => format(new Date(e.expenseDate), "yyyy-MM") === currentMonth)
      .forEach(e => {
        if (!categoryMap[e.categoryId]) categoryMap[e.categoryId] = { current: 0, previous: 0 };
        categoryMap[e.categoryId].current += parseFloat(e.amount || 0);
      });

    // Previous month
    expenses
      .filter(e => format(new Date(e.expenseDate), "yyyy-MM") === previousMonth)
      .forEach(e => {
        if (!categoryMap[e.categoryId]) categoryMap[e.categoryId] = { current: 0, previous: 0 };
        categoryMap[e.categoryId].previous += parseFloat(e.amount || 0);
      });

    return Object.entries(categoryMap)
      .map(([catId, data]) => {
        const change = data.current - data.previous;
        const changePercent = data.previous > 0 ? (change / data.previous) * 100 : 0;
        return {
          categoryId: parseInt(catId),
          current: data.current,
          previous: data.previous,
          change,
          changePercent,
        };
      })
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 5);
  };

  const momComparison = getMonthComparison();
  const yoyComparison = getYearComparison();
  const last12Months = getLast12MonthsComparison();
  const categoryComparison = getCategoryComparison();

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-destructive";
    if (change < 0) return "text-green-600";
    return "text-muted-foreground";
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 text-center">
          <p className="text-muted-foreground">Add expenses to see comparisons</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month-over-Month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Month-over-Month Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">{momComparison.currentMonth}</p>
              <p className="text-2xl font-bold">₹{momComparison.currentTotal.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{momComparison.previousMonth}</p>
              <p className="text-2xl font-bold">₹{momComparison.previousTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className={`p-3 border rounded-lg ${getChangeColor(momComparison.change) === "text-destructive" ? "bg-red-50" : "bg-green-50"}`}>
            <p className={`font-semibold ${getChangeColor(momComparison.change)}`}>
              {momComparison.change > 0 ? "↑" : momComparison.change < 0 ? "↓" : "→"} 
              {" "}
              {Math.abs(momComparison.changePercent).toFixed(1)}% 
              {" "}
              {momComparison.change > 0 ? "increase" : momComparison.change < 0 ? "decrease" : "no change"}
            </p>
            <p className="text-sm text-muted-foreground">
              Difference: ₹{Math.abs(momComparison.change).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Year-over-Year */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Year-over-Year Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">{yoyComparison.currentMonth}</p>
              <p className="text-2xl font-bold">₹{yoyComparison.currentTotal.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{yoyComparison.lastYearMonth}</p>
              <p className="text-2xl font-bold">₹{yoyComparison.lastYearTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className={`p-3 border rounded-lg ${getChangeColor(yoyComparison.change) === "text-destructive" ? "bg-red-50" : "bg-green-50"}`}>
            <p className={`font-semibold ${getChangeColor(yoyComparison.change)}`}>
              {yoyComparison.change > 0 ? "↑" : yoyComparison.change < 0 ? "↓" : "→"} 
              {" "}
              {Math.abs(yoyComparison.changePercent).toFixed(1)}% 
              {" "}
              {yoyComparison.change > 0 ? "increase" : yoyComparison.change < 0 ? "decrease" : "no change"}
            </p>
            <p className="text-sm text-muted-foreground">
              Difference: ₹{Math.abs(yoyComparison.change).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 12-Month Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 12 Months Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={last12Months}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `₹${value?.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="expenses" fill="#8884d8" name="Monthly Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Comparison */}
      {categoryComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Changes (MoM)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryComparison.map((cat, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Category {cat.categoryId}</span>
                    <Badge 
                      className={cat.change > 0 ? "bg-destructive" : cat.change < 0 ? "bg-green-600" : "bg-muted"}
                    >
                      {cat.change > 0 ? "↑" : cat.change < 0 ? "↓" : "→"} {Math.abs(cat.changePercent).toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current: ₹{cat.current.toLocaleString()} | Previous: ₹{cat.previous.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparison Report Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Use MoM to track monthly trends and identify patterns</li>
            <li>✓ Compare with previous year to account for seasonality</li>
            <li>✓ Monitor category changes to identify cost drivers</li>
            <li>✓ Red trends (increases) warrant investigation and action</li>
            <li>✓ Green trends (decreases) indicate successful cost management</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
