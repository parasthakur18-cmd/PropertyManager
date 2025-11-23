import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, LogIn, ArrowRight, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SuperAdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/email-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Login failed");
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();
      toast({
        title: "Success",
        description: "Welcome to Super Admin Dashboard",
      });
      
      // Redirect to super admin dashboard
      setTimeout(() => {
        setLocation("/super-admin");
      }, 500);
    } catch (err: any) {
      setError("Connection error. Please try again.");
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
              Login to manage all properties, users, and system-level operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Credentials Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Default Credentials</h3>
              <div className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200 dark:border-blue-700 font-mono text-sm space-y-2">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Email:</span>{" "}
                  <span className="text-slate-900 dark:text-white font-semibold">admin@hostezee.in</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Password:</span>{" "}
                  <span className="text-slate-900 dark:text-white font-semibold">admin@123</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-white">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="admin@hostezee.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-super-admin-email"
                  className="h-12"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-white">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-super-admin-password"
                  className="h-12"
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                disabled={loading || !email || !password}
                data-testid="button-super-admin-login"
              >
                {loading ? (
                  <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>

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
