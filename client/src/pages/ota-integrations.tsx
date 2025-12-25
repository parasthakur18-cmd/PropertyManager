import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Property } from "@shared/schema";
import { AlertCircle, CheckCircle, Trash2, Plus, RefreshCw, Settings, Link2, MapPin, ArrowRight, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const OTA_LIST = [
  { value: "beds24", label: "Beds24 Channel Manager", description: "Connect to Booking.com, Airbnb, Expedia via Beds24" },
  { value: "booking.com", label: "Booking.com Direct", description: "Direct API integration" },
  { value: "mmt", label: "MMT (Make My Trip)", description: "India's leading travel platform" },
  { value: "airbnb", label: "Airbnb", description: "Short-term rental platform" },
  { value: "oyo", label: "OYO Rooms", description: "Budget hotel chain" },
  { value: "agoda", label: "Agoda", description: "Asia-Pacific booking platform" },
  { value: "expedia", label: "Expedia", description: "Global travel company" },
  { value: "tripadvisor", label: "TripAdvisor", description: "Travel review platform" },
];

export default function OtaIntegrations() {
  const { toast } = useToast();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRoomMappingOpen, setIsRoomMappingOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [selectedOta, setSelectedOta] = useState("");
  const [propertyIdExternal, setPropertyIdExternal] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showKeys, setShowKeys] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: integrations = [], refetch: refetchIntegrations } = useQuery({
    queryKey: ["/api/ota/integrations", selectedPropertyId],
    enabled: !!selectedPropertyId,
  });

  const { data: roomTypes = [] } = useQuery<string[]>({
    queryKey: ["/api/rooms/types", selectedPropertyId],
    enabled: !!selectedPropertyId,
  });

  const { data: roomMappings = [], refetch: refetchMappings } = useQuery({
    queryKey: ["/api/beds24/room-mappings", selectedPropertyId],
    enabled: !!selectedPropertyId,
  });

  const addIntegrationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPropertyId || !selectedOta) {
        throw new Error("Property and OTA type required");
      }
      if (!apiKey) {
        throw new Error("Property Key is required for Beds24");
      }

      return await apiRequest("/api/ota/integrations", "POST", {
        propertyId: parseInt(selectedPropertyId),
        otaName: selectedOta,
        propertyId_external: propertyIdExternal || apiKey,
        apiKey: apiKey,
        apiSecret: apiSecret || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "OTA integration added successfully. Now set up room mappings.",
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
  });

  const syncMutation = useMutation({
    mutationFn: async ({ integrationId, otaName }: { integrationId: number; otaName: string }) => {
      setSyncProgress("Connecting to Beds24...");
      if (otaName === "beds24") {
        const result = await apiRequest(`/api/beds24/sync/${integrationId}`, "POST", {});
        return result;
      }
      return await apiRequest(`/api/ota/sync/${integrationId}`, "POST", {});
    },
    onSuccess: (data: any) => {
      setSyncProgress(null);
      toast({
        title: "Sync Complete",
        description: `Synced ${data.synced || 0} new bookings. ${data.skipped || 0} already existed.`,
      });
      refetchIntegrations();
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      setSyncProgress(null);
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addMappingMutation = useMutation({
    mutationFn: async ({ beds24RoomId, beds24RoomName, roomType }: { beds24RoomId: string; beds24RoomName: string; roomType: string }) => {
      return await apiRequest("/api/beds24/room-mappings", "POST", {
        propertyId: parseInt(selectedPropertyId),
        beds24RoomId,
        beds24RoomName,
        roomType,
      });
    },
    onSuccess: () => {
      toast({ title: "Room mapping saved" });
      refetchMappings();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/beds24/room-mappings/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Mapping deleted" });
      refetchMappings();
    },
  });

  const getOtaLabel = (otaName: string) => {
    return OTA_LIST.find(o => o.value === otaName)?.label || otaName;
  };

  const beds24Integration = (integrations as any[]).find((i: any) => i.otaName === "beds24");

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif mb-2">OTA Integrations</h1>
        <p className="text-muted-foreground">Connect your property to booking platforms and sync reservations automatically</p>
      </div>

      <div className="space-y-6">
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
          <Tabs defaultValue="integrations">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
              <TabsTrigger value="room-mapping" data-testid="tab-room-mapping">Room Mapping</TabsTrigger>
            </TabsList>

            <TabsContent value="integrations" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Active Integrations</h2>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-ota">
                      <Plus className="h-4 w-4 mr-2" />
                      Add OTA
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Connect Beds24 Channel Manager</DialogTitle>
                      <DialogDescription>
                        Beds24 connects your property to Booking.com, Airbnb, Expedia, and more.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="setup-guide">
                        <AccordionTrigger className="text-sm">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            How to find your Beds24 Property Key
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm space-y-2">
                          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                            <li>Log in to your Beds24 account</li>
                            <li>Go to <strong>Settings</strong> → <strong>Properties</strong></li>
                            <li>Select your property</li>
                            <li>Go to <strong>Access</strong> tab</li>
                            <li>Copy the <strong>Property Key</strong></li>
                          </ol>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="space-y-4">
                      <div>
                        <Label>Platform</Label>
                        <Select value={selectedOta} onValueChange={setSelectedOta}>
                          <SelectTrigger data-testid="select-ota-type">
                            <SelectValue placeholder="Select Beds24" />
                          </SelectTrigger>
                          <SelectContent>
                            {OTA_LIST.map((ota) => (
                              <SelectItem key={ota.value} value={ota.value}>
                                <div>
                                  <div>{ota.label}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="api-key">Property Key (propKey)</Label>
                        <Input
                          id="api-key"
                          type={showKeys ? "text" : "password"}
                          placeholder="Enter your Beds24 Property Key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          data-testid="input-api-key-ota"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Found in Beds24: Settings → Properties → Access → Property Key
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowKeys(!showKeys)}
                      >
                        {showKeys ? "Hide" : "Show"} Key
                      </Button>

                      <Button
                        onClick={() => addIntegrationMutation.mutate()}
                        disabled={addIntegrationMutation.isPending || !apiKey || !selectedOta}
                        className="w-full"
                        data-testid="button-save-ota"
                      >
                        {addIntegrationMutation.isPending ? "Adding..." : "Connect Beds24"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {(integrations as any[]).length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">No OTA integrations yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Connect your Beds24 account to automatically sync bookings from Booking.com, Airbnb, and other platforms.
                    </p>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      Connect Beds24
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {(integrations as any[]).map((integration: any) => (
                    <Card key={integration.id} data-testid={`ota-card-${integration.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{getOtaLabel(integration.otaName)}</h3>
                              <Badge variant={integration.enabled ? "secondary" : "outline"}>
                                {integration.enabled ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            
                            {integration.otaName === "beds24" && (
                              <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-2">
                                <div>
                                  <p className="font-medium text-xs uppercase text-muted-foreground">Webhook URL (paste in Beds24):</p>
                                  <code className="text-xs break-all block mt-1 p-2 bg-background rounded">
                                    {window.location.origin}/api/beds24/webhook
                                  </code>
                                </div>
                              </div>
                            )}
                            
                            {integration.lastSyncAt && (
                              <p className="text-xs text-muted-foreground mt-2">
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
                          
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => syncMutation.mutate({ integrationId: integration.id, otaName: integration.otaName })}
                              disabled={syncMutation.isPending}
                              data-testid={`button-sync-${integration.id}`}
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                              {syncMutation.isPending ? syncProgress || "Syncing..." : "Sync Now"}
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

              {beds24Integration && (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Next Step:</strong> Go to the "Room Mapping" tab to connect Beds24 room types to your Hostezee rooms.
                    This ensures bookings are assigned to the correct rooms automatically.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="room-mapping" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Room Type Mapping
                  </CardTitle>
                  <CardDescription>
                    Map Beds24 room categories to your Hostezee room types so bookings get assigned to the correct rooms.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roomTypes.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No room types found. Please add rooms with room types first in the Rooms page.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground mb-4">
                        <strong>Your Hostezee Room Types:</strong> {roomTypes.join(", ")}
                      </div>

                      {/* Existing Mappings */}
                      {(roomMappings as any[]).length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Current Mappings</h4>
                          {(roomMappings as any[]).map((mapping: any) => (
                            <div key={mapping.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{mapping.beds24RoomId}</Badge>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <Badge>{mapping.roomType}</Badge>
                                {mapping.beds24RoomName && (
                                  <span className="text-xs text-muted-foreground">({mapping.beds24RoomName})</span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMappingMutation.mutate(mapping.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add New Mapping */}
                      <RoomMappingForm
                        roomTypes={roomTypes}
                        onAdd={(beds24RoomId, beds24RoomName, roomType) => {
                          addMappingMutation.mutate({ beds24RoomId, beds24RoomName, roomType });
                        }}
                        isPending={addMappingMutation.isPending}
                      />

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>How to find Beds24 Room IDs:</strong>
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                            <li>Click "Sync Now" on your Beds24 integration</li>
                            <li>Look at the booking details - they show which room ID was used</li>
                            <li>Or check Beds24 dashboard: Properties → Rooms → Room ID shown in URL</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Setup Guide for new users */}
        {!selectedPropertyId && (
          <Card>
            <CardHeader>
              <CardTitle>Getting Started with OTA Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                  <div>
                    <h4 className="font-medium">Select Your Property</h4>
                    <p className="text-sm text-muted-foreground">Choose the property you want to connect to booking platforms</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                  <div>
                    <h4 className="font-medium">Connect Beds24</h4>
                    <p className="text-sm text-muted-foreground">Add your Beds24 Property Key to enable syncing from Booking.com, Airbnb, etc.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                  <div>
                    <h4 className="font-medium">Map Room Types</h4>
                    <p className="text-sm text-muted-foreground">Connect Beds24 room categories to your Hostezee rooms for automatic assignment</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
                  <div>
                    <h4 className="font-medium">Sync Bookings</h4>
                    <p className="text-sm text-muted-foreground">Click "Sync Now" to import bookings. Set up Beds24 webhook for real-time updates.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function RoomMappingForm({ 
  roomTypes, 
  onAdd, 
  isPending 
}: { 
  roomTypes: string[]; 
  onAdd: (beds24RoomId: string, beds24RoomName: string, roomType: string) => void;
  isPending: boolean;
}) {
  const [beds24RoomId, setBeds24RoomId] = useState("");
  const [beds24RoomName, setBeds24RoomName] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("");

  const handleSubmit = () => {
    if (beds24RoomId && selectedRoomType) {
      onAdd(beds24RoomId, beds24RoomName, selectedRoomType);
      setBeds24RoomId("");
      setBeds24RoomName("");
      setSelectedRoomType("");
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h4 className="font-medium">Add New Mapping</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Beds24 Room ID</Label>
          <Input
            placeholder="e.g., 637602"
            value={beds24RoomId}
            onChange={(e) => setBeds24RoomId(e.target.value)}
            data-testid="input-beds24-room-id"
          />
        </div>
        <div>
          <Label>Room Name (optional)</Label>
          <Input
            placeholder="e.g., Deluxe Room"
            value={beds24RoomName}
            onChange={(e) => setBeds24RoomName(e.target.value)}
            data-testid="input-beds24-room-name"
          />
        </div>
        <div>
          <Label>Hostezee Room Type</Label>
          <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
            <SelectTrigger data-testid="select-room-type">
              <SelectValue placeholder="Select room type" />
            </SelectTrigger>
            <SelectContent>
              {roomTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isPending || !beds24RoomId || !selectedRoomType}
        data-testid="button-add-mapping"
      >
        {isPending ? "Adding..." : "Add Mapping"}
      </Button>
    </div>
  );
}
