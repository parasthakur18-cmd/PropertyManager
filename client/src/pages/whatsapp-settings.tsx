import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, CheckCircle, AlertCircle, Clock, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface WhatsappSettings {
  id: number;
  propertyId: number;
  checkInEnabled: boolean;
  checkOutEnabled: boolean;
  enquiryConfirmationEnabled: boolean;
  paymentRequestEnabled: boolean;
  bookingConfirmationEnabled: boolean;
  reminderMessagesEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateSetting {
  id: number;
  propertyId: number;
  templateType: string;
  isEnabled: boolean;
  sendTiming: string;
  delayHours: number;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_CONFIG = [
  {
    type: 'pending_payment',
    name: 'Pending Payment',
    description: 'Send payment request for booking enquiries',
    icon: '💳'
  },
  {
    type: 'payment_confirmation',
    name: 'Payment Confirmation',
    description: 'Send when payment is received',
    icon: '✅'
  },
  {
    type: 'checkin_message',
    name: 'Check-in Message',
    description: 'Send when guest checks in',
    icon: '🏨'
  },
  {
    type: 'addon_service',
    name: 'Add-on Service Message',
    description: 'Send for additional services (future)',
    icon: '🛎️'
  },
  {
    type: 'checkout_message',
    name: 'Checkout Message',
    description: 'Send when guest checks out',
    icon: '👋'
  }
];

export default function WhatsappSettings() {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [localSettings, setLocalSettings] = useState<Partial<WhatsappSettings>>({});

  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/whatsapp-settings", propertyId],
    enabled: propertyId !== null,
  });

  const { data: templateSettings, isLoading: templatesLoading } = useQuery<TemplateSetting[]>({
    queryKey: ["/api/whatsapp-template-settings", propertyId],
    enabled: propertyId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/whatsapp-template-settings/${propertyId}`);
      if (!response.ok) throw new Error("Failed to fetch template settings");
      return response.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<WhatsappSettings>) => {
      if (!propertyId) throw new Error("Property not selected");
      return await apiRequest("/api/whatsapp-settings", "PATCH", {
        propertyId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-settings", propertyId] });
      toast({
        title: "Success",
        description: "WhatsApp notification settings updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { templateType: string; isEnabled?: boolean; sendTiming?: string; delayHours?: number }) => {
      if (!propertyId) throw new Error("Property not selected");
      return await apiRequest("/api/whatsapp-template-settings", "PUT", {
        propertyId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-template-settings", propertyId] });
      toast({
        title: "Success",
        description: "Template settings updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template settings",
        variant: "destructive",
      });
    },
  });

  const handleToggle = async (field: keyof WhatsappSettings, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    await updateMutation.mutateAsync({ [field]: value });
  };

  const handlePropertyChange = (id: number) => {
    setPropertyId(id);
    setLocalSettings({});
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

  const currentSettings = settings || localSettings;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold">WhatsApp Settings</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Control WhatsApp messaging services for your properties
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Select Property</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {properties?.map((prop: any) => (
                <Button
                  key={prop.id}
                  onClick={() => handlePropertyChange(prop.id)}
                  variant={propertyId === prop.id ? "default" : "outline"}
                  data-testid={`button-property-${prop.id}`}
                >
                  {prop.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {propertyId && (
          <Tabs defaultValue="templates" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates" data-testid="tab-templates">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Templates
              </TabsTrigger>
              <TabsTrigger value="general" data-testid="tab-general">
                <Bell className="h-4 w-4 mr-2" />
                General Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 mb-4">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">WhatsApp messaging enabled by default</p>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        Pre-approved templates are ready to use. Configure timing for each message type below.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {templatesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {TEMPLATE_CONFIG.map((template) => {
                    const setting = getTemplateSetting(template.type);
                    const isEnabled = setting?.isEnabled ?? true;
                    const sendTiming = setting?.sendTiming || 'immediate';
                    const delayHours = setting?.delayHours || 0;

                    return (
                      <Card key={template.type} className={!isEnabled ? "opacity-60" : ""}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{template.icon}</span>
                              <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <CardDescription>{template.description}</CardDescription>
                              </div>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(value) => handleTemplateToggle(template.type, value)}
                              data-testid={`toggle-${template.type}`}
                            />
                          </div>
                        </CardHeader>
                        
                        {isEnabled && (
                          <CardContent className="pt-0 border-t">
                            <div className="flex flex-wrap items-center gap-4 pt-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-500" />
                                <Label className="text-sm font-medium">Send Timing:</Label>
                              </div>
                              
                              <Select
                                value={sendTiming}
                                onValueChange={(value) => handleTimingChange(template.type, value)}
                              >
                                <SelectTrigger className="w-36" data-testid={`timing-${template.type}`}>
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
                                    className="w-20"
                                    data-testid={`delay-${template.type}`}
                                  />
                                  <span className="text-sm text-slate-500">hours</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="general" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Check-in Message</CardTitle>
                          <CardDescription>Send when guest arrives</CardDescription>
                        </div>
                        <Switch
                          checked={currentSettings.checkInEnabled ?? true}
                          onCheckedChange={(value) => handleToggle("checkInEnabled", value)}
                          data-testid="toggle-check-in"
                        />
                      </div>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Check-out Message</CardTitle>
                          <CardDescription>Send when guest checks out</CardDescription>
                        </div>
                        <Switch
                          checked={currentSettings.checkOutEnabled ?? true}
                          onCheckedChange={(value) => handleToggle("checkOutEnabled", value)}
                          data-testid="toggle-check-out"
                        />
                      </div>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Enquiry Confirmation</CardTitle>
                          <CardDescription>Send when enquiry is confirmed</CardDescription>
                        </div>
                        <Switch
                          checked={currentSettings.enquiryConfirmationEnabled ?? true}
                          onCheckedChange={(value) => handleToggle("enquiryConfirmationEnabled", value)}
                          data-testid="toggle-enquiry"
                        />
                      </div>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Payment Request</CardTitle>
                          <CardDescription>Send payment links to guests</CardDescription>
                        </div>
                        <Switch
                          checked={currentSettings.paymentRequestEnabled ?? true}
                          onCheckedChange={(value) => handleToggle("paymentRequestEnabled", value)}
                          data-testid="toggle-payment"
                        />
                      </div>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Booking Confirmation</CardTitle>
                          <CardDescription>Send when booking is confirmed</CardDescription>
                        </div>
                        <Switch
                          checked={currentSettings.bookingConfirmationEnabled ?? true}
                          onCheckedChange={(value) => handleToggle("bookingConfirmationEnabled", value)}
                          data-testid="toggle-booking"
                        />
                      </div>
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Reminder Messages</CardTitle>
                          <CardDescription>Send pending task reminders</CardDescription>
                        </div>
                        <Switch
                          checked={currentSettings.reminderMessagesEnabled ?? true}
                          onCheckedChange={(value) => handleToggle("reminderMessagesEnabled", value)}
                          data-testid="toggle-reminder"
                        />
                      </div>
                    </CardHeader>
                  </Card>

                  <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-900 dark:text-blue-100">All settings are live</p>
                          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                            Changes apply immediately. Toggle any setting ON or OFF to control WhatsApp messages.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!propertyId && (
          <Card className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Select a property to manage WhatsApp settings</p>
          </Card>
        )}
      </div>
    </div>
  );
}
