import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { User, Property, IssueReport } from "@shared/schema";
import { Users, Building2, AlertCircle, Eye, Lock, Unlock, Trash2, LogIn, Home } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";

export default function SuperAdmin() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/super-admin/users"],
  });

  // Fetch all properties
  const { data: properties = [] } = useQuery<Array<Property & { ownerEmail?: string }>>(
    {
      queryKey: ["/api/super-admin/properties"],
    }
  );

  // Fetch all issue reports
  const { data: reports = [] } = useQuery<IssueReport[]>({
    queryKey: ["/api/super-admin/reports"],
  });

  // Suspend/unsuspend user
  const toggleUserStatus = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: "active" | "suspended";
    }) => {
      return apiRequest(`/api/super-admin/users/${userId}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast({
        title: "Success",
        description: "User status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Login as user
  const loginAsUser = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/super-admin/login-as/${userId}`, "POST", {});
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <SuperAdminSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="sticky top-0 z-50 bg-background border-b border-border">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">System Administration</h1>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/";
              }}
              className="flex items-center gap-2"
              data-testid="button-home"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">System-wide management & monitoring</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Properties ({properties.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Reports ({reports.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by email or business name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-users"
            />
          </div>

          <div className="grid gap-4">
            {filteredUsers.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No users found
                </CardContent>
              </Card>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="hover-elevate">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {user.firstName} {user.lastName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.businessName && (
                          <p className="text-sm text-muted-foreground">
                            Business: {user.businessName}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={user.status === "active" ? "default" : "destructive"}
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.status}
                        </Badge>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loginAsUser.mutate(user.id)}
                        disabled={loginAsUser.isPending}
                        data-testid={`button-login-as-${user.id}`}
                      >
                        <LogIn className="h-4 w-4 mr-1" />
                        Login As User
                      </Button>
                      {user.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleUserStatus.mutate({
                              userId: user.id,
                              status: "suspended",
                            })
                          }
                          disabled={toggleUserStatus.isPending}
                          data-testid={`button-suspend-${user.id}`}
                        >
                          <Lock className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleUserStatus.mutate({
                              userId: user.id,
                              status: "active",
                            })
                          }
                          disabled={toggleUserStatus.isPending}
                          data-testid={`button-activate-${user.id}`}
                        >
                          <Unlock className="h-4 w-4 mr-1" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-4">
          <div className="grid gap-4">
            {properties.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No properties found
                </CardContent>
              </Card>
            ) : (
              properties.map((prop) => {
                const owner = users.find((u) => u.id === prop.ownerUserId);
                return (
                  <Card key={prop.id} className="hover-elevate">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{prop.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{prop.location}</p>
                          {owner && (
                            <p className="text-sm text-muted-foreground">
                              Owner: {owner.email}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={prop.isActive ? "default" : "secondary"}
                          data-testid={`badge-property-status-${prop.id}`}
                        >
                          {prop.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <p>Total Rooms: {prop.totalRooms}</p>
                        {prop.contactEmail && <p>Contact: {prop.contactEmail}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4">
            {reports.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No issue reports found
                </CardContent>
              </Card>
            ) : (
              reports.map((report) => {
                const reporter = users.find((u) => u.id === report.reportedByUserId);
                return (
                  <Card key={report.id} className="hover-elevate">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{report.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            By: {reporter?.email || "Unknown"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            variant={
                              report.severity === "critical"
                                ? "destructive"
                                : report.severity === "high"
                                  ? "default"
                                  : "secondary"
                            }
                            data-testid={`badge-severity-${report.id}`}
                          >
                            {report.severity}
                          </Badge>
                          <Badge
                            variant={
                              report.status === "open"
                                ? "default"
                                : report.status === "resolved"
                                  ? "secondary"
                                  : "outline"
                            }
                            data-testid={`badge-report-status-${report.id}`}
                          >
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm">{report.description}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>Category: {report.category}</span>
                        <span>•</span>
                        <span>{report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "N/A"}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
          </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
