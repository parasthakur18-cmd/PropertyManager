import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    generateInsights();
  }, [expenses, categories]);

  const generateInsights = async () => {
    try {
      setIsGenerating(true);
      const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const categoryBreakdown = categories.map((cat) => {
        const categoryExpenses = expenses.filter((e) => e.categoryId === cat.id);
        const total = categoryExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        return {
          name: cat.name,
          total,
          percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
          count: categoryExpenses.length,
        };
      }).filter(cat => cat.count > 0).sort((a, b) => b.total - a.total);

      // Generate insights based on expense analysis
      const generatedInsights: Insight[] = [];

      // Find highest expense category
      if (categoryBreakdown.length > 0) {
        const highest = categoryBreakdown[0];
        if (highest.percentage > 30) {
          generatedInsights.push({
            type: "opportunity",
            title: `${highest.name} Optimization Opportunity`,
            description: `${highest.name} represents ${highest.percentage.toFixed(1)}% of total expenses. Negotiate with suppliers or implement efficiency measures to reduce costs.`,
            impact: `Potential savings: ₹${(highest.total * 0.15).toLocaleString()} (15% reduction)`,
          });
        }
      }

      // Budget control insight
      if (totalExpenses > 100000) {
        generatedInsights.push({
          type: "suggestion",
          title: "Daily Expense Monitoring",
          description: "Your monthly expenses are significant. Track daily spending patterns to catch unusual spikes early and maintain budget control.",
          impact: "Better forecasting and proactive cost management",
        });
      }

      // Category diversity
      if (categoryBreakdown.length > 3) {
        generatedInsights.push({
          type: "achievement",
          title: "Well-Organized Expense Tracking",
          description: `Great! You're using ${categoryBreakdown.length} different expense categories. This detailed tracking helps identify cost-saving opportunities.`,
          impact: "Data-driven decision making capability",
        });
      }

      // Top 2 categories insight
      if (categoryBreakdown.length >= 2) {
        const top2 = categoryBreakdown.slice(0, 2);
        const top2Percent = top2.reduce((sum, cat) => sum + cat.percentage, 0);
        generatedInsights.push({
          type: "warning",
          title: `Top 2 Categories: ${top2Percent.toFixed(0)}% of Budget`,
          description: `${top2.map(c => c.name).join(' + ')} account for ${top2Percent.toFixed(1)}% of your expenses. Focus optimization efforts here for maximum impact.`,
          impact: `Focusing on these 2 categories could yield biggest savings`,
        });
      }

      setInsights(generatedInsights);
    } catch (error) {
      console.error("Error generating insights:", error);
      setInsights([]);
    } finally {
      setIsGenerating(false);
    }
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
            AI Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Smart recommendations to optimize costs and improve profitability
          </p>

          {isGenerating ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing expenses...</span>
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
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
