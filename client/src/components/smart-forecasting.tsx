import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";

interface ForecastData {
  month: string;
  actual: number;
  forecast: number;
  category: string;
}

export function SmartForecasting({ expenses }: { expenses: any[] }) {
  // Calculate monthly averages for last 3 months
  const getHistoricalData = () => {
    const monthlyData: Record<string, number> = {};
    const now = new Date();

    for (let i = 2; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, "yyyy-MM");
      const monthExpenses = expenses.filter(e => {
        const expDate = new Date(e.expenseDate);
        return format(expDate, "yyyy-MM") === monthKey;
      });
      const total = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      monthlyData[monthKey] = total;
    }

    return monthlyData;
  };

  // Calculate forecast for next 2 months using linear regression
  const calculateForecast = () => {
    const historical = getHistoricalData();
    const values = Object.values(historical);
    
    if (values.length === 0) return { nextMonth: 0, twoMonths: 0, trend: "stable" };

    // Simple linear regression
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const nextMonth = Math.max(0, intercept + slope * (n + 1));
    const twoMonths = Math.max(0, intercept + slope * (n + 2));

    let trend = "stable";
    if (slope > 500) trend = "increasing";
    else if (slope < -500) trend = "decreasing";

    return { nextMonth, twoMonths, trend, slope };
  };

  // Get category-level forecasts
  const getCategoryForecasts = () => {
    const categoryData: Record<number, number[]> = {};
    const now = new Date();

    // Get last 3 months per category
    for (let i = 2; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, "yyyy-MM");
      
      expenses
        .filter(e => format(new Date(e.expenseDate), "yyyy-MM") === monthKey)
        .forEach(e => {
          if (!categoryData[e.categoryId]) categoryData[e.categoryId] = [];
          const current = categoryData[e.categoryId].reduce((a, b) => a + b, 0);
          categoryData[e.categoryId].push(current + parseFloat(e.amount || 0));
        });
    }

    // Calculate forecasts per category
    return Object.entries(categoryData).map(([catId, values]) => {
      if (values.length < 2) return null;
      
      const n = values.length;
      const sumX = (n * (n + 1)) / 2;
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
      const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const forecast = Math.max(0, intercept + slope * (n + 1));

      return { categoryId: parseInt(catId), forecast, slope };
    }).filter(Boolean) as any[];
  };

  // Prepare chart data
  const prepareChartData = () => {
    const historical = getHistoricalData();
    const { nextMonth, twoMonths } = calculateForecast();
    const now = new Date();

    const data = [];
    let i = 2;
    Object.entries(historical).forEach(([month, actual]) => {
      data.push({
        month: format(new Date(month), "MMM"),
        actual,
        forecast: actual,
        isPast: true,
      });
      i--;
    });

    // Add forecast
    data.push({
      month: format(addMonths(now, 1), "MMM"),
      actual: null,
      forecast: nextMonth,
      isPast: false,
    });

    data.push({
      month: format(addMonths(now, 2), "MMM"),
      actual: null,
      forecast: twoMonths,
      isPast: false,
    });

    return data;
  };

  const forecast = calculateForecast();
  const categoryForecasts = getCategoryForecasts();
  const chartData = prepareChartData();

  const getTrendColor = (trend: string) => {
    if (trend === "increasing") return "text-destructive";
    if (trend === "decreasing") return "text-green-600";
    return "text-amber-600";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "increasing") return "↑";
    if (trend === "decreasing") return "↓";
    return "→";
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 text-center">
          <p className="text-muted-foreground">Add expenses to generate forecasts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Forecast Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Next Month Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{forecast.nextMonth.toLocaleString()}</div>
            <p className={`text-sm mt-2 font-medium ${getTrendColor(forecast.trend)}`}>
              {getTrendIcon(forecast.trend)} {forecast.trend === "increasing" ? "Expenses increasing" : forecast.trend === "decreasing" ? "Expenses decreasing" : "Stable trend"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">2-Month Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{forecast.twoMonths.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-2">Projected spending in 2 months</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Forecast (3 Months Historical + 2 Months Projected)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `₹${value?.toLocaleString()}`}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="forecast" 
                stroke="#8884d8" 
                strokeDasharray="5 5"
                name="Forecast"
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#82ca9d" 
                name="Actual"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Forecasts */}
      {categoryForecasts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Forecasts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryForecasts.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Category {cat.categoryId}</span>
                    <Badge variant="outline">₹{cat.forecast.toLocaleString()}</Badge>
                  </div>
                  <p className={`text-xs font-medium ${cat.slope > 0 ? "text-destructive" : "text-green-600"}`}>
                    {cat.slope > 0 ? "↑ Increasing" : "↓ Decreasing"} (monthly trend: ₹{Math.abs(cat.slope).toLocaleString()})
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
          <CardTitle className="text-base">Forecasting Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Forecasts based on last 3 months of expenses using trend analysis</li>
            <li>✓ Increasing trend may indicate seasonal patterns or growing business</li>
            <li>✓ Use forecasts to plan budgets and cash flow management</li>
            <li>✓ Monitor category-level trends to identify cost drivers</li>
            <li>✓ More data improves forecast accuracy over time</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
