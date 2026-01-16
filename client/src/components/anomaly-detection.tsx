import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface Anomaly {
  type: "spike" | "unusual-category" | "recurring-pattern" | "threshold-breach";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  amount: number;
  category?: string;
  date?: Date;
  recommendation: string;
}

export function AnomalyDetection({ expenses }: { expenses: any[] }) {
  // Calculate anomalies using statistical methods
  const detectAnomalies = (): Anomaly[] => {
    const anomalies: Anomaly[] = [];

    if (expenses.length < 5) return anomalies;

    // Calculate mean and standard deviation
    const amounts = expenses.map(e => parseFloat(e.amount || 0));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Detect spikes (expenses >2 std deviations from mean)
    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount || 0);
      if (amount > mean + 2 * stdDev) {
        anomalies.push({
          type: "spike",
          severity: amount > mean + 3 * stdDev ? "high" : "medium",
          title: `Unusual Expense Spike`,
          description: `₹${amount.toLocaleString()} on ${format(new Date(expense.expenseDate), "MMM d")}`,
          amount,
          category: expense.category,
          date: new Date(expense.expenseDate),
          recommendation: "Verify if this is a legitimate one-time expense or billing error",
        });
      }
    });

    // Detect recurring pattern changes
    const categoryMap: Record<number, number[]> = {};
    expenses.forEach(e => {
      if (!categoryMap[e.categoryId]) categoryMap[e.categoryId] = [];
      categoryMap[e.categoryId].push(parseFloat(e.amount || 0));
    });

    Object.entries(categoryMap).forEach(([catId, amounts]) => {
      if (amounts.length < 3) return;
      
      const catMean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const catVariance = amounts.reduce((sum, val) => sum + Math.pow(val - catMean, 2), 0) / amounts.length;
      const catStdDev = Math.sqrt(catVariance);

      // Find recent anomalies in this category
      const recentAmount = amounts[amounts.length - 1];
      if (recentAmount > catMean + 1.5 * catStdDev) {
        anomalies.push({
          type: "unusual-category",
          severity: "medium",
          title: `Unusual activity in Category ${catId}`,
          description: `Recent expense (₹${recentAmount.toLocaleString()}) is higher than usual (avg: ₹${catMean.toLocaleString()})`,
          amount: recentAmount,
          recommendation: "Review this category for cost management opportunities",
        });
      }
    });

    // Detect threshold breaches (top 10% of expenses)
    const threshold = mean + 1.5 * stdDev;
    const breaches = expenses.filter(e => parseFloat(e.amount || 0) > threshold);
    if (breaches.length > 0 && breaches.length <= 3) {
      anomalies.push({
        type: "threshold-breach",
        severity: "low",
        title: `${breaches.length} expense${breaches.length > 1 ? "s" : ""} above normal range`,
        description: `These expenses exceed your typical spending pattern`,
        amount: breaches.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0),
        recommendation: "Consider setting stricter approval limits for high-value expenses",
      });
    }

    return anomalies.slice(0, 5); // Return top 5 anomalies
  };

  // Calculate expense trend
  const calculateTrend = () => {
    if (expenses.length < 2) return { trend: "insufficient", change: 0 };
    
    const recent = expenses.slice(-5).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const previous = expenses.slice(-10, -5).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    
    if (previous === 0) return { trend: "insufficient", change: 0 };
    
    const change = ((recent - previous) / previous) * 100;
    if (change > 15) return { trend: "increasing", change };
    if (change < -15) return { trend: "decreasing", change };
    return { trend: "stable", change };
  };

  // Identify cost drivers
  const identifyCostDrivers = () => {
    const categoryMap: Record<number, number> = {};
    expenses.forEach(e => {
      categoryMap[e.categoryId] = (categoryMap[e.categoryId] || 0) + parseFloat(e.amount || 0);
    });

    return Object.entries(categoryMap)
      .map(([catId, amount]) => ({
        categoryId: parseInt(catId),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  };

  const anomalies = detectAnomalies();
  const trend = calculateTrend();
  const costDrivers = identifyCostDrivers();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "border-destructive bg-red-50";
      case "medium": return "border-amber-500 bg-amber-50";
      case "low": return "border-blue-500 bg-blue-50";
      default: return "border-border";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high": return "bg-destructive";
      case "medium": return "bg-amber-600";
      case "low": return "bg-blue-600";
      default: return "bg-muted";
    }
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 text-center">
          <p className="text-muted-foreground">Add expenses to analyze for anomalies</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${trend.trend === "increasing" ? "text-destructive" : trend.trend === "decreasing" ? "text-green-600" : "text-muted-foreground"}`}>
                {trend.trend === "increasing" ? "↑" : trend.trend === "decreasing" ? "↓" : "→"}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {Math.abs(trend.change).toFixed(1)}% {trend.trend}
                </p>
                <p className="text-xs text-muted-foreground">Last 10 expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalies.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {anomalies.length === 0 ? "No unusual patterns" : "Review these for action"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detected Anomalies */}
      {anomalies.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Detected Anomalies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anomalies.map((anomaly, idx) => (
                <Alert key={idx} className={`border-2 ${getSeverityColor(anomaly.severity)}`}>
                  <AlertDescription>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold">{anomaly.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{anomaly.description}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium">💡 {anomaly.recommendation}</p>
                        </div>
                      </div>
                      <Badge className={getSeverityBadge(anomaly.severity)}>
                        {anomaly.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Drivers */}
      {costDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Cost Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costDrivers.map((driver, idx) => {
                const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                const percentage = totalExpenses > 0 ? (driver.amount / totalExpenses) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Category {driver.categoryId}</span>
                      <span className="font-semibold">₹{driver.amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of total</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anomaly Detection Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Detects expenses greater than 2 standard deviations from average (statistical anomalies)</li>
            <li>✓ Identifies unusual patterns in expense categories</li>
            <li>✓ Flags trend changes (15%+ increase/decrease)</li>
            <li>✓ Highlights top cost drivers for focus areas</li>
            <li>✓ Helps identify billing errors, duplicate charges, or unusual activities</li>
          </ul>
        </CardContent>
      </Card>

      {/* Health Status */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-green-900">
            <CheckCircle2 className="w-5 h-5" />
            Expense Health
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-900">
          {anomalies.length === 0 && trend.trend === "decreasing" ? (
            <p>✓ Your expenses are healthy! Costs are decreasing and no anomalies detected.</p>
          ) : anomalies.length === 0 ? (
            <p>✓ No anomalies detected. Continue monitoring your expense trends.</p>
          ) : (
            <p>⚠️ {anomalies.length} anomalies detected. Review and take action to optimize costs.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
