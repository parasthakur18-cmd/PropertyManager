import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft } from "lucide-react";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const search = location.split("?")[1] || "";
  const params = new URLSearchParams(search);
  const email = params.get("email") || "";
  const phone = params.get("phone") || "";
  const channel = params.get("channel") || "email";
  const destination = channel === "email" ? email : phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: any = { otp, channel };
      if (channel === "email") payload.email = email;
      if (channel === "sms") payload.phone = phone;

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Invalid OTP");

      const data = await response.json();
      toast({
        title: "Success",
        description: "OTP verified! Now reset your password.",
      });
      setLocation(`/reset-password?token=${data.resetToken}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-blue-500/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/forgot-password")}
            className="w-fit"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <CardTitle>Verify OTP</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code we sent to {destination}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">OTP Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                data-testid="input-otp"
              />
              <p className="text-xs text-muted-foreground">
                6-digit code expires in 15 minutes
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || otp.length !== 6}
              data-testid="button-verify-otp"
            >
              {isLoading ? "Verifying..." : "Verify OTP"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
