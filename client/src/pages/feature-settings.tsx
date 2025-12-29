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
  Bell, Mail, Zap, Users, TrendingUp, AlertCircle, Clock, DollarSign, Settings2, CreditCard, MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  advancePaymentEnabled: boolean;
  advancePaymentPercentage: string;
  advancePaymentExpiryHours: number;
  paymentReminderEnabled: boolean;
  paymentReminderHours: number;
  maxPaymentReminders: number;
}

interface TemplateSetting {
  id: number;
  propertyId: number;
  templateType: string;
  isEnabled: boolean;
  sendTiming: string;
  delayHours: number;
}

const features = [
  {
    category: "Notifications & Alerts",
    icon: Bell,
    items: [
      { key: "foodOrderNotifications", label: "Food Order Alerts", description: "Browser + WhatsApp alerts when new orders arrive" },
      { key: "whatsappNotifications", label: "WhatsApp Messaging", description: "Master toggle for all WhatsApp notifications" },
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

const WHATSAPP_TEMPLATES = [
  { type: 'booking_confirmation', name: 'Booking Confirmation', description: 'Send when booking is created (18491)', icon: '📅' },
  { type: 'pending_payment', name: 'Advance Payment Request', description: 'Send payment link for advance payment (22226)', icon: '💳' },
  { type: 'payment_reminder', name: 'Payment Reminder', description: 'Auto-reminders for pending payments (18489)', icon: '⏰' },
  { type: 'payment_confirmation', name: 'Payment Confirmation', description: 'Send when payment is received (18649)', icon: '✅' },
  { type: 'checkin_message', name: 'Check-in Message', description: 'Send when guest checks in (18712)', icon: '🏨' },
  { type: 'checkout_message', name: 'Checkout Message', description: 'Send checkout bill details (18667)', icon: '👋' },
  { type: 'prebill_message', name: 'Pre-bill Verification', description: 'Send bill verification before checkout (19852)', icon: '📋' },
  { type: 'split_payment', name: 'Split Payment', description: 'Send split payment links (19892)', icon: '💰' },
  { type: 'welcome_menu', name: 'Welcome Menu', description: 'Send QR food ordering link (21932)', icon: '🍽️' },
];

export default function FeatureSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedProperty, setSelectedProperty] = useState<string>("");

  if (user?.role !== "admin" && user?.role !== "super-admin") {
    navigate("/");
    return null;
  }

  const { data: properties = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/properties"],
  });

  const propertyId = selectedProperty || user?.assignedPropertyIds?.[0];

  const { data: settings, isLoading, error } = useQuery<FeatureSettings>({
    queryKey: ["/api/feature-settings", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const response = await fetch(`/api/feature-settings?propertyId=${propertyId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  });

  const { data: templateSettings, isLoading: templatesLoading } = useQuery<TemplateSetting[]>({
    queryKey: ["/api/whatsapp-template-settings", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const response = await fetch(`/api/whatsapp-template-settings/${propertyId}`);
      if (!response.ok) throw new Error("Failed to fetch template settings");
      return response.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<FeatureSettings>) => {
      return await apiRequest("/api/feature-settings", "PATCH", { ...updates, propertyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-settings", propertyId] });
      toast({ title: "Success", description: "Settings updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { templateType: string; isEnabled?: boolean; sendTiming?: string; delayHours?: number }) => {
      if (!propertyId) throw new Error("Property not selected");
      return await apiRequest("/api/whatsapp-template-settings", "PUT", { propertyId, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-template-settings", propertyId] });
      toast({ title: "Success", description: "Template settings updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    },
  });

  const handleToggle = async (key: string, value: boolean) => {
    await updateMutation.mutateAsync({ [key]: value } as any);
  };

  const getTemplateSetting = (templateType: string): TemplateSetting | undefined => {
    return templateSettings?.find(s => s.templateType === templateType);
  };

  const handleTemplateToggle = async (templateType: string, isEnabled: boolean) => {
    const current = getTemplateSetting(templateType);
    await updateTemplateMutation.mutateAsync({
      templateType,
      isEnabled,
      sendTiming: current?.sendTiming || 'immediate',
      delayHours: current?.delayHours || 0
    });
  };

  const handleTimingChange = async (templateType: string, sendTiming: string) => {
    const current = getTemplateSetting(templateType);
    await updateTemplateMutation.mutateAsync({
      templateType,
      isEnabled: current?.isEnabled ?? true,
      sendTiming,
      delayHours: sendTiming === 'immediate' ? 0 : (current?.delayHours || 1)
    });
  };

  const handleDelayChange = async (templateType: string, delayHours: number) => {
    const current = getTemplateSetting(templateType);
    await updateTemplateMutation.mutateAsync({
      templateType,
      isEnabled: current?.isEnabled ?? true,
      sendTiming: 'delayed',
      delayHours
    });
  };

  if (!selectedProperty && !user?.assignedPropertyIds?.[0]) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            Feature Settings
          </h1>
          <p className="text-muted-foreground">Select a property to configure its features</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Select Property</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger data-testid="select-property">
                <SelectValue placeholder="Choose a property..." />
              </SelectTrigger>
              <SelectContent>
                {properties && properties.length > 0 ? (
                  properties.map((prop: any) => (
                    <SelectItem key={prop.id} value={prop.id.toString()}>{prop.name}</SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No properties available</div>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error instanceof Error ? error.message : "Failed to load settings"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>No Settings Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Unable to load feature settings. Please try again.</p>
          </CardContent>
        </Card>
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
        {selectedProperty && properties.length > 0 && (
          <div className="mt-4">
            <label className="text-sm font-medium">Current Property:</label>
            <p className="text-sm text-muted-foreground">
              {properties.find((p: any) => p.id.toString() === selectedProperty)?.name || "Unknown"}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {features.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.category} className="overflow-hidden">
              <CardHeader className="bg-muted/50 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{category.category}</CardTitle>
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

      <Card className="overflow-hidden border-green-200 dark:border-green-800">
        <CardHeader className="bg-green-50 dark:bg-green-950 border-b pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <div>
              <CardTitle className="text-lg">WhatsApp Message Templates</CardTitle>
              <CardDescription>Configure timing and enable/disable each message type</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {templatesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : (
            WHATSAPP_TEMPLATES.map((template) => {
              const setting = getTemplateSetting(template.type);
              const isEnabled = setting?.isEnabled ?? true;
              const sendTiming = setting?.sendTiming || 'immediate';
              const delayHours = setting?.delayHours || 0;

              return (
                <div
                  key={template.type}
                  className={`p-4 rounded-lg border ${!isEnabled ? "opacity-60 bg-muted/30" : "hover:bg-muted/50"} transition-colors`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{template.icon}</span>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(value) => handleTemplateToggle(template.type, value)}
                      disabled={updateTemplateMutation.isPending}
                      data-testid={`toggle-template-${template.type}`}
                    />
                  </div>
                  
                  {isEnabled && (
                    <div className="flex flex-wrap items-center gap-4 pl-9 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">Send:</Label>
                      </div>
                      <Select
                        value={sendTiming}
                        onValueChange={(value) => handleTimingChange(template.type, value)}
                      >
                        <SelectTrigger className="w-32" data-testid={`timing-${template.type}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                        </SelectContent>
                      </Select>

                      {sendTiming === 'delayed' && (
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">After</Label>
                          <Input
                            type="number"
                            min={1}
                            max={72}
                            value={delayHours}
                            onChange={(e) => handleDelayChange(template.type, parseInt(e.target.value) || 1)}
                            className="w-16"
                            data-testid={`delay-${template.type}`}
                          />
                          <span className="text-sm text-muted-foreground">hours</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="bg-primary/5 border-b pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Advance Payment Settings</CardTitle>
              <CardDescription>Configure automatic booking confirmation with advance payment</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex-1">
              <p className="font-medium">Enable Advance Payment</p>
              <p className="text-sm text-muted-foreground">
                Require advance payment for online bookings (Walk-in bookings are always confirmed immediately)
              </p>
            </div>
            <Switch
              checked={settings.advancePaymentEnabled || false}
              onCheckedChange={(value) => handleToggle("advancePaymentEnabled", value)}
              disabled={updateMutation.isPending}
              data-testid="toggle-advancePaymentEnabled"
            />
          </div>

          {settings.advancePaymentEnabled && (
            <div className="grid gap-4 md:grid-cols-2 p-3 rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="advancePercentage">Default Advance Percentage (%)</Label>
                <Input
                  id="advancePercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.advancePaymentPercentage || "30"}
                  onChange={(e) => {
                    updateMutation.mutate({ advancePaymentPercentage: e.target.value } as any);
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="input-advancePaymentPercentage"
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of total booking amount required as advance
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryHours">Booking Expiry (Hours)</Label>
                <Input
                  id="expiryHours"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.advancePaymentExpiryHours || 24}
                  onChange={(e) => {
                    updateMutation.mutate({ advancePaymentExpiryHours: parseInt(e.target.value) } as any);
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="input-advancePaymentExpiryHours"
                />
                <p className="text-xs text-muted-foreground">
                  Booking will automatically expire if payment not received within this time
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/20">
        <CardHeader className="bg-primary/5 border-b pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Payment Reminder Settings</CardTitle>
              <CardDescription>Configure automatic payment reminders for pending advance payments</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex-1">
              <p className="font-medium">Enable Automatic Reminders</p>
              <p className="text-sm text-muted-foreground">
                Automatically send WhatsApp reminders to guests who haven't paid their advance
              </p>
            </div>
            <Switch
              checked={settings.paymentReminderEnabled !== false}
              onCheckedChange={(value) => {
                updateMutation.mutate({ paymentReminderEnabled: value } as any);
              }}
              disabled={updateMutation.isPending}
              data-testid="toggle-paymentReminderEnabled"
            />
          </div>

          {settings.paymentReminderEnabled !== false && (
            <div className="grid gap-4 md:grid-cols-2 p-3 rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="reminderHours">Reminder Interval (Hours)</Label>
                <Input
                  id="reminderHours"
                  type="number"
                  min="1"
                  max="72"
                  value={settings.paymentReminderHours || 6}
                  onChange={(e) => {
                    updateMutation.mutate({ paymentReminderHours: parseInt(e.target.value) || 6 } as any);
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="input-paymentReminderHours"
                />
                <p className="text-xs text-muted-foreground">
                  Hours to wait before sending each reminder
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxReminders">Maximum Reminders</Label>
                <Input
                  id="maxReminders"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxPaymentReminders || 3}
                  onChange={(e) => {
                    updateMutation.mutate({ maxPaymentReminders: parseInt(e.target.value) || 3 } as any);
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="input-maxPaymentReminders"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of reminders to send per booking
                </p>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">
            <p><strong>How it works:</strong> After a guest creates a booking with pending advance payment, 
            the system will automatically send WhatsApp reminders at the configured interval until 
            the payment is received or the maximum number of reminders is reached.</p>
          </div>
        </CardContent>
      </Card>

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
