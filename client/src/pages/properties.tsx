import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MapPin, Phone, Mail, Edit, Trash2, Download, PowerOff, Power, ShieldAlert, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertPropertySchema, type InsertProperty, type Property } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Properties() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [disablingProperty, setDisablingProperty] = useState<Property | null>(null);
  const [disableType, setDisableType] = useState<"temporary" | "permanent">("temporary");
  const [disableReason, setDisableReason] = useState("");
  const [permanentAction, setPermanentAction] = useState<"archive" | "delete">("archive");
  const { toast } = useToast();

  const { data: allProperties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const activeProperties = useMemo(() => (allProperties || []).filter((p: any) => p.isActive !== false), [allProperties]);
  const disabledProperties = useMemo(() => (allProperties || []).filter((p: any) => p.isActive === false), [allProperties]);

  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
      totalRooms: 0,
      contactEmail: "",
      contactPhone: "",
      monthlyRent: "0",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      return await apiRequest("/api/properties", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Success", description: "Property created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProperty> }) => {
      return await apiRequest(`/api/properties/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Success", description: "Property updated successfully" });
      setIsDialogOpen(false);
      setEditingProperty(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/properties/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Success", description: "Property permanently deleted" });
      setIsDisableDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async ({ id, disableType, disableReason }: { id: number; disableType: string; disableReason?: string }) => {
      return await apiRequest(`/api/properties/${id}/disable`, "POST", { disableType, disableReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      const label = disableType === "permanent" ? "permanently closed" : "temporarily disabled";
      toast({ title: "Property Disabled", description: `${disablingProperty?.name} has been ${label}.` });
      setIsDisableDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const enableMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/properties/${id}/enable`, "POST", {});
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Property Re-enabled", description: "The property is now active again." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    form.reset({
      name: property.name,
      location: property.location || "",
      description: property.description || "",
      totalRooms: property.totalRooms,
      contactEmail: property.contactEmail || "",
      contactPhone: property.contactPhone || "",
      monthlyRent: property.monthlyRent || "0",
      isActive: property.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const openDisableDialog = (property: Property) => {
    setDisablingProperty(property);
    setDisableType("temporary");
    setDisableReason("");
    setPermanentAction("archive");
    setIsDisableDialogOpen(true);
  };

  const handleConfirmDisable = () => {
    if (!disablingProperty) return;
    if (disableType === "permanent" && permanentAction === "delete") {
      deleteMutation.mutate(disablingProperty.id);
    } else {
      disableMutation.mutate({ id: disablingProperty.id, disableType, disableReason });
    }
  };

  const onSubmit = (data: InsertProperty) => {
    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleExportProperty = async (propertyId: number, propertyName: string) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}/export`);
      if (!response.ok) {
        toast({ title: "Export Failed", description: "Failed to export property data", variant: "destructive" });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${propertyName.replace(/\s+/g, "-")}-export-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: `All data for "${propertyName}" has been downloaded` });
    } catch (error: any) {
      toast({ title: "Export Error", description: error.message || "Failed to export data", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your resort properties</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingProperty(null); form.reset(); }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-property">
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProperty ? "Edit Property" : "Add New Property"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Mountain View Resort" {...field} data-testid="input-property-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Shimla, Himachal Pradesh" {...field} value={field.value || ""} data-testid="input-property-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A beautiful resort nestled in the mountains..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-property-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Rooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-property-total-rooms"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="info@resort.com" {...field} value={field.value || ""} data-testid="input-property-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 98765 43210" {...field} value={field.value || ""} data-testid="input-property-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="monthlyRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent (for P&L)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="20000"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          data-testid="input-property-monthly-rent"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Used in monthly P&L reports when no lease is defined
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-property">
                    {createMutation.isPending ? "Creating..." : updateMutation.isPending ? "Saving..." : editingProperty ? "Save Changes" : "Create Property"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Properties */}
      {activeProperties.length === 0 && disabledProperties.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-semibold">No properties yet</h3>
            <p className="text-muted-foreground max-w-md">
              Get started by adding your first property to the system
            </p>
          </div>
        </Card>
      ) : (
        <>
          {activeProperties.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Active Properties ({activeProperties.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProperties.map((property: any) => (
                  <Card key={property.id} className="hover-elevate" data-testid={`card-property-${property.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <span data-testid={`text-property-name-${property.id}`}>{property.name}</span>
                            <Badge variant="default" className="text-xs">Active</Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-2">
                            <MapPin className="h-3 w-3" />
                            <span data-testid={`text-property-location-${property.id}`}>{property.location || "No location"}</span>
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(property)}
                            title="Edit property"
                            data-testid={`button-edit-property-${property.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleExportProperty(property.id, property.name)}
                            title="Download all property data"
                            data-testid={`button-export-property-${property.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openDisableDialog(property)}
                            title="Disable or close property"
                            data-testid={`button-disable-property-${property.id}`}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {property.description || "No description"}
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span data-testid={`text-property-phone-${property.id}`}>{property.contactPhone || "No phone"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span data-testid={`text-property-email-${property.id}`}>{property.contactEmail || "No email"}</span>
                        </div>
                        <div className="text-lg font-semibold font-mono mt-4" data-testid={`text-property-rooms-${property.id}`}>
                          {property.totalRooms} Rooms
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Disabled / Closed Properties */}
          {disabledProperties.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Disabled / Closed Properties ({disabledProperties.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {disabledProperties.map((property: any) => (
                  <Card key={property.id} className="border-red-200 dark:border-red-900 opacity-80" data-testid={`card-property-disabled-${property.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 flex-wrap">
                            <span>{property.name}</span>
                            <Badge
                              variant="outline"
                              className={property.disableType === "permanent"
                                ? "border-red-400 text-red-600 text-xs"
                                : "border-yellow-400 text-yellow-700 text-xs"}
                            >
                              {property.disableType === "permanent" ? "Permanently Closed" : "Under Maintenance"}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-2">
                            <MapPin className="h-3 w-3" />
                            {property.location || "No location"}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleExportProperty(property.id, property.name)}
                            title="Download historical data"
                            data-testid={`button-export-disabled-property-${property.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {property.disableReason && (
                        <p className="text-sm text-muted-foreground italic mb-3">
                          Reason: {property.disableReason}
                        </p>
                      )}
                      {property.closedAt && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Closed on: {new Date(property.closedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground mb-4">{property.totalRooms} Rooms</div>
                      {property.disableType !== "permanent" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-green-300 text-green-700 hover:bg-green-50"
                          disabled={enableMutation.isPending}
                          onClick={() => enableMutation.mutate(property.id)}
                          data-testid={`button-enable-property-${property.id}`}
                        >
                          <Power className="h-4 w-4 mr-2" />
                          Re-enable Property
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Disable Property Dialog */}
      <Dialog open={isDisableDialogOpen} onOpenChange={setIsDisableDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <PowerOff className="h-5 w-5" />
              Disable Property
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to disable <strong>{disablingProperty?.name}</strong>. Choose the type of closure:
            </p>

            {/* Disable type selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Closure Type</label>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setDisableType("temporary")}
                  className={`border rounded-lg p-3 text-sm text-left transition-colors ${disableType === "temporary" ? "border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200" : "border-border hover:bg-muted"}`}
                  data-testid="button-property-disable-type-temporary"
                >
                  <div className="font-semibold flex items-center gap-2">
                    🔧 Temporary — Under Maintenance / Construction
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Property stays in system. No new bookings allowed. Operations paused. Can be re-enabled later.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDisableType("permanent")}
                  className={`border rounded-lg p-3 text-sm text-left transition-colors ${disableType === "permanent" ? "border-red-400 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" : "border-border hover:bg-muted"}`}
                  data-testid="button-property-disable-type-permanent"
                >
                  <div className="font-semibold flex items-center gap-2">
                    🔒 Permanent — Property Closed / Sold
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Property is permanently removed from operations. Cannot be re-enabled.
                  </div>
                </button>
              </div>
            </div>

            {/* Permanent action choice */}
            {disableType === "permanent" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">What to do with the data?</label>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setPermanentAction("archive")}
                    className={`border rounded-lg p-3 text-sm text-left transition-colors ${permanentAction === "archive" ? "border-orange-400 bg-orange-50 text-orange-800 dark:bg-orange-950" : "border-border hover:bg-muted"}`}
                    data-testid="button-permanent-action-archive"
                  >
                    <div className="font-semibold">📦 Keep Records (Recommended)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Booking history, revenue, and reports are preserved for reference</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermanentAction("delete")}
                    className={`border rounded-lg p-3 text-sm text-left transition-colors ${permanentAction === "delete" ? "border-red-500 bg-red-50 text-red-800 dark:bg-red-950" : "border-border hover:bg-muted"}`}
                    data-testid="button-permanent-action-delete"
                  >
                    <div className="font-semibold">🗑️ Delete Everything</div>
                    <div className="text-xs text-red-600 mt-0.5">⚠️ Permanently deletes all rooms, bookings, and data. Cannot be undone.</div>
                  </button>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="e.g. Renovation underway, Property sold, Seasonal closure..."
                data-testid="input-property-disable-reason"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsDisableDialogOpen(false)}
                data-testid="button-cancel-property-disable"
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 text-white ${disableType === "permanent" && permanentAction === "delete" ? "bg-red-700 hover:bg-red-800" : "bg-red-600 hover:bg-red-700"}`}
                disabled={disableMutation.isPending || deleteMutation.isPending}
                onClick={handleConfirmDisable}
                data-testid="button-confirm-property-disable"
              >
                {disableMutation.isPending || deleteMutation.isPending
                  ? "Processing..."
                  : disableType === "permanent" && permanentAction === "delete"
                    ? "Delete Property"
                    : disableType === "permanent"
                      ? "Close Permanently"
                      : "Disable Temporarily"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
