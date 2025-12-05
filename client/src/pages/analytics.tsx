import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, Hotel, IndianRupee, Building2, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { AnalyticsResponse, Property } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function Analytics() {
  const { user } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: analytics, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["/api/analytics", selectedPropertyId],
    queryFn: async () => {
      const url = selectedPropertyId 
        ? `/api/analytics?propertyId=${selectedPropertyId}`
        : "/api/analytics";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  // Filter properties based on user's assigned properties
  const availableProperties = properties?.filter(p => {
    if (user?.role === 'super_admin') return true;
    return user?.assignedPropertyIds?.includes(p.id);
  }) || [];

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Revenue",
      value: `₹${analytics?.totalRevenue?.toLocaleString() || "0"}`,
      icon: IndianRupee,
      description: selectedPropertyId ? "Property revenue" : "All-time revenue",
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
    {
      title: "Occupancy Rate",
      value: `${analytics?.occupancyRate || "0"}%`,
      icon: Hotel,
      description: "Current occupancy",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Total Bookings",
      value: analytics?.totalBookings || "0",
      icon: BarChart3,
      description: selectedPropertyId ? "Property bookings" : "All-time bookings",
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Total Guests",
      value: analytics?.totalGuests || "0",
      icon: Users,
      description: "Registered guests",
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      title: "This Month Revenue",
      value: `₹${analytics?.monthlyRevenue?.toLocaleString() || "0"}`,
      icon: TrendingUp,
      description: "Current month",
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
    {
      title: "Average Room Rate",
      value: `₹${analytics?.avgRoomRate?.toLocaleString() || "0"}`,
      icon: Hotel,
      description: "Per night",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Active Properties",
      value: analytics?.activeProperties || "0",
      icon: Building2,
      description: "Currently active",
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Repeat Guests",
      value: `${analytics?.repeatGuestRate || "0"}%`,
      icon: Users,
      description: "Guest retention",
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics & Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Performance insights and business metrics
          </p>
        </div>
        
        {/* Property Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedPropertyId === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPropertyId(null)}
            data-testid="button-analytics-all-properties"
          >
            All Properties
          </Button>
          {availableProperties.map((property) => (
            <Button
              key={property.id}
              variant={selectedPropertyId === property.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPropertyId(property.id)}
              data-testid={`button-analytics-property-${property.id}`}
            >
              {property.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono mb-1" data-testid={`metric-${metric.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {metric.value}
                </div>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending Receivables Section */}
      {analytics?.pendingReceivables && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold font-serif mb-4">Pending Receivables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pending
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono mb-1" data-testid="metric-total-pending">
                  ₹{analytics.pendingReceivables.totalPending.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Accounts receivable</p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Overdue Amount
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono mb-1" data-testid="metric-total-overdue">
                  ₹{analytics.pendingReceivables.totalOverdue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Past due date</p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Collection Rate
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
                  <TrendingUp className="h-5 w-5 text-chart-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono mb-1" data-testid="metric-collection-rate">
                  {analytics.pendingReceivables.collectionRate}%
                </div>
                <p className="text-xs text-muted-foreground">Bills paid on time</p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cash Collected
                </CardTitle>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10">
                  <IndianRupee className="h-5 w-5 text-chart-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono mb-1" data-testid="metric-cash-collected">
                  ₹{analytics.cashCollected.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          {/* Aging Buckets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Aging Analysis</CardTitle>
                <CardDescription>Breakdown by payment age</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Current (Not Due)</span>
                      <span className="text-sm font-mono">₹{analytics.pendingReceivables.agingBuckets.current.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-chart-5"
                        style={{
                          width: `${(analytics.pendingReceivables.agingBuckets.current / (analytics.pendingReceivables.totalPending || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">1-7 Days Overdue</span>
                      <span className="text-sm font-mono">₹{analytics.pendingReceivables.agingBuckets.day1to7.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{
                          width: `${(analytics.pendingReceivables.agingBuckets.day1to7 / (analytics.pendingReceivables.totalPending || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">8-30 Days Overdue</span>
                      <span className="text-sm font-mono">₹{analytics.pendingReceivables.agingBuckets.day8to30.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-orange-500"
                        style={{
                          width: `${(analytics.pendingReceivables.agingBuckets.day8to30 / (analytics.pendingReceivables.totalPending || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Over 30 Days</span>
                      <span className="text-sm font-mono">₹{analytics.pendingReceivables.agingBuckets.over30.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-destructive"
                        style={{
                          width: `${(analytics.pendingReceivables.agingBuckets.over30 / (analytics.pendingReceivables.totalPending || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Travel Agent Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>By Travel Agent</CardTitle>
                <CardDescription>Pending payments by agent</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.pendingReceivables.agentBreakdown
                      .filter((agent: any) => agent.pendingAmount > 0)
                      .map((agent: any) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">{agent.name}</TableCell>
                          <TableCell className="text-right font-mono">₹{agent.pendingAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{agent.count}</TableCell>
                        </TableRow>
                      ))}
                    {analytics.pendingReceivables.agentBreakdown.filter((a: any) => a.pendingAmount > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No pending payments
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Revenue sources across services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Room Revenue</span>
                  <span className="text-sm font-mono" data-testid="text-analytics-room-revenue">₹{analytics?.roomRevenue?.toLocaleString() || "0"}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-chart-1"
                    style={{
                      width: `${((analytics?.roomRevenue || 0) / (analytics?.totalRevenue || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Restaurant Revenue</span>
                  <span className="text-sm font-mono" data-testid="text-analytics-restaurant-revenue">₹{analytics?.restaurantRevenue?.toLocaleString() || "0"}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-chart-4"
                    style={{
                      width: `${((analytics?.restaurantRevenue || 0) / (analytics?.totalRevenue || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Extra Services</span>
                  <span className="text-sm font-mono" data-testid="text-analytics-extra-revenue">₹{analytics?.extraServicesRevenue?.toLocaleString() || "0"}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-chart-2"
                    style={{
                      width: `${((analytics?.extraServicesRevenue || 0) / (analytics?.totalRevenue || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Room Types</CardTitle>
            <CardDescription>Most booked room categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.popularRoomTypes?.map((room: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{room.type || "Standard"}</span>
                    <span className="text-sm font-mono">{room.bookings} bookings</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(room.bookings / (analytics?.totalBookings || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
