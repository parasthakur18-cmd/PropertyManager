import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function ReportIssue() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "bug",
    severity: "medium",
  });

  const categories = [
    { value: "bug", label: "Bug Report" },
    { value: "feature_request", label: "Feature Request" },
    { value: "documentation", label: "Documentation" },
    { value: "performance", label: "Performance" },
    { value: "other", label: "Other" },
  ];

  const severities = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to report an issue",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    setLoading(true);

    try {
      await apiRequest("/api/issues", {
        method: "POST",
        body: {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          severity: formData.severity,
        },
      });

      toast({
        title: "Issue reported successfully!",
        description: "Thank you for helping us improve. Our team will review your report.",
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "bug",
        severity: "medium",
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Failed to report issue",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to report an issue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setLocation("/login")}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600"
              data-testid="button-login"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Report an Issue</h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Help us improve Hostezee by reporting bugs, suggesting features, or sharing feedback
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle>What's the issue?</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help our team understand and resolve your report
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-report-issue">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-white">Title</label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief summary of the issue"
                  required
                  data-testid="input-title"
                  className="border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-white">Category</label>
                  <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                    <SelectTrigger data-testid="select-category" className="border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-white">Severity</label>
                  <Select value={formData.severity} onValueChange={(value) => handleSelectChange("severity", value)}>
                    <SelectTrigger data-testid="select-severity" className="border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {severities.map((sev) => (
                        <SelectItem key={sev.value} value={sev.value}>
                          {sev.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-white">Description</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Detailed description of the issue, steps to reproduce, expected vs actual behavior, etc."
                  required
                  rows={8}
                  data-testid="textarea-description"
                  className="border-slate-200 dark:border-slate-800 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white gap-2 h-11"
                data-testid="button-submit"
              >
                {loading ? "Submitting..." : "Submit Report"}
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            <span className="font-semibold">💡 Tip:</span> The more details you provide, the faster our team can help.
            Include screenshots, error messages, and steps to reproduce the issue when possible.
          </p>
        </div>
      </div>
    </div>
  );
}
