import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Shield } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  const userInitials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details and role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold" data-testid="text-user-name">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">{user?.email}</p>
                <Badge variant="secondary" className="mt-2 capitalize" data-testid="badge-user-role">
                  <Shield className="h-3 w-3 mr-1" />
                  {user?.role || "Staff"}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono" data-testid="text-user-id">{user?.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Role</span>
                <span className="capitalize font-medium" data-testid="text-user-role">{user?.role || "staff"}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Email</span>
                <span data-testid="text-user-email-detail">{user?.email || "N/A"}</span>
              </div>
              {user?.assignedPropertyIds && user.assignedPropertyIds.length > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Assigned Properties</span>
                  <span className="font-mono" data-testid="text-user-assigned-properties">{user.assignedPropertyIds.join(", ")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Manage your session and account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => {
                window.location.href = "/api/logout";
              }}
              data-testid="button-logout"
              className="w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
