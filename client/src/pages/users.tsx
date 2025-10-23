import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Users as UsersIcon, Edit2, Building2, Link as LinkIcon, Copy, Info } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Property } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersManagement() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newPropertyId, setNewPropertyId] = useState<string | null>(null);

  const { data: users, isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, assignedPropertyId }: { 
      userId: string; 
      role: string; 
      assignedPropertyId: number | null;
    }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/role`, {
        role,
        assignedPropertyId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Role Updated!",
        description: "User role has been updated successfully.",
      });
      setSelectedUser(null);
      setNewRole("");
      setNewPropertyId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setNewPropertyId(user.assignedPropertyId ? user.assignedPropertyId.toString() : null);
  };

  const handleSaveRole = () => {
    if (!selectedUser || !newRole) return;

    updateRoleMutation.mutate({
      userId: selectedUser.id,
      role: newRole,
      assignedPropertyId: newPropertyId ? parseInt(newPropertyId) : null,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "manager":
        return "secondary";
      case "kitchen":
        return "outline";
      default:
        return "outline";
    }
  };

  const appUrl = window.location.origin;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and permissions
          </p>
        </div>
      </div>

      {/* Testing Roles Info Card */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How to Test Different Roles
          </CardTitle>
          <CardDescription>
            Share this URL with others or use it in a different browser to test role permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* App URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              App Login URL
            </label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                {appUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(appUrl)}
                data-testid="button-copy-url"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-semibold">Testing Steps:</h4>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Share the URL above with someone or open it in a different browser/incognito window</li>
              <li>Have them log in with their Replit account (they'll appear in the users list below)</li>
              <li>Assign them a role (Staff, Kitchen, Manager, or Admin) using the "Edit Role" button</li>
              <li>They'll see the interface change based on their assigned role</li>
            </ol>
          </div>

          {/* Role Permissions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 border rounded-md space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Full access to everything including user management</p>
            </div>

            <div className="p-3 border rounded-md space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  Manager
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Operations, billing, expenses, and reports (no user management)</p>
            </div>

            <div className="p-3 border rounded-md space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  Staff
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Rooms, bookings, and kitchen orders only</p>
            </div>

            <div className="p-3 border rounded-md space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  Kitchen
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Kitchen orders page only</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Assign roles to control access levels: Admin (full access), Manager (operations), Staff (basic access), Kitchen (kitchen orders only)
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
              <p>No users found. Users will appear here after they log in.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Property</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const assignedProperty = properties?.find(
                      (p) => p.id === user.assignedPropertyId
                    );
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getRoleBadgeVariant(user.role)}
                            className="capitalize"
                            data-testid={`badge-role-${user.id}`}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {assignedProperty ? (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {assignedProperty.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">All Properties</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAt!).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditUser(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            Edit Role
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
              <label className="text-sm font-medium">Role</label>
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
              <p className="text-xs text-muted-foreground">
                {newRole === "admin" && "Full system access including user management"}
                {newRole === "manager" && "Manage operations, billing, and reports"}
                {newRole === "staff" && "View rooms, manage kitchen, take orders"}
                {newRole === "kitchen" && "Kitchen order management only"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Property (Optional)</label>
              <Select 
                value={newPropertyId || "all"} 
                onValueChange={(val) => setNewPropertyId(val === "all" ? null : val)}
              >
                <SelectTrigger data-testid="select-property">
                  <SelectValue placeholder="Select property" />
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
              <p className="text-xs text-muted-foreground">
                Assign user to a specific property or leave as "All Properties"
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedUser(null)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={!newRole || updateRoleMutation.isPending}
              data-testid="button-save-role"
            >
              {updateRoleMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
