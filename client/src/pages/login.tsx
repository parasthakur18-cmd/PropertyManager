import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Phone, LogIn, ArrowRight, Clock, XCircle, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { queryClient } from "@/lib/queryClient";
import hostezeeLogo from "@assets/Hostezee_Logo_1768292341444.jpeg";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  
  // Mobile OTP state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  
  // Pending/Rejected state
  const [showPending, setShowPending] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  
  // Handle Email/Password Login
  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);
    
    try {
      const response = await fetch("/api/auth/email-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle pending/rejected verification status
        if (data.verificationStatus === "pending") {
          setShowPending(true);
          setPendingMessage(data.message || "Your account is pending approval.");
          return;
        }
        if (data.verificationStatus === "rejected") {
          setShowRejected(true);
          setPendingMessage(data.message || "Your account was not approved.");
          return;
        }
        setEmailError(data.message || "Login failed");
        return;
      }
      
      // Invalidate auth query to update useAuth state
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      setLocation("/dashboard");
    } catch (err: any) {
      setEmailError(err.message || "Connection error. Please try again.");
      console.error(err);
    } finally {
      setEmailLoading(false);
    }
  };
  
  // Handle OTP Request
  const handleSendOTP = async () => {
    setPhoneError("");
    setPhoneLoading(true);
    
    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (normalizedPhone.length < 10) {
      setPhoneError("Please enter a valid 10-digit phone number");
      setPhoneLoading(false);
      return;
    }
    
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setPhoneError(data.message || "Failed to send OTP");
        return;
      }
      
      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${normalizedPhone}`,
      });
      
      // Start 60 second cooldown
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setPhoneError(err.message || "Connection error. Please try again.");
      console.error(err);
    } finally {
      setPhoneLoading(false);
    }
  };
  
  // Handle OTP Verification
  const handleVerifyOTP = async () => {
    setPhoneError("");
    setVerifyLoading(true);
    
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, otp }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (response.status === 403) {
        // Handle pending/rejected verification status
        if (data.verificationStatus === "pending" || data.isNewUser) {
          setShowPending(true);
          setPendingMessage(data.message || "Your account is pending approval.");
          return;
        }
        if (data.verificationStatus === "rejected") {
          setShowRejected(true);
          setPendingMessage(data.message || "Your account was not approved.");
          return;
        }
      }
      
      if (!response.ok) {
        setPhoneError(data.message || "OTP verification failed");
        return;
      }
      
      // Invalidate auth query to update useAuth state
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Login Successful",
        description: "Welcome to Hostezee!",
      });
      
      setLocation("/dashboard");
    } catch (err: any) {
      setPhoneError(err.message || "Connection error. Please try again.");
      console.error(err);
    } finally {
      setVerifyLoading(false);
    }
  };
  
  // Handle Google Login
  const handleGoogleLogin = () => {
    window.location.href = "/api/login";
  };
  
  // Pending Status Screen
  if (showPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-950 dark:to-orange-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-orange-200 dark:border-orange-800">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
            <CardDescription className="text-base">
              {pendingMessage || "Your account is waiting for Super Admin approval."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-2">What happens next?</h4>
              <ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
                <li>1. Our team will review your application</li>
                <li>2. You will receive a WhatsApp notification once approved</li>
                <li>3. Once approved, you can login and manage your property</li>
              </ul>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowPending(false);
                setEmail("");
                setPassword("");
                setPhoneNumber("");
                setOtp("");
                setOtpSent(false);
              }}
              className="w-full"
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Rejected Status Screen
  if (showRejected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-950 dark:to-red-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-800">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Account Not Approved</CardTitle>
            <CardDescription className="text-base">
              {pendingMessage || "Your account application was not approved."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Need Help?</h4>
              <p className="text-sm text-red-700 dark:text-red-400">
                If you believe this was a mistake, please contact our support team at{" "}
                <a href="mailto:support@hostezee.in" className="underline">support@hostezee.in</a>
              </p>
            </div>
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/30 dark:from-slate-950 dark:via-teal-950/20 dark:to-cyan-950/20 flex flex-col">
      {/* Background Gradient Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-400/15 to-teal-400/15 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-teal-300/10 to-cyan-300/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
            <img src={hostezeeLogo} alt="Hostezee" className="h-12 w-auto object-contain" />
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-slate-700 dark:text-slate-300"
              data-testid="button-back-home"
            >
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center pt-24 pb-12 px-4 w-full">
        <div className="w-full max-w-md mx-auto">
          <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-3xl">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to manage your properties
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Google Login Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full h-12 gap-3 text-base border-slate-300 dark:border-slate-700"
                data-testid="button-google-login"
              >
                <SiGoogle className="h-5 w-5" />
                Continue with Google
              </Button>
              
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Login Method Tabs */}
              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email" className="gap-2" data-testid="tab-email">
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="gap-2" data-testid="tab-phone">
                    <Phone className="h-4 w-4" />
                    Mobile OTP
                  </TabsTrigger>
                </TabsList>
                
                {/* Email/Password Tab */}
                <TabsContent value="email" className="mt-4">
                  {emailError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{emailError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-900 dark:text-white">Email Address</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        data-testid="input-login-email"
                        className="h-11 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-900 dark:text-white">Password</label>
                        <a 
                          href="/forgot-password" 
                          className="text-xs text-teal-600 hover:underline"
                          data-testid="link-forgot-password"
                        >
                          Forgot password?
                        </a>
                      </div>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        data-testid="input-login-password"
                        className="h-11 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={emailLoading}
                      className="w-full h-11 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 gap-2"
                      data-testid="button-email-login"
                    >
                      {emailLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                {/* Mobile OTP Tab */}
                <TabsContent value="phone" className="mt-4">
                  {phoneError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{phoneError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-900 dark:text-white">Mobile Number</label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                          +91
                        </div>
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          disabled={otpSent}
                          data-testid="input-phone-number"
                          className="h-11 flex-1 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    </div>
                    
                    {!otpSent ? (
                      <Button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={phoneLoading || phoneNumber.length < 10}
                        className="w-full h-11 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                        data-testid="button-send-otp"
                      >
                        {phoneLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Sending OTP...
                          </>
                        ) : (
                          "Send OTP via WhatsApp"
                        )}
                      </Button>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-900 dark:text-white">
                            Enter 6-digit OTP
                          </label>
                          <div className="flex justify-center">
                            <InputOTP
                              maxLength={6}
                              value={otp}
                              onChange={(value) => setOtp(value)}
                              data-testid="input-otp"
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          onClick={handleVerifyOTP}
                          disabled={verifyLoading || otp.length < 6}
                          className="w-full h-11 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                          data-testid="button-verify-otp"
                        >
                          {verifyLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Verifying...
                            </>
                          ) : (
                            "Verify & Sign In"
                          )}
                        </Button>
                        
                        <div className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={cooldown > 0}
                            onClick={handleSendOTP}
                            className="text-teal-600 hover:text-teal-700"
                            data-testid="button-resend-otp"
                          >
                            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                          </Button>
                        </div>
                      </>
                    )}
                    
                    <p className="text-xs text-center text-slate-500">
                      OTP will be sent to your WhatsApp
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">
                    New to Hostezee?
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/register")}
                className="w-full h-11 border-slate-300 dark:border-slate-700 gap-2"
                data-testid="button-register"
              >
                Create an Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Secure Login
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
              <span>256-bit SSL</span>
              <span>ISO 27001</span>
              <span>SOC 2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
