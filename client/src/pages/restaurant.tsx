import { useQuery, useMutation } from "@tanstack/react-query";
import { ChefHat, Clock, CheckCircle, User, Phone, Bell, BellOff, Settings, Edit, Trash2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Order } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useEffect, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, ChevronsUpDown } from "lucide-react";

const statusColors = {
  pending: "bg-amber-500 text-white",
  preparing: "bg-chart-2 text-white",
  ready: "bg-chart-5 text-white",
  delivered: "bg-muted text-muted-foreground",
  rejected: "bg-destructive text-destructive-foreground",
};

export default function Kitchen() {
  const { toast } = useToast();
  const { 
    playNotification, 
    isEnabled, 
    setIsEnabled,
    alarmTone,
    setAlarmTone,
    repeatCount,
    setRepeatCount,
    volume,
    setVolume
  } = useNotificationSound();
  const previousOrderCountRef = useRef<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [editDialog, setEditDialog] = useState<{ open: boolean; order: any | null }>({
    open: false,
    order: null,
  });
  const [editedItems, setEditedItems] = useState<Array<{ name: string; quantity: number; price: string }>>([]);
  const [menuSearchOpen, setMenuSearchOpen] = useState(false);

  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds to detect new orders
    staleTime: 0, // Always consider data stale so it refetches
    refetchOnWindowFocus: true, // Refetch when switching to this tab
  });
  
  const { data: menuItems } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
  });

  // Play notification sound when new orders arrive
  useEffect(() => {
    if (orders) {
      const pendingCount = orders.filter(o => o.status === 'pending').length;
      
      // Play sound if we have new pending orders
      // Skip only on initial load (when previousOrderCountRef is null)
      if (previousOrderCountRef.current !== null && pendingCount > previousOrderCountRef.current) {
        playNotification();
        toast({
          title: "New Order Received!",
          description: `You have ${pendingCount} pending order${pendingCount > 1 ? 's' : ''}`,
        });
      }
      
      // Always update the ref, even if count is 0
      previousOrderCountRef.current = pendingCount;
    }
  }, [orders, playNotification, toast]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/orders/${id}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      toast({
        title: "Success",
        description: "Order status updated",
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
  
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, items }: { id: number; items: any[] }) => {
      const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
      return await apiRequest(`/api/orders/${id}`, "PATCH", { items, totalAmount: totalAmount.toFixed(2) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/active"] });
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
      setEditDialog({ open: false, order: null });
      setEditedItems([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Functions for managing edited items
  const openEditDialog = (order: any) => {
    setEditDialog({ open: true, order });
    setEditedItems(JSON.parse(JSON.stringify(order.items))); // Deep clone
  };
  
  const updateItemQuantity = (index: number, quantity: number) => {
    const updated = [...editedItems];
    updated[index].quantity = quantity;
    setEditedItems(updated);
  };
  
  const removeItem = (index: number) => {
    if (editedItems.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "An order must have at least one item",
        variant: "destructive",
      });
      return;
    }
    setEditedItems(editedItems.filter((_, i) => i !== index));
  };
  
  const addNewItem = (menuItem: any) => {
    setEditedItems([...editedItems, {
      name: menuItem.name,
      quantity: 1,
      price: menuItem.price,
    }]);
  };
  
  const saveOrder = () => {
    if (!editDialog.order || editedItems.length === 0) return;
    updateOrderMutation.mutate({ id: editDialog.order.id, items: editedItems });
  };

  // Filter orders based on active tab
  const allActiveOrders = orders?.filter((order) => order.status === "pending" || order.status === "preparing" || order.status === "ready") || [];
  const pendingOrders = orders?.filter((order) => order.status === "pending") || [];
  const completedOrders = orders?.filter((order) => order.status === "delivered") || [];
  const rejectedOrders = orders?.filter((order) => order.status === "rejected") || [];
  
  // Calculate counts for badges
  const orderCounts = {
    active: allActiveOrders.length,
    pending: pendingOrders.length,
    completed: completedOrders.length,
    rejected: rejectedOrders.length,
  };
  
  // Get filtered orders based on active tab
  let filteredOrders: any[] = [];
  if (activeTab === "active") {
    filteredOrders = allActiveOrders;
  } else if (activeTab === "pending") {
    filteredOrders = pendingOrders;
  } else if (activeTab === "completed") {
    filteredOrders = completedOrders;
  } else if (activeTab === "rejected") {
    filteredOrders = rejectedOrders;
  }
  
  // Group active orders by status for display
  const filteredPendingOrders = filteredOrders.filter((order) => order.status === "pending");
  const filteredPreparingOrders = filteredOrders.filter((order) => order.status === "preparing");
  const filteredReadyOrders = filteredOrders.filter((order) => order.status === "ready");

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  const renderOrderCard = (order: any) => {
    const items = order.items as any[];
    const orderSource = order.orderSource || "staff";
    const orderType = order.orderType;
    const customerName = order.customerName;
    const customerPhone = order.customerPhone;
    const hasCheckedInBooking = order.hasCheckedInBooking;
    const roomNumber = order.roomNumber;
    
    // Only show room number if the room has an active checked-in booking
    const showRoomNumber = orderType !== "restaurant" && hasCheckedInBooking && roomNumber;
    
    return (
      <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg" data-testid={`text-order-room-${order.id}`}>
                  {orderType === "restaurant" ? (
                    customerName || "Restaurant"
                  ) : showRoomNumber ? (
                    `Room ${roomNumber}${customerName ? ` - ${customerName}` : ""}`
                  ) : customerName ? (
                    customerName
                  ) : (
                    "Guest Order"
                  )}
                </CardTitle>
                <Badge variant="outline" className="text-xs" data-testid={`badge-order-source-${order.id}`}>
                  {orderSource === "guest" ? (
                    <><User className="h-3 w-3 mr-1" />Guest</>
                  ) : (
                    <><Phone className="h-3 w-3 mr-1" />Staff</>
                  )}
                </Badge>
                {orderType === "restaurant" && (
                  <Badge variant="secondary" className="text-xs">Restaurant</Badge>
                )}
              </div>
              {customerPhone && (
                <p className="text-xs text-muted-foreground mt-1">
                  📞 {customerPhone}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(order.createdAt!), "PPp")}
              </p>
            </div>
            <Badge className={statusColors[order.status as keyof typeof statusColors]} data-testid={`badge-order-status-${order.id}`}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              {items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm" data-testid={`text-order-item-${order.id}-${idx}`}>
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-mono">₹{item.price}</span>
                </div>
              ))}
            </div>
            
            {order.specialInstructions && (
              <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Special Instructions:</p>
                <p className="text-xs mt-1">{order.specialInstructions}</p>
              </div>
            )}

            <div className="pt-3 border-t">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono" data-testid={`text-order-total-${order.id}`}>₹{order.totalAmount}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => openEditDialog(order)}
                data-testid={`button-edit-order-${order.id}`}
                title="Edit order"
              >
                <Edit className="h-4 w-4" />
              </Button>
              {order.status === "pending" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => updateStatusMutation.mutate({ id: order.id, status: "rejected" })}
                    disabled={updateStatusMutation.isPending}
                    data-testid={`button-reject-order-${order.id}`}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => updateStatusMutation.mutate({ id: order.id, status: "preparing" })}
                    disabled={updateStatusMutation.isPending}
                    data-testid={`button-start-order-${order.id}`}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Start Preparing
                  </Button>
                </>
              )}
              {order.status === "preparing" && (
                <Button
                  className="flex-1"
                  onClick={() => updateStatusMutation.mutate({ id: order.id, status: "ready" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`button-ready-order-${order.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Ready
                </Button>
              )}
              {order.status === "ready" && (
                <Button
                  className="flex-1"
                  onClick={() => updateStatusMutation.mutate({ id: order.id, status: "delivered" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`button-deliver-order-${order.id}`}
                >
                  Delivered
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            Kitchen Panel
          </h1>
          <p className="text-muted-foreground mt-1">Manage incoming orders and preparation</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-alarm-settings"
            title="Alarm settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant={isEnabled ? "default" : "outline"}
            size="icon"
            onClick={() => setIsEnabled(!isEnabled)}
            data-testid="button-toggle-notifications"
            title={isEnabled ? "Disable notifications" : "Enable notifications"}
          >
            {isEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {showSettings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Alarm Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Alarm Tone</label>
                <Select value={alarmTone} onValueChange={(value: any) => setAlarmTone(value)}>
                  <SelectTrigger data-testid="select-alarm-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🚨 Urgent (Loud Alert)</SelectItem>
                    <SelectItem value="bell">🔔 Bell (Pleasant)</SelectItem>
                    <SelectItem value="chime">🎵 Chime (Soft)</SelectItem>
                    <SelectItem value="classic">⏰ Classic (Beep-Beep)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Repeat Times</label>
                <Select value={String(repeatCount)} onValueChange={(value) => setRepeatCount(Number(value))}>
                  <SelectTrigger data-testid="select-repeat-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 time</SelectItem>
                    <SelectItem value="2">2 times</SelectItem>
                    <SelectItem value="3">3 times</SelectItem>
                    <SelectItem value="4">4 times</SelectItem>
                    <SelectItem value="5">5 times</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Volume: {Math.round(volume * 100)}%</label>
                <Slider
                  value={[volume * 100]}
                  onValueChange={(values) => setVolume(values[0] / 100)}
                  min={0}
                  max={100}
                  step={10}
                  data-testid="slider-volume"
                  className="mt-2"
                />
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => playNotification()}
              data-testid="button-test-alarm"
            >
              🔊 Test Alarm
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="active" data-testid="tab-active-orders">
            Active <Badge variant="secondary" className="ml-2">{orderCounts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending-orders">
            Pending <Badge variant="secondary" className="ml-2">{orderCounts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed-orders">
            Completed <Badge variant="secondary" className="ml-2">{orderCounts.completed}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected-orders">
            Rejected <Badge variant="secondary" className="ml-2">{orderCounts.rejected}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {activeTab === "active" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold">
                    {filteredPendingOrders.length}
                  </span>
                  Pending
                </h2>
                <div className="space-y-4">
                  {filteredPendingOrders.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">No pending orders</p>
                    </Card>
                  ) : (
                    filteredPendingOrders.map(renderOrderCard)
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-2/10 text-chart-2 text-xs font-bold">
                    {filteredPreparingOrders.length}
                  </span>
                  Preparing
                </h2>
                <div className="space-y-4">
                  {filteredPreparingOrders.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">No orders in preparation</p>
                    </Card>
                  ) : (
                    filteredPreparingOrders.map(renderOrderCard)
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-5/10 text-chart-5 text-xs font-bold">
                    {filteredReadyOrders.length}
                  </span>
                  Ready
                </h2>
                <div className="space-y-4">
                  {filteredReadyOrders.length === 0 ? (
                    <Card className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">No orders ready</p>
                    </Card>
                  ) : (
                    filteredReadyOrders.map(renderOrderCard)
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    {activeTab === "pending" && "No pending orders"}
                    {activeTab === "completed" && "No completed orders"}
                    {activeTab === "rejected" && "No rejected orders"}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map(renderOrderCard)}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Edit Order Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, order: null })}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl" data-testid="dialog-edit-order">
          <DialogHeader>
            <DialogTitle>Edit Order #{editDialog.order?.id}</DialogTitle>
          </DialogHeader>
          
          {editDialog.order && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Order Items</Label>
                {editedItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input
                        value={item.name}
                        disabled
                        className="bg-muted"
                        data-testid={`input-item-name-${index}`}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                        data-testid={`input-item-quantity-${index}`}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        value={`₹${item.price}`}
                        disabled
                        className="bg-muted"
                        data-testid={`input-item-price-${index}`}
                      />
                    </div>
                    {editedItems.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => removeItem(index)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <Label>Add New Item</Label>
                <Popover open={menuSearchOpen} onOpenChange={setMenuSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={menuSearchOpen}
                      className="w-full justify-between"
                      data-testid="select-add-item"
                    >
                      <span className="flex items-center gap-2">
                        <Search className="h-4 w-4 opacity-50" />
                        Click to search & add items...
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start" side="bottom" sideOffset={4}>
                    <Command className="rounded-lg border shadow-md">
                      <CommandInput 
                        placeholder="Type item name to search..." 
                        data-testid="input-search-menu"
                        className="h-12"
                      />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty>No menu items found.</CommandEmpty>
                        <CommandGroup heading="Available Items">
                          {menuItems?.filter(item => item.isAvailable).map((item) => (
                            <CommandItem
                              key={item.id}
                              value={`${item.name} ${item.price}`}
                              onSelect={() => {
                                addNewItem(item);
                                setMenuSearchOpen(false);
                              }}
                              data-testid={`menu-item-${item.id}`}
                              className="cursor-pointer py-3"
                            >
                              <div className="flex justify-between w-full items-center">
                                <span className="font-medium">{item.name}</span>
                                <Badge variant="secondary">₹{item.price}</Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span data-testid="text-edit-total">
                    ₹{editedItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, order: null })}
              disabled={updateOrderMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={saveOrder}
              disabled={updateOrderMutation.isPending || editedItems.length === 0}
              data-testid="button-save-order"
            >
              {updateOrderMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
