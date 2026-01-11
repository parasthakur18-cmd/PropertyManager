import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, CheckCircle, XCircle, Loader2, UserPlus } from "lucide-react";

export default function AcceptInvite() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const token = new URLSearchParams(searchParams).get("token");
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link. Please check your email for the correct link.");
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/staff-invitations/validate?token=${token}`);
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.message || "Invalid or expired invitation");
          setLoading(false);
          return;
        }
        
        setInvitation(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to validate invitation. Please try again.");
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleAccept = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    if (!firstName || !lastName) {
      setError("Please enter your first and last name");
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch("/api/staff-invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          firstName,
          lastName,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to accept invitation");
        setAccepting(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("Failed to accept invitation. Please try again.");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-teal-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
            <p className="mt-4 text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-teal-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-green-200 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Welcome to Hostezee!</CardTitle>
            <CardDescription>Your account has been created successfully.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>You now have access to <strong>{invitation?.propertyName}</strong></p>
              <p className="mt-1">Role: <strong className="capitalize">{invitation?.role}</strong></p>
            </div>
            <Button
              onClick={() => setLocation("/login")}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600"
              data-testid="button-go-login"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-950 dark:to-red-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="button-go-home"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-teal-950/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-teal-200 dark:border-teal-800 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <CardTitle className="text-2xl">Join {invitation?.propertyName}</CardTitle>
          <CardDescription>
            You've been invited to join as a <strong className="capitalize">{invitation?.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3 text-sm">
            <p className="text-teal-800 dark:text-teal-300">
              Email: <strong>{invitation?.email}</strong>
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium">Create Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                data-testid="input-password"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                data-testid="input-confirm-password"
              />
            </div>
          </div>

          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-gradient-to-r from-teal-600 to-cyan-600"
            data-testid="button-accept-invite"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating account...
              </>
            ) : (
              "Accept Invitation & Create Account"
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            By accepting, you agree to the Hostezee Terms of Service
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
