import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Users as UsersIcon, Edit2, Building2, Copy, Trash2, Check, UserPlus, Power, Settings2, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Property, StaffInvitation, UserPermissions } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

const PERMISSION_MODULES = [
  { key: 'bookings', label: 'Bookings', description: 'View and manage guest bookings' },
  { key: 'calendar', label: 'Calendar', description: 'Room availability calendar' },
  { key: 'rooms', label: 'Rooms', description: 'Room management and settings' },
  { key: 'guests', label: 'Guests', description: 'Guest information and history' },
  { key: 'foodOrders', label: 'Food Orders', description: 'Restaurant orders and QR menu' },
  { key: 'menuManagement', label: 'Menu Management', description: 'Edit menu items and categories' },
  { key: 'payments', label: 'Payments & Billing', description: 'Payment records and invoices' },
  { key: 'reports', label: 'Reports', description: 'Analytics and reports' },
  { key: 'settings', label: 'Settings', description: 'Property and system settings' },
  { key: 'tasks', label: 'Tasks', description: 'Task management' },
  { key: 'staff', label: 'Staff Management', description: 'Manage staff users' },
] as const;

export default function UsersManagement() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newPropertyIds, setNewPropertyIds] = useState<number[]>([]);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [invitePropertyId, setInvitePropertyId] = useState<number | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [userPermissionsData, setUserPermissionsData] = useState<Record<string, string>>({});

  const { data: users, isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: invitations } = useQuery<StaffInvitation[]>({
    queryKey: ["/api/staff-invitations"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, assignedPropertyIds }: { 
      userId: string; 
      role: string; 
      assignedPropertyIds: number[] | null;
    }) => {
      return await apiRequest(`/api/users/${userId}/role`, "PATCH", {
        role,
        assignedPropertyIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role Updated!",
        description: "User role has been updated successfully.",
      });
      setSelectedUser(null);
      setNewRole("");
      setNewPropertyIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Deleted",
        description: "User has been removed from the system.",
      });
      setDeleteDialogOpen(false);
      setDeleteUserId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return await apiRequest(`/api/users/${userId}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Status Updated",
        description: "User status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const inviteStaffMutation = useMutation({
    mutationFn: async (data: { email: string; propertyId: number; role: string }) => {
      return await apiRequest("/api/staff-invitations", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-invitations"] });
      toast({
        title: "Invitation Sent!",
        description: "An email invitation has been sent to the staff member.",
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("staff");
      setInvitePropertyId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/staff-invitations/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-invitations"] });
      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been cancelled.",
      });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: Record<string, string> }) => {
      return await apiRequest(`/api/users/${userId}/permissions`, "PUT", permissions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Permissions Updated",
        description: "User permissions have been saved.",
      });
      setPermissionsUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setNewPropertyIds(user.assignedPropertyIds?.map(id => typeof id === 'string' ? parseInt(id) : id) || []);
  };

  const handleSaveRole = () => {
    if (!selectedUser || !newRole) return;
    updateRoleMutation.mutate({
      userId: selectedUser.id,
      role: newRole,
      assignedPropertyIds: newPropertyIds.length > 0 ? newPropertyIds : null,
    });
  };

  const handleOpenPermissions = async (user: User) => {
    setPermissionsUser(user);
    try {
      const response = await fetch(`/api/users/${user.id}/permissions`);
      const data = await response.json();
      setUserPermissionsData(data);
    } catch (error) {
      setUserPermissionsData({});
    }
  };

  const handlePermissionChange = (module: string, level: string) => {
    setUserPermissionsData(prev => ({
      ...prev,
      [module]: level,
    }));
  };

  const toggleProperty = (propertyId: number) => {
    setNewPropertyIds(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "manager": return "secondary";
      case "kitchen": return "outline";
      default: return "outline";
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'inactive') {
      return <Badge variant="destructive" className="text-xs">Inactive</Badge>;
    }
    return <Badge variant="default" className="text-xs bg-green-600">Active</Badge>;
  };

  const appUrl = window.location.origin;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "URL copied to clipboard" });
  };

  const pendingInvitations = invitations?.filter(i => i.status === 'pending') || [];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage staff, roles, and permissions
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} data-testid="button-invite-staff">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">Users ({users?.length || 0})</TabsTrigger>
          <TabsTrigger value="invitations" data-testid="tab-invitations">
            Pending Invitations ({pendingInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Manage user roles, permissions, and access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !users || users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found. Invite staff to get started.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className={user.status === 'inactive' ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize" data-testid={`badge-role-${user.id}`}>
                              <Shield className="h-3 w-3 mr-1" />
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user.status || 'active')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.assignedPropertyIds && user.assignedPropertyIds.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.assignedPropertyIds.slice(0, 2).map((propId: any) => {
                                  const prop = properties?.find(p => p.id === parseInt(propId));
                                  return prop ? (
                                    <Badge key={prop.id} variant="secondary" className="text-xs">
                                      {prop.name}
                                    </Badge>
                                  ) : null;
                                })}
                                {user.assignedPropertyIds.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{user.assignedPropertyIds.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs">All Properties</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {currentUser?.id !== user.id && user.role !== 'super-admin' && (
                                <Switch
                                  checked={user.status !== 'inactive'}
                                  onCheckedChange={(checked) => {
                                    toggleStatusMutation.mutate({
                                      userId: user.id,
                                      status: checked ? 'active' : 'inactive',
                                    });
                                  }}
                                  data-testid={`switch-status-${user.id}`}
                                />
                              )}
                              <Button size="icon" variant="ghost" onClick={() => handleEditUser(user)} data-testid={`button-edit-${user.id}`}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleOpenPermissions(user)} data-testid={`button-permissions-${user.id}`}>
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              {currentUser?.id !== user.id && user.role !== 'super-admin' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setDeleteUserId(user.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                  data-testid={`button-delete-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Staff members who have been invited but haven't accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending invitations</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvitations.map((invite) => {
                        const property = properties?.find(p => p.id === invite.propertyId);
                        const isExpired = new Date(invite.expiresAt) < new Date();
                        return (
                          <TableRow key={invite.id} className={isExpired ? 'opacity-60' : ''}>
                            <TableCell className="font-medium">{invite.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">{invite.role}</Badge>
                            </TableCell>
                            <TableCell>{property?.name || 'Unknown'}</TableCell>
                            <TableCell>
                              {isExpired ? (
                                <Badge variant="destructive" className="text-xs">Expired</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(invite.expiresAt).toLocaleDateString()}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelInviteMutation.mutate(invite.id)}
                                data-testid={`button-cancel-invite-${invite.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Staff Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent data-testid="dialog-invite-staff">
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
            <DialogDescription>
              Send an email invitation to add a new staff member to your property
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="staff@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger data-testid="select-invite-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff - Basic Access</SelectItem>
                  <SelectItem value="manager">Manager - Operations</SelectItem>
                  <SelectItem value="kitchen">Kitchen - Kitchen Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={invitePropertyId?.toString() || ""} onValueChange={(v) => setInvitePropertyId(parseInt(v))}>
                <SelectTrigger data-testid="select-invite-property">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (inviteEmail && invitePropertyId) {
                  inviteStaffMutation.mutate({
                    email: inviteEmail,
                    propertyId: invitePropertyId,
                    role: inviteRole,
                  });
                }
              }}
              disabled={!inviteEmail || !invitePropertyId || inviteStaffMutation.isPending}
              data-testid="button-send-invite"
            >
              {inviteStaffMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent data-testid="dialog-edit-role">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role and property assignment for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full Access</SelectItem>
                  <SelectItem value="manager">Manager - Operations</SelectItem>
                  <SelectItem value="staff">Staff - Basic Access</SelectItem>
                  <SelectItem value="kitchen">Kitchen - Kitchen Orders Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Properties</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 p-2 hover-elevate rounded cursor-pointer border-b" onClick={() => setNewPropertyIds([])}>
                  <div className={`h-4 w-4 border rounded flex items-center justify-center ${newPropertyIds.length === 0 ? 'bg-primary border-primary' : 'border-input'}`}>
                    {newPropertyIds.length === 0 && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm font-medium">All Properties</span>
                </div>
                {properties?.map((property) => (
                  <div key={property.id} className="flex items-center gap-2 p-2 hover-elevate rounded cursor-pointer" onClick={() => toggleProperty(property.id)}>
                    <div className={`h-4 w-4 border rounded flex items-center justify-center ${newPropertyIds.includes(property.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                      {newPropertyIds.includes(property.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm">{property.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={!newRole || updateRoleMutation.isPending} data-testid="button-save-role">
              {updateRoleMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={!!permissionsUser} onOpenChange={(open) => !open && setPermissionsUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-permissions">
          <DialogHeader>
            <DialogTitle>User Permissions</DialogTitle>
            <DialogDescription>
              Configure granular access permissions for {permissionsUser?.firstName} {permissionsUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
            {PERMISSION_MODULES.map((module) => (
              <div key={module.key} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium text-sm">{module.label}</div>
                  <div className="text-xs text-muted-foreground">{module.description}</div>
                </div>
                <Select
                  value={userPermissionsData[module.key] || 'none'}
                  onValueChange={(value) => handlePermissionChange(module.key, value)}
                >
                  <SelectTrigger className="w-32" data-testid={`select-permission-${module.key}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Access</SelectItem>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="edit">Full Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPermissionsUser(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (permissionsUser) {
                  updatePermissionsMutation.mutate({
                    userId: permissionsUser.id,
                    permissions: userPermissionsData,
                  });
                }
              }}
              disabled={updatePermissionsMutation.isPending}
              data-testid="button-save-permissions"
            >
              {updatePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this user from the system. They will no longer be able to access the application. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUserMutation.mutate(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover-elevate"
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
