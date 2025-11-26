import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Hotel, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertRoomSchema, type InsertRoom, type Room, type Property } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { triggerCompletionNotification } from "@/components/completion-notifications";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColors = {
  available: "bg-chart-5 text-white",
  occupied: "bg-destructive text-destructive-foreground",
  maintenance: "bg-amber-500 text-white",
  cleaning: "bg-chart-2 text-white",
};

export default function Rooms() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRoomType, setFilterRoomType] = useState<string>("all");
  const [quantity, setQuantity] = useState<number>(1);
  const { toast } = useToast();

  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const form = useForm<InsertRoom>({
    resolver: zodResolver(insertRoomSchema),
    defaultValues: {
      propertyId: 0,
      roomNumber: "",
      roomType: "",
      roomCategory: "standard",
      status: "available",
      pricePerNight: "0",
      maxOccupancy: 2,
      amenities: [],
    },
  });

  const selectedCategory = form.watch("roomCategory");

  const editForm = useForm<InsertRoom>({
    resolver: zodResolver(insertRoomSchema),
    defaultValues: {
      propertyId: 0,
      roomNumber: "",
      roomType: "",
      roomCategory: "standard",
      status: "available",
      pricePerNight: "0",
      maxOccupancy: 2,
      amenities: [],
    },
  });

  const selectedEditCategory = editForm.watch("roomCategory");

  const createMutation = useMutation({
    mutationFn: async (data: InsertRoom) => {
      const baseRoomNumber = parseInt(data.roomNumber);
      const roomsToCreate = [];
      
      for (let i = 0; i < quantity; i++) {
        roomsToCreate.push({
          ...data,
          roomNumber: (baseRoomNumber + i).toString(),
        });
      }
      
      // Create all rooms in parallel
      const results = await Promise.all(
        roomsToCreate.map(room => apiRequest("/api/rooms", "POST", room))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      const count = quantity > 1 ? `${quantity} rooms` : "Room";
      toast({
        title: "Success",
        description: `${count} created successfully`,
      });
      setIsDialogOpen(false);
      setQuantity(1);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertRoom }) => {
      return await apiRequest(`/api/rooms/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingRoom(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/rooms/${id}/status`, "PATCH", { status });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room status updated",
      });
      
      // Trigger completion notification if room becomes available
      if (variables.status === "available") {
        const room = rooms?.find(r => r.id === variables.id);
        triggerCompletionNotification(
          "room_ready",
          `✅ Room ${room?.roomNumber} cleaning completed and is ready!`
        );
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/rooms/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Success",
        description: "Room deleted successfully",
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

  const onSubmit = (data: InsertRoom) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertRoom) => {
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data });
    }
  };

  const handleEditClick = (room: Room) => {
    setEditingRoom(room);
    editForm.reset({
      propertyId: room.propertyId,
      roomNumber: room.roomNumber,
      roomType: room.roomType || "",
      roomCategory: room.roomCategory || "standard",
      status: room.status,
      pricePerNight: room.pricePerNight,
      maxOccupancy: room.maxOccupancy,
      totalBeds: room.totalBeds || undefined,
      amenities: room.amenities || [],
    });
    setIsEditDialogOpen(true);
  };

  const filteredRooms = rooms?.filter((room) => {
    if (filterProperty !== "all" && room.propertyId !== parseInt(filterProperty)) return false;
    if (filterStatus !== "all" && room.status !== filterStatus) return false;
    if (filterRoomType !== "all" && room.roomCategory !== filterRoomType) return false;
    return true;
  });

  // Calculate counts for tabs (considering property and room type filters)
  const baseFiltered = rooms?.filter((room) => {
    if (filterProperty !== "all" && room.propertyId !== parseInt(filterProperty)) return false;
    if (filterRoomType !== "all" && room.roomCategory !== filterRoomType) return false;
    return true;
  });

  const statusCounts = {
    all: baseFiltered?.length || 0,
    available: baseFiltered?.filter(r => r.status === "available").length || 0,
    cleaning: baseFiltered?.filter(r => r.status === "cleaning").length || 0,
    maintenance: baseFiltered?.filter(r => r.status === "maintenance").length || 0,
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif">Rooms</h1>
          <p className="text-muted-foreground mt-1">Manage room inventory and status</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-room">
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : ""}
                        disabled={propertiesLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-room-property">
                            <SelectValue placeholder={propertiesLoading ? "Loading properties..." : "Select property"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties && properties.length > 0 ? (
                            properties.map((property) => (
                              <SelectItem key={property.id} value={property.id.toString()}>
                                {property.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="_empty" disabled>
                              {propertiesLoading ? "Loading..." : "No properties available"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="roomNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starting Room Number</FormLabel>
                        <FormControl>
                          <Input placeholder="101" {...field} data-testid="input-room-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roomType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Deluxe" {...field} value={field.value || ""} data-testid="input-room-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>How Many Rooms?</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="100"
                        placeholder="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        data-testid="input-room-quantity"
                      />
                    </FormControl>
                  </FormItem>
                </div>
                <FormField
                  control={form.control}
                  name="roomCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "standard"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-room-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="deluxe">Deluxe</SelectItem>
                          <SelectItem value="suite">Suite</SelectItem>
                          <SelectItem value="dormitory">Dormitory</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedCategory === "dormitory" && (
                  <FormField
                    control={form.control}
                    name="totalBeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Beds (Dormitory)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            value={field.value || ""}
                            data-testid="input-total-beds"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricePerNight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Night (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5000" {...field} data-testid="input-room-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxOccupancy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Occupancy</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                            data-testid="input-room-occupancy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="bg-muted p-3 rounded-md text-sm">
                  {quantity > 1 ? (
                    <p className="text-muted-foreground">
                      Will create {quantity} rooms starting from room {form.watch("roomNumber")} 
                      {form.watch("roomNumber") && !isNaN(parseInt(form.watch("roomNumber"))) && (
                        <> (rooms {form.watch("roomNumber")} - {parseInt(form.watch("roomNumber")) + quantity - 1})</>
                      )}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Will create 1 room</p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-room">
                    {createMutation.isPending ? "Creating..." : `Create ${quantity > 1 ? quantity + " Rooms" : "Room"}`}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Room Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : ""}
                        disabled={propertiesLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="edit-select-property">
                            <SelectValue placeholder={propertiesLoading ? "Loading properties..." : "Select property"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties && properties.length > 0 ? (
                            properties.map((property) => (
                              <SelectItem key={property.id} value={property.id.toString()}>
                                {property.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="_empty" disabled>
                              {propertiesLoading ? "Loading..." : "No properties available"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="roomNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Number</FormLabel>
                        <FormControl>
                          <Input placeholder="101" {...field} data-testid="edit-input-room-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="roomType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Type</FormLabel>
                        <FormControl>
                          <Input placeholder="Deluxe" {...field} value={field.value || ""} data-testid="edit-input-room-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="roomCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "standard"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="edit-select-room-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="deluxe">Deluxe</SelectItem>
                          <SelectItem value="suite">Suite</SelectItem>
                          <SelectItem value="dormitory">Dormitory</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedEditCategory === "dormitory" && (
                  <FormField
                    control={editForm.control}
                    name="totalBeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Beds (Dormitory)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            value={field.value || ""}
                            data-testid="edit-input-total-beds"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="pricePerNight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Night (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5000" {...field} data-testid="edit-input-room-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="maxOccupancy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Occupancy</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                            data-testid="edit-input-room-occupancy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="edit-select-room-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-room">
                    {updateMutation.isPending ? "Updating..." : "Update Room"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-48" data-testid="filter-property">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties?.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterRoomType} onValueChange={setFilterRoomType}>
            <SelectTrigger className="w-48" data-testid="filter-room-type">
              <SelectValue placeholder="All Room Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Room Types</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="deluxe">Deluxe</SelectItem>
              <SelectItem value="suite">Suite</SelectItem>
              <SelectItem value="dormitory">Dormitory</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4" data-testid="status-tabs">
            <TabsTrigger value="all" data-testid="tab-all-statuses">All ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="available" data-testid="tab-available">Available ({statusCounts.available})</TabsTrigger>
            <TabsTrigger value="cleaning" data-testid="tab-cleaning">Cleaning ({statusCounts.cleaning})</TabsTrigger>
            <TabsTrigger value="maintenance" data-testid="tab-maintenance">Maintenance ({statusCounts.maintenance})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!filteredRooms || filteredRooms.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Hotel className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-semibold">No rooms found</h3>
            <p className="text-muted-foreground max-w-md">
              {filterProperty !== "all" || filterStatus !== "all"
                ? "Try adjusting your filters"
                : "Get started by adding your first room"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const property = properties?.find((p) => p.id === room.propertyId);
            return (
              <Card key={room.id} className="hover-elevate" data-testid={`card-room-${room.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-mono font-bold" data-testid={`text-room-number-${room.id}`}>
                        {room.roomNumber}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {property?.name || "Unknown Property"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditClick(room)}
                        data-testid={`button-edit-room-${room.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(room.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-room-${room.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge className={statusColors[room.status as keyof typeof statusColors] || ""} data-testid={`badge-room-status-${room.id}`}>
                      {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                    </Badge>
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground" data-testid={`text-room-type-${room.id}`}>{room.roomType || "Standard"}</p>
                      <div className="text-xs text-muted-foreground capitalize flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {room.roomCategory || "standard"}
                        </Badge>
                        {room.roomCategory === "dormitory" && room.totalBeds && (
                          <span>• {room.totalBeds} beds</span>
                        )}
                      </div>
                      <p className="font-semibold font-mono text-lg" data-testid={`text-room-price-${room.id}`}>₹{room.pricePerNight}{room.roomCategory === "dormitory" ? "/bed/night" : "/night"}</p>
                      <p className="text-muted-foreground" data-testid={`text-room-occupancy-${room.id}`}>Max: {room.maxOccupancy} guests</p>
                    </div>
                    <Select
                      value={room.status}
                      onValueChange={(value) => updateStatusMutation.mutate({ id: room.id, status: value })}
                    >
                      <SelectTrigger className="w-full" data-testid={`select-room-status-${room.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
