import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Property } from "@shared/schema";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BookingComIntegration() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [hotelId, setHotelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: credentials, refetch: refetchCredentials } = useQuery({
    queryKey: ["/api/bookingcom/credentials", selectedPropertyId],
    enabled: !!selectedPropertyId,
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPropertyId || !hotelId || !apiKey) {
        throw new Error("All fields are required");
      }
      return await apiRequest("/api/bookingcom/credentials", "POST", {
        propertyId: parseInt(selectedPropertyId),
        hotelId,
        apiKey,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Booking.com credentials saved successfully",
      });
      setHotelId("");
      setApiKey("");
      refetchCredentials();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPropertyId) {
        throw new Error("Please select a property");
      }
      return await apiRequest(`/api/bookingcom/sync/${selectedPropertyId}`, "POST", {});
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: data.message,
      });
      refetchCredentials();
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePropertyChange = (value: string) => {
    setSelectedPropertyId(value);
    setHotelId("");
    setApiKey("");
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif mb-2">Booking.com Integration</h1>
        <p className="text-muted-foreground">Sync reservations from Booking.com into Hostezee</p>
      </div>

      <div className="space-y-6">
        {/* Property Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Property</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger data-testid="select-property-booking-com">
                <SelectValue placeholder="Choose a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id.toString()}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedPropertyId && (
          <>
            {/* Credentials Setup */}
            <Card>
              <CardHeader>
                <CardTitle>Setup Booking.com Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {credentials && credentials.hotelId && (
                  <Alert className="border-chart-5 bg-chart-5/10">
                    <CheckCircle className="h-4 w-4 text-chart-5" />
                    <AlertDescription>
                      Integration is active for property. Last sync: {credentials.lastSyncAt ? new Date(credentials.lastSyncAt).toLocaleString() : "Never"}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hotelId">Hotel ID</Label>
                    <Input
                      id="hotelId"
                      placeholder="Enter your Booking.com Hotel ID"
                      value={hotelId}
                      onChange={(e) => setHotelId(e.target.value)}
                      data-testid="input-hotel-id"
                    />
                  </div>

                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="apiKey"
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter your Booking.com API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        data-testid="input-api-key"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => setShowApiKey(!showApiKey)}
                        data-testid="button-toggle-api-key"
                      >
                        {showApiKey ? "Hide" : "Show"}
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={() => saveCredentialsMutation.mutate()}
                    disabled={saveCredentialsMutation.isPending || !hotelId || !apiKey}
                    data-testid="button-save-credentials"
                  >
                    {saveCredentialsMutation.isPending ? "Saving..." : "Save Credentials"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sync Control */}
            {credentials && credentials.hotelId && (
              <Card>
                <CardHeader>
                  <CardTitle>Sync Reservations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    {credentials.syncStatus === "syncing" && (
                      <Badge className="flex gap-2">
                        <Loader className="h-3 w-3 animate-spin" />
                        Syncing...
                      </Badge>
                    )}
                    {credentials.syncStatus === "success" && (
                      <Badge variant="secondary" className="flex gap-2 bg-chart-5/10 text-chart-5">
                        <CheckCircle className="h-3 w-3" />
                        Last sync successful
                      </Badge>
                    )}
                    {credentials.syncStatus === "failed" && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Sync failed
                      </Badge>
                    )}
                  </div>

                  <Button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending || credentials.syncStatus === "syncing"}
                    data-testid="button-sync-now"
                  >
                    {syncMutation.isPending ? "Syncing..." : "Sync Now"}
                  </Button>

                  {credentials.syncErrorMessage && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{credentials.syncErrorMessage}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
