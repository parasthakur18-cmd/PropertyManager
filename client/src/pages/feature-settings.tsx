import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bell, Mail, Zap, Users, TrendingUp, AlertCircle, Clock, DollarSign, Settings2 
} from "lucide-react";

interface FeatureSettings {
  id: number;
  propertyId: number;
  foodOrderNotifications: boolean;
  whatsappNotifications: boolean;
  emailNotifications: boolean;
  autoCheckout: boolean;
  autoSalaryCalculation: boolean;
  attendanceTracking: boolean;
  performanceAnalytics: boolean;
  expenseForecasting: boolean;
  budgetAlerts: boolean;
  paymentReminders: boolean;
}

const features = [
  {
    category: "Notifications & Alerts",
    icon: Bell,
    items: [
      { key: "foodOrderNotifications", label: "Food Order Alerts", description: "Browser + WhatsApp alerts when new orders arrive" },
      { key: "whatsappNotifications", label: "WhatsApp Messaging", description: "Send notifications via WhatsApp to staff" },
      { key: "emailNotifications", label: "Email Notifications", description: "Send alerts via email" },
      { key: "paymentReminders", label: "Payment Reminders", description: "Remind guests about pending payments" },
    ]
  },
  {
    category: "Automation",
    icon: Zap,
    items: [
      { key: "autoCheckout", label: "Auto-Checkout", description: "Automatically generate bills at checkout" },
      { key: "autoSalaryCalculation", label: "Auto Salary Calculation", description: "Calculate staff salaries automatically" },
    ]
  },
  {
    category: "Staff & Performance",
    icon: Users,
    items: [
      { key: "attendanceTracking", label: "Attendance Tracking", description: "Track staff attendance records" },
      { key: "performanceAnalytics", label: "Performance Analytics", description: "Monitor staff performance metrics" },
    ]
  },
  {
    category: "Financial Analytics",
    icon: DollarSign,
    items: [
      { key: "expenseForecasting", label: "Expense Forecasting", description: "AI-powered expense predictions" },
      { key: "budgetAlerts", label: "Budget Alerts", description: "Alert when budget thresholds are exceeded" },
    ]
  },
];

export default function FeatureSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedProperty, setSelectedProperty] = useState<string>("");

  // Redirect if not admin or super-admin
  if (user?.role !== "admin" && user?.role !== "super-admin") {
    navigate("/");
    return null;
  }

  // Get all properties for selection
  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
  });

  // Use selected property or first assigned property
  const propertyId = selectedProperty || user?.assignedPropertyIds?.[0];

  const { data: settings, isLoading } = useQuery<FeatureSettings>({
    queryKey: ["/api/feature-settings", propertyId],
    enabled: !!propertyId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<FeatureSettings>) => {
      return await apiRequest("/api/feature-settings", "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-settings", propertyId] });
      toast({
        title: "Success",
        description: "Feature settings updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = async (key: string, value: boolean) => {
    await updateMutation.mutateAsync({
      [key]: value,
    } as any);
  };

  if (!propertyId && !selectedProperty) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            Feature Settings
          </h1>
          <p className="text-muted-foreground">
            Select a property to configure its features
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Select Property</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a property..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map((prop: any) => (
                  <SelectItem key={prop.id} value={prop.id.toString()}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings2 className="h-8 w-8" />
          Feature Settings
        </h1>
        <p className="text-muted-foreground">
          Enable or disable optional features for your property management system
        </p>
      </div>

      <div className="grid gap-6">
        {features.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.category} className="overflow-hidden">
              <CardHeader className="bg-muted/50 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{category.category}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {category.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={(settings as any)[item.key] || false}
                      onCheckedChange={(value) => handleToggle(item.key, value)}
                      disabled={updateMutation.isPending}
                      data-testid={`toggle-${item.key}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-amber-900 dark:text-amber-100">Note</CardTitle>
              <CardDescription className="text-amber-800 dark:text-amber-200">
                Disabling features will not delete existing data. You can re-enable them anytime.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
