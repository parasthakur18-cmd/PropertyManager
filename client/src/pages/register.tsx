import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowRight, Sparkles, Clock, CheckCircle } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    businessName: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Show pending approval screen
      setShowPending(true);
      toast({
        title: "Registration successful!",
        description: "Your account is pending approval.",
      });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Show pending approval screen after registration
  if (showPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-teal-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-teal-200 dark:border-teal-800 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <CardTitle className="text-2xl">Registration Successful!</CardTitle>
            <CardDescription className="text-base">
              Your account has been created and is pending approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300 mb-2">
                <Clock className="h-5 w-5" />
                <h4 className="font-medium">What happens next?</h4>
              </div>
              <ul className="text-sm text-teal-700 dark:text-teal-400 space-y-2">
                <li>1. Our team will review your application</li>
                <li>2. You will receive a WhatsApp notification once approved</li>
                <li>3. After approval, you can log in and manage your property</li>
              </ul>
            </div>
            
            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
              <p>Registered email: <span className="font-medium">{formData.email}</span></p>
              <p className="mt-1">Business: <span className="font-medium">{formData.businessName}</span></p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                className="flex-1"
                data-testid="button-go-home"
              >
                Go to Homepage
              </Button>
              <Button
                onClick={() => setLocation("/login")}
                className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600"
                data-testid="button-go-login"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Hostezee
            </h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              data-testid="button-back-home"
            >
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center pt-24 pb-12 px-4">
        <div className="w-full max-w-md">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 overflow-hidden -z-10">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/10 to-teal-400/10 rounded-full blur-3xl"></div>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-lg">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">Start Free Today</span>
              </div>
              <CardTitle className="text-3xl">Create Your Account</CardTitle>
              <CardDescription>
                Join hundreds of hospitality businesses using Hostezee to manage properties effortlessly
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-register">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900 dark:text-white">First Name</label>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      required
                      data-testid="input-firstname"
                      className="border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-900 dark:text-white">Last Name</label>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      required
                      data-testid="input-lastname"
                      className="border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-white">Business Name</label>
                  <Input
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="My Property or Hotel Name"
                    required
                    data-testid="input-businessname"
                    className="border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-white">Email Address</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    data-testid="input-email"
                    className="border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-white">Mobile Number (WhatsApp)</label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                      +91
                    </div>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      data-testid="input-phone"
                      className="border-slate-200 dark:border-slate-800 flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    We'll send approval notifications to your WhatsApp
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-white">Password</label>
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    required
                    data-testid="input-password"
                    className="border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Must be at least 8 characters long
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white gap-2 group h-11"
                  data-testid="button-register"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                      Already have an account?
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/login")}
                  className="w-full border-slate-300 dark:border-slate-700 h-11"
                  data-testid="button-login"
                >
                  Sign In Instead
                </Button>

                <p className="text-xs text-center text-slate-600 dark:text-slate-400 mt-4">
                  By creating an account, you agree to our{" "}
                  <a href="/terms" className="text-teal-600 dark:text-teal-400 hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-teal-600 dark:text-teal-400 hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
              Enterprise Grade
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
              <span>🔒 Secure</span>
              <span>✓ Free Forever</span>
              <span>🌐 Global</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
