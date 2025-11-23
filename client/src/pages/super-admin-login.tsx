import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, LogIn, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function SuperAdminLogin() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white mx-auto">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold font-serif text-slate-900 dark:text-white">Hostezee</h1>
          <p className="text-slate-600 dark:text-slate-400">Super Admin Portal</p>
        </div>

        {/* Main Card */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">System Administration</CardTitle>
            <CardDescription>
              Welcome to the Hostezee Super Admin Portal. This is where you manage all properties, users, and system-level operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Section */}
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Default Super Admin Account</h3>
                <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
                  Use these credentials to access the Super Admin dashboard:
                </p>
                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200 dark:border-blue-700 font-mono text-sm space-y-2">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Email:</span>{" "}
                    <span className="text-slate-900 dark:text-white font-semibold">admin@hostezee.in</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Role:</span>{" "}
                    <span className="text-slate-900 dark:text-white font-semibold">Super Admin</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">What You Can Do:</h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">•</span>
                    <span>Manage all properties in the system</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">•</span>
                    <span>View and manage all users and their roles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">•</span>
                    <span>Monitor contact leads from the landing page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">•</span>
                    <span>View and manage issue reports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 dark:text-teal-400 font-bold mt-0.5">•</span>
                    <span>Access system settings and configuration</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                onClick={() => {
                  // First login with the Replit auth
                  window.location.href = "/api/login";
                }}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login with Replit Auth
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/super-admin")}
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Info Note */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Note:</strong> The Super Admin dashboard manages system-level features only. Property admins independently manage their own property operations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="flex justify-center gap-4 text-sm">
          <a
            href="/"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            Back to Home
          </a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <a
            href="/faq"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            FAQ
          </a>
        </div>
      </div>
    </div>
  );
}
