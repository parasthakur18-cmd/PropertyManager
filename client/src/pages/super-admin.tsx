import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { User, Property, IssueReport, ErrorCrash } from "@shared/schema";
import { Users, Building2, AlertCircle, Eye, Lock, Unlock, Trash2, LogIn, Home, MessageSquare, Mail, Phone, Bug, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface ContactEnquiry {
  id: number;
  name: string;
  email: string;
  phone?: string;
  propertyName?: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function SuperAdmin() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("users");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user is authenticated as super admin on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (!response.ok) {
          // Not authenticated, redirect to login
          setLocation("/super-admin-login");
          return;
        }
        const user = await response.json();
        if (user.role !== "super-admin") {
          // Not a super admin, redirect to dashboard
          setLocation("/dashboard");
          return;
        }
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        setLocation("/super-admin-login");
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, [setLocation]);

  // Update active tab when location changes - MUST be before early returns
  useEffect(() => {
    const updateTab = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || 'users';
      console.log('[SuperAdmin] Tab changed to:', tab);
      setActiveTab(tab);
    };
    
    // Update on mount and URL changes
    updateTab();
    window.addEventListener('popstate', updateTab);
    return () => window.removeEventListener('popstate', updateTab);
  }, []);

  // Fetch all users - MUST be before early returns
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/super-admin/users"],
  });

  // Fetch all properties - MUST be before early returns
  const { data: properties = [] } = useQuery<Array<Property & { ownerEmail?: string }>>(
    {
      queryKey: ["/api/super-admin/properties"],
    }
  );

  // Fetch all issue reports - MUST be before early returns
  const { data: reports = [] } = useQuery<IssueReport[]>({
    queryKey: ["/api/super-admin/reports"],
  });

  // Fetch all contact enquiries - MUST be before early returns
  const { data: enquiries = [] } = useQuery<ContactEnquiry[]>({
    queryKey: ["/api/contact"],
  });

  // Fetch all error crashes - MUST be before early returns
  const { data: errorCrashes = [] } = useQuery<ErrorCrash[]>({
    queryKey: ["/api/errors"],
  });

  // Mark error as resolved - MUST be before early returns
  const resolveError = useMutation({
    mutationFn: async (crashId: number) => {
      return await apiRequest(`/api/errors/${crashId}/resolve`, "PATCH", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/errors"] });
      toast({ description: "Error marked as resolved" });
    },
    onError: (error: any) => {
      toast({
        description: error.message || "Failed to resolve error",
        variant: "destructive",
      });
    },
  });

  // Delete error crash - MUST be before early returns
  const deleteError = useMutation({
    mutationFn: async (crashId: number) => {
      return await apiRequest(`/api/errors/${crashId}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/errors"] });
      toast({ description: "Error crash deleted" });
    },
    onError: (error: any) => {
      toast({
        description: error.message || "Failed to delete error",
        variant: "destructive",
      });
    },
  });

  // Suspend/unsuspend user - MUST be before early returns
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

  // Login as user - MUST be before early returns
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

  // Render loading state without early returns
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Render null if not authenticated
  if (!isAuthenticated) {
    return null;
  }

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
                setLocation("/");
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

      <div className="space-y-4">
        <div className="grid w-full grid-cols-5 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {[
            { value: "users", label: `Users (${users.length})`, icon: Users },
            { value: "properties", label: `Properties (${properties.length})`, icon: Building2 },
            { value: "reports", label: `Reports (${reports.length})`, icon: AlertCircle },
            { value: "enquiries", label: `Leads (${enquiries.length})`, icon: MessageSquare },
            { value: "errors", label: `Errors (${errorCrashes.length})`, icon: Bug },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                setActiveTab(value);
                setLocation(`/super-admin?tab=${value}`);
              }}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === value
                  ? "bg-teal-600 dark:bg-teal-500 text-white"
                  : "bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
        <div className="space-y-4">
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
        </div>
        )}

        {/* Properties Tab */}
        {activeTab === "properties" && (
        <div className="space-y-4">
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
        </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
        <div className="space-y-4">
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
        </div>
        )}

        {/* Contact Enquiries Tab */}
        {activeTab === "enquiries" && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {enquiries.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <MessageSquare className="h-8 w-8 text-slate-400" />
                  <p>No contact leads yet</p>
                  <p className="text-xs">Leads will appear when users submit the contact form on your landing page</p>
                </CardContent>
              </Card>
            ) : (
              enquiries.map((enquiry) => (
                <Card key={enquiry.id} className="hover-elevate">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{enquiry.name}</CardTitle>
                        <Badge variant="outline" className="mt-2">{enquiry.status || "new"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(enquiry.createdAt), "MMM dd, yyyy")}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3">
                      <Mail className="h-4 w-4 text-teal-600 flex-shrink-0 mt-1" />
                      <a href={`mailto:${enquiry.email}`} className="text-teal-600 hover:underline break-all">{enquiry.email}</a>
                    </div>
                    {enquiry.phone && (
                      <div className="flex gap-3">
                        <Phone className="h-4 w-4 text-teal-600 flex-shrink-0 mt-1" />
                        <a href={`tel:${enquiry.phone}`} className="text-teal-600 hover:underline">{enquiry.phone}</a>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Message:</p>
                      <p className="text-sm bg-slate-50 dark:bg-slate-900/30 p-3 rounded border border-slate-200 dark:border-slate-700">{enquiry.message}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        )}

        {/* Error Crashes Tab */}
        {activeTab === "errors" && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {errorCrashes.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <Bug className="h-8 w-8 text-slate-400" />
                  <p>No system errors yet</p>
                  <p className="text-xs">Errors from user applications will appear here automatically</p>
                </CardContent>
              </Card>
            ) : (
              errorCrashes.map((crash) => (
                <Card key={crash.id} className={`hover-elevate ${crash.isResolved ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Bug className={`h-5 w-5 ${crash.isResolved ? "text-green-600" : "text-red-600"}`} />
                          <CardTitle className="text-base">{crash.errorType || "Error"}</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 max-w-2xl truncate">{crash.errorMessage}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={crash.isResolved ? "default" : "destructive"}>
                          {crash.isResolved ? "Resolved" : "Open"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {crash.page && <div><span className="text-muted-foreground">Page:</span> {crash.page}</div>}
                      {crash.userId && <div><span className="text-muted-foreground">User:</span> {crash.userId}</div>}
                      {crash.createdAt && <div><span className="text-muted-foreground">Time:</span> {format(new Date(crash.createdAt), "MMM dd, HH:mm")}</div>}
                    </div>
                    {crash.errorStack && (
                      <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-muted-foreground mb-2">Stack Trace:</p>
                        <code className="text-xs text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap max-h-32 overflow-auto block">{crash.errorStack}</code>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {!crash.isResolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveError.mutate(crash.id)}
                          disabled={resolveError.isPending}
                          data-testid={`button-resolve-error-${crash.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Resolved
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteError.mutate(crash.id)}
                        disabled={deleteError.isPending}
                        data-testid={`button-delete-error-${crash.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        )}
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}
