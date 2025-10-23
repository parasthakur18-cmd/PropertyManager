import { useQuery, useMutation } from "@tanstack/react-query";
import { ChefHat, Clock, CheckCircle, User, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Order } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusColors = {
  pending: "bg-amber-500 text-white",
  preparing: "bg-chart-2 text-white",
  ready: "bg-chart-5 text-white",
  delivered: "bg-muted text-muted-foreground",
};

export default function Kitchen() {
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
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

  const activeOrders = orders?.filter((order) => order.status !== "delivered");
  const pendingOrders = activeOrders?.filter((order) => order.status === "pending");
  const preparingOrders = activeOrders?.filter((order) => order.status === "preparing");
  const readyOrders = activeOrders?.filter((order) => order.status === "ready");

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

  const renderOrderCard = (order: Order) => {
    const items = order.items as any[];
    const orderSource = (order as any).orderSource || "staff";
    const orderType = (order as any).orderType;
    const customerName = (order as any).customerName;
    const customerPhone = (order as any).customerPhone;
    
    return (
      <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg" data-testid={`text-order-room-${order.id}`}>
                  {orderType === "restaurant" ? (
                    customerName || "Restaurant"
                  ) : (
                    `Room ${order.roomId || "N/A"}`
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
              {orderType === "restaurant" && customerPhone && (
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
              {order.status === "pending" && (
                <Button
                  className="flex-1"
                  onClick={() => updateStatusMutation.mutate({ id: order.id, status: "preparing" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`button-start-order-${order.id}`}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Start Preparing
                </Button>
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
          <ChefHat className="h-8 w-8 text-primary" />
          Kitchen Panel
        </h1>
        <p className="text-muted-foreground mt-1">Manage incoming orders and preparation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold">
              {pendingOrders?.length || 0}
            </span>
            Pending
          </h2>
          <div className="space-y-4">
            {!pendingOrders || pendingOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No pending orders</p>
              </Card>
            ) : (
              pendingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-2/10 text-chart-2 text-xs font-bold">
              {preparingOrders?.length || 0}
            </span>
            Preparing
          </h2>
          <div className="space-y-4">
            {!preparingOrders || preparingOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No orders in preparation</p>
              </Card>
            ) : (
              preparingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-5/10 text-chart-5 text-xs font-bold">
              {readyOrders?.length || 0}
            </span>
            Ready
          </h2>
          <div className="space-y-4">
            {!readyOrders || readyOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No orders ready</p>
              </Card>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
