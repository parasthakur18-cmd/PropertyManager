import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

  const handleToggle = async (field: keyof WhatsappSettings, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    await updateMutation.mutateAsync({ [field]: value });
  };

  const handlePropertyChange = (id: number) => {
    setPropertyId(id);
    setLocalSettings({});
  };

  const currentSettings = settings || localSettings;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">WhatsApp Notification Settings</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Control which WhatsApp messages are sent automatically to your guests
          </p>
        </div>

        {/* Property Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Select Property</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {properties?.map((prop) => (
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

        {/* Settings */}
        {propertyId && (
          <>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Check-in */}
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

                {/* Check-out */}
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

                {/* Enquiry Confirmation */}
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

                {/* Payment Request */}
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

                {/* Booking Confirmation */}
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

                {/* Reminder Messages */}
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

                {/* Status Card */}
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
          </>
        )}

        {!propertyId && (
          <Card className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Select a property to manage WhatsApp notifications</p>
          </Card>
        )}
      </div>
    </div>
  );
}
