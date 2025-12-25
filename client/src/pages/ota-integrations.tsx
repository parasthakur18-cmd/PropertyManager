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
import { AlertCircle, CheckCircle, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const OTA_LIST = [
  { value: "beds24", label: "Beds24 Channel Manager" },
  { value: "booking.com", label: "Booking.com" },
  { value: "mmt", label: "MMT (Make My Trip)" },
  { value: "airbnb", label: "Airbnb" },
  { value: "oyo", label: "OYO Rooms" },
  { value: "agoda", label: "Agoda" },
  { value: "expedia", label: "Expedia" },
  { value: "tripadvisor", label: "TripAdvisor" },
  { value: "other", label: "Other Platform" },
];

export default function OtaIntegrations() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedOta, setSelectedOta] = useState("");
  const [propertyIdExternal, setPropertyIdExternal] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showKeys, setShowKeys] = useState(false);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: integrations = [], refetch: refetchIntegrations } = useQuery({
    queryKey: ["/api/ota/integrations", selectedPropertyId],
    enabled: !!selectedPropertyId,
  });

  const addIntegrationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPropertyId || !selectedOta || !propertyIdExternal) {
        throw new Error("Property, OTA type, and external property ID required");
      }
      if (!apiKey && !apiSecret) {
        throw new Error("At least API Key or Secret required");
      }

      return await apiRequest("/api/ota/integrations", "POST", {
        propertyId: parseInt(selectedPropertyId),
        otaName: selectedOta,
        propertyId_external: propertyIdExternal,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "OTA integration added successfully",
      });
      setSelectedOta("");
      setPropertyIdExternal("");
      setApiKey("");
      setApiSecret("");
      setIsAddDialogOpen(false);
      refetchIntegrations();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/ota/integrations/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Integration removed",
      });
      refetchIntegrations();
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
    mutationFn: async ({ integrationId, otaName }: { integrationId: number; otaName: string }) => {
      if (otaName === "beds24") {
        return await apiRequest(`/api/beds24/sync/${integrationId}`, "POST", {});
      }
      return await apiRequest(`/api/ota/sync/${integrationId}`, "POST", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Sync Complete",
        description: data.message || "Sync completed successfully",
      });
      refetchIntegrations();
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getOtaLabel = (otaName: string) => {
    return OTA_LIST.find(o => o.value === otaName)?.label || otaName;
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif mb-2">OTA Integrations</h1>
        <p className="text-muted-foreground">Connect your property to multiple booking platforms</p>
      </div>

      <div className="space-y-6">
        {/* Property Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Property</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger data-testid="select-property-ota">
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
            {/* Active Integrations */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Active Integrations</h2>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-ota">
                      <Plus className="h-4 w-4 mr-2" />
                      Add OTA
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Connect New OTA Platform</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="ota-select">Select Platform</Label>
                        <Select value={selectedOta} onValueChange={setSelectedOta}>
                          <SelectTrigger id="ota-select" data-testid="select-ota-type">
                            <SelectValue placeholder="Choose platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {OTA_LIST.map((ota) => (
                              <SelectItem key={ota.value} value={ota.value}>
                                {ota.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="external-id">External Property ID</Label>
                        <Input
                          id="external-id"
                          placeholder="Hotel ID / Property ID on the platform"
                          value={propertyIdExternal}
                          onChange={(e) => setPropertyIdExternal(e.target.value)}
                          data-testid="input-external-property-id"
                        />
                      </div>

                      <div>
                        <Label htmlFor="api-key">
                          {selectedOta === "beds24" ? "Property Key (propKey)" : "API Key"}
                        </Label>
                        <Input
                          id="api-key"
                          type={showKeys ? "text" : "password"}
                          placeholder={selectedOta === "beds24" ? "Your Beds24 Property Key" : "Your API Key"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          data-testid="input-api-key-ota"
                        />
                        {selectedOta === "beds24" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Find in Beds24: Settings &gt; Properties &gt; Access &gt; Property Key
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="api-secret">API Secret (if required)</Label>
                        <Input
                          id="api-secret"
                          type={showKeys ? "text" : "password"}
                          placeholder="Your API Secret (optional)"
                          value={apiSecret}
                          onChange={(e) => setApiSecret(e.target.value)}
                          data-testid="input-api-secret"
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowKeys(!showKeys)}
                        data-testid="button-show-keys"
                      >
                        {showKeys ? "Hide" : "Show"} Credentials
                      </Button>

                      <Button
                        onClick={() => addIntegrationMutation.mutate()}
                        disabled={addIntegrationMutation.isPending}
                        className="w-full"
                        data-testid="button-save-ota"
                      >
                        {addIntegrationMutation.isPending ? "Adding..." : "Add Integration"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {(integrations as any[]).length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No OTA integrations connected yet</p>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                    Connect Your First OTA
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {(integrations as any[]).map((integration: any) => (
                    <Card key={integration.id} data-testid={`ota-card-${integration.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{getOtaLabel(integration.otaName)}</h3>
                              <Badge variant={integration.enabled ? "secondary" : "outline"}>
                                {integration.enabled ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              ID: {integration.propertyId_external || integration.apiKey?.substring(0, 8) + "..."}
                            </p>
                            {integration.otaName === "beds24" && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <p className="font-medium">Webhook URL (for Beds24):</p>
                                <code className="text-xs break-all">{window.location.origin}/api/beds24/webhook</code>
                              </div>
                            )}
                            {integration.lastSyncAt && (
                              <p className="text-xs text-muted-foreground">
                                Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                              </p>
                            )}
                            {integration.syncErrorMessage && (
                              <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="h-3 w-3" />
                                <AlertDescription className="text-xs">{integration.syncErrorMessage}</AlertDescription>
                              </Alert>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => syncMutation.mutate({ integrationId: integration.id, otaName: integration.otaName })}
                              disabled={syncMutation.isPending}
                              data-testid={`button-sync-${integration.id}`}
                            >
                              {integration.otaName === "beds24" ? "Sync Beds24" : "Sync Now"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteIntegrationMutation.mutate(integration.id)}
                              disabled={deleteIntegrationMutation.isPending}
                              data-testid={`button-delete-${integration.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
