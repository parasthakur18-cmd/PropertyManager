import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Minus, X, Check, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type MenuItem, type Room } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface CartItem extends MenuItem {
  quantity: number;
}

export default function QuickOrder() {
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const { toast } = useToast();

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      toast({
        title: "Order Created!",
        description: "Order has been sent to the kitchen.",
      });
      // Reset form
      setCart([]);
      setSelectedRoom("");
      setSpecialInstructions("");
      setGuestName("");
      setGuestPhone("");
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addToCart = (item: MenuItem) => {
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      setCart(cart.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: number, change: number) => {
    setCart((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
      );
      return updated.filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + parseFloat(item.price as string) * item.quantity, 0);
  };

  const handleSubmitOrder = () => {
    if (!selectedRoom) {
      toast({
        title: "Room Required",
        description: "Please select a room number",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add items to the order",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      propertyId: 1,
      roomId: parseInt(selectedRoom),
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      totalAmount: calculateTotal().toFixed(2),
      specialInstructions: specialInstructions || null,
      orderSource: "staff", // Track that this order came from staff
    };

    orderMutation.mutate(orderData);
  };

  // Group by category
  const categorizedItems = menuItems?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (menuLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
          <Phone className="h-8 w-8 text-primary" />
          Quick Order Entry
        </h1>
        <p className="text-muted-foreground mt-1">Take phone orders from guests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {categorizedItems && Object.entries(categorizedItems).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items
                    .filter((item) => item.isAvailable)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => addToCart(item)}
                        data-testid={`quick-order-item-${item.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">₹{item.price}</p>
                        </div>
                        <Button size="icon" variant="ghost" data-testid={`button-quick-add-${item.id}`}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary - Right Side */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Room Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Room Number *</label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger data-testid="select-quick-order-room">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id.toString()}>
                        Room {room.roomNumber} - {room.roomType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Guest Info */}
              <div>
                <label className="text-sm font-medium mb-2 block">Guest Name (Optional)</label>
                <Input
                  placeholder="Guest name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  data-testid="input-quick-order-guest-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Phone (Optional)</label>
                <Input
                  placeholder="Phone number"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  data-testid="input-quick-order-phone"
                />
              </div>

              {/* Cart Items */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Items ({cart.length})</p>
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No items added</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, -1)}
                            data-testid={`button-quick-decrease-${item.id}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-mono">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, 1)}
                            data-testid={`button-quick-increase-${item.id}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => removeFromCart(item.id)}
                            data-testid={`button-quick-remove-${item.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div>
                <label className="text-sm font-medium mb-2 block">Special Instructions</label>
                <Textarea
                  placeholder="Any special requests..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                  data-testid="textarea-quick-order-instructions"
                />
              </div>

              {/* Total & Submit */}
              {cart.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="font-mono">₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmitOrder}
                    disabled={orderMutation.isPending}
                    data-testid="button-submit-quick-order"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    {orderMutation.isPending ? "Submitting..." : "Submit Order"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
