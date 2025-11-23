import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Users, Building2, TrendingUp, Search, Shield } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

interface Property {
  id: string;
  name: string;
  location: string;
  owner: string;
  totalRooms: number;
}

export default function AdminPortalDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalProperties: 0, totalBookings: 0 });
  const [searchEmail, setSearchEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, propsRes, statsRes] = await Promise.all([
        fetch("/api/admin-portal/users"),
        fetch("/api/admin-portal/properties"),
        fetch("/api/admin-portal/stats"),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (propsRes.ok) setProperties(await propsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin-portal/users/${userId}/suspend`, {
        method: "PATCH",
      });
      if (res.ok) {
        await loadData();
        toast({ title: "Success", description: "User suspended" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to suspend user", variant: "destructive" });
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin-portal/users/${userId}/activate`, {
        method: "PATCH",
      });
      if (res.ok) {
        await loadData();
        toast({ title: "Success", description: "User activated" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to activate user", variant: "destructive" });
    }
  };

  const handleLoginAsUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin-portal/login-as/${userId}`, {
        method: "POST",
      });
      if (res.ok) {
        setLocation("/");
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to login as user", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "GET" });
      setLocation("/admin-portal");
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter((u) => u.email.toLowerCase().includes(searchEmail.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-serif">Hostezee</h1>
              <p className="text-xs text-slate-400">Admin Portal</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            data-testid="button-admin-logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
              <p className="text-xs text-slate-400 mt-1">Registered users</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Total Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalProperties}</div>
              <p className="text-xs text-slate-400 mt-1">Active properties</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalBookings}</div>
              <p className="text-xs text-slate-400 mt-1">All bookings</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="users" className="text-slate-300 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Users Management
            </TabsTrigger>
            <TabsTrigger value="properties" className="text-slate-300 data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-2" />
              Properties
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-white">All Users</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage all users in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-6 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white"
                    data-testid="input-search-users"
                  />
                </div>

                {/* Users Table */}
                {isLoading ? (
                  <div className="text-center py-8 text-slate-400">Loading users...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Email
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Name
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Role
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="py-3 px-4 text-sm text-slate-300">{user.email}</td>
                            <td className="py-3 px-4 text-sm text-slate-300">
                              {user.firstName} {user.lastName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <Badge variant="outline" className="capitalize text-slate-300">
                                {user.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <Badge
                                variant={user.status === "active" ? "default" : "secondary"}
                                className="capitalize"
                              >
                                {user.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm space-x-2">
                              {user.status === "active" ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleSuspendUser(user.id)}
                                  data-testid={`button-suspend-${user.id}`}
                                >
                                  Suspend
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleActivateUser(user.id)}
                                  data-testid={`button-activate-${user.id}`}
                                >
                                  Activate
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLoginAsUser(user.id)}
                                data-testid={`button-login-as-${user.id}`}
                              >
                                Login As
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-4">
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-white">All Properties</CardTitle>
                <CardDescription className="text-slate-400">
                  View all properties in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-slate-400">Loading properties...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {properties.map((prop) => (
                      <Card key={prop.id} className="border-slate-600 bg-slate-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-white text-lg">{prop.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-300">
                          <div>
                            <span className="text-slate-400">Location:</span> {prop.location}
                          </div>
                          <div>
                            <span className="text-slate-400">Owner:</span> {prop.owner}
                          </div>
                          <div>
                            <span className="text-slate-400">Rooms:</span> {prop.totalRooms}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
