import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Shield, CreditCard, Check, Loader2, Zap, Crown, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxProperties: number;
  maxRooms: number;
  maxStaff: number;
  features: string[];
  isActive: boolean;
}

interface CurrentSubscription {
  subscription: {
    id: number;
    planId: number;
    status: string;
    billingCycle: string;
    endDate: string;
  } | null;
  plan: SubscriptionPlan | null;
  user: {
    subscriptionStatus: string;
    trialEndsAt: string | null;
  };
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);

  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const { data: currentSub, refetch: refetchSub } = useQuery<CurrentSubscription>({
    queryKey: ["/api/subscription/current"],
  });

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (plan.slug === 'free') {
      toast({ title: "Free Plan", description: "You're on the free plan. Upgrade for more features!" });
      return;
    }

    setProcessingPlanId(plan.id);

    try {
      const billingCycle = isYearly ? 'yearly' : 'monthly';
      const orderData = await apiRequest("/api/subscription/create-order", "POST", {
        planId: plan.id,
        billingCycle,
      });

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Hostezee",
        description: `${orderData.planName} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            await apiRequest("/api/subscription/verify-payment", "POST", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id,
              billingCycle,
            });

            toast({
              title: "Subscription Activated!",
              description: `You are now subscribed to ${plan.name}. Enjoy your premium features!`,
            });

            refetchSub();
          } catch (error: any) {
            toast({
              title: "Payment Verification Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        },
        prefill: {
          email: orderData.user?.email || "",
          contact: orderData.user?.phone || "",
        },
        theme: {
          color: "#0D9488",
        },
        modal: {
          ondismiss: () => {
            setProcessingPlanId(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'starter': return <Zap className="h-4 w-4 text-blue-500" />;
      case 'professional': return <Crown className="h-4 w-4 text-purple-500" />;
      case 'enterprise': return <Building2 className="h-4 w-4 text-teal-500" />;
      default: return null;
    }
  };

  const isCurrentPlan = (planId: number) => {
    return currentSub?.subscription?.planId === planId && currentSub?.subscription?.status === 'active';
  };

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

        {/* Subscription & Billing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-teal-600" />
              Subscription & Billing
            </CardTitle>
            <CardDescription>Manage your subscription plan and billing</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Current Plan Info */}
            {currentSub?.subscription && currentSub?.plan ? (
              <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {getPlanIcon(currentSub.plan.slug)}
                      <span className="font-semibold text-lg">{currentSub.plan.name}</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentSub.subscription.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} billing
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Renews on {new Date(currentSub.subscription.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-teal-600">
                      ₹{currentSub.subscription.billingCycle === 'yearly' 
                        ? Number(currentSub.plan.yearlyPrice).toLocaleString()
                        : Number(currentSub.plan.monthlyPrice).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      /{currentSub.subscription.billingCycle === 'yearly' ? 'year' : 'month'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border mb-6">
                <p className="text-muted-foreground">You're on the Free plan. Upgrade to unlock more features!</p>
              </div>
            )}

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>Monthly</Label>
              <Switch
                id="billing-toggle"
                checked={isYearly}
                onCheckedChange={setIsYearly}
                data-testid="switch-billing-toggle"
              />
              <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
                Yearly <Badge variant="secondary" className="ml-1">Save 17%</Badge>
              </Label>
            </div>

            {/* Available Plans */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.filter(p => p.slug !== 'free').map((plan) => {
                const price = isYearly ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
                const monthlyEquivalent = isYearly ? Math.round(price / 12) : price;
                const isCurrent = isCurrentPlan(plan.id);
                const isPopular = plan.slug === 'professional';

                return (
                  <div
                    key={plan.id}
                    className={`p-4 border rounded-lg ${isPopular ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/10' : ''} ${isCurrent ? 'ring-2 ring-teal-500' : ''}`}
                    data-testid={`plan-card-${plan.slug}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getPlanIcon(plan.slug)}
                      <h4 className="font-semibold">{plan.name}</h4>
                      {isPopular && <Badge className="bg-teal-600 text-white text-xs">Popular</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                    <div className="mb-3">
                      <span className="text-2xl font-bold">₹{monthlyEquivalent.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                      {isYearly && (
                        <span className="text-xs text-green-600 ml-2">billed yearly</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>{plan.maxProperties} {plan.maxProperties === 1 ? 'property' : 'properties'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>Up to {plan.maxRooms} rooms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>{plan.maxStaff} staff members</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      variant={isCurrent ? "outline" : isPopular ? "default" : "secondary"}
                      disabled={isCurrent || processingPlanId === plan.id}
                      onClick={() => handleSubscribe(plan)}
                      data-testid={`button-subscribe-${plan.slug}`}
                    >
                      {processingPlanId === plan.id ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                      ) : isCurrent ? (
                        'Current Plan'
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
