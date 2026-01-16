import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";

interface Insight {
  type: "opportunity" | "warning" | "suggestion" | "achievement";
  title: string;
  description: string;
  impact: string;
}

export function ExpenseInsights({ expenses, categories }: { expenses: any[]; categories: any[] }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!expenses || expenses.length === 0) {
      setInsights([]);
      return;
    }
    generateInsights();
  }, [expenses, categories]);

  const generateInsights = async () => {
    try {
      setIsGenerating(true);
      const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
      
      const categoryBreakdown = categories
        .map((cat) => {
          const categoryExpenses = expenses.filter((e) => e.categoryId === cat.id);
          const total = categoryExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
          return {
            id: cat.id,
            name: cat.name,
            total,
            percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
            count: categoryExpenses.length,
          };
        })
        .filter(cat => cat.total > 0)
        .sort((a, b) => b.total - a.total);

      if (categoryBreakdown.length === 0) {
        setInsights([]);
        return;
      }

      console.log("[ExpenseInsights] Calling API with breakdown:", categoryBreakdown);

      // Call AI backend endpoint
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryBreakdown,
          totalExpenses,
          transactionCount: expenses.length,
        }),
        credentials: "include",
      });

      console.log("[ExpenseInsights] API response status:", response.status);

      if (!response.ok) {
        console.error("[ExpenseInsights] API error:", response.status);
        const fallback = generateFallbackInsights(categoryBreakdown, totalExpenses);
        setInsights(fallback);
        return;
      }

      const data = await response.json();
      console.log("[ExpenseInsights] API response data:", data);
      
      // Parse AI response
      if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
        setInsights(data.insights);
      } else {
        const fallback = generateFallbackInsights(categoryBreakdown, totalExpenses);
        setInsights(fallback);
      }
    } catch (error) {
      console.error("[ExpenseInsights] Error:", error);
      // Fallback to basic insights if AI fails
      const categoryBreakdown = categories
        .map((cat) => {
          const categoryExpenses = expenses.filter((e) => e.categoryId === cat.id);
          const total = categoryExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
          return {
            name: cat.name,
            total,
            percentage: expenses.length > 0 
              ? (total / expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)) * 100 
              : 0,
          };
        })
        .filter(cat => cat.total > 0);
      
      const fallback = generateFallbackInsights(categoryBreakdown, expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0));
      setInsights(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackInsights = (categories: any[], total: number): Insight[] => {
    const insights: Insight[] = [];
    
    if (categories.length === 0) return insights;

    // Find highest expense category
    const highest = categories.reduce((max, cat) => 
      (cat.percentage > max.percentage) ? cat : max, 
      categories[0]
    );

    if (highest.percentage > 30) {
      insights.push({
        type: "opportunity",
        title: `${highest.name} Optimization Opportunity`,
        description: `${highest.name} represents ${highest.percentage.toFixed(1)}% of total expenses. Consider negotiating with suppliers or implementing efficiency measures.`,
        impact: `Potential savings: ₹${(highest.total * 0.15).toLocaleString()} (15% reduction)`,
      });
    }

    if (total > 50000) {
      insights.push({
        type: "suggestion",
        title: "Daily Expense Monitoring",
        description: "Your monthly expenses are substantial. Track daily spending patterns to catch unusual spikes early and maintain budget control.",
        impact: "Better forecasting and proactive cost management",
      });
    }

    if (categories.length > 3) {
      insights.push({
        type: "achievement",
        title: "Well-Organized Expense Tracking",
        description: `Great! You're using ${categories.length} different expense categories. This detailed tracking helps identify cost-saving opportunities.`,
        impact: "Data-driven decision making capability",
      });
    }

    if (categories.length >= 2) {
      const top2 = categories.slice(0, 2);
      const top2Percent = top2.reduce((sum, cat) => sum + cat.percentage, 0);
      insights.push({
        type: "warning",
        title: `Top 2 Categories: ${top2Percent.toFixed(0)}% of Budget`,
        description: `${top2.map(c => c.name).join(' + ')} account for ${top2Percent.toFixed(1)}% of your expenses. Focus optimization efforts here for maximum impact.`,
        impact: "Focusing on these 2 categories could yield biggest savings",
      });
    }

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
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-red-100 text-red-800";
      case "achievement":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-amber-100 text-amber-800";
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
            GPT-4o-powered analysis to identify cost-saving opportunities and improve profitability
          </p>

          {isGenerating ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing your expenses with AI...</span>
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Add expenses to get AI-powered insights</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <div key={idx} className="p-4 border rounded-lg hover-elevate">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getInsightIcon(insight.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{insight.title}</h3>
                        <Badge className={getInsightBadgeColor(insight.type)}>
                          {insight.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                      <div className="text-xs font-medium p-2 bg-muted rounded">
                        💰 {insight.impact}
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
          <CardTitle className="text-base">💡 Profitability Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Negotiate quarterly contracts with top suppliers</li>
            <li>✓ Implement preventive maintenance to reduce emergency costs</li>
            <li>✓ Monitor energy usage and implement conservation</li>
            <li>✓ Track seasonal expense patterns for budgeting</li>
            <li>✓ Consolidate multiple vendors for bulk discounts</li>
            <li>✓ Automate expense categorization for faster analysis</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
