import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        channel,
        ...(channel === "email" ? { email } : { phone }),
      };

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to send OTP");

      setSubmitted(true);
      const destination = channel === "email" ? email : phone;
      toast({
        title: "Success",
        description: `OTP sent to your ${channel}. Check your ${channel === "email" ? "inbox" : "messages"}!`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    const destination = channel === "email" ? email : phone;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-blue-500/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {channel === "email" ? (
                  <Mail className="h-6 w-6 text-primary" />
                ) : (
                  <MessageSquare className="h-6 w-6 text-primary" />
                )}
              </div>
            </div>
            <CardTitle>Check Your {channel === "email" ? "Email" : "Phone"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground">
                We've sent a 6-digit OTP to <strong>{destination}</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                The OTP is valid for 15 minutes
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                const param =
                  channel === "email" ? `email=${email}` : `phone=${phone}`;
                setLocation(`/verify-otp?${param}&channel=${channel}`);
              }}
              data-testid="button-enter-otp"
            >
              Enter OTP
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-blue-500/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="w-fit"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <CardTitle>Reset Your Password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose how you'd like to receive your OTP
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={channel} onValueChange={(v) => setChannel(v as "email" | "sms")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email}
                  data-testid="button-send-otp-email"
                >
                  {isLoading ? "Sending..." : "Send OTP"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    data-testid="input-phone"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !phone}
                  data-testid="button-send-otp-sms"
                >
                  {isLoading ? "Sending..." : "Send OTP"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
