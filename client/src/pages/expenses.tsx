import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, Loader2, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";

interface ExpenseCategory {
  name: string;
  total: number;
  percentage: number;
  trend?: "up" | "down" | "stable";
}

interface Insight {
  type: "opportunity" | "warning" | "suggestion" | "achievement";
  title: string;
  description: string;
  impact: string;
}

export function ExpenseInsights({ expenses, categories }: { expenses: any[]; categories: any[] }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateInsights();
  }, [expenses, categories]);

  const generateInsights = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Calculate expense breakdown
      const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const categoryBreakdown = categories.map((cat) => {
        const categoryExpenses = expenses.filter((e) => e.categoryId === cat.id);
        const total = categoryExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
        return {
          name: cat.name,
          total,
          percentage,
          count: categoryExpenses.length,
        };
      }).filter(cat => cat.count > 0);

      // Calculate trends
      const last30DaysExpenses = expenses.filter((e) => {
        const expDate = new Date(e.expenseDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return expDate >= thirtyDaysAgo;
      });

      const categoryTrends = categoryBreakdown.map((cat) => {
        const categoryLast30 = last30DaysExpenses.filter((e) => 
          e.categoryId === categories.find(c => c.name === cat.name)?.id
        ).reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
        return {
          ...cat,
          last30Days: categoryLast30,
        };
      });

      // Build prompt for AI
      const prompt = `Analyze these property expense data and provide 3-4 specific, actionable business insights to help improve profitability. Format as JSON array of insights.

Expense Categories & Percentages:
${categoryBreakdown.map(cat => `- ${cat.name}: ₹${cat.total.toLocaleString()} (${cat.percentage.toFixed(1)}% of total)`).join('\n')}

Total Monthly Expenses: ₹${totalExpenses.toLocaleString()}
Number of Transactions: ${expenses.length}

Provide insights in this JSON format:
[
  {
    "type": "opportunity|warning|suggestion|achievement",
    "title": "Short insight title",
    "description": "2-3 sentence specific insight",
    "impact": "Expected savings or benefit"
  }
]

Make insights specific to Indian hospitality business. Focus on cost optimization, operational efficiency, and profitability improvement.`;

      // Call OpenAI API via backend
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          categoryBreakdown,
          totalExpenses,
          transactionCount: expenses.length,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate insights");
      const data = await response.json();
      
      // Parse AI response
      if (data.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
      } else {
        setInsights(generateFallbackInsights(categoryBreakdown, totalExpenses));
      }
    } catch (err) {
      console.error("Error generating insights:", err);
      setInsights(generateFallbackInsights([], 0));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackInsights = (categories: any[], total: number): Insight[] => {
    const insights: Insight[] = [];
    
    // Find highest expense category
    const highest = categories.reduce((max, cat) => 
      (cat.percentage > max.percentage) ? cat : max, 
      categories[0] || { name: "Expenses", percentage: 0 }
    );

    if (highest.percentage > 30) {
      insights.push({
        type: "opportunity",
        title: `${highest.name} Optimization`,
        description: `${highest.name} accounts for ${highest.percentage.toFixed(1)}% of your expenses. Consider negotiating better rates with suppliers or implementing efficiency measures.`,
        impact: `Potential savings: ₹${(highest.total * 0.15).toLocaleString()} (15% reduction)`,
      });
    }

    if (total > 100000) {
      insights.push({
        type: "suggestion",
        title: "Budget Control",
        description: "Your monthly expenses are substantial. Track daily spending patterns to identify unusual spikes early.",
        impact: "Better cost forecasting and budget control",
      });
    }

    insights.push({
      type: "achievement",
      title: "Expense Tracking Active",
      description: "Great! You're actively monitoring and categorizing expenses. This data helps identify cost-saving opportunities.",
      impact: "Historical data for better decision making",
    });

    return insights;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "opportunity":
        return <TrendingDown className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "achievement":
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-amber-600" />;
    }
  };

  const getInsightBadgeColor = (type: string) => {
    switch (type) {
      case "opportunity":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "warning":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "achievement":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            AI-Powered Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            AI analysis of your expenses to help optimize costs and improve profitability.
          </p>

          {isGenerating ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing your expenses...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : insights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No expense data available for analysis</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <div key={idx} className="p-4 border rounded-lg hover-elevate">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getInsightIcon(insight.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{insight.title}</h3>
                        <Badge className={getInsightBadgeColor(insight.type)}>
                          {insight.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                      <div className="text-xs font-medium text-foreground p-2 bg-muted rounded">
                        📊 {insight.impact}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 Tips for Better Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Review supplier contracts quarterly for better rates</li>
            <li>✓ Track seasonal expense patterns for better forecasting</li>
            <li>✓ Implement preventive maintenance to reduce emergency repairs</li>
            <li>✓ Monitor utility usage and implement energy-saving measures</li>
            <li>✓ Negotiate with multiple vendors to get competitive pricing</li>
            <li>✓ Automate expense categorization for faster analysis</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
